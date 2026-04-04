"use client";

import type { Dispatch, MutableRefObject, ReactNode, SetStateAction } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ScraperDiffTable } from "./ScraperDiffTable";
import { ScraperLiveColumn } from "./ScraperLiveColumn";
import { ScraperSummaryCards } from "./ScraperSummaryCards";
import type {
  ClearResponse,
  ImportResponse,
  PreviewResponse,
  ScraperRecord,
  ScraperResponse,
} from "./types";

type ScraperSection = {
  id: string;
  label: string;
  url: string;
  disabled?: boolean;
};

type ScraperWebsite = {
  id: string;
  label: string;
  sections: ScraperSection[];
};

const SCRAPER_WEBSITES: ScraperWebsite[] = [
  {
    id: "myprotein",
    label: "MyProtein",
    sections: [
      { id: "whey-protein", label: "Whey Protein", url: "https://www.myprotein.com/c/nutrition/protein/whey-protein/" },
      { id: "clear-protein-drinks", label: "Clear Protein Drinks", url: "https://www.myprotein.com/c/clear-protein/" },
      { id: "protein-isolate", label: "Protein Isolate", url: "https://www.myprotein.com/c/nutrition/protein/protein-isolate/" },
      { id: "casein-protein", label: "Casein Protein", url: "https://www.myprotein.com/c/nutrition/protein/milk-protein/" },
      { id: "protein-blends", label: "Protein Blends", url: "https://www.myprotein.com/c/nutrition/protein/blends/" },
      { id: "protein-smoothies", label: "Protein Smoothies", url: "https://www.myprotein.com/p/sports-nutrition/breakfast-smoothie/13251950/" },
      { id: "protein-samples", label: "Protein Samples", url: "https://www.myprotein.com/c/nutrition/healthy-food-drinks/protein-foods/protein-samples/" },
      { id: "collagen-protein", label: "Collagen Protein", url: "https://www.myprotein.com/c/nutrition/collagen/" },
      { id: "vegan-shakes", label: "Vegan Shakes", url: "https://www.myprotein.com/c/nutrition/protein/vegan-protein/" },
      { id: "protein-diet", label: "Diet Protein", url: "https://www.myprotein.com/c/nutrition/protein/diet/" },
      { id: "weight-gainers", label: "Weight Gainers", url: "https://www.myprotein.com/c/nutrition/weight-management/weight-gainers/" },
      { id: "meal-replacement", label: "Meal Replacement", url: "https://www.myprotein.com/c/nutrition/healthy-food-drinks/meal-replacement/" },
    ],
  },
] as const;

export function MyproteinScraperPanel() {
  const [websiteId, setWebsiteId] = useState<ScraperWebsite["id"]>("myprotein");
  const [selectedSectionIds, setSelectedSectionIds] = useState<string[]>(
    SCRAPER_WEBSITES[0].sections.map((section) => section.id)
  );
  const [isRunning, setIsRunning] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [result, setResult] = useState<ScraperResponse | null>(null);
  const [preview, setPreview] = useState<PreviewResponse["preview"] | null>(null);
  const [importResult, setImportResult] = useState<ImportResponse | null>(null);
  const [clearResult, setClearResult] = useState<ClearResponse["clearResult"] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progressLines, setProgressLines] = useState<string[]>([]);
  const [liveRecords, setLiveRecords] = useState<ScraperRecord[]>([]);
  const isPausedRef = useRef(false);
  const bufferedLinesRef = useRef<string[]>([]);
  const bufferedRecordsRef = useRef<ScraperRecord[]>([]);
  const selectedWebsite = SCRAPER_WEBSITES.find((website) => website.id === websiteId) ?? SCRAPER_WEBSITES[0];
  const selectedSections = selectedWebsite.sections.filter((section) =>
    selectedSectionIds.includes(section.id)
  );
  const includeDeletes = selectedSections.length === selectedWebsite.sections.length;

  async function runScraper() {
    setIsRunning(true);
    setError(null);
    setResult(null);
    setPreview(null);
    setImportResult(null);
    setClearResult(null);
    setProgressLines([]);
    setLiveRecords([]);
    setIsPaused(false);
    bufferedLinesRef.current = [];
    bufferedRecordsRef.current = [];

    try {
      const scrapeResult = await streamScraperRun(
        {
          websiteId,
          categoryUrls: selectedSections.map((section) => section.url),
          categoryLabels: selectedSections.map((section) => section.label),
        },
        setProgressLines,
        setLiveRecords,
        {
          isPausedRef,
          bufferedLinesRef,
          bufferedRecordsRef,
        }
      );
      setResult(scrapeResult);
      await loadPreview(scrapeResult.records ?? [], includeDeletes);
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : "Unknown error");
      setResult(null);
      setPreview(null);
    } finally {
      setIsRunning(false);
    }
  }

  async function loadPreview(records: ScraperResponse["records"], shouldIncludeDeletes = includeDeletes) {
    const params = new URLSearchParams();
    params.set("includeDeletes", shouldIncludeDeletes ? "true" : "false");
    for (const section of selectedSections) {
      params.append("categoryUrl", section.url);
    }
    const response = await fetch(`/api/admin/scrapers/myprotein/preview?${params.toString()}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ records }),
    });
    const payload = (await response.json()) as PreviewResponse;
    if (!response.ok || !payload.ok || !payload.preview) {
      throw new Error(payload.error ?? "Failed to generate preview");
    }
    setPreview(payload.preview);
  }

  async function applyChanges(entryIds: string[]) {
    setIsApplying(true);
    setError(null);
    setClearResult(null);

    try {
      const records = result?.records ?? [];
      if (!records.length) {
        throw new Error("Run the scraper first so there are results to apply");
      }

      const response = await fetch(
        `/api/admin/scrapers/myprotein/import?${(() => {
          const params = new URLSearchParams();
          params.set("includeDeletes", includeDeletes ? "true" : "false");
          for (const section of selectedSections) {
            params.append("categoryUrl", section.url);
          }
          return params.toString();
        })()}`,
        {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ records, entryIds }),
        }
      );
      const payload = (await response.json()) as ImportResponse;
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "Apply failed");
      }

      setImportResult(payload);
      await loadPreview(records, includeDeletes);
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : "Unknown error");
    } finally {
      setIsApplying(false);
    }
  }

  async function clearDatabase() {
    const scopeLabel =
      selectedSections.length === selectedWebsite.sections.length
        ? `${selectedWebsite.label} data`
        : `${selectedWebsite.label} data for ${selectedSections.length} selected section${selectedSections.length === 1 ? "" : "s"}`;
    const confirmed = window.confirm(
      `Clear ${scopeLabel} from the database? This deletes matching variants, price history, alerts, and any orphaned products.`
    );
    if (!confirmed) return;

    setIsClearing(true);
    setError(null);
    setImportResult(null);

    try {
      const params = new URLSearchParams();
      for (const section of selectedSections) {
        params.append("categoryUrl", section.url);
      }
      const response = await fetch(`/api/admin/scrapers/myprotein/clear?${params.toString()}`, {
        method: "POST",
      });
      const payload = (await response.json()) as ClearResponse;
      if (!response.ok || !payload.ok || !payload.clearResult) {
        throw new Error(payload.error ?? "Clear failed");
      }

      setClearResult(payload.clearResult);
      setResult(null);
      setPreview(null);
      setLiveRecords([]);
      setProgressLines([]);
      bufferedLinesRef.current = [];
      bufferedRecordsRef.current = [];
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : "Unknown error");
    } finally {
      setIsClearing(false);
    }
  }

  const actionableEntries = useMemo(
    () => preview?.entries.filter((entry) => entry.action !== "unchanged") ?? [],
    [preview]
  );

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    if (isPaused) return;
    if (bufferedLinesRef.current.length) {
      setProgressLines((current) => [...current, ...bufferedLinesRef.current]);
      bufferedLinesRef.current = [];
    }
    if (bufferedRecordsRef.current.length) {
      setLiveRecords((current) => [...current, ...bufferedRecordsRef.current]);
      bufferedRecordsRef.current = [];
    }
  }, [isPaused]);

  return (
    <section className="space-y-6 rounded-[2rem] border border-stone-800 bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.18),_transparent_28%),linear-gradient(180deg,_rgba(28,25,23,0.96),_rgba(12,10,9,0.96))] p-6 shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-stone-50">Retailer Scraper</h2>
          <p className="max-w-2xl text-sm leading-6 text-stone-300">
            Select a website and the sections to crawl, then run the live scraper and review the import diff before applying changes.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <button
            type="button"
            onClick={runScraper}
            disabled={isRunning || selectedSections.length === 0}
            className="rounded-xl bg-amber-400 px-5 py-3 text-sm font-semibold text-stone-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:bg-stone-700 disabled:text-stone-400"
          >
            {isRunning ? "Running..." : "Run Scraper"}
          </button>
          <button
            type="button"
            onClick={() => setIsPaused((current) => !current)}
            disabled={!isRunning}
            className="rounded-xl border border-sky-400/40 bg-sky-500/10 px-5 py-3 text-sm font-semibold text-sky-200 transition hover:bg-sky-500/20 disabled:cursor-not-allowed disabled:border-stone-700 disabled:bg-stone-900 disabled:text-stone-500"
          >
            {isPaused ? "Play" : "Pause"}
          </button>
          <button
            type="button"
            onClick={() => applyChanges(actionableEntries.map((entry) => entry.id))}
            disabled={isApplying || actionableEntries.length === 0}
            className="rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-5 py-3 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:border-stone-700 disabled:bg-stone-900 disabled:text-stone-500"
          >
            {isApplying ? "Applying..." : "Apply All Changes"}
          </button>
          <button
            type="button"
            onClick={clearDatabase}
            disabled={isClearing || isRunning || isApplying}
            className="rounded-xl border border-red-400/40 bg-red-500/10 px-5 py-3 text-sm font-semibold text-red-200 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:border-stone-700 disabled:bg-stone-900 disabled:text-stone-500"
          >
            {isClearing ? "Clearing..." : "Clear Database"}
          </button>
        </div>
      </header>

      <div className="grid gap-4 rounded-3xl border border-stone-800/80 bg-stone-950/40 p-5 lg:grid-cols-[220px_minmax(0,1fr)]">
        <label className="space-y-2 text-sm text-stone-300">
          <span className="block text-xs uppercase tracking-[0.25em] text-stone-400">
            Website
          </span>
          <select
            value={websiteId}
            onChange={(event) => {
              const nextWebsiteId = event.target.value as ScraperWebsite["id"];
              setWebsiteId(nextWebsiteId);
              const nextWebsite =
                SCRAPER_WEBSITES.find((website) => website.id === nextWebsiteId) ?? SCRAPER_WEBSITES[0];
              setSelectedSectionIds(nextWebsite.sections.map((section) => section.id));
            }}
            className="w-full rounded-xl border border-stone-700 bg-stone-900 px-4 py-3 text-stone-50 outline-none transition focus:border-amber-400"
          >
            {SCRAPER_WEBSITES.map((website) => (
              <option key={website.id} value={website.id}>
                {website.label}
              </option>
            ))}
          </select>
        </label>

        <div className="space-y-2 text-sm text-stone-300">
          <div className="flex items-center justify-between gap-3">
            <span className="block text-xs uppercase tracking-[0.25em] text-stone-400">
              Sections
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSelectedSectionIds([])}
                className="text-xs font-semibold text-stone-400 transition hover:text-stone-200"
              >
                Deselect all
              </button>
              <button
                type="button"
                onClick={() => setSelectedSectionIds(selectedWebsite.sections.map((section) => section.id))}
                className="text-xs font-semibold text-amber-300 transition hover:text-amber-200"
              >
                Select all
              </button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {selectedWebsite.sections.map((section) => {
              const checked = selectedSectionIds.includes(section.id);
              return (
                <label
                  key={section.id}
                  className="flex items-start gap-3 rounded-2xl border border-stone-800 bg-stone-900/80 px-4 py-3"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(event) => {
                      setSelectedSectionIds((current) =>
                        event.target.checked
                          ? [...current, section.id]
                          : current.filter((value) => value !== section.id)
                      );
                    }}
                    className="mt-1 h-4 w-4 rounded border-stone-600 bg-stone-950 text-amber-400"
                  />
                  <span className="space-y-1">
                    <span className="block font-medium text-stone-100">{section.label}</span>
                    <span className="block text-xs leading-5 text-stone-400">
                      {section.url}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      </div>

      <ScraperSummaryCards
        status={isRunning ? "Running" : result ? "Completed" : "Idle"}
        variantCount={result?.count ?? 0}
        logLines={progressLines.length}
        finishedAt={result?.finishedAt ?? null}
        summary={preview?.summary ?? null}
      />

      {error ? <Message tone="error">{error}</Message> : null}
      {importResult?.importResult ? <ImportMessage result={importResult.importResult} /> : null}
      {clearResult ? <ClearMessage result={clearResult} /> : null}

      <ScraperLiveColumn lines={progressLines} records={liveRecords} />
      <ScraperDiffTable
        entries={preview?.entries ?? []}
        isApplying={isApplying}
        onApplyEntry={(entryId) => applyChanges([entryId])}
      />
    </section>
  );
}

async function streamScraperRun(
  options: { websiteId: string; categoryUrls: string[]; categoryLabels: string[] },
  onProgress: Dispatch<SetStateAction<string[]>>,
  onRecord: Dispatch<SetStateAction<ScraperRecord[]>>,
  streamOptions?: {
    isPausedRef?: MutableRefObject<boolean>;
    bufferedLinesRef?: MutableRefObject<string[]>;
    bufferedRecordsRef?: MutableRefObject<ScraperRecord[]>;
  }
) {
  const params = new URLSearchParams();
  params.set("website", options.websiteId);
  for (const [index, categoryUrl] of options.categoryUrls.entries()) {
    params.append("categoryUrl", categoryUrl);
    params.append("categoryLabel", options.categoryLabels[index] ?? "");
  }

  return new Promise<ScraperResponse>((resolve, reject) => {
    const source = new EventSource(`/api/admin/scrapers/myprotein/stream?${params.toString()}`);
    let lines: string[] = [];

    source.addEventListener("progress", (event) => {
      const payload = JSON.parse((event as MessageEvent<string>).data) as { message: string };
      lines = [...lines, payload.message];
      if (streamOptions?.isPausedRef?.current) {
        streamOptions.bufferedLinesRef?.current.push(payload.message);
      } else {
        onProgress(lines);
      }
    });

    source.addEventListener("variant", (event) => {
      const payload = JSON.parse((event as MessageEvent<string>).data) as {
        record: ScraperRecord;
      };
      if (streamOptions?.isPausedRef?.current) {
        streamOptions.bufferedRecordsRef?.current.push(payload.record);
      } else {
        onRecord((current) => [...current, payload.record]);
      }
    });

    source.addEventListener("complete", (event) => {
      resolve(JSON.parse((event as MessageEvent<string>).data) as ScraperResponse);
      source.close();
    });

    source.addEventListener("error", (event) => {
      let message = "Scraper run failed";
      if (event instanceof MessageEvent && event.data) {
        try {
          const payload = JSON.parse(event.data) as { error?: string };
          message = payload.error ?? message;
        } catch {}
      }
      source.close();
      reject(new Error(message));
    });
  });
}

function ImportMessage(props: { result: NonNullable<ImportResponse["importResult"]> }) {
  return (
    <Message tone="success">
      Applied {props.result.imported} scraped entries. Created {props.result.createdProducts}{" "}
      products and {props.result.createdVariants} variants, updated {props.result.updatedProducts}{" "}
      products and {props.result.updatedVariants} variants, deleted {props.result.deletedVariants}{" "}
      variants, and wrote {props.result.createdPriceRecords} price records.
    </Message>
  );
}

function ClearMessage(props: { result: NonNullable<ClearResponse["clearResult"]> }) {
  return (
    <Message tone="success">
      Cleared {props.result.deletedVariants} Myprotein variants, {props.result.deletedPriceRecords}{" "}
      price records, {props.result.deletedPriceAlerts} alerts, and{" "}
      {props.result.deletedProducts} orphaned products.
    </Message>
  );
}

function Message(props: { tone: "error" | "success"; children: ReactNode }) {
  const className =
    props.tone === "error"
      ? "border-red-500/40 bg-red-500/10 text-red-200"
      : "border-emerald-500/30 bg-emerald-500/10 text-emerald-100";
  return <div className={`rounded-2xl border px-4 py-4 text-sm ${className}`}>{props.children}</div>;
}
