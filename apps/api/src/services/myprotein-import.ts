import { db, ProductCategory, Prisma } from "@proteindeals/db";
import type { MyproteinVariantRecord } from "../scrapers/myprotein.js";
import { syncProductImageToStorage } from "./product-media.js";

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

export interface CompareProductRow {
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
  nutritionalInformation: Array<{
    label: string;
    per100g: string | null;
    perServing: string | null;
  }>;
  inStock: boolean;
  url: string;
  type: string;
  description: string | null;
}

type MyproteinDbVariant = Awaited<ReturnType<typeof loadMyproteinDbVariants>>[number];

type DiffAction = "create" | "update" | "delete" | "unchanged";

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

export async function importMyproteinRecords(
  records: MyproteinVariantRecord[]
): Promise<ImportMyproteinResult> {
  const preview = await previewMyproteinSync(records);
  return applyMyproteinSync(preview.entries.map((entry) => entry.id), preview);
}

export async function previewMyproteinSync(
  records: MyproteinVariantRecord[]
): Promise<MyproteinSyncPreview> {
  const dbVariants = await loadMyproteinDbVariants();
  const dbByRetailerProductId = new Map(
    dbVariants
      .filter((variant) => variant.retailerProductId)
      .map((variant) => [variant.retailerProductId as string, variant])
  );

  const entries: MyproteinSyncEntry[] = [];
  const seenRetailerProductIds = new Set<string>();

  for (const record of records) {
    const retailerProductId = getRetailerProductId(record);
    if (!retailerProductId) continue;
    seenRetailerProductIds.add(retailerProductId);

    const current = dbByRetailerProductId.get(retailerProductId) ?? null;
    const fieldDiffs = current ? getFieldDiffs(record, current) : [];

    entries.push({
      id: retailerProductId,
      action: current ? (fieldDiffs.length ? "update" : "unchanged") : "create",
      reason: current
        ? fieldDiffs.length
          ? `${fieldDiffs.length} field${fieldDiffs.length === 1 ? "" : "s"} changed`
          : "No changes detected"
        : "Variant not currently in database",
      retailerProductId,
      scraped: record,
      current,
      fieldDiffs,
    });
  }

  for (const variant of dbVariants) {
    const retailerProductId = variant.retailerProductId;
    if (!retailerProductId || seenRetailerProductIds.has(retailerProductId)) continue;

    entries.push({
      id: retailerProductId,
      action: "delete",
      reason: "Variant exists in database but was not found in this scrape",
      retailerProductId,
      scraped: null,
      current: variant,
      fieldDiffs: [],
    });
  }

  entries.sort((left, right) => {
    const weight = { create: 0, update: 1, delete: 2, unchanged: 3 } satisfies Record<
      DiffAction,
      number
    >;
    return (
      weight[left.action] - weight[right.action] ||
      left.retailerProductId.localeCompare(right.retailerProductId)
    );
  });

  return {
    summary: {
      create: entries.filter((entry) => entry.action === "create").length,
      update: entries.filter((entry) => entry.action === "update").length,
      delete: entries.filter((entry) => entry.action === "delete").length,
      unchanged: entries.filter((entry) => entry.action === "unchanged").length,
    },
    entries,
  };
}

export async function applyMyproteinSync(
  entryIds: string[],
  preview?: MyproteinSyncPreview
): Promise<ImportMyproteinResult> {
  const resolvedPreview = preview ?? (await previewMyproteinSync([]));
  const selectedIds = new Set(entryIds);
  const entries = resolvedPreview.entries.filter((entry) => selectedIds.has(entry.id));

  const result: ImportMyproteinResult = {
    imported: 0,
    createdProducts: 0,
    createdVariants: 0,
    createdPriceRecords: 0,
    updatedProducts: 0,
    updatedVariants: 0,
    deletedVariants: 0,
    deletedProducts: 0,
    unchanged: 0,
  };

  await ensureRetailer();

  for (const entry of entries) {
    if (entry.action === "unchanged") {
      result.unchanged += 1;
      continue;
    }

    if (entry.action === "delete") {
      if (entry.current) {
        const deletedProduct = await deleteDbVariant(entry.current);
        result.deletedVariants += 1;
        result.deletedProducts += deletedProduct ? 1 : 0;
      }
      continue;
    }

    if (!entry.scraped) continue;
    if (
      entry.scraped.price === null ||
      entry.scraped.pricePer100g === null ||
      entry.scraped.sizeG === null
    ) {
      continue;
    }

    const applyResult = await upsertScrapedVariant(entry.scraped, entry.current);
    result.imported += 1;
    result.createdProducts += applyResult.createdProduct ? 1 : 0;
    result.createdVariants += applyResult.createdVariant ? 1 : 0;
    result.updatedProducts += applyResult.updatedProduct ? 1 : 0;
    result.updatedVariants += applyResult.updatedVariant ? 1 : 0;
    result.createdPriceRecords += applyResult.createdPriceRecord ? 1 : 0;
  }

  return result;
}

function buildProductDescription(record: MyproteinVariantRecord) {
  const sections = [
    record.description,
    record.keyBenefits.length ? `Key Benefits: ${record.keyBenefits.join(" | ")}` : null,
    record.whyChoose ? `Why Choose: ${record.whyChoose}` : null,
    record.suggestedUse ? `Suggested Use: ${record.suggestedUse}` : null,
    record.productDetails ? `Product Details: ${record.productDetails}` : null,
  ].filter(Boolean);

  return sections.length ? sections.join("\n\n") : null;
}

async function loadMyproteinDbVariants() {
  return db.productVariant.findMany({
    where: {
      retailer: {
        slug: "myprotein",
      },
    },
    include: {
      product: true,
      retailer: true,
      priceRecords: {
        select: {
          price: true,
          pricePer100g: true,
          subscriptionPrice: true,
          subscriptionPricePer100g: true,
          subscriptionSavings: true,
          wasOnSale: true,
          scrapedAt: true,
        },
        orderBy: {
          scrapedAt: "desc",
        },
        take: 1,
      },
    },
  });
}

function getRetailerProductId(record: MyproteinVariantRecord) {
  const productSlug = createProductSlug(
    record.brand,
    record.productName,
    record.flavour,
    record.sizeLabel
  );
  return record.retailerProductId ?? `${productSlug}-${record.sizeLabel ?? "default"}`;
}

function getFieldDiffs(record: MyproteinVariantRecord, current: MyproteinDbVariant) {
  const nextProteinPer100g = getCanonicalProteinPer100g(record);
  const servingsPerPack = parseServings(record.servingsLabel);
  const nextDescription = buildProductDescription(record);
  const nextProductName = record.flavour
    ? `${record.productName} - ${record.flavour}`
    : record.productName;
  const nextCategory = inferCategory(record.productName);
  const nextServingSize =
    record.sizeG && servingsPerPack ? roundNullable(record.sizeG / servingsPerPack, 2) : null;
  const currentPrice = current.priceRecords[0];

  return [
    diff("name", current.product.name, nextProductName),
    diff("brand", current.product.brand, record.brand),
    diff("category", current.product.category, nextCategory),
    diff("proteinPer100g", toNumber(current.product.proteinPer100g), nextProteinPer100g),
    diff("servingSizeG", toNumber(current.product.servingSizeG), nextServingSize),
    diff("servingsPerPack", current.product.servingsPerPack, servingsPerPack),
    diff("description", current.product.description, nextDescription),
    diff("ingredients", current.product.ingredients, record.ingredients),
    diff(
      "nutritionalInformation",
      JSON.stringify(current.product.nutritionalInfo ?? null),
      JSON.stringify(record.nutritionalInformation)
    ),
    diff("url", current.url, record.variantUrl),
    diff("flavour", current.flavour, record.flavour),
    diff("sizeG", toNumber(current.sizeG), record.sizeG),
    diff("inStock", current.inStock, record.inStock),
    diff("price", toNumber(currentPrice?.price ?? null), record.price),
    diff(
      "pricePer100g",
      toNumber(currentPrice?.pricePer100g ?? null),
      record.pricePer100g
    ),
    diff("subscriptionPrice", toNumber(currentPrice?.subscriptionPrice ?? null), record.subscriptionPrice),
    diff(
      "subscriptionPricePer100g",
      toNumber(currentPrice?.subscriptionPricePer100g ?? null),
      getSubscriptionPricePer100g(record)
    ),
    diff("subscriptionSavings", toNumber(currentPrice?.subscriptionSavings ?? null), record.subscriptionSavings),
    diff("wasOnSale", currentPrice?.wasOnSale ?? null, record.wasOnSale),
  ].filter((entry): entry is MyproteinFieldDiff => entry !== null);
}

function diff(
  field: string,
  current: string | number | boolean | null | undefined,
  next: string | number | boolean | null | undefined
) {
  const normalizedCurrent = normalizeComparable(current);
  const normalizedNext = normalizeComparable(next);
  if (normalizedCurrent === normalizedNext) return null;
  return {
    field,
    current: normalizedCurrent,
    next: normalizedNext,
  } satisfies MyproteinFieldDiff;
}

function normalizeComparable(value: string | number | boolean | null | undefined) {
  if (typeof value === "number") {
    return Number(value.toFixed(4));
  }
  return value ?? null;
}

function toNumber(value: Prisma.Decimal | number | null | undefined) {
  if (value === null || value === undefined) return null;
  return Number(value);
}

function roundNullable(value: number, digits: number) {
  return Number(value.toFixed(digits));
}

async function upsertScrapedVariant(
  record: MyproteinVariantRecord,
  current: MyproteinDbVariant | null
) {
  const retailer = await ensureRetailer();
  const productSlug = createProductSlug(
    record.brand,
    record.productName,
    record.flavour,
    record.sizeLabel
  );
  const category = inferCategory(record.productName);
  const servingsPerPack = parseServings(record.servingsLabel);
  const proteinPer100g = getCanonicalProteinPer100g(record);
  const description = buildProductDescription(record);
  const productName = record.flavour ? `${record.productName} - ${record.flavour}` : record.productName;
  const imageUrl = await syncProductImageToStorage({
    productSlug,
    sourceUrl: record.imageUrl,
    existingImageUrl: current?.product.imageUrl ?? null,
  });

  let createdProduct = false;
  let updatedProduct = false;
  let createdVariant = false;
  let updatedVariant = false;

  const existingProduct =
    current?.product ??
    (await db.product.findUnique({
      where: { slug: productSlug },
    }));

  const productData = {
    slug: productSlug,
    name: productName,
    brand: record.brand,
    category,
    proteinPer100g: proteinPer100g !== null ? new Prisma.Decimal(proteinPer100g.toFixed(2)) : null,
    servingSizeG:
      record.sizeG && servingsPerPack
        ? new Prisma.Decimal((record.sizeG / servingsPerPack).toFixed(2))
        : null,
    servingsPerPack,
    imageUrl,
    description,
    ingredients: record.ingredients,
    nutritionalInfo: record.nutritionalInformation as unknown as Prisma.InputJsonValue,
    isActive: true,
  };

  const product = existingProduct
    ? await db.product.update({
        where: { id: existingProduct.id },
        data: productData,
      })
    : await db.product.create({
        data: productData,
      });

  createdProduct = !existingProduct;
  updatedProduct = Boolean(existingProduct);

  const retailerProductId = getRetailerProductId(record);
  const existingVariant =
    current ??
    (await db.productVariant.findFirst({
      where: {
        productId: product.id,
        retailerId: retailer.id,
        retailerProductId,
      },
      include: {
        product: true,
        retailer: true,
        priceRecords: {
          select: {
            price: true,
            pricePer100g: true,
            subscriptionPrice: true,
            subscriptionPricePer100g: true,
            subscriptionSavings: true,
            wasOnSale: true,
            scrapedAt: true,
          },
          orderBy: { scrapedAt: "desc" },
          take: 1,
        },
      },
    }));

  const variant = existingVariant
    ? await db.productVariant.update({
        where: { id: existingVariant.id },
        data: {
          productId: product.id,
          retailerId: retailer.id,
          retailerProductId,
          url: record.variantUrl,
          flavour: record.flavour,
          sizeG: new Prisma.Decimal(record.sizeG!.toFixed(2)),
          inStock: record.inStock,
          lastScrapedAt: new Date(record.scrapedAt),
        },
      })
    : await db.productVariant.create({
        data: {
          productId: product.id,
          retailerId: retailer.id,
          retailerProductId,
          url: record.variantUrl,
          flavour: record.flavour,
          sizeG: new Prisma.Decimal(record.sizeG!.toFixed(2)),
          inStock: record.inStock,
          lastScrapedAt: new Date(record.scrapedAt),
        },
      });

  createdVariant = !existingVariant;
  updatedVariant = Boolean(existingVariant);

  await db.priceRecord.create({
    data: {
      variantId: variant.id,
      price: new Prisma.Decimal(record.price!.toFixed(2)),
      pricePer100g: new Prisma.Decimal(record.pricePer100g!.toFixed(4)),
      subscriptionPrice:
        record.subscriptionPrice !== null
          ? new Prisma.Decimal(record.subscriptionPrice.toFixed(2))
          : null,
      subscriptionPricePer100g:
        getSubscriptionPricePer100g(record) !== null
          ? new Prisma.Decimal(getSubscriptionPricePer100g(record)!.toFixed(4))
          : null,
      subscriptionSavings:
        record.subscriptionSavings !== null
          ? new Prisma.Decimal(record.subscriptionSavings.toFixed(2))
          : null,
      wasOnSale: record.wasOnSale,
      scrapedAt: new Date(record.scrapedAt),
    },
  });

  return {
    createdProduct,
    updatedProduct,
    createdVariant,
    updatedVariant,
    createdPriceRecord: true,
  };
}

async function deleteDbVariant(current: MyproteinDbVariant) {
  const productId = current.productId;

  await db.productVariant.delete({
    where: {
      id: current.id,
    },
  });

  const remaining = await db.productVariant.count({
    where: {
      productId,
    },
  });

  if (remaining === 0) {
    await db.product.delete({
      where: {
        id: productId,
      },
    });
    return true;
  }

  return false;
}

export async function getCompareProducts(): Promise<CompareProductRow[]> {
  const rows = await db.productVariant.findMany({
    orderBy: {
      lastScrapedAt: "desc",
    },
    include: {
      product: {
        select: {
          slug: true,
          name: true,
          brand: true,
          imageUrl: true,
          category: true,
          proteinPer100g: true,
          servingsPerPack: true,
          ingredients: true,
          nutritionalInfo: true,
          description: true,
        },
      },
      retailer: true,
      priceRecords: {
        select: {
          price: true,
          pricePer100g: true,
          subscriptionPrice: true,
          subscriptionPricePer100g: true,
          subscriptionSavings: true,
          wasOnSale: true,
          scrapedAt: true,
        },
        orderBy: {
          scrapedAt: "desc",
        },
        take: 1,
      },
    },
  });

  return rows
    .filter((row) => row.priceRecords[0])
    .map((row) => {
      const latest = row.priceRecords[0];
      return {
        id: row.id,
        slug: row.product.slug,
        name: row.product.name,
        brand: row.product.brand,
        imageUrl: row.product.imageUrl,
        retailer: row.retailer.name,
        flavour: row.flavour,
        size: formatSizeLabel(Number(row.sizeG)),
        sizeG: Number(row.sizeG),
        servings: row.product.servingsPerPack,
        price: Number(latest.price),
        pricePer100g: Number(latest.pricePer100g),
        singlePrice: Number(latest.price),
        singlePricePer100g: Number(latest.pricePer100g),
        subscriptionPrice:
          latest.subscriptionPrice !== null ? Number(latest.subscriptionPrice) : null,
        subscriptionPricePer100g:
          latest.subscriptionPricePer100g !== null
            ? Number(latest.subscriptionPricePer100g)
            : null,
        subscriptionSavings:
          latest.subscriptionSavings !== null ? Number(latest.subscriptionSavings) : null,
        proteinPer100g:
          row.product.proteinPer100g !== null
            ? Number(row.product.proteinPer100g)
            : null,
        ingredients: row.product.ingredients,
        nutritionalInformation: parseNutritionalInformation(row.product.nutritionalInfo),
        inStock: row.inStock,
        url: row.url,
        type: formatCategoryLabel(row.product.category),
        description: row.product.description,
      };
    });
}

function parseNutritionalInformation(value: Prisma.JsonValue | null | undefined) {
  if (!Array.isArray(value)) return [];
  return value
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const item = row as Record<string, unknown>;
      return {
        label: typeof item.label === "string" ? item.label : "",
        per100g: typeof item.per100g === "string" ? item.per100g : null,
        perServing: typeof item.perServing === "string" ? item.perServing : null,
      };
    })
    .filter(
      (
        row
      ): row is { label: string; per100g: string | null; perServing: string | null } =>
        Boolean(row && row.label)
    );
}

function getCanonicalProteinPer100g(record: MyproteinVariantRecord) {
  const nutritionProtein = record.nutritionalInformation.find(
    (row) => row.label.trim().toLowerCase() === "protein"
  );
  const nutritionProteinValue = extractGramAmount(nutritionProtein?.per100g ?? null);
  return nutritionProteinValue ?? record.proteinPer100g;
}

function extractGramAmount(value: string | null) {
  if (!value) return null;
  const match = value.match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : null;
}

function getSubscriptionPricePer100g(record: MyproteinVariantRecord) {
  if (record.subscriptionPrice === null || record.sizeG === null || record.sizeG <= 0) return null;
  return roundNullable((record.subscriptionPrice / record.sizeG) * 100, 4);
}

async function ensureRetailer() {
  const existing = await db.retailer.findUnique({
    where: {
      slug: "myprotein",
    },
  });

  if (existing) {
    return existing;
  }

  const created = await db.retailer.create({
    data: {
      name: "MyProtein",
      slug: "myprotein",
      baseUrl: "https://www.myprotein.com",
      isActive: true,
    },
  });

  return created;
}

function inferCategory(productName: string): ProductCategory {
  const lower = productName.toLowerCase();
  if (lower.includes("isolate")) return "whey_isolate";
  if (lower.includes("vegan")) return "vegan";
  if (lower.includes("casein")) return "casein";
  if (lower.includes("mass")) return "mass_gainer";
  if (lower.includes("plant")) return "plant_blend";
  if (lower.includes("whey")) return "whey_concentrate";
  return "other";
}

function createProductSlug(
  brand: string,
  productName: string,
  flavour: string | null,
  sizeLabel: string | null
) {
  return slugify([brand, productName, flavour, sizeLabel].filter(Boolean).join(" "));
}

function slugify(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseServings(value: string | null): number | null {
  if (!value) return null;
  const match = value.match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : null;
}

function formatCategoryLabel(category: ProductCategory) {
  switch (category) {
    case "whey_concentrate":
      return "Whey Concentrate";
    case "whey_isolate":
      return "Whey Isolate";
    case "vegan":
      return "Vegan";
    case "casein":
      return "Casein";
    case "mass_gainer":
      return "Mass Gainer";
    case "plant_blend":
      return "Plant Blend";
    default:
      return "Other";
  }
}

function formatSizeLabel(sizeG: number) {
  if (sizeG >= 1000) {
    const kg = sizeG / 1000;
    return Number.isInteger(kg) ? `${kg}kg` : `${kg.toFixed(2)}kg`;
  }
  return `${sizeG}g`;
}
