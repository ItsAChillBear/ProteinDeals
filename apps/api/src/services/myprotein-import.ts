import { db, ProductCategory, Prisma } from "@wheywise/db";
import type { MyproteinVariantRecord } from "../scrapers/myprotein.js";

export interface ImportMyproteinResult {
  imported: number;
  createdProducts: number;
  createdVariants: number;
  createdPriceRecords: number;
}

export interface CompareProductRow {
  id: string;
  slug: string;
  name: string;
  brand: string;
  retailer: string;
  size: string;
  sizeG: number;
  price: number;
  pricePer100g: number;
  inStock: boolean;
  url: string;
  type: string;
}

export async function importMyproteinRecords(
  records: MyproteinVariantRecord[]
): Promise<ImportMyproteinResult> {
  let imported = 0;
  let createdProducts = 0;
  let createdVariants = 0;
  let createdPriceRecords = 0;

  const retailer = await ensureRetailer();

  for (const record of records) {
    if (record.price === null || record.pricePer100g === null || record.sizeG === null) {
      continue;
    }

    const productSlug = createProductSlug(
      record.brand,
      record.productName,
      record.flavour,
      record.sizeLabel
    );
    const category = inferCategory(record.productName);
    const servingsPerPack = parseServings(record.servingsLabel);

    const existingProduct = await db.product.findUnique({
      where: {
        slug: productSlug,
      },
    });

    const product =
      existingProduct ??
      (await db.product.create({
        data: {
          slug: productSlug,
          name: record.flavour
            ? `${record.productName} - ${record.flavour}`
            : record.productName,
          brand: record.brand,
          category,
          proteinPer100g:
            record.proteinPer100g !== null
              ? new Prisma.Decimal(record.proteinPer100g.toFixed(2))
              : null,
          servingSizeG:
            record.sizeG && servingsPerPack
              ? new Prisma.Decimal((record.sizeG / servingsPerPack).toFixed(2))
              : null,
          servingsPerPack,
          imageUrl: record.imageUrl,
          description: null,
        },
      }));

    if (!existingProduct) {
      createdProducts += 1;
    }

    const retailerProductId =
      record.retailerProductId ?? `${productSlug}-${record.sizeLabel ?? "default"}`;

    const existingVariant = await db.productVariant.findFirst({
      where: {
        productId: product.id,
        retailerId: retailer.id,
        retailerProductId,
      },
    });

    const variant =
      existingVariant ??
      (await db.productVariant.create({
        data: {
          productId: product.id,
          retailerId: retailer.id,
          retailerProductId,
          url: record.variantUrl,
          flavour: record.flavour,
          sizeG: new Prisma.Decimal(record.sizeG.toFixed(2)),
          inStock: record.inStock,
          lastScrapedAt: new Date(record.scrapedAt),
        },
      }));

    if (existingVariant) {
      await db.productVariant.update({
        where: {
          id: existingVariant.id,
        },
        data: {
          url: record.variantUrl,
          flavour: record.flavour,
          sizeG: new Prisma.Decimal(record.sizeG.toFixed(2)),
          inStock: record.inStock,
          lastScrapedAt: new Date(record.scrapedAt),
        },
      });
    } else {
      createdVariants += 1;
    }

    await db.priceRecord.create({
      data: {
        variantId: variant.id,
        price: new Prisma.Decimal(record.price.toFixed(2)),
        pricePer100g: new Prisma.Decimal(record.pricePer100g.toFixed(4)),
        wasOnSale: record.wasOnSale,
        scrapedAt: new Date(record.scrapedAt),
      },
    });

    createdPriceRecords += 1;
    imported += 1;
  }

  return { imported, createdProducts, createdVariants, createdPriceRecords };
}

export async function getCompareProducts(): Promise<CompareProductRow[]> {
  const rows = await db.productVariant.findMany({
    orderBy: {
      lastScrapedAt: "desc",
    },
    include: {
      product: true,
      retailer: true,
      priceRecords: {
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
        retailer: row.retailer.name,
        size: formatSizeLabel(Number(row.sizeG)),
        sizeG: Number(row.sizeG),
        price: Number(latest.price),
        pricePer100g: Number(latest.pricePer100g),
        inStock: row.inStock,
        url: row.url,
        type: formatCategoryLabel(row.product.category),
      };
    });
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
