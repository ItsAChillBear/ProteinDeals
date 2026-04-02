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


export default function PriceComparisonTable({ products }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("pricePer100g");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [selectedFlavours, setSelectedFlavours] = useState<Record<string, string>>({});
  const [filters, setFilters] = useState<ColumnFilters>({
    size: "all",
    flavour: "all",
    servings: "all",
    price: "all",
    pricePer100g: "all",
    protein: "all",
  });

  const groups = useMemo(() => groupProducts(products), [products]);

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

  const filterOptions = useMemo<ColumnFilterOptions>(() => {
    const allVariants = groups.flatMap((g) => g.variants);

    const sizes = Array.from(new Set(allVariants.map((v) => v.size))).sort();
    const flavours = Array.from(
      new Set(allVariants.map((v) => v.flavour ?? "").filter(Boolean))
    ).sort();

    const servingsDiscrete = Array.from(new Set(allVariants.map((v) => v.servings).filter((s): s is number => s !== null))).sort((a, b) => a - b).map(String);
    const priceDiscrete = Array.from(new Set(allVariants.map((v) => v.price.toFixed(2)))).sort((a, b) => Number(a) - Number(b));
    const per100gDiscrete = Array.from(new Set(allVariants.map((v) => v.pricePer100g.toFixed(2)))).sort((a, b) => Number(a) - Number(b));
    const proteinDiscrete = Array.from(new Set(allVariants.map((v) => v.proteinPer100g).filter((p): p is number => p !== null))).sort((a, b) => a - b).map(String);

    return {
      sizes,
      flavours,
      servings: servingsDiscrete,
      prices: priceDiscrete,
      pricePer100gs: per100gDiscrete,
      proteins: proteinDiscrete,
    };
  }, [groups]);

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
    setFilters((current) => ({ ...current, [key]: value }));
  }

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
        <p className="text-xs text-gray-600">
          Sorted by: {sortKey === "pricePer100g" ? "Price / 100g" : sortKey}
        </p>
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
