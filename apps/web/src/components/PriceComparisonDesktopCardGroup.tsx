"use client";

import { useEffect, useState } from "react";
import { CheckCircle, ChevronDown, ChevronUp, TrendingDown, TrendingUp, XCircle } from "lucide-react";
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
import { ProductPageLink, ProductThumbnail, formatCurrency } from "./price-comparison-table.utils";
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
}: Props) {
  const product = group.selected;
  const activeFlavour = product.flavour ?? "";
  const displayProteinPer100g = product.proteinPer100g;
  const hasAnySubscription = flavourVariants.some((v) => v.subscriptionPrice != null);
  const [localMode, setLocalMode] = useState<PriceMode>(priceMode);
  useEffect(() => { setLocalMode(priceMode); }, [priceMode]);
  const effectiveMode: PriceMode = hasAnySubscription ? localMode : "single";
  const isOverridden = hasAnySubscription && localMode !== priceMode;

  return (
    <tr className={clsx("transition-colors", calorieMode ? "hover-bg" : isBestValue ? "bg-green-500/5 hover:bg-green-500/10" : "hover-bg")}>
      <td colSpan={totalColumns} className="px-4 py-3">
        <div className="rounded-xl border border-theme overflow-hidden">
          <div className="flex">
            <div className="w-48 flex-shrink-0 flex flex-col items-center justify-center gap-2 px-3 py-3 border-r border-theme bg-surface-2">
              <div className="text-[10px] text-theme-3">{group.retailer}</div>
              <ProductThumbnail name={group.baseName} imageUrl={group.imageUrl} size="lg" />
              <div className="flex flex-col items-center gap-1 w-full">
                <a href={product.url} target="_blank" rel="noopener noreferrer sponsored" className="text-sm font-semibold text-theme hover:text-green-500 transition-colors leading-tight line-clamp-2 text-center">{group.baseName}</a>
                <div className="flex w-full items-center justify-between gap-1">
                  <button type="button" onClick={() => onToggleExpanded(group.id)} className="flex-shrink-0 p-1">{isExpanded ? <ChevronUp className="h-4 w-4 text-theme-4" /> : <ChevronDown className="h-4 w-4 text-theme-4" />}</button>
                  {activeFlavour ? <span className="flex-1 rounded bg-surface-3 px-1 py-0.5 text-[10px] text-theme-2 text-center">{activeFlavour}</span> : <span className="flex-1" />}
                  <button type="button" onClick={() => onToggleExpanded(group.id)} className="flex-shrink-0 p-1">{isExpanded ? <ChevronUp className="h-4 w-4 text-theme-4" /> : <ChevronDown className="h-4 w-4 text-theme-4" />}</button>
                </div>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <CardHeader visibility={visibility} showPlanner={showPlanner} proteinTarget={proteinTarget} showFilterBar={showFilterBar} filterOptions={filterOptions} filters={filters} onFilter={onFilter} hasAnySubscription={hasAnySubscription} effectiveMode={effectiveMode} onToggleMode={() => setLocalMode(m => m === "single" ? "subscription" : "single")} />
              {flavourVariants.map((variant, i) => (
                <CardVariantRow key={variant.id} variant={variant} effectiveMode={effectiveMode} isOverridden={isOverridden} calorieMode={calorieMode} calorieVariantIds={calorieVariantIds} visibility={visibility} bestValueVariantIds={bestValueVariantIds} displayProteinPer100g={displayProteinPer100g} showPlanner={showPlanner} proteinTarget={proteinTarget} planner={planner} bordered={i > 0} />
              ))}
            </div>
          </div>
        </div>
        {isExpanded ? (
          <div className={clsx("mt-3 rounded-xl px-4 py-3", calorieMode ? "bg-surface" : isBestValue ? "bg-green-500/5" : "bg-surface")}>
            <div className="space-y-3">
              {product.inStock ? <span className="flex items-center gap-1 text-green-500"><CheckCircle className="h-4 w-4 flex-shrink-0" /><span className="text-xs">In Stock</span></span> : <span className="flex items-center gap-1 text-red-500"><XCircle className="h-4 w-4 flex-shrink-0" /><span className="text-xs">Out of Stock</span></span>}
              <PriceComparisonExpandedDetails group={group} />
              <ProductPageLink slug={product.slug} />
            </div>
          </div>
        ) : null}
      </td>
    </tr>
  );
}

function CardHeader({ visibility, showPlanner, proteinTarget, showFilterBar, filterOptions, filters, onFilter, hasAnySubscription, effectiveMode, onToggleMode }: Omit<Props, "group" | "flavourVariants" | "bestValueVariantIds" | "isBestValue" | "isExpanded" | "onToggleExpanded" | "totalColumns" | "planner"> & { hasAnySubscription: boolean; effectiveMode: PriceMode; onToggleMode: () => void; }) {
  return (
    <div className="flex border-b border-theme bg-surface-2">
      <div className="w-44 flex-shrink-0 flex flex-col justify-end">
        {hasAnySubscription && visibility.showTotal ? (
          <div className="flex mb-0.5 pl-5">
            <span className="w-14 flex-shrink-0" />
            <div className="w-20 flex-shrink-0 flex justify-center">
              <div className="flex rounded overflow-hidden border border-theme-2 text-[10px] font-semibold">
                <button type="button" onClick={() => effectiveMode !== "single" && onToggleMode()} className={clsx("px-1.5 py-0.5 transition-colors", effectiveMode === "single" ? "bg-sky-700/60 text-sky-200" : "text-theme-3 hover:text-theme-2")}>1×</button>
                <button type="button" onClick={() => effectiveMode !== "subscription" && onToggleMode()} className={clsx("px-1.5 py-0.5 transition-colors border-l border-theme-2", effectiveMode === "subscription" ? "bg-sky-700/60 text-sky-200" : "text-theme-3 hover:text-theme-2")}>Sub</button>
              </div>
            </div>
          </div>
        ) : null}
        <div className="flex mb-1 pl-5">
          <span className="w-14 flex-shrink-0 text-center text-[10px] font-bold uppercase tracking-widest text-theme-3">Size</span>
          {visibility.showTotal ? <span className="w-20 flex-shrink-0 text-center text-[10px] font-bold uppercase tracking-widest text-green-500/80">Total</span> : null}
        </div>
        <div className="flex">
          <span className="w-5 flex-shrink-0" />
          <div className="w-14 flex-shrink-0 px-1 pb-1.5">{showFilterBar && filterOptions && onFilter ? <PriceComparisonFilterDropdown value={filters.size} options={filterOptions.sizes} numericValues={filterOptions.sizeGs} formatFn={(n) => { const match = filterOptions.sizes[filterOptions.sizeGs.indexOf(n)]; return match ? match.replace(/^(\d+\.\d+?)0+(kg|g)$/, "$1$2") : `${n}g`; }} numeric onChange={(v) => onFilter("size", v)} /> : null}</div>
          {visibility.showTotal ? <div className="w-20 flex-shrink-0 px-1 pb-1.5">{showFilterBar && filterOptions && onFilter ? <PriceComparisonFilterDropdown value={filters.price} options={filterOptions.prices} onChange={(v) => onFilter("price", v)} formatFn={(n) => `£${n.toFixed(2)}`} numeric /> : null}</div> : null}
        </div>
      </div>
      <div className="flex divide-x divide-theme">
        {visibility.showServing ? <MetricHeader title="Per serving" widths={["w-12", "w-14", "w-12", "w-16"]} labels={["servings", "protein", "kcal", "price"]} colors={["text-theme-3", "text-violet-500/60", "text-amber-500/60", "text-green-500/60"]} filters={showFilterBar && filterOptions && onFilter ? [<PriceComparisonFilterDropdown key="s1" value={filters.servings} options={filterOptions.servings} onChange={(v) => onFilter("servings", v)} formatFn={(n) => `${n}`} numeric />, <PriceComparisonFilterDropdown key="s2" value={filters.proteinPerServing} options={filterOptions.proteinPerServings} onChange={(v) => onFilter("proteinPerServing", v)} formatFn={(n) => `${n.toFixed(1)}g`} numeric />, <PriceComparisonFilterDropdown key="s3" value={filters.caloriesPerServing} options={filterOptions.caloriesPerServings} onChange={(v) => onFilter("caloriesPerServing", v)} formatFn={(n) => `${n}`} numeric />, <PriceComparisonFilterDropdown key="s4" value={filters.pricePerServing} options={filterOptions.pricePerServings} onChange={(v) => onFilter("pricePerServing", v)} formatFn={(n) => `£${n.toFixed(3)}`} numeric />] : undefined} /> : null}
        {visibility.show100g ? <MetricHeader title="Per 100g" widths={["w-14", "w-12", "w-16"]} labels={["protein", "kcal", "price"]} colors={["text-violet-500/60", "text-amber-500/60", "text-green-500/60"]} filters={showFilterBar && filterOptions && onFilter ? [<PriceComparisonFilterDropdown key="h1" value={filters.protein} options={filterOptions.proteins} onChange={(v) => onFilter("protein", v)} formatFn={(n) => `${n}g`} numeric />, <PriceComparisonFilterDropdown key="h2" value={filters.caloriesPer100g} options={filterOptions.caloriesPer100gs} onChange={(v) => onFilter("caloriesPer100g", v)} formatFn={(n) => `${n}`} numeric />, <PriceComparisonFilterDropdown key="h3" value={filters.pricePer100g} options={filterOptions.pricePer100gs} onChange={(v) => onFilter("pricePer100g", v)} formatFn={(n) => `£${n.toFixed(2)}`} numeric />] : undefined} /> : null}
        {visibility.show1gProtein ? <MetricHeader title="Per 1g protein" widths={["w-12", "w-16"]} labels={["kcal", "price"]} colors={["text-amber-500/60", "text-green-500/60"]} filters={showFilterBar && filterOptions && onFilter ? [<PriceComparisonFilterDropdown key="g1" value={filters.caloriesPerGramProtein} options={filterOptions.caloriesPerGramProteins} onChange={(v) => onFilter("caloriesPerGramProtein", v)} formatFn={(n) => n.toFixed(2)} numeric />, <PriceComparisonFilterDropdown key="g2" value={filters.pricePerGramProtein} options={filterOptions.pricePerGramProteins} onChange={(v) => onFilter("pricePerGramProtein", v)} formatFn={(n) => `£${n.toFixed(3)}`} numeric />] : undefined} /> : null}
        {showPlanner ? <div className="w-24 flex-shrink-0 px-3 pt-2 pb-1.5 border-l border-green-500/20 bg-green-500/5"><div className="text-[10px] font-bold uppercase tracking-widest text-green-500/80">{proteinTarget}g/day</div></div> : null}
      </div>
    </div>
  );
}

function MetricHeader({ title, widths, labels, colors, filters }: { title: string; widths: string[]; labels: string[]; colors: string[]; filters?: React.ReactNode[]; }) {
  return (
    <div className="flex-shrink-0 px-3 pt-2 pb-1.5 border-l border-theme">
      <div className="text-center text-[10px] font-bold uppercase tracking-widest text-theme-3 mb-1">{title}</div>
      <div className="flex text-[11px] mb-1">{labels.map((label, index) => <span key={label} className={`${widths[index]} text-center font-medium ${colors[index]}`}>{label}</span>)}</div>
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
        <div className="w-5 flex-shrink-0" />
        <span className="w-14 flex-shrink-0 px-1 text-center text-sm font-bold text-theme leading-[1.2rem]">{formatSize(variant.size)}</span>
        {visibility.showTotal ? (
          <div className="w-20 flex-shrink-0 flex flex-col items-center">
            <span className={clsx("text-xs font-semibold leading-[1.2rem]", calorieMode ? isLowest ? "text-amber-500" : isHighest ? "text-orange-500" : "text-green-500" : "text-green-500")}>{formatCurrency(v.price)}</span>
            {effectiveMode === "subscription" && hasSubscription && variant.subscriptionPrice != null ? <span className="text-[10px] leading-tight text-red-400 whitespace-nowrap">-{formatCurrency(variant.singlePrice - variant.subscriptionPrice)} (-{Math.round(((variant.singlePrice - variant.subscriptionPrice) / variant.singlePrice) * 100)}%)</span> : null}
          </div>
        ) : null}
      </div>
      <div className="flex divide-x divide-theme">
        {visibility.showServing ? (
          <div className="flex-shrink-0 px-3 py-2.5 border-l border-theme">
            <div className="flex">
              <Stat className="w-12">{getServingsPerPack(variant) ?? "-"}</Stat>
              <Stat className="w-14" color="violet">{proteinPerServing !== null ? `${proteinPerServing.toFixed(1)}g` : "-"}</Stat>
              <Stat className="w-12" color="amber" calorieTag={calorieMode ? isLowest ? "lowest" : isHighest ? "highest" : undefined : undefined}>{caloriesPerServing !== null ? Math.round(caloriesPerServing) : "-"}</Stat>
              <Stat className="w-16" color="sky" bestValue={!calorieMode && bestServing}>{pricePerServing !== null ? formatCurrencyPrecise(pricePerServing) : "-"}</Stat>
            </div>
          </div>
        ) : null}
        {visibility.show100g ? (
          <div className="flex-shrink-0 px-3 py-2.5 border-l border-theme">
            <div className="flex">
              <Stat className="w-14" color="violet">{displayProteinPer100g !== null ? `${displayProteinPer100g}g` : "-"}</Stat>
              <Stat className="w-12" color="amber" calorieTag={calorieMode ? isLowest ? "lowest" : isHighest ? "highest" : undefined : undefined}>{calPer100g !== null ? calPer100g : "-"}</Stat>
              <Stat className="w-16" color="sky" bestValue={!calorieMode && best100g}>{formatCurrency(variant.pricePer100g)}</Stat>
            </div>
          </div>
        ) : null}
        {visibility.show1gProtein ? (
          <div className="flex-shrink-0 px-3 py-2.5 border-l border-theme">
            <div className="flex">
              <Stat className="w-12" color="amber" calorieTag={calorieMode ? isLowest ? "lowest" : isHighest ? "highest" : undefined : undefined}>{calPerGramProtein !== null ? calPerGramProtein.toFixed(2) : "-"}</Stat>
              <Stat className="w-16" color="sky" bestValue={!calorieMode && best1gProtein}>{pricePerGramProtein !== null ? formatCurrencyPrecise(pricePerGramProtein) : "-"}</Stat>
            </div>
          </div>
        ) : null}
        {showPlanner ? <div className="w-24 flex-shrink-0 px-3 py-2.5 text-right">{dailyCost !== null ? <span className="text-sm font-bold text-green-500">{formatCurrency(dailyCost)}</span> : <span className="text-theme-4">—</span>}{dailyCalories !== null ? <div className="text-[10px] text-amber-500/80">{Math.round(dailyCalories)} kcal</div> : null}</div> : null}
      </div>
    </div>
  );
}
