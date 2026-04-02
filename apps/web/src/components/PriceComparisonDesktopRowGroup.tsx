"use client";

import { Fragment } from "react";
import { CheckCircle, ChevronDown, ChevronUp, Tag, XCircle } from "lucide-react";
import { clsx } from "clsx";
import type { ProductGroupWithSelection } from "./price-comparison-table.types";
import { matchesRange, RANGE_PREFIX, type ColumnFilters } from "./PriceComparisonTable";
import { getPricePerGramProtein, getPricePerServing } from "./price-comparison-metrics";
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
  isExpanded,
  onToggleExpanded,
}: {
  group: ProductGroupWithSelection;
  bestValueVariantId: string | null;
  filters: ColumnFilters;
  isExpanded: boolean;
  onToggleExpanded: (groupId: string) => void;
}) {
  const product = group.selected;
  const activeFlavour = filters.flavour !== "all" ? filters.flavour : product.flavour ?? "";
  const flavourVariants = getVariantsForFlavour(group, activeFlavour).filter((variant) =>
    matchesVariantFilters(variant, filters)
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
                    className="flex w-full items-start justify-between gap-3 text-left"
                  >
                    <div>
                      <div className="line-clamp-2 font-medium leading-snug text-white transition-colors hover:text-green-300">
                        {group.baseName}
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        {group.brand} • {group.retailer} • {group.type} •{" "}
                        {product.inStock ? "In stock" : "Out of stock"}
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-500" />
                    ) : (
                      <ChevronDown className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-500" />
                    )}
                  </button>
                </td>
                <td className="px-4 py-4 text-center align-top" rowSpan={rowSpan}>
                  <div className="break-words text-sm font-medium text-white">{activeFlavour || "Default"}</div>
                </td>
              </>
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
            <td className="px-4 py-2 text-center text-sm text-gray-300">
              {getPricePerServing(variant) !== null ? formatCurrency(getPricePerServing(variant)!) : "-"}
            </td>
            <td className="px-4 py-2 text-center text-sm text-gray-300">
              {getPricePerGramProtein(variant) !== null ? formatCurrency(getPricePerGramProtein(variant)!) : "-"}
            </td>
            {isFirstRow ? (
              <td className="whitespace-nowrap px-4 py-2 text-center text-gray-300" rowSpan={rowSpan}>
                {displayProteinPer100g !== null ? `${displayProteinPer100g}g / 100g` : "-"}
              </td>
            ) : null}
          </tr>
        );
      })}
      {isExpanded ? (
        <tr className={isBestValue ? "bg-green-950/10" : "bg-gray-900/70"}>
          <td colSpan={10} className="px-4 pb-5 pt-1">
            <div className="rounded-xl border border-gray-800 bg-gray-950/70 p-4">
              <div className="mb-3 flex flex-wrap gap-4 text-xs text-gray-400">
                <span>Flavour: <span className="text-white">{product.flavour ?? "-"}</span></span>
                <span>Size: <span className="text-white">{product.size}</span></span>
                <span>Servings: <span className="text-white">{product.servings ?? "-"}</span></span>
              </div>
              <div className="mb-3">
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
              <p className="whitespace-pre-line text-sm leading-6 text-gray-300">
                {product.description ?? group.description ?? "No extra scraped description yet."}
              </p>
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
