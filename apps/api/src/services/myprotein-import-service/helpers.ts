import { ProductCategory, Prisma } from "@proteindeals/db";
import type { MyproteinVariantRecord } from "../../scrapers/myprotein.js";
import type {
  MyproteinDbVariant,
  MyproteinFieldDiff,
  NutritionalInformationJson,
  NutritionalInformationRow,
} from "./types.js";

export function buildProductDescription(record: MyproteinVariantRecord) {
  const sections = [
    record.description,
    record.keyBenefits.length ? `Key Benefits: ${record.keyBenefits.join(" | ")}` : null,
    record.whyChoose ? `Why Choose: ${record.whyChoose}` : null,
    record.suggestedUse ? `Suggested Use: ${record.suggestedUse}` : null,
    record.productDetails ? `Product Details: ${record.productDetails}` : null,
  ].filter(Boolean);

  return sections.length ? sections.join("\n\n") : null;
}

export function getRetailerProductId(record: MyproteinVariantRecord) {
  const productSlug = createProductSlug(
    record.brand,
    record.productName,
    record.flavour,
    record.sizeLabel
  );
  return record.retailerProductId ?? `${productSlug}-${record.sizeLabel ?? "default"}`;
}

export function getFieldDiffs(record: MyproteinVariantRecord, current: MyproteinDbVariant) {
  const nextProteinPer100g = getCanonicalProteinPer100g(record);
  const servingsPerPack = deriveServingsPerPack(record);
  const nextDescription = buildProductDescription(record);
  const nextProductName = record.flavour
    ? `${record.productName} - ${record.flavour}`
    : record.productName;
  const nextCategory = inferCategory(record.productName);
  const nextServingSize =
    record.sizeG && servingsPerPack ? roundNullable(record.sizeG / servingsPerPack, 2) : null;
  const currentPrice = current.priceRecords[0];

  return [
    diff("name", current.product.name, nextProductName),
    diff("brand", current.product.brand, record.brand),
    diff("category", current.product.category, nextCategory),
    diff("categoryLabels", JSON.stringify(current.product.categoryLabels ?? null), JSON.stringify(record.categoryLabels)),
    diff("categoryUrls", JSON.stringify(current.product.categoryUrls ?? null), JSON.stringify(record.categoryUrls)),
    diff("proteinPer100g", toNumber(current.product.proteinPer100g), nextProteinPer100g),
    diff("servingSizeG", toNumber(current.product.servingSizeG), nextServingSize),
    diff("servingsPerPack", current.product.servingsPerPack, servingsPerPack),
    diff("description", current.product.description, nextDescription),
    diff("ingredients", current.product.ingredients, record.ingredients),
    diff(
      "nutritionalInformation",
      JSON.stringify(current.product.nutritionalInfo ?? null),
      JSON.stringify(record.nutritionalInformation)
    ),
    diff(
      "bundleLinks",
      JSON.stringify(current.product.bundleLinks ?? null),
      JSON.stringify(record.bundleLinks.length > 0 ? record.bundleLinks : null)
    ),
    diff("url", current.url, record.variantUrl),
    diff("flavour", current.flavour, record.flavour),
    diff("sizeG", toNumber(current.sizeG), record.sizeG),
    diff("inStock", current.inStock, record.inStock),
    diff("price", toNumber(currentPrice?.price ?? null), record.price),
    diff("pricePer100g", toNumber(currentPrice?.pricePer100g ?? null), record.pricePer100g),
    diff(
      "subscriptionPrice",
      toNumber(currentPrice?.subscriptionPrice ?? null),
      record.subscriptionPrice
    ),
    diff(
      "subscriptionPricePer100g",
      toNumber(currentPrice?.subscriptionPricePer100g ?? null),
      getSubscriptionPricePer100g(record)
    ),
    diff(
      "subscriptionSavings",
      toNumber(currentPrice?.subscriptionSavings ?? null),
      record.subscriptionSavings
    ),
    diff("wasOnSale", currentPrice?.wasOnSale ?? null, record.wasOnSale),
  ].filter((entry): entry is MyproteinFieldDiff => entry !== null);
}

function diff(
  field: string,
  current: string | number | boolean | null | undefined,
  next: string | number | boolean | null | undefined
) {
  const normalizedCurrent = normalizeComparable(current);
  const normalizedNext = normalizeComparable(next);
  if (normalizedCurrent === normalizedNext) return null;
  return {
    field,
    current: normalizedCurrent,
    next: normalizedNext,
  } satisfies MyproteinFieldDiff;
}

function normalizeComparable(value: string | number | boolean | null | undefined) {
  if (typeof value === "number") {
    return Number(value.toFixed(4));
  }
  return value ?? null;
}

export function toNumber(value: Prisma.Decimal | number | null | undefined) {
  if (value === null || value === undefined) return null;
  return Number(value);
}

export function roundNullable(value: number, digits: number) {
  return Number(value.toFixed(digits));
}

export function parseBundleLinks(value: NutritionalInformationJson): Array<{ name: string; url: string }> {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const obj = item as Record<string, unknown>;
      return typeof obj.name === "string" && typeof obj.url === "string"
        ? { name: obj.name, url: obj.url }
        : null;
    })
    .filter((item): item is { name: string; url: string } => item !== null);
}

export function parseNutritionalInformation(value: NutritionalInformationJson) {
  if (!Array.isArray(value)) return [];
  return value
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const item = row as Record<string, unknown>;
      return {
        label: typeof item.label === "string" ? item.label : "",
        per100g: typeof item.per100g === "string" ? item.per100g : null,
        perServing: typeof item.perServing === "string" ? item.perServing : null,
        perDailyServing:
          typeof item.perDailyServing === "string" ? item.perDailyServing : null,
        referenceIntake:
          typeof item.referenceIntake === "string" ? item.referenceIntake : null,
      };
    })
    .filter((row): row is NutritionalInformationRow => Boolean(row && row.label));
}

export function getCanonicalProteinPer100g(record: MyproteinVariantRecord) {
  const nutritionProtein = record.nutritionalInformation.find(
    (row) => row.label.trim().toLowerCase() === "protein"
  );
  const nutritionProteinValue = extractGramAmount(nutritionProtein?.per100g ?? null);
  const fallbackProteinPer100g = isReasonableProteinPer100g(record.proteinPer100g)
    ? record.proteinPer100g
    : null;
  return nutritionProteinValue ?? fallbackProteinPer100g;
}

function extractGramAmount(value: string | null) {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  const match = normalized.match(/(\d+(?:\.\d+)?)\s*g\b/);
  if (!match) return null;

  const amount = Number(match[1]);
  return isReasonableProteinPer100g(amount) ? amount : null;
}

function isReasonableProteinPer100g(value: number | null | undefined) {
  return value !== null && value !== undefined && Number.isFinite(value) && value >= 0 && value <= 100;
}

export function getSubscriptionPricePer100g(record: MyproteinVariantRecord) {
  if (record.subscriptionPrice === null || record.sizeG === null || record.sizeG <= 0) return null;
  return roundNullable((record.subscriptionPrice / record.sizeG) * 100, 4);
}

export function inferCategory(productName: string): ProductCategory {
  const lower = productName.toLowerCase();
  if (lower.includes("isolate")) return "whey_isolate";
  if (lower.includes("vegan")) return "vegan";
  if (lower.includes("casein")) return "casein";
  if (
    lower.includes("mass") ||
    lower.includes("gainer") ||
    lower.includes("weight gain")
  ) {
    return "mass_gainer";
  }
  if (lower.includes("plant")) return "plant_blend";
  if (lower.includes("whey")) return "whey_concentrate";
  return "other";
}

export function inferCategoryFromLabels(
  productName: string,
  categoryLabels: string[],
  categoryUrls: string[]
): ProductCategory {
  const joined = [productName, ...categoryLabels, ...categoryUrls].join(" ").toLowerCase();
  if (joined.includes("clear-protein")) return "whey_isolate";
  if (joined.includes("clear protein")) return "whey_isolate";
  if (joined.includes("isolate")) return "whey_isolate";
  if (joined.includes("vegan")) return "vegan";
  if (joined.includes("casein")) return "casein";
  if (
    joined.includes("weight-gainers") ||
    joined.includes("weight gain") ||
    joined.includes("mass gainer") ||
    joined.includes("gainer")
  ) {
    return "mass_gainer";
  }
  if (joined.includes("plant")) return "plant_blend";
  if (joined.includes("whey")) return "whey_concentrate";
  return inferCategory(productName);
}

export function createProductSlug(
  brand: string,
  productName: string,
  flavour: string | null,
  sizeLabel: string | null
) {
  return slugify([brand, productName, flavour, sizeLabel].filter(Boolean).join(" "));
}

function slugify(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function parseServings(value: string | null): number | null {
  if (!value) return null;
  const match = value.match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : null;
}

export function deriveServingsPerPack(record: Pick<
  MyproteinVariantRecord,
  "servingsLabel" | "suggestedUse" | "sizeG" | "price" | "pricePerServingLabel"
>) {
  const explicitServings = parseServings(record.servingsLabel);
  if (explicitServings && explicitServings > 0) return explicitServings;

  const servingSizeFromSuggestedUse = parseServingSizeFromSuggestedUse(record.suggestedUse);
  if (record.sizeG && servingSizeFromSuggestedUse && servingSizeFromSuggestedUse > 0) {
    return Math.round(record.sizeG / servingSizeFromSuggestedUse);
  }

  const pricePerServing = parsePricePerServing(record.pricePerServingLabel);
  if (record.price && pricePerServing && pricePerServing > 0) {
    return Math.round(record.price / pricePerServing);
  }

  return null;
}

function parseServingSizeFromSuggestedUse(value: string | null) {
  if (!value) return null;
  const normalized = value.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();

  const gramMatch = normalized.match(/\((\d+(?:\.\d+)?)\s*g\)/i);
  if (gramMatch) return Number(gramMatch[1]);

  const directMatch = normalized.match(/\b(?:one|1)\s+(?:scoop|serving|portion|tablet|capsule|softgel|gummy|stick|sachet)\b[^0-9]{0,30}(\d+(?:\.\d+)?)\s*g\b/i);
  if (directMatch) return Number(directMatch[1]);

  const servingSizeMatch = normalized.match(/\bserving size\b[^0-9]{0,10}(\d+(?:\.\d+)?)\s*g\b/i);
  if (servingSizeMatch) return Number(servingSizeMatch[1]);

  return null;
}

function parsePricePerServing(value: string | null) {
  if (!value) return null;
  const match = value.match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : null;
}

export function formatCategoryLabel(category: ProductCategory) {
  switch (category) {
    case "whey_concentrate":
      return "Whey Concentrate";
    case "whey_isolate":
      return "Whey Isolate";
    case "vegan":
      return "Vegan";
    case "casein":
      return "Casein";
    case "mass_gainer":
      return "Mass Gainer";
    case "plant_blend":
      return "Plant Blend";
    default:
      return "Other";
  }
}

export function formatProductType(
  category: ProductCategory,
  categoryLabels: string[] | null | undefined
) {
  if (category !== "other") {
    return formatCategoryLabel(category);
  }

  const firstLabel = categoryLabels?.find((label) => typeof label === "string" && label.trim());
  return firstLabel ?? "Other";
}

export function formatCategoryList(categoryLabels: string[] | null | undefined, fallback: string) {
  const normalized = (categoryLabels ?? [])
    .map((label) => label.trim())
    .filter(Boolean);

  if (!normalized.length) {
    return fallback;
  }

  return [...new Set(normalized)].join(", ");
}

export function inferTopLevelCategory(
  categoryLabels: string[] | null | undefined,
  categoryUrls: string[] | null | undefined,
  fallback: string
) {
  const joined = [
    ...(categoryLabels ?? []),
    ...(categoryUrls ?? []),
  ]
    .join(" ")
    .toLowerCase();

  if (
    joined.includes("/c/nutrition/protein/") ||
    joined.includes("/c/clear-protein/") ||
    joined.includes("protein shakes") ||
    joined.includes("whey protein") ||
    joined.includes("casein protein") ||
    joined.includes("vegan shakes")
  ) {
    return "Protein";
  }

  if (
    joined.includes("/c/nutrition/vitamins/") ||
    joined.includes("/c/nutrition/vitamins-minerals/") ||
    joined.includes("/c/vitamin-gummies-range/") ||
    joined.includes("vitamins")
  ) {
    return "Vitamins";
  }

  if (
    joined.includes("/c/nutrition/healthy-food-drinks/") ||
    joined.includes("protein bars") ||
    joined.includes("protein snacks") ||
    joined.includes("protein foods")
  ) {
    return "Food, Bars & Snacks";
  }

  if (
    joined.includes("/c/nutrition/accessories/") ||
    joined.includes("accessories")
  ) {
    return "Accessories";
  }

  if (
    joined.includes("/c/nutrition/creatine/") ||
    joined.includes("/c/nutrition/amino-acids/") ||
    joined.includes("/c/nutrition/pre-post-workout/") ||
    joined.includes("/c/nutrition/recovery/") ||
    joined.includes("/c/nutrition/carbohydrates/") ||
    joined.includes("/c/nutrition/weight-management/") ||
    joined.includes("/c/glp1-nutrition-support/") ||
    joined.includes("/c/performance/") ||
    joined.includes("creatine") ||
    joined.includes("pre workout") ||
    joined.includes("amino acids") ||
    joined.includes("recovery")
  ) {
    return "Supplements";
  }

  return fallback;
}

export function formatSizeLabel(sizeG: number | null) {
  if (sizeG === null || sizeG <= 0) {
    return "Unknown size";
  }
  if (sizeG >= 1000) {
    const kg = sizeG / 1000;
    return Number.isInteger(kg) ? `${kg}kg` : `${kg.toFixed(2)}kg`;
  }
  return `${sizeG}g`;
}
