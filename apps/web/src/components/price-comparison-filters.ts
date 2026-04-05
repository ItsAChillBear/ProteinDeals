import { getCaloriesPerGramProtein, getCaloriesPerServing, getPricePerGramProtein, getPricePerServing, getProteinPerServing } from "./price-comparison-metrics";
import { getCaloriesPer100g } from "./price-comparison-nutrition";
import type { Product, ProductGroupWithSelection } from "./price-comparison-table.types";
import { normalizeBaseName } from "./price-comparison-table.utils";

export const RANGE_PREFIX = "range:";
export const MULTI_PREFIX = "multi:";

export function parseMultiFilter(filter: string): string[] {
  return filter.replace(MULTI_PREFIX, "").split("\t").filter(Boolean);
}

export function buildMultiFilter(values: string[]): string {
  return `${MULTI_PREFIX}${values.join("\t")}`;
}

export interface ColumnFilters {
  search: string;
  size: string;
  flavour: string;
  retailer: string;
  category: string;
  subcategory: string;
  product: string;
  servings: string;
  pricePerServing: string;
  price: string;
  pricePer100g: string;
  protein: string;
  pricePerGramProtein: string;
  caloriesPer100g: string;
  caloriesPerGramProtein: string;
  caloriesPerServing: string;
  proteinPerServing: string;
}

export interface ColumnFilterOptions {
  sizes: string[];
  sizeGs: number[];
  flavours: string[];
  retailers: string[];
  categories: string[];
  subcategories: string[];
  products: string[];
  servings: string[];
  pricePerServings: string[];
  prices: string[];
  pricePer100gs: string[];
  proteins: string[];
  pricePerGramProteins: string[];
  caloriesPer100gs: string[];
  caloriesPerGramProteins: string[];
  caloriesPerServings: string[];
  proteinPerServings: string[];
}

export const DEFAULT_FILTERS: ColumnFilters = {
  search: "",
  size: "all",
  flavour: "all",
  retailer: "all",
  category: "all",
  subcategory: "all",
  product: "all",
  servings: "all",
  pricePerServing: "all",
  price: "all",
  pricePer100g: "all",
  protein: "all",
  pricePerGramProtein: "all",
  caloriesPer100g: "all",
  caloriesPerGramProtein: "all",
  caloriesPerServing: "all",
  proteinPerServing: "all",
};

export const FILTER_KEYS: Array<keyof ColumnFilters> = [
  "search",
  "size",
  "flavour",
  "retailer",
  "category",
  "subcategory",
  "product",
  "servings",
  "pricePerServing",
  "price",
  "pricePer100g",
  "protein",
  "pricePerGramProtein",
  "caloriesPer100g",
  "caloriesPerGramProtein",
  "caloriesPerServing",
  "proteinPerServing",
];

export function matchesRange(value: number | null, filter: string): boolean {
  if (!filter.startsWith(RANGE_PREFIX)) return true;
  if (value === null) return false;
  const [lo, hi] = filter.replace(RANGE_PREFIX, "").split(":");
  return value >= Number(lo) && (hi === "" || value <= Number(hi));
}

export function getVisibleVariants(groups: ProductGroupWithSelection[]) {
  return groups.flatMap((group) => group.variants);
}

export function getFilterOptionsForFilters(
  visibleVariants: Product[],
  allVariants: Product[],
  filters: ColumnFilters
): ColumnFilterOptions {
  const optionFilters = { ...filters, search: DEFAULT_FILTERS.search };

  return {
    ...(() => {
      const sizeToG = new Map(visibleVariants.map((v) => [v.size, v.sizeG]));
      const sizes = getOptionsForKey(visibleVariants, optionFilters, "size", (variant) => variant.size)
        .sort((a, b) => (sizeToG.get(a) ?? 0) - (sizeToG.get(b) ?? 0));
      return { sizes, sizeGs: sizes.map((s) => sizeToG.get(s) ?? 0) };
    })(),
    flavours: getOptionsForKey(allVariants, optionFilters, "flavour", (variant) => variant.flavour ?? "")
      .filter(Boolean)
      .sort(),
    retailers: getOptionsForKey(allVariants, optionFilters, "retailer", (variant) => variant.retailer)
      .sort(),
    categories: getOptionsForKey(allVariants, optionFilters, "category", (variant) => variant.category)
      .sort(),
    subcategories: getAtomicSubcategoryOptions(allVariants, optionFilters).sort(),
    products: getOptionsForKey(allVariants, optionFilters, "product", (variant) => normalizeBaseName(variant))
      .sort(),
    servings: getOptionsForKey(visibleVariants, optionFilters, "servings", (variant) =>
      variant.servings !== null ? String(variant.servings) : null
    ).sort((a, b) => Number(a) - Number(b)),
    pricePerServings: getOptionsForKey(visibleVariants, optionFilters, "pricePerServing", (variant) => {
      const value = getPricePerServing(variant);
      return value !== null ? value.toFixed(3) : null;
    }).sort((a, b) => Number(a) - Number(b)),
    prices: getOptionsForKey(visibleVariants, optionFilters, "price", (variant) =>
      variant.price !== null ? variant.price.toFixed(2) : null
    )
      .sort((a, b) => Number(a) - Number(b)),
    pricePer100gs: getOptionsForKey(visibleVariants, optionFilters, "pricePer100g", (variant) =>
      variant.pricePer100g !== null ? variant.pricePer100g.toFixed(2) : null
    ).sort((a, b) => Number(a) - Number(b)),
    proteins: getOptionsForKey(visibleVariants, optionFilters, "protein", (variant) =>
      variant.proteinPer100g !== null ? String(variant.proteinPer100g) : null
    ).sort((a, b) => Number(a) - Number(b)),
    pricePerGramProteins: getOptionsForKey(
      visibleVariants,
      optionFilters,
      "pricePerGramProtein",
      (variant) => {
        const value = getPricePerGramProtein(variant);
        return value !== null ? value.toFixed(3) : null;
      }
    ).sort((a, b) => Number(a) - Number(b)),
    caloriesPer100gs: getOptionsForKey(
      visibleVariants,
      optionFilters,
      "caloriesPer100g",
      (variant) => {
        const value = getCaloriesPer100g(variant);
        return value !== null ? String(value) : null;
      }
    ).sort((a, b) => Number(a) - Number(b)),
    caloriesPerGramProteins: getOptionsForKey(
      visibleVariants,
      optionFilters,
      "caloriesPerGramProtein",
      (variant) => {
        const value = getCaloriesPerGramProtein(variant);
        return value !== null ? value.toFixed(2) : null;
      }
    ).sort((a, b) => Number(a) - Number(b)),
    caloriesPerServings: getOptionsForKey(
      visibleVariants,
      optionFilters,
      "caloriesPerServing",
      (variant) => {
        const value = getCaloriesPerServing(variant);
        return value !== null ? Math.round(value).toString() : null;
      }
    ).sort((a, b) => Number(a) - Number(b)),
    proteinPerServings: getOptionsForKey(
      visibleVariants,
      optionFilters,
      "proteinPerServing",
      (variant) => {
        const value = getProteinPerServing(variant);
        return value !== null ? value.toFixed(1) : null;
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
      search: filters.search,
      size: targetKey === "size" ? DEFAULT_FILTERS.size : filters.size,
      flavour: targetKey === "flavour" ? DEFAULT_FILTERS.flavour : filters.flavour,
      retailer: targetKey === "retailer" ? DEFAULT_FILTERS.retailer : filters.retailer,
      category: targetKey === "category" ? DEFAULT_FILTERS.category : filters.category,
      subcategory: targetKey === "subcategory" ? DEFAULT_FILTERS.subcategory : filters.subcategory,
      product: targetKey === "product" ? DEFAULT_FILTERS.product : filters.product,
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
      caloriesPer100g:
        targetKey === "caloriesPer100g" ? DEFAULT_FILTERS.caloriesPer100g : filters.caloriesPer100g,
      caloriesPerGramProtein:
        targetKey === "caloriesPerGramProtein"
          ? DEFAULT_FILTERS.caloriesPerGramProtein
          : filters.caloriesPerGramProtein,
      caloriesPerServing:
        targetKey === "caloriesPerServing"
          ? DEFAULT_FILTERS.caloriesPerServing
          : filters.caloriesPerServing,
      proteinPerServing:
        targetKey === "proteinPerServing"
          ? DEFAULT_FILTERS.proteinPerServing
          : filters.proteinPerServing,
    })
  );

  return Array.from(new Set(matchingVariants.map(valueGetter).filter((value): value is string => Boolean(value))));
}

export function sanitizeFilters(variants: Product[], filters: ColumnFilters) {
  let nextFilters = { ...filters };
  const optionFilters = { ...filters, search: DEFAULT_FILTERS.search };

  for (const key of FILTER_KEYS) {
    if (key === "search") continue;
    const options = getFilterOptionsForFilters(variants, variants, {
      ...nextFilters,
      search: optionFilters.search,
    });
    const validOptions = mapOptionsForKey(options, key);
    if (
      nextFilters[key] !== "all" &&
      !nextFilters[key].startsWith(RANGE_PREFIX) &&
      !nextFilters[key].startsWith(MULTI_PREFIX) &&
      !validOptions.includes(nextFilters[key])
    ) {
      nextFilters = { ...nextFilters, [key]: "all" };
    }
  }

  return nextFilters;
}

function mapOptionsForKey(options: ColumnFilterOptions, key: keyof ColumnFilters) {
  switch (key) {
    case "search":
      return [] as string[]; // search is free-text, not option-based
    case "size":
      return options.sizes;
    case "flavour":
      return options.flavours;
    case "retailer":
      return options.retailers;
    case "category":
      return options.categories;
    case "product":
      return options.products;
    case "subcategory":
      return options.subcategories;
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
    case "caloriesPer100g":
      return options.caloriesPer100gs;
    case "caloriesPerGramProtein":
      return options.caloriesPerGramProteins;
    case "caloriesPerServing":
      return options.caloriesPerServings;
    case "proteinPerServing":
      return options.proteinPerServings;
  }
}

export function variantMatchesFilters(variant: Product, filters: ColumnFilters) {
  if (filters.search) {
    const q = filters.search.toLowerCase();
    if (!variant.searchText.includes(q)) return false;
  }
  if (filters.retailer !== "all") {
    if (filters.retailer.startsWith(MULTI_PREFIX)) {
      const allowed = parseMultiFilter(filters.retailer);
      if (!allowed.includes(variant.retailer)) return false;
    } else if (variant.retailer !== filters.retailer) return false;
  }
  if (filters.category !== "all") {
    if (filters.category.startsWith(MULTI_PREFIX)) {
      const allowed = parseMultiFilter(filters.category);
      if (!allowed.includes(variant.category)) return false;
    } else if (variant.category !== filters.category) return false;
  }
  if (filters.subcategory !== "all") {
    const variantSubcategories = splitCategoryLabels(variant.subcategory);
    if (filters.subcategory.startsWith(MULTI_PREFIX)) {
      const allowed = parseMultiFilter(filters.subcategory);
      if (!allowed.some((value) => variantSubcategories.includes(value))) return false;
    } else if (variant.subcategory !== filters.subcategory) {
      if (!variantSubcategories.includes(filters.subcategory)) return false;
    }
  }
  if (filters.product !== "all") {
    const baseName = normalizeBaseName(variant);
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
  if (!matchesNumericFilter(getPricePerServing(variant), filters.pricePerServing, 3)) return false;
  if (!matchesNumericFilter(variant.price, filters.price, 2)) return false;
  if (!matchesNumericFilter(variant.pricePer100g, filters.pricePer100g, 2)) return false;
  if (!matchesNumericFilter(variant.proteinPer100g, filters.protein)) return false;
  if (!matchesNumericFilter(getPricePerGramProtein(variant), filters.pricePerGramProtein, 3)) return false;
  if (!matchesNumericFilter(getCaloriesPer100g(variant), filters.caloriesPer100g)) return false;
  if (!matchesNumericFilter(getCaloriesPerGramProtein(variant), filters.caloriesPerGramProtein, 2)) return false;
  if (!matchesNumericFilter(getCaloriesPerServing(variant) !== null ? Math.round(getCaloriesPerServing(variant)!) : null, filters.caloriesPerServing)) return false;
  if (!matchesNumericFilter(getProteinPerServing(variant), filters.proteinPerServing, 1)) return false;
  return true;
}

function matchesNumericFilter(value: number | null, filter: string, fixedDigits?: number) {
  if (filter === "all") return true;
  if (filter.startsWith(RANGE_PREFIX)) return matchesRange(value, filter);
  if (value === null) return false;
  return fixedDigits !== undefined ? value.toFixed(fixedDigits) === filter : String(value) === filter;
}

function getAtomicSubcategoryOptions(variants: Product[], filters: ColumnFilters) {
  const matchingVariants = variants.filter((variant) =>
    variantMatchesFilters(variant, {
      search: filters.search,
      size: filters.size,
      flavour: filters.flavour,
      retailer: filters.retailer,
      category: filters.category,
      subcategory: DEFAULT_FILTERS.subcategory,
      product: filters.product,
      servings: filters.servings,
      pricePerServing: filters.pricePerServing,
      price: filters.price,
      pricePer100g: filters.pricePer100g,
      protein: filters.protein,
      pricePerGramProtein: filters.pricePerGramProtein,
      caloriesPer100g: filters.caloriesPer100g,
      caloriesPerGramProtein: filters.caloriesPerGramProtein,
      caloriesPerServing: filters.caloriesPerServing,
      proteinPerServing: filters.proteinPerServing,
    })
  );

  return Array.from(
    new Set(
      matchingVariants.flatMap((variant) => splitCategoryLabels(variant.subcategory))
    )
  );
}

function splitCategoryLabels(value: string) {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}
