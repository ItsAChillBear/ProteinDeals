import { initTRPC } from "@trpc/server";
import { z } from "zod";
import type { Context } from "./index.js";

const t = initTRPC.context<Context>().create();

// TODO: Replace with real DB queries via @proteindeals/db
const MOCK_PRODUCTS = [
  {
    id: "1",
    slug: "myprotein-impact-whey-chocolate-brownie-2500g",
    name: "Impact Whey Protein - Chocolate Brownie",
    brand: "MyProtein",
    type: "Whey Concentrate",
    size: "2.5kg",
    sizeG: 2500,
    retailer: "MyProtein",
    price: 37.99,
    pricePer100g: 1.52,
    inStock: true,
    url: "https://www.myprotein.com",
    proteinPer100g: 82,
    description:
      "MyProtein's best-selling whey concentrate with 21g protein per serving.",
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-15T00:00:00Z",
  },
  {
    id: "2",
    slug: "bulk-pure-whey-vanilla-2000g",
    name: "Pure Whey Protein - Vanilla",
    brand: "Bulk",
    type: "Whey Concentrate",
    size: "2kg",
    sizeG: 2000,
    retailer: "Bulk",
    price: 29.99,
    pricePer100g: 1.5,
    inStock: true,
    url: "https://www.bulk.com",
    proteinPer100g: 80,
    description: "Bulk's flagship no-nonsense whey concentrate.",
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-15T00:00:00Z",
  },
  {
    id: "3",
    slug: "on-gold-standard-whey-double-chocolate-2270g",
    name: "Gold Standard 100% Whey - Double Rich Chocolate",
    brand: "Optimum Nutrition",
    type: "Whey Concentrate",
    size: "2.27kg",
    sizeG: 2270,
    retailer: "Holland & Barrett",
    price: 54.99,
    pricePer100g: 2.42,
    inStock: true,
    url: "https://www.hollandandbarrett.com",
    proteinPer100g: 78,
    description: "The world's best-selling whey protein.",
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-15T00:00:00Z",
  },
];

const productFiltersSchema = z.object({
  brand: z.array(z.string()).optional(),
  type: z.array(z.string()).optional(),
  retailer: z.array(z.string()).optional(),
  minPrice: z.number().optional(),
  maxPrice: z.number().optional(),
  inStock: z.boolean().optional(),
  sortBy: z
    .enum(["price", "pricePer100g", "brand", "name"])
    .optional()
    .default("pricePer100g"),
  sortDir: z.enum(["asc", "desc"]).optional().default("asc"),
  limit: z.number().min(1).max(100).optional().default(50),
  offset: z.number().min(0).optional().default(0),
});

export const productsRouter = t.router({
  getAll: t.procedure.input(productFiltersSchema).query(({ input }) => {
    let results = [...MOCK_PRODUCTS];

    if (input.brand?.length) {
      results = results.filter((p) =>
        input.brand!.some(
          (b) => p.brand.toLowerCase() === b.toLowerCase()
        )
      );
    }

    if (input.type?.length) {
      results = results.filter((p) =>
        input.type!.some(
          (t) => p.type.toLowerCase() === t.toLowerCase()
        )
      );
    }

    if (input.retailer?.length) {
      results = results.filter((p) =>
        input.retailer!.some(
          (r) => p.retailer.toLowerCase() === r.toLowerCase()
        )
      );
    }

    if (input.inStock !== undefined) {
      results = results.filter((p) => p.inStock === input.inStock);
    }

    if (input.minPrice !== undefined) {
      results = results.filter((p) => p.price >= input.minPrice!);
    }

    if (input.maxPrice !== undefined) {
      results = results.filter((p) => p.price <= input.maxPrice!);
    }

    results.sort((a, b) => {
      const aVal = a[input.sortBy as keyof typeof a] as number | string;
      const bVal = b[input.sortBy as keyof typeof b] as number | string;

      if (typeof aVal === "string" && typeof bVal === "string") {
        return input.sortDir === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      return input.sortDir === "asc"
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });

    const total = results.length;
    const items = results.slice(input.offset, input.offset + input.limit);

    return { items, total, offset: input.offset, limit: input.limit };
  }),

  getBySlug: t.procedure
    .input(z.object({ slug: z.string().min(1) }))
    .query(({ input }) => {
      const product = MOCK_PRODUCTS.find((p) => p.slug === input.slug);
      if (!product) {
        throw new Error(`Product not found: ${input.slug}`);
      }
      return product;
    }),

  search: t.procedure
    .input(
      z.object({
        query: z.string().min(1).max(200),
        limit: z.number().min(1).max(20).optional().default(10),
      })
    )
    .query(({ input }) => {
      const q = input.query.toLowerCase();
      const results = MOCK_PRODUCTS.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          p.type.toLowerCase().includes(q)
      ).slice(0, input.limit);

      return { items: results, total: results.length };
    }),
});
