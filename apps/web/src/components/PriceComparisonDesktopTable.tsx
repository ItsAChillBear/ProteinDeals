"use client";

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import type { ProductGroupWithSelection, SortDir, SortKey } from "./price-comparison-table.types";
import type { ColumnFilters, ColumnFilterOptions } from "./price-comparison-filters";
import type { ProteinPlannerState } from "./price-comparison-planner";
import { PriceComparisonDesktopRowGroup } from "./PriceComparisonDesktopRowGroup";
import { PriceComparisonFilterDropdown } from "./PriceComparisonFilterDropdown";
import type { ColumnVisibility } from "./price-comparison-visibility";

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
  visibility,
  viewMode,
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
  visibility: ColumnVisibility;
  viewMode: "card" | "table";
}) {
  const headerClass =
    "px-2 py-2 text-center text-xs font-semibold uppercase tracking-wider text-gray-500 whitespace-nowrap align-bottom";

  const sortableHeader = (label: string, key: SortKey) => (
    <button type="button" onClick={() => onSort(key)} className="inline-flex items-center gap-1.5 transition-colors hover:text-gray-300">
      {label}
      <SortIcon col={key} sortKey={sortKey} sortDir={sortDir} />
    </button>
  );

  const proteinColSpan = (visibility.show100g ? 1 : 0) + (visibility.showServing ? 1 : 0);
  const caloriesColSpan = (visibility.show100g ? 1 : 0) + (visibility.showServing ? 1 : 0) + (visibility.show1gProtein ? 1 : 0);
  const priceColSpan = (visibility.showTotal ? 1 : 0) + (visibility.show100g ? 1 : 0) + (visibility.showServing ? 1 : 0) + (visibility.show1gProtein ? 1 : 0);
  const totalColumns =
    4 // product, flavour, size, servings
    + proteinColSpan
    + caloriesColSpan
    + priceColSpan
    + (planner.committed && Number(planner.proteinTarget) > 0 ? 1 : 0);

  if (viewMode === "card") {
    return (
      <div className="hidden sm:block">
        {/* Card rows — filter bar is rendered inside the first row group */}
        <table className="w-full text-sm">
          <tbody className="divide-y divide-gray-800">
            {groups.map((group, i) => (
              <PriceComparisonDesktopRowGroup
                key={group.id}
                group={group}
                bestValueVariantId={bestValueVariantId}
                filters={filters}
                planner={planner}
                visibility={visibility}
                isExpanded={Boolean(expandedRows[group.id])}
                onToggleExpanded={onToggleExpanded}
                totalColumns={1}
                viewMode={viewMode}
                showFilterBar={i === 0}
                filterOptions={filterOptions}
                onFilter={onFilter}
                onSort={onSort}
                sortKey={sortKey}
                sortDir={sortDir}
              />
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="hidden overflow-x-auto overflow-y-visible sm:block">
      <table className="w-full text-sm">
        <thead className="border-b border-gray-800 bg-gray-800/50">
          {/* Group label row */}
          <tr>
            {planner.committed && Number(planner.proteinTarget) > 0 ? (
              <th className="px-2 pt-2 pb-0 text-center text-[10px] font-bold uppercase tracking-widest text-green-500/80 border-x border-t border-green-500/20 bg-green-500/5" rowSpan={2}>
                <div className="flex flex-col items-center gap-1 pb-1">
                  <span>{planner.proteinTarget}g/day</span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => onSort("dailyCost")}
                      className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-semibold transition ${sortKey === "dailyCost" ? "bg-green-500/30 text-green-300" : "bg-gray-700/60 text-gray-400 hover:text-gray-200"}`}
                    >
                      £<SortIcon col="dailyCost" sortKey={sortKey} sortDir={sortDir} />
                    </button>
                    {planner.calorieEnabled ? (
                      <button
                        type="button"
                        onClick={() => onSort("dailyCalories")}
                        className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-semibold transition ${sortKey === "dailyCalories" ? "bg-amber-500/30 text-amber-300" : "bg-gray-700/60 text-gray-400 hover:text-gray-200"}`}
                      >
                        kcal<SortIcon col="dailyCalories" sortKey={sortKey} sortDir={sortDir} />
                      </button>
                    ) : null}
                  </div>
                </div>
              </th>
            ) : null}
            <th colSpan={4} />
            {proteinColSpan > 0 ? (
              <th colSpan={proteinColSpan} className="px-2 pt-2 pb-0 text-center text-[10px] font-bold uppercase tracking-widest text-violet-400/80 border-x border-t border-violet-400/20 bg-violet-400/5">
                Protein
              </th>
            ) : null}
            {caloriesColSpan > 0 ? (
              <th colSpan={caloriesColSpan} className="px-2 pt-2 pb-0 text-center text-[10px] font-bold uppercase tracking-widest text-amber-500/80 border-x border-t border-amber-500/20 bg-amber-500/5">
                Calories
              </th>
            ) : null}
            {priceColSpan > 0 ? (
              <th colSpan={priceColSpan} className="px-2 pt-2 pb-0 text-center text-[10px] font-bold uppercase tracking-widest text-sky-400/80 border-x border-t border-sky-400/20 bg-sky-400/5">
                Price
              </th>
            ) : null}
          </tr>
          {/* Column header row */}
          <tr>
            <th className={`${headerClass} w-28`}>{sortableHeader("Product", "name")}</th>
            <th className={`${headerClass} min-w-[80px]`}>
              <div className="flex flex-col items-center gap-1.5">
                <PriceComparisonFilterDropdown value={filters.flavour} options={filterOptions.flavours} onChange={(v) => onFilter("flavour", v)} multi />
                <span>Flavour</span>
              </div>
            </th>
            <th className={`${headerClass} min-w-[70px]`}>
              <div className="flex flex-col items-center gap-1.5">
                <PriceComparisonFilterDropdown value={filters.size} options={filterOptions.sizes} numericValues={filterOptions.sizeGs} formatFn={(n) => { const match = filterOptions.sizes[filterOptions.sizeGs.indexOf(n)]; return match ? match.replace(/^(\d+\.\d+?)0+(kg|g)$/, "$1$2") : `${n}g`; }} numeric onChange={(v) => onFilter("size", v)} />
                {sortableHeader("Size", "size")}
              </div>
            </th>
            <th className={headerClass}>
              <div className="flex flex-col items-center gap-1.5">
                <PriceComparisonFilterDropdown value={filters.servings} options={filterOptions.servings} onChange={(v) => onFilter("servings", v)} formatFn={(n) => `${n}`} numeric />
                <span>Servings</span>
              </div>
            </th>
            {visibility.show100g ? (
              <th className={`${headerClass} border-x border-violet-400/20 bg-violet-400/5`}>
                <div className="flex flex-col items-center gap-1.5">
                  <PriceComparisonFilterDropdown value={filters.protein} options={filterOptions.proteins} onChange={(v) => onFilter("protein", v)} formatFn={(n) => `${n}g`} numeric />
                  <span>/100g</span>
                </div>
              </th>
            ) : null}
            {visibility.showServing ? (
              <th className={`${headerClass} border-x border-violet-400/20 bg-violet-400/5`}>
                <div className="flex flex-col items-center gap-1.5">
                  <PriceComparisonFilterDropdown value={filters.proteinPerServing} options={filterOptions.proteinPerServings} onChange={(v) => onFilter("proteinPerServing", v)} formatFn={(n) => `${n.toFixed(1)}g`} numeric />
                  <span>/Serving</span>
                </div>
              </th>
            ) : null}
            {visibility.show100g ? (
              <th className={`${headerClass} border-x border-amber-500/20 bg-amber-500/5`}>
                <div className="flex flex-col items-center gap-1.5">
                  <PriceComparisonFilterDropdown value={filters.caloriesPer100g} options={filterOptions.caloriesPer100gs} onChange={(v) => onFilter("caloriesPer100g", v)} formatFn={(n) => `${n}`} numeric />
                  <span>/100g</span>
                </div>
              </th>
            ) : null}
            {visibility.showServing ? (
              <th className={`${headerClass} border-x border-amber-500/20 bg-amber-500/5`}>
                <div className="flex flex-col items-center gap-1.5">
                  <PriceComparisonFilterDropdown value={filters.caloriesPerServing} options={filterOptions.caloriesPerServings} onChange={(v) => onFilter("caloriesPerServing", v)} formatFn={(n) => `${n}`} numeric />
                  <span>/Serving</span>
                </div>
              </th>
            ) : null}
            {visibility.show1gProtein ? (
              <th className={`${headerClass} border-x border-amber-500/20 bg-amber-500/5`}>
                <div className="flex flex-col items-center gap-1.5">
                  <PriceComparisonFilterDropdown value={filters.caloriesPerGramProtein} options={filterOptions.caloriesPerGramProteins} onChange={(v) => onFilter("caloriesPerGramProtein", v)} formatFn={(n) => n.toFixed(2)} numeric />
                  <span>/1g Protein</span>
                </div>
              </th>
            ) : null}
            {visibility.showTotal ? (
              <th className={`${headerClass} border-x border-sky-400/20 bg-sky-400/5`}>
                <div className="flex flex-col items-center gap-1.5">
                  <PriceComparisonFilterDropdown value={filters.price} options={filterOptions.prices} onChange={(v) => onFilter("price", v)} formatFn={(n) => `£${n.toFixed(2)}`} numeric />
                  {sortableHeader("Total", "price")}
                </div>
              </th>
            ) : null}
            {visibility.show100g ? (
              <th className={`${headerClass} border-x border-sky-400/20 bg-sky-400/5`}>
                <div className="flex flex-col items-center gap-1.5">
                  <PriceComparisonFilterDropdown value={filters.pricePer100g} options={filterOptions.pricePer100gs} onChange={(v) => onFilter("pricePer100g", v)} formatFn={(n) => `£${n.toFixed(2)}`} numeric />
                  {sortableHeader("/100g", "pricePer100g")}
                </div>
              </th>
            ) : null}
            {visibility.showServing ? (
              <th className={`${headerClass} border-x border-sky-400/20 bg-sky-400/5`}>
                <div className="flex flex-col items-center gap-1.5">
                  <PriceComparisonFilterDropdown value={filters.pricePerServing} options={filterOptions.pricePerServings} onChange={(v) => onFilter("pricePerServing", v)} formatFn={(n) => `£${n.toFixed(3)}`} numeric />
                  {sortableHeader("/Serving", "pricePerServing")}
                </div>
              </th>
            ) : null}
            {visibility.show1gProtein ? (
              <th className={`${headerClass} border-x border-sky-400/20 bg-sky-400/5`}>
                <div className="flex flex-col items-center gap-1.5">
                  <PriceComparisonFilterDropdown value={filters.pricePerGramProtein} options={filterOptions.pricePerGramProteins} onChange={(v) => onFilter("pricePerGramProtein", v)} formatFn={(n) => `£${n.toFixed(3)}`} numeric />
                  {sortableHeader("/1g Protein", "pricePerGramProtein")}
                </div>
              </th>
            ) : null}
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
              visibility={visibility}
              isExpanded={Boolean(expandedRows[group.id])}
              onToggleExpanded={onToggleExpanded}
              totalColumns={totalColumns}
              viewMode={viewMode}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
