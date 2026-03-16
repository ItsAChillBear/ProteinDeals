"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpDown, ArrowUp, ArrowDown, CheckCircle, XCircle, ExternalLink } from "lucide-react";
import { clsx } from "clsx";

export interface Product {
  id: string;
  slug: string;
  name: string;
  brand: string;
  retailer: string;
  size: string;
  sizeG: number;
  price: number;
  pricePer100g: number;
  inStock: boolean;
  url: string;
  type: string;
}

type SortKey = "price" | "pricePer100g" | "brand" | "size";
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
  if (sortKey !== col)
    return <ArrowUpDown className="h-3.5 w-3.5 text-gray-600" />;
  return sortDir === "asc" ? (
    <ArrowUp className="h-3.5 w-3.5 text-green-400" />
  ) : (
    <ArrowDown className="h-3.5 w-3.5 text-green-400" />
  );
}

export default function PriceComparisonTable({ products }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("pricePer100g");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
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
      ? (aVal as number) - (bVal as number)
      : (bVal as number) - (aVal as number);
  });

  // Find the minimum pricePer100g among in-stock items
  const minPricePer100g = Math.min(
    ...sorted.filter((p) => p.inStock).map((p) => p.pricePer100g)
  );

  const headerClass =
    "px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap";

  const sortableHeader = (label: string, key: SortKey) => (
    <th className={headerClass}>
      <button
        onClick={() => handleSort(key)}
        className="flex items-center gap-1.5 hover:text-gray-300 transition-colors group"
      >
        {label}
        <SortIcon col={key} sortKey={sortKey} sortDir={sortDir} />
      </button>
    </th>
  );

  if (products.length === 0) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center">
        <p className="text-gray-400">No products match the current filters.</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
        <p className="text-sm text-gray-400">
          <span className="text-white font-semibold">{products.length}</span>{" "}
          products found
        </p>
        <p className="text-xs text-gray-600">
          Sorted by: {sortKey === "pricePer100g" ? "Price / 100g" : sortKey}
        </p>
      </div>

      {/* Desktop Table */}
      <div className="overflow-x-auto hidden sm:block">
        <table className="w-full text-sm">
          <thead className="bg-gray-800/50 border-b border-gray-800">
            <tr>
              <th className={headerClass}>Product</th>
              {sortableHeader("Brand", "brand")}
              <th className={headerClass}>Retailer</th>
              {sortableHeader("Size", "size")}
              {sortableHeader("Price", "price")}
              {sortableHeader("Per 100g", "pricePer100g")}
              <th className={headerClass}>Stock</th>
              <th className={headerClass}>Buy</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {sorted.map((product) => {
              const isBestValue =
                product.inStock &&
                product.pricePer100g === minPricePer100g;

              return (
                <tr
                  key={product.id}
                  className={clsx(
                    "transition-colors",
                    isBestValue
                      ? "bg-green-950/20 hover:bg-green-950/30"
                      : "hover:bg-gray-800/60"
                  )}
                >
                  <td className="px-4 py-4 max-w-xs">
                    <Link
                      href={`/product/${product.slug}`}
                      className="text-white font-medium hover:text-green-300 transition-colors line-clamp-2 leading-snug"
                    >
                      {product.name}
                    </Link>
                    <span className="text-xs text-gray-500 block mt-0.5">
                      {product.type}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-gray-300 font-medium whitespace-nowrap">
                    {product.brand}
                  </td>
                  <td className="px-4 py-4 text-gray-400 whitespace-nowrap">
                    {product.retailer}
                  </td>
                  <td className="px-4 py-4 text-gray-400 whitespace-nowrap">
                    {product.size}
                  </td>
                  <td className="px-4 py-4 text-white font-semibold whitespace-nowrap">
                    £{product.price.toFixed(2)}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span
                        className={clsx(
                          "font-semibold",
                          isBestValue ? "text-green-400" : "text-gray-300"
                        )}
                      >
                        £{product.pricePer100g.toFixed(2)}
                      </span>
                      {isBestValue && (
                        <span className="bg-green-950/70 text-green-400 text-xs font-bold px-2 py-0.5 rounded border border-green-800/50 whitespace-nowrap">
                          Best Value
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    {product.inStock ? (
                      <span className="flex items-center gap-1 text-green-400 whitespace-nowrap">
                        <CheckCircle className="h-4 w-4 flex-shrink-0" />
                        <span className="text-xs">In Stock</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-red-400 whitespace-nowrap">
                        <XCircle className="h-4 w-4 flex-shrink-0" />
                        <span className="text-xs">Out of Stock</span>
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <a
                      href={product.url}
                      target="_blank"
                      rel="noopener noreferrer sponsored"
                      className={clsx(
                        "inline-flex items-center gap-1 font-bold px-3 py-2 rounded-lg text-xs transition-all duration-150 whitespace-nowrap",
                        product.inStock
                          ? "bg-green-500 hover:bg-green-400 text-gray-950"
                          : "bg-gray-700 text-gray-500 cursor-not-allowed"
                      )}
                    >
                      Buy <ExternalLink className="h-3 w-3" />
                    </a>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Card List */}
      <div className="sm:hidden divide-y divide-gray-800">
        {sorted.map((product) => {
          const isBestValue =
            product.inStock && product.pricePer100g === minPricePer100g;
          return (
            <div
              key={product.id}
              className={clsx(
                "p-4",
                isBestValue ? "bg-green-950/20" : "hover:bg-gray-800/40"
              )}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <Link
                  href={`/product/${product.slug}`}
                  className="text-white font-semibold text-sm leading-snug hover:text-green-300 transition-colors"
                >
                  {product.name}
                </Link>
                {isBestValue && (
                  <span className="flex-shrink-0 bg-green-950/70 text-green-400 text-xs font-bold px-2 py-0.5 rounded border border-green-800/50">
                    Best Value
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-500 mb-3">
                {product.brand} &bull; {product.size} &bull; {product.retailer}
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-white font-bold text-lg">
                    £{product.price.toFixed(2)}
                  </span>
                  <span className="text-gray-500 text-xs ml-2">
                    £{product.pricePer100g.toFixed(2)}/100g
                  </span>
                </div>
                <a
                  href={product.url}
                  target="_blank"
                  rel="noopener noreferrer sponsored"
                  className="bg-green-500 hover:bg-green-400 text-gray-950 font-bold px-4 py-2 rounded-lg text-xs transition-colors"
                >
                  Buy
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
