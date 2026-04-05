import * as cheerio from "cheerio";

export function extractMyproteinProductContent(html: string) {
  const $ = cheerio.load(html);
  const documentText = collapseWhitespaceWithNewlines($("body").text());
  const headingBlocks = new Map<string, string>();
  const selectors = ["button", "[role='button']", "[data-e2e]", "h2", "h3", "h4", "summary"];

  for (const selector of selectors) {
    $(selector).each((_, element) => {
      const heading = normalizeHeading($(element).text());
      if (!heading || headingBlocks.has(heading)) return;
      const blockText = collectSectionText($, element);
      if (blockText) headingBlocks.set(heading, blockText);
    });
  }

  const ingredientsFallback = extractRichContentListTexts(
    html,
    "cm_ingredientsInformation"
  );
  const dietarySuitabilityFallback = extractRichContentListTexts(
    html,
    "cm_dietarySuitability"
  );
  const nutritionHtmlFallback = extractRichContentHtml(html, "cm_nutritionalPanel");

  return {
    description: firstNonEmpty([headingBlocks.get("description"), metaDescription($)]) ?? null,
    keyBenefits: splitBulletList(headingBlocks.get("key benefits")),
    whyChoose: firstNonEmpty([headingBlocks.get("why choose"), headingBlocks.get("why choose?")]) ?? null,
    suggestedUse: firstNonEmpty([headingBlocks.get("suggested use"), headingBlocks.get("how to use")]) ?? null,
    bundleLinks: extractBundleLinks($),
    ingredients:
      sanitizeIngredientsText(
        firstNonEmpty([
          headingBlocks.get("ingredients"),
          [...ingredientsFallback, ...dietarySuitabilityFallback].join("\n"),
          extractIngredientsFromText(documentText),
        ])
      ) ?? null,
    faqEntries: extractFaqEntries($, headingBlocks.get("frequently asked questions") ?? null),
    nutritionalInformation:
      extractNutritionRowsFromCmsPayload(html) ??
      extractNutritionRows($, nutritionHtmlFallback) ??
      extractNutritionRowsFromText(documentText) ??
      [],
    productDetails: firstNonEmpty([headingBlocks.get("product details"), headingBlocks.get("details")]) ?? null,
  };
}

function extractFaqEntries($: cheerio.CheerioAPI, sectionText: string | null) {
  const items: Array<{ question: string; answer: string }> = [];
  $("details").each((_, element) => {
    const question = $(element).find("summary").first().text().trim();
    const answer = $(element).text().replace(question, "").trim();
    if (question && answer) items.push({ question, answer: collapseWhitespace(answer) });
  });
  if (items.length > 0) return items;
  if (!sectionText) return [];
  return sectionText
    .split(/\n+/)
    .map((entry) => collapseWhitespace(entry))
    .filter(Boolean)
    .map((entry) => ({ question: entry, answer: "" }));
}

function extractNutritionRows($: cheerio.CheerioAPI, fallbackHtml: string | null) {
  if (fallbackHtml) {
    const fallbackRows = extractNutritionRowsFromScope(cheerio.load(fallbackHtml));
    if (fallbackRows?.length) return fallbackRows;
  }

  const directRows = extractNutritionRowsFromScope($);
  return directRows?.length ? directRows : null;
}

function extractNutritionRowsFromScope(scope: cheerio.CheerioAPI) {
  const allRows = scope("tr").toArray();
  return extractNutritionRowsFromParsedRows(
    allRows.map((row) =>
      scope(row)
        .children("th, td")
        .toArray()
        .map((cell) => collapseWhitespace(scope(cell).text()))
    )
  );
}

function extractRichContentHtml(html: string, key: string) {
  const block = extractCmsBlock(html, key);
  if (!block) return null;
  const match = block.match(/"content":\s*("(?:\\.|[^"\\])*")/);
  if (!match) return null;
  return decodeJsonStringLiteral(match[1]);
}

function extractNutritionRowsFromCmsPayload(html: string) {
  const block = extractCmsBlock(html, "cm_nutritionalPanel");
  if (!block) return null;
  const matches = [...block.matchAll(/"content":\s*("(?:\\.|[^"\\])*")/g)];
  if (!matches.length) return null;

  const decoded = matches
    .map((match) => decodeJsonStringLiteral(match[1]))
    .filter(Boolean)
    .join("\n");
  if (!decoded) return null;

  const $ = cheerio.load(decoded);
  return extractNutritionRowsFromParsedRows(
    $("tr")
      .toArray()
      .map((row) =>
        $(row)
          .children("th, td")
          .toArray()
          .map((cell) => collapseWhitespace($(cell).text()))
      )
  );
}

function extractNutritionRowsFromParsedRows(
  parsedRows: string[][]
): Array<{
  label: string;
  per100g: string | null;
  perServing: string | null;
  perDailyServing?: string | null;
  referenceIntake?: string | null;
}> | null {
  if (!parsedRows.length) return null;

  const normalizedRows = parsedRows
    .map((cells) => cells.map((cell) => collapseWhitespace(cell)))
    .filter((cells) => cells.some(Boolean));

  if (!normalizedRows.length) return null;

  const fastPath = extractNutritionRowsUsingExplicitHeader(normalizedRows);
  if (fastPath.length) return fastPath;

  const servingOnlyRows = extractNutritionRowsUsingServingOnlyHeader(normalizedRows);
  if (servingOnlyRows.length) return servingOnlyRows;

  const scored = extractNutritionRowsUsingHeuristics(normalizedRows);
  return scored.length ? scored : null;
}

function extractNutritionRowsUsingServingOnlyHeader(parsedRows: string[][]) {
  const rows: Array<{
    label: string;
    per100g: string | null;
    perServing: string | null;
    perDailyServing?: string | null;
    referenceIntake?: string | null;
  }> = [];

  const headerIndex = parsedRows.findIndex((cells) => hasServingOnlyHeaderColumns(cells));
  if (headerIndex === -1) return rows;

  const headerCells = parsedRows[headerIndex];
  const perServingIndex = findServingOnlyColumnIndex(headerCells);
  const percentIndex = findReferenceIntakeColumnIndex(headerCells);

  if (perServingIndex <= 0) return rows;

  for (const cells of parsedRows.slice(headerIndex + 1)) {
    if (cells.length <= perServingIndex) continue;

    const perServing = cells[perServingIndex] || null;
    const maybePercent = percentIndex !== -1 && cells.length > percentIndex ? cells[percentIndex] || null : null;

    const candidate = {
      label: cells[0],
      per100g: null,
      perServing: null,
      perDailyServing: perServing,
      referenceIntake: isReferenceIntakeValue(maybePercent) ? maybePercent : null,
    };

    if (isCleanNutritionRow(candidate)) rows.push(candidate);
  }

  return rows;
}

function extractNutritionRowsUsingExplicitHeader(parsedRows: string[][]) {
  const rows: Array<{
    label: string;
    per100g: string | null;
    perServing: string | null;
    perDailyServing?: string | null;
    referenceIntake?: string | null;
  }> = [];

  const headerIndex = parsedRows.findIndex((headerCells) => hasNutritionHeaderColumns(headerCells));
  if (headerIndex === -1) return rows;

  const headerCells = parsedRows[headerIndex];
  const per100gIndex = findPer100gColumnIndex(headerCells);
  const perServingIndex = findPerServingColumnIndex(headerCells);
  const referenceIntakeIndex = findReferenceIntakeColumnIndex(headerCells);

  if (per100gIndex <= 0 || perServingIndex <= 0 || per100gIndex === perServingIndex) {
    return rows;
  }

  for (const cells of parsedRows.slice(headerIndex + 1)) {
    if (cells.length <= Math.max(per100gIndex, perServingIndex)) continue;

    const candidate = {
      label: cells[0],
      per100g: cells[per100gIndex] || null,
      perServing: cells[perServingIndex] || null,
      referenceIntake:
        referenceIntakeIndex !== -1 && cells.length > referenceIntakeIndex
          ? normalizeReferenceIntakeValue(cells[referenceIntakeIndex] || null)
          : null,
    };

    if (isCleanNutritionRow(candidate)) rows.push(candidate);
  }

  return rows;
}

function extractNutritionRowsUsingHeuristics(parsedRows: string[][]) {
  let bestRows: Array<{
    label: string;
    per100g: string | null;
    perServing: string | null;
    perDailyServing?: string | null;
    referenceIntake?: string | null;
  }> = [];
  let bestScore = 0;

  for (let start = 0; start < parsedRows.length; start += 1) {
    const header = parsedRows[start];
    if (header.length < 3) continue;
    const labelIndex = 0;
    const columnIndexes = header
      .map((_, index) => index)
      .filter((index) => index !== labelIndex);

    for (const per100gIndex of columnIndexes) {
      for (const perServingIndex of columnIndexes) {
        if (per100gIndex === perServingIndex) continue;

        const candidateRows: Array<{
          label: string;
          per100g: string | null;
          perServing: string | null;
          perDailyServing?: string | null;
          referenceIntake?: string | null;
        }> = [];

        for (const cells of parsedRows.slice(start + 1)) {
          if (cells.length <= Math.max(per100gIndex, perServingIndex)) continue;
          const candidate = {
            label: cells[labelIndex] || "",
            per100g: cells[per100gIndex] || null,
            perServing: cells[perServingIndex] || null,
          };
          if (isCleanNutritionRow(candidate)) candidateRows.push(candidate);
        }

        const score = scoreNutritionCandidate(header, candidateRows, per100gIndex, perServingIndex);
        if (score > bestScore) {
          bestScore = score;
          bestRows = candidateRows;
        }
      }
    }
  }

  return bestScore >= 18 ? bestRows : [];
}

function findPerServingColumnIndex(headerCells: string[]) {
  return headerCells.findIndex((cell) => {
    const normalized = cell.trim().toLowerCase();
    if (!normalized) return false;
    if (isPer100gHeader(normalized)) return false;
    return isPerServingHeader(normalized);
  });
}

function findPer100gColumnIndex(headerCells: string[]) {
  return headerCells.findIndex((cell) => isPer100gHeader(cell.trim().toLowerCase()));
}

function hasNutritionHeaderColumns(headerCells: string[]) {
  return (
    findPer100gColumnIndex(headerCells) !== -1 &&
    findPerServingColumnIndex(headerCells) !== -1
  );
}

function hasServingOnlyHeaderColumns(headerCells: string[]) {
  return (
    findServingOnlyColumnIndex(headerCells) !== -1 &&
    findReferenceIntakeColumnIndex(headerCells) !== -1 &&
    findPer100gColumnIndex(headerCells) === -1
  );
}

function isPer100gHeader(value: string) {
  return /(?:^|\b)(?:per\s*)?100g(?:\s+contains)?(?:\b|$)/i.test(value);
}

function isPerServingHeader(value: string) {
  return /(?:^|\b)(?:per\s*\d+(?:\.\d+)?g|per\s*serving|per\s+(?:sachet|tablet|capsule|softgel|gummy|stick|shot|bar|packet|pack|portion)(?:\s*\(\d+(?:\.\d+)?g\))?|a\s+serving\s+contains|serving\s+contains)(?:\b|$)/i.test(
    value
  );
}

function findServingOnlyColumnIndex(headerCells: string[]) {
  const servingIndexes = headerCells
    .map((cell, index) => ({
      index,
      normalized: cell.trim().toLowerCase(),
    }))
    .filter(
      ({ normalized }) =>
        normalized &&
        /(?:^|\b)(?:per\s+daily\s+serving|daily\s+serving|per\s+portion|per\s+dose)(?:\b|$)/i.test(
          normalized
        )
    )
    .map(({ index }) => index);

  const nonLabelServingIndex = servingIndexes.find((index) => index > 0);
  if (nonLabelServingIndex !== undefined) return nonLabelServingIndex;
  return servingIndexes[0] ?? -1;
}

function findReferenceIntakeColumnIndex(headerCells: string[]) {
  return headerCells.findIndex((cell) => {
    const normalized = cell.trim().toLowerCase();
    if (!normalized) return false;
    return /(?:reference intake|nutrition reference value|nrv|%ri|%\s*reference intake)/i.test(
      normalized
    );
  });
}

function scoreNutritionCandidate(
  headerCells: string[],
  rows: Array<{
    label: string;
    per100g: string | null;
    perServing: string | null;
    perDailyServing?: string | null;
    referenceIntake?: string | null;
  }>,
  per100gIndex: number,
  perServingIndex: number
) {
  if (rows.length < 4) return 0;

  let score = rows.length * 2;
  const normalizedHeaders = headerCells.map((cell) => cell.trim().toLowerCase());
  const per100gHeader = normalizedHeaders[per100gIndex] ?? "";
  const perServingHeader = normalizedHeaders[perServingIndex] ?? "";

  if (isPer100gHeader(per100gHeader)) score += 6;
  if (isPerServingHeader(perServingHeader)) score += 6;

  const nutrientMatches = rows.filter((row) => isKnownNutritionLabel(row.label)).length;
  score += nutrientMatches * 2;

  const measurementMatches = rows.filter(
    (row) => parseMeasurement(row.per100g) && parseMeasurement(row.perServing)
  ).length;
  score += measurementMatches * 2;

  const sameUnitMatches = rows.filter((row) => {
    const per100g = parseMeasurement(row.per100g);
    const perServing = parseMeasurement(row.perServing);
    return per100g && perServing && per100g.unit === perServing.unit;
  }).length;
  score += sameUnitMatches;

  const distinctValueMatches = rows.filter((row) => {
    const left = normalizeComparableNutritionValue(row.per100g);
    const right = normalizeComparableNutritionValue(row.perServing);
    return Boolean(left && right && left !== right);
  }).length;
  score += distinctValueMatches;

  const suspiciousEquality = rows.every((row) => {
    const left = normalizeComparableNutritionValue(row.per100g);
    const right = normalizeComparableNutritionValue(row.perServing);
    return Boolean(left && right && left === right);
  });
  if (suspiciousEquality) score -= 8;

  return score;
}

function isKnownNutritionLabel(value: string) {
  const normalized = value.trim().toLowerCase();
  return [
    "energy",
    "fat",
    "of which saturates",
    "carbohydrate",
    "of which sugars",
    "fibre",
    "fiber",
    "protein",
    "salt",
  ].includes(normalized);
}

function normalizeComparableNutritionValue(value: string | null) {
  return value?.replace(/\s+/g, " ").trim().toLowerCase() ?? null;
}

function parseMeasurement(value: string | null) {
  if (!value) return null;
  const match = value.match(/<?\s*(\d+(?:\.\d+)?)\s*(kcal|kj|mg|g)\b/i);
  if (!match) return null;
  return {
    value: Number(match[1]),
    unit: match[2].toLowerCase(),
  };
}

function looksLikeMeasurement(value: string | null) {
  return Boolean(parseMeasurement(value));
}

function isReferenceIntakeValue(value: string | null) {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return (
    /^-+$/.test(normalized) ||
    normalized === "" ||
    normalized === "n/a" ||
    normalized === "&nbsp;" ||
    /^<?\s*\d+(?:\.\d+)?\s*%?$/.test(normalized) ||
    /less than\s+\d+%/.test(normalized)
  );
}

function normalizeReferenceIntakeValue(value: string | null) {
  if (!value) return null;
  const normalized = value.trim();
  if (!normalized || normalized === "&nbsp;") return null;
  return normalized;
}

function extractNutritionRowsFromText(text: string) {
  const section = extractSection(
    text,
    "Nutritional Information",
    ["Ingredients", "Frequently Asked Questions", "Suggested Use", "Product Details"]
  );
  if (!section) return null;

  const normalized = section
    .replace(/Impact Whey Protein\s*-\s*SNICKERS®?/gi, " ")
    .replace(/Serving Size:\s*\d+(?:\.\d+)?g/gi, " ")
    .replace(/Nutritional information is based on.*$/gim, " ")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const rowPattern =
    /(Energy|Fat|of which saturates|Carbohydrate|of which sugars|Fibre|Protein|Salt)\s+([^\s]+)\s+([^\s]+)(?=\s+(?:Energy|Fat|of which saturates|Carbohydrate|of which sugars|Fibre|Protein|Salt)\s+|$)/gi;

  const rows: Array<{
    label: string;
    per100g: string | null;
    perServing: string | null;
    perDailyServing?: string | null;
    referenceIntake?: string | null;
  }> = [];
  for (const match of normalized.matchAll(rowPattern)) {
    const candidate = {
      label: collapseWhitespace(match[1]),
      per100g: collapseWhitespace(match[2]) || null,
      perServing: collapseWhitespace(match[3]) || null,
    };
    if (isCleanNutritionRow(candidate)) rows.push(candidate);
  }

  return rows.length ? rows : null;
}

function extractRichContentListTexts(html: string, key: string) {
  const block = extractCmsBlock(html, key);
  if (!block) return [];
  const matches = [...block.matchAll(/"content":\s*("(?:\\.|[^"\\])*")/g)];
  return matches
    .map((match) => decodeJsonStringLiteral(match[1]))
    .map((value) => convertRichTextToMarkedText(value))
    .map((value) => collapseWhitespace(value))
    .filter(Boolean);
}

function extractIngredientsFromText(text: string) {
  const section = extractSection(
    text,
    "Ingredients",
    ["Frequently Asked Questions", "Suggested Use", "Product Details"]
  );
  if (!section) return null;

  const cleaned = section
    .replace(/^[:\s-]+/, "")
    .replace(/\bclass\s+AccordionItem\s+extends\s+HTMLElement\b[\s\S]*$/i, "")
    .replace(/\bcustomElements\.get\(['"]accordion-item['"]\)[\s\S]*$/i, "")
    .replace(/\bconstructor\(\)\s*\{[\s\S]*$/i, "")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned || null;
}

function sanitizeIngredientsText(value: string | null) {
  if (!value) return null;

  const cleaned = value
    .replace(/\bQuantity:\b[\s\S]*$/i, "")
    .replace(/\bAdd to basket\b[\s\S]*$/i, "")
    .replace(/\bEmail When In Stock\b[\s\S]*$/i, "")
    .replace(/\bNotify Me When Available\b[\s\S]*$/i, "")
    .replace(/\bIn stock \| Usually dispatched within 24 hours\b[\s\S]*$/i, "")
    .replace(/\b\(function\(\)\{[\s\S]*$/i, "")
    .replace(/\bdocument\.addEventListener\([\s\S]*$/i, "")
    .replace(/\bwindow\.[A-Za-z0-9_.]+\([\s\S]*$/i, "")
    .replace(/\bDescription\b[\s\S]*$/i, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return null;

  const normalized = cleaned.toLowerCase();
  const noisySignals = [
    "add to basket",
    "notify me when available",
    "document.addeventlistener",
    "window.sharedfunctions",
    "opengallerysharemodal",
    "product-gallery-refreshed",
    "variation_updated",
  ];

  if (noisySignals.some((signal) => normalized.includes(signal))) {
    return null;
  }

  return cleaned;
}

function extractSection(text: string, startHeading: string, endHeadings: string[]) {
  const start = text.search(new RegExp(`\\b${escapeRegExp(startHeading)}\\b`, "i"));
  if (start === -1) return null;

  const slice = text.slice(start + startHeading.length);
  let endIndex = slice.length;
  for (const heading of endHeadings) {
    const idx = slice.search(new RegExp(`\\b${escapeRegExp(heading)}\\b`, "i"));
    if (idx !== -1 && idx < endIndex) endIndex = idx;
  }

  return slice.slice(0, endIndex).trim() || null;
}

function extractCmsBlock(html: string, key: string) {
  const marker = `"key":"${key}"`;
  const start = html.indexOf(marker);
  if (start === -1) return null;
  const rest = html.slice(start);
  const nextKeyIndex = rest.slice(marker.length).search(/"key":"cm_/);
  if (nextKeyIndex === -1) return rest.slice(0, 25000);
  return rest.slice(0, marker.length + nextKeyIndex);
}

function decodeJsonStringLiteral(value: string) {
  try {
    return JSON.parse(value) as string;
  } catch {
    return "";
  }
}

function stripHtml(value: string) {
  return value.replace(/<[^>]+>/g, " ").replace(/&nbsp;/gi, " ");
}

function convertRichTextToMarkedText(value: string) {
  return value
    .replace(/<(strong|b)[^>]*>/gi, "**")
    .replace(/<\/(strong|b)>/gi, "**")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<li[^>]*>/gi, "\n- ")
    .replace(/<\/li>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ");
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isCleanNutritionRow(row: {
  label: string;
  per100g: string | null;
  perServing: string | null;
  perDailyServing?: string | null;
  referenceIntake?: string | null;
}) {
  const label = row.label.trim();
  if (!label) return false;
  if (label === ".") return false;
  if (/^(nutritional information|typical values|contains \d+ servings?)$/i.test(label)) {
    return false;
  }
  if (label === row.per100g && label === row.perServing && label === row.perDailyServing) return false;
  if (label.length > 60) return false;
  if (!row.per100g && !row.perServing && !row.perDailyServing && !row.referenceIntake) return false;
  return true;
}

function normalizeHeading(value: string): string | null {
  const normalized = collapseWhitespace(value).toLowerCase();
  return normalized ? normalized.replace(/[:?]+$/g, "") : null;
}

function collectSectionText($: cheerio.CheerioAPI, element: any): string | null {
  const texts: string[] = [];
  let current = $(element).next();
  let hops = 0;
  while (current.length && hops < 12) {
    if (isHeadingLike(current)) break;
    const text = collapseWhitespace(current.text());
    if (text) texts.push(text);
    current = current.next();
    hops += 1;
  }
  return texts.length ? texts.join("\n") : null;
}

function isHeadingLike(node: cheerio.Cheerio<any>) {
  const tagName = node.get(0)?.tagName?.toLowerCase();
  return Boolean(tagName && ["button", "summary", "h2", "h3", "h4"].includes(tagName));
}

function splitBulletList(value: string | undefined) {
  if (!value) return [];
  return value.split(/\n|â€¢|•/).map((item) => collapseWhitespace(item)).filter(Boolean);
}

function metaDescription($: cheerio.CheerioAPI) {
  return collapseWhitespace($("meta[name='description']").attr("content") ?? "");
}

function firstNonEmpty(values: Array<string | null | undefined>) {
  return values.find((value) => Boolean(value && value.trim())) ?? null;
}

function collapseWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function extractBundleLinks($: cheerio.CheerioAPI): Array<{ name: string; url: string }> {
  const nutritionSection = $("#nutritionalinfo");
  if (!nutritionSection.length) return [];

  const links: Array<{ name: string; url: string }> = [];
  nutritionSection.find("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    const name = collapseWhitespace($(el).text());
    if (href && name && href.includes("myprotein.com")) {
      links.push({ name, url: href });
    }
  });

  return links;
}

function collapseWhitespaceWithNewlines(value: string) {
  return value
    .replace(/\r/g, "\n")
    .replace(/\n\s*\n+/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .trim();
}
