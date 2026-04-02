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
import { getPricePerGramProtein, getPricePerServing } from "./price-comparison-metrics";
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
      const requestedFlavour = filters.flavour !== "all" ? filters.flavour : null;
      const hasRequestedFlavour = requestedFlavour
        ? group.variants.some((variant) => (variant.flavour ?? "") === requestedFlavour)
        : false;
      const activeFlavour = hasRequestedFlavour
        ? requestedFlavour!
        : (fallback.flavour ?? "") ?? flavourOptions[0]?.value ?? "";
      const sizeOptions = getSizeOptions(group, activeFlavour);
      const selected =
        sizeOptions
          .map((option) => group.variants.find((variant) => variant.id === option.value))
          .find(Boolean) ??
        fallback;
      return { ...group, selected };
    });
  }, [filters.flavour, groups]);

  const sorted = useMemo(
    () => sortGroups(groupedWithSelection, sortKey, sortDir),
    [groupedWithSelection, sortDir, sortKey]
  );

  const visibleVariants = useMemo(() => getVisibleVariants(groupedWithSelection), [groupedWithSelection]);

  const filterOptions = useMemo<ColumnFilterOptions>(
    () => getFilterOptionsForFilters(visibleVariants, allVariants, filters),
    [allVariants, filters, visibleVariants]
  );

  const bestValueMetric = useMemo(() => {
    return sortKey === "pricePerServing" || sortKey === "pricePerGramProtein"
      ? sortKey
      : "pricePer100g";
  }, [sortKey]);

  const bestValueAmount = useMemo(() => {
    const inStockVisibleVariants = visibleVariants.filter((variant) => {
      if (!variant.inStock) return false;
      return variantMatchesFilters(variant, filters);
    });

    const metricValues = inStockVisibleVariants
      .map((variant) => getBestValueAmount(variant, bestValueMetric))
      .filter((value): value is number => value !== null);

    return metricValues.length ? Math.min(...metricValues) : null;
  }, [bestValueMetric, filters, visibleVariants]);

  const bestValueVariantId = useMemo(() => {
    if (bestValueAmount === null) return null;

    for (const group of sorted) {
      const activeFlavour =
        filters.flavour !== "all" ? filters.flavour : group.selected.flavour ?? "";
      const visibleGroupVariants = group.variants.filter((variant) => {
        if ((variant.flavour ?? "") !== activeFlavour) return false;
        return variantMatchesFilters(variant, filters);
      });

      const match = visibleGroupVariants.find(
        (variant) =>
          variant.inStock && getBestValueAmount(variant, bestValueMetric) === bestValueAmount
      );
      if (match) return match.id;
    }

    return null;
  }, [bestValueAmount, bestValueMetric, filters, sorted]);

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
    setFilters((current) => sanitizeFilters(allVariants, { ...current, [key]: value }));
  }

  function resetFilters() {
    setFilters(DEFAULT_FILTERS);
  }

  const hasActiveFilters = FILTER_KEYS.some((key) => filters[key] !== DEFAULT_FILTERS[key]);
  const sortLabel =
    sortKey === "pricePer100g"
      ? "Price / 100g"
      : sortKey === "pricePerServing"
        ? "Price / Serving"
        : sortKey === "pricePerGramProtein"
          ? "Price / 1g Protein"
          : sortKey;

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
            Sorted by: {sortLabel}
          </p>
        </div>
      </div>

      <PriceComparisonDesktopTable
        groups={sorted}
        expandedRows={expandedRows}
        bestValueVariantId={bestValueVariantId}
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
        bestValueVariantId={bestValueVariantId}
        onToggleExpanded={toggleExpanded}
      />
    </div>
  );
}

function getBestValueAmount(product: Product, sortKey: SortKey) {
  if (sortKey === "pricePerServing") return getPricePerServing(product);
  if (sortKey === "pricePerGramProtein") return getPricePerGramProtein(product);
  return product.pricePer100g;
}
