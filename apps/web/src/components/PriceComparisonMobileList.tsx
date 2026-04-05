"use client";

import { CheckCircle, Tag, TrendingDown, TrendingUp, XCircle } from "lucide-react";
import { clsx } from "clsx";
import PriceComparisonExpandedDetails from "./PriceComparisonExpandedDetails";
import type { ProductGroupWithSelection } from "./price-comparison-table.types";
import { formatCurrencyPrecise } from "./price-comparison-format";
import { plannerMatchesVariant, type ProteinPlannerState } from "./price-comparison-planner";
import {
  applyPriceMode,
  getCaloriesPerGramProtein,
  getPricePerGramProtein,
  getPricePerServing,
  type PriceMode,
} from "./price-comparison-metrics";
import { getCaloriesPer100g, getServingsPerPack } from "./price-comparison-nutrition";
import {
  BuyButton,
  formatCurrency,
  getVariantsForFlavour,
  ProductPageLink,
  ProductThumbnail,
} from "./price-comparison-table.utils";

function getSubscriptionSaving(singlePrice: number | null, subscriptionPrice: number | null) {
  if (singlePrice === null || subscriptionPrice === null || singlePrice <= 0) {
    return null;
  }

  const amount = singlePrice - subscriptionPrice;
  return {
    amount,
    pct: Math.round((amount / singlePrice) * 100),
  };
}

export default function PriceComparisonMobileList({
  groups,
  expandedRows,
  bestValueVariantIds,
  calorieMode,
  calorieVariantIds,
  planner,
  onToggleExpanded,
  priceMode,
}: {
  groups: ProductGroupWithSelection[];
  expandedRows: Record<string, boolean>;
  bestValueVariantIds: Record<string, string[]>;
  calorieMode: boolean;
  calorieVariantIds: { lowest: string[]; highest: string[] };
  planner: ProteinPlannerState;
  onToggleExpanded: (groupId: string) => void;
  priceMode: PriceMode;
}) {
  return (
    <div className="divide-y divide-theme sm:hidden">
      {groups.map((group) => {
        const product = group.selected;
        const isExpanded = Boolean(expandedRows[group.id]);
        const activeFlavour = product.flavour ?? "";
        const flavourVariants = getVariantsForFlavour(group, activeFlavour).filter((variant) =>
          plannerMatchesVariant(variant, planner)
        );
        const bestValueIds = Object.values(bestValueVariantIds).flat();
        const isBestValue = !calorieMode && product.inStock && flavourVariants.some((v) => bestValueIds.includes(v.id));
        const hasLowest = calorieMode && flavourVariants.some((v) => calorieVariantIds.lowest.includes(v.id));
        const hasHighest = calorieMode && flavourVariants.some((v) => calorieVariantIds.highest.includes(v.id));

        if (!flavourVariants.length) return null;

        const groupBg = calorieMode
          ? hasLowest ? "bg-amber-500/5" : hasHighest ? "bg-orange-500/5" : "hover-bg"
          : isBestValue ? "bg-green-500/5" : "hover-bg";

        return (
          <div
            key={group.id}
            className={clsx("p-4", groupBg)}
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
                    className="text-left text-sm font-semibold leading-snug text-theme transition-colors hover:text-green-500"
                  >
                    {group.baseName}
                  </button>
                  {isBestValue ? (
                    <Tag className="h-4 w-4 flex-shrink-0 text-green-500" aria-label="Best value" />
                  ) : hasLowest ? (
                    <TrendingDown className="h-4 w-4 flex-shrink-0 text-amber-500" aria-label="Lowest calorie" />
                  ) : hasHighest ? (
                    <TrendingUp className="h-4 w-4 flex-shrink-0 text-orange-500" aria-label="Highest calorie" />
                  ) : null}
                </div>

                <div className="mb-3 text-xs text-theme-3">
                  {group.brand} • {group.retailer} • {group.category}
                </div>

                <div className="text-xs text-theme-3">
                  Flavour: <span className="text-theme">{activeFlavour || "Default"}</span>
                </div>

                <div className="mt-3 space-y-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-theme-3">
                    Sizes
                  </span>
                  {flavourVariants.map((variant) => {
                    const hasSubscription = variant.subscriptionPrice != null;
                    const effectiveMode: PriceMode = hasSubscription ? priceMode : "single";
                    const v = applyPriceMode(variant, effectiveMode);
                    return (
                    <div
                      key={variant.id}
                      className="rounded-xl border border-theme bg-surface px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-theme">{variant.size}</span>
                        {hasSubscription ? (
                          <span className={clsx("text-[9px] font-semibold px-1 py-0.5 rounded", effectiveMode === "subscription" ? "bg-sky-700/50 text-sky-200" : "bg-sky-700/50 text-sky-200")}>
                            {effectiveMode === "subscription" ? "sub" : "1×"}
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-3 text-xs text-theme-3">
                        <span>{getServingsPerPack(v) ? `${getServingsPerPack(v)} servings` : "-"}</span>
                        <span className="flex items-baseline gap-1">
                          {formatCurrency(v.price)}
                          {(() => { const saving = effectiveMode === "subscription" ? getSubscriptionSaving(variant.singlePrice, variant.subscriptionPrice) : null; return saving ? <span className="text-xs text-red-400 whitespace-nowrap">-{formatCurrency(saving.amount)} (-{saving.pct}%)</span> : null; })()}
                        </span>
                        <span>{formatCurrency(v.pricePer100g)}/100g</span>
                        <span>
                          {getCaloriesPer100g(v) !== null
                            ? `${getCaloriesPer100g(v)} cal/100g`
                            : "-"}
                        </span>
                        <span>
                          {getPricePerServing(v) !== null
                            ? `${formatCurrencyPrecise(getPricePerServing(v)!)} / serving`
                            : "-"}
                        </span>
                        <span>
                          {getPricePerGramProtein(v) !== null
                            ? `${formatCurrencyPrecise(getPricePerGramProtein(v)!)} / g protein`
                            : "-"}
                        </span>
                        <span>
                          {getCaloriesPerGramProtein(v) !== null
                            ? `${getCaloriesPerGramProtein(v)!.toFixed(2)} cal / g protein`
                            : "-"}
                        </span>
                      </div>
                    </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <span className="text-lg font-bold text-theme">{formatCurrency(applyPriceMode(product, product.subscriptionPrice != null ? priceMode : "single").price)}</span>
                <span className="ml-2 text-xs text-theme-3">
                  {formatCurrency(applyPriceMode(product, product.subscriptionPrice != null ? priceMode : "single").pricePer100g)}/100g
                </span>
              </div>
            </div>

              <div className="mt-3 text-xs text-theme-3">
              {product.flavour ?? "No flavour"} â€¢ {product.size} â€¢{" "}
              {getServingsPerPack(product) ? `${getServingsPerPack(product)} servings` : "No servings"} â€¢{" "}
              {product.inStock ? "In stock" : "Out of stock"}
            </div>

            {isExpanded ? (
              <div className="mt-4 space-y-3">
                <div className="mt-2">
                  {product.inStock ? (
                    <span className="flex items-center gap-1 whitespace-nowrap text-green-500">
                      <CheckCircle className="h-4 w-4 flex-shrink-0" />
                      <span className="text-xs">In Stock</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 whitespace-nowrap text-red-500">
                      <XCircle className="h-4 w-4 flex-shrink-0" />
                      <span className="text-xs">Out of Stock</span>
                    </span>
                  )}
                </div>
                <PriceComparisonExpandedDetails group={group} />
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


