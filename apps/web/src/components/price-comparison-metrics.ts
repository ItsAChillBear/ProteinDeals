import type { Product } from "./price-comparison-table.types";
import { getCaloriesPer100g, getProteinPer100g } from "./price-comparison-nutrition";

export function getPricePerServing(product: Product) {
  if (!product.servings || product.servings <= 0) return null;
  return product.price / product.servings;
}

export function getProteinPerServing(product: Product) {
  const proteinPer100g = getProteinPer100g(product);
  if (!proteinPer100g || !product.servings || product.sizeG <= 0) return null;
  const totalProteinG = (product.sizeG * proteinPer100g) / 100;
  if (totalProteinG <= 0) return null;
  return totalProteinG / product.servings;
}

export function getPricePerGramProtein(product: Product) {
  const proteinPer100g = getProteinPer100g(product);
  if (!proteinPer100g || product.sizeG <= 0) return null;
  const totalProteinG = (product.sizeG * proteinPer100g) / 100;
  if (totalProteinG <= 0) return null;
  return product.price / totalProteinG;
}

export function getCaloriesPerGramProtein(product: Product) {
  const caloriesPer100g = getCaloriesPer100g(product);
  const proteinPer100g = getProteinPer100g(product);
  if (caloriesPer100g === null || proteinPer100g === null || proteinPer100g <= 0) return null;
  return caloriesPer100g / proteinPer100g;
}
