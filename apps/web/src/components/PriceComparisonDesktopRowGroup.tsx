"use client";

import { Fragment } from "react";
import { CheckCircle, ChevronDown, ChevronUp, Tag, XCircle } from "lucide-react";
import { clsx } from "clsx";
import PriceComparisonExpandedDetails from "./PriceComparisonExpandedDetails";
import type { ProductGroupWithSelection } from "./price-comparison-table.types";
import { matchesRange, MULTI_PREFIX, parseMultiFilter, RANGE_PREFIX, type ColumnFilters, type ColumnFilterOptions } from "./price-comparison-filters";
import { PriceComparisonFilterDropdown } from "./PriceComparisonFilterDropdown";
import { formatCurrencyPrecise } from "./price-comparison-format";
import { getDailyCaloriesForTarget, getDailyCostForTarget, plannerMatchesVariant, type ProteinPlannerState } from "./price-comparison-planner";
import type { ColumnVisibility } from "./price-comparison-visibility";
import type { SortDir, SortKey } from "./price-comparison-table.types";
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
  getDisplayProteinPer100g,
  ProductPageLink,
  ProductThumbnail,
} from "./price-comparison-table.utils";

export function PriceComparisonDesktopRowGroup({
  group,
  bestValueVariantIds,
  filters,
  planner,
  visibility,
  isExpanded,
  onToggleExpanded,
  totalColumns,
  viewMode,
  showFilterBar,
  filterOptions,
  onFilter,
  onSort,
  sortKey,
  sortDir,
}: {
  group: ProductGroupWithSelection;
  bestValueVariantIds: Record<string, string | null>;
  filters: ColumnFilters;
  planner: ProteinPlannerState;
  visibility: ColumnVisibility;
  isExpanded: boolean;
  onToggleExpanded: (groupId: string) => void;
  totalColumns: number;
  viewMode: "card" | "table";
  showFilterBar?: boolean;
  filterOptions?: ColumnFilterOptions;
  onFilter?: (key: keyof ColumnFilters, value: string) => void;
  onSort?: (key: SortKey) => void;
  sortKey?: SortKey;
  sortDir?: SortDir;
}) {
  const product = group.selected;
  const activeFlavour = product.flavour ?? "";

  const flavourVariants = group.variants
    .filter((variant) => matchesVariantFilters(variant, filters) && plannerMatchesVariant(variant, planner))
    .sort((a, b) => {
      const metric = sortKey === "pricePerServing" || sortKey === "pricePerGramProtein" ? sortKey : "pricePer100g";
      const aVal = metric === "pricePerServing" ? getPricePerServing(a)
        : metric === "pricePerGramProtein" ? getPricePerGramProtein(a)
        : a.pricePer100g;
      const bVal = metric === "pricePerServing" ? getPricePerServing(b)
        : metric === "pricePerGramProtein" ? getPricePerGramProtein(b)
        : b.pricePer100g;
      if (aVal === null) return 1;
      if (bVal === null) return -1;
      return aVal - bVal;
    });

  if (!flavourVariants.length) return null;

  const displayProteinPer100g = getDisplayProteinPer100g(product, flavourVariants);
  const bestValueIds = Object.values(bestValueVariantIds).filter(Boolean) as string[];
  const isBestValue =
    product.inStock &&
    bestValueIds.length > 0 &&
    flavourVariants.some((variant) => bestValueIds.includes(variant.id));

  const proteinTarget = Number(planner.proteinTarget);
  const showPlanner = planner.committed && proteinTarget > 0;

  if (viewMode === "table") {
    return (
      <Fragment>
        {flavourVariants.map((variant, variantIndex) => {
          const isFirstRow = variantIndex === 0;
          const rowSpan = flavourVariants.length;
          const best100g = variant.id === bestValueVariantIds["pricePer100g"];
          const bestServing = variant.id === bestValueVariantIds["pricePerServing"];
          const best1gProtein = variant.id === bestValueVariantIds["pricePerGramProtein"];
          const dailyCost = showPlanner ? getDailyCostForTarget(variant, proteinTarget) : null;
          const dailyCalories = showPlanner && planner.calorieEnabled ? getDailyCaloriesForTarget(variant, proteinTarget) : null;

          return (
            <tr key={variant.id} className={clsx("transition-colors", isBestValue ? "bg-green-950/20 hover:bg-green-950/30" : "hover:bg-gray-800/60")}>
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
              <td className="px-2 py-2 text-center text-sm font-medium text-white">{formatSize(variant.size)}</td>
              <td className="px-2 py-2 text-center text-sm text-gray-400">{getServingsPerPack(variant) ?? "-"}</td>
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
                  {getCaloriesPerGramProtein(product) !== null ? getCaloriesPerGramProtein(product)!.toFixed(2) : "-"}
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
                    <span className={clsx("font-semibold", best100g ? "text-green-400" : "text-gray-300")}>{formatCurrency(variant.pricePer100g)}</span>
                    {best100g ? <Tag className="h-3.5 w-3.5 text-green-400" aria-label="Best value" /> : null}
                  </div>
                </td>
              ) : null}
              {visibility.showServing ? (
                <td className="border-x border-sky-400/10 bg-sky-400/5 px-2 py-2 text-center text-sm">
                  {getPricePerServing(variant) !== null ? (
                    <div className="inline-flex items-center gap-1">
                      <span className={clsx("font-semibold", bestServing ? "text-green-400" : "text-gray-300")}>{formatCurrencyPrecise(getPricePerServing(variant)!)}</span>
                      {bestServing ? <Tag className="h-3.5 w-3.5 text-green-400" aria-label="Best value" /> : null}
                    </div>
                  ) : <span className="text-gray-300">-</span>}
                </td>
              ) : null}
              {visibility.show1gProtein ? (
                <td className="border-x border-sky-400/10 bg-sky-400/5 px-2 py-2 text-center text-sm">
                  {getPricePerGramProtein(variant) !== null ? (
                    <div className="inline-flex items-center gap-1">
                      <span className={clsx("font-semibold", best1gProtein ? "text-green-400" : "text-gray-300")}>{formatCurrencyPrecise(getPricePerGramProtein(variant)!)}</span>
                      {best1gProtein ? <Tag className="h-3.5 w-3.5 text-green-400" aria-label="Best value" /> : null}
                    </div>
                  ) : <span className="text-gray-300">-</span>}
                </td>
              ) : null}
            </tr>
          );
        })}
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

  return (
    <Fragment>
      <tr className={clsx("transition-colors", isBestValue ? "bg-green-950/30 hover:bg-green-950/40" : "hover:bg-gray-800/30")}>
        <td colSpan={totalColumns} className="px-4 py-3">
          {/* Variant table */}
          <div className="rounded-xl border border-gray-700/50 overflow-hidden">
            <div className="flex">
              {/* Product info — spans full height */}
              <div className="w-48 flex-shrink-0 flex flex-col items-center justify-center gap-2 px-3 py-3 border-r border-gray-700/50 bg-gray-800/60">
                <div className="text-[10px] text-gray-500">{group.retailer}</div>
                <ProductThumbnail name={group.baseName} imageUrl={group.imageUrl} size="lg" />
                <div className="flex flex-col items-center gap-1 w-full">
                  <a
                    href={product.url}
                    target="_blank"
                    rel="noopener noreferrer sponsored"
                    className="text-sm font-semibold text-white hover:text-green-300 transition-colors leading-tight line-clamp-2 text-center"
                  >
                    {group.baseName}
                  </a>
                  <div className="flex w-full items-center justify-between gap-1">
                    <button type="button" onClick={() => onToggleExpanded(group.id)} className="flex-shrink-0 p-1">
                      {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-600" /> : <ChevronDown className="h-4 w-4 text-gray-600" />}
                    </button>
                    {activeFlavour ? (
                      <span className="flex-1 rounded bg-gray-700 px-1 py-0.5 text-[10px] text-gray-300 text-center">{activeFlavour}</span>
                    ) : <span className="flex-1" />}
                    <button type="button" onClick={() => onToggleExpanded(group.id)} className="flex-shrink-0 p-1">
                      {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-600" /> : <ChevronDown className="h-4 w-4 text-gray-600" />}
                    </button>
                  </div>
                </div>
              </div>
              {/* Column headers + variant rows */}
              <div className="flex-1 min-w-0">
                {/* Header row */}
                <div className="flex border-b border-gray-700/50 bg-gray-800/60">
                  <div className="w-44 flex-shrink-0 flex flex-col justify-end">
                    <div className="flex mb-1 pl-5">
                      <span className="w-14 flex-shrink-0 text-center text-[10px] font-bold uppercase tracking-widest text-gray-500">Size</span>
                      {visibility.showTotal ? <span className="w-20 flex-shrink-0 text-center text-[10px] font-bold uppercase tracking-widest text-sky-400/80">Total</span> : null}
                    </div>
                    <div className="flex">
                      <span className="w-5 flex-shrink-0" />
                      <div className="w-14 flex-shrink-0 px-1 pb-1.5">
                        {showFilterBar && filterOptions && onFilter ? (
                          <PriceComparisonFilterDropdown value={filters.size} options={filterOptions.sizes} numericValues={filterOptions.sizeGs} formatFn={(n) => { const match = filterOptions.sizes[filterOptions.sizeGs.indexOf(n)]; return match ? match.replace(/^(\d+\.\d+?)0+(kg|g)$/, "$1$2") : `${n}g`; }} numeric onChange={(v) => onFilter("size", v)} />
                        ) : null}
                      </div>
                      {visibility.showTotal ? (
                        <div className="w-20 flex-shrink-0 px-1 pb-1.5">
                          {showFilterBar && filterOptions && onFilter ? (
                            <PriceComparisonFilterDropdown value={filters.price} options={filterOptions.prices} onChange={(v) => onFilter("price", v)} formatFn={(n) => `£${n.toFixed(2)}`} numeric />
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex divide-x divide-gray-700/40">
                    {visibility.showServing ? (
                      <div className="flex-shrink-0 px-3 pt-2 pb-1.5 border-l border-gray-700/40">
                        <div className="text-center text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Per serving</div>
                        <div className="flex text-[9px] mb-1">
                          <span className="w-12 text-center text-gray-500">servings</span>
                          <span className="w-14 text-center text-violet-400/60">protein</span>
                          <span className="w-12 text-center text-amber-500/60">kcal</span>
                          <span className="w-16 text-center text-sky-400/60">price</span>
                        </div>
                        {showFilterBar && filterOptions && onFilter ? (
                          <div className="flex text-[9px]">
                            <div className="w-12 px-0.5"><PriceComparisonFilterDropdown value={filters.servings} options={filterOptions.servings} onChange={(v) => onFilter("servings", v)} formatFn={(n) => `${n}`} numeric /></div>
                            <div className="w-14 px-0.5"><PriceComparisonFilterDropdown value={filters.proteinPerServing} options={filterOptions.proteinPerServings} onChange={(v) => onFilter("proteinPerServing", v)} formatFn={(n) => `${n.toFixed(1)}g`} numeric /></div>
                            <div className="w-12 px-0.5"><PriceComparisonFilterDropdown value={filters.caloriesPerServing} options={filterOptions.caloriesPerServings} onChange={(v) => onFilter("caloriesPerServing", v)} formatFn={(n) => `${n}`} numeric /></div>
                            <div className="w-16 px-0.5"><PriceComparisonFilterDropdown value={filters.pricePerServing} options={filterOptions.pricePerServings} onChange={(v) => onFilter("pricePerServing", v)} formatFn={(n) => `£${n.toFixed(3)}`} numeric /></div>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                    {visibility.show100g ? (
                      <div className="flex-shrink-0 px-3 pt-2 pb-1.5 border-l border-gray-700/40">
                        <div className="text-center text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Per 100g</div>
                        <div className="flex text-[9px] mb-1">
                          <span className="w-14 text-center text-violet-400/60">protein</span>
                          <span className="w-12 text-center text-amber-500/60">kcal</span>
                          <span className="w-16 text-center text-sky-400/60">price</span>
                        </div>
                        {showFilterBar && filterOptions && onFilter ? (
                          <div className="flex text-[9px]">
                            <div className="w-14 px-0.5"><PriceComparisonFilterDropdown value={filters.protein} options={filterOptions.proteins} onChange={(v) => onFilter("protein", v)} formatFn={(n) => `${n}g`} numeric /></div>
                            <div className="w-12 px-0.5"><PriceComparisonFilterDropdown value={filters.caloriesPer100g} options={filterOptions.caloriesPer100gs} onChange={(v) => onFilter("caloriesPer100g", v)} formatFn={(n) => `${n}`} numeric /></div>
                            <div className="w-16 px-0.5"><PriceComparisonFilterDropdown value={filters.pricePer100g} options={filterOptions.pricePer100gs} onChange={(v) => onFilter("pricePer100g", v)} formatFn={(n) => `£${n.toFixed(2)}`} numeric /></div>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                    {visibility.show1gProtein ? (
                      <div className="flex-shrink-0 px-3 pt-2 pb-1.5 border-l border-gray-700/40">
                        <div className="text-center text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Per 1g protein</div>
                        <div className="flex text-[9px] mb-1">
                          <span className="w-12 text-center text-amber-500/60">kcal</span>
                          <span className="w-16 text-center text-sky-400/60">price</span>
                        </div>
                        {showFilterBar && filterOptions && onFilter ? (
                          <div className="flex text-[9px]">
                            <div className="w-12 px-0.5"><PriceComparisonFilterDropdown value={filters.caloriesPerGramProtein} options={filterOptions.caloriesPerGramProteins} onChange={(v) => onFilter("caloriesPerGramProtein", v)} formatFn={(n) => n.toFixed(2)} numeric /></div>
                            <div className="w-16 px-0.5"><PriceComparisonFilterDropdown value={filters.pricePerGramProtein} options={filterOptions.pricePerGramProteins} onChange={(v) => onFilter("pricePerGramProtein", v)} formatFn={(n) => `£${n.toFixed(3)}`} numeric /></div>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                    {showPlanner ? (
                      <div className="w-24 flex-shrink-0 px-3 pt-2 pb-1.5 border-l border-green-500/20 bg-green-500/5">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-green-500/80">{proteinTarget}g/day</div>
                      </div>
                    ) : null}
                  </div>
                </div>
                {/* Variant rows */}
                {flavourVariants.map((variant, i) => {
                  const best100g = variant.id === bestValueVariantIds["pricePer100g"];
                  const bestServing = variant.id === bestValueVariantIds["pricePerServing"];
                  const best1gProtein = variant.id === bestValueVariantIds["pricePerGramProtein"];
                  const anyBest = best100g || bestServing || best1gProtein;
                  const dailyCost = showPlanner ? getDailyCostForTarget(variant, proteinTarget) : null;
                  const dailyCalories = showPlanner && planner.calorieEnabled ? getDailyCaloriesForTarget(variant, proteinTarget) : null;
                  const proteinPerServing = getProteinPerServing(variant);
                  const caloriesPerServing = getCaloriesPerServing(variant);
                  const pricePerServing = getPricePerServing(variant);
                  const pricePerGramProtein = getPricePerGramProtein(variant);
                  const calPer100g = getCaloriesPer100g(variant);
                  const calPerGramProtein = getCaloriesPerGramProtein(variant);

                  return (
                    <div
                      key={variant.id}
                      className={clsx(
                        "flex items-center relative",
                        i > 0 && "border-t border-gray-700/40",
                        anyBest ? "bg-green-500/10" : "bg-transparent"
                      )}
                    >
                      {anyBest ? <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-green-400" /> : null}
                      {/* Size + total cell */}
                      <div className="w-44 flex-shrink-0 flex items-center py-2.5">
                        <div className="w-5 flex-shrink-0" />
                        <span className={clsx("w-14 flex-shrink-0 px-1 text-center text-sm font-bold", anyBest ? "text-green-300" : "text-white")}>{formatSize(variant.size)}</span>
                        {visibility.showTotal ? (
                          <span className={clsx("w-20 flex-shrink-0 text-center text-xs font-semibold", anyBest ? "text-green-300" : "text-gray-300")}>{formatCurrency(variant.price)}</span>
                        ) : null}
                      </div>

                      <div className="flex divide-x divide-gray-700/40">
                        {/* Per serving */}
                        {visibility.showServing ? (
                          <div className="flex-shrink-0 px-3 py-2.5 border-l border-gray-700/40">
                            <div className="flex">
                              <Stat className="w-12">{getServingsPerPack(variant) ?? "-"}</Stat>
                              <Stat className="w-14" color="violet">{proteinPerServing !== null ? `${proteinPerServing.toFixed(1)}g` : "-"}</Stat>
                              <Stat className="w-12" color="amber">{caloriesPerServing !== null ? Math.round(caloriesPerServing) : "-"}</Stat>
                              <Stat className="w-16" color="sky" bestValue={bestServing}>{pricePerServing !== null ? formatCurrencyPrecise(pricePerServing) : "-"}</Stat>
                            </div>
                          </div>
                        ) : null}

                        {/* Per 100g */}
                        {visibility.show100g ? (
                          <div className="flex-shrink-0 px-3 py-2.5 border-l border-gray-700/40">
                            <div className="flex">
                              <Stat className="w-14" color="violet">{displayProteinPer100g !== null ? `${displayProteinPer100g}g` : "-"}</Stat>
                              <Stat className="w-12" color="amber">{calPer100g !== null ? calPer100g : "-"}</Stat>
                              <Stat className="w-16" color="sky" bestValue={best100g}>{formatCurrency(variant.pricePer100g)}</Stat>
                            </div>
                          </div>
                        ) : null}

                        {/* Per 1g protein */}
                        {visibility.show1gProtein ? (
                          <div className="flex-shrink-0 px-3 py-2.5 border-l border-gray-700/40">
                            <div className="flex">
                              <Stat className="w-12" color="amber">{calPerGramProtein !== null ? calPerGramProtein.toFixed(2) : "-"}</Stat>
                              <Stat className="w-16" color="sky" bestValue={best1gProtein}>{pricePerGramProtein !== null ? formatCurrencyPrecise(pricePerGramProtein) : "-"}</Stat>
                            </div>
                          </div>
                        ) : null}


                        {/* Planner */}
                        {showPlanner ? (
                          <div className="w-24 flex-shrink-0 px-3 py-2.5 text-right">
                            {dailyCost !== null ? (
                              <span className="text-sm font-bold text-green-400">{formatCurrency(dailyCost)}</span>
                            ) : (
                              <span className="text-gray-600">—</span>
                            )}
                            {dailyCalories !== null ? (
                              <div className="text-[10px] text-amber-400/80">{Math.round(dailyCalories)} kcal</div>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>{/* end flex-1 column wrapper */}
            </div>{/* end outer flex */}
          </div>{/* end rounded-xl card */}

          {/* Expanded details */}
          {isExpanded ? (
            <div className={clsx("mt-3 rounded-xl px-4 py-3", isBestValue ? "bg-green-950/10" : "bg-gray-900/70")}>
              <div className="space-y-3">
                {product.inStock ? (
                  <span className="flex items-center gap-1 text-green-400">
                    <CheckCircle className="h-4 w-4 flex-shrink-0" />
                    <span className="text-xs">In Stock</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-red-400">
                    <XCircle className="h-4 w-4 flex-shrink-0" />
                    <span className="text-xs">Out of Stock</span>
                  </span>
                )}
                <PriceComparisonExpandedDetails group={group} />
                <ProductPageLink slug={product.slug} />
              </div>
            </div>
          ) : null}
        </td>
      </tr>
    </Fragment>
  );
}

function Stat({
  color,
  className,
  children,
  bestValue,
}: {
  color?: "violet" | "amber" | "sky";
  className?: string;
  children: React.ReactNode;
  bestValue?: boolean;
}) {
  const valueColor = bestValue && color === "sky" ? "text-green-300" :
    color === "violet" ? "text-violet-300" :
    color === "amber" ? "text-amber-300" :
    color === "sky" ? "text-sky-300" :
    "text-gray-300";
  return (
    <span className={clsx("relative flex-shrink-0 text-center text-[12px] font-medium", valueColor, className)}>
      {children}
      {bestValue ? <Tag className="absolute -right-1 -top-1.5 h-3.5 w-3.5 text-green-400" aria-label="Best value" /> : null}
    </span>
  );
}

function formatSize(size: string) {
  return size.replace(/^(\d+\.\d+?)0+(kg|g)$/, "$1$2");
}

function matchesVariantFilters(
  variant: ProductGroupWithSelection["selected"],
  filters: ColumnFilters
) {
  if (filters.retailer !== "all") {
    if (filters.retailer.startsWith(MULTI_PREFIX)) {
      const allowed = parseMultiFilter(filters.retailer);
      if (!allowed.includes(variant.retailer)) return false;
    } else if (variant.retailer !== filters.retailer) return false;
  }
  if (filters.product !== "all") {
    const baseName = variant.name.endsWith(` - ${variant.flavour ?? ""}`) && variant.flavour
      ? variant.name.slice(0, -(` - ${variant.flavour}`).length)
      : variant.name;
    if (filters.product.startsWith(MULTI_PREFIX)) {
      const allowed = parseMultiFilter(filters.product);
      if (!allowed.includes(baseName)) return false;
    } else if (baseName !== filters.product) return false;
  }
  if (filters.flavour !== "all") {
    if (filters.flavour.startsWith(MULTI_PREFIX)) {
      const allowed = parseMultiFilter(filters.flavour);
      if (!allowed.includes(variant.flavour ?? "")) return false;
    } else if ((variant.flavour ?? "") !== filters.flavour) return false;
  }
  if (filters.size !== "all") {
    if (filters.size.startsWith(RANGE_PREFIX)) {
      if (!matchesRange(variant.sizeG, filters.size)) return false;
    } else if (variant.size !== filters.size) return false;
  }
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
