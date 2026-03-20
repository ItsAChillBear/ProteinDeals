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

export type {
  MyproteinVariantRecord,
  ScrapeMyproteinOptions,
} from "./myprotein/types.js";

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
}) {
  const { productHtml, productUrl, categoryUrl, fetchImpl, onProgress, onVariant } = args;
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
      categoryUrl,
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
  categoryUrl: string;
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
  const { variant, index, total, productUrl, categoryUrl, fetchImpl, onProgress, context } =
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
    categoryUrl,
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
