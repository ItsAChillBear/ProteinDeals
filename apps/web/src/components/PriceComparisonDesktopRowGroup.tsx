"use client";

import { Fragment } from "react";
import { CheckCircle, ChevronDown, ChevronUp, Tag, XCircle } from "lucide-react";
import { clsx } from "clsx";
import PriceComparisonExpandedDetails from "./PriceComparisonExpandedDetails";
import type { ProductGroupWithSelection } from "./price-comparison-table.types";
import { matchesRange, RANGE_PREFIX, type ColumnFilters } from "./price-comparison-filters";
import { formatCurrencyPrecise } from "./price-comparison-format";
import { plannerMatchesVariant, type ProteinPlannerState } from "./price-comparison-planner";
import {
  getCaloriesPerGramProtein,
  getPricePerGramProtein,
  getPricePerServing,
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
  isExpanded,
  onToggleExpanded,
}: {
  group: ProductGroupWithSelection;
  bestValueVariantId: string | null;
  filters: ColumnFilters;
  planner: ProteinPlannerState;
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

        return (
          <tr
            key={variant.id}
            className={clsx(
              "transition-colors",
              isBestValue ? "bg-green-950/20 hover:bg-green-950/30" : "hover:bg-gray-800/60"
            )}
          >
            {isFirstRow ? (
              <>
                <td className="w-28 px-4 py-4 text-center align-top" rowSpan={rowSpan}>
                  <div className="flex flex-col items-center gap-3">
                    <ProductThumbnail name={group.baseName} imageUrl={group.imageUrl} />
                    <BuyButton product={product} />
                  </div>
                </td>
                <td className="max-w-sm px-4 py-4 text-center align-top" rowSpan={rowSpan}>
                  <button
                    type="button"
                    onClick={() => onToggleExpanded(group.id)}
                    className="flex w-full flex-col items-center gap-1"
                  >
                    <div className="font-medium leading-snug text-white transition-colors hover:text-green-300">
                      {group.baseName}
                    </div>
                    <div className="text-xs text-gray-500">{group.retailer}</div>
                  </button>
                </td>
                <td className="px-4 py-4 text-center align-top" rowSpan={rowSpan}>
                  <div className="break-words text-sm font-medium text-white">{activeFlavour || "Default"}</div>
                </td>
              </>
            ) : null}
            {isFirstRow ? (
              <td className="whitespace-nowrap px-4 py-2 text-center text-gray-300" rowSpan={rowSpan}>
                {displayProteinPer100g !== null ? `${displayProteinPer100g}g / 100g` : "-"}
              </td>
            ) : null}
            {isFirstRow ? (
              <td className="whitespace-nowrap px-4 py-2 text-center text-gray-300" rowSpan={rowSpan}>
                {getCaloriesPer100g(product) !== null ? `${getCaloriesPer100g(product)}` : "-"}
              </td>
            ) : null}
            {isFirstRow ? (
              <td className="whitespace-nowrap px-4 py-2 text-center text-gray-300" rowSpan={rowSpan}>
                {getCaloriesPerGramProtein(product) !== null
                  ? getCaloriesPerGramProtein(product)!.toFixed(2)
                  : "-"}
              </td>
            ) : null}
            <td className="px-4 py-2 text-center text-sm font-medium text-white">{variant.size}</td>
            <td className="px-4 py-2 text-center text-sm text-gray-400">
              {variant.servings ? `${variant.servings}` : "-"}
            </td>
            <td className="px-4 py-2 text-center text-sm font-semibold text-white">
              {formatCurrency(variant.price)}
            </td>
            <td className="px-4 py-2 text-center text-sm">
              <div className="inline-flex items-center gap-2">
                <span className={clsx("font-semibold", variantBestValue ? "text-green-400" : "text-gray-300")}>
                  {formatCurrency(variant.pricePer100g)}
                </span>
                {variantBestValue ? (
                  <Tag className="h-4 w-4 text-green-400" aria-label="Best value" />
                ) : null}
              </div>
            </td>
            <td className="px-4 py-2 text-center text-sm">
              {getPricePerServing(variant) !== null ? (
                <div className="inline-flex items-center gap-2">
                  <span className={clsx("font-semibold", variantBestValue ? "text-green-400" : "text-gray-300")}>
                    {formatCurrencyPrecise(getPricePerServing(variant)!)}
                  </span>
                  {variantBestValue ? <Tag className="h-4 w-4 text-green-400" aria-label="Best value" /> : null}
                </div>
              ) : (
                <span className="text-gray-300">-</span>
              )}
            </td>
            <td className="px-4 py-2 text-center text-sm">
              {getPricePerGramProtein(variant) !== null ? (
                <div className="inline-flex items-center gap-2">
                  <span className={clsx("font-semibold", variantBestValue ? "text-green-400" : "text-gray-300")}>
                    {formatCurrencyPrecise(getPricePerGramProtein(variant)!)}
                  </span>
                  {variantBestValue ? <Tag className="h-4 w-4 text-green-400" aria-label="Best value" /> : null}
                </div>
              ) : (
                <span className="text-gray-300">-</span>
              )}
            </td>
          </tr>
        );
      })}
      {isExpanded ? (
        <tr className={isBestValue ? "bg-green-950/10" : "bg-gray-900/70"}>
          <td colSpan={12} className="px-4 pb-5 pt-1">
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
  return true;
}

function matchesNumericFilter(value: number | null, filter: string, fixedDigits?: number) {
  if (filter === "all") return true;
  if (filter.startsWith(RANGE_PREFIX)) return matchesRange(value, filter);
  if (value === null) return false;
  return fixedDigits !== undefined ? value.toFixed(fixedDigits) === filter : String(value) === filter;
}
