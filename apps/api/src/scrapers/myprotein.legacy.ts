import * as cheerio from "cheerio";

const DEFAULT_CATEGORY_URL =
  "https://www.myprotein.com/c/nutrition/protein/whey-protein/";

type JsonLdNode = Record<string, unknown>;

export interface MyproteinVariantRecord {
  retailer: "MyProtein";
  brand: string;
  productName: string;
  categoryUrl: string;
  productUrl: string;
  variantUrl: string;
  retailerProductId: string | null;
  groupId: string | null;
  flavour: string | null;
  sizeLabel: string | null;
  sizeG: number | null;
  servingsLabel: string | null;
  price: number | null;
  originalPrice: number | null;
  wasOnSale: boolean;
  subscriptionPrice: number | null;
  subscriptionSavings: number | null;
  pricePer100g: number | null;
  proteinPer100g: number | null;
  inStock: boolean;
  currency: string | null;
  imageUrl: string | null;
  description: string | null;
  keyBenefits: string[];
  whyChoose: string | null;
  suggestedUse: string | null;
  ingredients: string | null;
  faqEntries: Array<{ question: string; answer: string }>;
  nutritionalInformation: Array<{ label: string; value: string }>;
  productDetails: string | null;
  scrapedAt: string;
}

export interface ScrapeMyproteinOptions {
  categoryUrl?: string;
  limitProducts?: number;
  fetchImpl?: typeof fetch;
  onProgress?: (message: string) => void | Promise<void>;
  onVariant?: (record: MyproteinVariantRecord) => void | Promise<void>;
}

export async function scrapeMyproteinWheyProducts(
  options: ScrapeMyproteinOptions = {}
): Promise<MyproteinVariantRecord[]> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const categoryUrl = options.categoryUrl ?? DEFAULT_CATEGORY_URL;
  await options.onProgress?.(`Fetching category ${categoryUrl}`);
  const listingHtml = await fetchText(categoryUrl, fetchImpl);
  const listingNodes = extractJsonLdNodes(listingHtml);
  const productUrls = extractCategoryProductUrls(listingNodes, categoryUrl);
  const limitedProductUrls =
    typeof options.limitProducts === "number"
      ? productUrls.slice(0, options.limitProducts)
      : productUrls;
  await options.onProgress?.(
    `Discovered ${productUrls.length} products, scraping ${limitedProductUrls.length}`
  );

  const results: MyproteinVariantRecord[] = [];
  for (const [index, productUrl] of limitedProductUrls.entries()) {
    await options.onProgress?.(
      `Loading product ${index + 1}/${limitedProductUrls.length}: ${productUrl}`
    );
    const productHtml = await fetchText(productUrl, fetchImpl);
    const productResults = await extractProductVariants({
      productHtml,
      productUrl,
      categoryUrl,
      fetchImpl,
      onProgress: options.onProgress,
      onVariant: options.onVariant,
    });
    results.push(...productResults);
    await options.onProgress?.(
      `Finished product ${index + 1}/${limitedProductUrls.length}: ${productResults.length} variants`
    );
  }

  await options.onProgress?.(`Scrape complete: ${results.length} variants collected`);
  return results;
}

async function extractProductVariants(args: {
  productHtml: string;
  productUrl: string;
  categoryUrl: string;
  fetchImpl: typeof fetch;
  onProgress?: (message: string) => void | Promise<void>;
  onVariant?: (record: MyproteinVariantRecord) => void | Promise<void>;
}): Promise<MyproteinVariantRecord[]> {
  const { productHtml, productUrl, categoryUrl, fetchImpl, onProgress, onVariant } = args;
  const nodes = extractJsonLdNodes(productHtml);
  const productGroup = nodes.find((node) => node["@type"] === "ProductGroup");
  if (!productGroup) {
    await onProgress?.(`Skipped product with no ProductGroup JSON-LD: ${productUrl}`);
    return [];
  }

  const brand = extractBrandName(productGroup) ?? "MyProtein";
  const productName = asString(productGroup.name) ?? "Unknown product";
  const groupId = asString(productGroup.productGroupID);
  const defaultImageUrl = asString(productGroup.image);
  const variants = asArray(productGroup.hasVariant);
  const productContent = extractMyproteinProductContent(productHtml);
  const variantStateMap = extractVariantStateMap(productHtml);
  await onProgress?.(`Product "${productName}" exposes ${variants.length} variants`);

  const variantRecords: MyproteinVariantRecord[] = [];
  for (const [index, variantNode] of variants.entries()) {
    const variant = asObject(variantNode);
    if (!variant) {
      continue;
    }

    const offer = asObject(variant.offers);
    const variantUrl = resolveUrl(productUrl, asString(offer?.url) ?? productUrl);
    const variantName =
      extractVariantFlavour(variant) ?? asString(variant.name) ?? `Variant ${index + 1}`;
    await onProgress?.(`  Variant ${index + 1}/${variants.length}: ${variantName}`);

    const variantHtml = await fetchText(variantUrl, fetchImpl);
    const variantPage = await parseVariantPage(variantHtml, variantUrl, fetchImpl);
    if (variantPage.subscriptionPrice === null) {
      await onProgress?.(
        `    Subscription debug for ${variantName}: ${JSON.stringify(
          debugSubscriptionExtraction(variantHtml)
        )}`
      );
    }
    const flavour = extractVariantFlavour(variant) ?? variantPage.flavour;
    const retailerProductId =
      variantPage.retailerProductId ?? asString(variant.sku) ?? groupId ?? null;
    const variantState = retailerProductId
      ? variantStateMap.get(retailerProductId) ?? null
      : null;

    const sizeLabel = variantPage.sizeLabel;
    const sizeG = parseSizeToGrams(sizeLabel ?? variantPage.ariaLabel ?? productName);
    const originalPrice = variantPage.originalPrice;
    const price = variantPage.price ?? parseNumber(offer?.price);
    const subscriptionPrice =
      getSubscriptionPriceFromVariantState(variantState) ?? variantPage.subscriptionPrice;
    const subscriptionSavings =
      subscriptionPrice !== null && price !== null && subscriptionPrice < price
        ? roundTo(price - subscriptionPrice, 2)
        : variantPage.subscriptionSavings;
    const pricePer100g =
      price && sizeG ? roundTo((price / sizeG) * 100, 4) : null;

    const record = {
      retailer: "MyProtein",
      brand,
      productName,
      categoryUrl,
      productUrl,
      variantUrl,
      retailerProductId,
      groupId,
      flavour,
      sizeLabel,
      sizeG,
      servingsLabel: variantPage.servingsLabel,
      price,
      originalPrice,
      wasOnSale:
        price !== null && originalPrice !== null && originalPrice > price,
      subscriptionPrice,
      subscriptionSavings,
      pricePer100g,
      proteinPer100g: variantPage.proteinPer100g,
      inStock: variantPage.inStock,
      currency: asString(offer?.priceCurrency) ?? variantPage.currency,
      imageUrl: variantPage.imageUrl ?? asString(variant.image) ?? defaultImageUrl ?? null,
      description: productContent.description,
      keyBenefits: productContent.keyBenefits,
      whyChoose: productContent.whyChoose,
      suggestedUse: productContent.suggestedUse,
      ingredients: productContent.ingredients,
      faqEntries: productContent.faqEntries,
      nutritionalInformation: productContent.nutritionalInformation,
      productDetails: productContent.productDetails,
      scrapedAt: new Date().toISOString(),
    } satisfies MyproteinVariantRecord;

    variantRecords.push(record);
    await onVariant?.(record);
  }

  return variantRecords;
}

async function parseVariantPage(
  html: string,
  pageUrl: string,
  fetchImpl: typeof fetch
) {
  const $ = cheerio.load(html);
  const ariaLabel = $("pdp-sticky-atb").attr("aria-label")?.trim() ?? null;
  const parts = ariaLabel
    ? ariaLabel.split(" - ").map((part) => part.trim()).filter(Boolean)
    : [];
  const price = firstNumber([
    $("#pdp-sticky-price .price").text(),
    $("[data-e2e='product-price']").first().text(),
    $("span.price").first().text(),
  ]);
  const originalPrice = firstNumber([
    $("[data-e2e='rrp-price']").first().text(),
    $("s.price").first().text(),
    $(".price-was-save-container s").first().text(),
  ]);
  const subscriptionFragmentHtml = await fetchSubscriptionFragment(
    $,
    pageUrl,
    fetchImpl
  );
  const subscription$ = subscriptionFragmentHtml
    ? cheerio.load(subscriptionFragmentHtml)
    : null;
  const subscriptionPrice = firstCurrencyAmount([
    $("#subscription-price").first().text(),
    $("[data-e2e='subscribe-tab'] #subscription-price").first().text(),
    $("[data-e2e='subscribe-tab']").first().text(),
    subscription$?.("#subscription-price").first().text(),
    subscription$?.root().text(),
    extractSubscriptionBlockText($),
    extractElementInnerHtmlCurrency(html, "subscription-price"),
    extractElementInnerHtmlCurrency(subscriptionFragmentHtml, "subscription-price"),
  ]);
  const subscriptionSavings = firstCurrencyAmount([
    $("#subscription-save").first().text(),
    $("[data-e2e='subscribe-tab'] #subscription-save").first().text(),
    $("[data-e2e='subscribe-tab']").first().text(),
    subscription$?.("#subscription-save").first().text(),
    subscription$?.root().text(),
    extractSubscriptionBlockText($),
    extractElementInnerHtmlCurrency(html, "subscription-save"),
    extractElementInnerHtmlCurrency(subscriptionFragmentHtml, "subscription-save"),
  ]);
  const proteinPer100g = extractProteinPer100g($);
  const addToBasketDisabled =
    $("[data-e2e='add-to-basket'][disabled]").length > 0 ||
    $("#pdp-sticky-atb-btn[disabled]").length > 0;

  return {
    ariaLabel,
    flavour: parts.length >= 4 ? parts[parts.length - 1] : null,
    sizeLabel: parts.length >= 2 ? parts[1] : null,
    servingsLabel: parts.length >= 3 ? parts[2] : null,
    price,
    originalPrice,
    subscriptionPrice,
    subscriptionSavings,
    proteinPer100g,
    inStock: !addToBasketDisabled,
    currency: html.includes('"priceCurrency":"GBP"') ? "GBP" : null,
    imageUrl:
      $("meta[property='og:image']").attr("content")?.trim() ??
      $("img").first().attr("src")?.trim() ??
      null,
    retailerProductId: new URL(pageUrl).searchParams.get("variation"),
  };
}

async function fetchSubscriptionFragment(
  $: cheerio.CheerioAPI,
  pageUrl: string,
  fetchImpl: typeof fetch
) {
  const fragmentPath =
    $("[data-e2e='subscribe-tab']").attr("data-fragment") ??
    $("#subscribe-tab").attr("data-fragment");

  if (!fragmentPath) {
    return null;
  }

  try {
    const response = await fetchImpl(resolveUrl(pageUrl, fragmentPath), {
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "accept-language": "en-GB,en;q=0.9",
        referer: pageUrl,
        "x-requested-with": "XMLHttpRequest",
      },
    });

    if (!response.ok) {
      return null;
    }

    return await response.text();
  } catch {
    return null;
  }
}

function extractMyproteinProductContent(html: string) {
  const $ = cheerio.load(html);
  const headingBlocks = new Map<string, string>();
  const selectors = [
    "button",
    "[role='button']",
    "[data-e2e]",
    "h2",
    "h3",
    "h4",
    "summary",
  ];

  for (const selector of selectors) {
    $(selector).each((_, element) => {
      const heading = normalizeHeading($(element).text());
      if (!heading || headingBlocks.has(heading)) {
        return;
      }

      const blockText = collectSectionText($, element);
      if (blockText) {
        headingBlocks.set(heading, blockText);
      }
    });
  }

  return {
    description:
      firstNonEmpty([
        headingBlocks.get("description"),
        metaDescription($),
      ]) ?? null,
    keyBenefits: splitBulletList(headingBlocks.get("key benefits")),
    whyChoose:
      firstNonEmpty([
        headingBlocks.get("why choose"),
        headingBlocks.get("why choose?"),
      ]) ?? null,
    suggestedUse:
      firstNonEmpty([
        headingBlocks.get("suggested use"),
        headingBlocks.get("how to use"),
      ]) ?? null,
    ingredients: headingBlocks.get("ingredients") ?? null,
    faqEntries: extractFaqEntries($, headingBlocks.get("frequently asked questions") ?? null),
    nutritionalInformation: extractNutritionRows($),
    productDetails:
      firstNonEmpty([
        headingBlocks.get("product details"),
        headingBlocks.get("details"),
      ]) ?? null,
  };
}

function extractCategoryProductUrls(
  nodes: JsonLdNode[],
  categoryUrl: string
): string[] {
  const urls = new Set<string>();
  for (const node of nodes) {
    if (node["@type"] !== "ItemList") {
      continue;
    }
    for (const item of asArray(node.itemListElement)) {
      const product = asObject(item);
      const href = asString(product?.url) ?? asString(product?.["@id"]);
      if (!href || !href.includes("/p/")) {
        continue;
      }
      urls.add(resolveUrl(categoryUrl, href.split("?")[0]));
    }
  }
  return [...urls];
}

function extractJsonLdNodes(html: string): JsonLdNode[] {
  const $ = cheerio.load(html);
  const nodes: JsonLdNode[] = [];
  $("script[type='application/ld+json']").each((_, element) => {
    const raw = $(element).contents().text();
    if (!raw.trim()) {
      return;
    }
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          const node = asObject(item);
          if (node) {
            nodes.push(node);
          }
        }
        return;
      }
      const object = asObject(parsed);
      if (!object) {
        return;
      }
      const graph = asArray(object["@graph"]);
      if (graph.length) {
        for (const item of graph) {
          const node = asObject(item);
          if (node) {
            nodes.push(node);
          }
        }
        return;
      }
      nodes.push(object);
    } catch {
      return;
    }
  });
  return nodes;
}

function extractVariantFlavour(variant: JsonLdNode): string | null {
  for (const property of asArray(variant.additionalProperty)) {
    const entry = asObject(property);
    if (!entry) {
      continue;
    }
    if (String(entry.name).toLowerCase() === "flavour") {
      return asString(entry.value);
    }
  }
  return null;
}

function extractBrandName(node: JsonLdNode): string | null {
  const brand = asObject(node.brand);
  return asString(brand?.name);
}

function extractProteinPer100g($: cheerio.CheerioAPI): number | null {
  const text = $("body").text();
  const match = text.match(/Protein\s*[:\s]+\s*(\d+(?:\.\d+)?)\s*g/iu);
  return match ? Number(match[1]) : null;
}

function extractFaqEntries(
  $: cheerio.CheerioAPI,
  sectionText: string | null
): Array<{ question: string; answer: string }> {
  const items: Array<{ question: string; answer: string }> = [];

  $("details").each((_, element) => {
    const question = $(element).find("summary").first().text().trim();
    const answer = $(element).text().replace(question, "").trim();
    if (question && answer) {
      items.push({ question, answer: collapseWhitespace(answer) });
    }
  });

  if (items.length > 0) {
    return items;
  }

  if (!sectionText) {
    return [];
  }

  return sectionText
    .split(/\n+/)
    .map((entry) => collapseWhitespace(entry))
    .filter(Boolean)
    .map((entry) => ({ question: entry, answer: "" }));
}

function extractNutritionRows($: cheerio.CheerioAPI): Array<{ label: string; value: string }> {
  const rows: Array<{ label: string; value: string }> = [];

  $("table tr").each((_, element) => {
    const cells = $(element).find("th, td");
    if (cells.length < 2) {
      return;
    }

    const label = collapseWhitespace($(cells[0]).text());
    const value = collapseWhitespace($(cells[1]).text());
    if (label && value) {
      rows.push({ label, value });
    }
  });

  return rows;
}

async function fetchText(url: string, fetchImpl: typeof fetch): Promise<string> {
  const response = await fetchImpl(url, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "accept-language": "en-GB,en;q=0.9",
    },
  });

  if (!response.ok) {
    throw new Error(`Request failed for ${url}: ${response.status} ${response.statusText}`);
  }

  return response.text();
}

function parseSizeToGrams(value: string | null): number | null {
  if (!value) {
    return null;
  }
  const normalized = value.toLowerCase().replace(/,/g, ".");
  const kgMatch = normalized.match(/(\d+(?:\.\d+)?)\s*kg\b/);
  if (kgMatch) {
    return Number(kgMatch[1]) * 1000;
  }
  const gMatch = normalized.match(/(\d+(?:\.\d+)?)\s*g\b/);
  if (gMatch) {
    return Number(gMatch[1]);
  }
  return null;
}

function firstNumber(values: Array<string | null | undefined>): number | null {
  for (const value of values) {
    const parsed = parseCurrency(value ?? null);
    if (parsed !== null) {
      return parsed;
    }
  }
  return null;
}

function firstCurrencyAmount(values: Array<string | null | undefined>): number | null {
  for (const value of values) {
    const parsed = parsePoundAmount(value ?? null);
    if (parsed !== null) {
      return parsed;
    }
  }
  return null;
}

function parseCurrency(value: string | null): number | null {
  if (!value) {
    return null;
  }
  const normalized = value.replace(/[^\d.]/g, "");
  return normalized ? Number(normalized) : null;
}

function parsePoundAmount(value: string | null): number | null {
  if (!value) {
    return null;
  }

  const match = value.match(/£\s*(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)/);
  if (!match) {
    return null;
  }

  const normalized = match[1].replace(/,/g, "");
  const numeric = Number(normalized);
  return Number.isFinite(numeric) ? numeric : null;
}

function parseNumber(value: unknown): number | null {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  }
  return null;
}

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asObject(value: unknown): JsonLdNode | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonLdNode)
    : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function resolveUrl(baseUrl: string, input: string): string {
  return new URL(input, baseUrl).toString();
}

function normalizeHeading(value: string): string | null {
  const normalized = collapseWhitespace(value).toLowerCase();
  if (!normalized) {
    return null;
  }

  return normalized.replace(/[:?]+$/g, "");
}

function collectSectionText($: cheerio.CheerioAPI, element: cheerio.AnyNode): string | null {
  const texts: string[] = [];
  let current = $(element).next();
  let hops = 0;

  while (current.length && hops < 12) {
    if (isHeadingLike(current)) {
      break;
    }

    const text = collapseWhitespace(current.text());
    if (text) {
      texts.push(text);
    }

    current = current.next();
    hops += 1;
  }

  return texts.length ? texts.join("\n") : null;
}

function isHeadingLike(node: cheerio.Cheerio<any>) {
  const tagName = node.get(0)?.tagName?.toLowerCase();
  if (!tagName) {
    return false;
  }

  return ["button", "summary", "h2", "h3", "h4"].includes(tagName);
}

function splitBulletList(value: string | undefined) {
  if (!value) {
    return [];
  }

  return value
    .split(/\n|•/)
    .map((item) => collapseWhitespace(item))
    .filter(Boolean);
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

function extractSubscriptionBlockText($: cheerio.CheerioAPI) {
  return collapseWhitespace(
    $("[data-e2e='subscribe-tab']").first().text() ||
      $("#subscribe-tab").first().text() ||
      $("body").text().match(/Subscription[\s\S]{0,200}/i)?.[0] ||
      ""
  );
}

function extractElementInnerHtmlCurrency(
  html: string | null | undefined,
  elementId: string
) {
  if (!html) {
    return null;
  }

  const escapedId = elementId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = html.match(
    new RegExp(`id=["']${escapedId}["'][^>]*>([\\s\\S]{0,80}?)<`, "i")
  );

  if (!match) {
    return null;
  }

  return match[1]
    .replace(/&pound;/gi, "£")
    .replace(/&#163;/g, "£")
    .replace(/<[^>]+>/g, " ")
    .trim();
}

function debugSubscriptionExtraction(html: string) {
  const $ = cheerio.load(html);
  const subscribeTab = $("[data-e2e='subscribe-tab']").first();

  return {
    tabText: collapseWhitespace(subscribeTab.text()).slice(0, 200),
    tabFragment: subscribeTab.attr("data-fragment") ?? null,
    inlinePrice: $("#subscription-price").first().text().trim() || null,
    inlineSave: $("#subscription-save").first().text().trim() || null,
    inlinePriceHtml: extractElementInnerHtmlCurrency(html, "subscription-price"),
    inlineSaveHtml: extractElementInnerHtmlCurrency(html, "subscription-save"),
    bodySnippet:
      html.match(/Subscription[\s\S]{0,300}/i)?.[0]?.replace(/\s+/g, " ").trim() ?? null,
  };
}

function extractVariantStateMap(html: string) {
  const bySku = new Map<string, any>();
  const currentVariantMatches = [...html.matchAll(/"currentVariant":(\{[\s\S]*?"price":\{[\s\S]*?\}\})/g)];

  for (const match of currentVariantMatches) {
    const parsed = tryParseJsonObject(match[1]);
    const sku = parsed?.sku;
    if (sku !== undefined && sku !== null) {
      bySku.set(String(sku), parsed);
    }
  }

  const broadMatches = [...html.matchAll(/"subscriptionContracts":\[[\s\S]*?\],"content":\[[\s\S]*?\],"sku":(\d+)[\s\S]*?"price":\{"price":\{"currency":"[^"]+","amount":"([^"]+)"/g)];
  for (const match of broadMatches) {
    const sku = match[1];
    if (!bySku.has(sku)) {
      bySku.set(sku, {
        sku: Number(sku),
        price: { price: { amount: match[2] } },
      });
    }
  }

  return bySku;
}

function getSubscriptionPriceFromVariantState(variantState: any): number | null {
  if (!variantState) {
    return null;
  }

  const contracts = Array.isArray(variantState.subscriptionContracts)
    ? variantState.subscriptionContracts
    : [];
  if (!contracts.length) {
    return null;
  }

  const initialDiscountPercentage =
    contracts.find((contract: any) => contract?.recommended)?.initialDiscountPercentage ??
    contracts[0]?.initialDiscountPercentage;
  const basePrice = Number(variantState?.price?.price?.amount);

  if (!Number.isFinite(basePrice) || !Number.isFinite(initialDiscountPercentage)) {
    return null;
  }

  return roundTo(basePrice * (1 - initialDiscountPercentage / 100), 2);
}

function tryParseJsonObject(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
