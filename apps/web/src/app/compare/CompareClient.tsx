"use client";

import { useMemo, useState } from "react";
import PriceComparisonTable, { type Product } from "@/components/PriceComparisonTable";

type PricingMode = "single" | "subscription";

export default function CompareClient({ products }: { products: Product[] }) {
  const [pricingMode, setPricingMode] = useState<PricingMode>("single");

  const normalizedProducts = useMemo(
    () =>
      products
        .filter((product) =>
          pricingMode === "subscription" ? product.subscriptionPrice !== null : true
        )
        .map((product) => ({
          ...product,
          price:
            pricingMode === "subscription" && product.subscriptionPrice !== null
              ? product.subscriptionPrice
              : product.singlePrice,
          pricePer100g:
            pricingMode === "subscription" && product.subscriptionPricePer100g !== null
              ? product.subscriptionPricePer100g
              : product.singlePricePer100g,
        })),
    [pricingMode, products]
  );

  return (
    <div className="space-y-4">
      <PriceComparisonTable
        products={normalizedProducts}
        priceMode={pricingMode}
        onPriceModeChange={setPricingMode}
      />
    </div>
  );
}
