import type { NutritionInfoRow } from "./price-comparison-nutrition.types";

export interface Product {
  id: string;
  slug: string;
  name: string;
  brand: string;
  imageUrl: string | null;
  retailer: string;
  flavour: string | null;
  size: string;
  sizeG: number;
  servings: number | null;
  price: number;
  pricePer100g: number;
  singlePrice: number;
  singlePricePer100g: number;
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
  | "dailyCost"
  | "dailyCalories";
export type SortDir = "asc" | "desc";
