import Link from "next/link";
import { ArrowRight, Calendar, Clock } from "lucide-react";

interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  readTime: string;
  category: string;
}

const blogPosts: BlogPost[] = [
  {
    slug: "best-protein-powder-uk-2025",
    title: "Best Protein Powder UK 2025",
    excerpt:
      "We've tested and compared the most popular protein powders available in the UK to bring you our definitive ranking for 2025. From budget whey concentrate to premium isolates — here's exactly what you should be buying.",
    date: "15 January 2025",
    readTime: "8 min read",
    category: "Buying Guide",
  },
  {
    slug: "cheapest-protein-per-gram-uk",
    title: "Cheapest Protein Per Gram UK",
    excerpt:
      "Price per serving is misleading. We break down the actual cost of protein per gram across every major UK brand, normalise for serving size, and reveal which tubs offer genuinely outstanding value.",
    date: "10 January 2025",
    readTime: "6 min read",
    category: "Price Analysis",
  },
  {
    slug: "myprotein-vs-bulk-which-is-cheaper",
    title: "MyProtein vs Bulk: Which is Cheaper?",
    excerpt:
      "MyProtein and Bulk are the two dominant budget-friendly protein brands in the UK. But which one actually saves you more money? We compared their flagship products head-to-head on price, taste, and macros.",
    date: "5 January 2025",
    readTime: "5 min read",
    category: "Brand Comparison",
  },
];

const categoryColors: Record<string, string> = {
  "Buying Guide": "bg-blue-950/60 text-blue-400 border-blue-800/50",
  "Price Analysis": "bg-amber-950/60 text-amber-400 border-amber-800/50",
  "Brand Comparison": "bg-purple-950/60 text-purple-400 border-purple-800/50",
};

export const metadata = {
  title: "Protein Powder Blog | WheyWise",
  description:
    "Expert guides, price analyses, and brand comparisons to help you make smarter protein powder purchases.",
};

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-gray-950 py-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-white mb-3">
            WheyWise Blog
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl">
            Expert buying guides, price analyses, and honest brand comparisons.
            No ads, no sponsorships — just useful information.
          </p>
        </div>

        {/* Featured Post */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 mb-8 hover:border-green-800/40 transition-all duration-300 group">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <span
              className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${
                categoryColors[blogPosts[0].category]
              }`}
            >
              {blogPosts[0].category}
            </span>
            <span className="text-gray-600 text-xs font-medium bg-green-950/40 text-green-500 px-2.5 py-1 rounded-lg border border-green-900/50">
              Featured
            </span>
          </div>
          <h2 className="text-2xl font-bold text-white mb-3 group-hover:text-green-100 transition-colors">
            {blogPosts[0].title}
          </h2>
          <p className="text-gray-400 leading-relaxed mb-6">
            {blogPosts[0].excerpt}
          </p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-gray-500 text-xs">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                {blogPosts[0].date}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                {blogPosts[0].readTime}
              </span>
            </div>
            <Link
              href={`/blog/${blogPosts[0].slug}`}
              className="inline-flex items-center gap-1.5 text-green-400 hover:text-green-300 text-sm font-medium transition-colors"
            >
              Read More <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* Post Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {blogPosts.slice(1).map((post) => (
            <div
              key={post.slug}
              className="bg-gray-900 border border-gray-800 rounded-2xl p-6 hover:border-green-800/40 transition-all duration-300 group flex flex-col"
            >
              <div className="mb-3">
                <span
                  className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${
                    categoryColors[post.category]
                  }`}
                >
                  {post.category}
                </span>
              </div>
              <h2 className="text-lg font-bold text-white mb-3 group-hover:text-green-100 transition-colors leading-snug">
                {post.title}
              </h2>
              <p className="text-gray-400 text-sm leading-relaxed mb-6 flex-1 line-clamp-3">
                {post.excerpt}
              </p>
              <div className="flex items-center justify-between mt-auto">
                <div className="flex items-center gap-3 text-gray-500 text-xs">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {post.date}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {post.readTime}
                  </span>
                </div>
                <Link
                  href={`/blog/${post.slug}`}
                  className="text-green-400 hover:text-green-300 text-sm font-medium flex items-center gap-1 transition-colors"
                >
                  Read More <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
