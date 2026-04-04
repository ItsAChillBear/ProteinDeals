"use client";

import { Fragment, useEffect, useState } from "react";
import { CheckCircle, ChevronDown, ChevronUp, Tag, TrendingDown, TrendingUp, XCircle } from "lucide-react";
import { clsx } from "clsx";
import PriceComparisonExpandedDetails from "./PriceComparisonExpandedDetails";
import type { ProductGroupWithSelection } from "./price-comparison-table.types";
import type { ColumnFilters } from "./price-comparison-filters";
import { formatCurrencyPrecise } from "./price-comparison-format";
import {
  getDailyCaloriesForTarget,
  getDailyCostForTarget,
  type ProteinPlannerState,
} from "./price-comparison-planner";
import type { ColumnVisibility } from "./price-comparison-visibility";
import {
  getCaloriesPerGramProtein,
  getCaloriesPerServing,
  getPricePerGramProtein,
  getPricePerServing,
  getProteinPerServing,
} from "./price-comparison-metrics";
import { getCaloriesPer100g, getServingsPerPack } from "./price-comparison-nutrition";
import {
  formatCurrency,
  ProductPageLink,
  ProductThumbnail,
} from "./price-comparison-table.utils";
import { formatSize } from "./price-comparison-card.shared";
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
  columnGroupMode: "nutrient" | "measure";
  displayProteinPer100g: number | null;
  priceMode?: PriceMode;
}

export default function PriceComparisonDesktopTableGroup({
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
  columnGroupMode,
  displayProteinPer100g,
  priceMode = "single",
}: Props) {
  const product = group.selected;

  return (
    <Fragment>
      {flavourVariants.map((variant, variantIndex) => (
        <TableVariantRow
          key={variant.id}
          variant={variant}
          variantIndex={variantIndex}
          rowSpan={flavourVariants.length}
          group={group}
          bestValueVariantIds={bestValueVariantIds}
          calorieMode={calorieMode}
          calorieVariantIds={calorieVariantIds}
          visibility={visibility}
          isBestValue={isBestValue}
          isExpanded={isExpanded}
          onToggleExpanded={onToggleExpanded}
          showPlanner={showPlanner}
          proteinTarget={proteinTarget}
          planner={planner}
          columnGroupMode={columnGroupMode}
          displayProteinPer100g={displayProteinPer100g}
          priceMode={priceMode}
        />
      ))}
      {isExpanded ? (
        <tr className={calorieMode ? "bg-surface" : isBestValue ? "bg-green-500/5" : "bg-surface"}>
          <td colSpan={totalColumns} className="px-4 pb-5 pt-1">
            <div className="space-y-4">
              <div>
                {product.inStock ? (
                  <span className="flex items-center gap-1 text-green-500"><CheckCircle className="h-4 w-4 flex-shrink-0" /><span className="text-xs">In Stock</span></span>
                ) : (
                  <span className="flex items-center gap-1 text-red-500"><XCircle className="h-4 w-4 flex-shrink-0" /><span className="text-xs">Out of Stock</span></span>
                )}
              </div>
              <PriceComparisonExpandedDetails group={group} />
              <ProductPageLink slug={product.slug} />
            </div>
          </td>
        </tr>
      ) : null}
    </Fragment>
  );
}

function TableVariantRow({ variant, variantIndex, rowSpan, group, bestValueVariantIds, calorieMode, calorieVariantIds, visibility, isBestValue, isExpanded, onToggleExpanded, showPlanner, proteinTarget, planner, columnGroupMode, displayProteinPer100g, priceMode }: {
  variant: ProductGroupWithSelection["selected"];
  variantIndex: number;
  rowSpan: number;
  group: ProductGroupWithSelection;
  bestValueVariantIds: Record<string, string[]>;
  calorieMode: boolean;
  calorieVariantIds: { lowest: string[]; highest: string[] };
  visibility: Props["visibility"];
  isBestValue: boolean;
  isExpanded: boolean;
  onToggleExpanded: (id: string) => void;
  showPlanner: boolean;
  proteinTarget: number;
  planner: ProteinPlannerState;
  columnGroupMode: "nutrient" | "measure";
  displayProteinPer100g: number | null;
  priceMode: PriceMode;
}) {
  const product = group.selected;
  const isFirstRow = variantIndex === 0;
  const hasSubscription = variant.subscriptionPrice != null;
  const [localMode, setLocalMode] = useState<PriceMode>(priceMode);
  useEffect(() => { setLocalMode(priceMode); }, [priceMode]);
  const effectiveMode: PriceMode = hasSubscription ? localMode : "single";
  const isOverridden = hasSubscription && localMode !== priceMode;
  const v = applyPriceMode(variant, effectiveMode);
  const best100g = bestValueVariantIds.pricePer100g?.includes(variant.id) ?? false;
  const bestServing = bestValueVariantIds.pricePerServing?.includes(variant.id) ?? false;
  const best1gProtein = bestValueVariantIds.pricePerGramProtein?.includes(variant.id) ?? false;
  const isLowestCalorie = calorieMode && calorieVariantIds.lowest.includes(variant.id);
  const isHighestCalorie = calorieMode && calorieVariantIds.highest.includes(variant.id);
  const dailyCost = showPlanner ? getDailyCostForTarget(v, proteinTarget) : null;
  const dailyCalories = showPlanner && planner.calorieEnabled ? getDailyCaloriesForTarget(v, proteinTarget) : null;

  const anyBestValue = best100g || bestServing || best1gProtein;
  const rowBg = isOverridden ? "bg-sky-500/10 hover:bg-sky-500/15" : "hover-bg";

  return (
    <tr className={clsx("transition-colors", rowBg)}>
      {showPlanner ? (
        <td className="border-x border-green-500/10 bg-green-500/5 px-3 py-2 text-center text-sm font-semibold">
          {dailyCost !== null ? <span className="text-green-500">{formatCurrency(dailyCost)}</span> : <span className="text-theme-4">—</span>}
          {dailyCalories !== null ? <div className="mt-0.5 text-[11px] font-normal text-amber-500/80">{Math.round(dailyCalories)} kcal</div> : null}
        </td>
      ) : null}
      {isFirstRow ? (
        <>
          <td className="px-2 py-2 align-middle" rowSpan={rowSpan}>
            <div className="flex items-center gap-2">
              <div className="flex flex-col items-center gap-1 flex-shrink-0">
                <ProductThumbnail name={group.baseName} imageUrl={group.imageUrl} />
                <button type="button" onClick={() => onToggleExpanded(group.id)} className="text-theme-4 hover:text-theme-2 transition-colors">
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
              </div>
              <div className="flex flex-col items-center gap-0.5 min-w-0 text-center">
                <div className="text-xs text-theme-3">{group.retailer}</div>
                <button type="button" onClick={() => onToggleExpanded(group.id)} className="text-sm font-medium leading-snug text-theme transition-colors hover:text-green-500 text-center">{group.baseName}</button>
              </div>
            </div>
          </td>
          <td className="px-2 py-2 text-center align-middle w-24 max-w-[96px]" rowSpan={rowSpan}>
            <div className="break-words text-sm font-medium text-theme">{product.flavour || "Default"}</div>
          </td>
        </>
      ) : null}
      <td className="px-2 py-2 text-center text-sm font-medium text-theme">
        {formatSize(variant.size)}
      </td>
      {columnGroupMode === "nutrient" ? (
        <td className="px-2 py-2 text-center text-sm text-theme-3">{getServingsPerPack(v) ?? "-"}</td>
      ) : null}
      {columnGroupMode === "nutrient" ? (
        <>
          {visibility.show100g && isFirstRow ? <GroupedCell rowSpan={rowSpan}>{displayProteinPer100g !== null ? `${displayProteinPer100g}g` : "-"}</GroupedCell> : null}
          {visibility.showServing ? <GroupedCell>{formatProteinPerServing(v)}</GroupedCell> : null}
          {visibility.show100g && isFirstRow ? <CaloriesGroupedCell rowSpan={rowSpan} isLowest={isLowestCalorie} isHighest={isHighestCalorie}>{getCaloriesPer100g(product) !== null ? `${getCaloriesPer100g(product)}` : "-"}</CaloriesGroupedCell> : null}
          {visibility.showServing ? <CaloriesGroupedCell isLowest={isLowestCalorie} isHighest={isHighestCalorie}>{formatCaloriesPerServing(v)}</CaloriesGroupedCell> : null}
          {visibility.show1gProtein && isFirstRow ? <CaloriesGroupedCell rowSpan={rowSpan} isLowest={isLowestCalorie} isHighest={isHighestCalorie}>{getCaloriesPerGramProtein(product) !== null ? getCaloriesPerGramProtein(product)!.toFixed(2) : "-"}</CaloriesGroupedCell> : null}
          {visibility.showTotal ? <td className="border-x border-green-500/10 bg-green-500/5 px-2 py-2 text-center text-sm font-semibold text-green-500 align-top"><TotalCell price={formatCurrency(v.price)} hasSubscription={hasSubscription} effectiveMode={effectiveMode} onToggle={() => setLocalMode(m => m === "single" ? "subscription" : "single")} saving={effectiveMode === "subscription" && variant.subscriptionPrice != null ? { amount: formatCurrency(variant.singlePrice - variant.subscriptionPrice), pct: Math.round(((variant.singlePrice - variant.subscriptionPrice) / variant.singlePrice) * 100) } : null} /></td> : null}
          {visibility.show100g ? <PriceCell bestValue={!calorieMode && best100g} value={formatCurrency(v.pricePer100g)} dimmed /> : null}
          {visibility.showServing ? <PriceCell bestValue={!calorieMode && bestServing} value={getPricePerServing(v) !== null ? formatCurrencyPrecise(getPricePerServing(v)!) : null} dimmed /> : null}
          {visibility.show1gProtein ? <PriceCell bestValue={!calorieMode && best1gProtein} value={getPricePerGramProtein(v) !== null ? formatCurrencyPrecise(getPricePerGramProtein(v)!) : null} dimmed /> : null}
        </>
      ) : (
        <>
          {visibility.showTotal ? <td className="border-x border-green-500/10 bg-green-500/5 px-2 py-2 text-center text-sm font-semibold text-green-500 align-top"><TotalCell price={formatCurrency(v.price)} hasSubscription={hasSubscription} effectiveMode={effectiveMode} onToggle={() => setLocalMode(m => m === "single" ? "subscription" : "single")} saving={effectiveMode === "subscription" && variant.subscriptionPrice != null ? { amount: formatCurrency(variant.singlePrice - variant.subscriptionPrice), pct: Math.round(((variant.singlePrice - variant.subscriptionPrice) / variant.singlePrice) * 100) } : null} /></td> : null}
          {visibility.showServing ? <td className="whitespace-nowrap border-l border-theme px-2 py-2 text-center text-sm text-theme-2">{getServingsPerPack(v) ?? "-"}</td> : null}
          {visibility.showServing && isFirstRow ? <MeasureCell rowSpan={rowSpan} tone="violet">{formatProteinPerServing(v)}</MeasureCell> : null}
          {visibility.showServing && isFirstRow ? <MeasureCell rowSpan={rowSpan} tone="amber" isLowest={isLowestCalorie} isHighest={isHighestCalorie}>{formatCaloriesPerServing(v)}</MeasureCell> : null}
          {visibility.showServing ? <PriceCell bestValue={!calorieMode && bestServing} value={getPricePerServing(v) !== null ? formatCurrencyPrecise(getPricePerServing(v)!) : null} sectionEnd /> : null}
          {visibility.show100g && isFirstRow ? <MeasureCell rowSpan={rowSpan} tone="violet" sectionStart>{displayProteinPer100g !== null ? `${displayProteinPer100g}g` : "-"}</MeasureCell> : null}
          {visibility.show100g && isFirstRow ? <MeasureCell rowSpan={rowSpan} tone="amber" isLowest={isLowestCalorie} isHighest={isHighestCalorie}>{getCaloriesPer100g(product) !== null ? `${getCaloriesPer100g(product)}` : "-"}</MeasureCell> : null}
          {visibility.show100g ? <PriceCell bestValue={!calorieMode && best100g} value={formatCurrency(v.pricePer100g)} sectionEnd /> : null}
          {visibility.show1gProtein && isFirstRow ? <MeasureCell rowSpan={rowSpan} tone="amber" isLowest={isLowestCalorie} isHighest={isHighestCalorie} sectionStart>{getCaloriesPerGramProtein(product) !== null ? getCaloriesPerGramProtein(product)!.toFixed(2) : "-"}</MeasureCell> : null}
          {visibility.show1gProtein ? <PriceCell bestValue={!calorieMode && best1gProtein} value={getPricePerGramProtein(v) !== null ? formatCurrencyPrecise(getPricePerGramProtein(v)!) : null} sectionEnd /> : null}
        </>
      )}
    </tr>
  );
}

function GroupedCell({ children, rowSpan }: { children: React.ReactNode; rowSpan?: number }) {
  return <td className="whitespace-nowrap border-x border-violet-400/20 bg-violet-400/5 px-2 py-2 text-center text-sm text-violet-500" rowSpan={rowSpan}>{children}</td>;
}

function CaloriesGroupedCell({ children, rowSpan, isLowest, isHighest }: { children: React.ReactNode; rowSpan?: number; isLowest?: boolean; isHighest?: boolean; }) {
  const color = isLowest ? "text-amber-500" : isHighest ? "text-orange-500" : "text-amber-500";
  const cellBg = isLowest ? "bg-amber-500/15" : isHighest ? "bg-orange-500/15" : "bg-amber-500/5";
  return (
    <td className={clsx("whitespace-nowrap border-x border-amber-500/20 px-2 py-2 text-center text-sm", cellBg)} rowSpan={rowSpan}>
      <span className="relative inline-block">
        <span className={color}>{children}</span>
        {isLowest ? <TrendingDown className="absolute -right-4 -top-1.5 h-3.5 w-3.5 text-amber-500" aria-label="Lowest calorie" /> : null}
        {isHighest ? <TrendingUp className="absolute -right-4 -top-1.5 h-3.5 w-3.5 text-orange-500" aria-label="Highest calorie" /> : null}
      </span>
    </td>
  );
}

function MeasureCell({ children, rowSpan, tone, isLowest, isHighest, sectionStart }: { children: React.ReactNode; rowSpan?: number; tone: "violet" | "amber"; isLowest?: boolean; isHighest?: boolean; sectionStart?: boolean; }) {
  const color = tone === "violet"
    ? "text-violet-500"
    : isLowest ? "text-amber-500" : isHighest ? "text-orange-500" : "text-amber-500";
  const cellBg = tone === "amber"
    ? isLowest ? "bg-amber-500/15" : isHighest ? "bg-orange-500/15" : ""
    : "";
  return (
    <td className={clsx("whitespace-nowrap px-2 py-2 text-center text-sm", sectionStart ? "border-l border-theme" : "", color, cellBg)} rowSpan={rowSpan}>
      {tone === "amber" && (isLowest || isHighest) ? (
        <span className="relative inline-block">
          {children}
          {isLowest ? <TrendingDown className="absolute -right-4 -top-1.5 h-3.5 w-3.5 text-amber-500" aria-label="Lowest calorie" /> : null}
          {isHighest ? <TrendingUp className="absolute -right-4 -top-1.5 h-3.5 w-3.5 text-orange-500" aria-label="Highest calorie" /> : null}
        </span>
      ) : children}
    </td>
  );
}

function PriceCell({ bestValue, value, dimmed = false, sectionEnd = false }: { bestValue: boolean; value: string | null; dimmed?: boolean; sectionEnd?: boolean; }) {
  const emptyColor = dimmed ? "text-theme-2" : "text-theme-3";
  const cellBg = dimmed
    ? bestValue ? "border-x border-green-500/30 bg-green-500/15" : "border-x border-green-500/10 bg-green-500/5"
    : bestValue ? "bg-green-500/15" : "";
  return (
    <td className={clsx("px-2 py-2 text-center text-sm", cellBg, !dimmed && sectionEnd ? "border-r border-theme" : "")}>
      {value ? (
        <span className="relative inline-block">
          <span className="font-semibold text-green-500">{value}</span>
          {bestValue ? <Tag className="absolute -right-3.5 -top-1.5 h-3.5 w-3.5 text-green-500" aria-label="Best value" /> : null}
        </span>
      ) : <span className={emptyColor}>-</span>}
    </td>
  );
}

function TotalCell({ price, hasSubscription, effectiveMode, onToggle, saving }: { price: string; hasSubscription: boolean; effectiveMode: PriceMode; onToggle: () => void; saving: { amount: string; pct: number } | null; }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      {hasSubscription ? (
        <div className="flex rounded overflow-hidden border border-sky-700/50 text-[10px] font-semibold mb-0.5">
          <button type="button" onClick={() => effectiveMode !== "single" && onToggle()} className={clsx("px-1.5 py-0.5 transition-colors", effectiveMode === "single" ? "bg-sky-700/60 text-sky-200" : "text-theme-3 hover:text-theme-2")}>1×</button>
          <button type="button" onClick={() => effectiveMode !== "subscription" && onToggle()} className={clsx("px-1.5 py-0.5 transition-colors border-l border-sky-700/50", effectiveMode === "subscription" ? "bg-sky-700/60 text-sky-200" : "text-theme-3 hover:text-theme-2")}>Sub</button>
        </div>
      ) : null}
      <span>{price}</span>
      {saving ? <span className="text-xs font-normal text-red-400 whitespace-nowrap">-{saving.amount} (-{saving.pct}%)</span> : null}
    </div>
  );
}

function formatProteinPerServing(variant: ProductGroupWithSelection["selected"]) {
  const proteinPerServing = getProteinPerServing(variant);
  return proteinPerServing !== null ? `${proteinPerServing.toFixed(1)}g` : "-";
}

function formatCaloriesPerServing(variant: ProductGroupWithSelection["selected"]) {
  const caloriesPerServing = getCaloriesPerServing(variant);
  return caloriesPerServing !== null ? Math.round(caloriesPerServing).toString() : "-";
}
