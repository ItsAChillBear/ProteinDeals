import { useEffect, useRef } from "react";
import { formatPrice } from "./format";
import type { ScraperRecord } from "./types";

export function ScraperLiveColumn(props: {
  lines: string[];
  records: ScraperRecord[];
}) {
  const progressContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const element = progressContainerRef.current;
    if (!element) return;
    element.scrollTop = element.scrollHeight;
  }, [props.lines]);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
      <div className="overflow-hidden rounded-[1.5rem] border border-stone-800 bg-stone-950/70">
        <div className="border-b border-stone-800 px-4 py-3 text-xs uppercase tracking-[0.2em] text-stone-400">
          Live Progress
        </div>
        <div
          ref={progressContainerRef}
          className="max-h-72 overflow-y-auto px-4 py-4 font-mono text-xs leading-6 text-stone-300"
        >
          {props.lines.length ? (
            props.lines.map((line, index) => <div key={`${index}-${line}`}>{line}</div>)
          ) : (
            <div className="text-stone-500">
              Run the scraper to watch progress lines appear here.
            </div>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-[1.5rem] border border-stone-800 bg-stone-950/70">
        <div className="border-b border-stone-800 px-4 py-3 text-xs uppercase tracking-[0.2em] text-stone-400">
          Live Entries
        </div>
        <div className="max-h-[40rem] overflow-y-auto">
          {props.records.length ? (
            <div className="divide-y divide-stone-800">
              {props.records.map((record) => (
                <div
                  key={`${record.retailerProductId ?? record.variantUrl}`}
                  className="px-4 py-4 text-sm text-stone-200"
                >
                  <div className="flex gap-4">
                    <div className="shrink-0">
                      {record.imageUrl ? (
                        <a
                          href={record.imageUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="block h-16 w-16 overflow-hidden rounded-2xl border border-stone-800 bg-stone-900"
                        >
                          <img
                            src={record.imageUrl}
                            alt={record.productName}
                            loading="lazy"
                            className="h-full w-full object-cover"
                          />
                        </a>
                      ) : (
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-dashed border-stone-800 bg-stone-900 text-xs text-stone-500">
                          No image
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1 space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <p className="font-medium text-stone-50">{record.productName}</p>
                          <a
                            href={record.variantUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-amber-300 underline-offset-4 hover:underline"
                          >
                            {record.retailerProductId ?? "Open variant"}
                          </a>
                        </div>
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                            record.inStock
                              ? "bg-emerald-500/15 text-emerald-300"
                              : "bg-red-500/15 text-red-300"
                          }`}
                        >
                          {record.inStock ? "In stock" : "Out of stock"}
                        </span>
                      </div>

                      <div className="grid gap-2 text-xs text-stone-400 sm:grid-cols-2">
                        <div>Flavour: {record.flavour ?? "-"}</div>
                        <div>Size: {record.sizeLabel ?? "-"}</div>
                        <div>Servings: {record.servingsLabel ?? "-"}</div>
                        <div>
                          Protein: {record.proteinPer100g ? `${record.proteinPer100g}g / 100g` : "-"}
                        </div>
                        <div>Price: {formatPrice(record.price, record.currency)}</div>
                        <div>
                          Per 100g:{" "}
                          {record.pricePer100g
                            ? formatPrice(record.pricePer100g, record.currency)
                            : "-"}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-4 py-12 text-center text-sm text-stone-500">
              Scraped variants will appear here as they stream in.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
