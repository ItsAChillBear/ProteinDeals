"use client";

import { SlidersHorizontal, X } from "lucide-react";
import { Dropdown, SizeDropdown, type DropdownOptions } from "./FilterSidebarDropdowns";

interface FilterGroup {
  id: "brand" | "type" | "retailer";
  label: string;
  options: { value: string; label: string }[];
}

export type CompareFilters = {
  brand: string;
  type: string;
  retailer: string;
  size: string;
  stock: "in-stock" | "out-of-stock" | "all";
};

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
  { value: "500g-1kg", label: "500g - 1kg" },
  { value: "1kg-2kg", label: "1kg - 2kg" },
  { value: "2kg+", label: "2kg+" },
];

const stockOptions = [
  { value: "in-stock", label: "In stock" },
  { value: "out-of-stock", label: "Out of stock" },
  { value: "all", label: "All stock" },
] as const;

export default function FilterSidebar({
  filters,
  onChange,
  sizeOptions: dynamicSizeOptions,
}: {
  filters: CompareFilters;
  onChange: (filters: CompareFilters) => void;
  sizeOptions?: DropdownOptions;
}) {
  const mergedSizeOptions = dynamicSizeOptions ?? sizeOptions;

  function clearAll() {
    onChange({
      brand: "",
      type: "",
      retailer: "",
      size: "all",
      stock: "in-stock",
    });
  }

  const hasActiveFilters =
    filters.brand !== "" ||
    filters.type !== "" ||
    filters.retailer !== "" ||
    filters.size !== "all" ||
    filters.stock !== "in-stock";

  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-gray-400" />
          <span className="text-sm font-semibold text-white">Filters</span>
        </div>
        {hasActiveFilters ? (
          <button
            type="button"
            onClick={clearAll}
            className="flex items-center gap-1 text-xs text-red-400 transition-colors hover:text-red-300"
          >
            <X className="h-3 w-3" />
            Clear All
          </button>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <SizeDropdown
          label="Size"
          value={filters.size}
          onChange={(value) => onChange({ ...filters, size: value })}
          options={mergedSizeOptions}
        />
        <Dropdown
          label="Stock"
          value={filters.stock}
          onChange={(value) =>
            onChange({ ...filters, stock: value as CompareFilters["stock"] })
          }
          options={stockOptions as readonly { value: string; label: string }[]}
        />
        {filterGroups.map((group) => (
          <Dropdown
            key={group.id}
            label={group.label}
            value={filters[group.id]}
            onChange={(value) => onChange({ ...filters, [group.id]: value })}
            options={[{ value: "", label: `All ${group.label}s` }, ...group.options]}
          />
        ))}
      </div>
    </div>
  );
}
