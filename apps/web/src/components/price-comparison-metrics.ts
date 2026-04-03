import type { Product } from "./price-comparison-table.types";
import {
  getCaloriesPer100g,
  getProteinPer100g,
  getServingSizeG,
  getServingsPerPack,
} from "./price-comparison-nutrition";

export function getPricePerServing(product: Product) {
  const servingsPerPack = getServingsPerPack(product);
  if (!servingsPerPack || servingsPerPack <= 0) return null;
  return product.price / servingsPerPack;
}

export function getProteinPerServing(product: Product) {
  const proteinPer100g = getProteinPer100g(product);
  const servingSizeG = getServingSizeG(product);
  if (!proteinPer100g || !servingSizeG || servingSizeG <= 0) return null;
  return (proteinPer100g * servingSizeG) / 100;
}

export function getPricePerGramProtein(product: Product) {
  const proteinPer100g = getProteinPer100g(product);
  if (!proteinPer100g || product.sizeG <= 0) return null;
  const totalProteinG = (product.sizeG * proteinPer100g) / 100;
  if (totalProteinG <= 0) return null;
  return product.price / totalProteinG;
}

export function getCaloriesPerServing(product: Product) {
  const caloriesPer100g = getCaloriesPer100g(product);
  const servingSizeG = getServingSizeG(product);
  if (caloriesPer100g === null || !servingSizeG || servingSizeG <= 0) return null;
  return (caloriesPer100g * servingSizeG) / 100;
}

export function getCaloriesPerGramProtein(product: Product) {
  const caloriesPer100g = getCaloriesPer100g(product);
  const proteinPer100g = getProteinPer100g(product);
  if (caloriesPer100g === null || proteinPer100g === null || proteinPer100g <= 0) return null;
  return caloriesPer100g / proteinPer100g;
}
