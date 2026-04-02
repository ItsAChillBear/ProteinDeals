"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { clsx } from "clsx";
import { RANGE_PREFIX } from "./price-comparison-filters";

const triggerClass =
  "flex w-full items-center justify-between gap-1 rounded-lg border border-gray-700 bg-gray-900 px-1.5 py-0.5 text-[10px] text-gray-300 outline-none transition hover:border-gray-500 min-w-0";

function RangeSlider({
  min,
  max,
  valueMin,
  valueMax,
  onChange,
  fmt,
}: {
  min: number;
  max: number;
  valueMin: number;
  valueMax: number;
  onChange: (lo: number, hi: number) => void;
  fmt: (n: number) => string;
}) {
  const pct = (v: number) => ((v - min) / (max - min)) * 100;

  return (
    <div className="px-1 pb-1 pt-2">
      <div className="mb-3 flex items-center justify-between gap-1">
        <span className="w-16 truncate rounded bg-gray-800 px-1.5 py-0.5 text-center text-[10px] font-medium text-green-400">
          {fmt(valueMin)}
        </span>
        <span className="w-16 truncate rounded bg-gray-800 px-1.5 py-0.5 text-center text-[10px] font-medium text-green-400">
          {fmt(valueMax)}
        </span>
      </div>

      <div className="relative h-5">
        <div className="absolute top-1/2 h-1 w-full -translate-y-1/2 rounded-full bg-gray-700" />
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
          className="pointer-events-none absolute inset-0 h-full w-full appearance-none bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-green-400 [&::-webkit-slider-thumb]:bg-gray-900 [&::-webkit-slider-thumb]:transition-colors [&::-webkit-slider-thumb]:hover:bg-green-950 [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-green-400 [&::-moz-range-thumb]:bg-gray-900"
          style={{ zIndex: valueMin > max - 2 ? 5 : 3 }}
        />
        <input
          type="range"
          min={min}
          max={max}
          value={valueMax}
          onChange={(e) => onChange(valueMin, Math.max(Number(e.target.value), valueMin + 1))}
          className="pointer-events-none absolute inset-0 h-full w-full appearance-none bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-green-400 [&::-webkit-slider-thumb]:bg-gray-900 [&::-webkit-slider-thumb]:transition-colors [&::-webkit-slider-thumb]:hover:bg-green-950 [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-green-400 [&::-moz-range-thumb]:bg-gray-900"
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
}: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
  formatFn?: (n: number) => string;
  numeric?: boolean;
}) {
  const fmt = formatFn ?? String;
  const allNumericValues = options.map(Number).filter((n) => !isNaN(n));
  const sliderMin = allNumericValues.length ? Math.min(...allNumericValues) : 0;
  const sliderMax = allNumericValues.length ? Math.max(...allNumericValues) : 100;
  const [open, setOpen] = useState(false);
  const [sliderLo, setSliderLo] = useState(sliderMin);
  const [sliderHi, setSliderHi] = useState(sliderMax);
  const [search, setSearch] = useState("");
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
  const ref = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const filteredOptions = options.filter((option) => {
    const label = formatFn ? fmt(Number(option)) : option;
    return label.toLowerCase().includes(search.trim().toLowerCase());
  });

  useEffect(() => {
    if (!open) return;
    setSliderLo(sliderMin);
    setSliderHi(sliderMax);
    setSearch("");
    if (value.startsWith(RANGE_PREFIX)) onChange("all");
  }, [open, onChange, sliderMax, sliderMin, value]);

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
    if (value === "all") return "All";
    if (value.startsWith(RANGE_PREFIX)) {
      const [lo, hi] = value.replace(RANGE_PREFIX, "").split(":");
      return hi ? `${fmt(Number(lo))} – ${fmt(Number(hi))}` : `${fmt(Number(lo))}+`;
    }
    return formatFn ? fmt(Number(value)) : value;
  }

  return (
    <div ref={ref} className="relative">
      <button ref={btnRef} type="button" onClick={() => setOpen((o) => !o)} className={triggerClass}>
        <span className="w-[72px] flex-shrink-0 truncate">{getLabel()}</span>
        <ChevronDown className={clsx("h-2.5 w-2.5 flex-shrink-0 transition-transform", open && "rotate-180")} />
      </button>
      {open ? (
        <div className="fixed z-50 w-52 rounded-xl border border-gray-700 bg-gray-900 shadow-2xl" style={{ top: dropdownPos.top, left: dropdownPos.left }}>
          <div className="py-1">
            <div className="px-3 pb-2 pt-1">
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search options..."
                className="w-full rounded-lg border border-gray-700 bg-gray-950 px-2.5 py-2 text-[11px] text-white outline-none transition placeholder:text-gray-500 focus:border-green-500"
              />
            </div>
            <button type="button" onClick={() => { onChange("all"); setOpen(false); }} className={clsx("w-full px-3 py-1.5 text-left text-[11px] transition hover:bg-gray-800", value === "all" ? "text-green-400" : "text-gray-300")}>
              All
            </button>
            {numeric && allNumericValues.length > 1 ? (
              <>
                <div className="mt-1 border-t border-gray-800 px-3 pb-0.5 pt-1.5 text-[9px] font-semibold uppercase tracking-widest text-gray-600">Range</div>
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
                      onChange(`${RANGE_PREFIX}${lo}:${hi}`);
                    }}
                  />
                </div>
              </>
            ) : null}
            {filteredOptions.length ? (
              <>
                <div className="mt-1 border-t border-gray-800 px-3 pb-0.5 pt-1.5 text-[9px] font-semibold uppercase tracking-widest text-gray-600">Exact</div>
                <div style={{ height: "200px", overflowY: "auto", overflowX: "hidden", display: "block" }}>
                  {filteredOptions.map((option) => (
                    <div
                      key={option}
                      role="button"
                      onClick={() => { onChange(option); setOpen(false); }}
                      className={clsx("w-full cursor-pointer overflow-hidden px-3 py-1.5 text-left text-[11px] transition hover:bg-gray-800", value === option ? "text-green-400" : "text-gray-300")}
                      style={{ display: "block", whiteSpace: "nowrap", textOverflow: "ellipsis" }}
                    >
                      {formatFn ? fmt(Number(option)) : option}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="border-t border-gray-800 px-3 py-3 text-[11px] text-gray-500">No matching options.</div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
