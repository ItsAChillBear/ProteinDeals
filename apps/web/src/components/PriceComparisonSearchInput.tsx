"use client";

import { memo, useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";

interface Props {
  value: string;
  onChange: (value: string) => void;
}

declare global {
  interface Window {
    __compareSearchDebug?: {
      inputChangedAt?: number;
      debouncedAppliedAt?: number;
      appliedValue?: string;
    };
  }
}

function markComparePerformance(name: string) {
  if (typeof performance === "undefined" || typeof performance.mark !== "function") return;
  performance.mark(name);
}

function measureComparePerformance(name: string, startMark: string, endMark: string) {
  if (typeof performance === "undefined" || typeof performance.measure !== "function") return;
  try {
    performance.measure(name, startMark, endMark);
  } catch {
    // Ignore missing-mark errors during rapid input changes.
  }
}

function PriceComparisonSearchInputComponent({ value, onChange }: Props) {
  const [searchInput, setSearchInput] = useState(value);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    setSearchInput((current) => (current === value ? current : value));
  }, [value]);

  useEffect(() => {
    if (searchInput === value) return;

    const timeout = window.setTimeout(() => {
      markComparePerformance("compare-search:debounce-fired");
      measureComparePerformance(
        "compare-search:input-to-debounce",
        "compare-search:input-changed",
        "compare-search:debounce-fired"
      );
      window.__compareSearchDebug = {
        ...(window.__compareSearchDebug ?? {}),
        debouncedAppliedAt: performance.now(),
        appliedValue: searchInput,
      };
      console.log("[compare-search-debug] search-debounce", {
        value: searchInput,
        msSinceInput:
          window.__compareSearchDebug?.inputChangedAt !== undefined
            ? Number((performance.now() - window.__compareSearchDebug.inputChangedAt).toFixed(2))
            : null,
      });
      onChangeRef.current(searchInput);
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [searchInput, value]);

  return (
    <div className="relative flex items-center">
      <Search className="absolute left-2 h-3.5 w-3.5 text-theme-4 pointer-events-none" />
      <input
        type="text"
        value={searchInput}
        onChange={(e) => {
          const nextValue = e.target.value;
          markComparePerformance("compare-search:input-changed");
          window.__compareSearchDebug = {
            ...(window.__compareSearchDebug ?? {}),
            inputChangedAt: performance.now(),
            appliedValue: nextValue,
          };
          console.log("[compare-search-debug] search-input", {
            value: nextValue,
          });
          setSearchInput(nextValue);
        }}
        placeholder="Search products..."
        className="rounded-md border border-theme-2 bg-surface pl-7 pr-2.5 py-1 text-xs text-theme placeholder:text-theme-4 focus:outline-none focus:border-green-500/50 w-44"
      />
    </div>
  );
}

const PriceComparisonSearchInput = memo(PriceComparisonSearchInputComponent);

export default PriceComparisonSearchInput;
