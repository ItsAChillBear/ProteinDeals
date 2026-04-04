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
  const servingsPerPack = parseServings(record.servingsLabel);
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
      };
    })
    .filter((row): row is NutritionalInformationRow => Boolean(row && row.label));
}

export function getCanonicalProteinPer100g(record: MyproteinVariantRecord) {
  const nutritionProtein = record.nutritionalInformation.find(
    (row) => row.label.trim().toLowerCase() === "protein"
  );
  const nutritionProteinValue = extractGramAmount(nutritionProtein?.per100g ?? null);
  return nutritionProteinValue ?? record.proteinPer100g;
}

function extractGramAmount(value: string | null) {
  if (!value) return null;
  const match = value.match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : null;
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
  if (lower.includes("mass")) return "mass_gainer";
  if (lower.includes("plant")) return "plant_blend";
  if (lower.includes("whey")) return "whey_concentrate";
  return "other";
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

export function formatSizeLabel(sizeG: number) {
  if (sizeG >= 1000) {
    const kg = sizeG / 1000;
    return Number.isInteger(kg) ? `${kg}kg` : `${kg.toFixed(2)}kg`;
  }
  return `${sizeG}g`;
}
