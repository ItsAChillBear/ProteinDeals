"use client";

import { useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { clsx } from "clsx";

interface FilterGroup {
  id: string;
  label: string;
  options: { value: string; label: string }[];
}

const filterGroups: FilterGroup[] = [
  {
    id: "brand",
    label: "Brand",
    options: [
      { value: "myprotein", label: "MyProtein" },
      { value: "bulk", label: "Bulk" },
      { value: "optimum-nutrition", label: "Optimum Nutrition" },
      { value: "protein-works", label: "Protein Works" },
    ],
  },
  {
    id: "type",
    label: "Type",
    options: [
      { value: "whey-concentrate", label: "Whey Concentrate" },
      { value: "whey-isolate", label: "Whey Isolate" },
      { value: "vegan", label: "Vegan" },
      { value: "casein", label: "Casein" },
    ],
  },
  {
    id: "retailer",
    label: "Retailer",
    options: [
      { value: "myprotein", label: "MyProtein" },
      { value: "bulk", label: "Bulk" },
      { value: "holland-barrett", label: "Holland & Barrett" },
      { value: "amazon-uk", label: "Amazon UK" },
    ],
  },
];

const sizeOptions = [
  { value: "all", label: "All Sizes" },
  { value: "500g-1kg", label: "500g – 1kg" },
  { value: "1kg-2kg", label: "1kg – 2kg" },
  { value: "2kg+", label: "2kg+" },
];

export default function FilterSidebar() {
  const [checked, setChecked] = useState<Record<string, Set<string>>>({
    brand: new Set(),
    type: new Set(),
    retailer: new Set(),
  });
  const [size, setSize] = useState("all");

  function toggleCheck(groupId: string, value: string) {
    setChecked((prev) => {
      const next = new Set(prev[groupId]);
      if (next.has(value)) {
        next.delete(value);
      } else {
        next.add(value);
      }
      return { ...prev, [groupId]: next };
    });
  }

  function clearAll() {
    setChecked({ brand: new Set(), type: new Set(), retailer: new Set() });
    setSize("all");
  }

  const hasActiveFilters =
    Object.values(checked).some((s) => s.size > 0) || size !== "all";

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 sticky top-20">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-gray-400" />
          <span className="text-sm font-semibold text-white">Filters</span>
        </div>
        {hasActiveFilters && (
          <button
            onClick={clearAll}
            className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition-colors"
          >
            <X className="h-3 w-3" />
            Clear All
          </button>
        )}
      </div>

      {/* Size Filter */}
      <div className="mb-6">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Size
        </p>
        <div className="flex flex-col gap-1">
          {sizeOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setSize(opt.value)}
              className={clsx(
                "text-left text-sm px-3 py-2 rounded-lg transition-colors",
                size === opt.value
                  ? "bg-green-950/60 text-green-400 border border-green-800/50"
                  : "text-gray-400 hover:text-white hover:bg-gray-800"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Checkbox Filter Groups */}
      {filterGroups.map((group) => (
        <div key={group.id} className="mb-6 last:mb-0">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            {group.label}
          </p>
          <div className="flex flex-col gap-2">
            {group.options.map((opt) => {
              const isChecked = checked[group.id]?.has(opt.value) ?? false;
              return (
                <label
                  key={opt.value}
                  className="flex items-center gap-2.5 cursor-pointer group"
                >
                  <div
                    className={clsx(
                      "h-4 w-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors",
                      isChecked
                        ? "bg-green-500 border-green-500"
                        : "border-gray-600 group-hover:border-gray-400"
                    )}
                    onClick={() => toggleCheck(group.id, opt.value)}
                  >
                    {isChecked && (
                      <svg
                        className="h-2.5 w-2.5 text-gray-950"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={3}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </div>
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={isChecked}
                    onChange={() => toggleCheck(group.id, opt.value)}
                    value={opt.value}
                  />
                  <span
                    className={clsx(
                      "text-sm transition-colors",
                      isChecked
                        ? "text-white"
                        : "text-gray-400 group-hover:text-white"
                    )}
                  >
                    {opt.label}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
