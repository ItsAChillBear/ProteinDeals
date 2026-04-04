import { db } from "@proteindeals/db";

export async function loadMyproteinDbVariants() {
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

export async function ensureRetailer() {
  const existing = await db.retailer.findUnique({
    where: {
      slug: "myprotein",
    },
  });

  if (existing) {
    return existing;
  }

  return db.retailer.create({
    data: {
      name: "MyProtein",
      slug: "myprotein",
      baseUrl: "https://www.myprotein.com",
      isActive: true,
    },
  });
}
