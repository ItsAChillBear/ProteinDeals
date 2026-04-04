import { db } from "@proteindeals/db";
import {
  formatProductType,
  formatSizeLabel,
  parseNutritionalInformation,
} from "./helpers.js";
import type { CompareProductRow } from "./types.js";

export async function getCompareProducts(): Promise<CompareProductRow[]> {
  const activeVoucherCodes = await db.voucherCode.findMany({
    where: {
      testStatus: {
        in: ["working", "better_offer"],
      },
      retailer: {
        isActive: true,
      },
    },
    include: {
      retailer: {
        select: {
          name: true,
        },
      },
    },
    orderBy: [{ retailerId: "asc" }, { code: "asc" }],
  });

  const discountCodesByRetailer = new Map<string, CompareProductRow["discountCodes"]>();
  for (const voucherCode of activeVoucherCodes) {
    const retailerName = voucherCode.retailer.name;
    const existing = discountCodesByRetailer.get(retailerName) ?? [];
    existing.push({
      label:
        voucherCode.source === "vouchercodes" && voucherCode.isExclusive
          ? "Exclusive Promo Code"
          : voucherCode.source === "vouchercodes"
            ? "Promo Code"
            : "Discount Code",
      code: voucherCode.code,
      type: "promo",
      description: voucherCode.title,
    });
    discountCodesByRetailer.set(retailerName, existing);
  }

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
          categoryLabels: true,
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
          row.product.proteinPer100g !== null ? Number(row.product.proteinPer100g) : null,
        ingredients: row.product.ingredients,
        nutritionalInformation: parseNutritionalInformation(row.product.nutritionalInfo),
        inStock: row.inStock,
        url: row.url,
        type: formatProductType(
          row.product.category,
          Array.isArray(row.product.categoryLabels) ? row.product.categoryLabels.filter((value): value is string => typeof value === "string") : []
        ),
        description: row.product.description,
        discountCodes: discountCodesByRetailer.get(row.retailer.name) ?? [],
      };
    });
}
