"use client";

import type { BudgetPeriod, ProteinPlannerState } from "./price-comparison-planner";

const PERIOD_OPTIONS: BudgetPeriod[] = ["day", "week", "month", "year"];

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
    value.proteinTarget !== "" || (value.budgetEnabled && value.budgetAmount !== "");

  return (
    <div className="border-b border-gray-800 bg-gray-900/70 px-6 py-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid gap-4 md:grid-cols-[minmax(0,260px)_auto_minmax(0,280px)] md:items-end">
          <label className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              How much protein do you need per day?
            </span>
            <div className="flex items-center rounded-xl border border-gray-700 bg-gray-950 px-3">
              <input
                type="number"
                min="0"
                step="1"
                value={value.proteinTarget}
                onChange={(event) => onChange({ proteinTarget: event.target.value })}
                placeholder="e.g. 150"
                className="w-full bg-transparent py-2.5 text-sm text-white outline-none placeholder:text-gray-500"
              />
              <span className="text-xs text-gray-500">g/day</span>
            </div>
          </label>

          <button
            type="button"
            onClick={() => onChange({ budgetEnabled: !value.budgetEnabled })}
            className="h-11 rounded-xl border border-dashed border-gray-700 px-4 text-sm font-medium text-gray-300 transition hover:border-gray-500 hover:text-white"
          >
            {value.budgetEnabled ? "Remove Budget" : "+ Additional Budget"}
          </button>

          {value.budgetEnabled ? (
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_120px]">
              <label className="flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  What is your budget per day/week/month/year?
                </span>
                <div className="flex items-center rounded-xl border border-gray-700 bg-gray-950 px-3">
                  <span className="text-sm text-gray-500">£</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={value.budgetAmount}
                    onChange={(event) => onChange({ budgetAmount: event.target.value })}
                    placeholder="e.g. 30"
                    className="w-full bg-transparent py-2.5 pl-2 text-sm text-white outline-none placeholder:text-gray-500"
                  />
                </div>
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Period
                </span>
                <select
                  value={value.budgetPeriod}
                  onChange={(event) => onChange({ budgetPeriod: event.target.value as BudgetPeriod })}
                  className="h-11 rounded-xl border border-gray-700 bg-gray-950 px-3 text-sm text-white outline-none transition focus:border-green-500"
                >
                  {PERIOD_OPTIONS.map((period) => (
                    <option key={period} value={period}>
                      {period}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ) : (
            <div className="hidden md:block" />
          )}
        </div>

        {hasPlannerValue ? (
          <button
            type="button"
            onClick={onReset}
            className="h-11 rounded-xl border border-gray-700 bg-gray-800 px-4 text-sm font-medium text-gray-200 transition hover:border-gray-500 hover:text-white"
          >
            Reset Planner
          </button>
        ) : null}
      </div>
    </div>
  );
}
