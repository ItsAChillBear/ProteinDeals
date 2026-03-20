"use client";

import { ChevronDown, SlidersHorizontal, X } from "lucide-react";

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
}: {
  filters: CompareFilters;
  onChange: (filters: CompareFilters) => void;
}) {
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
        <Dropdown
          label="Size"
          value={filters.size}
          onChange={(value) => onChange({ ...filters, size: value })}
          options={sizeOptions}
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

function Dropdown({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly { value: string; label: string }[];
}) {
  return (
    <label className="space-y-2">
      <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
        {label}
      </span>
      <div className="relative">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full appearance-none rounded-xl border border-gray-800 bg-gray-950 px-4 py-3 pr-10 text-sm text-white outline-none transition focus:border-green-500"
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
      </div>
    </label>
  );
}
