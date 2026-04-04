"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Tag, TrendingDown, TrendingUp } from "lucide-react";
import { clsx } from "clsx";
import PriceComparisonExpandedDetails from "./PriceComparisonExpandedDetails";
import type { ProductGroupWithSelection, SortKey } from "./price-comparison-table.types";
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
  flavourMode?: "separate" | "consolidate";
  sortKey?: SortKey;
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
  flavourMode = "separate",
  sortKey,
}: Props) {
  const product = group.selected;

  // In consolidate mode, group variants by size and render one row per size
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

  if (flavourMode === "consolidate" && variantsBySize) {
    const sizeEntries = Array.from(variantsBySize.entries());
    return (
      <Fragment>
        {sizeEntries.map(([size, sizeVariants], sizeIndex) => (
          <ConsolidatedTableRow
            key={size}
            sizeVariants={sizeVariants}
            sizeIndex={sizeIndex}
            totalSizes={sizeEntries.length}
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
            sortKey={sortKey}
          />
        ))}
        {isExpanded ? (
          <tr className={calorieMode ? "bg-surface" : isBestValue ? "bg-green-500/5" : "bg-surface"}>
            <td colSpan={totalColumns + 1} className="px-4 pb-5 pt-1">
              <div className="space-y-4">
                <PriceComparisonExpandedDetails group={group} />
                <ProductPageLink slug={product.slug} />
              </div>
            </td>
          </tr>
        ) : null}
      </Fragment>
    );
  }

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
              <PriceComparisonExpandedDetails group={group} />
              <ProductPageLink slug={product.slug} />
            </div>
          </td>
        </tr>
      ) : null}
    </Fragment>
  );
}

function ConsolidatedTableRow({ sizeVariants, sizeIndex, totalSizes, group, bestValueVariantIds, calorieMode, calorieVariantIds, visibility, isBestValue, isExpanded, onToggleExpanded, showPlanner, proteinTarget, planner, columnGroupMode, displayProteinPer100g, priceMode, sortKey }: {
  sizeVariants: ProductGroupWithSelection["variants"];
  sizeIndex: number;
  totalSizes: number;
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
  sortKey?: SortKey;
}) {
  const isFirstRow = sizeIndex === 0;
  const hasFlavours = sizeVariants.some((v) => v.flavour);

  // Pick the best flavour for the current sort key
  const bestVariant = useMemo(() => {
    if (sizeVariants.length <= 1) return sizeVariants[0];
    const getVal = (v: ProductGroupWithSelection["variants"][0]): number => {
      if (sortKey === "pricePerServing") return getPricePerServing(v) ?? Infinity;
      if (sortKey === "pricePerGramProtein") return getPricePerGramProtein(v) ?? Infinity;
      if (sortKey === "caloriesPerServing") return getCaloriesPerServing(v) ?? Infinity;
      if (sortKey === "caloriesPer100g") return getCaloriesPer100g(v) ?? Infinity;
      if (sortKey === "caloriesPerGramProtein") return getCaloriesPerGramProtein(v) ?? Infinity;
      if (sortKey === "proteinPerServing") return -(getProteinPerServing(v) ?? 0);
      if (sortKey === "proteinPer100g") return -(v.proteinPer100g ?? 0);
      return v.pricePer100g;
    };
    return [...sizeVariants].sort((a, b) => getVal(a) - getVal(b))[0];
  }, [sizeVariants, sortKey]);

  const [selectedFlavour, setSelectedFlavour] = useState<string>(bestVariant?.flavour ?? "");
  useEffect(() => {
    if (bestVariant) setSelectedFlavour(bestVariant.flavour ?? "");
  }, [bestVariant]);

  const variant = sizeVariants.find((v) => (v.flavour ?? "") === selectedFlavour) ?? sizeVariants[0];
  if (!variant) return null;

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
          <td className="w-6 px-1 text-center align-middle" rowSpan={totalSizes}>
            <button type="button" onClick={() => onToggleExpanded(group.id)} className="text-theme-4 hover:text-theme-2 transition-colors">
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </td>
          <td className="px-2 py-2 align-middle" rowSpan={totalSizes}>
            <div className="flex items-center gap-2">
              <ProductThumbnail name={group.baseName} imageUrl={group.imageUrl} />
              <div className="flex flex-col items-center gap-0.5 min-w-0 text-center">
                <div className="text-xs font-medium text-theme-2">{group.retailer}</div>
                <span className="text-sm font-semibold leading-tight text-theme text-center">{group.baseName}</span>
              </div>
            </div>
          </td>
        </>
      ) : null}
      <td className="px-2 py-2 text-center align-middle w-24 max-w-[96px]">
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
        ) : (
          <div className="break-words rounded bg-surface-3 px-1 py-0.5 text-[10px] text-theme-2">{variant.flavour || "Default"}</div>
        )}
      </td>
      <td className="px-2 py-2 text-center text-sm font-bold text-theme">
        {formatSize(variant.size)}
      </td>
      {columnGroupMode === "nutrient" ? (
        <td className="px-2 py-2 text-center text-[12px] font-medium text-theme-2">{getServingsPerPack(v) ?? "-"}</td>
      ) : null}
      {columnGroupMode === "nutrient" ? (
        <>
          {visibility.show100g ? <GroupedCell>{displayProteinPer100g !== null ? `${displayProteinPer100g}g` : "-"}</GroupedCell> : null}
          {visibility.showServing ? <GroupedCell>{formatProteinPerServing(v)}</GroupedCell> : null}
          {visibility.show100g ? <CaloriesGroupedCell isLowest={isLowestCalorie} isHighest={isHighestCalorie}>{getCaloriesPer100g(variant) !== null ? `${getCaloriesPer100g(variant)}` : "-"}</CaloriesGroupedCell> : null}
          {visibility.showServing ? <CaloriesGroupedCell isLowest={isLowestCalorie} isHighest={isHighestCalorie}>{formatCaloriesPerServing(v)}</CaloriesGroupedCell> : null}
          {visibility.show1gProtein ? <CaloriesGroupedCell isLowest={isLowestCalorie} isHighest={isHighestCalorie}>{getCaloriesPerGramProtein(variant) !== null ? getCaloriesPerGramProtein(variant)!.toFixed(2) : "-"}</CaloriesGroupedCell> : null}
          {visibility.showTotal ? <td className="border-x border-green-500/10 bg-green-500/5 px-2 py-2 text-center text-sm font-semibold text-green-500 align-top"><TotalCell price={formatCurrency(v.price)} hasSubscription={hasSubscription} effectiveMode={effectiveMode} onToggle={() => setLocalMode(m => m === "single" ? "subscription" : "single")} saving={effectiveMode === "subscription" && variant.subscriptionPrice != null ? { amount: formatCurrency(variant.singlePrice - variant.subscriptionPrice), pct: Math.round(((variant.singlePrice - variant.subscriptionPrice) / variant.singlePrice) * 100) } : null} /></td> : null}
          {visibility.show100g ? <PriceCell bestValue={!calorieMode && best100g} value={formatCurrency(v.pricePer100g)} dimmed /> : null}
          {visibility.showServing ? <PriceCell bestValue={!calorieMode && bestServing} value={getPricePerServing(v) !== null ? formatCurrencyPrecise(getPricePerServing(v)!) : null} dimmed /> : null}
          {visibility.show1gProtein ? <PriceCell bestValue={!calorieMode && best1gProtein} value={getPricePerGramProtein(v) !== null ? formatCurrencyPrecise(getPricePerGramProtein(v)!) : null} dimmed /> : null}
        </>
      ) : (
        <>
          {visibility.showTotal ? <td className="border-x border-green-500/10 bg-green-500/5 px-2 py-2 text-center text-sm font-semibold text-green-500 align-top"><TotalCell price={formatCurrency(v.price)} hasSubscription={hasSubscription} effectiveMode={effectiveMode} onToggle={() => setLocalMode(m => m === "single" ? "subscription" : "single")} saving={effectiveMode === "subscription" && variant.subscriptionPrice != null ? { amount: formatCurrency(variant.singlePrice - variant.subscriptionPrice), pct: Math.round(((variant.singlePrice - variant.subscriptionPrice) / variant.singlePrice) * 100) } : null} /></td> : null}
          {visibility.showServing ? <td className="whitespace-nowrap border-l border-theme px-2 py-2 text-center text-sm text-theme-2">{getServingsPerPack(v) ?? "-"}</td> : null}
          {visibility.showServing ? <MeasureCell tone="violet">{formatProteinPerServing(v)}</MeasureCell> : null}
          {visibility.showServing ? <MeasureCell tone="amber" isLowest={isLowestCalorie} isHighest={isHighestCalorie}>{formatCaloriesPerServing(v)}</MeasureCell> : null}
          {visibility.showServing ? <PriceCell bestValue={!calorieMode && bestServing} value={getPricePerServing(v) !== null ? formatCurrencyPrecise(getPricePerServing(v)!) : null} sectionEnd /> : null}
          {visibility.show100g ? <MeasureCell tone="violet" sectionStart>{displayProteinPer100g !== null ? `${displayProteinPer100g}g` : "-"}</MeasureCell> : null}
          {visibility.show100g ? <MeasureCell tone="amber" isLowest={isLowestCalorie} isHighest={isHighestCalorie}>{getCaloriesPer100g(variant) !== null ? `${getCaloriesPer100g(variant)}` : "-"}</MeasureCell> : null}
          {visibility.show100g ? <PriceCell bestValue={!calorieMode && best100g} value={formatCurrency(v.pricePer100g)} sectionEnd /> : null}
          {visibility.show1gProtein ? <MeasureCell tone="amber" isLowest={isLowestCalorie} isHighest={isHighestCalorie} sectionStart>{getCaloriesPerGramProtein(variant) !== null ? getCaloriesPerGramProtein(variant)!.toFixed(2) : "-"}</MeasureCell> : null}
          {visibility.show1gProtein ? <PriceCell bestValue={!calorieMode && best1gProtein} value={getPricePerGramProtein(v) !== null ? formatCurrencyPrecise(getPricePerGramProtein(v)!) : null} sectionEnd /> : null}
        </>
      )}
    </tr>
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
                <div className="text-xs font-medium text-theme-2">{group.retailer}</div>
                <button type="button" onClick={() => onToggleExpanded(group.id)} className="text-sm font-semibold leading-tight text-theme transition-colors hover:text-green-500 text-center">{group.baseName}</button>
              </div>
            </div>
          </td>
          <td className="px-2 py-2 text-center align-middle w-24 max-w-[96px]" rowSpan={rowSpan}>
            <div className="break-words rounded bg-surface-3 px-1 py-0.5 text-[10px] text-theme-2">{product.flavour || "Default"}</div>
          </td>
        </>
      ) : null}
      <td className="px-2 py-2 text-center text-sm font-bold text-theme">
        {formatSize(variant.size)}
      </td>
      {columnGroupMode === "nutrient" ? (
        <td className="px-2 py-2 text-center text-[12px] font-medium text-theme-2">{getServingsPerPack(v) ?? "-"}</td>
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
  return <td className="whitespace-nowrap border-x border-violet-400/20 bg-violet-400/5 px-2 py-2 text-center text-[12px] font-medium text-violet-500" rowSpan={rowSpan}>{children}</td>;
}

function CaloriesGroupedCell({ children, rowSpan, isLowest, isHighest }: { children: React.ReactNode; rowSpan?: number; isLowest?: boolean; isHighest?: boolean; }) {
  const color = isLowest ? "text-amber-500" : isHighest ? "text-orange-500" : "text-amber-500";
  const cellBg = isLowest ? "bg-amber-500/15" : isHighest ? "bg-orange-500/15" : "bg-amber-500/5";
  return (
    <td className={clsx("whitespace-nowrap border-x border-amber-500/20 px-2 py-2 text-center text-[12px] font-medium", cellBg)} rowSpan={rowSpan}>
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
    <td className={clsx("whitespace-nowrap px-2 py-2 text-center text-[12px] font-medium", sectionStart ? "border-l border-theme" : "", color, cellBg)} rowSpan={rowSpan}>
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
    <td className={clsx("px-2 py-2 text-center text-[12px] font-medium", cellBg, !dimmed && sectionEnd ? "border-r border-theme" : "")}>
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
      <span className="text-xs font-semibold">{price}</span>
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
