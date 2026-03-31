import { initTRPC } from "@trpc/server";
import { z } from "zod";
import type { Context } from "./index.js";

const t = initTRPC.context<Context>().create();

// TODO: Replace with real DB queries via @proteindeals/db
const MOCK_RETAILERS = [
  {
    id: "r-1",
    name: "MyProtein",
    slug: "myprotein",
    baseUrl: "https://www.myprotein.com",
    logoUrl: null,
    affiliatePrefix: "https://www.awin1.com/myprotein",
    trustScore: 4.6,
    freeDeliveryThresholdGbp: 35,
    isActive: true,
    productCount: 142,
    lastScrapedAt: "2025-01-15T08:00:00Z",
  },
  {
    id: "r-2",
    name: "Bulk",
    slug: "bulk",
    baseUrl: "https://www.bulk.com",
    logoUrl: null,
    affiliatePrefix: "https://www.awin1.com/bulk",
    trustScore: 4.4,
    freeDeliveryThresholdGbp: 40,
    isActive: true,
    productCount: 89,
    lastScrapedAt: "2025-01-15T08:00:00Z",
  },
  {
    id: "r-3",
    name: "Holland & Barrett",
    slug: "holland-barrett",
    baseUrl: "https://www.hollandandbarrett.com",
    logoUrl: null,
    affiliatePrefix: "https://www.awin1.com/hb",
    trustScore: 4.2,
    freeDeliveryThresholdGbp: 30,
    isActive: true,
    productCount: 54,
    lastScrapedAt: "2025-01-15T06:00:00Z",
  },
  {
    id: "r-4",
    name: "Amazon UK",
    slug: "amazon-uk",
    baseUrl: "https://www.amazon.co.uk",
    logoUrl: null,
    affiliatePrefix: "https://www.amazon.co.uk/?tag=proteindeals-21",
    trustScore: 4.5,
    freeDeliveryThresholdGbp: null,
    isActive: true,
    productCount: 312,
    lastScrapedAt: "2025-01-15T07:00:00Z",
  },
  {
    id: "r-5",
    name: "Protein Works",
    slug: "protein-works",
    baseUrl: "https://www.theproteinworks.com",
    logoUrl: null,
    affiliatePrefix: "https://www.awin1.com/tpw",
    trustScore: 4.3,
    freeDeliveryThresholdGbp: 50,
    isActive: true,
    productCount: 67,
    lastScrapedAt: "2025-01-15T09:00:00Z",
  },
];

export const retailersRouter = t.router({
  getAll: t.procedure
    .input(
      z
        .object({
          activeOnly: z.boolean().optional().default(true),
        })
        .optional()
        .default({})
    )
    .query(({ input }) => {
      const results = input.activeOnly
        ? MOCK_RETAILERS.filter((r) => r.isActive)
        : MOCK_RETAILERS;
      return results.sort((a, b) => b.trustScore - a.trustScore);
    }),

  getBySlug: t.procedure
    .input(z.object({ slug: z.string().min(1) }))
    .query(({ input }) => {
      const retailer = MOCK_RETAILERS.find((r) => r.slug === input.slug);
      if (!retailer) {
        throw new Error(`Retailer not found: ${input.slug}`);
      }
      return retailer;
    }),
});
