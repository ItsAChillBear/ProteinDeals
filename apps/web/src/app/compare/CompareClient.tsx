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

      return true;
    });
  }, [filters, products]);

  return (
    <div className="space-y-6">
      <FilterSidebar filters={filters} onChange={setFilters} />
      <div className="min-w-0">
        <PriceComparisonTable products={filteredProducts} />
      </div>
    </div>
  );
}
