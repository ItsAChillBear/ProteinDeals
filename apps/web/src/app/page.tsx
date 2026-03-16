import Link from "next/link";
import { ArrowRight, Search, BarChart2, PiggyBank, Star } from "lucide-react";

const topDeals = [
  {
    id: 1,
    brand: "MyProtein",
    name: "Impact Whey Protein - Chocolate Brownie",
    size: "2.5kg",
    price: 37.99,
    originalPrice: 54.99,
    pricePerKg: 15.2,
    retailer: "MyProtein",
    retailerUrl: "https://www.myprotein.com",
    saving: 31,
    inStock: true,
  },
  {
    id: 2,
    brand: "Bulk",
    name: "Pure Whey Protein - Vanilla",
    size: "2kg",
    price: 29.99,
    originalPrice: 39.99,
    pricePerKg: 15.0,
    retailer: "Bulk",
    retailerUrl: "https://www.bulk.com",
    saving: 25,
    inStock: true,
  },
  {
    id: 3,
    brand: "Optimum Nutrition",
    name: "Gold Standard Whey - Double Rich Chocolate",
    size: "2.27kg",
    price: 54.99,
    originalPrice: 74.99,
    pricePerKg: 24.22,
    retailer: "Holland & Barrett",
    retailerUrl: "https://www.hollandandbarrett.com",
    saving: 27,
    inStock: true,
  },
];

const howItWorksSteps = [
  {
    step: "01",
    icon: Search,
    title: "We Scrape",
    description:
      "Our bots automatically scrape prices from all major UK supplement retailers every single day, keeping our data fresh and accurate.",
  },
  {
    step: "02",
    icon: BarChart2,
    title: "We Compare",
    description:
      "We normalise prices per 100g so you can compare like-for-like across different pack sizes and brands instantly.",
  },
  {
    step: "03",
    icon: PiggyBank,
    title: "You Save",
    description:
      "Find the cheapest price in seconds and never overpay for your protein again. Set alerts for when prices drop.",
  },
];

export default function HomePage() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gray-950 py-24 sm:py-32">
        <div className="absolute inset-0 bg-gradient-radial from-green-950/30 via-transparent to-transparent" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 bg-green-950/50 border border-green-800/50 text-green-400 text-sm font-medium px-4 py-2 rounded-full mb-8">
            <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
            Prices updated daily across 10+ UK retailers
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white text-balance mb-6">
            Find the{" "}
            <span className="gradient-text">Best Protein Powder Prices</span>{" "}
            in the UK
          </h1>
          <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto mb-10 text-balance">
            We compare prices across the UK&apos;s top supplement retailers so
            you don&apos;t have to. Save money on every tub, every time.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/compare"
              className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-400 text-gray-950 font-bold px-8 py-4 rounded-xl text-lg transition-all duration-200 hover:scale-105 hover:shadow-lg hover:shadow-green-500/25"
            >
              Compare Prices Now
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              href="/deals"
              className="inline-flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white font-semibold px-8 py-4 rounded-xl text-lg transition-colors duration-200"
            >
              View Today&apos;s Deals
            </Link>
          </div>
          <p className="text-gray-600 text-sm mt-6">
            No account required &bull; Free to use &bull; Affiliate links fund this site
          </p>
        </div>
      </section>

      {/* Top Deals Section */}
      <section className="py-20 bg-gray-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-10">
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">
                Today&apos;s Top Deals
              </h2>
              <p className="text-gray-400">
                Hand-picked best value protein buys right now
              </p>
            </div>
            <Link
              href="/deals"
              className="text-green-400 hover:text-green-300 text-sm font-medium flex items-center gap-1 transition-colors"
            >
              View all deals <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {topDeals.map((deal) => (
              <div
                key={deal.id}
                className="bg-gray-900 border border-gray-800 rounded-2xl p-6 hover:border-green-800/50 transition-all duration-300 hover:shadow-lg hover:shadow-green-950/50 group"
              >
                <div className="flex items-start justify-between mb-4">
                  <span className="bg-green-950/70 text-green-400 text-xs font-bold px-2.5 py-1 rounded-lg border border-green-800/50">
                    {deal.saving}% OFF
                  </span>
                  <div className="flex items-center gap-1 text-amber-400">
                    <Star className="h-3.5 w-3.5 fill-current" />
                    <Star className="h-3.5 w-3.5 fill-current" />
                    <Star className="h-3.5 w-3.5 fill-current" />
                    <Star className="h-3.5 w-3.5 fill-current" />
                    <Star className="h-3.5 w-3.5 fill-current" />
                  </div>
                </div>

                <div className="h-10 w-10 rounded-xl bg-gray-800 flex items-center justify-center mb-4">
                  <span className="text-xs font-bold text-green-400">
                    {deal.brand.slice(0, 2).toUpperCase()}
                  </span>
                </div>

                <p className="text-xs text-gray-500 font-medium mb-1">
                  {deal.brand} &bull; {deal.size}
                </p>
                <h3 className="text-white font-semibold text-sm leading-snug mb-4 group-hover:text-green-100 transition-colors">
                  {deal.name}
                </h3>

                <div className="flex items-end gap-2 mb-1">
                  <span className="text-2xl font-extrabold text-white">
                    £{deal.price.toFixed(2)}
                  </span>
                  <span className="text-gray-500 text-sm line-through mb-0.5">
                    £{deal.originalPrice.toFixed(2)}
                  </span>
                </div>
                <p className="text-gray-500 text-xs mb-5">
                  £{deal.pricePerKg.toFixed(2)}/kg &bull; at {deal.retailer}
                </p>

                <a
                  href={deal.retailerUrl}
                  target="_blank"
                  rel="noopener noreferrer sponsored"
                  className="w-full inline-flex items-center justify-center gap-2 bg-green-500 hover:bg-green-400 text-gray-950 font-bold py-3 rounded-xl text-sm transition-all duration-200 hover:shadow-md hover:shadow-green-500/20"
                >
                  View Deal <ArrowRight className="h-4 w-4" />
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-gray-900/50 border-y border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-white mb-3">
              How WheyWise Works
            </h2>
            <p className="text-gray-400 max-w-xl mx-auto">
              Simple, transparent, and always working in your favour
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {howItWorksSteps.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.step} className="text-center">
                  <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-green-950/50 border border-green-800/40 mb-6">
                    <Icon className="h-7 w-7 text-green-400" />
                  </div>
                  <div className="text-green-600 text-xs font-bold tracking-widest mb-2">
                    STEP {item.step}
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">
                    {item.title}
                  </h3>
                  <p className="text-gray-400 leading-relaxed text-sm">
                    {item.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-20 bg-gray-950">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Ready to stop overpaying?
          </h2>
          <p className="text-gray-400 mb-8">
            Join thousands of UK gym-goers saving money on their protein every
            month.
          </p>
          <Link
            href="/compare"
            className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-400 text-gray-950 font-bold px-10 py-4 rounded-xl text-lg transition-all duration-200 hover:scale-105"
          >
            Compare All Prices <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>
    </div>
  );
}
