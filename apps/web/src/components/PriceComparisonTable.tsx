"use client";

import { useMemo, useState } from "react";
import PriceComparisonDesktopTable from "./PriceComparisonDesktopTable";
import { PriceComparisonFilterDropdown } from "./PriceComparisonFilterDropdown";
import PriceComparisonMobileList from "./PriceComparisonMobileList";
import PriceComparisonPlanner from "./PriceComparisonPlanner";
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
  countMatchingVariantsForGroup,
  DEFAULT_PROTEIN_PLANNER,
  plannerMatchesVariant,
  type ProteinPlannerState,
} from "./price-comparison-planner";
import {
  getDefaultVariant,
  groupProducts,
  sortGroups,
} from "./price-comparison-table.utils";
import { DEFAULT_VISIBILITY, type ColumnVisibility } from "./price-comparison-visibility";

interface Props {
  products: Product[];
}

export type { Product } from "./price-comparison-table.types";

export default function PriceComparisonTable({ products }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("pricePer100g");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [filters, setFilters] = useState<ColumnFilters>(DEFAULT_FILTERS);
  const [planner, setPlanner] = useState<ProteinPlannerState>(DEFAULT_PROTEIN_PLANNER);
  const [visibility, setVisibility] = useState<ColumnVisibility>(DEFAULT_VISIBILITY);
  const [viewMode, setViewMode] = useState<"card" | "table">("card");

  const groups = useMemo(() => groupProducts(products), [products]);
  const allVariants = useMemo(() => groups.flatMap((group) => group.variants), [groups]);

  const groupedWithSelection = useMemo<ProductGroupWithSelection[]>(() => {
    return groups.map((group) => {
      const selected = getDefaultVariant(group);
      return { ...group, selected };
    });
  }, [groups]);

  const sorted = useMemo(
    () => sortGroups(groupedWithSelection, sortKey, sortDir, planner),
    [groupedWithSelection, sortDir, sortKey, planner]
  );

  const visibleVariants = useMemo(() => getVisibleVariants(groupedWithSelection), [groupedWithSelection]);

  const filterOptions = useMemo<ColumnFilterOptions>(
    () => getFilterOptionsForFilters(visibleVariants, allVariants, filters),
    [allVariants, filters, visibleVariants]
  );

  const filteredGroups = useMemo(
    () =>
      sorted.filter((group) => countMatchingVariantsForGroup(group, filters, planner) > 0),
    [filters, planner, sorted]
  );

  const filteredVariantCount = useMemo(
    () =>
      filteredGroups.reduce(
        (count, group) => count + countMatchingVariantsForGroup(group, filters, planner),
        0
      ),
    [filteredGroups, filters, planner]
  );

  const bestValueMetric = useMemo(() => {
    return sortKey === "pricePerServing" || sortKey === "pricePerGramProtein"
      ? sortKey
      : "pricePer100g";
  }, [sortKey]);

  const bestValueAmount = useMemo(() => {
    const inStockFilteredVariants = filteredGroups.flatMap((group) =>
      group.variants.filter((variant) => {
        if (!variant.inStock) return false;
        return variantMatchesFilters(variant, filters) && plannerMatchesVariant(variant, planner);
      })
    );

    const metricValues = inStockFilteredVariants
      .map((variant) => getBestValueAmount(variant, bestValueMetric))
      .filter((value): value is number => value !== null);

    return metricValues.length ? Math.min(...metricValues) : null;
  }, [bestValueMetric, filteredGroups, filters, planner]);

  const bestValueVariantId = useMemo(() => {
    if (bestValueAmount === null) return null;

    for (const group of filteredGroups) {
      const visibleGroupVariants = group.variants.filter((variant) =>
        variantMatchesFilters(variant, filters) && plannerMatchesVariant(variant, planner)
      );

      const match = visibleGroupVariants.find(
        (variant) =>
          variant.inStock && getBestValueAmount(variant, bestValueMetric) === bestValueAmount
      );
      if (match) return match.id;
    }

    return null;
  }, [bestValueAmount, bestValueMetric, filteredGroups, filters, planner]);

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

  function updatePlanner(patch: Partial<ProteinPlannerState>) {
    setPlanner((current) => ({ ...current, ...patch }));
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
      <PriceComparisonPlanner
        value={planner}
        onChange={updatePlanner}
        onReset={() => setPlanner(DEFAULT_PROTEIN_PLANNER)}
      />
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-800 px-6 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <PriceComparisonFilterDropdown value={filters.retailer} options={filterOptions.retailers} onChange={(v) => setFilter("retailer", v)} multi label="Supplier" />
          <PriceComparisonFilterDropdown value={filters.product} options={filterOptions.products} onChange={(v) => setFilter("product", v)} multi label="Product" />
          <PriceComparisonFilterDropdown value={filters.flavour} options={filterOptions.flavours} onChange={(v) => setFilter("flavour", v)} multi label="Flavour" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-600">Show:</span>
          {(
            [
              { key: "showServing", label: "/Serving" },
              { key: "show100g",    label: "/100g" },
              { key: "show1gProtein", label: "/1g Protein" },
              { key: "showTotal",   label: "Total Price" },
            ] as { key: keyof ColumnVisibility; label: string }[]
          ).map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setVisibility((v) => ({ ...v, [key]: !v[key] }))}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                visibility[key]
                  ? "bg-gray-700 text-gray-200 hover:bg-gray-600"
                  : "bg-gray-800/50 text-gray-600 line-through hover:text-gray-400"
              }`}
            >
              {label}
            </button>
          ))}
          <span className="mx-1 h-4 w-px bg-gray-700" />
          <div className="flex rounded-md border border-gray-700 overflow-hidden text-xs font-medium">
            <button
              type="button"
              onClick={() => setViewMode("card")}
              className={`px-2.5 py-1 transition ${viewMode === "card" ? "bg-gray-700 text-white" : "text-gray-500 hover:text-gray-300"}`}
            >
              Cards
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`px-2.5 py-1 transition border-l border-gray-700 ${viewMode === "table" ? "bg-gray-700 text-white" : "text-gray-500 hover:text-gray-300"}`}
            >
              Table
            </button>
          </div>
          <p className="text-sm text-gray-400">
            <span className="font-semibold text-white">{filteredGroups.length}</span> products,{" "}
            <span className="font-semibold text-white">{filteredVariantCount}</span> variants
          </p>
          <span className="mx-1 h-4 w-px bg-gray-700" />
          <button
            type="button"
            onClick={() => {
              resetFilters();
              setVisibility(DEFAULT_VISIBILITY);
              setSortKey("pricePer100g");
              setSortDir("asc");
            }}
            className="rounded-md px-2.5 py-1 text-xs font-medium text-gray-400 transition hover:text-gray-200"
          >
            Reset All
          </button>
          <span className="text-xs text-gray-600">Sorted by: {sortLabel}</span>
        </div>
      </div>

      <PriceComparisonDesktopTable
        groups={filteredGroups}
        expandedRows={expandedRows}
        bestValueVariantId={bestValueVariantId}
        onSort={handleSort}
        onToggleExpanded={toggleExpanded}
        sortDir={sortDir}
        sortKey={sortKey}
        filters={filters}
        planner={planner}
        filterOptions={filterOptions}
        onFilter={setFilter}
        visibility={visibility}
        viewMode={viewMode}
      />

      <PriceComparisonMobileList
        groups={filteredGroups}
        expandedRows={expandedRows}
        bestValueVariantId={bestValueVariantId}
        planner={planner}
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
