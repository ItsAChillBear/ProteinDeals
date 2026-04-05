import { db, Prisma } from "@proteindeals/db";
import type { MyproteinVariantRecord } from "../../scrapers/myprotein.js";
import { syncProductImageToStorage } from "../product-media.js";
import { ensureRetailer } from "./db.js";
import {
  buildProductDescription,
  createProductSlug,
  deriveServingsPerPack,
  getCanonicalProteinPer100g,
  getRetailerProductId,
  getSubscriptionPricePer100g,
  inferCategoryFromLabels,
} from "./helpers.js";
import type { ClearMyproteinResult, MyproteinDbVariant } from "./types.js";

export async function clearMyproteinDatabase(
  selectedCategoryUrls?: string[]
): Promise<ClearMyproteinResult> {
  const retailer = await db.retailer.findUnique({
    where: {
      slug: "myprotein",
    },
    select: {
      id: true,
    },
  });

  if (!retailer) {
    return {
      deletedProducts: 0,
      deletedVariants: 0,
      deletedPriceRecords: 0,
      deletedPriceAlerts: 0,
    };
  }

  const variants = await db.productVariant.findMany({
    where: {
      retailerId: retailer.id,
    },
    select: {
      id: true,
      productId: true,
      product: {
        select: {
          categoryUrls: true,
        },
      },
    },
  });

  const normalizedSelectedCategoryUrls =
    selectedCategoryUrls?.filter((value): value is string => typeof value === "string" && value.length > 0) ??
    [];

  const variantsToDelete =
    normalizedSelectedCategoryUrls.length === 0
      ? variants
      : variants.filter((variant) => {
          const categoryUrls = Array.isArray(variant.product.categoryUrls)
            ? variant.product.categoryUrls.filter((value): value is string => typeof value === "string")
            : [];
          return categoryUrls.some((url) => normalizedSelectedCategoryUrls.includes(url));
        });

  if (!variantsToDelete.length) {
    return {
      deletedProducts: 0,
      deletedVariants: 0,
      deletedPriceRecords: 0,
      deletedPriceAlerts: 0,
    };
  }

  const variantIds = variantsToDelete.map((variant) => variant.id);
  const productIds = [...new Set(variantsToDelete.map((variant) => variant.productId))];
  const remainingVariantsByProduct = await db.productVariant.groupBy({
    by: ["productId"],
    where: {
      productId: {
        in: productIds,
      },
      id: {
        notIn: variantIds,
      },
    },
    _count: {
      productId: true,
    },
  });
  const orphanedProductIds = productIds.filter(
    (productId) =>
      !remainingVariantsByProduct.some((entry) => entry.productId === productId)
  );

  return db.$transaction(async (tx) => {
    const deletedPriceRecords = await tx.priceRecord.count({
      where: {
        variantId: {
          in: variantIds,
        },
      },
    });

    const deletedPriceAlerts = await tx.priceAlert.count({
      where: {
        variantId: {
          in: variantIds,
        },
      },
    });

    const deletedVariantsResult = await tx.productVariant.deleteMany({
      where: {
        id: {
          in: variantIds,
        },
      },
    });

    const deletedProductsResult = orphanedProductIds.length
      ? await tx.product.deleteMany({
          where: {
            id: {
              in: orphanedProductIds,
            },
          },
        })
      : { count: 0 };

    return {
      deletedProducts: deletedProductsResult.count,
      deletedVariants: deletedVariantsResult.count,
      deletedPriceRecords,
      deletedPriceAlerts,
    };
  });
}

export async function upsertScrapedVariant(
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
  const category = inferCategoryFromLabels(
    record.productName,
    record.categoryLabels,
    record.categoryUrls
  );
  const servingsPerPack = deriveServingsPerPack(record);
  const proteinPer100g = getCanonicalProteinPer100g(record);
  const description = buildProductDescription(record);
  const productName = record.flavour ? `${record.productName} - ${record.flavour}` : record.productName;
  const imageUrl = await syncProductImageToStorage({
    productSlug,
    sourceUrl: record.imageUrl,
    existingImageUrl: current?.product.imageUrl ?? null,
  });

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
    categoryLabels: record.categoryLabels as Prisma.InputJsonValue,
    categoryUrls: record.categoryUrls as Prisma.InputJsonValue,
    proteinPer100g: proteinPer100g !== null ? new Prisma.Decimal(proteinPer100g.toFixed(2)) : null,
    servingSizeG:
      servingsPerPack && record.sizeG
        ? new Prisma.Decimal((record.sizeG / servingsPerPack).toFixed(2))
        : null,
    servingsPerPack,
    imageUrl,
    description,
    ingredients: record.ingredients,
    nutritionalInfo: record.nutritionalInformation as unknown as Prisma.InputJsonValue,
    bundleLinks: record.bundleLinks.length > 0 ? record.bundleLinks as unknown as Prisma.InputJsonValue : Prisma.JsonNull,
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

  const retailerProductId = getRetailerProductId(record);
  const existingVariant =
    current ??
    (await db.productVariant.findFirst({
      where: {
        productId: product.id,
        retailerId: retailer.id,
        retailerProductId,
      },
    }));

  const variantData = {
    productId: product.id,
    retailerId: retailer.id,
    retailerProductId,
    url: record.variantUrl,
    flavour: record.flavour,
    sizeG: record.sizeG !== null ? new Prisma.Decimal(record.sizeG.toFixed(2)) : null,
    inStock: record.inStock,
    lastScrapedAt: new Date(record.scrapedAt),
  };

  const variant = existingVariant
    ? await db.productVariant.update({
        where: { id: existingVariant.id },
        data: variantData,
      })
    : await db.productVariant.create({
        data: variantData,
      });

  const subscriptionPricePer100g = getSubscriptionPricePer100g(record);
  const hasAnyPriceData =
    record.price !== null ||
    record.pricePer100g !== null ||
    record.subscriptionPrice !== null ||
    subscriptionPricePer100g !== null;

  if (hasAnyPriceData) {
    await db.priceRecord.create({
      data: {
        variantId: variant.id,
        price: record.price !== null ? new Prisma.Decimal(record.price.toFixed(2)) : null,
        pricePer100g:
          record.pricePer100g !== null
            ? new Prisma.Decimal(record.pricePer100g.toFixed(4))
            : null,
        subscriptionPrice:
          record.subscriptionPrice !== null
            ? new Prisma.Decimal(record.subscriptionPrice.toFixed(2))
            : null,
        subscriptionPricePer100g:
          subscriptionPricePer100g !== null
            ? new Prisma.Decimal(subscriptionPricePer100g.toFixed(4))
            : null,
        subscriptionSavings:
          record.subscriptionSavings !== null
            ? new Prisma.Decimal(record.subscriptionSavings.toFixed(2))
            : null,
        wasOnSale: record.wasOnSale,
        scrapedAt: new Date(record.scrapedAt),
      },
    });
  }

  return {
    createdProduct: !existingProduct,
    updatedProduct: Boolean(existingProduct),
    createdVariant: !existingVariant,
    updatedVariant: Boolean(existingVariant),
    createdPriceRecord: hasAnyPriceData,
  };
}

export async function deleteDbVariant(current: MyproteinDbVariant) {
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
