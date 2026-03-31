"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, SlidersHorizontal, X } from "lucide-react";

interface FilterGroup {
  id: "brand" | "type" | "retailer";
  label: string;
  options: { value: string; label: string }[];
}

type DropdownOption = { value: string; label: string };
type DropdownOptions = readonly (DropdownOption | { group: string; options: DropdownOption[] })[];

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

function SizeDropdown({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: DropdownOptions;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const selectedLabel = useMemo(() => {
    for (const option of options) {
      if ("group" in option) {
        const match = option.options.find((item) => item.value === value);
        if (match) return match.label;
      } else if (option.value === value) {
        return option.label;
      }
    }
    return "All Sizes";
  }, [options, value]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <label className="space-y-2">
      <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
        {label}
      </span>
      <div ref={rootRef} className="relative">
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          className="flex w-full items-center justify-between rounded-xl border border-gray-800 bg-gray-950 px-4 py-3 text-sm text-white outline-none transition hover:border-gray-700 focus:border-green-500"
        >
          <span>{selectedLabel}</span>
          <ChevronDown
            className={`h-4 w-4 text-gray-500 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>

        {open ? (
          <div className="absolute left-0 right-0 z-20 mt-2 overflow-hidden rounded-xl border border-gray-800 bg-gray-950 shadow-2xl">
            <div className="max-h-80 overflow-y-auto py-1">
              {options.map((option, index) =>
                "group" in option ? (
                  <div key={`${option.group}-${index}`}>
                    <div className="mx-3 my-2 h-px bg-gray-800" />
                    {option.options.map((groupOption) => (
                      <SizeOptionButton
                        key={groupOption.value}
                        active={groupOption.value === value}
                        label={groupOption.label}
                        onClick={() => {
                          onChange(groupOption.value);
                          setOpen(false);
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  <SizeOptionButton
                    key={option.value}
                    active={option.value === value}
                    label={option.label}
                    onClick={() => {
                      onChange(option.value);
                      setOpen(false);
                    }}
                  />
                )
              )}
            </div>
          </div>
        ) : null}
      </div>
    </label>
  );
}

function SizeOptionButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`block w-full px-4 py-2.5 text-left text-sm transition ${
        active
          ? "bg-green-500/10 text-green-300"
          : "text-white hover:bg-gray-900 hover:text-green-200"
      }`}
    >
      {label}
    </button>
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
  options: DropdownOptions;
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
          {options.map((opt) =>
            "group" in opt ? (
              <optgroup key={opt.group} label={opt.group}>
                {opt.options.map((groupOption) => (
                  <option key={groupOption.value} value={groupOption.value}>
                    {groupOption.label}
                  </option>
                ))}
              </optgroup>
            ) : (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            )
          )}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
      </div>
    </label>
  );
}
