"use client";

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
  setSortKey: React.Dispatch<React.SetStateAction<SortKey>>;
  setSortDir: React.Dispatch<React.SetStateAction<"asc" | "desc">>;
  viewMode: "card" | "table";
  setViewMode: React.Dispatch<React.SetStateAction<"card" | "table">>;
  columnGroupMode: "nutrient" | "measure";
  setColumnGroupMode: React.Dispatch<React.SetStateAction<"nutrient" | "measure">>;
  priceMode: PriceMode;
  setPriceMode: React.Dispatch<React.SetStateAction<PriceMode>>;
  filteredGroupsLength: number;
  filteredVariantCount: number;
  resetAll: () => void;
  flavourMode: "separate" | "consolidate";
  setFlavourMode: React.Dispatch<React.SetStateAction<"separate" | "consolidate">>;
}

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
  viewMode,
  setViewMode,
  columnGroupMode,
  setColumnGroupMode,
  priceMode,
  setPriceMode,
  filteredGroupsLength,
  filteredVariantCount,
  resetAll,
  flavourMode,
  setFlavourMode,
}: Props) {
  return (
    <div className="border-b border-theme px-6 py-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border border-theme-2 overflow-hidden text-xs font-medium">
            <button type="button" onClick={() => setPriceMode("single")} className={`px-2.5 py-1 transition ${priceMode === "single" ? "bg-green-700/60 text-green-200" : "text-theme-3 hover:text-theme"}`}>Single</button>
            <button type="button" onClick={() => setPriceMode("subscription")} className={`px-2.5 py-1 transition border-l border-theme-2 ${priceMode === "subscription" ? "bg-green-700/60 text-green-200" : "text-theme-3 hover:text-theme"}`}>Subscribe</button>
          </div>
          <span className="mx-1 h-4 w-px bg-theme-2" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-theme-4">Show:</span>
          {VISIBILITY_BUTTONS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setVisibility((current) => ({ ...current, [key]: !current[key] }))}
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
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border border-theme-2 overflow-hidden text-xs font-medium">
            <button type="button" onClick={() => setFlavourMode("consolidate")} className={`px-2.5 py-1 transition ${flavourMode === "consolidate" ? "bg-green-700/60 text-green-200" : "text-theme-3 hover:text-theme"}`}>Consolidate</button>
            <button type="button" onClick={() => setFlavourMode("separate")} className={`px-2.5 py-1 transition border-l border-theme-2 ${flavourMode === "separate" ? "bg-green-700/60 text-green-200" : "text-theme-3 hover:text-theme"}`}>Separate</button>
          </div>
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
      <div className="flex items-center gap-2 flex-wrap">
        <PriceComparisonFilterDropdown value={filters.retailer} options={filterOptions.retailers} onChange={(v) => onFilter("retailer", v)} multi label="Supplier" />
        <PriceComparisonFilterDropdown value={filters.category} options={filterOptions.categories} onChange={(v) => onFilter("category", v)} multi label="Category" />
        <PriceComparisonFilterDropdown value={filters.product} options={filterOptions.products} onChange={(v) => onFilter("product", v)} multi label="Product" />
        <PriceComparisonFilterDropdown value={filters.flavour} options={filterOptions.flavours} onChange={(v) => onFilter("flavour", v)} multi label="Flavour" />
        <span className="flex-1" />
        <span className="text-xs text-theme-3"><span className="font-semibold text-theme">{filteredGroupsLength}</span> products, <span className="font-semibold text-theme">{filteredVariantCount}</span> variants</span>
      </div>
    </div>
  );
}
