import {
  asArray,
  asObject,
  asString,
  extractBrandName,
  extractCategoryProductUrls,
  extractJsonLdNodes,
  extractVariantFlavour,
  fetchText,
  parseNumber,
  parseSizeToGrams,
  resolveUrl,
  roundTo,
} from "./myprotein/helpers.js";
import * as cheerio from "cheerio";
import { extractMyproteinProductContent } from "./myprotein/content.js";
import type {
  MyproteinVariantRecord,
  ScrapeMyproteinOptions,
} from "./myprotein/types.js";
import { parseVariantPage } from "./myprotein/variant-page.js";
import {
  extractVariantStateMap,
  getSubscriptionPriceFromVariantState,
} from "./myprotein/variant-state.js";

const DEFAULT_CATEGORY_URL =
  "https://www.myprotein.com/c/nutrition/protein/whey-protein/";
const DEFAULT_CATEGORY_TARGETS: CategoryTarget[] = [
  { label: "Whey Protein", url: "https://www.myprotein.com/c/nutrition/protein/whey-protein/" },
  { label: "Clear Protein Drinks", url: "https://www.myprotein.com/c/clear-protein/" },
  { label: "Protein Isolate", url: "https://www.myprotein.com/c/nutrition/protein/protein-isolate/" },
  { label: "Casein Protein", url: "https://www.myprotein.com/c/nutrition/protein/milk-protein/" },
  { label: "Protein Blends", url: "https://www.myprotein.com/c/nutrition/protein/blends/" },
  { label: "Protein Smoothies", url: "https://www.myprotein.com/p/sports-nutrition/breakfast-smoothie/13251950/" },
  { label: "Protein Samples", url: "https://www.myprotein.com/c/nutrition/healthy-food-drinks/protein-foods/protein-samples/" },
  { label: "Collagen Protein", url: "https://www.myprotein.com/c/nutrition/collagen/" },
  { label: "Vegan Shakes", url: "https://www.myprotein.com/c/nutrition/protein/vegan-protein/" },
  { label: "Diet Protein", url: "https://www.myprotein.com/c/nutrition/protein/diet/" },
  { label: "Weight Gainers", url: "https://www.myprotein.com/c/nutrition/weight-management/weight-gainers/" },
  { label: "Meal Replacement", url: "https://www.myprotein.com/c/nutrition/healthy-food-drinks/meal-replacement/" },
  { label: "Creatine", url: "https://www.myprotein.com/c/nutrition/creatine/" },
  { label: "Creatine Monohydrate", url: "https://www.myprotein.com/c/nutrition/creatine/creatine-monohydrate/" },
  { label: "Amino Acids", url: "https://www.myprotein.com/c/nutrition/amino-acids/" },
  { label: "BCAA Supplements", url: "https://www.myprotein.com/c/nutrition/amino-acids/bcaa/" },
  { label: "EAA Supplements", url: "https://www.myprotein.com/c/nutrition/amino-acids/eaa/" },
  { label: "Glutamine Supplements", url: "https://www.myprotein.com/c/nutrition/amino-acids/glutamine/" },
  { label: "L-Carnitine Supplements", url: "https://www.myprotein.com/c/nutrition/amino-acids/l-carnitine/" },
  { label: "Pre Workout", url: "https://www.myprotein.com/c/nutrition/pre-post-workout/pre-workout/" },
  { label: "Caffeine Free Pre Workout", url: "https://www.myprotein.com/c/nutrition/caffeine-free-preworkout/" },
  { label: "Energy Drinks", url: "https://www.myprotein.com/c/nutrition/carbohydrates/energy-drinks/" },
  { label: "Weight Management", url: "https://www.myprotein.com/c/nutrition/weight-management/" },
  { label: "Weight Loss Supplements", url: "https://www.myprotein.com/c/nutrition/weight-management/weight-loss-supplements/" },
  { label: "GLP1 Nutrition Support", url: "https://www.myprotein.com/c/glp1-nutrition-support/" },
  { label: "Recovery", url: "https://www.myprotein.com/c/nutrition/recovery/" },
  { label: "Intra Workout", url: "https://www.myprotein.com/c/nutrition/pre-post-workout/intra-workout/" },
  { label: "Post Workout", url: "https://www.myprotein.com/c/nutrition/pre-post-workout/post-workout/" },
  { label: "Hydration", url: "https://www.myprotein.com/c/performance/electrolyte-supplements/" },
  { label: "Energy And Carbohydrates", url: "https://www.myprotein.com/c/nutrition/carbohydrates/" },
  { label: "Energy Supplements", url: "https://www.myprotein.com/c/nutrition/carbohydrates/energy-supplements/" },
  { label: "Energy Bars", url: "https://www.myprotein.com/c/nutrition/carbohydrates/energy-bars/" },
  { label: "Energy Gels", url: "https://www.myprotein.com/c/nutrition/carbohydrates/energy-gels/" },
  { label: "Vitamins", url: "https://www.myprotein.com/c/nutrition/vitamins/" },
  { label: "Trending Vitamins And Supplements", url: "https://www.myprotein.com/c/nutrition/vitamins-minerals/trending-vitamins-supplements/" },
  { label: "Shop All Vitamins Minerals And Supplements", url: "https://www.myprotein.com/c/nutrition/vitamins-minerals/" },
  { label: "Vitamin Gummies", url: "https://www.myprotein.com/c/vitamin-gummies-range/" },
  { label: "Healthy Food And Drinks", url: "https://www.myprotein.com/c/nutrition/healthy-food-drinks/" },
  { label: "Protein Foods", url: "https://www.myprotein.com/c/nutrition/healthy-food-drinks/protein-foods/" },
  { label: "Protein Bars", url: "https://www.myprotein.com/c/nutrition/healthy-food-drinks/protein-bars/" },
  { label: "Protein Snacks", url: "https://www.myprotein.com/c/nutrition/healthy-food-drinks/protein-snacks/" },
  { label: "Accessories", url: "https://www.myprotein.com/c/nutrition/accessories/" },
];

type CategoryTarget = {
  url: string;
  label: string;
};

type ScrapeSkip = {
  productUrl: string;
  reason: string;
};

export type {
  MyproteinVariantRecord,
  ScrapeMyproteinOptions,
} from "./myprotein/types.js";

export async function scrapeMyproteinWheyProducts(
  options: ScrapeMyproteinOptions = {}
): Promise<MyproteinVariantRecord[]> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const categoryTargets = await resolveCategoryTargets(options, fetchImpl);
  await options.onProgress?.(`Resolved ${categoryTargets.length} Myprotein category sections`);

  const productCategoryMap = new Map<string, CategoryTarget[]>();
  for (const category of categoryTargets) {
    if (isProductUrl(category.url)) {
      await options.onProgress?.(`Fetching category ${category.label}: ${category.url}`);
      const resolvedProductUrls = [category.url];
      await options.onProgress?.(
        `Category ${category.label} resolved as a direct product target`
      );

      for (const productUrl of resolvedProductUrls) {
        const existing = productCategoryMap.get(productUrl) ?? [];
        if (!existing.some((entry) => entry.url === category.url)) {
          existing.push(category);
        }
        productCategoryMap.set(productUrl, existing);
      }
      continue;
    }

    const seenCategoryProductUrls = new Set<string>();
    let pageNumber = 1;

    while (true) {
      const pageUrl = buildCategoryPageUrl(category.url, pageNumber);
      await options.onProgress?.(
        `Fetching category ${category.label} page ${pageNumber}: ${pageUrl}`
      );

      const listingHtml = await fetchText(pageUrl, fetchImpl);
      const listingNodes = extractJsonLdNodes(listingHtml);
      const productUrls = extractCategoryProductUrls(listingNodes, pageUrl);
      const newProductUrls = productUrls.filter((url) => !seenCategoryProductUrls.has(url));

      if (pageNumber === 1 && productUrls.length === 0) {
        await options.onProgress?.(
          `Category ${category.label} page 1 returned no product URLs`
        );
      }

      for (const productUrl of newProductUrls) {
        seenCategoryProductUrls.add(productUrl);
        const existing = productCategoryMap.get(productUrl) ?? [];
        if (!existing.some((entry) => entry.url === category.url)) {
          existing.push(category);
        }
        productCategoryMap.set(productUrl, existing);
      }

      if (productUrls.length === 0 || newProductUrls.length === 0) {
        if (pageNumber > 1) {
          await options.onProgress?.(
            `Finished category ${category.label} after ${pageNumber - 1} page${pageNumber - 1 === 1 ? "" : "s"}`
          );
        }
        break;
      }

      pageNumber += 1;
    }
  }

  const dedupedProductUrls = [...productCategoryMap.keys()];
  const limitedProductUrls =
    typeof options.limitProducts === "number"
      ? dedupedProductUrls.slice(0, options.limitProducts)
      : dedupedProductUrls;

  await options.onProgress?.(
    `Discovered ${dedupedProductUrls.length} unique products across ${categoryTargets.length} sections, scraping ${limitedProductUrls.length}`
  );

  const results: MyproteinVariantRecord[] = [];
  const skippedProducts: ScrapeSkip[] = [];
  for (const [index, productUrl] of limitedProductUrls.entries()) {
    const categoryTargetsForProduct = productCategoryMap.get(productUrl) ?? [];
    await options.onProgress?.(
      `Loading product ${index + 1}/${limitedProductUrls.length}: ${productUrl} (${categoryTargetsForProduct.length} categories)`
    );

    const productHtml = await fetchText(productUrl, fetchImpl);
    const productResults = await extractProductVariants({
      productHtml,
      productUrl,
      categoryTargets: categoryTargetsForProduct,
      fetchImpl,
      onProgress: options.onProgress,
      onVariant: options.onVariant,
      onSkipProduct: (skip) => {
        skippedProducts.push(skip);
      },
    });

    results.push(...productResults);
    await options.onProgress?.(
      `Finished product ${index + 1}/${limitedProductUrls.length}: ${productResults.length} variants`
    );
  }

  if (skippedProducts.length > 0) {
    await options.onProgress?.(
      `Skipped ${skippedProducts.length} product${skippedProducts.length === 1 ? "" : "s"} due to unexpected structure`
    );

    for (const [index, skip] of skippedProducts.entries()) {
      await options.onProgress?.(
        `  Skipped ${index + 1}/${skippedProducts.length}: ${skip.productUrl} (${skip.reason})`
      );
    }
  }

  await options.onProgress?.(`Scrape complete: ${results.length} variants collected`);
  return results;
}

async function extractProductVariants(args: {
  productHtml: string;
  productUrl: string;
  categoryTargets: CategoryTarget[];
  fetchImpl: typeof fetch;
  onProgress?: (message: string) => void | Promise<void>;
  onVariant?: (record: MyproteinVariantRecord) => void | Promise<void>;
  onSkipProduct?: (skip: ScrapeSkip) => void | Promise<void>;
}) {
  const {
    productHtml,
    productUrl,
    categoryTargets,
    fetchImpl,
    onProgress,
    onVariant,
    onSkipProduct,
  } = args;
  const nodes = extractJsonLdNodes(productHtml);
  const productGroup = nodes.find((node) => node["@type"] === "ProductGroup");
  if (!productGroup) {
    const fallbackRecord = await scrapeFallbackProduct({
      productHtml,
      productUrl,
      categoryTargets,
      fetchImpl,
      onProgress,
    });
    if (fallbackRecord) {
      await onProgress?.(
        `Product "${fallbackRecord.productName}" uses fallback parsing (no ProductGroup JSON-LD)`
      );
      await onVariant?.(fallbackRecord);
      return [fallbackRecord];
    }

    const reason = "missing ProductGroup JSON-LD and fallback parsing failed";
    await onProgress?.(`Skipped product with ${reason}: ${productUrl}`);
    await onSkipProduct?.({ productUrl, reason });
    return [];
  }

  const context = {
    brand: extractBrandName(productGroup) ?? "MyProtein",
    productName: asString(productGroup.name) ?? "Unknown product",
    groupId: asString(productGroup.productGroupID),
    defaultImageUrl: asString(productGroup.image),
    variants: asArray(productGroup.hasVariant),
    productContent: extractMyproteinProductContent(productHtml),
    variantStateMap: extractVariantStateMap(productHtml),
  };

  await onProgress?.(
    `Product "${context.productName}" exposes ${context.variants.length} variants`
  );

  const variantRecords: MyproteinVariantRecord[] = [];
  for (const [index, variantNode] of context.variants.entries()) {
    const variant = asObject(variantNode);
    if (!variant) continue;

    const record = await scrapeVariant({
      variant,
      index,
      total: context.variants.length,
      productUrl,
      categoryTargets,
      fetchImpl,
      onProgress,
      context,
    });

    if (!record) continue;
    variantRecords.push(record);
    await onVariant?.(record);
  }

  return variantRecords;
}

async function scrapeFallbackProduct(args: {
  productHtml: string;
  productUrl: string;
  categoryTargets: CategoryTarget[];
  fetchImpl: typeof fetch;
  onProgress?: (message: string) => void | Promise<void>;
}): Promise<MyproteinVariantRecord | null> {
  const { productHtml, productUrl, categoryTargets, fetchImpl } = args;
  const productContent = extractMyproteinProductContent(productHtml);
  const variantStateMap = extractVariantStateMap(productHtml);
  const variantPage = await parseVariantPage(productHtml, productUrl, fetchImpl);
  const $ = cheerio.load(productHtml);

  const productName = extractFallbackProductName($, productHtml);
  if (!productName) return null;

  const retailerProductId = variantPage.retailerProductId ?? extractRetailerProductIdFromUrl(productUrl);
  const variantState = retailerProductId
    ? variantStateMap.get(retailerProductId) ?? [...variantStateMap.values()][0] ?? null
    : [...variantStateMap.values()][0] ?? null;
  const sizeLabel = variantPage.sizeLabel;
  const sizeG = parseSizeToGrams(sizeLabel ?? variantPage.ariaLabel ?? productName);
  const price = variantPage.price ?? parseNumber(variantState?.price?.price?.amount);
  const subscriptionPrice =
    getSubscriptionPriceFromVariantState(variantState) ?? variantPage.subscriptionPrice;
  const subscriptionSavings =
    subscriptionPrice !== null && price !== null && subscriptionPrice < price
      ? roundTo(price - subscriptionPrice, 2)
      : variantPage.subscriptionSavings;

  return {
    retailer: "MyProtein",
    brand: extractFallbackBrandName($) ?? "MyProtein",
    productName,
    categoryUrl: categoryTargets[0]?.url ?? DEFAULT_CATEGORY_URL,
    categoryUrls: categoryTargets.map((target) => target.url),
    categoryLabels: categoryTargets.map((target) => target.label),
    productUrl,
    variantUrl: productUrl,
    retailerProductId,
    groupId: retailerProductId,
    flavour: normalizeFallbackFlavour(variantPage.flavour),
    sizeLabel,
    sizeG,
    servingsLabel: variantPage.servingsLabel,
    pricePerServingLabel: variantPage.pricePerServingLabel,
    price,
    originalPrice: variantPage.originalPrice,
    wasOnSale:
      price !== null &&
      variantPage.originalPrice !== null &&
      variantPage.originalPrice > price,
    subscriptionPrice,
    subscriptionSavings,
    pricePer100g: price !== null && sizeG ? roundTo((price / sizeG) * 100, 4) : null,
    proteinPer100g: variantPage.proteinPer100g,
    inStock: variantPage.inStock,
    currency: variantPage.currency ?? "GBP",
    imageUrl: variantPage.imageUrl ?? extractFallbackImageUrl($),
    description: productContent.description,
    keyBenefits: productContent.keyBenefits,
    whyChoose: productContent.whyChoose,
    suggestedUse: productContent.suggestedUse,
    ingredients: productContent.ingredients,
    faqEntries: productContent.faqEntries,
    bundleLinks: productContent.bundleLinks,
    nutritionalInformation: productContent.nutritionalInformation,
    productDetails: productContent.productDetails,
    scrapedAt: new Date().toISOString(),
  } satisfies MyproteinVariantRecord;
}

async function scrapeVariant(args: {
  variant: Record<string, unknown>;
  index: number;
  total: number;
  productUrl: string;
  categoryTargets: CategoryTarget[];
  fetchImpl: typeof fetch;
  onProgress?: (message: string) => void | Promise<void>;
  context: {
    brand: string;
    productName: string;
    groupId: string | null;
    defaultImageUrl: string | null;
    productContent: ReturnType<typeof extractMyproteinProductContent>;
    variantStateMap: Map<string, any>;
  };
}) {
  const { variant, index, total, productUrl, categoryTargets, fetchImpl, onProgress, context } =
    args;
  const offer = asObject(variant.offers);
  const variantUrl = resolveUrl(productUrl, asString(offer?.url) ?? productUrl);
  const variantName =
    extractVariantFlavour(variant) ?? asString(variant.name) ?? `Variant ${index + 1}`;

  await onProgress?.(`  Variant ${index + 1}/${total}: ${variantName}`);

  const variantHtml = await fetchText(variantUrl, fetchImpl);
  const variantPage = await parseVariantPage(variantHtml, variantUrl, fetchImpl);

  const retailerProductId =
    variantPage.retailerProductId ?? asString(variant.sku) ?? context.groupId ?? null;
  const variantState = retailerProductId
    ? context.variantStateMap.get(retailerProductId) ?? null
    : null;
  const sizeLabel = variantPage.sizeLabel;
  const sizeG = parseSizeToGrams(sizeLabel ?? variantPage.ariaLabel ?? context.productName);
  const price = variantPage.price ?? parseNumber(offer?.price);
  const subscriptionPrice =
    getSubscriptionPriceFromVariantState(variantState) ?? variantPage.subscriptionPrice;
  const subscriptionSavings =
    subscriptionPrice !== null && price !== null && subscriptionPrice < price
      ? roundTo(price - subscriptionPrice, 2)
      : variantPage.subscriptionSavings;
  const imageUrl = pickBestImageUrl(
    asString(variant.image),
    variantPage.imageUrl,
    context.defaultImageUrl
  );

  return {
    retailer: "MyProtein",
    brand: context.brand,
    productName: context.productName,
    categoryUrl: categoryTargets[0]?.url ?? DEFAULT_CATEGORY_URL,
    categoryUrls: categoryTargets.map((target) => target.url),
    categoryLabels: categoryTargets.map((target) => target.label),
    productUrl,
    variantUrl,
    retailerProductId,
    groupId: context.groupId,
    flavour: extractVariantFlavour(variant) ?? variantPage.flavour,
    sizeLabel,
    sizeG,
    servingsLabel: variantPage.servingsLabel,
    pricePerServingLabel: variantPage.pricePerServingLabel,
    price,
    originalPrice: variantPage.originalPrice,
    wasOnSale:
      price !== null &&
      variantPage.originalPrice !== null &&
      variantPage.originalPrice > price,
    subscriptionPrice,
    subscriptionSavings,
    pricePer100g: price && sizeG ? roundTo((price / sizeG) * 100, 4) : null,
    proteinPer100g: variantPage.proteinPer100g,
    inStock: variantPage.inStock,
    currency: asString(offer?.priceCurrency) ?? variantPage.currency,
    imageUrl,
    description: context.productContent.description,
    keyBenefits: context.productContent.keyBenefits,
    whyChoose: context.productContent.whyChoose,
    suggestedUse: context.productContent.suggestedUse,
    ingredients: context.productContent.ingredients,
    faqEntries: context.productContent.faqEntries,
    bundleLinks: context.productContent.bundleLinks,
    nutritionalInformation: context.productContent.nutritionalInformation,
    productDetails: context.productContent.productDetails,
    scrapedAt: new Date().toISOString(),
} satisfies MyproteinVariantRecord;
}

async function resolveCategoryTargets(
  options: ScrapeMyproteinOptions,
  fetchImpl: typeof fetch
): Promise<CategoryTarget[]> {
  if (options.categoryTargets?.length) {
    return dedupeCategoryTargets(
      options.categoryTargets.filter(
        (target): target is CategoryTarget =>
          Boolean(target.url && target.label)
      )
    );
  }

  const explicitCategoryUrls = options.categoryUrls ?? (options.categoryUrl ? [options.categoryUrl] : null);
  if (explicitCategoryUrls?.length) {
    return dedupeCategoryTargets(explicitCategoryUrls.map((url) => ({ url, label: inferCategoryLabel(url) })));
  }

  return dedupeCategoryTargets(DEFAULT_CATEGORY_TARGETS);
}

function dedupeCategoryTargets(targets: CategoryTarget[]) {
  const byUrl = new Map<string, CategoryTarget>();
  for (const target of targets) {
    if (!byUrl.has(target.url)) {
      byUrl.set(target.url, target);
    }
  }
  return [...byUrl.values()];
}

function inferCategoryLabel(url: string) {
  const parts = new URL(url).pathname.replace(/\/+$/, "").split("/").filter(Boolean);
  const slug =
    parts[0] === "p"
      ? parts.at(-2) ?? parts.at(-1) ?? "other"
      : parts.at(-1) ?? "other";
  return slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function isProductUrl(url: string) {
  return url.includes("/p/");
}

function buildCategoryPageUrl(categoryUrl: string, pageNumber: number) {
  if (pageNumber <= 1) return categoryUrl;

  const url = new URL(categoryUrl);
  url.searchParams.set("pageNumber", String(pageNumber));
  return url.toString();
}

function pickBestImageUrl(...candidates: Array<string | null>) {
  for (const candidate of candidates) {
    if (!candidate) continue;
    if (isGenericMarketingImage(candidate)) continue;
    return candidate;
  }

  return candidates.find(Boolean) ?? null;
}

function extractFallbackProductName($: cheerio.CheerioAPI, html: string) {
  const metaTitle =
    $("meta[property='og:title']").attr("content")?.trim() ??
    $("meta[name='twitter:title']").attr("content")?.trim() ??
    null;
  const heading =
    $("h1").first().text().trim() ||
    $("[data-e2e='product-name']").first().text().trim() ||
    "";
  const documentTitle = $("title").first().text().trim();

  return (
    sanitizeFallbackTitle(heading) ??
    sanitizeFallbackTitle(metaTitle) ??
    sanitizeFallbackTitle(documentTitle) ??
    extractProductNameFromRawHtml(html)
  );
}

function sanitizeFallbackTitle(value: string | null) {
  if (!value) return null;
  const normalized = value
    .replace(/\s+/g, " ")
    .replace(/\|\s*Myprotein.*$/i, "")
    .replace(/\|\s*The Zone.*$/i, "")
    .replace(/\s+-\s+Buy now.*$/i, "")
    .trim();
  return normalized || null;
}

function extractProductNameFromRawHtml(html: string) {
  const match =
    html.match(/"productTitle"\s*:\s*"([^"]+)"/i) ??
    html.match(/"name"\s*:\s*"([^"]+)"/i);
  return match?.[1]?.trim() || null;
}

function extractFallbackBrandName($: cheerio.CheerioAPI) {
  return (
    $("meta[property='product:brand']").attr("content")?.trim() ??
    $("meta[name='brand']").attr("content")?.trim() ??
    null
  );
}

function normalizeFallbackFlavour(flavour: string | null) {
  if (!flavour) return null;
  const normalized = flavour.trim();
  if (!normalized || /^all$/i.test(normalized)) return null;
  return normalized;
}

function extractRetailerProductIdFromUrl(url: string) {
  const pathname = new URL(url).pathname.replace(/\/+$/, "");
  const segments = pathname.split("/").filter(Boolean);
  const lastSegment = segments.at(-1) ?? null;
  return lastSegment && /^\d+$/.test(lastSegment) ? lastSegment : null;
}

function extractFallbackImageUrl($: cheerio.CheerioAPI) {
  return (
    $("meta[property='og:image']").attr("content")?.trim() ??
    $("meta[name='twitter:image']").attr("content")?.trim() ??
    null
  );
}

function isGenericMarketingImage(url: string) {
  return (
    url.includes("/navigation/") ||
    url.includes("Trending%402x") ||
    url.includes("/images?url=https://static.thcdn.com/navigation/")
  );
}
