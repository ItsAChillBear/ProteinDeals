"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  XCircle,
} from "lucide-react";
import { clsx } from "clsx";

export interface Product {
  id: string;
  slug: string;
  name: string;
  brand: string;
  imageUrl: string | null;
  retailer: string;
  flavour: string | null;
  size: string;
  sizeG: number;
  servings: number | null;
  price: number;
  pricePer100g: number;
  proteinPer100g: number | null;
  inStock: boolean;
  url: string;
  type: string;
  description: string | null;
}

type SortKey = "name" | "size" | "price" | "pricePer100g";
type SortDir = "asc" | "desc";

interface Props {
  products: Product[];
}

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

function ProductThumbnail({ product }: { product: Product }) {
  if (!product.imageUrl) {
    return (
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-dashed border-gray-800 bg-gray-950 px-2 text-center text-[10px] uppercase tracking-wide text-gray-600">
        No image
      </div>
    );
  }

  return (
    <img
      src={product.imageUrl}
      alt={product.name}
      loading="lazy"
      className="h-20 w-20 rounded-2xl border border-gray-800 bg-gray-950 object-cover"
    />
  );
}

function BuyButton({ product }: { product: Product }) {
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

export default function PriceComparisonTable({ products }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("pricePer100g");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(key);
    setSortDir("asc");
  }

  function toggleExpanded(productId: string) {
    setExpandedRows((current) => ({
      ...current,
      [productId]: !current[productId],
    }));
  }

  const sorted = [...products].sort((a, b) => {
    let aVal: string | number = a[sortKey];
    let bVal: string | number = b[sortKey];

    if (sortKey === "size") {
      aVal = a.sizeG;
      bVal = b.sizeG;
    }

    if (typeof aVal === "string" && typeof bVal === "string") {
      return sortDir === "asc"
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    }

    return sortDir === "asc"
      ? Number(aVal) - Number(bVal)
      : Number(bVal) - Number(aVal);
  });

  const inStockProducts = sorted.filter((product) => product.inStock);
  const minPricePer100g = inStockProducts.length
    ? Math.min(...inStockProducts.map((product) => product.pricePer100g))
    : null;

  const headerClass =
    "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 whitespace-nowrap";

  const sortableHeader = (label: string, key: SortKey) => (
    <th className={headerClass}>
      <button
        type="button"
        onClick={() => handleSort(key)}
        className="flex items-center gap-1.5 transition-colors hover:text-gray-300"
      >
        {label}
        <SortIcon col={key} sortKey={sortKey} sortDir={sortDir} />
      </button>
    </th>
  );

  if (products.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-800 bg-gray-900 p-12 text-center">
        <p className="text-gray-400">No products match the current filters.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-800 bg-gray-900">
      <div className="flex items-center justify-between border-b border-gray-800 px-6 py-4">
        <p className="text-sm text-gray-400">
          <span className="font-semibold text-white">{products.length}</span>{" "}
          products found
        </p>
        <p className="text-xs text-gray-600">
          Sorted by: {sortKey === "pricePer100g" ? "Price / 100g" : sortKey}
        </p>
      </div>

      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-800 bg-gray-800/50">
            <tr>
              <th className={`${headerClass} w-28`}>Image</th>
              {sortableHeader("Product", "name")}
              <th className={`${headerClass} w-40`}>Flavour</th>
              {sortableHeader("Size", "size")}
              <th className={headerClass}>Servings</th>
              {sortableHeader("Price", "price")}
              {sortableHeader("Per 100g", "pricePer100g")}
              <th className={headerClass}>Protein</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {sorted.map((product) => {
              const isExpanded = Boolean(expandedRows[product.id]);
              const isBestValue =
                product.inStock &&
                minPricePer100g !== null &&
                product.pricePer100g === minPricePer100g;

              return (
                <Fragment key={product.id}>
                  <tr
                    className={clsx(
                      "transition-colors",
                      isBestValue
                        ? "bg-green-950/20 hover:bg-green-950/30"
                        : "hover:bg-gray-800/60"
                    )}
                  >
                    <td className="w-28 px-4 py-4 align-top">
                      <div className="flex flex-col items-start gap-3">
                        <ProductThumbnail product={product} />
                        <BuyButton product={product} />
                      </div>
                    </td>
                    <td className="max-w-sm px-4 py-4 align-top">
                      <button
                        type="button"
                        onClick={() => toggleExpanded(product.id)}
                        className="flex w-full items-start justify-between gap-3 text-left"
                      >
                        <div>
                          <div className="line-clamp-2 font-medium leading-snug text-white transition-colors hover:text-green-300">
                            {product.name}
                          </div>
                          <div className="mt-1 text-xs text-gray-500">
                            {product.brand} • {product.retailer} • {product.type} •{" "}
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
                    <td className="w-40 px-4 py-4 text-gray-300">
                      {product.flavour ?? "-"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-gray-400">
                      {product.size}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-gray-400">
                      {product.servings ? `${product.servings} servings` : "-"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 font-semibold text-white">
                      £{product.price.toFixed(2)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={clsx(
                            "font-semibold",
                            isBestValue ? "text-green-400" : "text-gray-300"
                          )}
                        >
                          £{product.pricePer100g.toFixed(2)}
                        </span>
                        {isBestValue ? (
                          <span className="whitespace-nowrap rounded border border-green-800/50 bg-green-950/70 px-2 py-0.5 text-xs font-bold text-green-400">
                            Best Value
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-gray-300">
                      {product.proteinPer100g !== null
                        ? `${product.proteinPer100g}g / 100g`
                        : "-"}
                    </td>
                  </tr>
                  {isExpanded ? (
                    <tr className={isBestValue ? "bg-green-950/10" : "bg-gray-900/70"}>
                      <td colSpan={8} className="px-4 pb-5 pt-1">
                        <div className="rounded-xl border border-gray-800 bg-gray-950/70 p-4">
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
                            {product.description ?? "No extra scraped description yet."}
                          </p>
                          <div className="mt-4">
                            <Link
                              href={`/product/${product.slug}`}
                              className="text-sm font-medium text-green-300 transition-colors hover:text-green-200"
                            >
                              Open product page
                            </Link>
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

      <div className="divide-y divide-gray-800 sm:hidden">
        {sorted.map((product) => {
          const isExpanded = Boolean(expandedRows[product.id]);
          const isBestValue =
            product.inStock &&
            minPricePer100g !== null &&
            product.pricePer100g === minPricePer100g;

          return (
            <div
              key={product.id}
              className={clsx(
                "p-4",
                isBestValue ? "bg-green-950/20" : "hover:bg-gray-800/40"
              )}
            >
              <div className="mb-3 flex items-start gap-3">
                <div className="flex flex-col items-start gap-3">
                  <ProductThumbnail product={product} />
                  <BuyButton product={product} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => toggleExpanded(product.id)}
                      className="text-left text-sm font-semibold leading-snug text-white transition-colors hover:text-green-300"
                    >
                      {product.name}
                    </button>
                    {isBestValue ? (
                      <span className="flex-shrink-0 rounded border border-green-800/50 bg-green-950/70 px-2 py-0.5 text-xs font-bold text-green-400">
                        Best Value
                      </span>
                    ) : null}
                  </div>

                  <div className="mb-3 text-xs text-gray-500">
                    {product.flavour ?? "No flavour"} • {product.size} •{" "}
                    {product.servings ? `${product.servings} servings` : "No servings"} •{" "}
                    {product.inStock ? "In stock" : "Out of stock"}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <span className="text-lg font-bold text-white">
                    £{product.price.toFixed(2)}
                  </span>
                  <span className="ml-2 text-xs text-gray-500">
                    £{product.pricePer100g.toFixed(2)}/100g
                  </span>
                </div>
              </div>

              {isExpanded ? (
                <div className="mt-4 rounded-xl border border-gray-800 bg-gray-950/70 p-3">
                  <div className="text-xs text-gray-500">
                    {product.brand} • {product.retailer} • {product.type}
                  </div>
                  <div className="mt-2">
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
                  <p className="mt-2 whitespace-pre-line text-sm leading-6 text-gray-300">
                    {product.description ?? "No extra scraped description yet."}
                  </p>
                  <Link
                    href={`/product/${product.slug}`}
                    className="mt-3 inline-block text-sm font-medium text-green-300 hover:text-green-200"
                  >
                    Open product page
                  </Link>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
