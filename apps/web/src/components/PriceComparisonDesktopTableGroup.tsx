"use client";

import { Fragment, useEffect, useState } from "react";
import { CheckCircle, Tag, XCircle } from "lucide-react";
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
  BuyButton,
  formatCurrency,
  ProductPageLink,
  ProductThumbnail,
} from "./price-comparison-table.utils";
import { formatSize } from "./price-comparison-card.shared";
import { applyPriceMode, type PriceMode } from "./price-comparison-metrics";

interface Props {
  group: ProductGroupWithSelection;
  flavourVariants: ProductGroupWithSelection["variants"];
  bestValueVariantIds: Record<string, string | null>;
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
          visibility={visibility}
          isBestValue={isBestValue}
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
        <tr className={isBestValue ? "bg-green-950/10" : "bg-gray-900/70"}>
          <td colSpan={totalColumns} className="px-4 pb-5 pt-1">
            <div className="space-y-4">
              <div>
                {product.inStock ? (
                  <span className="flex items-center gap-1 text-green-400"><CheckCircle className="h-4 w-4 flex-shrink-0" /><span className="text-xs">In Stock</span></span>
                ) : (
                  <span className="flex items-center gap-1 text-red-400"><XCircle className="h-4 w-4 flex-shrink-0" /><span className="text-xs">Out of Stock</span></span>
                )}
              </div>
              <PriceComparisonExpandedDetails group={group} />
              <div className="mt-4"><ProductPageLink slug={product.slug} /></div>
            </div>
          </td>
        </tr>
      ) : null}
    </Fragment>
  );
}

function TableVariantRow({ variant, variantIndex, rowSpan, group, bestValueVariantIds, visibility, isBestValue, onToggleExpanded, showPlanner, proteinTarget, planner, columnGroupMode, displayProteinPer100g, priceMode }: {
  variant: ProductGroupWithSelection["selected"];
  variantIndex: number;
  rowSpan: number;
  group: ProductGroupWithSelection;
  bestValueVariantIds: Record<string, string | null>;
  visibility: Props["visibility"];
  isBestValue: boolean;
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
  const best100g = variant.id === bestValueVariantIds.pricePer100g;
  const bestServing = variant.id === bestValueVariantIds.pricePerServing;
  const best1gProtein = variant.id === bestValueVariantIds.pricePerGramProtein;
  const dailyCost = showPlanner ? getDailyCostForTarget(v, proteinTarget) : null;
  const dailyCalories = showPlanner && planner.calorieEnabled ? getDailyCaloriesForTarget(v, proteinTarget) : null;

  return (
    <tr className={clsx("transition-colors", isOverridden ? "bg-sky-950/30 hover:bg-sky-950/40" : isBestValue ? "bg-green-950/20 hover:bg-green-950/30" : "hover:bg-gray-800/60")}>
      {showPlanner ? (
        <td className="border-x border-green-500/10 bg-green-500/5 px-3 py-2 text-center text-sm font-semibold">
          {dailyCost !== null ? <span className="text-green-400">{formatCurrency(dailyCost)}</span> : <span className="text-gray-600">—</span>}
          {dailyCalories !== null ? <div className="mt-0.5 text-[11px] font-normal text-amber-400/80">{Math.round(dailyCalories)} kcal</div> : null}
        </td>
      ) : null}
      {isFirstRow ? (
        <>
          <td className="px-2 py-2 align-top" rowSpan={rowSpan}>
            <div className="flex items-start gap-2">
              <div className="flex flex-col items-center gap-2 flex-shrink-0">
                <ProductThumbnail name={group.baseName} imageUrl={group.imageUrl} />
                <BuyButton product={product} />
              </div>
              <button type="button" onClick={() => onToggleExpanded(group.id)} className="flex flex-col items-start gap-0.5 text-left pt-0.5">
                <div className="text-xs text-gray-500">{group.retailer}</div>
                <div className="text-sm font-medium leading-snug text-white transition-colors hover:text-green-300">{group.baseName}</div>
              </button>
            </div>
          </td>
          <td className="px-2 py-2 text-center align-top" rowSpan={rowSpan}>
            <div className="break-words text-sm font-medium text-white">{product.flavour || "Default"}</div>
          </td>
        </>
      ) : null}
      <td className="px-2 py-2 text-center text-sm font-medium text-white">
        <div className="flex flex-col items-center gap-0.5">
          <span>{formatSize(variant.size)}</span>
          {hasSubscription ? (
            <button type="button" onClick={() => setLocalMode(m => m === "single" ? "subscription" : "single")} className="text-[9px] font-semibold px-1 py-0.5 rounded transition-colors bg-sky-700/50 text-sky-200 hover:bg-sky-700/70">
              {effectiveMode === "subscription" ? "sub" : "1×"}
            </button>
          ) : null}
        </div>
      </td>
      {columnGroupMode === "nutrient" ? (
        <td className="px-2 py-2 text-center text-sm text-gray-400">{getServingsPerPack(v) ?? "-"}</td>
      ) : null}
      {columnGroupMode === "nutrient" ? (
        <>
          {visibility.show100g && isFirstRow ? <GroupedCell rowSpan={rowSpan}>{displayProteinPer100g !== null ? `${displayProteinPer100g}g` : "-"}</GroupedCell> : null}
          {visibility.showServing ? <GroupedCell>{formatProteinPerServing(v)}</GroupedCell> : null}
          {visibility.show100g && isFirstRow ? <CaloriesGroupedCell rowSpan={rowSpan}>{getCaloriesPer100g(product) !== null ? `${getCaloriesPer100g(product)}` : "-"}</CaloriesGroupedCell> : null}
          {visibility.showServing ? <CaloriesGroupedCell>{formatCaloriesPerServing(v)}</CaloriesGroupedCell> : null}
          {visibility.show1gProtein && isFirstRow ? <CaloriesGroupedCell rowSpan={rowSpan}>{getCaloriesPerGramProtein(product) !== null ? getCaloriesPerGramProtein(product)!.toFixed(2) : "-"}</CaloriesGroupedCell> : null}
          {visibility.showTotal ? <td className="border-x border-sky-400/10 bg-sky-400/5 px-2 py-2 text-center text-sm font-semibold text-white">{formatCurrency(v.price)}</td> : null}
          {visibility.show100g ? <PriceCell bestValue={best100g} value={formatCurrency(v.pricePer100g)} dimmed /> : null}
          {visibility.showServing ? <PriceCell bestValue={bestServing} value={getPricePerServing(v) !== null ? formatCurrencyPrecise(getPricePerServing(v)!) : null} dimmed /> : null}
          {visibility.show1gProtein ? <PriceCell bestValue={best1gProtein} value={getPricePerGramProtein(v) !== null ? formatCurrencyPrecise(getPricePerGramProtein(v)!) : null} dimmed /> : null}
        </>
      ) : (
        <>
          {visibility.showTotal ? <td className="border-x border-gray-700/50 bg-gray-800/60 px-2 py-2 text-center text-sm font-semibold text-white">{formatCurrency(v.price)}</td> : null}
          {visibility.showServing ? <td className="whitespace-nowrap border-x border-gray-700/50 bg-gray-800/60 px-2 py-2 text-center text-sm text-gray-300">{getServingsPerPack(v) ?? "-"}</td> : null}
          {visibility.showServing && isFirstRow ? <MeasureCell rowSpan={rowSpan} tone="violet">{formatProteinPerServing(v)}</MeasureCell> : null}
          {visibility.showServing && isFirstRow ? <MeasureCell rowSpan={rowSpan} tone="amber">{formatCaloriesPerServing(v)}</MeasureCell> : null}
          {visibility.showServing ? <PriceCell bestValue={bestServing} value={getPricePerServing(v) !== null ? formatCurrencyPrecise(getPricePerServing(v)!) : null} /> : null}
          {visibility.show100g && isFirstRow ? <MeasureCell rowSpan={rowSpan} tone="violet">{displayProteinPer100g !== null ? `${displayProteinPer100g}g` : "-"}</MeasureCell> : null}
          {visibility.show100g && isFirstRow ? <MeasureCell rowSpan={rowSpan} tone="amber">{getCaloriesPer100g(product) !== null ? `${getCaloriesPer100g(product)}` : "-"}</MeasureCell> : null}
          {visibility.show100g ? <PriceCell bestValue={best100g} value={formatCurrency(v.pricePer100g)} /> : null}
          {visibility.show1gProtein && isFirstRow ? <MeasureCell rowSpan={rowSpan} tone="amber">{getCaloriesPerGramProtein(product) !== null ? getCaloriesPerGramProtein(product)!.toFixed(2) : "-"}</MeasureCell> : null}
          {visibility.show1gProtein ? <PriceCell bestValue={best1gProtein} value={getPricePerGramProtein(v) !== null ? formatCurrencyPrecise(getPricePerGramProtein(v)!) : null} /> : null}
        </>
      )}
    </tr>
  );
}

function GroupedCell({ children, rowSpan }: { children: React.ReactNode; rowSpan?: number }) {
  return <td className="whitespace-nowrap border-x border-violet-400/10 bg-violet-400/5 px-2 py-2 text-center text-sm text-gray-300" rowSpan={rowSpan}>{children}</td>;
}

function CaloriesGroupedCell({ children, rowSpan }: { children: React.ReactNode; rowSpan?: number }) {
  return <td className="whitespace-nowrap border-x border-amber-500/10 bg-amber-500/5 px-2 py-2 text-center text-sm text-gray-300" rowSpan={rowSpan}>{children}</td>;
}

function MeasureCell({ children, rowSpan, tone }: { children: React.ReactNode; rowSpan?: number; tone: "violet" | "amber"; }) {
  return <td className={clsx("whitespace-nowrap border-x border-gray-700/50 bg-gray-800/60 px-2 py-2 text-center text-sm", tone === "violet" ? "text-violet-300" : "text-amber-300")} rowSpan={rowSpan}>{children}</td>;
}

function PriceCell({ bestValue, value, dimmed = false }: { bestValue: boolean; value: string | null; dimmed?: boolean; }) {
  const color = bestValue ? "text-green-400" : dimmed ? "text-gray-300" : "text-sky-300";
  const emptyColor = dimmed ? "text-gray-300" : "text-gray-500";
  return (
    <td className={clsx("px-2 py-2 text-center text-sm", dimmed ? "border-x border-sky-400/10 bg-sky-400/5" : "border-x border-gray-700/50 bg-gray-800/60")}>
      {value ? <span className="relative inline-block"><span className={clsx("font-semibold", color)}>{value}</span>{bestValue ? <Tag className="absolute -right-3.5 -top-1.5 h-3.5 w-3.5 text-green-400" aria-label="Best value" /> : null}</span> : <span className={emptyColor}>-</span>}
    </td>
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
