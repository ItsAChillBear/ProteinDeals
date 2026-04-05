"use client";
import { useLayoutEffect, useRef } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import type { Product, ProductGroupWithSelection, SortDir, SortKey } from "./price-comparison-table.types";
import type { ColumnFilters, ColumnFilterOptions } from "./price-comparison-filters";
import type { ProteinPlannerState } from "./price-comparison-planner";
import { PriceComparisonDesktopRowGroup } from "./PriceComparisonDesktopRowGroup";
import { PriceComparisonFilterDropdown } from "./PriceComparisonFilterDropdown";
import type { ColumnVisibility } from "./price-comparison-visibility";
import { getCaloriesPerGramProtein, getCaloriesPerServing, getPricePerGramProtein, getPricePerServing, getProteinPerServing } from "./price-comparison-metrics";
import { getCaloriesPer100g } from "./price-comparison-nutrition";

function getScrollContainer(element?: HTMLElement | null) {
  let current = element?.parentElement ?? null;

  while (current) {
    const style = window.getComputedStyle(current);
    const overflowY = style.overflowY;
    if ((overflowY === "auto" || overflowY === "scroll") && current.scrollHeight > current.clientHeight) {
      return current;
    }
    current = current.parentElement;
  }

  return (document.scrollingElement as HTMLElement | null) ?? document.documentElement;
}

function isRootScrollContainer(container: HTMLElement) {
  return container === document.body || container === document.documentElement || container === document.scrollingElement;
}

function getContainerScrollTop(container: HTMLElement) {
  return isRootScrollContainer(container)
    ? window.scrollY || window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0
    : container.scrollTop;
}

function setContainerScrollTop(container: HTMLElement, top: number) {
  if (isRootScrollContainer(container)) {
    window.scrollTo(0, top);
    document.documentElement.scrollTop = top;
    document.body.scrollTop = top;
    if (document.scrollingElement) {
      document.scrollingElement.scrollTop = top;
    }
    return;
  }

  container.scrollTop = top;
}

function getTargetTopWithinContainer(target: HTMLElement, container: HTMLElement) {
  const scrollTop = getContainerScrollTop(container);

  if (isRootScrollContainer(container)) {
    return scrollTop + target.getBoundingClientRect().top;
  }

  return scrollTop + (target.getBoundingClientRect().top - container.getBoundingClientRect().top);
}

function describeContainer(container: HTMLElement | null) {
  if (!container) return null;
  return {
    tag: container.tagName,
    id: container.id || null,
    className: container.className || null,
    scrollTop: container.scrollTop,
    clientHeight: container.clientHeight,
    scrollHeight: container.scrollHeight,
  };
}

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (sortKey !== col) return <ArrowUpDown className="h-3.5 w-3.5 opacity-50" strokeWidth={3} />;
  return sortDir === "asc" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />;
}

export default function PriceComparisonDesktopTable({
  groups,
  bestValueVariantIds,
  calorieMode,
  calorieVariantIds,
  expandedRows,
  onSort,
  onToggleExpanded,
  sortDir,
  sortKey,
  filters,
  activeFilters,
  planner,
  filterOptions,
  onFilter,
  visibility,
  viewMode,
  columnGroupMode,
  priceMode,
  flavourMode = "separate",
}: {
  groups: ProductGroupWithSelection[];
  bestValueVariantIds: Record<string, string[]>;
  calorieMode: boolean;
  calorieVariantIds: { lowest: string[]; highest: string[] };
  columnGroupMode: "nutrient" | "measure";
  expandedRows: Record<string, boolean>;
  onSort: (key: SortKey, groupId?: string, viewportTop?: number) => void;
  onToggleExpanded: (groupId: string) => void;
  sortDir: SortDir;
  sortKey: SortKey;
  filters: ColumnFilters;
  activeFilters: ColumnFilters;
  planner: ProteinPlannerState;
  filterOptions: ColumnFilterOptions;
  onFilter: (key: keyof ColumnFilters, value: string) => void;
  visibility: ColumnVisibility;
  viewMode: "card" | "table";
  priceMode: import("./price-comparison-metrics").PriceMode;
  flavourMode?: "separate" | "consolidate";
}) {
  const pendingScrollGroupRef = useRef<string | null>(null);
  const scrollContainerRef = useRef<HTMLElement | null>(null);
  const lockedScrollYRef = useRef<number | null>(null);

  function handleCardSort(key: SortKey, groupId?: string, viewportTop?: number, sourceElement?: HTMLElement | null) {
    const clickedGroupIndex =
      groupId !== undefined
        ? cardGroups.findIndex((group) => group.id === groupId)
        : -1;
    const shouldFollow = clickedGroupIndex > 0;
    const scrollContainer = getScrollContainer(sourceElement);

    if (!shouldFollow && sourceElement instanceof HTMLElement) {
      sourceElement.blur();
    }

    scrollContainerRef.current = scrollContainer;
    pendingScrollGroupRef.current = shouldFollow ? (groupId ?? null) : null;
    lockedScrollYRef.current = shouldFollow ? null : getContainerScrollTop(scrollContainer);
    onSort(key, groupId, viewportTop);
  }

  const headerClass =
    "px-2 py-2 text-center text-xs font-semibold uppercase tracking-wider text-theme-3 whitespace-nowrap align-bottom";

  const sortableHeader = (label: string, key: SortKey) => (
    <button type="button" onClick={() => onSort(key)} className="inline-flex items-center gap-1.5 transition-colors hover:text-theme-2">
      {label}
      <SortIcon col={key} sortKey={sortKey} sortDir={sortDir} />
    </button>
  );

  const proteinColSpan = (visibility.show100g ? 1 : 0) + (visibility.showServing ? 1 : 0);
  const caloriesColSpan = (visibility.show100g ? 1 : 0) + (visibility.showServing ? 1 : 0) + (visibility.show1gProtein ? 1 : 0);
  const priceColSpan = (visibility.showTotal ? 1 : 0) + (visibility.show100g ? 1 : 0) + (visibility.showServing ? 1 : 0) + (visibility.show1gProtein ? 1 : 0);
  // measure mode spans
  const servingColSpan = visibility.showServing ? 4 : 0;
  const per100gColSpan = visibility.show100g ? 3 : 0;
  const per1gProteinColSpan = visibility.show1gProtein ? 2 : 0;
  const totalColumns = columnGroupMode === "nutrient"
    ? 4 + proteinColSpan + caloriesColSpan + priceColSpan + (planner.committed && Number(planner.proteinTarget) > 0 ? 1 : 0)
    : 3 + (visibility.showTotal ? 1 : 0) + servingColSpan + per100gColSpan + per1gProteinColSpan + (planner.committed && Number(planner.proteinTarget) > 0 ? 1 : 0);

  // In consolidate mode, merge groups with the same baseName+retailer then re-sort by best variant
  const cardGroups = flavourMode === "consolidate"
    ? (() => {
        const merged = new Map<string, ProductGroupWithSelection>();
        for (const group of groups) {
          const key = `${group.retailer}||${group.baseName}`;
          const existing = merged.get(key);
          if (existing) {
            const ids = new Set(existing.variants.map((v) => v.id));
            const newVariants = group.variants.filter((v) => !ids.has(v.id));
            merged.set(key, { ...existing, variants: [...existing.variants, ...newVariants] });
          } else {
            merged.set(key, { ...group, id: key });
          }
        }
        // Re-sort merged groups by the best variant value for the active sort key
        const getVariantVal = (v: Product): number => {
          if (sortKey === "pricePer100g") return v.pricePer100g ?? Infinity;
          if (sortKey === "pricePerServing") return getPricePerServing(v) ?? Infinity;
          if (sortKey === "pricePerGramProtein") return getPricePerGramProtein(v) ?? Infinity;
          if (sortKey === "caloriesPerServing") return getCaloriesPerServing(v) ?? Infinity;
          if (sortKey === "caloriesPer100g") return getCaloriesPer100g(v) ?? Infinity;
          if (sortKey === "caloriesPerGramProtein") return getCaloriesPerGramProtein(v) ?? Infinity;
          if (sortKey === "proteinPerServing") return getProteinPerServing(v) ?? Infinity;
          if (sortKey === "proteinPer100g") return v.proteinPer100g ?? Infinity;
          return v.pricePer100g ?? Infinity;
        };
        return Array.from(merged.values()).sort((a, b) => {
          const aVals = a.variants.map(getVariantVal).filter((x) => x !== Infinity);
          const bVals = b.variants.map(getVariantVal).filter((x) => x !== Infinity);
          const aVal = aVals.length ? (sortDir === "desc" ? Math.max(...aVals) : Math.min(...aVals)) : Infinity;
          const bVal = bVals.length ? (sortDir === "desc" ? Math.max(...bVals) : Math.min(...bVals)) : Infinity;
          return sortDir === "desc" ? bVal - aVal : aVal - bVal;
        });
      })()
    : groups;

  useLayoutEffect(() => {
    if (viewMode !== "card" || lockedScrollYRef.current === null || !scrollContainerRef.current) return;

    const lockedScrollY = lockedScrollYRef.current;
    const scrollContainer = scrollContainerRef.current;
    const frame = requestAnimationFrame(() => {
      setContainerScrollTop(scrollContainer, lockedScrollY);
      lockedScrollYRef.current = null;
    });

    return () => cancelAnimationFrame(frame);
  }, [cardGroups, sortDir, sortKey, viewMode]);

  useLayoutEffect(() => {
    if (viewMode !== "card" || !pendingScrollGroupRef.current || !scrollContainerRef.current) return;

    const groupId = pendingScrollGroupRef.current;
    const scrollContainer = scrollContainerRef.current;
    let frame1 = 0;
    let frame2 = 0;

    frame1 = requestAnimationFrame(() => {
      frame2 = requestAnimationFrame(() => {
        const element = document.getElementById(`compare-group-${encodeURIComponent(groupId)}`);
        if (element) {
          const targetTop = getTargetTopWithinContainer(element, scrollContainer) - 88;
          setContainerScrollTop(scrollContainer, Math.max(0, targetTop));
        }
        pendingScrollGroupRef.current = null;
      });
    });

    return () => {
      cancelAnimationFrame(frame1);
      cancelAnimationFrame(frame2);
    };
  }, [cardGroups, sortDir, sortKey, viewMode]);

  if (viewMode === "card") {
    return (
      <div className="hidden sm:block" style={{ overflowAnchor: "none" }}>
        <table className="w-full text-sm">
          <tbody className="divide-y divide-theme">
            {cardGroups.map((group, i) => (
              <PriceComparisonDesktopRowGroup
                key={group.id}
                group={group}
                bestValueVariantIds={bestValueVariantIds}
                calorieMode={calorieMode}
                calorieVariantIds={calorieVariantIds}
                filters={activeFilters}
                planner={planner}
                visibility={visibility}
                isExpanded={Boolean(expandedRows[group.id])}
                onToggleExpanded={onToggleExpanded}
                totalColumns={1}
                viewMode="card"
                showFilterBar={i === 0}
                filterOptions={filterOptions}
                onFilter={onFilter}
                onSort={handleCardSort}
                sortKey={sortKey}
                sortDir={sortDir}
                priceMode={priceMode}
                flavourMode={flavourMode}
              />
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  const plannerTh = planner.committed && Number(planner.proteinTarget) > 0 ? (
    <th className="px-2 pt-2 pb-0 text-center text-[10px] font-bold uppercase tracking-widest text-green-500/80 border-x border-t border-green-500/20 bg-green-500/5" rowSpan={2}>
      <div className="flex flex-col items-center gap-1 pb-1">
        <span>{planner.proteinTarget}g/day</span>
        <div className="flex gap-1">
          <button type="button" onClick={() => onSort("dailyCost")} className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-semibold transition ${sortKey === "dailyCost" ? "bg-green-500/30 text-green-500" : "bg-surface-2 text-theme-3 hover:text-theme-2"}`}>
            £<SortIcon col="dailyCost" sortKey={sortKey} sortDir={sortDir} />
          </button>
          {planner.calorieEnabled ? (
            <button type="button" onClick={() => onSort("dailyCalories")} className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-semibold transition ${sortKey === "dailyCalories" ? "bg-amber-500/30 text-amber-500" : "bg-surface-2 text-theme-3 hover:text-theme-2"}`}>
              kcal<SortIcon col="dailyCalories" sortKey={sortKey} sortDir={sortDir} />
            </button>
          ) : null}
        </div>
      </div>
    </th>
  ) : null;

  const fixedThs = (
    <>
      <th className={`${headerClass} w-36`}>Product</th>
      <th className={`${headerClass} w-24`}>
        <div className="flex flex-col items-center gap-1.5">
          <PriceComparisonFilterDropdown value={filters.flavour} options={filterOptions.flavours} onChange={(v) => onFilter("flavour", v)} multi />
          <span>Flavour</span>
        </div>
      </th>
      <th className={`${headerClass} min-w-[70px]`}>
        <div className="flex flex-col items-center gap-1.5">
          <PriceComparisonFilterDropdown value={filters.size} options={filterOptions.sizes} numericValues={filterOptions.sizeGs} formatFn={(n) => { const match = filterOptions.sizes[filterOptions.sizeGs.indexOf(n)]; return match ? match.replace(/^(\d+\.\d+?)0+(kg|g)$/, "$1$2") : `${n}g`; }} numeric onChange={(v) => onFilter("size", v)} />
          <span>Size</span>
        </div>
      </th>
      <th className={headerClass}>
        <div className="flex flex-col items-center gap-1.5">
          <PriceComparisonFilterDropdown value={filters.servings} options={filterOptions.servings} onChange={(v) => onFilter("servings", v)} formatFn={(n) => `${n}`} numeric />
          <span>Servings</span>
        </div>
      </th>
    </>
  );

  return (
    <div className="hidden overflow-x-auto overflow-y-visible sm:block" style={{ overflowAnchor: "none" }}>
      <table className="w-full text-sm">
        <thead className="border-b border-theme bg-surface-2">
          {columnGroupMode === "nutrient" ? (
            <>
              <tr>
                {plannerTh}
                <th colSpan={flavourMode === "consolidate" ? 5 : 4} />
                {proteinColSpan > 0 ? <th colSpan={proteinColSpan} className="px-2 pt-2 pb-0 text-center text-[10px] font-bold uppercase tracking-widest text-violet-500/80 border-x border-t border-violet-400/20 bg-violet-400/5">Protein</th> : null}
                {caloriesColSpan > 0 ? <th colSpan={caloriesColSpan} className="px-2 pt-2 pb-0 text-center text-[10px] font-bold uppercase tracking-widest text-amber-500/80 border-x border-t border-amber-500/20 bg-amber-500/5">Calories</th> : null}
                {priceColSpan > 0 ? <th colSpan={priceColSpan} className="px-2 pt-2 pb-0 text-center text-[10px] font-bold uppercase tracking-widest text-green-500/80 border-x border-t border-green-500/20 bg-green-500/5">Price</th> : null}
              </tr>
              <tr>
                {flavourMode === "consolidate" ? <th className="w-6" /> : null}
                {fixedThs}
                {visibility.show100g ? <th className={`${headerClass} border-x border-violet-400/20 bg-violet-400/5 text-violet-500`}><div className="flex flex-col items-center gap-1.5"><PriceComparisonFilterDropdown value={filters.protein} options={filterOptions.proteins} onChange={(v) => onFilter("protein", v)} formatFn={(n) => `${n}g`} numeric />{sortableHeader("/100g", "proteinPer100g")}</div></th> : null}
                {visibility.showServing ? <th className={`${headerClass} border-x border-violet-400/20 bg-violet-400/5 text-violet-500`}><div className="flex flex-col items-center gap-1.5"><PriceComparisonFilterDropdown value={filters.proteinPerServing} options={filterOptions.proteinPerServings} onChange={(v) => onFilter("proteinPerServing", v)} formatFn={(n) => `${n.toFixed(1)}g`} numeric />{sortableHeader("/Serving", "proteinPerServing")}</div></th> : null}
                {visibility.show100g ? <th className={`${headerClass} border-x border-amber-500/20 bg-amber-500/5 text-amber-500`}><div className="flex flex-col items-center gap-1.5"><PriceComparisonFilterDropdown value={filters.caloriesPer100g} options={filterOptions.caloriesPer100gs} onChange={(v) => onFilter("caloriesPer100g", v)} formatFn={(n) => `${n}`} numeric />{sortableHeader("/100g", "caloriesPer100g")}</div></th> : null}
                {visibility.showServing ? <th className={`${headerClass} border-x border-amber-500/20 bg-amber-500/5 text-amber-500`}><div className="flex flex-col items-center gap-1.5"><PriceComparisonFilterDropdown value={filters.caloriesPerServing} options={filterOptions.caloriesPerServings} onChange={(v) => onFilter("caloriesPerServing", v)} formatFn={(n) => `${n}`} numeric />{sortableHeader("/Serving", "caloriesPerServing")}</div></th> : null}
                {visibility.show1gProtein ? <th className={`${headerClass} border-x border-amber-500/20 bg-amber-500/5 text-amber-500`}><div className="flex flex-col items-center gap-1.5"><PriceComparisonFilterDropdown value={filters.caloriesPerGramProtein} options={filterOptions.caloriesPerGramProteins} onChange={(v) => onFilter("caloriesPerGramProtein", v)} formatFn={(n) => n.toFixed(2)} numeric />{sortableHeader("/1g Protein", "caloriesPerGramProtein")}</div></th> : null}
                {visibility.showTotal ? <th className={`${headerClass} border-x border-green-500/20 bg-green-500/5 text-green-500`}><div className="flex flex-col items-center gap-1.5"><PriceComparisonFilterDropdown value={filters.price} options={filterOptions.prices} onChange={(v) => onFilter("price", v)} formatFn={(n) => `£${n.toFixed(2)}`} numeric />{sortableHeader("Total", "price")}</div></th> : null}
                {visibility.show100g ? <th className={`${headerClass} border-x border-green-500/20 bg-green-500/5 text-green-500`}><div className="flex flex-col items-center gap-1.5"><PriceComparisonFilterDropdown value={filters.pricePer100g} options={filterOptions.pricePer100gs} onChange={(v) => onFilter("pricePer100g", v)} formatFn={(n) => `£${n.toFixed(2)}`} numeric />{sortableHeader("/100g", "pricePer100g")}</div></th> : null}
                {visibility.showServing ? <th className={`${headerClass} border-x border-green-500/20 bg-green-500/5 text-green-500`}><div className="flex flex-col items-center gap-1.5"><PriceComparisonFilterDropdown value={filters.pricePerServing} options={filterOptions.pricePerServings} onChange={(v) => onFilter("pricePerServing", v)} formatFn={(n) => `£${n.toFixed(3)}`} numeric />{sortableHeader("/Serving", "pricePerServing")}</div></th> : null}
                {visibility.show1gProtein ? <th className={`${headerClass} border-x border-green-500/20 bg-green-500/5 text-green-500`}><div className="flex flex-col items-center gap-1.5"><PriceComparisonFilterDropdown value={filters.pricePerGramProtein} options={filterOptions.pricePerGramProteins} onChange={(v) => onFilter("pricePerGramProtein", v)} formatFn={(n) => `£${n.toFixed(3)}`} numeric />{sortableHeader("/1g Protein", "pricePerGramProtein")}</div></th> : null}
              </tr>
            </>
          ) : (
            <>
              <tr>
                {plannerTh}
                <th colSpan={flavourMode === "consolidate" ? 4 : 3} />
                {visibility.showTotal ? <th className="px-2 pt-2 pb-0 border-x border-t border-green-500/20 bg-green-500/5" /> : null}
                {visibility.showServing ? <th colSpan={servingColSpan} className="px-2 pt-2 pb-0 text-center text-[10px] font-bold uppercase tracking-widest text-theme-3 bg-surface-2 border-x border-t border-theme/60">Per Serving</th> : null}
                {visibility.show100g ? <th colSpan={per100gColSpan} className="px-2 pt-2 pb-0 text-center text-[10px] font-bold uppercase tracking-widest text-theme-3 bg-surface-2 border-x border-t border-theme/60">Per 100g</th> : null}
                {visibility.show1gProtein ? <th colSpan={per1gProteinColSpan} className="px-2 pt-2 pb-0 text-center text-[10px] font-bold uppercase tracking-widest text-theme-3 bg-surface-2 border-x border-t border-theme/60">Per 1g Protein</th> : null}
              </tr>
              <tr>
                {flavourMode === "consolidate" ? <th className="w-6" /> : null}
                <th className={`${headerClass} w-28`}>{sortableHeader("Product", "name")}</th>
                <th className={`${headerClass} min-w-[80px]`}><div className="flex flex-col items-center gap-1.5"><PriceComparisonFilterDropdown value={filters.flavour} options={filterOptions.flavours} onChange={(v) => onFilter("flavour", v)} multi /><span>Flavour</span></div></th>
                <th className={`${headerClass} min-w-[70px]`}><div className="flex flex-col items-center gap-1.5"><PriceComparisonFilterDropdown value={filters.size} options={filterOptions.sizes} numericValues={filterOptions.sizeGs} formatFn={(n) => { const match = filterOptions.sizes[filterOptions.sizeGs.indexOf(n)]; return match ? match.replace(/^(\d+\.\d+?)0+(kg|g)$/, "$1$2") : `${n}g`; }} numeric onChange={(v) => onFilter("size", v)} />{sortableHeader("Size", "size")}</div></th>
                {visibility.showTotal ? <th className={`${headerClass} border-x border-green-500/20 bg-green-500/5`}><div className="flex flex-col items-center gap-1.5"><PriceComparisonFilterDropdown value={filters.price} options={filterOptions.prices} onChange={(v) => onFilter("price", v)} formatFn={(n) => `£${n.toFixed(2)}`} numeric />{sortableHeader("Total", "price")}</div></th> : null}
                {visibility.showServing ? <th className={`${headerClass} border-l border-theme bg-surface-2 text-theme-3`}><div className="flex flex-col items-center gap-1.5"><PriceComparisonFilterDropdown value={filters.servings} options={filterOptions.servings} onChange={(v) => onFilter("servings", v)} formatFn={(n) => `${n}`} numeric /><span>Servings</span></div></th> : null}
                {visibility.showServing ? <th className={`${headerClass} bg-surface-2 text-violet-500`}><div className="flex flex-col items-center gap-1.5"><PriceComparisonFilterDropdown value={filters.proteinPerServing} options={filterOptions.proteinPerServings} onChange={(v) => onFilter("proteinPerServing", v)} formatFn={(n) => `${n.toFixed(1)}g`} numeric />{sortableHeader("Protein", "proteinPerServing")}</div></th> : null}
                {visibility.showServing ? <th className={`${headerClass} bg-surface-2 text-amber-500`}><div className="flex flex-col items-center gap-1.5"><PriceComparisonFilterDropdown value={filters.caloriesPerServing} options={filterOptions.caloriesPerServings} onChange={(v) => onFilter("caloriesPerServing", v)} formatFn={(n) => `${n}`} numeric />{sortableHeader("kcal", "caloriesPerServing")}</div></th> : null}
                {visibility.showServing ? <th className={`${headerClass} border-r border-theme bg-surface-2 text-green-500`}><div className="flex flex-col items-center gap-1.5"><PriceComparisonFilterDropdown value={filters.pricePerServing} options={filterOptions.pricePerServings} onChange={(v) => onFilter("pricePerServing", v)} formatFn={(n) => `£${n.toFixed(3)}`} numeric />{sortableHeader("Price", "pricePerServing")}</div></th> : null}
                {visibility.show100g ? <th className={`${headerClass} border-l border-theme bg-surface-2 text-violet-500`}><div className="flex flex-col items-center gap-1.5"><PriceComparisonFilterDropdown value={filters.protein} options={filterOptions.proteins} onChange={(v) => onFilter("protein", v)} formatFn={(n) => `${n}g`} numeric />{sortableHeader("Protein", "proteinPer100g")}</div></th> : null}
                {visibility.show100g ? <th className={`${headerClass} bg-surface-2 text-amber-500`}><div className="flex flex-col items-center gap-1.5"><PriceComparisonFilterDropdown value={filters.caloriesPer100g} options={filterOptions.caloriesPer100gs} onChange={(v) => onFilter("caloriesPer100g", v)} formatFn={(n) => `${n}`} numeric />{sortableHeader("kcal", "caloriesPer100g")}</div></th> : null}
                {visibility.show100g ? <th className={`${headerClass} border-r border-theme bg-surface-2 text-green-500`}><div className="flex flex-col items-center gap-1.5"><PriceComparisonFilterDropdown value={filters.pricePer100g} options={filterOptions.pricePer100gs} onChange={(v) => onFilter("pricePer100g", v)} formatFn={(n) => `£${n.toFixed(2)}`} numeric />{sortableHeader("Price", "pricePer100g")}</div></th> : null}
                {visibility.show1gProtein ? <th className={`${headerClass} border-l border-theme bg-surface-2 text-amber-500`}><div className="flex flex-col items-center gap-1.5"><PriceComparisonFilterDropdown value={filters.caloriesPerGramProtein} options={filterOptions.caloriesPerGramProteins} onChange={(v) => onFilter("caloriesPerGramProtein", v)} formatFn={(n) => n.toFixed(2)} numeric />{sortableHeader("kcal", "caloriesPerGramProtein")}</div></th> : null}
                {visibility.show1gProtein ? <th className={`${headerClass} border-r border-theme bg-surface-2 text-green-500`}><div className="flex flex-col items-center gap-1.5"><PriceComparisonFilterDropdown value={filters.pricePerGramProtein} options={filterOptions.pricePerGramProteins} onChange={(v) => onFilter("pricePerGramProtein", v)} formatFn={(n) => `£${n.toFixed(3)}`} numeric />{sortableHeader("Price", "pricePerGramProtein")}</div></th> : null}
              </tr>
            </>
          )}
        </thead>
        <tbody className="divide-y divide-theme">
          {cardGroups.map((group) => (
            <PriceComparisonDesktopRowGroup
              key={group.id}
              group={group}
              bestValueVariantIds={bestValueVariantIds}
              calorieMode={calorieMode}
              calorieVariantIds={calorieVariantIds}
              filters={activeFilters}
              planner={planner}
              visibility={visibility}
              isExpanded={Boolean(expandedRows[group.id])}
              onToggleExpanded={onToggleExpanded}
              totalColumns={totalColumns}
              viewMode={viewMode}
              columnGroupMode={columnGroupMode}
              priceMode={priceMode}
              flavourMode={flavourMode}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
