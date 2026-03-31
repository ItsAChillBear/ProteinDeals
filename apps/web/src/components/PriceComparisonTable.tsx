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

export default function PriceComparisonTable({ products }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("pricePer100g");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [selectedFlavours, setSelectedFlavours] = useState<Record<string, string>>({});

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

      return {
        ...group,
        selected,
      };
    });
  }, [groups, selectedFlavours]);

  const sorted = useMemo(
    () => sortGroups(groupedWithSelection, sortKey, sortDir),
    [groupedWithSelection, sortDir, sortKey]
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
    setExpandedRows((current) => ({
      ...current,
      [groupId]: !current[groupId],
    }));
  }

  function selectFlavour(group: ProductGroupWithSelection, flavour: string) {
    setSelectedFlavours((current) => ({
      ...current,
      [group.id]: flavour,
    }));
  }

  if (products.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-800 bg-gray-900 p-12 text-center">
        <p className="text-gray-400">No products match the current filters.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-800 bg-gray-900">
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
