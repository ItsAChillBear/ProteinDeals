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
  pricePer100g: number | null;
  proteinPer100g: number | null;
  inStock: boolean;
  currency: string | null;
  imageUrl: string | null;
  scrapedAt: string;
}

export interface ScrapeMyproteinOptions {
  categoryUrl?: string;
  limitProducts?: number;
  fetchImpl?: typeof fetch;
  onProgress?: (message: string) => void | Promise<void>;
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
}): Promise<MyproteinVariantRecord[]> {
  const { productHtml, productUrl, categoryUrl, fetchImpl, onProgress } = args;
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
    const variantPage = parseVariantPage(variantHtml, variantUrl);
    const flavour = extractVariantFlavour(variant) ?? variantPage.flavour;
    const retailerProductId =
      variantPage.retailerProductId ?? asString(variant.sku) ?? groupId ?? null;

    const sizeLabel = variantPage.sizeLabel;
    const sizeG = parseSizeToGrams(sizeLabel ?? variantPage.ariaLabel ?? productName);
    const originalPrice = variantPage.originalPrice;
    const price = variantPage.price ?? parseNumber(offer?.price);
    const pricePer100g =
      price && sizeG ? roundTo((price / sizeG) * 100, 4) : null;

    variantRecords.push({
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
      pricePer100g,
      proteinPer100g: variantPage.proteinPer100g,
      inStock: variantPage.inStock,
      currency: asString(offer?.priceCurrency) ?? variantPage.currency,
      imageUrl: variantPage.imageUrl ?? asString(variant.image) ?? defaultImageUrl ?? null,
      scrapedAt: new Date().toISOString(),
    });
  }

  return variantRecords;
}

function parseVariantPage(html: string, pageUrl: string) {
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

function parseCurrency(value: string | null): number | null {
  if (!value) {
    return null;
  }
  const normalized = value.replace(/[^\d.]/g, "");
  return normalized ? Number(normalized) : null;
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
