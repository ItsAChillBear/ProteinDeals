import type { NutritionInfoRow } from "./price-comparison-nutrition.types";

export interface Product {
  id: string;
  slug: string;
  name: string;
  brand: string;
  searchText: string;
  imageUrl: string | null;
  retailer: string;
  category: string;
  subcategory: string;
  flavour: string | null;
  size: string;
  sizeG: number | null;
  servingSizeG: number | null;
  servings: number | null;
  price: number | null;
  pricePer100g: number | null;
  singlePrice: number | null;
  singlePricePer100g: number | null;
  subscriptionPrice: number | null;
  subscriptionPricePer100g: number | null;
  subscriptionSavings: number | null;
  proteinPer100g: number | null;
  ingredients: string | null;
  nutritionalInformation: NutritionInfoRow[];
  inStock: boolean;
  url: string;
  type: string;
  description: string | null;
  bundleLinks: Array<{ name: string; url: string }>;
  discountCodes: Array<{
    label: string;
    code: string;
    type: "refer" | "promo";
    description?: string;
  }>;
}

export interface ProductGroup {
  id: string;
  baseName: string;
  brand: string;
  retailer: string;
  category: string;
  type: string;
  imageUrl: string | null;
  description: string | null;
  variants: Product[];
}

export interface ProductGroupWithSelection extends ProductGroup {
  selected: Product;
}

export type SortKey =
  | "name"
  | "size"
  | "price"
  | "pricePer100g"
  | "pricePerServing"
  | "caloriesPerServing"
  | "caloriesPer100g"
  | "pricePerGramProtein"
  | "caloriesPerGramProtein"
  | "proteinPerServing"
  | "proteinPer100g"
  | "dailyCost"
  | "dailyCalories";
export type SortDir = "asc" | "desc";
