"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronDown, ChevronUp, TrendingDown, TrendingUp } from "lucide-react";
import { clsx } from "clsx";
import PriceComparisonExpandedDetails from "./PriceComparisonExpandedDetails";
import { PriceComparisonFilterDropdown } from "./PriceComparisonFilterDropdown";
import { formatCurrencyPrecise } from "./price-comparison-format";
import {
  getDailyCaloriesForTarget,
  getDailyCostForTarget,
  type ProteinPlannerState,
} from "./price-comparison-planner";
import type { ProductGroupWithSelection, SortDir, SortKey } from "./price-comparison-table.types";
import {
  getCaloriesPerGramProtein,
  getCaloriesPerServing,
  getPricePerGramProtein,
  getPricePerServing,
  getProteinPerServing,
} from "./price-comparison-metrics";
import { getCaloriesPer100g, getServingsPerPack } from "./price-comparison-nutrition";
import type { ColumnVisibility } from "./price-comparison-visibility";
import type { ColumnFilters, ColumnFilterOptions } from "./price-comparison-filters";
import { ProductThumbnail, formatCurrency } from "./price-comparison-table.utils";
import { Stat, formatSize } from "./price-comparison-card.shared";
import { applyPriceMode, type PriceMode } from "./price-comparison-metrics";

interface Props {
  group: ProductGroupWithSelection;
  flavourVariants: ProductGroupWithSelection["variants"];
  bestValueVariantIds: Record<string, string[]>;
  calorieMode?: boolean;
  calorieVariantIds?: { lowest: string[]; highest: string[] };
  visibility: ColumnVisibility;
  isBestValue: boolean;
  isExpanded: boolean;
  onToggleExpanded: (groupId: string) => void;
  totalColumns: number;
  showPlanner: boolean;
  proteinTarget: number;
  planner: ProteinPlannerState;
  showFilterBar?: boolean;
  filterOptions?: ColumnFilterOptions;
  filters: ColumnFilters;
  onFilter?: (key: keyof ColumnFilters, value: string) => void;
  priceMode?: PriceMode;
  sortKey?: SortKey;
  sortDir?: SortDir;
  onSort?: (key: SortKey, groupId?: string, viewportTop?: number, sourceElement?: HTMLElement | null) => void;
  flavourMode?: "separate" | "consolidate";
}

export default function PriceComparisonDesktopCardGroup({
  group,
  flavourVariants,
  bestValueVariantIds,
  calorieMode = false,
  calorieVariantIds = { lowest: [], highest: [] },
  visibility,
  isBestValue,
  isExpanded,
  onToggleExpanded,
  totalColumns,
  showPlanner,
  proteinTarget,
  planner,
  showFilterBar,
  filterOptions,
  filters,
  onFilter,
  priceMode = "single",
  sortKey,
  sortDir,
  onSort,
  flavourMode = "separate",
}: Props) {
  const product = group.selected;
  const activeFlavour = product.flavour ?? "";
  const displayProteinPer100g = product.proteinPer100g;
  const hasAnySubscription = flavourVariants.some((v) => v.subscriptionPrice != null);
  const [localMode, setLocalMode] = useState<PriceMode>(priceMode);
  useEffect(() => { setLocalMode(priceMode); }, [priceMode]);
  const effectiveMode: PriceMode = hasAnySubscription ? localMode : "single";
  const isOverridden = hasAnySubscription && localMode !== priceMode;

  const scrollAnchorGroupId =
    flavourMode === "consolidate"
      ? `${group.retailer}||${group.baseName}`
      : group.id;

  function handleSortWithAnchor(key: SortKey, viewportTop?: number, sourceElement?: HTMLElement | null) {
    onSort?.(key, scrollAnchorGroupId, viewportTop, sourceElement);
  }

  // In consolidate mode, group variants by size
  const variantsBySize = useMemo(() => {
    if (flavourMode !== "consolidate") return null;
    const map = new Map<string, ProductGroupWithSelection["variants"]>();
    for (const v of flavourVariants) {
      const existing = map.get(v.size) ?? [];
      existing.push(v);
      map.set(v.size, existing);
    }
    return map;
  }, [flavourMode, flavourVariants]);

  const rowElementId = `compare-group-${encodeURIComponent(group.id)}`;

  return (
    <tr id={rowElementId} data-group-id={group.id} className="transition-colors hover-bg">
      <td colSpan={totalColumns} className="px-4 py-3">
        <div className="rounded-xl border border-theme overflow-hidden">
          <div className="flex">
            <div className="w-48 flex-shrink-0 flex flex-col items-center justify-center gap-2 px-3 py-3 border-r border-theme bg-surface-2">
              <div className="text-xs font-medium text-theme-2">{group.retailer}</div>
              <ProductThumbnail name={group.baseName} imageUrl={group.imageUrl} size="lg" />
              <div className="flex flex-col items-center gap-1 w-full">
                <button type="button" onClick={() => onToggleExpanded(group.id)} className="text-sm font-semibold text-theme hover:text-green-500 transition-colors leading-tight line-clamp-2 text-center">{group.baseName}</button>
                <div className="flex w-full items-center justify-between gap-1">
                  <button type="button" onClick={() => onToggleExpanded(group.id)} className="flex-shrink-0 p-1">{isExpanded ? <ChevronUp className="h-4 w-4 text-theme-4" /> : <ChevronDown className="h-4 w-4 text-theme-4" />}</button>
                  {flavourMode === "separate" && activeFlavour ? <span className="flex-1 rounded bg-surface-3 px-1 py-0.5 text-[10px] text-theme-2 text-center">{activeFlavour}</span> : <span className="flex-1" />}
                  <button type="button" onClick={() => onToggleExpanded(group.id)} className="flex-shrink-0 p-1">{isExpanded ? <ChevronUp className="h-4 w-4 text-theme-4" /> : <ChevronDown className="h-4 w-4 text-theme-4" />}</button>
                </div>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <CardHeader visibility={visibility} showPlanner={showPlanner} proteinTarget={proteinTarget} showFilterBar={showFilterBar} filterOptions={filterOptions} filters={filters} onFilter={onFilter} hasAnySubscription={hasAnySubscription} effectiveMode={effectiveMode} onToggleMode={() => setLocalMode(m => m === "single" ? "subscription" : "single")} sortKey={sortKey} sortDir={sortDir} onSort={handleSortWithAnchor} flavourMode={flavourMode} />
              {flavourMode === "consolidate" && variantsBySize ? (
                Array.from(variantsBySize.entries()).map(([size, sizeVariants], i) => (
                  <ConsolidatedSizeRow key={size} sizeVariants={sizeVariants} effectiveMode={effectiveMode} isOverridden={isOverridden} calorieMode={calorieMode} calorieVariantIds={calorieVariantIds} visibility={visibility} bestValueVariantIds={bestValueVariantIds} displayProteinPer100g={displayProteinPer100g} showPlanner={showPlanner} proteinTarget={proteinTarget} planner={planner} bordered={i > 0} sortKey={sortKey} />
                ))
              ) : (
                flavourVariants.map((variant, i) => (
                  <CardVariantRow key={variant.id} variant={variant} effectiveMode={effectiveMode} isOverridden={isOverridden} calorieMode={calorieMode} calorieVariantIds={calorieVariantIds} visibility={visibility} bestValueVariantIds={bestValueVariantIds} displayProteinPer100g={displayProteinPer100g} showPlanner={showPlanner} proteinTarget={proteinTarget} planner={planner} bordered={i > 0} />
                ))
              )}
            </div>
          </div>
        </div>
        {isExpanded ? (
          <div className={clsx("mt-3 rounded-xl px-4 py-3", calorieMode ? "bg-surface" : isBestValue ? "bg-green-500/5" : "bg-surface")}>
            <div className="space-y-3">
              <PriceComparisonExpandedDetails group={group} />
            </div>
          </div>
        ) : null}
      </td>
    </tr>
  );
}

function CardHeader({ visibility, showPlanner, proteinTarget, showFilterBar, filterOptions, filters, onFilter, hasAnySubscription, effectiveMode, onToggleMode, sortKey, sortDir, onSort, flavourMode }: Omit<Props, "group" | "flavourVariants" | "bestValueVariantIds" | "isBestValue" | "isExpanded" | "onToggleExpanded" | "totalColumns" | "planner" | "onSort"> & { hasAnySubscription: boolean; effectiveMode: PriceMode; onToggleMode: () => void; onSort?: (key: SortKey, viewportTop?: number, sourceElement?: HTMLElement | null) => void; }) {
  const consolidated = flavourMode === "consolidate";
  return (
    <div className="flex border-b border-theme bg-surface-2">
      <div className={clsx("flex-shrink-0 flex flex-col justify-end", consolidated ? "w-64" : "w-44")}>
        {hasAnySubscription && visibility.showTotal ? (
          <div className="flex mb-0.5 pl-4">
            {consolidated ? <span className="w-20 flex-shrink-0" /> : null}
            <span className="w-16 flex-shrink-0" />
            <div className="w-20 flex-shrink-0 flex justify-center">
              <div className="flex rounded overflow-hidden border border-theme-2 text-[10px] font-semibold">
                <button type="button" onClick={() => effectiveMode !== "single" && onToggleMode()} className={clsx("px-1.5 py-0.5 transition-colors", effectiveMode === "single" ? "bg-sky-700/60 text-sky-200" : "text-theme-3 hover:text-theme-2")}>1×</button>
                <button type="button" onClick={() => effectiveMode !== "subscription" && onToggleMode()} className={clsx("px-1.5 py-0.5 transition-colors border-l border-theme-2", effectiveMode === "subscription" ? "bg-sky-700/60 text-sky-200" : "text-theme-3 hover:text-theme-2")}>Sub</button>
              </div>
            </div>
          </div>
        ) : null}
        <div className="flex mb-1 pl-4">
          {consolidated ? <span className="w-20 flex-shrink-0 text-center text-[10px] font-bold uppercase tracking-widest text-theme-3">Flavour</span> : null}
          <span className="w-16 flex-shrink-0 text-center text-[10px] font-bold uppercase tracking-widest text-theme-3">Size</span>
          {visibility.showTotal ? <span className="w-20 flex-shrink-0 text-center text-[10px] font-bold uppercase tracking-widest text-green-500/80">Total</span> : null}
        </div>
        <div className="flex">
          <span className="w-4 flex-shrink-0" />
          {consolidated ? <div className="w-20 flex-shrink-0 px-1 pb-1.5">{showFilterBar && filterOptions && onFilter ? <PriceComparisonFilterDropdown value={filters.flavour} options={filterOptions.flavours} onChange={(v) => onFilter("flavour", v)} multi /> : null}</div> : null}
          <div className="w-16 flex-shrink-0 px-1 pb-1.5">{showFilterBar && filterOptions && onFilter ? <PriceComparisonFilterDropdown value={filters.size} options={filterOptions.sizes} numericValues={filterOptions.sizeGs} formatFn={(n) => { const match = filterOptions.sizes[filterOptions.sizeGs.indexOf(n)]; return match ? match.replace(/^(\d+\.\d+?)0+(kg|g)$/, "$1$2") : `${n}g`; }} numeric onChange={(v) => onFilter("size", v)} /> : null}</div>
          {visibility.showTotal ? <div className="w-20 flex-shrink-0 px-1 pb-1.5">{showFilterBar && filterOptions && onFilter ? <PriceComparisonFilterDropdown value={filters.price} options={filterOptions.prices} onChange={(v) => onFilter("price", v)} formatFn={(n) => `£${n.toFixed(2)}`} numeric /> : null}</div> : null}
        </div>
      </div>
      <div className="flex divide-x divide-theme">
        {visibility.showServing ? <MetricHeader title="Per serving" widths={["w-16", "w-16", "w-16", "w-16"]} labels={["servings", "protein", "kcal", "price"]} colors={["text-theme-3", "text-violet-500/60", "text-amber-500/60", "text-green-500/60"]} sortKeys={[undefined, "proteinPerServing", "caloriesPerServing", "pricePerServing"]} sortKey={sortKey} sortDir={sortDir} onSort={onSort} filters={showFilterBar && filterOptions && onFilter ? [<PriceComparisonFilterDropdown key="s1" value={filters.servings} options={filterOptions.servings} onChange={(v) => onFilter("servings", v)} formatFn={(n) => `${n}`} numeric />, <PriceComparisonFilterDropdown key="s2" value={filters.proteinPerServing} options={filterOptions.proteinPerServings} onChange={(v) => onFilter("proteinPerServing", v)} formatFn={(n) => `${n.toFixed(1)}g`} numeric />, <PriceComparisonFilterDropdown key="s3" value={filters.caloriesPerServing} options={filterOptions.caloriesPerServings} onChange={(v) => onFilter("caloriesPerServing", v)} formatFn={(n) => `${n}`} numeric />, <PriceComparisonFilterDropdown key="s4" value={filters.pricePerServing} options={filterOptions.pricePerServings} onChange={(v) => onFilter("pricePerServing", v)} formatFn={(n) => `£${n.toFixed(3)}`} numeric />] : undefined} /> : null}
        {visibility.show100g ? <MetricHeader title="Per 100g" widths={["w-16", "w-16", "w-16"]} labels={["protein", "kcal", "price"]} colors={["text-violet-500/60", "text-amber-500/60", "text-green-500/60"]} sortKeys={["proteinPer100g", "caloriesPer100g", "pricePer100g"]} sortKey={sortKey} sortDir={sortDir} onSort={onSort} filters={showFilterBar && filterOptions && onFilter ? [<PriceComparisonFilterDropdown key="h1" value={filters.protein} options={filterOptions.proteins} onChange={(v) => onFilter("protein", v)} formatFn={(n) => `${n}g`} numeric />, <PriceComparisonFilterDropdown key="h2" value={filters.caloriesPer100g} options={filterOptions.caloriesPer100gs} onChange={(v) => onFilter("caloriesPer100g", v)} formatFn={(n) => `${n}`} numeric />, <PriceComparisonFilterDropdown key="h3" value={filters.pricePer100g} options={filterOptions.pricePer100gs} onChange={(v) => onFilter("pricePer100g", v)} formatFn={(n) => `£${n.toFixed(2)}`} numeric />] : undefined} /> : null}
        {visibility.show1gProtein ? <MetricHeader title="Per 1g protein" widths={["w-16", "w-16"]} labels={["kcal", "price"]} colors={["text-amber-500/60", "text-green-500/60"]} sortKeys={["caloriesPerGramProtein", "pricePerGramProtein"]} sortKey={sortKey} sortDir={sortDir} onSort={onSort} filters={showFilterBar && filterOptions && onFilter ? [<PriceComparisonFilterDropdown key="g1" value={filters.caloriesPerGramProtein} options={filterOptions.caloriesPerGramProteins} onChange={(v) => onFilter("caloriesPerGramProtein", v)} formatFn={(n) => n.toFixed(2)} numeric />, <PriceComparisonFilterDropdown key="g2" value={filters.pricePerGramProtein} options={filterOptions.pricePerGramProteins} onChange={(v) => onFilter("pricePerGramProtein", v)} formatFn={(n) => `£${n.toFixed(3)}`} numeric />] : undefined} /> : null}
        {showPlanner ? <div className="w-24 flex-shrink-0 px-3 pt-2 pb-1.5 border-l border-green-500/20 bg-green-500/5"><div className="text-[10px] font-bold uppercase tracking-widest text-green-500/80">{proteinTarget}g/day</div></div> : null}
      </div>
    </div>
  );
}

function MetricHeader({ title, widths, labels, colors, sortKeys, sortKey, sortDir, onSort, filters }: { title: string; widths: string[]; labels: string[]; colors: string[]; sortKeys?: (SortKey | undefined)[]; sortKey?: SortKey; sortDir?: SortDir; onSort?: (key: SortKey, viewportTop?: number, sourceElement?: HTMLElement | null) => void; filters?: React.ReactNode[]; }) {
  return (
    <div className="flex-shrink-0 px-3 pt-2 pb-1.5 border-l border-theme">
      <div className="text-center text-[11px] font-bold uppercase tracking-widest text-theme-3 mb-1">{title}</div>
      <div className="flex text-xs mb-1">
        {labels.map((label, index) => {
          const sk = sortKeys?.[index];
          const isActive = sk !== undefined && sortKey === sk;
          if (sk && onSort) {
            return (
              <button key={label} type="button" onClick={(event) => onSort(sk, event.currentTarget.getBoundingClientRect().top, event.currentTarget)} className={`${widths[index]} text-center font-medium ${colors[index]} flex items-center justify-center gap-0.5 hover:opacity-100 transition-opacity ${isActive ? "opacity-100" : "opacity-70"}`}>
                <span>{label}</span>
                {isActive ? (sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-50" strokeWidth={3} />}
              </button>
            );
          }
          return <span key={label} className={`${widths[index]} text-center font-medium ${colors[index]}`}>{label}</span>;
        })}
      </div>
      {filters ? <div className="flex text-[9px]">{filters.map((filter, index) => <div key={index} className={`${widths[index]} px-0.5`}>{filter}</div>)}</div> : null}
    </div>
  );
}

function CardVariantRow({ variant, effectiveMode, isOverridden, calorieMode, calorieVariantIds, visibility, bestValueVariantIds, displayProteinPer100g, showPlanner, proteinTarget, planner, bordered }: { variant: ProductGroupWithSelection["selected"]; effectiveMode: PriceMode; isOverridden: boolean; calorieMode: boolean; calorieVariantIds: { lowest: string[]; highest: string[] }; visibility: ColumnVisibility; bestValueVariantIds: Record<string, string[]>; displayProteinPer100g: number | null; showPlanner: boolean; proteinTarget: number; planner: ProteinPlannerState; bordered: boolean; }) {
  const v = applyPriceMode(variant, effectiveMode);
  const best100g = bestValueVariantIds.pricePer100g?.includes(variant.id) ?? false;
  const bestServing = bestValueVariantIds.pricePerServing?.includes(variant.id) ?? false;
  const best1gProtein = bestValueVariantIds.pricePerGramProtein?.includes(variant.id) ?? false;
  const hasSubscription = variant.subscriptionPrice != null;
  const isLowest = calorieMode && (calorieVariantIds.lowest.includes(variant.id));
  const isHighest = calorieMode && (calorieVariantIds.highest.includes(variant.id));
  const dailyCost = showPlanner ? getDailyCostForTarget(v, proteinTarget) : null;
  const dailyCalories = showPlanner && planner.calorieEnabled ? getDailyCaloriesForTarget(v, proteinTarget) : null;
  const proteinPerServing = getProteinPerServing(v);
  const caloriesPerServing = getCaloriesPerServing(v);
  const pricePerServing = getPricePerServing(v);
  const pricePerGramProtein = getPricePerGramProtein(v);
  const calPer100g = getCaloriesPer100g(v);
  const calPerGramProtein = getCaloriesPerGramProtein(v);

  const rowBg = isOverridden && hasSubscription ? "bg-sky-500/10" : "bg-transparent";

  return (
    <div className={clsx("flex items-start relative", bordered && "border-t border-theme", rowBg)}>
      <div className="w-44 flex-shrink-0 flex items-start py-2.5">
        <div className="w-4 flex-shrink-0" />
        <span className="w-16 flex-shrink-0 px-1 text-center text-sm font-bold text-theme leading-[1.2rem]">{formatSize(variant.size)}</span>
        {visibility.showTotal ? (
          <div className="w-20 flex-shrink-0 flex flex-col items-center">
            <span className="text-xs font-semibold leading-[1.2rem] text-green-500">{formatCurrency(v.price)}</span>
            {effectiveMode === "subscription" && hasSubscription && variant.subscriptionPrice != null ? <span className="text-[10px] leading-tight text-red-400 whitespace-nowrap">-{formatCurrency(variant.singlePrice - variant.subscriptionPrice)} (-{Math.round(((variant.singlePrice - variant.subscriptionPrice) / variant.singlePrice) * 100)}%)</span> : null}
          </div>
        ) : null}
      </div>
      <div className="flex divide-x divide-theme">
        {visibility.showServing ? (
          <div className="flex-shrink-0 px-3 py-2.5 border-l border-theme">
            <div className="flex">
              <Stat className="w-16">{getServingsPerPack(variant) ?? "-"}</Stat>
              <Stat className="w-16" color="violet">{proteinPerServing !== null ? `${proteinPerServing.toFixed(1)}g` : "-"}</Stat>
              <Stat className="w-16" color="amber" calorieTag={calorieMode ? isLowest ? "lowest" : isHighest ? "highest" : undefined : undefined}>{caloriesPerServing !== null ? Math.round(caloriesPerServing) : "-"}</Stat>
              <Stat className="w-16" color="sky" bestValue={!calorieMode && bestServing}>{pricePerServing !== null ? formatCurrencyPrecise(pricePerServing) : "-"}</Stat>
            </div>
          </div>
        ) : null}
        {visibility.show100g ? (
          <div className="flex-shrink-0 px-3 py-2.5 border-l border-theme">
            <div className="flex">
              <Stat className="w-16" color="violet">{displayProteinPer100g !== null ? `${displayProteinPer100g}g` : "-"}</Stat>
              <Stat className="w-16" color="amber" calorieTag={calorieMode ? isLowest ? "lowest" : isHighest ? "highest" : undefined : undefined}>{calPer100g !== null ? calPer100g : "-"}</Stat>
              <Stat className="w-16" color="sky" bestValue={!calorieMode && best100g}>{formatCurrency(variant.pricePer100g)}</Stat>
            </div>
          </div>
        ) : null}
        {visibility.show1gProtein ? (
          <div className="flex-shrink-0 px-3 py-2.5 border-l border-theme">
            <div className="flex">
              <Stat className="w-16" color="amber" calorieTag={calorieMode ? isLowest ? "lowest" : isHighest ? "highest" : undefined : undefined}>{calPerGramProtein !== null ? calPerGramProtein.toFixed(2) : "-"}</Stat>
              <Stat className="w-16" color="sky" bestValue={!calorieMode && best1gProtein}>{pricePerGramProtein !== null ? formatCurrencyPrecise(pricePerGramProtein) : "-"}</Stat>
            </div>
          </div>
        ) : null}
        {showPlanner ? <div className="w-24 flex-shrink-0 px-3 py-2.5 text-right">{dailyCost !== null ? <span className="text-sm font-bold text-green-500">{formatCurrency(dailyCost)}</span> : <span className="text-theme-4">—</span>}{dailyCalories !== null ? <div className="text-[10px] text-amber-500/80">{Math.round(dailyCalories)} kcal</div> : null}</div> : null}
      </div>
    </div>
  );
}

function ConsolidatedSizeRow({ sizeVariants, effectiveMode, isOverridden, calorieMode, calorieVariantIds, visibility, bestValueVariantIds, displayProteinPer100g, showPlanner, proteinTarget, planner, bordered, sortKey }: { sizeVariants: ProductGroupWithSelection["variants"]; effectiveMode: PriceMode; isOverridden: boolean; calorieMode: boolean; calorieVariantIds: { lowest: string[]; highest: string[] }; visibility: ColumnVisibility; bestValueVariantIds: Record<string, string[]>; displayProteinPer100g: number | null; showPlanner: boolean; proteinTarget: number; planner: ProteinPlannerState; bordered: boolean; sortKey?: SortKey; }) {
  const hasFlavours = sizeVariants.some((v) => v.flavour);

  // Pick the best flavour for the current sort key
  const bestVariant = useMemo(() => {
    if (sizeVariants.length <= 1) return sizeVariants[0];
    const getVal = (v: ProductGroupWithSelection["variants"][0]): number => {
      const applied = applyPriceMode(v, effectiveMode);
      if (sortKey === "pricePerServing") return getPricePerServing(applied) ?? Infinity;
      if (sortKey === "pricePerGramProtein") return getPricePerGramProtein(applied) ?? Infinity;
      if (sortKey === "caloriesPerServing") return getCaloriesPerServing(applied) ?? Infinity;
      if (sortKey === "caloriesPer100g") return getCaloriesPer100g(applied) ?? Infinity;
      if (sortKey === "caloriesPerGramProtein") return getCaloriesPerGramProtein(applied) ?? Infinity;
      // For protein, higher is better — negate so sort ascending finds highest
      if (sortKey === "proteinPerServing") return -(getProteinPerServing(applied) ?? 0);
      if (sortKey === "proteinPer100g") return -(applied.proteinPer100g ?? 0);
      return applied.pricePer100g;
    };
    // Always pick the "best" (lowest getVal = best value) regardless of sortDir
    return [...sizeVariants].sort((a, b) => getVal(a) - getVal(b))[0];
  }, [sizeVariants, sortKey, effectiveMode]);

  const [selectedFlavour, setSelectedFlavour] = useState<string>(bestVariant?.flavour ?? "");

  // When sort changes, update selected to best flavour
  useEffect(() => {
    if (bestVariant) setSelectedFlavour(bestVariant.flavour ?? "");
  }, [bestVariant]);

  const variant = sizeVariants.find((v) => (v.flavour ?? "") === selectedFlavour) ?? sizeVariants[0];
  if (!variant) return null;

  const v = applyPriceMode(variant, effectiveMode);
  const best100g = bestValueVariantIds.pricePer100g?.includes(variant.id) ?? false;
  const bestServing = bestValueVariantIds.pricePerServing?.includes(variant.id) ?? false;
  const best1gProtein = bestValueVariantIds.pricePerGramProtein?.includes(variant.id) ?? false;
  const hasSubscription = variant.subscriptionPrice != null;
  const isLowest = calorieMode && calorieVariantIds.lowest.includes(variant.id);
  const isHighest = calorieMode && calorieVariantIds.highest.includes(variant.id);
  const dailyCost = showPlanner ? getDailyCostForTarget(v, proteinTarget) : null;
  const dailyCalories = showPlanner && planner.calorieEnabled ? getDailyCaloriesForTarget(v, proteinTarget) : null;
  const proteinPerServing = getProteinPerServing(v);
  const caloriesPerServing = getCaloriesPerServing(v);
  const pricePerServing = getPricePerServing(v);
  const pricePerGramProtein = getPricePerGramProtein(v);
  const calPer100g = getCaloriesPer100g(v);
  const calPerGramProtein = getCaloriesPerGramProtein(v);
  const rowBg = isOverridden && hasSubscription ? "bg-sky-500/10" : "bg-transparent";

  return (
    <div className={clsx("flex items-start relative", bordered && "border-t border-theme", rowBg)}>
      <div className="w-64 flex-shrink-0 flex items-start py-2.5">
        <div className="w-4 flex-shrink-0" />
        <div className="w-20 flex-shrink-0 px-1">
          {hasFlavours ? (
            <select
              value={selectedFlavour}
              onChange={(e) => setSelectedFlavour(e.target.value)}
              className="w-full rounded border border-theme-2 bg-surface px-1 py-0.5 text-[10px] text-theme-2 outline-none"
            >
              {sizeVariants.map((sv) => (
                <option key={sv.id} value={sv.flavour ?? ""}>{sv.flavour || "Default"}</option>
              ))}
            </select>
          ) : <span className="text-[10px] text-theme-4">—</span>}
        </div>
        <span className="w-16 flex-shrink-0 px-1 text-center text-sm font-bold text-theme leading-[1.2rem]">{formatSize(variant.size)}</span>
        {visibility.showTotal ? (
          <div className="w-20 flex-shrink-0 flex flex-col items-center">
            <span className="text-xs font-semibold leading-[1.2rem] text-green-500">{formatCurrency(v.price)}</span>
            {effectiveMode === "subscription" && hasSubscription && variant.subscriptionPrice != null ? <span className="text-[10px] leading-tight text-red-400 whitespace-nowrap">-{formatCurrency(variant.singlePrice - variant.subscriptionPrice)} (-{Math.round(((variant.singlePrice - variant.subscriptionPrice) / variant.singlePrice) * 100)}%)</span> : null}
          </div>
        ) : null}
      </div>
      <div className="flex divide-x divide-theme">
        {visibility.showServing ? (
          <div className="flex-shrink-0 px-3 py-2.5 border-l border-theme">
            <div className="flex">
              <Stat className="w-16">{getServingsPerPack(variant) ?? "-"}</Stat>
              <Stat className="w-16" color="violet">{proteinPerServing !== null ? `${proteinPerServing.toFixed(1)}g` : "-"}</Stat>
              <Stat className="w-16" color="amber" calorieTag={calorieMode ? isLowest ? "lowest" : isHighest ? "highest" : undefined : undefined}>{caloriesPerServing !== null ? Math.round(caloriesPerServing) : "-"}</Stat>
              <Stat className="w-16" color="sky" bestValue={!calorieMode && bestServing}>{pricePerServing !== null ? formatCurrencyPrecise(pricePerServing) : "-"}</Stat>
            </div>
          </div>
        ) : null}
        {visibility.show100g ? (
          <div className="flex-shrink-0 px-3 py-2.5 border-l border-theme">
            <div className="flex">
              <Stat className="w-16" color="violet">{displayProteinPer100g !== null ? `${displayProteinPer100g}g` : "-"}</Stat>
              <Stat className="w-16" color="amber" calorieTag={calorieMode ? isLowest ? "lowest" : isHighest ? "highest" : undefined : undefined}>{calPer100g !== null ? calPer100g : "-"}</Stat>
              <Stat className="w-16" color="sky" bestValue={!calorieMode && best100g}>{formatCurrency(variant.pricePer100g)}</Stat>
            </div>
          </div>
        ) : null}
        {visibility.show1gProtein ? (
          <div className="flex-shrink-0 px-3 py-2.5 border-l border-theme">
            <div className="flex">
              <Stat className="w-16" color="amber" calorieTag={calorieMode ? isLowest ? "lowest" : isHighest ? "highest" : undefined : undefined}>{calPerGramProtein !== null ? calPerGramProtein.toFixed(2) : "-"}</Stat>
              <Stat className="w-16" color="sky" bestValue={!calorieMode && best1gProtein}>{pricePerGramProtein !== null ? formatCurrencyPrecise(pricePerGramProtein) : "-"}</Stat>
            </div>
          </div>
        ) : null}
        {showPlanner ? <div className="w-24 flex-shrink-0 px-3 py-2.5 text-right">{dailyCost !== null ? <span className="text-sm font-bold text-green-500">{formatCurrency(dailyCost)}</span> : <span className="text-theme-4">—</span>}{dailyCalories !== null ? <div className="text-[10px] text-amber-500/80">{Math.round(dailyCalories)} kcal</div> : null}</div> : null}
      </div>
    </div>
  );
}
