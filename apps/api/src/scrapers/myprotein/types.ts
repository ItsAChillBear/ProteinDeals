export type JsonLdNode = Record<string, unknown>;

export interface MyproteinVariantRecord {
  retailer: "MyProtein";
  brand: string;
  productName: string;
  categoryUrl: string;
  productUrl: string;
  variantUrl: string;
  retailerProductId: string | null;
  groupId: string | null;
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
  nutritionalInformation: Array<{ label: string; value: string }>;
  productDetails: string | null;
  scrapedAt: string;
}

export interface ScrapeMyproteinOptions {
  categoryUrl?: string;
  limitProducts?: number;
  fetchImpl?: typeof fetch;
  onProgress?: (message: string) => void | Promise<void>;
  onVariant?: (record: MyproteinVariantRecord) => void | Promise<void>;
}
