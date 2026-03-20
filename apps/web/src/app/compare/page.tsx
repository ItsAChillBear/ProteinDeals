import CompareClient from "./CompareClient";
import type { Product } from "@/components/PriceComparisonTable";

export const metadata = {
  title: "Compare Protein Powder Prices UK | WheyWise",
  description:
    "Compare all protein powder prices across UK retailers. Filter by brand, type, and size to find the best value.",
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";

async function getCompareProducts(): Promise<Product[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/compare/products`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return [];
    }

    const payload = (await response.json()) as {
      ok: boolean;
      items?: Product[];
    };

    return payload.ok ? (payload.items ?? []) : [];
  } catch {
    return [];
  }
}

export default async function ComparePage() {
  const products = await getCompareProducts();

  return (
    <div className="min-h-screen bg-gray-950 py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold text-white">
            Compare Protein Powder Prices
          </h1>
          <p className="text-gray-400">
            {products.length} products from imported retailer data and sorted by
            best value per 100g
          </p>
        </div>

        <CompareClient products={products} />
      </div>
    </div>
  );
}
