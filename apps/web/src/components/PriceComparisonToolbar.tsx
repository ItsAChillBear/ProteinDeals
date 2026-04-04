"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import { PriceComparisonFilterDropdown } from "./PriceComparisonFilterDropdown";
import type { ColumnFilters, ColumnFilterOptions } from "./price-comparison-filters";
import type { SortKey } from "./price-comparison-table.types";
import { DEFAULT_VISIBILITY, type ColumnVisibility } from "./price-comparison-visibility";
import type { PriceMode } from "./price-comparison-metrics";

interface Props {
  filters: ColumnFilters;
  filterOptions: ColumnFilterOptions;
  onFilter: (key: keyof ColumnFilters, value: string) => void;
  visibility: ColumnVisibility;
  setVisibility: React.Dispatch<React.SetStateAction<ColumnVisibility>>;
  sortKey: SortKey;
  sortDir: "asc" | "desc";
  setSortKey: React.Dispatch<React.SetStateAction<SortKey>>;
  setSortDir: React.Dispatch<React.SetStateAction<"asc" | "desc">>;
  handleSort: (key: SortKey) => void;
  viewMode: "card" | "table";
  setViewMode: React.Dispatch<React.SetStateAction<"card" | "table">>;
  columnGroupMode: "nutrient" | "measure";
  setColumnGroupMode: React.Dispatch<React.SetStateAction<"nutrient" | "measure">>;
  priceMode: PriceMode;
  setPriceMode: React.Dispatch<React.SetStateAction<PriceMode>>;
  filteredGroupsLength: number;
  filteredVariantCount: number;
  resetAll: () => void;
  servingMetric: "price" | "calories";
  setServingMetric: React.Dispatch<React.SetStateAction<"price" | "calories">>;
  activeColumn: "pricePerServing" | "pricePer100g" | "pricePerGramProtein";
  setActiveColumn: React.Dispatch<React.SetStateAction<"pricePerServing" | "pricePer100g" | "pricePerGramProtein">>;
}

const SORT_BUTTONS: { key: SortKey; label: string; visKey: keyof ColumnVisibility }[] = [
  { key: "pricePer100g", label: "/100g", visKey: "show100g" },
  { key: "pricePerGramProtein", label: "/1g Protein", visKey: "show1gProtein" },
];

const VISIBILITY_BUTTONS: { key: keyof ColumnVisibility; label: string }[] = [
  { key: "showServing", label: "/Serving" },
  { key: "show100g", label: "/100g" },
  { key: "show1gProtein", label: "/1g Protein" },
  { key: "showTotal", label: "Total Price" },
];

export default function PriceComparisonToolbar({
  filters,
  filterOptions,
  onFilter,
  visibility,
  setVisibility,
  sortKey,
  sortDir,
  setSortKey,
  setSortDir,
  handleSort,
  viewMode,
  setViewMode,
  columnGroupMode,
  setColumnGroupMode,
  priceMode,
  setPriceMode,
  filteredGroupsLength,
  filteredVariantCount,
  resetAll,
  servingMetric,
  setServingMetric,
  activeColumn,
  setActiveColumn,
}: Props) {

  const caloriesKeyForColumn: Record<typeof activeColumn, SortKey> = {
    pricePerServing: "caloriesPerServing",
    pricePer100g: "caloriesPer100g",
    pricePerGramProtein: "caloriesPerGramProtein",
  };
  const activeCaloriesSortKey = caloriesKeyForColumn[activeColumn];
  const activeColumnEnabled =
    activeColumn === "pricePerServing" ? visibility.showServing :
    activeColumn === "pricePer100g" ? visibility.show100g :
    visibility.show1gProtein;
  const servingEnabled = visibility.showServing;

  function handleColumnSort(col: typeof activeColumn) {
    setActiveColumn(col);
    if (servingMetric === "price") {
      handleSort(col);
    } else {
      setSortKey(caloriesKeyForColumn[col]);
    }
  }

  function handleServingMetricToggle(metric: "price" | "calories") {
    if (metric === servingMetric) return;
    setServingMetric(metric);
    if (metric === "price") {
      handleSort(activeColumn);
    } else {
      setSortKey(activeCaloriesSortKey);
      setSortDir("asc");
    }
  }

  return (
    <div className="border-b border-theme px-6 py-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border border-theme-2 overflow-hidden text-xs font-medium">
            <button type="button" onClick={() => setPriceMode("single")} className={`px-2.5 py-1 transition ${priceMode === "single" ? "bg-green-700/60 text-green-200" : "text-theme-3 hover:text-theme"}`}>Single</button>
            <button type="button" onClick={() => setPriceMode("subscription")} className={`px-2.5 py-1 transition border-l border-theme-2 ${priceMode === "subscription" ? "bg-green-700/60 text-green-200" : "text-theme-3 hover:text-theme"}`}>Subscribe</button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-theme-3"><span className="font-semibold text-theme">{filteredGroupsLength}</span> products, <span className="font-semibold text-theme">{filteredVariantCount}</span> variants</span>
          <div className="flex rounded-md border border-theme-2 overflow-hidden text-xs font-medium">
            <button type="button" onClick={() => setViewMode("card")} className={`px-2.5 py-1 transition ${viewMode === "card" ? "bg-green-700/60 text-green-200" : "text-theme-3 hover:text-theme"}`}>Cards</button>
            <button type="button" onClick={() => setViewMode("table")} className={`px-2.5 py-1 transition border-l border-theme-2 ${viewMode === "table" ? "bg-green-700/60 text-green-200" : "text-theme-3 hover:text-theme"}`}>Table</button>
          </div>
          {viewMode === "table" ? (
            <div className="flex rounded-md border border-theme-2 overflow-hidden text-xs font-medium">
              <button type="button" onClick={() => setColumnGroupMode("nutrient")} className={`px-2.5 py-1 transition ${columnGroupMode === "nutrient" ? "bg-green-700/60 text-green-200" : "text-theme-3 hover:text-theme"}`}>Protein / Calories / Price</button>
              <button type="button" onClick={() => setColumnGroupMode("measure")} className={`px-2.5 py-1 transition border-l border-theme-2 ${columnGroupMode === "measure" ? "bg-green-700/60 text-green-200" : "text-theme-3 hover:text-theme"}`}>/Serving / /100g / /1g Protein</button>
            </div>
          ) : null}
          <button type="button" onClick={resetAll} className="rounded-md px-2.5 py-1 text-xs font-medium text-theme-3 transition hover:text-theme">Reset All</button>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <PriceComparisonFilterDropdown value={filters.retailer} options={filterOptions.retailers} onChange={(v) => onFilter("retailer", v)} multi label="Supplier" />
        <PriceComparisonFilterDropdown value={filters.category} options={filterOptions.categories} onChange={(v) => onFilter("category", v)} multi label="Category" />
        <PriceComparisonFilterDropdown value={filters.product} options={filterOptions.products} onChange={(v) => onFilter("product", v)} multi label="Product" />
        <PriceComparisonFilterDropdown value={filters.flavour} options={filterOptions.flavours} onChange={(v) => onFilter("flavour", v)} multi label="Flavour" />
        <span className="mx-1 h-4 w-px bg-theme-2" />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-theme-4">Sort by:</span>
        <div className="flex items-center gap-1">
          <div className="flex rounded-md border border-theme-2 overflow-hidden text-xs font-medium">
            <button type="button" onClick={() => handleServingMetricToggle("price")} className={`px-2.5 py-1 transition ${servingMetric === "price" ? "bg-green-700/60 text-green-200" : "text-theme-3 hover:text-theme"}`}>£</button>
            <button type="button" onClick={() => handleServingMetricToggle("calories")} className={`px-2.5 py-1 transition border-l border-theme-2 ${servingMetric === "calories" ? "bg-green-700/60 text-green-200" : "text-theme-3 hover:text-theme"}`}>kcal</button>
            <button
              type="button"
              onClick={() => { setServingMetric("calories"); setSortKey(activeCaloriesSortKey); setSortDir("asc"); }}
              disabled={!activeColumnEnabled}
              className={`px-1.5 py-1 transition border-l border-theme-2 ${servingMetric === "calories" && sortDir === "asc" ? "bg-green-700/60 text-green-200" : "text-theme-3 hover:text-theme"}`}
            >
              <ArrowUp className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={() => { setServingMetric("calories"); setSortKey(activeCaloriesSortKey); setSortDir("desc"); }}
              disabled={!activeColumnEnabled}
              className={`px-1.5 py-1 transition border-l border-theme-2 ${servingMetric === "calories" && sortDir === "desc" ? "bg-green-700/60 text-green-200" : "text-theme-3 hover:text-theme"}`}
            >
              <ArrowDown className="h-3 w-3" />
            </button>
          </div>
          <button
            type="button"
            onClick={() => { if (servingEnabled) handleColumnSort("pricePerServing"); }}
            disabled={!servingEnabled}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
              !servingEnabled
                ? "cursor-not-allowed bg-surface-2 text-theme-muted"
                : activeColumn === "pricePerServing"
                  ? "bg-green-700/60 text-green-200"
                  : "bg-surface-2 text-theme-3 hover:text-theme"
            }`}
          >
            /Serving
          </button>
        </div>
        {SORT_BUTTONS.map(({ key, label, visKey }) => {
          const enabled = visibility[visKey];
          return (
            <button
              key={key}
              type="button"
              onClick={() => { if (enabled) handleColumnSort(key as typeof activeColumn); }}
              disabled={!enabled}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                !enabled
                  ? "cursor-not-allowed bg-surface-2 text-theme-muted"
                  : activeColumn === key
                    ? "bg-green-700/60 text-green-200"
                    : "bg-surface-2 text-theme-3 hover:text-theme"
              }`}
            >
              {label}
            </button>
          );
        })}
        <span className="mx-1 h-4 w-px bg-theme-2" />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-theme-4">Show:</span>
        {VISIBILITY_BUTTONS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              setVisibility((current) => {
                const next = { ...current, [key]: !current[key] };
                if (!next.showServing && activeColumn === "pricePerServing") {
                  setActiveColumn("pricePer100g");
                  setSortKey(servingMetric === "price" ? "pricePer100g" : "caloriesPer100g");
                  setSortDir("asc");
                }
                if (!next.show100g && activeColumn === "pricePer100g") {
                  setActiveColumn("pricePerServing");
                  setSortKey(servingMetric === "price" ? "pricePerServing" : "caloriesPerServing");
                  setSortDir("asc");
                }
                if (!next.show1gProtein && activeColumn === "pricePerGramProtein") {
                  setActiveColumn("pricePer100g");
                  setSortKey(servingMetric === "price" ? "pricePer100g" : "caloriesPer100g");
                  setSortDir("asc");
                }
                return next;
              });
            }}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
              visibility[key]
                ? "bg-green-700/60 text-green-200 hover:bg-green-700/80"
                : "bg-surface-2 text-theme-4 line-through hover:text-theme-3"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
