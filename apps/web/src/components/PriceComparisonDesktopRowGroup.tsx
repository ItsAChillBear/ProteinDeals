"use client";

import PriceComparisonDesktopCardGroup from "./PriceComparisonDesktopCardGroup";
import PriceComparisonDesktopTableGroup from "./PriceComparisonDesktopTableGroup";
import type { ProductGroupWithSelection, SortDir, SortKey } from "./price-comparison-table.types";
import type { ColumnFilters, ColumnFilterOptions } from "./price-comparison-filters";
import {
  plannerMatchesVariant,
  type ProteinPlannerState,
} from "./price-comparison-planner";
import type { ColumnVisibility } from "./price-comparison-visibility";
import { applyPriceMode, getCaloriesPerServing, getPricePerGramProtein, getPricePerServing, type PriceMode } from "./price-comparison-metrics";
import { getDisplayProteinPer100g } from "./price-comparison-table.utils";
import { matchesVariantFilters } from "./price-comparison-card.shared";

interface Props {
  group: ProductGroupWithSelection;
  bestValueVariantIds: Record<string, string[]>;
  calorieMode?: boolean;
  calorieVariantIds?: { lowest: string[]; highest: string[] };
  filters: ColumnFilters;
  planner: ProteinPlannerState;
  visibility: ColumnVisibility;
  isExpanded: boolean;
  onToggleExpanded: (groupId: string) => void;
  totalColumns: number;
  viewMode: "card" | "table";
  columnGroupMode?: "nutrient" | "measure";
  priceMode?: PriceMode;
  showFilterBar?: boolean;
  filterOptions?: ColumnFilterOptions;
  onFilter?: (key: keyof ColumnFilters, value: string) => void;
  onSort?: (key: SortKey) => void;
  sortKey?: SortKey;
  sortDir?: SortDir;
}

export function PriceComparisonDesktopRowGroup({
  group,
  bestValueVariantIds,
  calorieMode = false,
  calorieVariantIds = { lowest: [], highest: [] },
  filters,
  planner,
  visibility,
  isExpanded,
  onToggleExpanded,
  totalColumns,
  viewMode,
  columnGroupMode = "nutrient",
  priceMode = "single",
  showFilterBar,
  filterOptions,
  onFilter,
  sortKey,
}: Props) {
  const product = group.selected;
  const flavourVariants = group.variants
    .filter((variant) => matchesVariantFilters(variant, filters) && plannerMatchesVariant(variant, planner))
    .sort((a, b) => {
      const pa = applyPriceMode(a, priceMode);
      const pb = applyPriceMode(b, priceMode);
      const getVal = (v: typeof pa) => {
        if (sortKey === "pricePerServing") return getPricePerServing(v);
        if (sortKey === "caloriesPerServing") return getCaloriesPerServing(v);
        if (sortKey === "pricePerGramProtein") return getPricePerGramProtein(v);
        if (sortKey === "caloriesPer100g" || sortKey === "caloriesPerGramProtein") return null; // group-level, not variant
        return v.pricePer100g;
      };
      const aVal = getVal(pa);
      const bVal = getVal(pb);
      if (aVal === null) return 1;
      if (bVal === null) return -1;
      return aVal - bVal;
    });

  if (!flavourVariants.length) return null;

  const displayProteinPer100g = getDisplayProteinPer100g(product, flavourVariants);
  const bestValueIds = Object.values(bestValueVariantIds).flat();
  const isBestValue =
    product.inStock &&
    bestValueIds.length > 0 &&
    flavourVariants.some((variant) => bestValueIds.includes(variant.id));

  const proteinTarget = Number(planner.proteinTarget);
  const showPlanner = planner.committed && proteinTarget > 0;

  if (viewMode === "card") {
    return (
      <PriceComparisonDesktopCardGroup
        group={group}
        flavourVariants={flavourVariants}
        bestValueVariantIds={bestValueVariantIds}
        calorieMode={calorieMode}
        calorieVariantIds={calorieVariantIds}
        visibility={visibility}
        isBestValue={isBestValue}
        isExpanded={isExpanded}
        onToggleExpanded={onToggleExpanded}
        totalColumns={totalColumns}
        showPlanner={showPlanner}
        proteinTarget={proteinTarget}
        planner={planner}
        showFilterBar={showFilterBar}
        filterOptions={filterOptions}
        filters={filters}
        onFilter={onFilter}
        priceMode={priceMode}
      />
    );
  }

  return (
    <PriceComparisonDesktopTableGroup
      group={group}
      flavourVariants={flavourVariants}
      bestValueVariantIds={bestValueVariantIds}
      calorieMode={calorieMode}
      calorieVariantIds={calorieVariantIds}
      visibility={visibility}
      isBestValue={isBestValue}
      isExpanded={isExpanded}
      onToggleExpanded={onToggleExpanded}
      totalColumns={totalColumns}
      showPlanner={showPlanner}
      proteinTarget={proteinTarget}
      planner={planner}
      columnGroupMode={columnGroupMode}
      displayProteinPer100g={displayProteinPer100g}
      priceMode={priceMode}
    />
  );
}
