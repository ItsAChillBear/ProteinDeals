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

export function getCaloriesPerGramProtein(product: Product) {
  const caloriesPer100g = getCaloriesPer100g(product);
  const proteinPer100g = getProteinPer100g(product);
  if (caloriesPer100g === null || proteinPer100g === null || proteinPer100g <= 0) return null;
  return caloriesPer100g / proteinPer100g;
}

function extractNumericValue(value: string | null) {
  if (!value) return null;
  const match = value.match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : null;
}
