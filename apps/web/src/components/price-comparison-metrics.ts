import type { Product } from "./price-comparison-table.types";

export function getPricePerServing(product: Product) {
  if (!product.servings || product.servings <= 0) return null;
  return product.price / product.servings;
}

export function getPricePerGramProtein(product: Product) {
  if (!product.proteinPer100g || product.sizeG <= 0) return null;
  const totalProteinG = (product.sizeG * product.proteinPer100g) / 100;
  if (totalProteinG <= 0) return null;
  return product.price / totalProteinG;
}
