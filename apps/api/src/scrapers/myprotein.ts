import {
  asArray,
  asObject,
  asString,
  extractBrandName,
  extractCategoryLinks,
  extractCategoryProductUrls,
  extractJsonLdNodes,
  extractVariantFlavour,
  fetchText,
  parseNumber,
  parseSizeToGrams,
  resolveUrl,
  roundTo,
} from "./myprotein/helpers.js";
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
const PROTEIN_LANDING_URL = "https://www.myprotein.com/c/nutrition/protein/";
const EXTRA_CATEGORY_URLS = [
  "https://www.myprotein.com/c/nutrition/protein/diet/",
  "https://www.myprotein.com/c/nutrition/weight-management/weight-gainers/",
  "https://www.myprotein.com/c/nutrition/healthy-food-drinks/meal-replacement/",
];

type CategoryTarget = {
  url: string;
  label: string;
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
    await options.onProgress?.(`Fetching category ${category.label}: ${category.url}`);

    const listingHtml = await fetchText(category.url, fetchImpl);
    const listingNodes = extractJsonLdNodes(listingHtml);
    const productUrls = extractCategoryProductUrls(listingNodes, category.url);
    const resolvedProductUrls =
      productUrls.length > 0
        ? productUrls
        : isProductUrl(category.url)
          ? [category.url]
          : [];

    if (productUrls.length === 0 && resolvedProductUrls.length > 0) {
      await options.onProgress?.(
        `Category ${category.label} resolved as a direct product target`
      );
    }

    for (const productUrl of resolvedProductUrls) {
      const existing = productCategoryMap.get(productUrl) ?? [];
      if (!existing.some((entry) => entry.url === category.url)) {
        existing.push(category);
      }
      productCategoryMap.set(productUrl, existing);
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
  categoryTargets: CategoryTarget[];
  fetchImpl: typeof fetch;
  onProgress?: (message: string) => void | Promise<void>;
  onVariant?: (record: MyproteinVariantRecord) => void | Promise<void>;
}) {
  const { productHtml, productUrl, categoryTargets, fetchImpl, onProgress, onVariant } = args;
  const nodes = extractJsonLdNodes(productHtml);
  const productGroup = nodes.find((node) => node["@type"] === "ProductGroup");
  if (!productGroup) {
    await onProgress?.(`Skipped product with no ProductGroup JSON-LD: ${productUrl}`);
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

  const landingHtml = await fetchText(PROTEIN_LANDING_URL, fetchImpl);
  const landingLinks = extractCategoryLinks(landingHtml, PROTEIN_LANDING_URL);
  const discoveredProteinCategories = landingLinks.filter((url) => isProteinCategoryUrl(url));

  return dedupeCategoryTargets(
    [DEFAULT_CATEGORY_URL, ...discoveredProteinCategories, ...EXTRA_CATEGORY_URLS].map((url) => ({
      url,
      label: inferCategoryLabel(url),
    }))
  );
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

function isProteinCategoryUrl(url: string) {
  return (
    url.startsWith("https://www.myprotein.com/c/nutrition/protein/") ||
    url.startsWith("https://www.myprotein.com/c/clear-protein/")
  );
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

function pickBestImageUrl(...candidates: Array<string | null>) {
  for (const candidate of candidates) {
    if (!candidate) continue;
    if (isGenericMarketingImage(candidate)) continue;
    return candidate;
  }

  return candidates.find(Boolean) ?? null;
}

function isGenericMarketingImage(url: string) {
  return (
    url.includes("/navigation/") ||
    url.includes("Trending%402x") ||
    url.includes("/images?url=https://static.thcdn.com/navigation/")
  );
}
