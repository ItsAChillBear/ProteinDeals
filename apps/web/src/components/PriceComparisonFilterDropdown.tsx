"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { clsx } from "clsx";
import { buildMultiFilter, MULTI_PREFIX, parseMultiFilter, RANGE_PREFIX } from "./price-comparison-filters";

const triggerClass =
  "flex w-full items-center justify-between gap-1 rounded-lg border border-theme-2 bg-surface px-1.5 py-0.5 text-[10px] text-theme-2 outline-none transition hover:border-theme min-w-[4rem]";

function RangeSlider({
  min,
  max,
  valueMin,
  valueMax,
  onChange,
  onCommit,
  fmt,
}: {
  min: number;
  max: number;
  valueMin: number;
  valueMax: number;
  onChange: (lo: number, hi: number) => void;
  onCommit: () => void;
  fmt: (n: number) => string;
}) {
  const pct = (v: number) => ((v - min) / (max - min)) * 100;

  return (
    <div className="px-1 pb-1 pt-2">
      <div className="mb-3 flex items-center justify-between gap-1">
        <span className="w-16 truncate rounded bg-surface-2 px-1.5 py-0.5 text-center text-[10px] font-medium text-green-500">
          {fmt(valueMin)}
        </span>
        <span className="w-16 truncate rounded bg-surface-2 px-1.5 py-0.5 text-center text-[10px] font-medium text-green-500">
          {fmt(valueMax)}
        </span>
      </div>

      <div className="relative h-5">
        <div className="absolute top-1/2 h-1 w-full -translate-y-1/2 rounded-full bg-surface-3" />
        <div
          className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-green-500"
          style={{ left: `${pct(valueMin)}%`, width: `${pct(valueMax) - pct(valueMin)}%` }}
        />
        <input
          type="range"
          min={min}
          max={max}
          value={valueMin}
          onChange={(e) => onChange(Math.min(Number(e.target.value), valueMax - 1), valueMax)}
          onMouseUp={onCommit}
          onTouchEnd={onCommit}
          onKeyUp={onCommit}
          className="pointer-events-none absolute inset-0 h-full w-full appearance-none bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-green-500 [&::-webkit-slider-thumb]:bg-surface [&::-webkit-slider-thumb]:transition-colors [&::-webkit-slider-thumb]:hover:bg-green-500/20 [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-green-500 [&::-moz-range-thumb]:bg-surface"
          style={{ zIndex: valueMin > max - 2 ? 5 : 3 }}
        />
        <input
          type="range"
          min={min}
          max={max}
          value={valueMax}
          onChange={(e) => onChange(valueMin, Math.max(Number(e.target.value), valueMin + 1))}
          onMouseUp={onCommit}
          onTouchEnd={onCommit}
          onKeyUp={onCommit}
          className="pointer-events-none absolute inset-0 h-full w-full appearance-none bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-green-500 [&::-webkit-slider-thumb]:bg-surface [&::-webkit-slider-thumb]:transition-colors [&::-webkit-slider-thumb]:hover:bg-green-500/20 [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-green-500 [&::-moz-range-thumb]:bg-surface"
          style={{ zIndex: 4 }}
        />
      </div>
    </div>
  );
}

export function PriceComparisonFilterDropdown({
  value,
  options,
  onChange,
  formatFn,
  numeric = false,
  numericValues,
  multi = false,
  label,
}: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
  formatFn?: (n: number) => string;
  numeric?: boolean;
  numericValues?: number[];
  multi?: boolean;
  label?: string;
}) {
  const fmt = formatFn ?? String;
  const allNumericValues = numericValues ?? options.map(Number).filter((n) => !isNaN(n));
  const sliderMin = allNumericValues.length ? Math.min(...allNumericValues) : 0;
  const sliderMax = allNumericValues.length ? Math.max(...allNumericValues) : 100;
  const [open, setOpen] = useState(false);
  const [sliderLo, setSliderLo] = useState(sliderMin);
  const [sliderHi, setSliderHi] = useState(sliderMax);
  const [search, setSearch] = useState("");
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
  const ref = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const filteredOptions = options.filter((option, idx) => {
    const label = formatFn
      ? (numericValues ? fmt(numericValues[idx] ?? 0) : fmt(Number(option)))
      : option;
    return label.toLowerCase().includes(search.trim().toLowerCase());
  });

  const selectedValues = value.startsWith(MULTI_PREFIX) ? parseMultiFilter(value) : [];

  function toggleMultiOption(option: string) {
    const next = selectedValues.includes(option)
      ? selectedValues.filter((v) => v !== option)
      : [...selectedValues, option];
    onChange(buildMultiFilter(next));
  }

  const prevOpenRef = useRef(false);
  useEffect(() => {
    const justOpened = open && !prevOpenRef.current;
    prevOpenRef.current = open;
    if (!justOpened) return;
    setSearch("");
    if (value.startsWith(RANGE_PREFIX)) {
      const [lo, hi] = value.replace(RANGE_PREFIX, "").split(":");
      setSliderLo(Number(lo));
      setSliderHi(Number(hi));
      return;
    }
    setSliderLo(sliderMin);
    setSliderHi(sliderMax);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function updatePos() {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const width = 208;
    const left = Math.max(4, Math.min(rect.left + rect.width / 2 - width / 2, window.innerWidth - width - 4));
    setDropdownPos({ top: rect.bottom + 6, left });
  }

  useLayoutEffect(() => {
    if (open) updatePos();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    window.addEventListener("scroll", updatePos, true);
    window.addEventListener("resize", updatePos);
    return () => {
      window.removeEventListener("scroll", updatePos, true);
      window.removeEventListener("resize", updatePos);
    };
  }, [open]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function getLabel() {
    if (value === "all") return label ?? "All";
    if (value.startsWith(MULTI_PREFIX)) {
      const count = selectedValues.length;
      if (count === 0) return "None";
      if (count === options.length) return label ?? "All";
      return `${count} selected`;
    }
    if (value.startsWith(RANGE_PREFIX)) {
      const [lo, hi] = value.replace(RANGE_PREFIX, "").split(":");
      return hi ? `${fmt(Number(lo))} – ${fmt(Number(hi))}` : `${fmt(Number(lo))}+`;
    }
    if (formatFn && numericValues) {
      const idx = options.indexOf(value);
      return idx !== -1 ? fmt(numericValues[idx]) : value;
    }
    return formatFn ? fmt(Number(value)) : value;
  }

  return (
    <div ref={ref} className="relative">
      <button ref={btnRef} type="button" onClick={() => setOpen((o) => !o)} className={triggerClass}>
        <span className="min-w-0 flex-1 truncate">{getLabel()}</span>
        <ChevronDown className={clsx("h-2.5 w-2.5 flex-shrink-0 transition-transform", open && "rotate-180")} />
      </button>
      {open ? (
        <div className="fixed z-50 w-52 rounded-xl border border-theme-2 bg-surface shadow-2xl" style={{ top: dropdownPos.top, left: dropdownPos.left }}>
          <div className="py-1">
            <div className="px-3 pb-2 pt-1">
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search options..."
                className="w-full rounded-lg border border-theme-2 bg-theme px-2.5 py-2 text-[11px] text-theme outline-none transition placeholder:text-theme-4 focus:border-green-500"
              />
            </div>
            {multi ? (
              <div className="flex gap-1 px-3 pb-1.5">
                <button type="button" onClick={() => onChange(buildMultiFilter(options))} className="flex-1 rounded border border-theme-2 py-1 text-[10px] text-theme-2 transition hover:border-theme hover:text-theme">Select All</button>
                <button type="button" onClick={() => onChange(buildMultiFilter([]))} className="flex-1 rounded border border-theme-2 py-1 text-[10px] text-theme-2 transition hover:border-theme hover:text-theme">Deselect All</button>
              </div>
            ) : (
              <button type="button" onClick={() => { onChange("all"); setOpen(false); }} className={clsx("w-full px-3 py-1.5 text-left text-[11px] transition hover:bg-surface-2", value === "all" ? "text-green-500" : "text-theme-2")}>
                All
              </button>
            )}
            {numeric && allNumericValues.length > 1 ? (
              <>
                <div className="mt-1 border-t border-theme px-3 pb-0.5 pt-1.5 text-[9px] font-semibold uppercase tracking-widest text-theme-4">Range</div>
                <div className="px-3 pb-2 pt-1">
                  <RangeSlider
                    min={sliderMin}
                    max={sliderMax}
                    valueMin={sliderLo}
                    valueMax={sliderHi}
                    fmt={fmt}
                    onChange={(lo, hi) => {
                      setSliderLo(lo);
                      setSliderHi(hi);
                    }}
                    onCommit={() => onChange(`${RANGE_PREFIX}${sliderLo}:${sliderHi}`)}
                  />
                </div>
              </>
            ) : null}
            {filteredOptions.length ? (
              <>
                <div className="mt-1 border-t border-theme px-3 pb-0.5 pt-1.5 text-[9px] font-semibold uppercase tracking-widest text-theme-4">
                  {multi ? "Select" : "Exact"}
                </div>
                <div style={{ height: "200px", overflowY: "auto", overflowX: "hidden", display: "block" }}>
                  {filteredOptions.map((option) => {
                    const optionIdx = options.indexOf(option);
                    const label = formatFn
                      ? (numericValues ? fmt(numericValues[optionIdx] ?? 0) : fmt(Number(option)))
                      : option;
                    if (multi) {
                      const checked = selectedValues.includes(option);
                      return (
                        <label
                          key={option}
                          className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-[11px] transition hover:bg-surface-2"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleMultiOption(option)}
                            className="h-3.5 w-3.5 rounded border-theme-2 bg-surface-2 accent-green-500"
                          />
                          <span className={checked ? "text-green-500" : "text-theme-2"} style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {label || "Default"}
                          </span>
                        </label>
                      );
                    }
                    return (
                      <div
                        key={option}
                        role="button"
                        onClick={() => { onChange(option); setOpen(false); }}
                        className={clsx("w-full cursor-pointer overflow-hidden px-3 py-1.5 text-left text-[11px] transition hover:bg-surface-2", value === option ? "text-green-500" : "text-theme-2")}
                        style={{ display: "block", whiteSpace: "nowrap", textOverflow: "ellipsis" }}
                      >
                        {label}
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="border-t border-theme px-3 py-3 text-[11px] text-theme-3">No matching options.</div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
