"use client";

import { useMemo, useState } from "react";
import FilterSidebar, { type CompareFilters } from "@/components/FilterSidebar";
import PriceComparisonTable, { type Product } from "@/components/PriceComparisonTable";

const defaultFilters: CompareFilters = {
  brand: "",
  type: "",
  retailer: "",
  size: "all",
  stock: "in-stock",
};

export default function CompareClient({ products }: { products: Product[] }) {
  const [filters, setFilters] = useState<CompareFilters>(defaultFilters);

  const sizeOptions = useMemo(() => {
    const uniqueSizes = [...new Set(products.map((product) => product.size))]
      .sort((a, b) => {
        const aSize = products.find((product) => product.size === a)?.sizeG ?? 0;
        const bSize = products.find((product) => product.size === b)?.sizeG ?? 0;
        return aSize - bSize;
      })
      .map((size) => ({
        value: `exact:${size}`,
        label: size,
      }));

    return [
      { value: "all", label: "All Sizes" },
      { value: "500g-1kg", label: "500g - 1kg" },
      { value: "1kg-2kg", label: "1kg - 2kg" },
      { value: "2kg+", label: "2kg+" },
      { group: " ", options: uniqueSizes },
    ];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      if (filters.stock === "in-stock" && !product.inStock) return false;
      if (filters.stock === "out-of-stock" && product.inStock) return false;

      if (filters.brand) {
        const normalizedBrand = product.brand.toLowerCase().replace(/\s+/g, "-");
        if (normalizedBrand !== filters.brand) return false;
      }

      if (filters.retailer) {
        const normalizedRetailer = product.retailer.toLowerCase().replace(/\s+/g, "-");
        if (normalizedRetailer !== filters.retailer) return false;
      }

      if (filters.type) {
        const normalizedType = product.type.toLowerCase().replace(/\s+/g, "-");
        if (normalizedType !== filters.type) return false;
      }

      if (filters.size === "500g-1kg" && !(product.sizeG >= 500 && product.sizeG <= 1000)) {
        return false;
      }
      if (filters.size === "1kg-2kg" && !(product.sizeG > 1000 && product.sizeG <= 2000)) {
        return false;
      }
      if (filters.size === "2kg+" && product.sizeG <= 2000) {
        return false;
      }
      if (filters.size.startsWith("exact:")) {
        const exactSize = filters.size.slice("exact:".length);
        if (product.size !== exactSize) return false;
      }

      return true;
    });
  }, [filters, products]);

  return (
    <div className="space-y-6">
      <FilterSidebar
        filters={filters}
        onChange={setFilters}
        sizeOptions={sizeOptions}
      />
      <div className="min-w-0">
        <PriceComparisonTable products={filteredProducts} />
      </div>
    </div>
  );
}
