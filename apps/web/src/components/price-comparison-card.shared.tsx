"use client";

import { Tag } from "lucide-react";
import { clsx } from "clsx";
import type { Product } from "./price-comparison-table.types";
import {
  matchesRange,
  MULTI_PREFIX,
  parseMultiFilter,
  RANGE_PREFIX,
  type ColumnFilters,
} from "./price-comparison-filters";
import {
  getCaloriesPerGramProtein,
  getCaloriesPerServing,
  getPricePerGramProtein,
  getPricePerServing,
  getProteinPerServing,
} from "./price-comparison-metrics";
import { getCaloriesPer100g, getServingsPerPack } from "./price-comparison-nutrition";

export function Stat({
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
  const valueColor =
    bestValue && color === "sky"
      ? "text-green-500"
      : color === "violet"
        ? "text-violet-500"
        : color === "amber"
          ? "text-amber-500"
          : color === "sky"
            ? "text-sky-500"
            : "text-theme-2";

  return (
    <span
      className={clsx(
        "relative flex-shrink-0 text-center text-[12px] font-medium",
        valueColor,
        className
      )}
    >
      {children}
      {bestValue ? (
        <Tag
          className="absolute -right-1 -top-1.5 h-3.5 w-3.5 text-green-500"
          aria-label="Best value"
        />
      ) : null}
    </span>
  );
}

export function formatSize(size: string) {
  return size.replace(/^(\d+\.\d+?)0+(kg|g)$/, "$1$2");
}

export function matchesVariantFilters(variant: Product, filters: ColumnFilters) {
  if (filters.retailer !== "all") {
    if (filters.retailer.startsWith(MULTI_PREFIX)) {
      const allowed = parseMultiFilter(filters.retailer);
      if (!allowed.includes(variant.retailer)) return false;
    } else if (variant.retailer !== filters.retailer) {
      return false;
    }
  }

  if (filters.product !== "all") {
    const baseName =
      variant.name.endsWith(` - ${variant.flavour ?? ""}`) && variant.flavour
        ? variant.name.slice(0, -(` - ${variant.flavour}`).length)
        : variant.name;
    if (filters.product.startsWith(MULTI_PREFIX)) {
      const allowed = parseMultiFilter(filters.product);
      if (!allowed.includes(baseName)) return false;
    } else if (baseName !== filters.product) {
      return false;
    }
  }

  if (filters.flavour !== "all") {
    if (filters.flavour.startsWith(MULTI_PREFIX)) {
      const allowed = parseMultiFilter(filters.flavour);
      if (!allowed.includes(variant.flavour ?? "")) return false;
    } else if ((variant.flavour ?? "") !== filters.flavour) {
      return false;
    }
  }

  if (filters.size !== "all") {
    if (filters.size.startsWith(RANGE_PREFIX)) {
      if (!matchesRange(variant.sizeG, filters.size)) return false;
    } else if (variant.size !== filters.size) {
      return false;
    }
  }

  if (!matchesNumericFilter(getServingsPerPack(variant), filters.servings)) return false;
  if (!matchesNumericFilter(variant.price, filters.price, 2)) return false;
  if (!matchesNumericFilter(variant.pricePer100g, filters.pricePer100g, 2)) return false;
  if (!matchesNumericFilter(variant.proteinPer100g, filters.protein)) return false;
  if (!matchesNumericFilter(getProteinPerServing(variant), filters.proteinPerServing, 1)) return false;
  if (!matchesNumericFilter(getCaloriesPer100g(variant), filters.caloriesPer100g)) return false;

  const caloriesPerServing = getCaloriesPerServing(variant);
  if (
    !matchesNumericFilter(
      caloriesPerServing !== null ? Math.round(caloriesPerServing) : null,
      filters.caloriesPerServing
    )
  ) {
    return false;
  }

  if (
    !matchesNumericFilter(
      getCaloriesPerGramProtein(variant),
      filters.caloriesPerGramProtein,
      2
    )
  ) {
    return false;
  }

  if (!matchesNumericFilter(getPricePerServing(variant), filters.pricePerServing, 3)) return false;
  if (
    !matchesNumericFilter(getPricePerGramProtein(variant), filters.pricePerGramProtein, 3)
  ) {
    return false;
  }

  return true;
}

function matchesNumericFilter(value: number | null, filter: string, fixedDigits?: number) {
  if (filter === "all") return true;
  if (filter.startsWith(RANGE_PREFIX)) return matchesRange(value, filter);
  if (value === null) return false;
  return fixedDigits !== undefined ? value.toFixed(fixedDigits) === filter : String(value) === filter;
}
