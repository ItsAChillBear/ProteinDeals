"use client";

import { CheckCircle, Tag, XCircle } from "lucide-react";
import { clsx } from "clsx";
import type { ProductGroupWithSelection } from "./price-comparison-table.types";
import { formatCurrencyPrecise } from "./price-comparison-format";
import { getPricePerGramProtein, getPricePerServing } from "./price-comparison-metrics";
import {
  BuyButton,
  formatCurrency,
  getVariantsForFlavour,
  ProductPageLink,
  ProductThumbnail,
} from "./price-comparison-table.utils";

export default function PriceComparisonMobileList({
  groups,
  expandedRows,
  bestValueVariantId,
  onToggleExpanded,
}: {
  groups: ProductGroupWithSelection[];
  expandedRows: Record<string, boolean>;
  bestValueVariantId: string | null;
  onToggleExpanded: (groupId: string) => void;
}) {
  return (
    <div className="divide-y divide-gray-800 sm:hidden">
      {groups.map((group) => {
        const product = group.selected;
        const isExpanded = Boolean(expandedRows[group.id]);
        const isBestValue = product.inStock && product.id === bestValueVariantId;
        const activeFlavour = product.flavour ?? "";
        const flavourVariants = getVariantsForFlavour(group, activeFlavour);

        return (
          <div
            key={group.id}
            className={clsx("p-4", isBestValue ? "bg-green-950/20" : "hover:bg-gray-800/40")}
          >
            <div className="mb-3 flex items-start gap-3">
              <div className="flex flex-col items-start gap-3">
                <ProductThumbnail name={group.baseName} imageUrl={group.imageUrl} />
                <BuyButton product={product} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="mb-2 flex items-start justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => onToggleExpanded(group.id)}
                    className="text-left text-sm font-semibold leading-snug text-white transition-colors hover:text-green-300"
                  >
                    {group.baseName}
                  </button>
                  {isBestValue ? (
                    <Tag className="h-4 w-4 flex-shrink-0 text-green-400" aria-label="Best value" />
                  ) : null}
                </div>

                <div className="mb-3 text-xs text-gray-500">
                  {group.brand} • {group.retailer} • {group.type}
                </div>

                <div className="text-xs text-gray-400">
                  Flavour: <span className="text-white">{activeFlavour || "Default"}</span>
                </div>

                <div className="mt-3 space-y-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                    Sizes
                  </span>
                  {flavourVariants.map((variant) => (
                    <div
                      key={variant.id}
                      className="rounded-xl border border-gray-800 bg-gray-950 px-3 py-2"
                    >
                      <div className="text-sm font-medium text-white">{variant.size}</div>
                      <div className="mt-1 flex flex-wrap gap-3 text-xs text-gray-400">
                        <span>{variant.servings ? `${variant.servings} servings` : "-"}</span>
                        <span>{formatCurrency(variant.price)}</span>
                        <span>{formatCurrency(variant.pricePer100g)}/100g</span>
                        <span>
                          {getPricePerServing(variant) !== null
                            ? `${formatCurrencyPrecise(getPricePerServing(variant)!)} / serving`
                            : "-"}
                        </span>
                        <span>
                          {getPricePerGramProtein(variant) !== null
                            ? `${formatCurrencyPrecise(getPricePerGramProtein(variant)!)} / g protein`
                            : "-"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <span className="text-lg font-bold text-white">{formatCurrency(product.price)}</span>
                <span className="ml-2 text-xs text-gray-500">
                  {formatCurrency(product.pricePer100g)}/100g
                </span>
              </div>
            </div>

            <div className="mt-3 text-xs text-gray-500">
              {product.flavour ?? "No flavour"} • {product.size} •{" "}
              {product.servings ? `${product.servings} servings` : "No servings"} •{" "}
              {product.inStock ? "In stock" : "Out of stock"}
            </div>

            {isExpanded ? (
              <div className="mt-4 rounded-xl border border-gray-800 bg-gray-950/70 p-3">
                <div className="mt-2">
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
                <p className="mt-2 whitespace-pre-line text-sm leading-6 text-gray-300">
                  {product.description ?? group.description ?? "No extra scraped description yet."}
                </p>
                <div className="mt-3">
                  <ProductPageLink slug={product.slug} />
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
