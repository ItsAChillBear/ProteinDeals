import { initTRPC } from "@trpc/server";
import { z } from "zod";
import type { Context } from "./index.js";

const t = initTRPC.context<Context>().create();

// TODO: Replace with real DB queries via @wheywise/db
const MOCK_PRICE_RECORDS = [
  {
    id: "pr-1",
    variantId: "v-1",
    productSlug: "myprotein-impact-whey-chocolate-brownie-2500g",
    retailer: "MyProtein",
    price: 37.99,
    pricePer100g: 1.52,
    wasOnSale: true,
    scrapedAt: "2025-01-15T08:00:00Z",
  },
  {
    id: "pr-2",
    variantId: "v-1",
    productSlug: "myprotein-impact-whey-chocolate-brownie-2500g",
    retailer: "MyProtein",
    price: 42.99,
    pricePer100g: 1.72,
    wasOnSale: false,
    scrapedAt: "2025-01-10T08:00:00Z",
  },
  {
    id: "pr-3",
    variantId: "v-1",
    productSlug: "myprotein-impact-whey-chocolate-brownie-2500g",
    retailer: "MyProtein",
    price: 54.99,
    pricePer100g: 2.2,
    wasOnSale: false,
    scrapedAt: "2025-01-01T08:00:00Z",
  },
  {
    id: "pr-4",
    variantId: "v-2",
    productSlug: "bulk-pure-whey-vanilla-2000g",
    retailer: "Bulk",
    price: 29.99,
    pricePer100g: 1.5,
    wasOnSale: true,
    scrapedAt: "2025-01-15T08:00:00Z",
  },
];

export const pricesRouter = t.router({
  getCurrent: t.procedure
    .input(
      z.object({
        productSlug: z.string().min(1),
      })
    )
    .query(({ input }) => {
      const latestByRetailer = new Map<string, (typeof MOCK_PRICE_RECORDS)[0]>();

      MOCK_PRICE_RECORDS.filter(
        (r) => r.productSlug === input.productSlug
      ).forEach((record) => {
        const existing = latestByRetailer.get(record.retailer);
        if (
          !existing ||
          new Date(record.scrapedAt) > new Date(existing.scrapedAt)
        ) {
          latestByRetailer.set(record.retailer, record);
        }
      });

      return Array.from(latestByRetailer.values()).sort(
        (a, b) => a.pricePer100g - b.pricePer100g
      );
    }),

  getHistory: t.procedure
    .input(
      z.object({
        productSlug: z.string().min(1),
        retailer: z.string().optional(),
        days: z.number().min(1).max(365).optional().default(90),
      })
    )
    .query(({ input }) => {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - input.days);

      let records = MOCK_PRICE_RECORDS.filter(
        (r) =>
          r.productSlug === input.productSlug &&
          new Date(r.scrapedAt) >= cutoff
      );

      if (input.retailer) {
        records = records.filter(
          (r) => r.retailer.toLowerCase() === input.retailer!.toLowerCase()
        );
      }

      return records.sort(
        (a, b) =>
          new Date(a.scrapedAt).getTime() - new Date(b.scrapedAt).getTime()
      );
    }),

  getLowest: t.procedure
    .input(
      z.object({
        productSlug: z.string().min(1),
      })
    )
    .query(({ input }) => {
      const records = MOCK_PRICE_RECORDS.filter(
        (r) => r.productSlug === input.productSlug
      );

      if (records.length === 0) return null;

      const lowest = records.reduce((min, r) =>
        r.price < min.price ? r : min
      );

      const current = records.reduce((latest, r) =>
        new Date(r.scrapedAt) > new Date(latest.scrapedAt) ? r : latest
      );

      return {
        lowestEver: lowest,
        current,
        savingVsLowest: current.price - lowest.price,
        isAtLowest: current.price === lowest.price,
      };
    }),
});
