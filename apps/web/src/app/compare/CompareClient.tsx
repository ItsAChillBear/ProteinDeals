"use client";

import PriceComparisonTable, { type Product } from "@/components/PriceComparisonTable";

export default function CompareClient({ products }: { products: Product[] }) {
  return <PriceComparisonTable products={products} />;
}
