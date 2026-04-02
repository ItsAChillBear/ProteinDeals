"use client";

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import type { ProductGroupWithSelection, SortDir, SortKey } from "./price-comparison-table.types";
import type { ColumnFilters, ColumnFilterOptions } from "./price-comparison-filters";
import type { ProteinPlannerState } from "./price-comparison-planner";
import { PriceComparisonDesktopRowGroup } from "./PriceComparisonDesktopRowGroup";
import { PriceComparisonFilterDropdown } from "./PriceComparisonFilterDropdown";

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (sortKey !== col) return <ArrowUpDown className="h-3.5 w-3.5 text-gray-600" />;
  return sortDir === "asc" ? <ArrowUp className="h-3.5 w-3.5 text-green-400" /> : <ArrowDown className="h-3.5 w-3.5 text-green-400" />;
}

export default function PriceComparisonDesktopTable({
  groups,
  bestValueVariantId,
  expandedRows,
  onSort,
  onToggleExpanded,
  sortDir,
  sortKey,
  filters,
  planner,
  filterOptions,
  onFilter,
}: {
  groups: ProductGroupWithSelection[];
  bestValueVariantId: string | null;
  expandedRows: Record<string, boolean>;
  onSort: (key: SortKey) => void;
  onToggleExpanded: (groupId: string) => void;
  sortDir: SortDir;
  sortKey: SortKey;
  filters: ColumnFilters;
  planner: ProteinPlannerState;
  filterOptions: ColumnFilterOptions;
  onFilter: (key: keyof ColumnFilters, value: string) => void;
}) {
  const headerClass =
    "px-4 py-2 text-center text-xs font-semibold uppercase tracking-wider text-gray-500 whitespace-nowrap align-bottom";

  const sortableHeader = (label: string, key: SortKey) => (
    <button type="button" onClick={() => onSort(key)} className="inline-flex items-center gap-1.5 transition-colors hover:text-gray-300">
      {label}
      <SortIcon col={key} sortKey={sortKey} sortDir={sortDir} />
    </button>
  );

  return (
    <div className="hidden overflow-x-auto overflow-y-visible sm:block">
      <table className="w-full text-sm">
        <thead className="border-b border-gray-800 bg-gray-800/50">
          <tr>
            <th className={`${headerClass} w-28`}>Image</th>
            <th className={headerClass}>{sortableHeader("Product", "name")}</th>
            <th className={`${headerClass} min-w-[100px]`}>
              <div className="flex flex-col items-center gap-1.5">
                <PriceComparisonFilterDropdown value={filters.flavour} options={filterOptions.flavours} onChange={(v) => onFilter("flavour", v)} />
                <span>Flavour</span>
              </div>
            </th>
            <th className={headerClass}>
              <div className="flex flex-col items-center gap-1.5">
                <PriceComparisonFilterDropdown value={filters.protein} options={filterOptions.proteins} onChange={(v) => onFilter("protein", v)} formatFn={(n) => `${n}g`} numeric />
                <span>Protein</span>
              </div>
            </th>
            <th className={headerClass}>Calories / 100g</th>
            <th className={headerClass}>Calories / 1g Protein</th>
            <th className={`${headerClass} min-w-[80px]`}>
              <div className="flex flex-col items-center gap-1.5">
                <PriceComparisonFilterDropdown value={filters.size} options={filterOptions.sizes} onChange={(v) => onFilter("size", v)} />
                {sortableHeader("Size", "size")}
              </div>
            </th>
            <th className={headerClass}>
              <div className="flex flex-col items-center gap-1.5">
                <PriceComparisonFilterDropdown value={filters.servings} options={filterOptions.servings} onChange={(v) => onFilter("servings", v)} formatFn={(n) => `${n}`} numeric />
                <span>Servings</span>
              </div>
            </th>
            <th className={headerClass}>
              <div className="flex flex-col items-center gap-1.5">
                <PriceComparisonFilterDropdown value={filters.price} options={filterOptions.prices} onChange={(v) => onFilter("price", v)} formatFn={(n) => `£${n.toFixed(2)}`} numeric />
                {sortableHeader("Price", "price")}
              </div>
            </th>
            <th className={headerClass}>
              <div className="flex flex-col items-center gap-1.5">
                <PriceComparisonFilterDropdown value={filters.pricePer100g} options={filterOptions.pricePer100gs} onChange={(v) => onFilter("pricePer100g", v)} formatFn={(n) => `£${n.toFixed(2)}`} numeric />
                {sortableHeader("Per 100g", "pricePer100g")}
              </div>
            </th>
            <th className={headerClass}>
              <div className="flex flex-col items-center gap-1.5">
                <PriceComparisonFilterDropdown value={filters.pricePerServing} options={filterOptions.pricePerServings} onChange={(v) => onFilter("pricePerServing", v)} formatFn={(n) => `£${n.toFixed(3)}`} numeric />
                {sortableHeader("Per Serving", "pricePerServing")}
              </div>
            </th>
            <th className={headerClass}>
              <div className="flex flex-col items-center gap-1.5">
                <PriceComparisonFilterDropdown value={filters.pricePerGramProtein} options={filterOptions.pricePerGramProteins} onChange={(v) => onFilter("pricePerGramProtein", v)} formatFn={(n) => `£${n.toFixed(3)}`} numeric />
                {sortableHeader("Per 1g Protein", "pricePerGramProtein")}
              </div>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800">
          {groups.map((group) => (
            <PriceComparisonDesktopRowGroup
              key={group.id}
              group={group}
              bestValueVariantId={bestValueVariantId}
              filters={filters}
              planner={planner}
              isExpanded={Boolean(expandedRows[group.id])}
              onToggleExpanded={onToggleExpanded}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
