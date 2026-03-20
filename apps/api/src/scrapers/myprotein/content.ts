import * as cheerio from "cheerio";

export function extractMyproteinProductContent(html: string) {
  const $ = cheerio.load(html);
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

  return {
    description: firstNonEmpty([headingBlocks.get("description"), metaDescription($)]) ?? null,
    keyBenefits: splitBulletList(headingBlocks.get("key benefits")),
    whyChoose: firstNonEmpty([headingBlocks.get("why choose"), headingBlocks.get("why choose?")]) ?? null,
    suggestedUse: firstNonEmpty([headingBlocks.get("suggested use"), headingBlocks.get("how to use")]) ?? null,
    ingredients: headingBlocks.get("ingredients") ?? null,
    faqEntries: extractFaqEntries($, headingBlocks.get("frequently asked questions") ?? null),
    nutritionalInformation: extractNutritionRows($),
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

function extractNutritionRows($: cheerio.CheerioAPI) {
  const rows: Array<{ label: string; value: string }> = [];
  $("table tr").each((_, element) => {
    const cells = $(element).find("th, td");
    if (cells.length < 2) return;
    const label = collapseWhitespace($(cells[0]).text());
    const value = collapseWhitespace($(cells[1]).text());
    if (label && value) rows.push({ label, value });
  });
  return rows;
}

function normalizeHeading(value: string): string | null {
  const normalized = collapseWhitespace(value).toLowerCase();
  return normalized ? normalized.replace(/[:?]+$/g, "") : null;
}

function collectSectionText($: cheerio.CheerioAPI, element: cheerio.AnyNode): string | null {
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
