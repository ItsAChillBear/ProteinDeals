"use client";

import { useMemo, useState } from "react";
import PriceComparisonDesktopTable from "./PriceComparisonDesktopTable";
import PriceComparisonMobileList from "./PriceComparisonMobileList";
import {
  DEFAULT_FILTERS,
  FILTER_KEYS,
  getFilterOptionsForFilters,
  getVisibleVariants,
  sanitizeFilters,
  variantMatchesFilters,
  type ColumnFilters,
  type ColumnFilterOptions,
} from "./price-comparison-filters";
import type {
  Product,
  ProductGroupWithSelection,
  SortDir,
  SortKey,
} from "./price-comparison-table.types";
import {
  getDefaultVariant,
  getFlavourOptions,
  getSizeOptions,
  groupProducts,
  sortGroups,
} from "./price-comparison-table.utils";

interface Props {
  products: Product[];
}

export type { Product } from "./price-comparison-table.types";

export default function PriceComparisonTable({ products }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("pricePer100g");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [filters, setFilters] = useState<ColumnFilters>(DEFAULT_FILTERS);

  const groups = useMemo(() => groupProducts(products), [products]);
  const allVariants = useMemo(() => groups.flatMap((group) => group.variants), [groups]);

  const groupedWithSelection = useMemo<ProductGroupWithSelection[]>(() => {
    return groups.map((group) => {
      const fallback = getDefaultVariant(group);
      const flavourOptions = getFlavourOptions(group);
      const activeFlavour =
        (fallback.flavour ?? "") ??
        flavourOptions[0]?.value ??
        "";
      const sizeOptions = getSizeOptions(group, activeFlavour);
      const selected =
        sizeOptions
          .map((option) => group.variants.find((variant) => variant.id === option.value))
          .find(Boolean) ??
        fallback;
      return { ...group, selected };
    });
  }, [groups]);

  const sorted = useMemo(
    () => sortGroups(groupedWithSelection, sortKey, sortDir),
    [groupedWithSelection, sortDir, sortKey]
  );

  const visibleVariants = useMemo(() => getVisibleVariants(groupedWithSelection), [groupedWithSelection]);

  const filterOptions = useMemo<ColumnFilterOptions>(
    () => getFilterOptionsForFilters(visibleVariants, allVariants, filters),
    [allVariants, filters, visibleVariants]
  );

  const minPricePer100g = useMemo(() => {
    const inStockVisibleVariants = visibleVariants.filter((variant) => {
      if (!variant.inStock) return false;
      return variantMatchesFilters(variant, filters);
    });

    return inStockVisibleVariants.length
      ? Math.min(...inStockVisibleVariants.map((variant) => variant.pricePer100g))
      : null;
  }, [filters, visibleVariants]);

  const bestValueVariantId = useMemo(() => {
    if (minPricePer100g === null) return null;

    for (const group of sorted) {
      const activeFlavour =
        filters.flavour !== "all" ? filters.flavour : group.selected.flavour ?? "";
      const visibleGroupVariants = group.variants.filter((variant) => {
        if ((variant.flavour ?? "") !== activeFlavour) return false;
        return variantMatchesFilters(variant, filters);
      });

      const match = visibleGroupVariants.find(
        (variant) => variant.inStock && variant.pricePer100g === minPricePer100g
      );
      if (match) return match.id;
    }

    return null;
  }, [filters, minPricePer100g, sorted]);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir("asc");
  }

  function toggleExpanded(groupId: string) {
    setExpandedRows((current) => ({ ...current, [groupId]: !current[groupId] }));
  }

  function setFilter(key: keyof ColumnFilters, value: string) {
    setFilters((current) => sanitizeFilters(visibleVariants, { ...current, [key]: value }));
  }

  function resetFilters() {
    setFilters(DEFAULT_FILTERS);
  }

  const hasActiveFilters = FILTER_KEYS.some((key) => filters[key] !== DEFAULT_FILTERS[key]);

  if (products.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-800 bg-gray-900 p-12 text-center">
        <p className="text-gray-400">No products match the current filters.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900">
      <div className="flex items-center justify-between border-b border-gray-800 px-6 py-4">
        <p className="text-sm text-gray-400">
          <span className="font-semibold text-white">{sorted.length}</span> grouped
          products across <span className="font-semibold text-white">{products.length}</span>{" "}
          variants
        </p>
        <div className="flex items-center gap-3">
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={resetFilters}
              className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs font-medium text-gray-200 transition hover:border-gray-500 hover:text-white"
            >
              Reset Filters
            </button>
          ) : null}
          <p className="text-xs text-gray-600">
            Sorted by: {sortKey === "pricePer100g" ? "Price / 100g" : sortKey}
          </p>
        </div>
      </div>

      <PriceComparisonDesktopTable
        groups={sorted}
        expandedRows={expandedRows}
        bestValueVariantId={bestValueVariantId}
        minPricePer100g={minPricePer100g}
        onSort={handleSort}
        onToggleExpanded={toggleExpanded}
        sortDir={sortDir}
        sortKey={sortKey}
        filters={filters}
        filterOptions={filterOptions}
        onFilter={setFilter}
      />

      <PriceComparisonMobileList
        groups={sorted}
        expandedRows={expandedRows}
        minPricePer100g={minPricePer100g}
        onToggleExpanded={toggleExpanded}
      />
    </div>
  );
}
