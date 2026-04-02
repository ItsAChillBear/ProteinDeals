"use client";

import { useMemo, useState } from "react";
import PriceComparisonDesktopTable from "./PriceComparisonDesktopTable";
import PriceComparisonMobileList from "./PriceComparisonMobileList";
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

export const RANGE_PREFIX = "range:";


export function matchesRange(value: number | null, filter: string): boolean {
  if (!filter.startsWith(RANGE_PREFIX)) return true;
  if (value === null) return false;
  const [lo, hi] = filter.replace(RANGE_PREFIX, "").split(":");
  return value >= Number(lo) && (hi === "" || value < Number(hi));
}

export interface ColumnFilters {
  size: string;
  flavour: string;
  servings: string;
  price: string;
  pricePer100g: string;
  protein: string;
}

export interface ColumnFilterOptions {
  sizes: string[];
  flavours: string[];
  servings: string[];
  prices: string[];
  pricePer100gs: string[];
  proteins: string[];
}

const DEFAULT_FILTERS: ColumnFilters = {
  size: "all",
  flavour: "all",
  servings: "all",
  price: "all",
  pricePer100g: "all",
  protein: "all",
};

const FILTER_KEYS: Array<keyof ColumnFilters> = [
  "size",
  "flavour",
  "servings",
  "price",
  "pricePer100g",
  "protein",
];

export default function PriceComparisonTable({ products }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("pricePer100g");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [selectedFlavours, setSelectedFlavours] = useState<Record<string, string>>({});
  const [filters, setFilters] = useState<ColumnFilters>(DEFAULT_FILTERS);

  const groups = useMemo(() => groupProducts(products), [products]);
  const allVariants = useMemo(() => groups.flatMap((group) => group.variants), [groups]);

  const groupedWithSelection = useMemo<ProductGroupWithSelection[]>(() => {
    return groups.map((group) => {
      const fallback = getDefaultVariant(group);
      const flavourOptions = getFlavourOptions(group);
      const activeFlavour =
        selectedFlavours[group.id] ??
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
  }, [groups, selectedFlavours]);

  const sorted = useMemo(
    () => sortGroups(groupedWithSelection, sortKey, sortDir),
    [groupedWithSelection, sortDir, sortKey]
  );

  const visibleVariants = useMemo(() => getVisibleVariants(groupedWithSelection), [groupedWithSelection]);

  const filterOptions = useMemo<ColumnFilterOptions>(
    () => getFilterOptionsForFilters(allVariants, filters),
    [allVariants, filters]
  );

  const minPricePer100g = useMemo(() => {
    const inStockGroups = sorted.filter((group) => group.selected.inStock);
    return inStockGroups.length
      ? Math.min(...inStockGroups.map((group) => group.selected.pricePer100g))
      : null;
  }, [sorted]);

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

  function selectFlavour(group: ProductGroupWithSelection, flavour: string) {
    setSelectedFlavours((current) => ({ ...current, [group.id]: flavour }));
  }

  function setFilter(key: keyof ColumnFilters, value: string) {
    setFilters((current) => sanitizeFilters(allVariants, { ...current, [key]: value }));
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
        minPricePer100g={minPricePer100g}
        onSort={handleSort}
        onToggleExpanded={toggleExpanded}
        onSelectFlavour={selectFlavour}
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
        onSelectFlavour={selectFlavour}
      />
    </div>
  );
}

function getVisibleVariants(groups: ProductGroupWithSelection[]) {
  return groups.flatMap((group) => {
    const activeFlavour = group.selected.flavour ?? "";
    return group.variants.filter((variant) => (variant.flavour ?? "") === activeFlavour);
  });
}

function getFilterOptionsForFilters(
  variants: Product[],
  filters: ColumnFilters
): ColumnFilterOptions {
  return {
    sizes: getOptionsForKey(variants, filters, "size", (variant) => variant.size).sort(),
    flavours: getOptionsForKey(variants, filters, "flavour", (variant) => variant.flavour ?? "")
      .filter(Boolean)
      .sort(),
    servings: getOptionsForKey(variants, filters, "servings", (variant) =>
      variant.servings !== null ? String(variant.servings) : null
    ).sort((a, b) => Number(a) - Number(b)),
    prices: getOptionsForKey(variants, filters, "price", (variant) => variant.price.toFixed(2))
      .sort((a, b) => Number(a) - Number(b)),
    pricePer100gs: getOptionsForKey(variants, filters, "pricePer100g", (variant) =>
      variant.pricePer100g.toFixed(2)
    ).sort((a, b) => Number(a) - Number(b)),
    proteins: getOptionsForKey(variants, filters, "protein", (variant) =>
      variant.proteinPer100g !== null ? String(variant.proteinPer100g) : null
    ).sort((a, b) => Number(a) - Number(b)),
  };
}

function getOptionsForKey(
  variants: Product[],
  filters: ColumnFilters,
  targetKey: keyof ColumnFilters,
  valueGetter: (variant: Product) => string | null
) {
  const matchingVariants = variants.filter((variant) =>
    variantMatchesFilters(variant, {
      size: targetKey === "size" ? DEFAULT_FILTERS.size : filters.size,
      flavour: targetKey === "flavour" ? DEFAULT_FILTERS.flavour : filters.flavour,
      servings: targetKey === "servings" ? DEFAULT_FILTERS.servings : filters.servings,
      price: targetKey === "price" ? DEFAULT_FILTERS.price : filters.price,
      pricePer100g:
        targetKey === "pricePer100g" ? DEFAULT_FILTERS.pricePer100g : filters.pricePer100g,
      protein: targetKey === "protein" ? DEFAULT_FILTERS.protein : filters.protein,
    })
  );

  return Array.from(
    new Set(
      matchingVariants
        .map(valueGetter)
        .filter((value): value is string => Boolean(value))
    )
  );
}

function sanitizeFilters(variants: Product[], filters: ColumnFilters) {
  let nextFilters = { ...filters };

  for (const key of FILTER_KEYS) {
    const options = getFilterOptionsForFilters(variants, nextFilters);
    const validOptions = mapOptionsForKey(options, key);
    if (
      nextFilters[key] !== "all" &&
      !nextFilters[key].startsWith(RANGE_PREFIX) &&
      !validOptions.includes(nextFilters[key])
    ) {
      nextFilters = { ...nextFilters, [key]: "all" };
    }
  }

  return nextFilters;
}

function mapOptionsForKey(options: ColumnFilterOptions, key: keyof ColumnFilters) {
  switch (key) {
    case "size":
      return options.sizes;
    case "flavour":
      return options.flavours;
    case "servings":
      return options.servings;
    case "price":
      return options.prices;
    case "pricePer100g":
      return options.pricePer100gs;
    case "protein":
      return options.proteins;
  }
}

function variantMatchesFilters(variant: Product, filters: ColumnFilters) {
  if (filters.flavour !== "all" && (variant.flavour ?? "") !== filters.flavour) return false;
  if (filters.size !== "all" && variant.size !== filters.size) return false;
  if (!matchesNumericFilter(variant.servings, filters.servings)) return false;
  if (!matchesNumericFilter(variant.price, filters.price, 2)) return false;
  if (!matchesNumericFilter(variant.pricePer100g, filters.pricePer100g, 2)) return false;
  if (!matchesNumericFilter(variant.proteinPer100g, filters.protein)) return false;
  return true;
}

function matchesNumericFilter(
  value: number | null,
  filter: string,
  fixedDigits?: number
) {
  if (filter === "all") return true;
  if (filter.startsWith(RANGE_PREFIX)) {
    return matchesRange(value, filter);
  }
  if (value === null) return false;
  return fixedDigits !== undefined ? value.toFixed(fixedDigits) === filter : String(value) === filter;
}
