import type { Product } from "./price-comparison-table.types";
import {
  getCaloriesPer100g,
  getCaloriesPerServingFromNutrition,
  getProteinPer100g,
  getProteinPerServingFromNutrition,
  getServingSizeG,
  getServingsPerPack,
} from "./price-comparison-nutrition";

export type PriceMode = "single" | "subscription";

/** Returns a shallow copy of the product with price fields set to the chosen mode. */
export function applyPriceMode(product: Product, mode: PriceMode): Product {
  if (mode === "subscription" && product.subscriptionPrice != null && product.subscriptionPricePer100g != null) {
    return { ...product, price: product.subscriptionPrice, pricePer100g: product.subscriptionPricePer100g };
  }
  return { ...product, price: product.singlePrice, pricePer100g: product.singlePricePer100g };
}

export function getPricePerServing(product: Product) {
  const servingsPerPack = getServingsPerPack(product);
  if (!servingsPerPack || servingsPerPack <= 0) return null;
  return product.price / servingsPerPack;
}

export function getProteinPerServing(product: Product) {
  const nutritionProteinPerServing = getProteinPerServingFromNutrition(product);
  if (nutritionProteinPerServing !== null) return nutritionProteinPerServing;
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
  const nutritionCaloriesPerServing = getCaloriesPerServingFromNutrition(product);
  if (nutritionCaloriesPerServing !== null) return nutritionCaloriesPerServing;
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
