import {
  pgTable,
  uuid,
  varchar,
  text,
  decimal,
  integer,
  boolean,
  timestamp,
  pgEnum,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─── Enums ─────────────────────────────────────────────────────────────────

export const productCategoryEnum = pgEnum("product_category", [
  "whey_concentrate",
  "whey_isolate",
  "vegan",
  "casein",
  "mass_gainer",
  "plant_blend",
  "other",
]);

export const scrapeJobTypeEnum = pgEnum("scrape_job_type", [
  "full_crawl",
  "price_update",
  "sitemap_parse",
  "category_scrape",
]);

export const scrapeJobStatusEnum = pgEnum("scrape_job_status", [
  "pending",
  "running",
  "completed",
  "failed",
  "cancelled",
]);

// ─── Products ───────────────────────────────────────────────────────────────

export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: varchar("slug", { length: 255 }).notNull().unique(),
    name: varchar("name", { length: 500 }).notNull(),
    brand: varchar("brand", { length: 100 }).notNull(),
    category: productCategoryEnum("category").notNull(),
    description: text("description"),
    proteinPer100g: decimal("protein_per_100g", { precision: 5, scale: 2 }),
    servingSizeG: decimal("serving_size_g", { precision: 6, scale: 2 }),
    servingsPerPack: integer("servings_per_pack"),
    imageUrl: text("image_url"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    slugIdx: index("products_slug_idx").on(table.slug),
    brandIdx: index("products_brand_idx").on(table.brand),
    categoryIdx: index("products_category_idx").on(table.category),
    isActiveIdx: index("products_is_active_idx").on(table.isActive),
  })
);

// ─── Retailers ──────────────────────────────────────────────────────────────

export const retailers = pgTable(
  "retailers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 100 }).notNull(),
    slug: varchar("slug", { length: 100 }).notNull().unique(),
    baseUrl: varchar("base_url", { length: 255 }).notNull(),
    logoUrl: text("logo_url"),
    affiliatePrefix: text("affiliate_prefix"),
    trustScore: decimal("trust_score", { precision: 3, scale: 2 }),
    freeDeliveryThresholdGbp: decimal("free_delivery_threshold_gbp", {
      precision: 8,
      scale: 2,
    }),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    slugIdx: index("retailers_slug_idx").on(table.slug),
    isActiveIdx: index("retailers_is_active_idx").on(table.isActive),
  })
);

// ─── Product Variants ────────────────────────────────────────────────────────
// One product can have multiple retailer listings (variants)

export const productVariants = pgTable(
  "product_variants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    retailerId: uuid("retailer_id")
      .notNull()
      .references(() => retailers.id, { onDelete: "cascade" }),
    retailerProductId: varchar("retailer_product_id", { length: 255 }),
    url: text("url").notNull(),
    flavour: varchar("flavour", { length: 150 }),
    sizeG: decimal("size_g", { precision: 8, scale: 2 }).notNull(),
    inStock: boolean("in_stock").notNull().default(true),
    lastScrapedAt: timestamp("last_scraped_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    productIdIdx: index("product_variants_product_id_idx").on(table.productId),
    retailerIdIdx: index("product_variants_retailer_id_idx").on(
      table.retailerId
    ),
    productRetailerIdx: index("product_variants_product_retailer_idx").on(
      table.productId,
      table.retailerId
    ),
    inStockIdx: index("product_variants_in_stock_idx").on(table.inStock),
  })
);

// ─── Price Records ───────────────────────────────────────────────────────────
// Append-only price history table

export const priceRecords = pgTable(
  "price_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    variantId: uuid("variant_id")
      .notNull()
      .references(() => productVariants.id, { onDelete: "cascade" }),
    price: decimal("price", { precision: 10, scale: 2 }).notNull(),
    pricePer100g: decimal("price_per_100g", {
      precision: 10,
      scale: 4,
    }).notNull(),
    wasOnSale: boolean("was_on_sale").notNull().default(false),
    scrapedAt: timestamp("scraped_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    variantIdIdx: index("price_records_variant_id_idx").on(table.variantId),
    scrapedAtIdx: index("price_records_scraped_at_idx").on(table.scrapedAt),
    variantScrapedIdx: index("price_records_variant_scraped_idx").on(
      table.variantId,
      table.scrapedAt
    ),
    pricePer100gIdx: index("price_records_price_per_100g_idx").on(
      table.pricePer100g
    ),
  })
);

// ─── Scrape Jobs ─────────────────────────────────────────────────────────────

export const scrapeJobs = pgTable(
  "scrape_jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    retailerId: uuid("retailer_id")
      .notNull()
      .references(() => retailers.id, { onDelete: "cascade" }),
    jobType: scrapeJobTypeEnum("job_type").notNull(),
    status: scrapeJobStatusEnum("status").notNull().default("pending"),
    pagesScraped: integer("pages_scraped").notNull().default(0),
    productsFound: integer("products_found").notNull().default(0),
    errors: jsonb("errors"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    retailerIdIdx: index("scrape_jobs_retailer_id_idx").on(table.retailerId),
    statusIdx: index("scrape_jobs_status_idx").on(table.status),
    createdAtIdx: index("scrape_jobs_created_at_idx").on(table.createdAt),
  })
);

// ─── Price Alerts ────────────────────────────────────────────────────────────

export const priceAlerts = pgTable(
  "price_alerts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    variantId: uuid("variant_id")
      .notNull()
      .references(() => productVariants.id, { onDelete: "cascade" }),
    email: varchar("email", { length: 255 }).notNull(),
    targetPrice: decimal("target_price", {
      precision: 10,
      scale: 2,
    }).notNull(),
    isActive: boolean("is_active").notNull().default(true),
    lastTriggeredAt: timestamp("last_triggered_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    variantIdIdx: index("price_alerts_variant_id_idx").on(table.variantId),
    emailIdx: index("price_alerts_email_idx").on(table.email),
    isActiveIdx: index("price_alerts_is_active_idx").on(table.isActive),
  })
);

// ─── Relations ───────────────────────────────────────────────────────────────

export const productsRelations = relations(products, ({ many }) => ({
  variants: many(productVariants),
}));

export const retailersRelations = relations(retailers, ({ many }) => ({
  variants: many(productVariants),
  scrapeJobs: many(scrapeJobs),
}));

export const productVariantsRelations = relations(
  productVariants,
  ({ one, many }) => ({
    product: one(products, {
      fields: [productVariants.productId],
      references: [products.id],
    }),
    retailer: one(retailers, {
      fields: [productVariants.retailerId],
      references: [retailers.id],
    }),
    priceRecords: many(priceRecords),
    priceAlerts: many(priceAlerts),
  })
);

export const priceRecordsRelations = relations(priceRecords, ({ one }) => ({
  variant: one(productVariants, {
    fields: [priceRecords.variantId],
    references: [productVariants.id],
  }),
}));

export const scrapeJobsRelations = relations(scrapeJobs, ({ one }) => ({
  retailer: one(retailers, {
    fields: [scrapeJobs.retailerId],
    references: [retailers.id],
  }),
}));

export const priceAlertsRelations = relations(priceAlerts, ({ one }) => ({
  variant: one(productVariants, {
    fields: [priceAlerts.variantId],
    references: [productVariants.id],
  }),
}));
