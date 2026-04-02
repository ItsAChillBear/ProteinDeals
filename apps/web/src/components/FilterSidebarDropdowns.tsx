"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

export type DropdownOption = { value: string; label: string };
export type DropdownOptions = readonly (DropdownOption | { group: string; options: DropdownOption[] })[];

export function SizeDropdown({
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
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
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
      <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">{label}</span>
      <div ref={rootRef} className="relative">
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          className="flex w-full items-center justify-between rounded-xl border border-gray-800 bg-gray-950 px-4 py-3 text-sm text-white outline-none transition hover:border-gray-700 focus:border-green-500"
        >
          <span>{selectedLabel}</span>
          <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${open ? "rotate-180" : ""}`} />
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
        active ? "bg-green-500/10 text-green-300" : "text-white hover:bg-gray-900 hover:text-green-200"
      }`}
    >
      {label}
    </button>
  );
}

export function Dropdown({
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
      <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">{label}</span>
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
