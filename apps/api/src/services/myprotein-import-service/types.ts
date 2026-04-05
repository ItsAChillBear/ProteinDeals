import type { Prisma } from "@proteindeals/db";
import type { MyproteinVariantRecord } from "../../scrapers/myprotein.js";
import type { loadMyproteinDbVariants } from "./db.js";

export interface ImportMyproteinResult {
  imported: number;
  createdProducts: number;
  createdVariants: number;
  createdPriceRecords: number;
  updatedProducts: number;
  updatedVariants: number;
  deletedVariants: number;
  deletedProducts: number;
  unchanged: number;
}

export interface ClearMyproteinResult {
  deletedProducts: number;
  deletedVariants: number;
  deletedPriceRecords: number;
  deletedPriceAlerts: number;
}

export interface CompareProductRow {
  id: string;
  slug: string;
  name: string;
  brand: string;
  searchText: string;
  imageUrl: string | null;
  retailer: string;
  category: string;
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
  nutritionalInformation: NutritionalInformationRow[];
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

export type MyproteinDbVariant = Awaited<ReturnType<typeof loadMyproteinDbVariants>>[number];

export type DiffAction = "create" | "update" | "delete" | "unchanged";

export interface MyproteinFieldDiff {
  field: string;
  current: string | number | boolean | null;
  next: string | number | boolean | null;
}

export interface MyproteinSyncEntry {
  id: string;
  action: DiffAction;
  reason: string;
  retailerProductId: string;
  scraped: MyproteinVariantRecord | null;
  current: MyproteinDbVariant | null;
  fieldDiffs: MyproteinFieldDiff[];
}

export interface MyproteinSyncPreview {
  summary: Record<DiffAction, number>;
  entries: MyproteinSyncEntry[];
}

export type NutritionalInformationRow = {
  label: string;
  per100g: string | null;
  perServing: string | null;
  perDailyServing: string | null;
  referenceIntake: string | null;
};

export type NutritionalInformationJson = Prisma.JsonValue | null | undefined;
