"use client";

import { startTransition, useDeferredValue, useEffect, useMemo, useState } from "react";
import PriceComparisonDesktopTable from "./PriceComparisonDesktopTable";
import PriceComparisonMobileList from "./PriceComparisonMobileList";
import PriceComparisonPlanner from "./PriceComparisonPlanner";
import PriceComparisonToolbar from "./PriceComparisonToolbar";
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
import { applyPriceMode, getPricePerGramProtein, getPricePerServing, type PriceMode } from "./price-comparison-metrics";
import {
  countMatchingVariantsForGroup,
  DEFAULT_PROTEIN_PLANNER,
  plannerMatchesVariant,
  type ProteinPlannerState,
} from "./price-comparison-planner";
import { getDefaultVariant, groupProducts, sortGroups } from "./price-comparison-table.utils";
import { DEFAULT_VISIBILITY, type ColumnVisibility } from "./price-comparison-visibility";

interface Props {
  products: Product[];
  priceMode?: PriceMode;
  onPriceModeChange?: (mode: PriceMode) => void;
}

export type { Product } from "./price-comparison-table.types";

export default function PriceComparisonTable({
  products,
  priceMode: controlledPriceMode,
  onPriceModeChange,
}: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("pricePer100g");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [filters, setFilters] = useState<ColumnFilters>(DEFAULT_FILTERS);
  const [planner, setPlanner] = useState<ProteinPlannerState>(DEFAULT_PROTEIN_PLANNER);
  const [visibility, setVisibility] = useState<ColumnVisibility>(DEFAULT_VISIBILITY);
  const [viewMode, setViewMode] = useState<"card" | "table">("card");
  const [columnGroupMode, setColumnGroupMode] = useState<"nutrient" | "measure">("nutrient");
  const [priceMode, setPriceMode] = useState<PriceMode>(controlledPriceMode ?? "single");
  const activeFilters = useDeferredValue(filters);

  useEffect(() => {
    if (controlledPriceMode) {
      setPriceMode(controlledPriceMode);
    }
  }, [controlledPriceMode]);

  const groups = useMemo(() => groupProducts(products), [products]);
  const allVariants = useMemo(() => groups.flatMap((group) => group.variants), [groups]);
  const groupedWithSelection = useMemo<ProductGroupWithSelection[]>(() => groups.map((group) => ({ ...group, selected: getDefaultVariant(group) })), [groups]);
  const sorted = useMemo(() => sortGroups(groupedWithSelection, sortKey, sortDir, planner), [groupedWithSelection, sortDir, sortKey, planner]);
  const visibleVariants = useMemo(() => getVisibleVariants(groupedWithSelection), [groupedWithSelection]);
  const filterOptions = useMemo<ColumnFilterOptions>(() => getFilterOptionsForFilters(visibleVariants, allVariants, activeFilters), [activeFilters, allVariants, visibleVariants]);
  const filteredGroups = useMemo(() => sorted.filter((group) => countMatchingVariantsForGroup(group, activeFilters, planner) > 0), [activeFilters, planner, sorted]);
  const filteredVariantCount = useMemo(() => filteredGroups.reduce((count, group) => count + countMatchingVariantsForGroup(group, activeFilters, planner), 0), [activeFilters, filteredGroups, planner]);

  const bestValueVariantIds = useMemo(() => {
    const metrics = ["pricePer100g", "pricePerServing", "pricePerGramProtein"] as const;
    const inStockFilteredVariants = filteredGroups.flatMap((group) =>
      group.variants.filter((variant) => variant.inStock && variantMatchesFilters(variant, activeFilters) && plannerMatchesVariant(variant, planner))
        .map((v) => applyPriceMode(v, priceMode))
    );

    const result: Record<string, string | null> = {};
    for (const metric of metrics) {
      const min = inStockFilteredVariants.reduce<number | null>((best, variant) => {
        const value = getBestValueAmount(variant, metric);
        if (value === null) return best;
        return best === null || value < best ? value : best;
      }, null);
      if (min === null) {
        result[metric] = null;
        continue;
      }

      let found: string | null = null;
      outer: for (const group of filteredGroups) {
        for (const variant of group.variants) {
          if (!variant.inStock) continue;
          if (!variantMatchesFilters(variant, activeFilters) || !plannerMatchesVariant(variant, planner)) continue;
          if (getBestValueAmount(applyPriceMode(variant, priceMode), metric) === min) {
            found = variant.id;
            break outer;
          }
        }
      }
      result[metric] = found;
    }
    return result;
  }, [activeFilters, filteredGroups, planner, priceMode]);

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
    startTransition(() => {
      setFilters((current) => sanitizeFilters(allVariants, { ...current, [key]: value }));
    });
  }

  function updatePlanner(patch: Partial<ProteinPlannerState>) {
    setPlanner((current) => ({ ...current, ...patch }));
  }

  function updatePriceMode(mode: React.SetStateAction<PriceMode>) {
    setPriceMode((current) => {
      const next = typeof mode === "function" ? mode(current) : mode;
      onPriceModeChange?.(next);
      return next;
    });
  }

  function resetAll() {
    setFilters(DEFAULT_FILTERS);
    setVisibility(DEFAULT_VISIBILITY);
    setSortKey("pricePer100g");
    setSortDir("asc");
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
      <PriceComparisonPlanner value={planner} onChange={updatePlanner} onReset={() => setPlanner(DEFAULT_PROTEIN_PLANNER)} />
      <PriceComparisonToolbar
        filters={filters}
        filterOptions={filterOptions}
        onFilter={setFilter}
        visibility={visibility}
        setVisibility={setVisibility}
        sortKey={sortKey}
        setSortKey={setSortKey}
        setSortDir={setSortDir}
        handleSort={handleSort}
        viewMode={viewMode}
        setViewMode={setViewMode}
        columnGroupMode={columnGroupMode}
        setColumnGroupMode={setColumnGroupMode}
        priceMode={priceMode}
        setPriceMode={updatePriceMode}
        filteredGroupsLength={filteredGroups.length}
        filteredVariantCount={filteredVariantCount}
        resetAll={resetAll}
      />
      <PriceComparisonDesktopTable
        groups={filteredGroups}
        expandedRows={expandedRows}
        bestValueVariantIds={bestValueVariantIds}
        onSort={handleSort}
        onToggleExpanded={toggleExpanded}
        sortDir={sortDir}
        sortKey={sortKey}
        filters={filters}
        activeFilters={activeFilters}
        planner={planner}
        filterOptions={filterOptions}
        onFilter={setFilter}
        visibility={visibility}
        viewMode={viewMode}
        columnGroupMode={columnGroupMode}
        priceMode={priceMode}
      />
      <PriceComparisonMobileList groups={filteredGroups} expandedRows={expandedRows} bestValueVariantIds={bestValueVariantIds} planner={planner} onToggleExpanded={toggleExpanded} priceMode={priceMode} />
    </div>
  );
}

function getBestValueAmount(product: Product, sortKey: SortKey) {
  if (sortKey === "pricePerServing") return getPricePerServing(product);
  if (sortKey === "pricePerGramProtein") return getPricePerGramProtein(product);
  return product.pricePer100g;
}
