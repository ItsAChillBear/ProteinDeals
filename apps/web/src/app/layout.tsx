import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "WheyWise | Best Protein Powder Prices UK",
  description:
    "Compare protein powder prices across the UK's top supplement retailers. Find the cheapest whey protein, isolate, vegan protein and more.",
  keywords: [
    "protein powder UK",
    "cheapest whey protein UK",
    "protein powder price comparison",
    "MyProtein deals",
    "Bulk protein",
  ],
  openGraph: {
    title: "WheyWise | Best Protein Powder Prices UK",
    description:
      "Compare protein powder prices across the UK's top supplement retailers.",
    type: "website",
    locale: "en_GB",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-GB" className={inter.variable}>
      <body className="bg-gray-950 text-white antialiased min-h-screen">
        <Navbar />
        <main>{children}</main>
        <footer className="border-t border-gray-800 mt-20 py-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row justify-between items-start gap-8">
              <div>
                <span className="text-xl font-bold text-green-400">
                  WheyWise
                </span>
                <p className="text-gray-400 text-sm mt-2 max-w-xs">
                  The UK&apos;s most comprehensive protein powder price
                  comparison tool. Updated daily.
                </p>
              </div>
              <div className="flex gap-12 text-sm text-gray-400">
                <div className="flex flex-col gap-2">
                  <span className="text-white font-medium mb-1">Compare</span>
                  <a href="/compare" className="hover:text-green-400 transition-colors">
                    All Products
                  </a>
                  <a href="/deals" className="hover:text-green-400 transition-colors">
                    Best Deals
                  </a>
                </div>
                <div className="flex flex-col gap-2">
                  <span className="text-white font-medium mb-1">Company</span>
                  <a href="/blog" className="hover:text-green-400 transition-colors">
                    Blog
                  </a>
                  <a href="/contact" className="hover:text-green-400 transition-colors">
                    Contact
                  </a>
                </div>
              </div>
            </div>
            <div className="border-t border-gray-800 mt-8 pt-6 text-center text-xs text-gray-600">
              <p>
                &copy; {new Date().getFullYear()} WheyWise. Prices updated
                daily. We may earn a commission via affiliate links.
              </p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
