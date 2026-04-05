"use client";

import { useEffect, useMemo, useState } from "react";
import PriceComparisonDesktopTable from "./PriceComparisonDesktopTable";
import PriceComparisonMobileList from "./PriceComparisonMobileList";
import PriceComparisonPlanner from "./PriceComparisonPlanner";
import PriceComparisonToolbar from "./PriceComparisonToolbar";
import {
  buildMultiFilter,
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
import { applyPriceMode, getCaloriesPerGramProtein, getCaloriesPerServing, getPricePerGramProtein, getPricePerServing, type PriceMode } from "./price-comparison-metrics";
import { getCaloriesPer100g } from "./price-comparison-nutrition";
import {
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
  const [flavourMode, setFlavourMode] = useState<"separate" | "consolidate">("consolidate");
  const [priceMode, setPriceMode] = useState<PriceMode>(controlledPriceMode ?? "single");
  const [servingMetric, setServingMetric] = useState<"price" | "calories">("price");
  const [activeColumn, setActiveColumn] = useState<"pricePerServing" | "pricePer100g" | "pricePerGramProtein">("pricePer100g");
  const [defaultsInitialized, setDefaultsInitialized] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const activeFilters = filters;
  const optionFilters = useMemo(
    () => ({
      ...activeFilters,
      search: DEFAULT_FILTERS.search,
    }),
    [
      activeFilters.size,
      activeFilters.flavour,
      activeFilters.retailer,
      activeFilters.category,
      activeFilters.subcategory,
      activeFilters.product,
      activeFilters.servings,
      activeFilters.pricePerServing,
      activeFilters.price,
      activeFilters.pricePer100g,
      activeFilters.protein,
      activeFilters.pricePerGramProtein,
      activeFilters.caloriesPer100g,
      activeFilters.caloriesPerGramProtein,
      activeFilters.caloriesPerServing,
      activeFilters.proteinPerServing,
    ]
  );

  useEffect(() => {
    if (controlledPriceMode) {
      setPriceMode(controlledPriceMode);
    }
  }, [controlledPriceMode]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 639px)");
    const updateViewport = () => setIsMobileViewport(mediaQuery.matches);

    updateViewport();
    mediaQuery.addEventListener("change", updateViewport);
    return () => mediaQuery.removeEventListener("change", updateViewport);
  }, []);

  const groups = useMemo(() => groupProducts(products), [products]);
  const allVariants = useMemo(() => groups.flatMap((group) => group.variants), [groups]);
  const groupedWithSelection = useMemo<ProductGroupWithSelection[]>(() => groups.map((group) => ({ ...group, selected: getDefaultVariant(group) })), [groups]);
  const sorted = useMemo(() => sortGroups(groupedWithSelection, sortKey, sortDir, planner), [groupedWithSelection, sortDir, sortKey, planner]);
  const visibleVariants = useMemo(() => getVisibleVariants(groupedWithSelection), [groupedWithSelection]);
  const filterOptions = useMemo<ColumnFilterOptions>(
    () => getFilterOptionsForFilters(visibleVariants, allVariants, optionFilters),
    [allVariants, optionFilters, visibleVariants]
  );

  const matchedGroups = useMemo(
    () =>
      sorted
        .map((group) => {
          const matchingVariants = group.variants.filter(
            (variant) =>
              variantMatchesFilters(variant, activeFilters) &&
              plannerMatchesVariant(variant, planner)
          );

          if (matchingVariants.length === 0) return null;
          return { group, matchingVariants };
        })
        .filter(
          (
            entry
          ): entry is {
            group: ProductGroupWithSelection;
            matchingVariants: Product[];
          } => entry !== null
        ),
    [activeFilters, planner, sorted]
  );

  useEffect(() => {
    if (defaultsInitialized || filterOptions.retailers.length === 0) return;
    setFilters((f) => ({
      ...f,
      retailer: buildMultiFilter(filterOptions.retailers),
      product: buildMultiFilter(filterOptions.products),
      flavour: DEFAULT_FILTERS.flavour,
    }));
    setDefaultsInitialized(true);
  }, [filterOptions, defaultsInitialized]);
  const filteredGroups = useMemo(
    () => matchedGroups.map((entry) => entry.group),
    [matchedGroups]
  );
  const filteredVariantCount = useMemo(
    () => matchedGroups.reduce((count, entry) => count + entry.matchingVariants.length, 0),
    [matchedGroups]
  );

  const bestValueVariantIds = useMemo(() => {
    const metrics = ["pricePer100g", "pricePerServing", "pricePerGramProtein"] as const;
    const inStockFilteredVariants = matchedGroups.flatMap((entry) =>
      entry.matchingVariants
        .filter((variant) => variant.inStock)
        .map((variant) => applyPriceMode(variant, priceMode))
    );

    const result: Record<string, string[]> = {};
    for (const metric of metrics) {
      const min = inStockFilteredVariants.reduce<number | null>((best, variant) => {
        const value = getBestValueAmount(variant, metric);
        if (value === null) return best;
        return best === null || value < best ? value : best;
      }, null);
      if (min === null) { result[metric] = []; continue; }

      const found: string[] = [];
      for (const entry of matchedGroups) {
        for (const variant of entry.matchingVariants) {
          if (!variant.inStock) continue;
          if (getBestValueAmount(applyPriceMode(variant, priceMode), metric) === min) found.push(variant.id);
        }
      }
      result[metric] = found;
    }
    return result;
  }, [matchedGroups, priceMode]);

  const calorieVariantIds = useMemo(() => {
    if (servingMetric !== "calories") return { lowest: [] as string[], highest: [] as string[] };
    const getCalVal = (variant: Product): number | null => {
      if (activeColumn === "pricePerServing") return getCaloriesPerServing(variant);
      if (activeColumn === "pricePerGramProtein") return getCaloriesPerGramProtein(variant);
      return getCaloriesPer100g(variant);
    };
    const inStockFilteredVariants = matchedGroups.flatMap((entry) =>
      entry.matchingVariants.filter((variant) => variant.inStock)
    );
    let minVal: number | null = null;
    let maxVal: number | null = null;
    for (const v of inStockFilteredVariants) {
      const val = getCalVal(v);
      if (val === null) continue;
      if (minVal === null || val < minVal) minVal = val;
      if (maxVal === null || val > maxVal) maxVal = val;
    }
    const lowest: string[] = [];
    const highest: string[] = [];
    for (const entry of matchedGroups) {
      for (const variant of entry.matchingVariants) {
        if (!variant.inStock) continue;
        const val = getCalVal(variant);
        if (minVal !== null && val === minVal) lowest.push(variant.id);
        if (maxVal !== null && val === maxVal) highest.push(variant.id);
      }
    }
    return { lowest, highest };
  }, [servingMetric, activeColumn, matchedGroups]);

  function handleSort(key: SortKey, groupId?: string, viewportTop?: number, sourceElement?: HTMLElement | null) {
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
    if (key === "search") {
      setFilters((current) => ({ ...current, search: value }));
      return;
    }
    setFilters((current) => sanitizeFilters(allVariants, { ...current, [key]: value }));
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
    setFilters({
      ...DEFAULT_FILTERS,
      retailer: buildMultiFilter(filterOptions.retailers),
      product: buildMultiFilter(filterOptions.products),
      flavour: DEFAULT_FILTERS.flavour,
    });
    setVisibility(DEFAULT_VISIBILITY);
    setSortKey("pricePer100g");
    setSortDir("asc");
  }

  const hasActiveFilters = FILTER_KEYS.some((key) => filters[key] !== DEFAULT_FILTERS[key]);

  if (products.length === 0) {
    return (
      <div className="rounded-2xl border border-theme bg-surface p-12 text-center">
        <p className="text-theme-3">No products match the current filters.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-theme bg-surface">
      <PriceComparisonPlanner value={planner} onChange={updatePlanner} onReset={() => setPlanner(DEFAULT_PROTEIN_PLANNER)} />
      <PriceComparisonToolbar
        filters={filters}
        filterOptions={filterOptions}
        onFilter={setFilter}
        onSearchChange={(value) => setFilter("search", value)}
        visibility={visibility}
        setVisibility={setVisibility}
        setSortKey={setSortKey}
        setSortDir={setSortDir}
        viewMode={viewMode}
        setViewMode={setViewMode}
        columnGroupMode={columnGroupMode}
        setColumnGroupMode={setColumnGroupMode}
        priceMode={priceMode}
        setPriceMode={updatePriceMode}
        filteredGroupsLength={filteredGroups.length}
        filteredVariantCount={filteredVariantCount}
        resetAll={resetAll}
        flavourMode={flavourMode}
        setFlavourMode={setFlavourMode}
      />
      {isMobileViewport ? (
        <PriceComparisonMobileList
          groups={filteredGroups}
          expandedRows={expandedRows}
          bestValueVariantIds={bestValueVariantIds}
          calorieMode={servingMetric === "calories"}
          calorieVariantIds={calorieVariantIds}
          planner={planner}
          onToggleExpanded={toggleExpanded}
          priceMode={priceMode}
        />
      ) : (
        <PriceComparisonDesktopTable
          groups={filteredGroups}
          expandedRows={expandedRows}
          bestValueVariantIds={bestValueVariantIds}
          calorieMode={servingMetric === "calories"}
          calorieVariantIds={calorieVariantIds}
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
          flavourMode={flavourMode}
        />
      )}
    </div>
  );
}

function getBestValueAmount(product: Product, sortKey: SortKey) {
  if (sortKey === "pricePerServing") return getPricePerServing(product);
  if (sortKey === "pricePerGramProtein") return getPricePerGramProtein(product);
  return product.pricePer100g;
}
