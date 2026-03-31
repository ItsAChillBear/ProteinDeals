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
  proteinPer100g: number | null;
  inStock: boolean;
  url: string;
  type: string;
  description: string | null;
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

export type SortKey = "name" | "size" | "price" | "pricePer100g";
export type SortDir = "asc" | "desc";
