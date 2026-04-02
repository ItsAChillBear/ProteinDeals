import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { clsx } from "clsx";
import type {
  Product,
  ProductGroup,
  ProductGroupWithSelection,
  SortDir,
  SortKey,
} from "./price-comparison-table.types";
import { getDailyCaloriesForTarget, getDailyCostForTarget } from "./price-comparison-planner";
import { getPricePerGramProtein, getPricePerServing } from "./price-comparison-metrics";
import { getProteinPer100g } from "./price-comparison-nutrition";
import type { ProteinPlannerState } from "./price-comparison-planner";

export function ProductThumbnail({
  name,
  imageUrl,
}: {
  name: string;
  imageUrl: string | null;
}) {
  if (!imageUrl) {
    return (
      <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-dashed border-gray-800 bg-gray-950 px-1 text-center text-[10px] uppercase tracking-wide text-gray-600">
        No image
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt={name}
      loading="lazy"
      className="h-14 w-14 rounded-xl border border-gray-800 bg-gray-950 object-cover"
    />
  );
}

export function BuyButton({ product }: { product: Product }) {
  return (
    <a
      href={product.url}
      target="_blank"
      rel="noopener noreferrer sponsored"
      className={clsx(
        "inline-flex w-14 items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-xs font-bold transition-all duration-150",
        product.inStock
          ? "bg-green-500 text-gray-950 hover:bg-green-400"
          : "cursor-not-allowed bg-gray-700 text-gray-500"
      )}
    >
      Buy <ExternalLink className="h-3 w-3" />
    </a>
  );
}

export function ProductPageLink({ slug }: { slug: string }) {
  return (
    <Link
      href={`/product/${slug}`}
      className="text-sm font-medium text-green-300 transition-colors hover:text-green-200"
    >
      Open product page
    </Link>
  );
}

export function normalizeBaseName(product: Product) {
  if (!product.flavour) return product.name;
  const suffix = ` - ${product.flavour}`;
  return product.name.endsWith(suffix) ? product.name.slice(0, -suffix.length) : product.name;
}

export function groupProducts(products: Product[]) {
  const groups = new Map<string, ProductGroup>();

  for (const product of products) {
    const baseName = normalizeBaseName(product);
    const key = [
      product.brand.toLowerCase(),
      product.retailer.toLowerCase(),
      product.type.toLowerCase(),
      baseName.toLowerCase(),
      (product.flavour ?? "").toLowerCase(),
    ].join("::");

    const existing = groups.get(key);
    if (existing) {
      existing.variants.push(product);
      if (!existing.imageUrl && product.imageUrl) existing.imageUrl = product.imageUrl;
      if (!existing.description && product.description) existing.description = product.description;
      continue;
    }

    groups.set(key, {
      id: key,
      baseName,
      brand: product.brand,
      retailer: product.retailer,
      type: product.type,
      imageUrl: product.imageUrl,
      description: product.description,
      variants: [product],
    });
  }

  return [...groups.values()].map((group) => ({
    ...group,
    variants: [...group.variants].sort((a, b) => {
      const flavourCompare = (a.flavour ?? "").localeCompare(b.flavour ?? "");
      if (flavourCompare !== 0) return flavourCompare;
      if (a.sizeG !== b.sizeG) return a.sizeG - b.sizeG;
      return a.pricePer100g - b.pricePer100g;
    }),
  }));
}

export function getDefaultVariant(group: ProductGroup) {
  const inStock = group.variants.filter((variant) => variant.inStock);
  const pool = inStock.length ? inStock : group.variants;
  return [...pool].sort((a, b) => a.pricePer100g - b.pricePer100g)[0];
}

export function getVariantOptions(group: ProductGroup) {
  return group.variants.map((variant) => ({
    value: variant.id,
    label: [variant.flavour ?? "Default", variant.size].join(" - "),
  }));
}

export function getFlavourOptions(group: ProductGroup) {
  const seen = new Set<string>();

  return group.variants
    .map((variant) => variant.flavour ?? "")
    .filter((flavour) => {
      if (seen.has(flavour)) return false;
      seen.add(flavour);
      return true;
    })
    .map((flavour) => ({
      value: flavour,
      label: flavour || "Default",
    }));
}

export function getSizeOptions(group: ProductGroup, flavour: string) {
  return group.variants
    .filter((variant) => (variant.flavour ?? "") === flavour)
    .map((variant) => ({
      value: variant.id,
      label: variant.size,
    }));
}

export function getAllSizeLabels(group: ProductGroup) {
  return [...new Set(group.variants.map((variant) => variant.size))];
}

export function getVariantsForFlavour(group: ProductGroup, flavour: string) {
  return group.variants.filter((variant) => (variant.flavour ?? "") === flavour);
}

export function getDisplayProteinPer100g(
  selected: Product,
  variants: Product[]
) {
  const selectedProtein = getProteinPer100g(selected);
  if (selectedProtein !== null) return selectedProtein;

  for (const variant of variants) {
    const nutritionProtein = getProteinPer100g(variant);
    if (nutritionProtein !== null) return nutritionProtein;
  }

  return null;
}

export function sortGroups(
  groups: ProductGroupWithSelection[],
  sortKey: SortKey,
  sortDir: SortDir,
  planner?: ProteinPlannerState
) {
  return [...groups].sort((a, b) => {
    const aValue = getSortValue(a, sortKey, planner);
    const bValue = getSortValue(b, sortKey, planner);

    if (typeof aValue === "string" && typeof bValue === "string") {
      return sortDir === "asc"
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }

    return sortDir === "asc"
      ? Number(aValue) - Number(bValue)
      : Number(bValue) - Number(aValue);
  });
}

function getSortValue(group: ProductGroupWithSelection, sortKey: SortKey, planner?: ProteinPlannerState) {
  if (sortKey === "name") return group.baseName;
  if (sortKey === "size") return group.selected.sizeG;
  if (sortKey === "pricePerServing") return getPricePerServing(group.selected) ?? Number.POSITIVE_INFINITY;
  if (sortKey === "pricePerGramProtein") return getPricePerGramProtein(group.selected) ?? Number.POSITIVE_INFINITY;
  if (sortKey === "dailyCost") {
    const target = Number(planner?.proteinTarget);
    if (!target) return Number.POSITIVE_INFINITY;
    return getDailyCostForTarget(group.selected, target) ?? Number.POSITIVE_INFINITY;
  }
  if (sortKey === "dailyCalories") {
    const target = Number(planner?.proteinTarget);
    if (!target) return Number.POSITIVE_INFINITY;
    return getDailyCaloriesForTarget(group.selected, target) ?? Number.POSITIVE_INFINITY;
  }
  return group.selected[sortKey];
}

export function formatCurrency(value: number) {
  return `£${value.toFixed(2)}`;
}
