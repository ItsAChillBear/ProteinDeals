"use client";

import { Fragment } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  XCircle,
} from "lucide-react";
import { clsx } from "clsx";
import type { ProductGroupWithSelection, SortDir, SortKey } from "./price-comparison-table.types";
import {
  BuyButton,
  formatCurrency,
  getFlavourOptions,
  getVariantsForFlavour,
  ProductPageLink,
  ProductThumbnail,
} from "./price-comparison-table.utils";

function SortIcon({
  col,
  sortKey,
  sortDir,
}: {
  col: SortKey;
  sortKey: SortKey;
  sortDir: SortDir;
}) {
  if (sortKey !== col) {
    return <ArrowUpDown className="h-3.5 w-3.5 text-gray-600" />;
  }

  return sortDir === "asc" ? (
    <ArrowUp className="h-3.5 w-3.5 text-green-400" />
  ) : (
    <ArrowDown className="h-3.5 w-3.5 text-green-400" />
  );
}

export default function PriceComparisonDesktopTable({
  groups,
  expandedRows,
  minPricePer100g,
  onSort,
  onToggleExpanded,
  onSelectFlavour,
  sortDir,
  sortKey,
}: {
  groups: ProductGroupWithSelection[];
  expandedRows: Record<string, boolean>;
  minPricePer100g: number | null;
  onSort: (key: SortKey) => void;
  onSelectFlavour: (group: ProductGroupWithSelection, flavour: string) => void;
  onToggleExpanded: (groupId: string) => void;
  sortDir: SortDir;
  sortKey: SortKey;
}) {
  const headerClass =
    "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 whitespace-nowrap";

  const sortableHeader = (label: string, key: SortKey) => (
    <th className={headerClass}>
      <button
        type="button"
        onClick={() => onSort(key)}
        className="flex items-center gap-1.5 transition-colors hover:text-gray-300"
      >
        {label}
        <SortIcon col={key} sortKey={sortKey} sortDir={sortDir} />
      </button>
    </th>
  );

  return (
    <div className="hidden overflow-x-auto sm:block">
      <table className="w-full text-sm">
        <thead className="border-b border-gray-800 bg-gray-800/50">
          <tr>
            <th className={`${headerClass} w-28`}>Image</th>
            {sortableHeader("Product", "name")}
            <th className={`${headerClass} min-w-[220px]`}>Variant</th>
            {sortableHeader("Size", "size")}
            <th className={headerClass}>Servings</th>
            {sortableHeader("Price", "price")}
            {sortableHeader("Per 100g", "pricePer100g")}
            <th className={headerClass}>Protein</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800">
          {groups.map((group) => {
            const product = group.selected;
            const isExpanded = Boolean(expandedRows[group.id]);
            const activeFlavour = product.flavour ?? "";
            const flavourOptions = getFlavourOptions(group);
            const flavourVariants = getVariantsForFlavour(group, activeFlavour);
            const groupMinPricePer100g = flavourVariants
              .filter((v) => v.inStock)
              .reduce<number | null>((min, v) => (min === null || v.pricePer100g < min ? v.pricePer100g : min), null);
            const isBestValue =
              product.inStock &&
              minPricePer100g !== null &&
              product.pricePer100g === minPricePer100g;

            return (
              <Fragment key={group.id}>
                {flavourVariants.map((variant, variantIndex) => {
                  const variantBestValue =
                    variant.inStock &&
                    groupMinPricePer100g !== null &&
                    variant.pricePer100g === groupMinPricePer100g;
                  const isFirstRow = variantIndex === 0;
                  const rowSpan = flavourVariants.length;

                  return (
                    <tr
                      key={variant.id}
                      className={clsx(
                        "transition-colors",
                        isBestValue
                          ? "bg-green-950/20 hover:bg-green-950/30"
                          : "hover:bg-gray-800/60"
                      )}
                    >
                      {isFirstRow && (
                        <>
                          <td className="w-28 px-4 py-4 align-top" rowSpan={rowSpan}>
                            <div className="flex flex-col items-start gap-3">
                              <ProductThumbnail name={group.baseName} imageUrl={group.imageUrl} />
                              <BuyButton product={product} />
                            </div>
                          </td>
                          <td className="max-w-sm px-4 py-4 align-top" rowSpan={rowSpan}>
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
                          <td className="px-4 py-4 align-top" rowSpan={rowSpan}>
                            <label className="block space-y-1">
                              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                                Flavour
                              </span>
                              <select
                                value={activeFlavour}
                                onChange={(event) => onSelectFlavour(group, event.target.value)}
                                className="w-full rounded-xl border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-white outline-none transition focus:border-green-500"
                              >
                                {flavourOptions.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            </label>
                          </td>
                        </>
                      )}
                      <td className="px-4 py-2 text-sm font-medium text-white">{variant.size}</td>
                      <td className="px-4 py-2 text-sm text-gray-400">
                        {variant.servings ? `${variant.servings} servings` : "-"}
                      </td>
                      <td className="px-4 py-2 text-sm font-semibold text-white">
                        {formatCurrency(variant.price)}
                      </td>
                      <td className="px-4 py-2 text-sm">
                        <div className="flex items-center gap-2">
                          <span
                            className={clsx(
                              "font-semibold",
                              variantBestValue ? "text-green-400" : "text-gray-300"
                            )}
                          >
                            {formatCurrency(variant.pricePer100g)}
                          </span>
                          {variantBestValue ? (
                            <span className="whitespace-nowrap rounded border border-green-800/50 bg-green-950/70 px-2 py-0.5 text-xs font-bold text-green-400">
                              Best Value
                            </span>
                          ) : null}
                        </div>
                      </td>
                      {isFirstRow && (
                        <td className="whitespace-nowrap px-4 py-2 text-gray-300" rowSpan={rowSpan}>
                          {product.proteinPer100g !== null ? `${product.proteinPer100g}g / 100g` : "-"}
                        </td>
                      )}
                    </tr>
                  );
                })}
                {isExpanded ? (
                  <tr className={isBestValue ? "bg-green-950/10" : "bg-gray-900/70"}>
                    <td colSpan={8} className="px-4 pb-5 pt-1">
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
          })}
        </tbody>
      </table>
    </div>
  );
}
