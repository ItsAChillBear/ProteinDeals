import { ensureRetailer, loadMyproteinDbVariants } from "./db.js";
import { getFieldDiffs, getRetailerProductId } from "./helpers.js";
import { deleteDbVariant, upsertScrapedVariant } from "./persistence.js";
import type {
  DiffAction,
  ImportMyproteinResult,
  MyproteinSyncEntry,
  MyproteinSyncPreview,
} from "./types.js";
import type { MyproteinVariantRecord } from "../../scrapers/myprotein.js";

export async function importMyproteinRecords(
  records: MyproteinVariantRecord[]
): Promise<ImportMyproteinResult> {
  const preview = await previewMyproteinSync(records);
  return applyMyproteinSync(preview.entries.map((entry) => entry.id), preview);
}

export async function previewMyproteinSync(
  records: MyproteinVariantRecord[],
  options: {
    includeDeletes?: boolean;
    deleteCategoryUrls?: string[];
  } = {}
): Promise<MyproteinSyncPreview> {
  const includeDeletes = options.includeDeletes ?? true;
  const deleteCategoryUrls = options.deleteCategoryUrls ?? [];
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

  if (includeDeletes) {
    for (const variant of dbVariants) {
      const retailerProductId = variant.retailerProductId;
      if (!retailerProductId || seenRetailerProductIds.has(retailerProductId)) continue;
      if (deleteCategoryUrls.length > 0) {
        const variantCategoryUrls = Array.isArray(variant.product.categoryUrls)
          ? variant.product.categoryUrls.filter((value): value is string => typeof value === "string")
          : [];
        if (!variantCategoryUrls.some((url) => deleteCategoryUrls.includes(url))) {
          continue;
        }
      }

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
  }

  const weight = { create: 0, update: 1, delete: 2, unchanged: 3 } satisfies Record<
    DiffAction,
    number
  >;
  entries.sort(
    (left, right) =>
      weight[left.action] - weight[right.action] ||
      left.retailerProductId.localeCompare(right.retailerProductId)
  );

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
  preview?: MyproteinSyncPreview,
  onProgress?: (message: string, index: number, total: number) => Promise<void>
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

  const actionableEntries = entries.filter((e) => e.action !== "unchanged");
  let actionableIndex = 0;

  for (const entry of entries) {
    if (entry.action === "unchanged") {
      result.unchanged += 1;
      continue;
    }

    actionableIndex += 1;
    const label = entry.scraped
      ? `${entry.scraped.productName} (${entry.scraped.sizeLabel ?? "?"})`
      : entry.retailerProductId;
    await onProgress?.(
      `${entry.action === "delete" ? "Deleting" : entry.action === "create" ? "Creating" : "Updating"} ${label}`,
      actionableIndex,
      actionableEntries.length
    );

    if (entry.action === "delete") {
      if (entry.current) {
        const deletedProduct = await deleteDbVariant(entry.current);
        result.deletedVariants += 1;
        result.deletedProducts += deletedProduct ? 1 : 0;
      }
      continue;
    }

    if (!entry.scraped) {
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

export { clearMyproteinDatabase } from "./persistence.js";
