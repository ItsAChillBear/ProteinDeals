export type ScraperRecord = {
  retailer: string;
  brand: string;
  productName: string;
  variantUrl: string;
  retailerProductId: string | null;
  flavour: string | null;
  sizeLabel: string | null;
  sizeG: number | null;
  servingsLabel: string | null;
  price: number | null;
  originalPrice: number | null;
  wasOnSale: boolean;
  subscriptionPrice: number | null;
  subscriptionSavings: number | null;
  pricePer100g: number | null;
  proteinPer100g: number | null;
  inStock: boolean;
  currency: string | null;
  imageUrl: string | null;
  description: string | null;
  keyBenefits: string[];
  whyChoose: string | null;
  suggestedUse: string | null;
  ingredients: string | null;
  faqEntries: Array<{ question: string; answer: string }>;
  nutritionalInformation: Array<{
    label: string;
    per100g: string | null;
    perServing: string | null;
  }>;
  productDetails: string | null;
  scrapedAt: string;
};

export type ScraperResponse = {
  ok: boolean;
  startedAt: string;
  finishedAt: string;
  count?: number;
  error?: string;
  records?: ScraperRecord[];
};

export type SyncEntry = {
  id: string;
  action: "create" | "update" | "delete" | "unchanged";
  reason: string;
  retailerProductId: string;
  scraped: ScraperRecord | null;
  current: {
    id: string;
    url: string;
    flavour: string | null;
    sizeG: string;
    inStock: boolean;
    retailerProductId: string | null;
    product: {
      id: string;
      slug: string;
      name: string;
      brand: string;
      imageUrl: string | null;
      proteinPer100g: string | null;
      servingsPerPack: number | null;
    };
    priceRecords: Array<{
      price: string;
      pricePer100g: string;
      wasOnSale: boolean;
    }>;
  } | null;
  fieldDiffs: Array<{
    field: string;
    current: string | number | boolean | null;
    next: string | number | boolean | null;
  }>;
};

export type PreviewResponse = {
  ok: boolean;
  startedAt: string;
  finishedAt: string;
  error?: string;
  preview?: {
    summary: Record<"create" | "update" | "delete" | "unchanged", number>;
    entries: SyncEntry[];
  };
};

export type ImportResponse = {
  ok: boolean;
  startedAt: string;
  finishedAt: string;
  count?: number;
  error?: string;
  importResult?: {
    imported: number;
    createdProducts: number;
    createdVariants: number;
    createdPriceRecords: number;
    updatedProducts: number;
    updatedVariants: number;
    deletedVariants: number;
    deletedProducts: number;
    unchanged: number;
  };
};
