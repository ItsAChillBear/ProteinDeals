import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle, XCircle, TrendingDown } from "lucide-react";

interface RetailerPrice {
  retailer: string;
  price: number;
  pricePer100g: number;
  inStock: boolean;
  url: string;
  lastUpdated: string;
}

interface ProductDetail {
  slug: string;
  name: string;
  brand: string;
  type: string;
  size: string;
  flavour: string;
  proteinPer100g: number;
  description: string;
  prices: RetailerPrice[];
}

const mockProducts: Record<string, ProductDetail> = {
  "myprotein-impact-whey-chocolate-brownie-2500g": {
    slug: "myprotein-impact-whey-chocolate-brownie-2500g",
    name: "Impact Whey Protein - Chocolate Brownie",
    brand: "MyProtein",
    type: "Whey Concentrate",
    size: "2.5kg",
    flavour: "Chocolate Brownie",
    proteinPer100g: 82,
    description:
      "MyProtein Impact Whey is one of the UK's best-selling protein powders. With 21g of protein per serving and an excellent amino acid profile, it's a reliable choice for post-workout recovery.",
    prices: [
      {
        retailer: "MyProtein",
        price: 37.99,
        pricePer100g: 1.52,
        inStock: true,
        url: "https://www.myprotein.com",
        lastUpdated: "2025-01-15",
      },
      {
        retailer: "Amazon UK",
        price: 41.99,
        pricePer100g: 1.68,
        inStock: true,
        url: "https://www.amazon.co.uk",
        lastUpdated: "2025-01-15",
      },
      {
        retailer: "Holland & Barrett",
        price: 44.99,
        pricePer100g: 1.80,
        inStock: false,
        url: "https://www.hollandandbarrett.com",
        lastUpdated: "2025-01-14",
      },
    ],
  },
  "bulk-pure-whey-vanilla-2000g": {
    slug: "bulk-pure-whey-vanilla-2000g",
    name: "Pure Whey Protein - Vanilla",
    brand: "Bulk",
    type: "Whey Concentrate",
    size: "2kg",
    flavour: "Vanilla",
    proteinPer100g: 80,
    description:
      "Bulk Pure Whey Protein is a no-nonsense whey concentrate delivering 22g of protein per serving. Excellent value for money and widely regarded as one of the best tasting budget proteins in the UK.",
    prices: [
      {
        retailer: "Bulk",
        price: 29.99,
        pricePer100g: 1.50,
        inStock: true,
        url: "https://www.bulk.com",
        lastUpdated: "2025-01-15",
      },
      {
        retailer: "Amazon UK",
        price: 33.49,
        pricePer100g: 1.67,
        inStock: true,
        url: "https://www.amazon.co.uk",
        lastUpdated: "2025-01-15",
      },
    ],
  },
};

function getFallbackProduct(slug: string): ProductDetail {
  return {
    slug,
    name: slug
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" "),
    brand: "Unknown Brand",
    type: "Whey Concentrate",
    size: "1kg",
    flavour: "Unflavoured",
    proteinPer100g: 80,
    description: "Product details coming soon.",
    prices: [],
  };
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}) {
  const product = mockProducts[params.slug] ?? getFallbackProduct(params.slug);
  return {
    title: `${product.name} - Price Comparison UK | WheyWise`,
    description: `Compare prices for ${product.name} across UK retailers. Find the cheapest deal updated daily.`,
  };
}

export default function ProductPage({
  params,
}: {
  params: { slug: string };
}) {
  const product = mockProducts[params.slug] ?? getFallbackProduct(params.slug);

  if (!product) notFound();

  const sortedPrices = [...product.prices].sort(
    (a, b) => a.pricePer100g - b.pricePer100g
  );
  const lowestPrice = sortedPrices[0];

  return (
    <div className="min-h-screen bg-gray-950 py-10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <Link
          href="/compare"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white text-sm mb-8 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Compare
        </Link>

        {/* Product Header */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 mb-6">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="h-32 w-32 flex-shrink-0 rounded-xl bg-gray-800 flex items-center justify-center">
              <span className="text-3xl font-black text-green-400">
                {product.brand.slice(0, 2).toUpperCase()}
              </span>
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="bg-gray-800 text-gray-400 text-xs font-medium px-2.5 py-1 rounded-lg">
                  {product.type}
                </span>
                <span className="bg-gray-800 text-gray-400 text-xs font-medium px-2.5 py-1 rounded-lg">
                  {product.size}
                </span>
                <span className="bg-gray-800 text-gray-400 text-xs font-medium px-2.5 py-1 rounded-lg">
                  {product.flavour}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                {product.name}
              </h1>
              <p className="text-gray-400 text-sm mb-4">by {product.brand}</p>
              <p className="text-gray-300 leading-relaxed text-sm">
                {product.description}
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Protein / 100g", value: `${product.proteinPer100g}g` },
            {
              label: "Lowest Price",
              value: lowestPrice ? `£${lowestPrice.price.toFixed(2)}` : "N/A",
            },
            {
              label: "Best Per 100g",
              value: lowestPrice
                ? `£${lowestPrice.pricePer100g.toFixed(2)}`
                : "N/A",
            },
            {
              label: "Retailers",
              value: String(product.prices.length),
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center"
            >
              <div className="text-xl font-bold text-white mb-1">
                {stat.value}
              </div>
              <div className="text-xs text-gray-500">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Retailer Price Table */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-gray-800">
            <h2 className="text-lg font-bold text-white">
              Prices Across Retailers
            </h2>
          </div>
          {sortedPrices.length === 0 ? (
            <p className="text-gray-400 text-center py-10">
              No price data available yet.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 text-xs uppercase tracking-wider border-b border-gray-800">
                  <th className="px-6 py-3">Retailer</th>
                  <th className="px-6 py-3">Price</th>
                  <th className="px-6 py-3">Per 100g</th>
                  <th className="px-6 py-3">Stock</th>
                  <th className="px-6 py-3">Updated</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {sortedPrices.map((retailerPrice, index) => (
                  <tr
                    key={retailerPrice.retailer}
                    className={`transition-colors ${
                      index === 0 ? "bg-green-950/20" : "hover:bg-gray-800/50"
                    }`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white">
                          {retailerPrice.retailer}
                        </span>
                        {index === 0 && (
                          <span className="bg-green-950/70 text-green-400 text-xs font-bold px-2 py-0.5 rounded border border-green-800/50">
                            Best Value
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-white font-semibold">
                      £{retailerPrice.price.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-gray-300">
                      £{retailerPrice.pricePer100g.toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      {retailerPrice.inStock ? (
                        <span className="flex items-center gap-1 text-green-400">
                          <CheckCircle className="h-4 w-4" /> In Stock
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-red-400">
                          <XCircle className="h-4 w-4" /> Out of Stock
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-500 text-xs">
                      {retailerPrice.lastUpdated}
                    </td>
                    <td className="px-6 py-4">
                      <a
                        href={retailerPrice.url}
                        target="_blank"
                        rel="noopener noreferrer sponsored"
                        className="inline-flex items-center bg-green-500 hover:bg-green-400 text-gray-950 font-bold px-4 py-2 rounded-lg text-xs transition-colors"
                      >
                        Buy Now
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Price History Placeholder */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <TrendingDown className="h-5 w-5 text-green-400" />
            <h2 className="text-lg font-bold text-white">Price History</h2>
          </div>
          <div className="h-48 flex items-center justify-center bg-gray-800/50 rounded-xl border border-dashed border-gray-700">
            <div className="text-center">
              <TrendingDown className="h-10 w-10 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">
                Price history chart coming soon
              </p>
              <p className="text-gray-600 text-xs mt-1">
                We&apos;ll display 90-day price trends here
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
