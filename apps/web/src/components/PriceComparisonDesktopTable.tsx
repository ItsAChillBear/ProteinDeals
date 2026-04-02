"use client";

import { Fragment, useEffect, useLayoutEffect, useRef, useState } from "react";
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
import type { ColumnFilters, ColumnFilterOptions } from "./PriceComparisonTable";
import { RANGE_PREFIX, matchesRange } from "./PriceComparisonTable";

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (sortKey !== col) return <ArrowUpDown className="h-3.5 w-3.5 text-gray-600" />;
  return sortDir === "asc" ? (
    <ArrowUp className="h-3.5 w-3.5 text-green-400" />
  ) : (
    <ArrowDown className="h-3.5 w-3.5 text-green-400" />
  );
}

const triggerClass =
  "flex w-full items-center justify-between gap-1 rounded-lg border border-gray-700 bg-gray-900 px-1.5 py-0.5 text-[10px] text-gray-300 outline-none transition hover:border-gray-500 min-w-0";

function RangeSlider({
  min,
  max,
  valueMin,
  valueMax,
  onChange,
  fmt,
}: {
  min: number;
  max: number;
  valueMin: number;
  valueMax: number;
  onChange: (lo: number, hi: number) => void;
  fmt: (n: number) => string;
}) {
  const pct = (v: number) => ((v - min) / (max - min)) * 100;

  return (
    <div className="px-1 pb-1 pt-2">
      <div className="mb-3 flex items-center justify-between gap-1">
        <span className="w-16 truncate rounded bg-gray-800 px-1.5 py-0.5 text-center text-[10px] font-medium text-green-400">
          {fmt(valueMin)}
        </span>
        <span className="w-16 truncate rounded bg-gray-800 px-1.5 py-0.5 text-center text-[10px] font-medium text-green-400">
          {fmt(valueMax)}
        </span>
      </div>

      <div className="relative h-5">
        {/* Track background */}
        <div className="absolute top-1/2 h-1 w-full -translate-y-1/2 rounded-full bg-gray-700" />
        {/* Active track fill */}
        <div
          className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-green-500"
          style={{ left: `${pct(valueMin)}%`, width: `${pct(valueMax) - pct(valueMin)}%` }}
        />
        {/* Min thumb */}
        <input
          type="range"
          min={min}
          max={max}
          value={valueMin}
          onChange={(e) => {
            const v = Math.min(Number(e.target.value), valueMax - 1);
            onChange(v, valueMax);
          }}
          className="pointer-events-none absolute inset-0 h-full w-full appearance-none bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-green-400 [&::-webkit-slider-thumb]:bg-gray-900 [&::-webkit-slider-thumb]:transition-colors [&::-webkit-slider-thumb]:hover:bg-green-950 [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-green-400 [&::-moz-range-thumb]:bg-gray-900"
          style={{ zIndex: valueMin > max - 2 ? 5 : 3 }}
        />
        {/* Max thumb */}
        <input
          type="range"
          min={min}
          max={max}
          value={valueMax}
          onChange={(e) => {
            const v = Math.max(Number(e.target.value), valueMin + 1);
            onChange(valueMin, v);
          }}
          className="pointer-events-none absolute inset-0 h-full w-full appearance-none bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-green-400 [&::-webkit-slider-thumb]:bg-gray-900 [&::-webkit-slider-thumb]:transition-colors [&::-webkit-slider-thumb]:hover:bg-green-950 [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-green-400 [&::-moz-range-thumb]:bg-gray-900"
          style={{ zIndex: 4 }}
        />
      </div>
    </div>
  );
}

function FilterDropdown({
  value,
  options,
  onChange,
  formatFn,
  numeric = false,
}: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
  formatFn?: (n: number) => string;
  numeric?: boolean;
}) {
  const fmt = formatFn ?? String;
  const discreteOptions = options;

  // Compute absolute min/max from all discrete values for the slider
  const allNumericValues = discreteOptions.map(Number).filter((n) => !isNaN(n));
  const sliderMin = allNumericValues.length ? Math.min(...allNumericValues) : 0;
  const sliderMax = allNumericValues.length ? Math.max(...allNumericValues) : 100;

  const DROPDOWN_W = 208; // w-52 = 13rem = 208px

  const [open, setOpen] = useState(false);
  const [sliderLo, setSliderLo] = useState(sliderMin);
  const [sliderHi, setSliderHi] = useState(sliderMax);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
  const sliderTouched = useRef(false);
  const ref = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  // Reset slider to full range when dropdown opens
  useEffect(() => {
    if (open) {
      sliderTouched.current = false;
      setSliderLo(sliderMin);
      setSliderHi(sliderMax);
      if (value.startsWith(RANGE_PREFIX)) {
        onChange("all");
      }
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Position dropdown centered under the trigger button using fixed coords
  function updatePos() {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const left = Math.max(4, Math.min(
        rect.left + rect.width / 2 - DROPDOWN_W / 2,
        window.innerWidth - DROPDOWN_W - 4
      ));
      setDropdownPos({ top: rect.bottom + 6, left });
    }
  }

  useLayoutEffect(() => {
    if (open) updatePos();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    window.addEventListener("scroll", updatePos, true);
    window.addEventListener("resize", updatePos);
    return () => {
      window.removeEventListener("scroll", updatePos, true);
      window.removeEventListener("resize", updatePos);
    };
  }, [open]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function select(v: string) {
    onChange(v);
    setOpen(false);
  }

  function getLabel(): string {
    if (value === "all") return "All";
    if (value.startsWith(RANGE_PREFIX)) {
      const [lo, hi] = value.replace(RANGE_PREFIX, "").split(":");
      return hi ? `${fmt(Number(lo))} – ${fmt(Number(hi))}` : `${fmt(Number(lo))}+`;
    }
    return formatFn ? fmt(Number(value)) : value;
  }

  return (
    <div ref={ref} className="relative">
      <button ref={btnRef} type="button" onClick={() => setOpen((o) => !o)} className={triggerClass}>
        <span className="w-[72px] flex-shrink-0 truncate">{getLabel()}</span>
        <ChevronDown className={clsx("h-2.5 w-2.5 flex-shrink-0 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div
          className="fixed z-50 w-52 rounded-xl border border-gray-700 bg-gray-900 shadow-2xl"
          style={{ top: dropdownPos.top, left: dropdownPos.left }}
        >
          <div className="py-1">
            <button
              type="button"
              onClick={() => select("all")}
              className={clsx("w-full px-3 py-1.5 text-left text-[11px] transition hover:bg-gray-800", value === "all" ? "text-green-400" : "text-gray-300")}
            >
              All
            </button>

            {/* Range slider for numeric columns */}
            {numeric && allNumericValues.length > 1 && (
              <>
                <div className="mt-1 border-t border-gray-800 px-3 pb-0.5 pt-1.5 text-[9px] font-semibold uppercase tracking-widest text-gray-600">
                  Range
                </div>
                <div className="px-3 pb-2 pt-1">
                  <RangeSlider
                    min={sliderMin}
                    max={sliderMax}
                    valueMin={sliderLo}
                    valueMax={sliderHi}
                    fmt={fmt}
                    onChange={(lo, hi) => {
                      sliderTouched.current = true;
                      setSliderLo(lo);
                      setSliderHi(hi);
                      onChange(`${RANGE_PREFIX}${lo}:${hi}`);
                    }}
                  />
                </div>
              </>
            )}

            {discreteOptions.length > 0 && (
              <>
                <div className="mt-1 border-t border-gray-800 px-3 pb-0.5 pt-1.5 text-[9px] font-semibold uppercase tracking-widest text-gray-600">
                  {"Exact"}
                </div>
                <div style={{ height: "200px", overflowY: "auto", overflowX: "hidden", display: "block" }}>
                  {discreteOptions.map((o) => (
                    <div
                      key={o}
                      role="button"
                      onClick={() => select(o)}
                      className={clsx("w-full overflow-hidden px-3 py-1.5 text-left text-[11px] transition hover:bg-gray-800 cursor-pointer", value === o ? "text-green-400" : "text-gray-300")}
                      style={{ display: "block", whiteSpace: "nowrap", textOverflow: "ellipsis" }}
                    >
                      {formatFn ? fmt(Number(o)) : o}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
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
  filters,
  filterOptions,
  onFilter,
}: {
  groups: ProductGroupWithSelection[];
  expandedRows: Record<string, boolean>;
  minPricePer100g: number | null;
  onSort: (key: SortKey) => void;
  onSelectFlavour: (group: ProductGroupWithSelection, flavour: string) => void;
  onToggleExpanded: (groupId: string) => void;
  sortDir: SortDir;
  sortKey: SortKey;
  filters: ColumnFilters;
  filterOptions: ColumnFilterOptions;
  onFilter: (key: keyof ColumnFilters, value: string) => void;
}) {
  const headerClass =
    "px-4 py-2 text-center text-xs font-semibold uppercase tracking-wider text-gray-500 whitespace-nowrap align-bottom";

  const sortableHeader = (label: string, key: SortKey) => (
    <button
      type="button"
      onClick={() => onSort(key)}
      className="inline-flex items-center gap-1.5 transition-colors hover:text-gray-300"
    >
      {label}
      <SortIcon col={key} sortKey={sortKey} sortDir={sortDir} />
    </button>
  );

  return (
    <div className="hidden overflow-x-auto overflow-y-visible sm:block">
      <table className="w-full text-sm">
        <thead className="border-b border-gray-800 bg-gray-800/50">
          <tr>
            <th className={`${headerClass} w-28`}>Image</th>
            <th className={headerClass}>{sortableHeader("Product", "name")}</th>

            {/* Variant */}
            <th className={`${headerClass} min-w-[220px]`}>
              <div className="flex flex-col items-center gap-1.5">
                <FilterDropdown value={filters.flavour} options={filterOptions.flavours} onChange={(v) => onFilter("flavour", v)} />
                <span>Variant</span>
              </div>
            </th>

            {/* Size */}
            <th className={headerClass}>
              <div className="flex flex-col items-center gap-1.5">
                <FilterDropdown value={filters.size} options={filterOptions.sizes} onChange={(v) => onFilter("size", v)} />
                {sortableHeader("Size", "size")}
              </div>
            </th>

            {/* Servings */}
            <th className={headerClass}>
              <div className="flex flex-col items-center gap-1.5">
                <FilterDropdown value={filters.servings} options={filterOptions.servings} onChange={(v) => onFilter("servings", v)} formatFn={(n) => `${n}`} numeric />
                <span>Servings</span>
              </div>
            </th>

            {/* Price */}
            <th className={headerClass}>
              <div className="flex flex-col items-center gap-1.5">
                <FilterDropdown value={filters.price} options={filterOptions.prices} onChange={(v) => onFilter("price", v)} formatFn={(n) => `£${n.toFixed(2)}`} numeric />
                {sortableHeader("Price", "price")}
              </div>
            </th>

            {/* Per 100g */}
            <th className={headerClass}>
              <div className="flex flex-col items-center gap-1.5">
                <FilterDropdown value={filters.pricePer100g} options={filterOptions.pricePer100gs} onChange={(v) => onFilter("pricePer100g", v)} formatFn={(n) => `£${n.toFixed(2)}`} numeric />
                {sortableHeader("Per 100g", "pricePer100g")}
              </div>
            </th>

            {/* Protein */}
            <th className={headerClass}>
              <div className="flex flex-col items-center gap-1.5">
                <FilterDropdown value={filters.protein} options={filterOptions.proteins} onChange={(v) => onFilter("protein", v)} formatFn={(n) => `${n}g`} numeric />
                <span>Protein</span>
              </div>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800">
          {groups.map((group) => {
            const product = group.selected;
            const isExpanded = Boolean(expandedRows[group.id]);
            const activeFlavour = product.flavour ?? "";
            const flavourOptions = getFlavourOptions(group);

            const flavourVariants = getVariantsForFlavour(group, activeFlavour).filter((v) => {
              if (filters.flavour !== "all" && (v.flavour ?? "") !== filters.flavour) return false;
              if (filters.size !== "all" && v.size !== filters.size) return false;
              if (filters.servings !== "all") {
                if (filters.servings.startsWith(RANGE_PREFIX)) {
                  if (!matchesRange(v.servings, filters.servings)) return false;
                } else {
                  if (v.servings === null || String(v.servings) !== filters.servings) return false;
                }
              }
              if (filters.price !== "all") {
                if (filters.price.startsWith(RANGE_PREFIX)) {
                  if (!matchesRange(v.price, filters.price)) return false;
                } else {
                  if (v.price.toFixed(2) !== filters.price) return false;
                }
              }
              if (filters.pricePer100g !== "all") {
                if (filters.pricePer100g.startsWith(RANGE_PREFIX)) {
                  if (!matchesRange(v.pricePer100g, filters.pricePer100g)) return false;
                } else {
                  if (v.pricePer100g.toFixed(2) !== filters.pricePer100g) return false;
                }
              }
              if (filters.protein !== "all") {
                if (filters.protein.startsWith(RANGE_PREFIX)) {
                  if (!matchesRange(v.proteinPer100g, filters.protein)) return false;
                } else {
                  if (v.proteinPer100g === null || String(v.proteinPer100g) !== filters.protein) return false;
                }
              }
              return true;
            });

            if (flavourVariants.length === 0) return null;

            const groupMinPricePer100g = flavourVariants
              .filter((v) => v.inStock)
              .reduce<number | null>(
                (min, v) => (min === null || v.pricePer100g < min ? v.pricePer100g : min),
                null
              );
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
                        isBestValue ? "bg-green-950/20 hover:bg-green-950/30" : "hover:bg-gray-800/60"
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
                          <span className={clsx("font-semibold", variantBestValue ? "text-green-400" : "text-gray-300")}>
                            {formatCurrency(variant.pricePer100g)}
                          </span>
                          {variantBestValue && (
                            <span className="whitespace-nowrap rounded border border-green-800/50 bg-green-950/70 px-2 py-0.5 text-xs font-bold text-green-400">
                              Best Value
                            </span>
                          )}
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
                {isExpanded && (
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
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
