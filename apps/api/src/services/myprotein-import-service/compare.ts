import { db } from "@proteindeals/db";
import {
  formatCategoryList,
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
          servingSizeG: true,
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

  return rows.map((row) => {
      const latest = row.priceRecords[0];
      const categoryLabels = Array.isArray(row.product.categoryLabels)
        ? row.product.categoryLabels.filter((value): value is string => typeof value === "string")
        : [];
      const type = formatProductType(row.product.category, categoryLabels);
      const category = formatCategoryList(categoryLabels, type);
      const searchText = [
        row.product.name,
        row.product.brand,
        row.retailer.name,
        category,
        type,
        row.flavour,
        formatSizeLabel(row.sizeG !== null ? Number(row.sizeG) : null),
      ]
        .filter((value): value is string => Boolean(value))
        .join(" ")
        .toLowerCase();

      return {
        id: row.id,
        slug: row.product.slug,
        name: row.product.name,
        brand: row.product.brand,
        searchText,
        imageUrl: row.product.imageUrl,
        retailer: row.retailer.name,
        category,
        flavour: row.flavour,
        size: formatSizeLabel(row.sizeG !== null ? Number(row.sizeG) : null),
        sizeG: row.sizeG !== null ? Number(row.sizeG) : null,
        servingSizeG:
          row.product.servingSizeG !== null ? Number(row.product.servingSizeG) : null,
        servings: row.product.servingsPerPack,
        price: latest?.price !== null && latest?.price !== undefined ? Number(latest.price) : null,
        pricePer100g:
          latest?.pricePer100g !== null && latest?.pricePer100g !== undefined
            ? Number(latest.pricePer100g)
            : null,
        singlePrice:
          latest?.price !== null && latest?.price !== undefined ? Number(latest.price) : null,
        singlePricePer100g:
          latest?.pricePer100g !== null && latest?.pricePer100g !== undefined
            ? Number(latest.pricePer100g)
            : null,
        subscriptionPrice:
          latest?.subscriptionPrice !== null && latest?.subscriptionPrice !== undefined
            ? Number(latest.subscriptionPrice)
            : null,
        subscriptionPricePer100g:
          latest?.subscriptionPricePer100g !== null &&
          latest?.subscriptionPricePer100g !== undefined
            ? Number(latest.subscriptionPricePer100g)
            : null,
        subscriptionSavings:
          latest?.subscriptionSavings !== null && latest?.subscriptionSavings !== undefined
            ? Number(latest.subscriptionSavings)
            : null,
        proteinPer100g:
          row.product.proteinPer100g !== null ? Number(row.product.proteinPer100g) : null,
        ingredients: row.product.ingredients,
        nutritionalInformation: parseNutritionalInformation(row.product.nutritionalInfo),
        inStock: row.inStock,
        url: row.url,
        type,
        description: row.product.description,
        discountCodes: discountCodesByRetailer.get(row.retailer.name) ?? [],
      };
    });
}
