import Link from "next/link";
import { ArrowRight, Flame, Clock, Tag } from "lucide-react";

interface Deal {
  id: string;
  slug: string;
  brand: string;
  name: string;
  size: string;
  type: string;
  retailer: string;
  originalPrice: number;
  currentPrice: number;
  pricePer100g: number;
  savingPercent: number;
  savingAmount: number;
  inStock: boolean;
  expiresAt: string | null;
  url: string;
  isHot: boolean;
}

const deals: Deal[] = [
  {
    id: "1",
    slug: "myprotein-impact-whey-chocolate-brownie-2500g",
    brand: "MyProtein",
    name: "Impact Whey Protein - Chocolate Brownie",
    size: "2.5kg",
    type: "Whey Concentrate",
    retailer: "MyProtein",
    originalPrice: 54.99,
    currentPrice: 37.99,
    pricePer100g: 1.52,
    savingPercent: 31,
    savingAmount: 17.0,
    inStock: true,
    expiresAt: "2025-01-20",
    url: "https://www.myprotein.com",
    isHot: true,
  },
  {
    id: "2",
    slug: "bulk-pure-whey-vanilla-2000g",
    brand: "Bulk",
    name: "Pure Whey Protein - Vanilla",
    size: "2kg",
    type: "Whey Concentrate",
    retailer: "Bulk",
    originalPrice: 39.99,
    currentPrice: 29.99,
    pricePer100g: 1.5,
    savingPercent: 25,
    savingAmount: 10.0,
    inStock: true,
    expiresAt: null,
    url: "https://www.bulk.com",
    isHot: true,
  },
  {
    id: "3",
    slug: "on-gold-standard-whey-double-chocolate-2270g",
    brand: "Optimum Nutrition",
    name: "Gold Standard 100% Whey - Double Rich Chocolate",
    size: "2.27kg",
    type: "Whey Concentrate",
    retailer: "Holland & Barrett",
    originalPrice: 74.99,
    currentPrice: 54.99,
    pricePer100g: 2.42,
    savingPercent: 27,
    savingAmount: 20.0,
    inStock: true,
    expiresAt: "2025-01-22",
    url: "https://www.hollandandbarrett.com",
    isHot: false,
  },
  {
    id: "4",
    slug: "protein-works-whey-concentrate-strawberry-2000g",
    brand: "Protein Works",
    name: "Whey Concentrate 80 - Strawberry Cream",
    size: "2kg",
    type: "Whey Concentrate",
    retailer: "Protein Works",
    originalPrice: 49.99,
    currentPrice: 34.99,
    pricePer100g: 1.75,
    savingPercent: 30,
    savingAmount: 15.0,
    inStock: true,
    expiresAt: null,
    url: "https://www.theproteinworks.com",
    isHot: false,
  },
  {
    id: "5",
    slug: "myprotein-impact-whey-isolate-unflavoured-1000g",
    brand: "MyProtein",
    name: "Impact Whey Isolate - Unflavoured",
    size: "1kg",
    type: "Whey Isolate",
    retailer: "MyProtein",
    originalPrice: 44.99,
    currentPrice: 32.99,
    pricePer100g: 3.3,
    savingPercent: 27,
    savingAmount: 12.0,
    inStock: true,
    expiresAt: "2025-01-18",
    url: "https://www.myprotein.com",
    isHot: false,
  },
  {
    id: "6",
    slug: "on-gold-standard-casein-chocolate-supreme-1800g",
    brand: "Optimum Nutrition",
    name: "Gold Standard Casein - Chocolate Supreme",
    size: "1.8kg",
    type: "Casein",
    retailer: "Amazon UK",
    originalPrice: 64.99,
    currentPrice: 44.99,
    pricePer100g: 2.5,
    savingPercent: 31,
    savingAmount: 20.0,
    inStock: true,
    expiresAt: null,
    url: "https://www.amazon.co.uk",
    isHot: true,
  },
];

function savingBadgeColor(percent: number): string {
  if (percent >= 30) return "bg-red-950/70 text-red-400 border-red-800/50";
  if (percent >= 20) return "bg-orange-950/70 text-orange-400 border-orange-800/50";
  return "bg-amber-950/70 text-amber-400 border-amber-800/50";
}

export const metadata = {
  title: "Best Protein Powder Deals UK Today | ProteinDeals",
  description:
    "Today's best protein powder deals and discounts across UK retailers. Updated daily.",
};

export default function DealsPage() {
  return (
    <div className="min-h-screen bg-gray-950 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 bg-red-950/40 border border-red-800/40 text-red-400 text-xs font-bold px-3 py-1.5 rounded-full mb-4">
            <Flame className="h-3.5 w-3.5" />
            Updated Today
          </div>
          <h1 className="text-4xl font-bold text-white mb-3">
            Best Protein Deals Right Now
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl">
            {deals.length} active deals across UK retailers. Prices verified
            today — grab them before they expire.
          </p>
        </div>

        {/* Deals Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {deals.map((deal) => (
            <div
              key={deal.id}
              className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex flex-col hover:border-green-800/40 transition-all duration-300 hover:shadow-lg hover:shadow-green-950/30 group"
            >
              {/* Badges Row */}
              <div className="flex items-center justify-between mb-4">
                <span
                  className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${savingBadgeColor(
                    deal.savingPercent
                  )}`}
                >
                  <Tag className="h-3 w-3 inline mr-1" />
                  {deal.savingPercent}% OFF
                </span>
                {deal.isHot && (
                  <span className="flex items-center gap-1 bg-red-950/60 text-red-400 text-xs font-bold px-2 py-1 rounded-lg border border-red-800/50">
                    <Flame className="h-3 w-3" /> Hot
                  </span>
                )}
              </div>

              {/* Brand Icon */}
              <div className="h-10 w-10 rounded-xl bg-gray-800 flex items-center justify-center mb-4">
                <span className="text-xs font-black text-green-400">
                  {deal.brand.slice(0, 2).toUpperCase()}
                </span>
              </div>

              {/* Product Info */}
              <p className="text-xs text-gray-500 font-medium mb-1">
                {deal.brand} &bull; {deal.size} &bull; {deal.type}
              </p>
              <h3 className="text-white font-semibold text-sm leading-snug mb-4 flex-1 group-hover:text-green-100 transition-colors">
                {deal.name}
              </h3>

              {/* Pricing */}
              <div className="flex items-end gap-2 mb-1">
                <span className="text-2xl font-extrabold text-white">
                  £{deal.currentPrice.toFixed(2)}
                </span>
                <span className="text-gray-500 text-sm line-through mb-0.5">
                  £{deal.originalPrice.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-gray-500 text-xs">
                  £{deal.pricePer100g.toFixed(2)}/100g &bull; {deal.retailer}
                </p>
                <p className="text-green-400 text-xs font-bold">
                  Save £{deal.savingAmount.toFixed(2)}
                </p>
              </div>

              {/* Expiry */}
              {deal.expiresAt && (
                <div className="flex items-center gap-1.5 text-amber-500 text-xs mb-4 bg-amber-950/20 border border-amber-900/30 rounded-lg px-3 py-2">
                  <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                  Expires {deal.expiresAt}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 mt-auto">
                <a
                  href={deal.url}
                  target="_blank"
                  rel="noopener noreferrer sponsored"
                  className="flex-1 inline-flex items-center justify-center gap-1.5 bg-green-500 hover:bg-green-400 text-gray-950 font-bold py-3 rounded-xl text-sm transition-all duration-200 hover:shadow-md hover:shadow-green-500/20"
                >
                  Get Deal <ArrowRight className="h-4 w-4" />
                </a>
                <Link
                  href={`/product/${deal.slug}`}
                  className="px-4 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm font-medium transition-colors"
                >
                  Details
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-14">
          <p className="text-gray-500 mb-4 text-sm">
            Want to compare all products, not just deals?
          </p>
          <Link
            href="/compare"
            className="inline-flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white font-semibold px-8 py-4 rounded-xl transition-colors"
          >
            View Full Price Comparison <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
