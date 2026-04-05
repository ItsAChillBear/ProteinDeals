"use client";

import { memo, useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";

interface Props {
  value: string;
  onChange: (value: string) => void;
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
          setSearchInput(e.target.value);
        }}
        placeholder="Search products..."
        className="rounded-md border border-theme-2 bg-surface pl-7 pr-2.5 py-1 text-xs text-theme placeholder:text-theme-4 focus:outline-none focus:border-green-500/50 w-44"
      />
    </div>
  );
}

const PriceComparisonSearchInput = memo(PriceComparisonSearchInputComponent);

export default PriceComparisonSearchInput;
