"use client";

import { Plus, Search, X } from "lucide-react";
import type { BudgetPeriod, ProteinPlannerState } from "./price-comparison-planner";

const PERIOD_OPTIONS: { value: BudgetPeriod; label: string }[] = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
];

function PlannerInput({
  label,
  prefix,
  suffix,
  value,
  placeholder,
  step,
  onChange,
}: {
  label: string;
  prefix?: string;
  suffix?: string;
  value: string;
  placeholder: string;
  step?: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-theme-3">{label}</span>
      <div className="flex items-center gap-0 rounded-lg border border-theme-2 bg-theme px-3 transition focus-within:border-theme">
        {prefix ? <span className="text-sm text-theme-3 pr-1">{prefix}</span> : null}
        <input
          type="number"
          min="0"
          step={step ?? "1"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-transparent py-2 text-sm text-theme outline-none placeholder:text-theme-4 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        {suffix ? <span className="text-xs text-theme-3 pl-1 whitespace-nowrap">{suffix}</span> : null}
      </div>
    </div>
  );
}

function AddOptionButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-lg border border-dashed border-theme-2 px-3 py-2 text-xs font-medium text-theme-3 transition hover:border-theme hover:text-theme self-end"
    >
      <Plus className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

function RemoveButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-7 w-7 items-center justify-center rounded-lg text-theme-4 transition hover:bg-surface-2 hover:text-theme-2 self-end mb-0.5"
      aria-label="Remove"
    >
      <X className="h-3.5 w-3.5" />
    </button>
  );
}

export default function PriceComparisonPlanner({
  value,
  onChange,
  onReset,
}: {
  value: ProteinPlannerState;
  onChange: (patch: Partial<ProteinPlannerState>) => void;
  onReset: () => void;
}) {
  const hasPlannerValue =
    value.proteinTarget !== "" ||
    value.calorieTarget !== "" ||
    (value.budgetEnabled && value.budgetAmount !== "");

  return (
    <div className="border-b border-theme px-6 py-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-theme-3">Planner</span>
        {hasPlannerValue ? (
          <button
            type="button"
            onClick={onReset}
            className="text-xs text-theme-3 transition hover:text-theme"
          >
            Reset
          </button>
        ) : null}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        {/* Protein */}
        <div className="w-64">
          <PlannerInput
            label="How much protein do you want per day from powders?"
            suffix="g / day"
            value={value.proteinTarget}
            placeholder="e.g. 150"
            onChange={(v) => onChange({ proteinTarget: v, committed: false })}
          />
        </div>

        {/* Calories — togglable */}
        {value.calorieEnabled ? (
          <div className="flex items-end gap-1.5">
            <div className="w-48">
              <PlannerInput
                label="What is the maximum calories you want from your protein per day?"
                suffix="kcal / day"
                value={value.calorieTarget}
                placeholder="e.g. 2000"
                onChange={(v) => onChange({ calorieTarget: v, committed: false })}
              />
            </div>
            <RemoveButton onClick={() => onChange({ calorieEnabled: false, calorieTarget: "", committed: false })} />
          </div>
        ) : (
          <AddOptionButton label="Calories" onClick={() => onChange({ calorieEnabled: true })} />
        )}

        {/* Budget — togglable */}
        {value.budgetEnabled ? (
          <div className="flex items-end gap-1.5">
            <div className="w-36">
              <PlannerInput
                label="Budget"
                prefix="£"
                value={value.budgetAmount}
                placeholder="e.g. 30"
                step="0.01"
                onChange={(v) => onChange({ budgetAmount: v, committed: false })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-theme-3">Period</span>
              <div className="flex gap-1">
                {PERIOD_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => onChange({ budgetPeriod: opt.value, committed: false })}
                    className={`rounded-lg px-2.5 py-2 text-xs font-medium transition ${
                      value.budgetPeriod === opt.value
                        ? "bg-green-500/20 text-green-500 ring-1 ring-green-500/40"
                        : "bg-surface-2 text-theme-3 hover:text-theme"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <RemoveButton onClick={() => onChange({ budgetEnabled: false, budgetAmount: "", committed: false })} />
          </div>
        ) : (
          <AddOptionButton label="Budget" onClick={() => onChange({ budgetEnabled: true })} />
        )}

        {/* Search button */}
        {value.proteinTarget !== "" ? (
          <button
            type="button"
            onClick={() => onChange({ committed: true })}
            className={`flex items-center gap-2 self-end rounded-lg px-4 py-2 text-sm font-semibold transition ${
              value.committed
                ? "bg-green-600 text-white hover:bg-green-500"
                : "bg-green-500 text-white hover:bg-green-400"
            }`}
          >
            <Search className="h-4 w-4" />
            {value.committed ? "Applied" : "Search"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
