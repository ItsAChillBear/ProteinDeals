"use client";

import { actionTone, formatActionLabel, formatPrice } from "./format";
import type { SyncEntry } from "./types";

export function ScraperDiffTable(props: {
  entries: SyncEntry[];
  isApplying: boolean;
  onApplyEntry: (entryId: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-[1.5rem] border border-stone-800 bg-stone-950/70">
      <div className="border-b border-stone-800 px-4 py-3 text-xs uppercase tracking-[0.2em] text-stone-400">
        Diff Preview
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-stone-900/90 text-xs uppercase tracking-[0.2em] text-stone-400">
            <tr>
              <th className="px-4 py-4 font-medium">Action</th>
              <th className="px-4 py-4 font-medium">Product</th>
              <th className="px-4 py-4 font-medium">Variant</th>
              <th className="px-4 py-4 font-medium">Reason</th>
              <th className="px-4 py-4 font-medium">Changed Fields</th>
              <th className="px-4 py-4 font-medium">Apply</th>
            </tr>
          </thead>
          <tbody>
            {props.entries.length ? (
              props.entries.map((entry) => (
                <tr
                  key={entry.id}
                  className="border-t border-stone-800 align-top text-stone-200"
                >
                  <td className="px-4 py-4">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${actionTone(entry.action)}`}
                    >
                      {formatActionLabel(entry.action)}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="space-y-1">
                      <p className="font-medium text-stone-50">
                        {entry.scraped?.productName ?? entry.current?.product.name ?? "-"}
                      </p>
                      <p className="text-xs text-stone-500">
                        {entry.scraped?.brand ?? entry.current?.product.brand ?? "-"}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="space-y-1">
                      <a
                        href={entry.scraped?.variantUrl ?? entry.current?.url ?? "#"}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-amber-300 underline-offset-4 hover:underline"
                      >
                        {entry.retailerProductId}
                      </a>
                      <div>{entry.scraped?.flavour ?? entry.current?.flavour ?? "-"}</div>
                      <div className="text-xs text-stone-500">
                        {entry.scraped?.sizeLabel ??
                          (entry.current ? `${entry.current.sizeG}g` : "-")}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm text-stone-300">{entry.reason}</td>
                  <td className="px-4 py-4">
                    {entry.fieldDiffs.length ? (
                      <div className="space-y-2">
                        {entry.fieldDiffs.map((fieldDiff) => (
                          <div
                            key={`${entry.id}-${fieldDiff.field}`}
                            className="rounded-xl border border-stone-800 bg-stone-900/80 p-3"
                          >
                            <div className="text-xs uppercase tracking-[0.15em] text-stone-500">
                              {fieldDiff.field}
                            </div>
                            <div className="mt-1 text-xs text-stone-400">
                              {formatDiffValue(fieldDiff.current, fieldDiff.field)} {"->"}{" "}
                              <span className="text-stone-100">
                                {formatDiffValue(fieldDiff.next, fieldDiff.field)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-stone-500">No field changes.</div>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <button
                      type="button"
                      disabled={props.isApplying || entry.action === "unchanged"}
                      onClick={() => props.onApplyEntry(entry.id)}
                      className="rounded-xl border border-amber-400/40 bg-amber-500/10 px-4 py-2 text-xs font-semibold text-amber-200 transition hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:border-stone-700 disabled:bg-stone-900 disabled:text-stone-500"
                    >
                      Apply
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-stone-500">
                  Run the scraper to generate a preview of creates, updates, deletes, and unchanged variants.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function formatDiffValue(value: string | number | boolean | null, field: string) {
  if (value === null) return "-";
  if (field === "price" || field === "pricePer100g") {
    return formatPrice(typeof value === "number" ? value : Number(value), "GBP");
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  return String(value);
}
