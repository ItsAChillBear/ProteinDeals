import FilterSidebar from "@/components/FilterSidebar";
import PriceComparisonTable from "@/components/PriceComparisonTable";
import type { Product } from "@/components/PriceComparisonTable";

const mockProducts: Product[] = [
  {
    id: "1",
    slug: "myprotein-impact-whey-chocolate-brownie-2500g",
    name: "Impact Whey Protein - Chocolate Brownie",
    brand: "MyProtein",
    retailer: "MyProtein",
    size: "2.5kg",
    sizeG: 2500,
    price: 37.99,
    pricePer100g: 1.52,
    inStock: true,
    url: "https://www.myprotein.com",
    type: "Whey Concentrate",
  },
  {
    id: "2",
    slug: "bulk-pure-whey-vanilla-2000g",
    name: "Pure Whey Protein - Vanilla",
    brand: "Bulk",
    retailer: "Bulk",
    size: "2kg",
    sizeG: 2000,
    price: 29.99,
    pricePer100g: 1.50,
    inStock: true,
    url: "https://www.bulk.com",
    type: "Whey Concentrate",
  },
  {
    id: "3",
    slug: "on-gold-standard-whey-double-chocolate-2270g",
    name: "Gold Standard 100% Whey - Double Rich Chocolate",
    brand: "Optimum Nutrition",
    retailer: "Holland & Barrett",
    size: "2.27kg",
    sizeG: 2270,
    price: 54.99,
    pricePer100g: 2.42,
    inStock: true,
    url: "https://www.hollandandbarrett.com",
    type: "Whey Concentrate",
  },
  {
    id: "4",
    slug: "myprotein-clear-whey-isolate-lemon-tea-500g",
    name: "Clear Whey Isolate - Lemon Tea",
    brand: "MyProtein",
    retailer: "MyProtein",
    size: "500g",
    sizeG: 500,
    price: 29.99,
    pricePer100g: 6.00,
    inStock: true,
    url: "https://www.myprotein.com",
    type: "Whey Isolate",
  },
  {
    id: "5",
    slug: "bulk-vegan-protein-powder-chocolate-1000g",
    name: "Vegan Protein Powder - Chocolate",
    brand: "Bulk",
    retailer: "Bulk",
    size: "1kg",
    sizeG: 1000,
    price: 24.99,
    pricePer100g: 2.50,
    inStock: false,
    url: "https://www.bulk.com",
    type: "Vegan",
  },
  {
    id: "6",
    slug: "protein-works-whey-concentrate-strawberry-2000g",
    name: "Whey Concentrate 80 - Strawberry Cream",
    brand: "Protein Works",
    retailer: "Protein Works",
    size: "2kg",
    sizeG: 2000,
    price: 34.99,
    pricePer100g: 1.75,
    inStock: true,
    url: "https://www.theproteinworks.com",
    type: "Whey Concentrate",
  },
  {
    id: "7",
    slug: "on-gold-standard-casein-chocolate-supreme-1800g",
    name: "Gold Standard 100% Casein - Chocolate Supreme",
    brand: "Optimum Nutrition",
    retailer: "Amazon UK",
    size: "1.8kg",
    sizeG: 1800,
    price: 44.99,
    pricePer100g: 2.50,
    inStock: true,
    url: "https://www.amazon.co.uk",
    type: "Casein",
  },
  {
    id: "8",
    slug: "myprotein-impact-whey-isolate-unflavoured-1000g",
    name: "Impact Whey Isolate - Unflavoured",
    brand: "MyProtein",
    retailer: "MyProtein",
    size: "1kg",
    sizeG: 1000,
    price: 32.99,
    pricePer100g: 3.30,
    inStock: true,
    url: "https://www.myprotein.com",
    type: "Whey Isolate",
  },
];

export const metadata = {
  title: "Compare Protein Powder Prices UK | WheyWise",
  description:
    "Compare all protein powder prices across UK retailers. Filter by brand, type, and size to find the best value.",
};

export default function ComparePage() {
  return (
    <div className="min-h-screen bg-gray-950 py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Compare Protein Powder Prices
          </h1>
          <p className="text-gray-400">
            {mockProducts.length} products from top UK retailers &bull; Sorted
            by best value per 100g
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          <aside className="lg:w-64 flex-shrink-0">
            <FilterSidebar />
          </aside>
          <div className="flex-1 min-w-0">
            <PriceComparisonTable products={mockProducts} />
          </div>
        </div>
      </div>
    </div>
  );
}
