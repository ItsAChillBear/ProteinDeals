"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, Moon, Sun, TrendingDown, X } from "lucide-react";
import { clsx } from "clsx";
import { useTheme } from "./ThemeProvider";

const navLinks = [
  { href: "/compare", label: "Compare" },
  { href: "/deals", label: "Deals" },
  { href: "/blog", label: "Blog" },
  { href: "/contact", label: "Contact" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme, toggle } = useTheme();

  return (
    <nav className="sticky top-0 z-50 bg-surface backdrop-blur-md border-b border-theme">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 group"
            onClick={() => setMobileOpen(false)}
          >
            <div className="h-8 w-8 rounded-lg bg-green-500/10 border border-green-500/30 flex items-center justify-center group-hover:bg-green-500/20 transition-colors">
              <TrendingDown className="h-4 w-4 text-green-500" />
            </div>
            <span className="text-xl font-extrabold tracking-tight text-theme group-hover:text-green-500 transition-colors">
              Protein<span className="text-green-500">Deals</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={clsx(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-150",
                  pathname === link.href
                    ? "bg-green-500/10 text-green-600 dark:text-green-400"
                    : "text-theme-3 hover:text-theme hover:bg-surface-2"
                )}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/compare"
              className="ml-3 inline-flex items-center bg-green-500 hover:bg-green-400 text-white font-bold px-4 py-2 rounded-lg text-sm transition-all duration-150 hover:shadow-md hover:shadow-green-500/20"
            >
              Compare Prices
            </Link>
            <Link
              href="/admin/scrapers"
              className="ml-2 inline-flex items-center border border-theme-2 hover:border-green-500/40 bg-surface hover:bg-surface-2 text-theme-2 hover:text-theme font-semibold px-4 py-2 rounded-lg text-sm transition-all duration-150"
            >
              Backend
            </Link>
            <button
              type="button"
              onClick={toggle}
              aria-label="Toggle theme"
              className="ml-2 p-2 rounded-lg text-theme-3 hover:text-theme hover:bg-surface-2 transition-colors"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>

          {/* Mobile right side */}
          <div className="md:hidden flex items-center gap-1">
            <button
              type="button"
              onClick={toggle}
              aria-label="Toggle theme"
              className="p-2 rounded-lg text-theme-3 hover:text-theme hover:bg-surface-2 transition-colors"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button
              className="p-2 rounded-lg text-theme-3 hover:text-theme hover:bg-surface-2 transition-colors"
              onClick={() => setMobileOpen((prev) => !prev)}
              aria-label="Toggle mobile menu"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Nav */}
      {mobileOpen && (
        <div className="md:hidden border-t border-theme bg-surface px-4 pt-3 pb-5 space-y-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className={clsx(
                "block px-4 py-3 rounded-xl text-sm font-medium transition-colors",
                pathname === link.href
                  ? "bg-green-500/10 text-green-600 dark:text-green-400"
                  : "text-theme-3 hover:text-theme hover:bg-surface-2"
              )}
            >
              {link.label}
            </Link>
          ))}
          <div className="pt-2">
            <Link
              href="/compare"
              onClick={() => setMobileOpen(false)}
              className="block w-full text-center bg-green-500 hover:bg-green-400 text-white font-bold px-4 py-3 rounded-xl text-sm transition-colors"
            >
              Compare Prices
            </Link>
            <Link
              href="/admin/scrapers"
              onClick={() => setMobileOpen(false)}
              className="mt-2 block w-full text-center border border-theme-2 hover:border-green-500/40 bg-surface hover:bg-surface-2 text-theme-2 hover:text-theme font-semibold px-4 py-3 rounded-xl text-sm transition-colors"
            >
              Backend
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
