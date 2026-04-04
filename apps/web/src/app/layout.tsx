import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { ThemeProvider } from "@/components/ThemeProvider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ProteinDeals | Best Protein Powder Prices UK",
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
    title: "ProteinDeals | Best Protein Powder Prices UK",
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
      <head>
        {/* Prevent flash of wrong theme */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('theme');if(t==='dark')document.documentElement.classList.add('dark');})();`,
          }}
        />
      </head>
      <body className="bg-theme text-theme antialiased min-h-screen transition-colors duration-200">
        <ThemeProvider>
          <Navbar />
          <main>{children}</main>
          <footer className="border-t border-theme mt-20 py-10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col md:flex-row justify-between items-start gap-8">
                <div>
                  <span className="text-xl font-bold text-green-500">
                    ProteinDeals
                  </span>
                  <p className="text-theme-3 text-sm mt-2 max-w-xs">
                    The UK&apos;s most comprehensive protein powder price
                    comparison tool. Updated daily.
                  </p>
                </div>
                <div className="flex gap-12 text-sm text-theme-3">
                  <div className="flex flex-col gap-2">
                    <span className="text-theme font-medium mb-1">Compare</span>
                    <a href="/compare" className="hover:text-green-500 transition-colors">
                      All Products
                    </a>
                    <a href="/deals" className="hover:text-green-500 transition-colors">
                      Best Deals
                    </a>
                  </div>
                  <div className="flex flex-col gap-2">
                    <span className="text-theme font-medium mb-1">Company</span>
                    <a href="/blog" className="hover:text-green-500 transition-colors">
                      Blog
                    </a>
                    <a href="/contact" className="hover:text-green-500 transition-colors">
                      Contact
                    </a>
                  </div>
                </div>
              </div>
              <div className="border-t border-theme mt-8 pt-6 text-center text-xs text-theme-4">
                <p>
                  &copy; {new Date().getFullYear()} ProteinDeals. Prices updated
                  daily. We may earn a commission via affiliate links.
                </p>
              </div>
            </div>
          </footer>
        </ThemeProvider>
      </body>
    </html>
  );
}
