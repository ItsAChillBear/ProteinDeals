import { getPricePerGramProtein, getPricePerServing } from "./price-comparison-metrics";
import type { Product, ProductGroupWithSelection } from "./price-comparison-table.types";

export const RANGE_PREFIX = "range:";

export interface ColumnFilters {
  size: string;
  flavour: string;
  servings: string;
  pricePerServing: string;
  price: string;
  pricePer100g: string;
  protein: string;
  pricePerGramProtein: string;
}

export interface ColumnFilterOptions {
  sizes: string[];
  flavours: string[];
  servings: string[];
  pricePerServings: string[];
  prices: string[];
  pricePer100gs: string[];
  proteins: string[];
  pricePerGramProteins: string[];
}

export const DEFAULT_FILTERS: ColumnFilters = {
  size: "all",
  flavour: "all",
  servings: "all",
  pricePerServing: "all",
  price: "all",
  pricePer100g: "all",
  protein: "all",
  pricePerGramProtein: "all",
};

export const FILTER_KEYS: Array<keyof ColumnFilters> = [
  "size",
  "flavour",
  "servings",
  "pricePerServing",
  "price",
  "pricePer100g",
  "protein",
  "pricePerGramProtein",
];

export function matchesRange(value: number | null, filter: string): boolean {
  if (!filter.startsWith(RANGE_PREFIX)) return true;
  if (value === null) return false;
  const [lo, hi] = filter.replace(RANGE_PREFIX, "").split(":");
  return value >= Number(lo) && (hi === "" || value < Number(hi));
}

export function getVisibleVariants(groups: ProductGroupWithSelection[]) {
  return groups.flatMap((group) => {
    const activeFlavour = group.selected.flavour ?? "";
    return group.variants.filter((variant) => (variant.flavour ?? "") === activeFlavour);
  });
}

export function getFilterOptionsForFilters(
  visibleVariants: Product[],
  allVariants: Product[],
  filters: ColumnFilters
): ColumnFilterOptions {
  return {
    sizes: getOptionsForKey(visibleVariants, filters, "size", (variant) => variant.size).sort(),
    flavours: getOptionsForKey(allVariants, filters, "flavour", (variant) => variant.flavour ?? "")
      .filter(Boolean)
      .sort(),
    servings: getOptionsForKey(visibleVariants, filters, "servings", (variant) =>
      variant.servings !== null ? String(variant.servings) : null
    ).sort((a, b) => Number(a) - Number(b)),
    pricePerServings: getOptionsForKey(visibleVariants, filters, "pricePerServing", (variant) => {
      const value = getPricePerServing(variant);
      return value !== null ? value.toFixed(3) : null;
    }).sort((a, b) => Number(a) - Number(b)),
    prices: getOptionsForKey(visibleVariants, filters, "price", (variant) => variant.price.toFixed(2))
      .sort((a, b) => Number(a) - Number(b)),
    pricePer100gs: getOptionsForKey(visibleVariants, filters, "pricePer100g", (variant) =>
      variant.pricePer100g.toFixed(2)
    ).sort((a, b) => Number(a) - Number(b)),
    proteins: getOptionsForKey(visibleVariants, filters, "protein", (variant) =>
      variant.proteinPer100g !== null ? String(variant.proteinPer100g) : null
    ).sort((a, b) => Number(a) - Number(b)),
    pricePerGramProteins: getOptionsForKey(
      visibleVariants,
      filters,
      "pricePerGramProtein",
      (variant) => {
        const value = getPricePerGramProtein(variant);
        return value !== null ? value.toFixed(3) : null;
      }
    ).sort((a, b) => Number(a) - Number(b)),
  };
}

function getOptionsForKey(
  variants: Product[],
  filters: ColumnFilters,
  targetKey: keyof ColumnFilters,
  valueGetter: (variant: Product) => string | null
) {
  const matchingVariants = variants.filter((variant) =>
    variantMatchesFilters(variant, {
      size: targetKey === "size" ? DEFAULT_FILTERS.size : filters.size,
      flavour: targetKey === "flavour" ? DEFAULT_FILTERS.flavour : filters.flavour,
      servings: targetKey === "servings" ? DEFAULT_FILTERS.servings : filters.servings,
      pricePerServing:
        targetKey === "pricePerServing" ? DEFAULT_FILTERS.pricePerServing : filters.pricePerServing,
      price: targetKey === "price" ? DEFAULT_FILTERS.price : filters.price,
      pricePer100g:
        targetKey === "pricePer100g" ? DEFAULT_FILTERS.pricePer100g : filters.pricePer100g,
      protein: targetKey === "protein" ? DEFAULT_FILTERS.protein : filters.protein,
      pricePerGramProtein:
        targetKey === "pricePerGramProtein"
          ? DEFAULT_FILTERS.pricePerGramProtein
          : filters.pricePerGramProtein,
    })
  );

  return Array.from(new Set(matchingVariants.map(valueGetter).filter((value): value is string => Boolean(value))));
}

export function sanitizeFilters(variants: Product[], filters: ColumnFilters) {
  let nextFilters = { ...filters };

  for (const key of FILTER_KEYS) {
    const options = getFilterOptionsForFilters(variants, variants, nextFilters);
    const validOptions = mapOptionsForKey(options, key);
    if (
      nextFilters[key] !== "all" &&
      !nextFilters[key].startsWith(RANGE_PREFIX) &&
      !validOptions.includes(nextFilters[key])
    ) {
      nextFilters = { ...nextFilters, [key]: "all" };
    }
  }

  return nextFilters;
}

function mapOptionsForKey(options: ColumnFilterOptions, key: keyof ColumnFilters) {
  switch (key) {
    case "size":
      return options.sizes;
    case "flavour":
      return options.flavours;
    case "servings":
      return options.servings;
    case "pricePerServing":
      return options.pricePerServings;
    case "price":
      return options.prices;
    case "pricePer100g":
      return options.pricePer100gs;
    case "protein":
      return options.proteins;
    case "pricePerGramProtein":
      return options.pricePerGramProteins;
  }
}

export function variantMatchesFilters(variant: Product, filters: ColumnFilters) {
  if (filters.flavour !== "all" && (variant.flavour ?? "") !== filters.flavour) return false;
  if (filters.size !== "all" && variant.size !== filters.size) return false;
  if (!matchesNumericFilter(variant.servings, filters.servings)) return false;
  if (!matchesNumericFilter(getPricePerServing(variant), filters.pricePerServing, 3)) return false;
  if (!matchesNumericFilter(variant.price, filters.price, 2)) return false;
  if (!matchesNumericFilter(variant.pricePer100g, filters.pricePer100g, 2)) return false;
  if (!matchesNumericFilter(variant.proteinPer100g, filters.protein)) return false;
  if (!matchesNumericFilter(getPricePerGramProtein(variant), filters.pricePerGramProtein, 3)) return false;
  return true;
}

function matchesNumericFilter(value: number | null, filter: string, fixedDigits?: number) {
  if (filter === "all") return true;
  if (filter.startsWith(RANGE_PREFIX)) return matchesRange(value, filter);
  if (value === null) return false;
  return fixedDigits !== undefined ? value.toFixed(fixedDigits) === filter : String(value) === filter;
}
