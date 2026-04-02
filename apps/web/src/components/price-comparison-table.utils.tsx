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

export function ProductThumbnail({
  name,
  imageUrl,
}: {
  name: string;
  imageUrl: string | null;
}) {
  if (!imageUrl) {
    return (
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-dashed border-gray-800 bg-gray-950 px-2 text-center text-[10px] uppercase tracking-wide text-gray-600">
        No image
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt={name}
      loading="lazy"
      className="h-20 w-20 rounded-2xl border border-gray-800 bg-gray-950 object-cover"
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
        "inline-flex w-20 items-center justify-center gap-1 rounded-lg px-3 py-2 text-xs font-bold transition-all duration-150",
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
  if (selected.proteinPer100g !== null) {
    return selected.proteinPer100g;
  }

  return variants.find((variant) => variant.proteinPer100g !== null)?.proteinPer100g ?? null;
}

export function sortGroups(
  groups: ProductGroupWithSelection[],
  sortKey: SortKey,
  sortDir: SortDir
) {
  return [...groups].sort((a, b) => {
    const aValue =
      sortKey === "name" ? a.baseName : sortKey === "size" ? a.selected.sizeG : a.selected[sortKey];
    const bValue =
      sortKey === "name" ? b.baseName : sortKey === "size" ? b.selected.sizeG : b.selected[sortKey];

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

export function formatCurrency(value: number) {
  return `£${value.toFixed(2)}`;
}
