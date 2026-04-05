import type { Product } from "./price-comparison-table.types";

export function getProteinPer100g(product: Product) {
  const proteinRow = product.nutritionalInformation.find(
    (row) => row.label.trim().toLowerCase() === "protein"
  );
  const nutritionProtein = extractNumericValue(proteinRow?.per100g ?? null);
  return nutritionProtein ?? product.proteinPer100g;
}

export function getCaloriesPer100g(product: Product) {
  const kcalRow = product.nutritionalInformation.find(
    (row) =>
      row.label.trim().toLowerCase() === "energy" &&
      typeof row.per100g === "string" &&
      row.per100g.toLowerCase().includes("kcal")
  );

  if (kcalRow?.per100g) {
    return extractNumericValue(kcalRow.per100g);
  }

  return null;
}

export function getProteinPerServingFromNutrition(product: Product) {
  const proteinRow = product.nutritionalInformation.find(
    (row) => row.label.trim().toLowerCase() === "protein"
  );
  return extractNumericValue(proteinRow?.perServing ?? proteinRow?.perDailyServing ?? null);
}

export function getCaloriesPerServingFromNutrition(product: Product) {
  const kcalRow = product.nutritionalInformation.find(
    (row) =>
      row.label.trim().toLowerCase() === "energy" &&
      typeof (row.perServing ?? row.perDailyServing) === "string" &&
      (row.perServing ?? row.perDailyServing)!.toLowerCase().includes("kcal")
  );

  if (kcalRow?.perServing || kcalRow?.perDailyServing) {
    return extractNumericValue(kcalRow.perServing ?? kcalRow.perDailyServing ?? null);
  }

  return null;
}

export function getCaloriesPerGramProtein(product: Product) {
  const caloriesPer100g = getCaloriesPer100g(product);
  const proteinPer100g = getProteinPer100g(product);
  if (caloriesPer100g === null || proteinPer100g === null || proteinPer100g <= 0) return null;
  return caloriesPer100g / proteinPer100g;
}

export function getServingSizeG(product: Product) {
  if (product.servingSizeG && product.servingSizeG > 0) {
    return product.servingSizeG;
  }

  const candidates = product.nutritionalInformation
    .map((row) => getServingSizeCandidate(row.per100g, row.perServing ?? row.perDailyServing ?? null))
    .filter((value): value is number => value !== null)
    .filter((value) => product.sizeG !== null && value > 0 && value <= product.sizeG);

  if (!candidates.length) return null;
  const average = candidates.reduce((sum, value) => sum + value, 0) / candidates.length;
  return Number(average.toFixed(1));
}

export function getServingsPerPack(product: Product) {
  if (product.servings && product.servings > 0) return product.servings;
  const servingSizeG = getServingSizeG(product);
  if (servingSizeG === null || product.sizeG === null || product.sizeG <= 0) return null;
  return Math.round(product.sizeG / servingSizeG);
}

function extractNumericValue(value: string | null) {
  if (!value) return null;
  const kcalMatch = value.match(/(\d+(?:\.\d+)?)\s*kcal\b/i);
  if (kcalMatch) return Number(kcalMatch[1]);
  const match = value.match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : null;
}

function getServingSizeCandidate(per100g: string | null, perServing: string | null) {
  const per100gMeasurement = parseMeasurement(per100g);
  const perServingMeasurement = parseMeasurement(perServing);
  if (!per100gMeasurement || !perServingMeasurement) return null;
  if (per100gMeasurement.unit !== perServingMeasurement.unit) return null;
  if (per100gMeasurement.value <= 0 || perServingMeasurement.value <= 0) return null;
  return (100 * perServingMeasurement.value) / per100gMeasurement.value;
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
