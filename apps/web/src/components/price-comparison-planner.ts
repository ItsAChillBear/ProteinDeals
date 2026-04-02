import {
  getPricePerServing,
  getProteinPerServing,
} from "./price-comparison-metrics";
import type { Product, ProductGroupWithSelection } from "./price-comparison-table.types";
import type { ColumnFilters } from "./price-comparison-filters";
import { variantMatchesFilters } from "./price-comparison-filters";

export type BudgetPeriod = "day" | "week" | "month" | "year";

export interface ProteinPlannerState {
  proteinTarget: string;
  budgetEnabled: boolean;
  budgetAmount: string;
  budgetPeriod: BudgetPeriod;
}

export const DEFAULT_PROTEIN_PLANNER: ProteinPlannerState = {
  proteinTarget: "",
  budgetEnabled: false,
  budgetAmount: "",
  budgetPeriod: "week",
};

export function plannerMatchesVariant(
  variant: Product,
  planner: ProteinPlannerState
) {
  const proteinTarget = Number(planner.proteinTarget);
  if (!proteinTarget || proteinTarget <= 0) return true;

  const proteinPerServing = getProteinPerServing(variant);
  const pricePerServing = getPricePerServing(variant);
  if (proteinPerServing === null || pricePerServing === null || proteinPerServing <= 0) return false;

  const servingsPerDay = proteinTarget / proteinPerServing;
  const dailyCost = servingsPerDay * pricePerServing;

  if (!planner.budgetEnabled) return true;

  const budgetAmount = Number(planner.budgetAmount);
  if (!budgetAmount || budgetAmount <= 0) return true;

  return dailyCost <= getDailyBudget(budgetAmount, planner.budgetPeriod);
}

export function countMatchingVariantsForGroup(
  group: ProductGroupWithSelection,
  filters: ColumnFilters,
  planner: ProteinPlannerState
) {
  const activeFlavour = filters.flavour !== "all" ? filters.flavour : group.selected.flavour ?? "";
  return group.variants.filter((variant) => {
    if ((variant.flavour ?? "") !== activeFlavour) return false;
    return variantMatchesFilters(variant, filters) && plannerMatchesVariant(variant, planner);
  }).length;
}

function getDailyBudget(amount: number, period: BudgetPeriod) {
  if (period === "day") return amount;
  if (period === "week") return amount / 7;
  if (period === "month") return amount / 30;
  return amount / 365;
}
