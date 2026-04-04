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
  sortKey: SortKey;
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
}

const SORT_BUTTONS: { key: SortKey; label: string; visKey: keyof ColumnVisibility }[] = [
  { key: "pricePerServing", label: "/Serving", visKey: "showServing" },
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
}: Props) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-800 px-6 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <PriceComparisonFilterDropdown value={filters.retailer} options={filterOptions.retailers} onChange={(v) => onFilter("retailer", v)} multi label="Supplier" />
        <PriceComparisonFilterDropdown value={filters.product} options={filterOptions.products} onChange={(v) => onFilter("product", v)} multi label="Product" />
        <PriceComparisonFilterDropdown value={filters.flavour} options={filterOptions.flavours} onChange={(v) => onFilter("flavour", v)} multi label="Flavour" />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-md border border-gray-700 overflow-hidden text-xs font-medium">
          <button type="button" onClick={() => setPriceMode("single")} className={`px-2.5 py-1 transition ${priceMode === "single" ? "bg-sky-700/60 text-sky-200" : "text-gray-500 hover:text-gray-300"}`}>Single</button>
          <button type="button" onClick={() => setPriceMode("subscription")} className={`px-2.5 py-1 transition border-l border-gray-700 ${priceMode === "subscription" ? "bg-sky-700/60 text-sky-200" : "text-gray-500 hover:text-gray-300"}`}>Subscribe</button>
        </div>
        <span className="mx-1 h-4 w-px bg-gray-700" />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-600">Sort by:</span>
        {SORT_BUTTONS.map(({ key, label, visKey }) => {
          const enabled = visibility[visKey];
          return (
            <button
              key={key}
              type="button"
              onClick={() => {
                if (enabled) handleSort(key);
              }}
              disabled={!enabled}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                !enabled
                  ? "cursor-not-allowed bg-gray-800/30 text-gray-700"
                  : sortKey === key
                    ? "bg-sky-700/60 text-sky-200"
                    : "bg-gray-800/50 text-gray-500 hover:text-gray-300"
              }`}
            >
              {label}
            </button>
          );
        })}
        <span className="mx-1 h-4 w-px bg-gray-700" />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-600">Show:</span>
        {VISIBILITY_BUTTONS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              setVisibility((current) => {
                const next = { ...current, [key]: !current[key] };
                if (!next.showServing && sortKey === "pricePerServing") {
                  setSortKey("pricePer100g");
                  setSortDir("asc");
                }
                if (!next.show100g && sortKey === "pricePer100g") {
                  setSortKey("pricePerServing");
                  setSortDir("asc");
                }
                if (!next.show1gProtein && sortKey === "pricePerGramProtein") {
                  setSortKey("pricePer100g");
                  setSortDir("asc");
                }
                return next;
              });
            }}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
              visibility[key]
                ? "bg-sky-700/60 text-sky-200 hover:bg-sky-700/80"
                : "bg-gray-800/50 text-gray-600 line-through hover:text-gray-400"
            }`}
          >
            {label}
          </button>
        ))}
        <span className="mx-1 h-4 w-px bg-gray-700" />
        <div className="flex rounded-md border border-gray-700 overflow-hidden text-xs font-medium">
          <button type="button" onClick={() => setViewMode("card")} className={`px-2.5 py-1 transition ${viewMode === "card" ? "bg-sky-700/60 text-sky-200" : "text-gray-500 hover:text-gray-300"}`}>Cards</button>
          <button type="button" onClick={() => setViewMode("table")} className={`px-2.5 py-1 transition border-l border-gray-700 ${viewMode === "table" ? "bg-sky-700/60 text-sky-200" : "text-gray-500 hover:text-gray-300"}`}>Table</button>
        </div>
        {viewMode === "table" ? (
          <div className="flex rounded-md border border-gray-700 overflow-hidden text-xs font-medium">
            <button type="button" onClick={() => setColumnGroupMode("nutrient")} className={`px-2.5 py-1 transition ${columnGroupMode === "nutrient" ? "bg-sky-700/60 text-sky-200" : "text-gray-500 hover:text-gray-300"}`}>Protein / Calories / Price</button>
            <button type="button" onClick={() => setColumnGroupMode("measure")} className={`px-2.5 py-1 transition border-l border-gray-700 ${columnGroupMode === "measure" ? "bg-sky-700/60 text-sky-200" : "text-gray-500 hover:text-gray-300"}`}>/Serving / /100g / /1g Protein</button>
          </div>
        ) : null}
        <p className="text-sm text-gray-400">
          <span className="font-semibold text-white">{filteredGroupsLength}</span> products,{" "}
          <span className="font-semibold text-white">{filteredVariantCount}</span> variants
        </p>
        <span className="mx-1 h-4 w-px bg-gray-700" />
        <button type="button" onClick={resetAll} className="rounded-md px-2.5 py-1 text-xs font-medium text-gray-400 transition hover:text-gray-200">Reset All</button>
      </div>
    </div>
  );
}
