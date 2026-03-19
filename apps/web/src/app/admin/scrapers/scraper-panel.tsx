"use client";

import { useMemo, useState } from "react";

type ScraperRecord = {
  retailer: string;
  brand: string;
  productName: string;
  variantUrl: string;
  retailerProductId: string | null;
  flavour: string | null;
  sizeLabel: string | null;
  sizeG: number | null;
  servingsLabel: string | null;
  price: number | null;
  originalPrice: number | null;
  wasOnSale: boolean;
  pricePer100g: number | null;
  proteinPer100g: number | null;
  inStock: boolean;
  currency: string | null;
  imageUrl: string | null;
  scrapedAt: string;
};

type ScraperResponse = {
  ok: boolean;
  startedAt: string;
  finishedAt: string;
  count?: number;
  error?: string;
  records?: ScraperRecord[];
};

type ImportResponse = {
  ok: boolean;
  startedAt: string;
  finishedAt: string;
  count?: number;
  error?: string;
  importResult?: {
    imported: number;
    createdProducts: number;
    createdVariants: number;
    createdPriceRecords: number;
  };
};

export function MyproteinScraperPanel() {
  const [limit, setLimit] = useState("2");
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<ScraperResponse | null>(null);
  const [importResult, setImportResult] = useState<ImportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [progressLines, setProgressLines] = useState<string[]>([]);
  const [liveRecords, setLiveRecords] = useState<ScraperRecord[]>([]);

  async function runScraper() {
    setIsRunning(true);
    setError(null);
    setResult(null);
    setProgressLines([]);
    setLiveRecords([]);

    try {
      const limitValue = Number(limit);
      const params = new URLSearchParams();
      if (Number.isFinite(limitValue) && limitValue > 0) {
        params.set("limit", String(limitValue));
      }
      await new Promise<void>((resolve, reject) => {
        const source = new EventSource(
          `/api/admin/scrapers/myprotein/stream?${params.toString()}`
        );

        source.addEventListener("progress", (event) => {
          const payload = JSON.parse((event as MessageEvent<string>).data) as {
            message: string;
          };
          setProgressLines((current) => [...current, payload.message]);
        });

        source.addEventListener("variant", (event) => {
          const payload = JSON.parse((event as MessageEvent<string>).data) as {
            record: ScraperRecord;
          };
          setLiveRecords((current) => [...current, payload.record]);
        });

        source.addEventListener("complete", (event) => {
          const payload = JSON.parse(
            (event as MessageEvent<string>).data
          ) as ScraperResponse;
          setResult(payload);
          source.close();
          resolve();
        });

        source.addEventListener("error", (event) => {
          let message = "Scraper run failed";
          if (event instanceof MessageEvent && event.data) {
            try {
              const payload = JSON.parse(event.data) as { error?: string };
              message = payload.error ?? message;
            } catch {
              message = "Scraper stream failed";
            }
          }
          source.close();
          reject(new Error(message));
        });
      });
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : "Unknown error");
      setResult(null);
    } finally {
      setIsRunning(false);
    }
  }

  async function importScraperResults() {
    setIsImporting(true);
    setError(null);

    try {
      const records = result?.records ?? [];
      if (!records.length) {
        throw new Error("Run the scraper first so there are results to import");
      }

      const response = await fetch(`/api/admin/scrapers/myprotein/import`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ records }),
      });

      const payload = (await response.json()) as ImportResponse;
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "Import failed");
      }

      setImportResult(payload);
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : "Unknown error");
    } finally {
      setIsImporting(false);
    }
  }

  const records = result?.records ?? liveRecords;
  const progressCount = useMemo(() => progressLines.length, [progressLines]);

  return (
    <section className="space-y-6 rounded-[2rem] border border-stone-800 bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.18),_transparent_28%),linear-gradient(180deg,_rgba(28,25,23,0.96),_rgba(12,10,9,0.96))] p-6 shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-stone-50">
            Myprotein Whey Scraper
          </h2>
          <p className="max-w-2xl text-sm leading-6 text-stone-300">
            This runs the live TypeScript scraper against the Myprotein whey
            category and returns the normalized variants directly in the browser.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="space-y-2 text-sm text-stone-300">
            <span className="block text-xs uppercase tracking-[0.25em] text-stone-400">
              Product Limit
            </span>
            <input
              value={limit}
              onChange={(event) => setLimit(event.target.value)}
              inputMode="numeric"
              className="w-28 rounded-xl border border-stone-700 bg-stone-900 px-4 py-3 text-stone-50 outline-none transition focus:border-amber-400"
            />
          </label>

          <button
            type="button"
            onClick={runScraper}
            disabled={isRunning}
            className="rounded-xl bg-amber-400 px-5 py-3 text-sm font-semibold text-stone-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:bg-stone-700 disabled:text-stone-400"
          >
            {isRunning ? "Running..." : "Run Scraper"}
          </button>
          <button
            type="button"
            onClick={importScraperResults}
            disabled={isImporting || !result?.records?.length}
            className="rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-5 py-3 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:border-stone-700 disabled:bg-stone-900 disabled:text-stone-500"
          >
            {isImporting ? "Importing..." : "Import Results"}
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          label="Status"
          value={isRunning ? "Running" : result ? "Completed" : "Idle"}
        />
        <StatCard label="Variants" value={String(result?.count ?? 0)} />
        <StatCard label="Log Lines" value={String(progressCount)} />
        <StatCard
          label="Last Finished"
          value={
            result?.finishedAt
              ? new Date(result.finishedAt).toLocaleTimeString()
              : "Not run yet"
          }
        />
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      {importResult?.importResult ? (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-4 text-sm text-emerald-100">
          Imported {importResult.importResult.imported} rows.
          {" "}
          Created {importResult.importResult.createdProducts} products,
          {" "}
          {importResult.importResult.createdVariants} variants, and
          {" "}
          {importResult.importResult.createdPriceRecords} price records.
        </div>
      ) : null}

      <div className="overflow-hidden rounded-[1.5rem] border border-stone-800 bg-stone-950/70">
        <div className="border-b border-stone-800 px-4 py-3 text-xs uppercase tracking-[0.2em] text-stone-400">
          Live Progress
        </div>
        <div className="max-h-72 overflow-y-auto px-4 py-4 font-mono text-xs leading-6 text-stone-300">
          {progressLines.length ? (
            progressLines.map((line, index) => (
              <div key={`${index}-${line}`}>{line}</div>
            ))
          ) : (
            <div className="text-stone-500">
              Run the scraper to watch progress lines appear here.
            </div>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-[1.5rem] border border-stone-800 bg-stone-950/70">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-stone-900/90 text-xs uppercase tracking-[0.2em] text-stone-400">
              <tr>
                <th className="px-4 py-4 font-medium">Product</th>
                <th className="px-4 py-4 font-medium">Flavour</th>
                <th className="px-4 py-4 font-medium">Size</th>
                <th className="px-4 py-4 font-medium">Servings</th>
                <th className="px-4 py-4 font-medium">Price</th>
                <th className="px-4 py-4 font-medium">Per 100g</th>
                <th className="px-4 py-4 font-medium">Protein</th>
                <th className="px-4 py-4 font-medium">Stock</th>
              </tr>
            </thead>
            <tbody>
              {records.length ? (
                records.map((record) => (
                  <tr
                    key={`${record.retailerProductId ?? record.variantUrl}`}
                    className="border-t border-stone-800 align-top text-stone-200"
                  >
                    <td className="px-4 py-4">
                      <div className="space-y-1">
                        <p className="font-medium text-stone-50">
                          {record.productName}
                        </p>
                        <a
                          href={record.variantUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-amber-300 underline-offset-4 hover:underline"
                        >
                          {record.retailerProductId ?? "Open variant"}
                        </a>
                      </div>
                    </td>
                    <td className="px-4 py-4">{record.flavour ?? "—"}</td>
                    <td className="px-4 py-4">
                      <div>{record.sizeLabel ?? "—"}</div>
                      <div className="text-xs text-stone-500">
                        {record.sizeG ? `${record.sizeG}g` : "Unknown"}
                      </div>
                    </td>
                    <td className="px-4 py-4">{record.servingsLabel ?? "—"}</td>
                    <td className="px-4 py-4">
                      <div className="font-medium text-stone-50">
                        {formatPrice(record.price, record.currency)}
                      </div>
                      {record.originalPrice ? (
                        <div className="text-xs text-stone-500 line-through">
                          {formatPrice(record.originalPrice, record.currency)}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-4">
                      {record.pricePer100g
                        ? formatPrice(record.pricePer100g, record.currency)
                        : "—"}
                    </td>
                    <td className="px-4 py-4">
                      {record.proteinPer100g
                        ? `${record.proteinPer100g}g / 100g`
                        : "—"}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                          record.inStock
                            ? "bg-emerald-500/15 text-emerald-300"
                            : "bg-red-500/15 text-red-300"
                        }`}
                      >
                        {record.inStock ? "In stock" : "Out of stock"}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-12 text-center text-sm text-stone-500"
                  >
                    Run the scraper to load live Myprotein variants.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function StatCard(props: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-stone-800 bg-stone-900/70 px-4 py-4">
      <p className="text-xs uppercase tracking-[0.2em] text-stone-500">
        {props.label}
      </p>
      <p className="mt-2 text-lg font-semibold text-stone-50">{props.value}</p>
    </div>
  );
}

function formatPrice(value: number | null, currency: string | null) {
  if (value === null) {
    return "—";
  }

  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: currency ?? "GBP",
    maximumFractionDigits: 2,
  }).format(value);
}
