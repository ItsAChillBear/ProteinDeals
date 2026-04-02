"use client";

import { Fragment } from "react";
import { CheckCircle, ChevronDown, ChevronUp, Tag, XCircle } from "lucide-react";
import { clsx } from "clsx";
import PriceComparisonExpandedDetails from "./PriceComparisonExpandedDetails";
import type { ProductGroupWithSelection } from "./price-comparison-table.types";
import { matchesRange, RANGE_PREFIX, type ColumnFilters } from "./price-comparison-filters";
import { formatCurrencyPrecise } from "./price-comparison-format";
import { getDailyCaloriesForTarget, getDailyCostForTarget, plannerMatchesVariant, type ProteinPlannerState } from "./price-comparison-planner";
import type { ColumnVisibility } from "./price-comparison-visibility";
import {
  getCaloriesPerGramProtein,
  getCaloriesPerServing,
  getPricePerGramProtein,
  getPricePerServing,
  getProteinPerServing,
} from "./price-comparison-metrics";
import { getCaloriesPer100g } from "./price-comparison-nutrition";
import {
  BuyButton,
  formatCurrency,
  getDisplayProteinPer100g,
  getVariantsForFlavour,
  ProductPageLink,
  ProductThumbnail,
} from "./price-comparison-table.utils";

export function PriceComparisonDesktopRowGroup({
  group,
  bestValueVariantId,
  filters,
  planner,
  visibility,
  isExpanded,
  onToggleExpanded,
}: {
  group: ProductGroupWithSelection;
  bestValueVariantId: string | null;
  filters: ColumnFilters;
  planner: ProteinPlannerState;
  visibility: ColumnVisibility;
  isExpanded: boolean;
  onToggleExpanded: (groupId: string) => void;
}) {
  const product = group.selected;
  const activeFlavour = filters.flavour !== "all" ? filters.flavour : product.flavour ?? "";
  const flavourVariants = getVariantsForFlavour(group, activeFlavour).filter((variant) =>
    matchesVariantFilters(variant, filters) && plannerMatchesVariant(variant, planner)
  );

  if (!flavourVariants.length) return null;

  const displayProteinPer100g = getDisplayProteinPer100g(product, flavourVariants);
  const isBestValue =
    product.inStock &&
    bestValueVariantId !== null &&
    flavourVariants.some((variant) => variant.id === bestValueVariantId);

  return (
    <Fragment>
      {flavourVariants.map((variant, variantIndex) => {
        const isFirstRow = variantIndex === 0;
        const rowSpan = flavourVariants.length;
        const variantBestValue = variant.id === bestValueVariantId;

        const proteinTarget = Number(planner.proteinTarget);
        const dailyCost = planner.committed && proteinTarget > 0
          ? getDailyCostForTarget(variant, proteinTarget)
          : null;
        const dailyCalories = planner.committed && proteinTarget > 0 && planner.calorieEnabled
          ? getDailyCaloriesForTarget(variant, proteinTarget)
          : null;

        return (
          <tr
            key={variant.id}
            className={clsx(
              "transition-colors",
              isBestValue ? "bg-green-950/20 hover:bg-green-950/30" : "hover:bg-gray-800/60"
            )}
          >
            {planner.committed && proteinTarget > 0 ? (
              <td className="border-x border-green-500/10 bg-green-500/5 px-3 py-2 text-center text-sm font-semibold">
                {dailyCost !== null ? (
                  <span className="text-green-400">{formatCurrency(dailyCost)}</span>
                ) : (
                  <span className="text-gray-600">—</span>
                )}
                {dailyCalories !== null ? (
                  <div className="mt-0.5 text-[11px] font-normal text-amber-400/80">
                    {Math.round(dailyCalories)} kcal
                  </div>
                ) : null}
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
                    <button
                      type="button"
                      onClick={() => onToggleExpanded(group.id)}
                      className="flex flex-col items-start gap-0.5 text-left pt-0.5"
                    >
                      <div className="text-xs text-gray-500">{group.retailer}</div>
                      <div className="text-sm font-medium leading-snug text-white transition-colors hover:text-green-300">
                        {group.baseName}
                      </div>
                    </button>
                  </div>
                </td>
                <td className="px-2 py-2 text-center align-top" rowSpan={rowSpan}>
                  <div className="break-words text-sm font-medium text-white">{activeFlavour || "Default"}</div>
                </td>
              </>
            ) : null}
            <td className="px-2 py-2 text-center text-sm font-medium text-white">{variant.size}</td>
            <td className="px-2 py-2 text-center text-sm text-gray-400">
              {variant.servings ? `${variant.servings}` : "-"}
            </td>
            {visibility.show100g && isFirstRow ? (
              <td className="whitespace-nowrap border-x border-violet-400/10 bg-violet-400/5 px-2 py-2 text-center text-sm text-gray-300" rowSpan={rowSpan}>
                {displayProteinPer100g !== null ? `${displayProteinPer100g}g` : "-"}
              </td>
            ) : null}
            {visibility.showServing ? (
              <td className="whitespace-nowrap border-x border-violet-400/10 bg-violet-400/5 px-2 py-2 text-center text-sm text-gray-300">
                {(() => { const p = getProteinPerServing(variant); return p !== null ? `${p.toFixed(1)}g` : "-"; })()}
              </td>
            ) : null}
            {visibility.show100g && isFirstRow ? (
              <td className="whitespace-nowrap border-x border-amber-500/10 bg-amber-500/5 px-2 py-2 text-center text-sm text-gray-300" rowSpan={rowSpan}>
                {getCaloriesPer100g(product) !== null ? `${getCaloriesPer100g(product)}` : "-"}
              </td>
            ) : null}
            {visibility.showServing ? (
              <td className="whitespace-nowrap border-x border-amber-500/10 bg-amber-500/5 px-2 py-2 text-center text-sm text-gray-300">
                {(() => { const c = getCaloriesPerServing(variant); return c !== null ? Math.round(c).toString() : "-"; })()}
              </td>
            ) : null}
            {visibility.show1gProtein && isFirstRow ? (
              <td className="whitespace-nowrap border-x border-amber-500/10 bg-amber-500/5 px-2 py-2 text-center text-sm text-gray-300" rowSpan={rowSpan}>
                {getCaloriesPerGramProtein(product) !== null
                  ? getCaloriesPerGramProtein(product)!.toFixed(2)
                  : "-"}
              </td>
            ) : null}
            {visibility.showTotal ? (
              <td className="border-x border-sky-400/10 bg-sky-400/5 px-2 py-2 text-center text-sm font-semibold text-white">
                {formatCurrency(variant.price)}
              </td>
            ) : null}
            {visibility.show100g ? (
              <td className="border-x border-sky-400/10 bg-sky-400/5 px-2 py-2 text-center text-sm">
                <div className="inline-flex items-center gap-1">
                  <span className={clsx("font-semibold", variantBestValue ? "text-green-400" : "text-gray-300")}>
                    {formatCurrency(variant.pricePer100g)}
                  </span>
                  {variantBestValue ? (
                    <Tag className="h-3.5 w-3.5 text-green-400" aria-label="Best value" />
                  ) : null}
                </div>
              </td>
            ) : null}
            {visibility.showServing ? (
              <td className="border-x border-sky-400/10 bg-sky-400/5 px-2 py-2 text-center text-sm">
                {getPricePerServing(variant) !== null ? (
                  <div className="inline-flex items-center gap-1">
                    <span className={clsx("font-semibold", variantBestValue ? "text-green-400" : "text-gray-300")}>
                      {formatCurrencyPrecise(getPricePerServing(variant)!)}
                    </span>
                    {variantBestValue ? <Tag className="h-3.5 w-3.5 text-green-400" aria-label="Best value" /> : null}
                  </div>
                ) : (
                  <span className="text-gray-300">-</span>
                )}
              </td>
            ) : null}
            {visibility.show1gProtein ? (
              <td className="border-x border-sky-400/10 bg-sky-400/5 px-2 py-2 text-center text-sm">
                {getPricePerGramProtein(variant) !== null ? (
                  <div className="inline-flex items-center gap-1">
                    <span className={clsx("font-semibold", variantBestValue ? "text-green-400" : "text-gray-300")}>
                      {formatCurrencyPrecise(getPricePerGramProtein(variant)!)}
                    </span>
                    {variantBestValue ? <Tag className="h-3.5 w-3.5 text-green-400" aria-label="Best value" /> : null}
                  </div>
                ) : (
                  <span className="text-gray-300">-</span>
                )}
              </td>
            ) : null}
          </tr>
        );
      })}
      {isExpanded ? (
        <tr className={isBestValue ? "bg-green-950/10" : "bg-gray-900/70"}>
          <td colSpan={
            4 // product, flavour, size, servings
            + (visibility.show100g ? 1 : 0)      // protein /100g
            + (visibility.showServing ? 1 : 0)   // protein /serving
            + (visibility.show100g ? 1 : 0)      // cal /100g
            + (visibility.showServing ? 1 : 0)   // cal /serving
            + (visibility.show1gProtein ? 1 : 0) // cal /1g protein
            + (visibility.showTotal ? 1 : 0)     // price total
            + (visibility.show100g ? 1 : 0)      // price /100g
            + (visibility.showServing ? 1 : 0)   // price /serving
            + (visibility.show1gProtein ? 1 : 0) // price /1g protein
            + (planner.committed && Number(planner.proteinTarget) > 0 ? 1 : 0)
          } className="px-4 pb-5 pt-1">
            <div className="space-y-4">
              <div>
                {product.inStock ? (
                  <span className="flex items-center gap-1 whitespace-nowrap text-green-400">
                    <CheckCircle className="h-4 w-4 flex-shrink-0" />
                    <span className="text-xs">In Stock</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1 whitespace-nowrap text-red-400">
                    <XCircle className="h-4 w-4 flex-shrink-0" />
                    <span className="text-xs">Out of Stock</span>
                  </span>
                )}
              </div>
              <PriceComparisonExpandedDetails group={group} />
              <div className="mt-4">
                <ProductPageLink slug={product.slug} />
              </div>
            </div>
          </td>
        </tr>
      ) : null}
    </Fragment>
  );
}

function matchesVariantFilters(
  variant: ProductGroupWithSelection["selected"],
  filters: ColumnFilters
) {
  if (filters.flavour !== "all" && (variant.flavour ?? "") !== filters.flavour) return false;
  if (filters.size !== "all" && variant.size !== filters.size) return false;
  if (!matchesNumericFilter(variant.servings, filters.servings)) return false;
  if (!matchesNumericFilter(variant.price, filters.price, 2)) return false;
  if (!matchesNumericFilter(variant.pricePer100g, filters.pricePer100g, 2)) return false;
  if (!matchesNumericFilter(variant.proteinPer100g, filters.protein)) return false;
  if (!matchesNumericFilter(getProteinPerServing(variant), filters.proteinPerServing, 1)) return false;
  if (!matchesNumericFilter(getCaloriesPer100g(variant), filters.caloriesPer100g)) return false;
  const calPerServing = getCaloriesPerServing(variant);
  if (!matchesNumericFilter(calPerServing !== null ? Math.round(calPerServing) : null, filters.caloriesPerServing)) return false;
  if (!matchesNumericFilter(getCaloriesPerGramProtein(variant), filters.caloriesPerGramProtein, 2)) return false;
  return true;
}

function matchesNumericFilter(value: number | null, filter: string, fixedDigits?: number) {
  if (filter === "all") return true;
  if (filter.startsWith(RANGE_PREFIX)) return matchesRange(value, filter);
  if (value === null) return false;
  return fixedDigits !== undefined ? value.toFixed(fixedDigits) === filter : String(value) === filter;
}
