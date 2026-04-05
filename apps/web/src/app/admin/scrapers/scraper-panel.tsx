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

type ScraperCategory = {
  id: string;
  label: string;
  sections: ScraperSection[];
};

type ScraperWebsite = {
  id: string;
  label: string;
  categories: ScraperCategory[];
};

const SCRAPER_WEBSITES: ScraperWebsite[] = [
  {
    id: "myprotein",
    label: "MyProtein",
    categories: [
      {
        id: "protein",
        label: "Protein",
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
      {
        id: "supplements",
        label: "Supplements",
        sections: [
          { id: "creatine", label: "Creatine", url: "https://www.myprotein.com/c/nutrition/creatine/" },
          { id: "creatine-monohydrate", label: "Creatine Monohydrate", url: "https://www.myprotein.com/c/nutrition/creatine/creatine-monohydrate/" },
          { id: "amino-acids", label: "Amino Acids", url: "https://www.myprotein.com/c/nutrition/amino-acids/" },
          { id: "bcaa-supplements", label: "BCAA Supplements", url: "https://www.myprotein.com/c/nutrition/amino-acids/bcaa/" },
          { id: "eaa-supplements", label: "EAA Supplements", url: "https://www.myprotein.com/c/nutrition/amino-acids/eaa/" },
          { id: "glutamine-supplements", label: "Glutamine Supplements", url: "https://www.myprotein.com/c/nutrition/amino-acids/glutamine/" },
          { id: "l-carnitine-supplements", label: "L-Carnitine Supplements", url: "https://www.myprotein.com/c/nutrition/amino-acids/l-carnitine/" },
          { id: "pre-workout", label: "Pre Workout", url: "https://www.myprotein.com/c/nutrition/pre-post-workout/pre-workout/" },
          { id: "caffeine-free-pre-workout", label: "Caffeine Free Pre Workout", url: "https://www.myprotein.com/c/nutrition/caffeine-free-preworkout/" },
          { id: "energy-drinks", label: "Energy Drinks", url: "https://www.myprotein.com/c/nutrition/carbohydrates/energy-drinks/" },
          { id: "weight-management", label: "Weight Management", url: "https://www.myprotein.com/c/nutrition/weight-management/" },
          { id: "weight-loss-supplements", label: "Weight Loss Supplements", url: "https://www.myprotein.com/c/nutrition/weight-management/weight-loss-supplements/" },
          { id: "glp1-nutrition-support", label: "GLP1 Nutrition Support", url: "https://www.myprotein.com/c/glp1-nutrition-support/" },
          { id: "recovery", label: "Recovery", url: "https://www.myprotein.com/c/nutrition/recovery/" },
          { id: "intra-workout", label: "Intra Workout", url: "https://www.myprotein.com/c/nutrition/pre-post-workout/intra-workout/" },
          { id: "post-workout", label: "Post Workout", url: "https://www.myprotein.com/c/nutrition/pre-post-workout/post-workout/" },
          { id: "hydration", label: "Hydration", url: "https://www.myprotein.com/c/performance/electrolyte-supplements/" },
          { id: "energy-and-carbohydrates", label: "Energy And Carbohydrates", url: "https://www.myprotein.com/c/nutrition/carbohydrates/" },
          { id: "energy-supplements", label: "Energy Supplements", url: "https://www.myprotein.com/c/nutrition/carbohydrates/energy-supplements/" },
          { id: "energy-bars", label: "Energy Bars", url: "https://www.myprotein.com/c/nutrition/carbohydrates/energy-bars/" },
          { id: "energy-gels", label: "Energy Gels", url: "https://www.myprotein.com/c/nutrition/carbohydrates/energy-gels/" },
        ],
      },
      {
        id: "vitamins",
        label: "Vitamins",
        sections: [
          { id: "vitamins", label: "Vitamins", url: "https://www.myprotein.com/c/nutrition/vitamins/" },
          { id: "trending-vitamins-and-supplements", label: "Trending Vitamins And Supplements", url: "https://www.myprotein.com/c/nutrition/vitamins-minerals/trending-vitamins-supplements/" },
          { id: "shop-all-vitamins-minerals-and-supplements", label: "Shop All Vitamins Minerals And Supplements", url: "https://www.myprotein.com/c/nutrition/vitamins-minerals/" },
          { id: "vitamin-gummies", label: "Vitamin Gummies", url: "https://www.myprotein.com/c/vitamin-gummies-range/" },
        ],
      },
      {
        id: "food-bars-snacks",
        label: "Food, Bars & Snacks",
        sections: [
          { id: "healthy-food-and-drinks", label: "Healthy Food And Drinks", url: "https://www.myprotein.com/c/nutrition/healthy-food-drinks/" },
          { id: "protein-foods", label: "Protein Foods", url: "https://www.myprotein.com/c/nutrition/healthy-food-drinks/protein-foods/" },
          { id: "protein-bars", label: "Protein Bars", url: "https://www.myprotein.com/c/nutrition/healthy-food-drinks/protein-bars/" },
          { id: "protein-snacks", label: "Protein Snacks", url: "https://www.myprotein.com/c/nutrition/healthy-food-drinks/protein-snacks/" },
        ],
      },
      {
        id: "accessories",
        label: "Accessories",
        sections: [
          { id: "accessories", label: "Accessories", url: "https://www.myprotein.com/c/nutrition/accessories/" },
        ],
      },
    ],
  },
] as const;

export function MyproteinScraperPanel() {
  const [websiteId, setWebsiteId] = useState<ScraperWebsite["id"]>("myprotein");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("protein");
  const [selectedSectionIds, setSelectedSectionIds] = useState<string[]>(
    SCRAPER_WEBSITES[0].categories.flatMap((category) => category.sections.map((section) => section.id))
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
  const [scrapeProgress, setScrapeProgress] = useState<ScrapeProgress | null>(null);
  const [applyProgress, setApplyProgress] = useState<ApplyProgress | null>(null);
  const isPausedRef = useRef(false);
  const bufferedLinesRef = useRef<string[]>([]);
  const bufferedRecordsRef = useRef<ScraperRecord[]>([]);
  const selectedWebsite = SCRAPER_WEBSITES.find((website) => website.id === websiteId) ?? SCRAPER_WEBSITES[0];
  const allSections = selectedWebsite.categories.flatMap((category) => category.sections);
  const selectedCategory =
    selectedWebsite.categories.find((category) => category.id === selectedCategoryId) ??
    selectedWebsite.categories[0];
  const visibleSections = selectedCategory?.sections ?? [];
  const selectedSections = allSections.filter((section) =>
    selectedSectionIds.includes(section.id)
  );
  const includeDeletes = selectedSections.length === allSections.length;

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
    setScrapeProgress(null);
    setApplyProgress(null);
    bufferedLinesRef.current = [];
    bufferedRecordsRef.current = [];

    try {
      const scrapeResult = await streamScraperRun(
        {
          websiteId,
          categoryUrls: selectedSections.map((section) => section.url),
          categoryLabels: selectedSections.map((section) => section.label),
        },
        (linesOrUpdater) => {
          setProgressLines(linesOrUpdater);
          const lines = typeof linesOrUpdater === "function" ? null : linesOrUpdater;
          const lastLine = lines?.[lines.length - 1];
          if (lastLine) setScrapeProgress(parseScrapeProgress(lastLine));
        },
        setLiveRecords,
        {
          isPausedRef,
          bufferedLinesRef,
          bufferedRecordsRef,
        }
      );
      setScrapeProgress(null);
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
    setApplyProgress({ message: "Preparing...", index: 0, total: 0 });

    try {
      const records = result?.records ?? [];
      if (!records.length) {
        throw new Error("Run the scraper first so there are results to apply");
      }

      const params = new URLSearchParams();
      params.set("includeDeletes", includeDeletes ? "true" : "false");
      for (const section of selectedSections) {
        params.append("categoryUrl", section.url);
      }

      const payload = await streamImportRun(
        `/api/admin/scrapers/myprotein/import-stream?${params.toString()}`,
        { records, entryIds },
        (progress) => setApplyProgress(progress)
      );

      if (!payload.ok) throw new Error(payload.error ?? "Apply failed");

      setImportResult(payload);
      await loadPreview(records, includeDeletes);
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : "Unknown error");
    } finally {
      setIsApplying(false);
      setApplyProgress(null);
    }
  }

  async function clearDatabase() {
    const scopeLabel =
      selectedSections.length === allSections.length
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
      setScrapeProgress(null);
      setApplyProgress(null);
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
              setSelectedCategoryId(nextWebsite.categories[0]?.id ?? "");
              setSelectedSectionIds(nextWebsite.categories.flatMap((category) => category.sections.map((section) => section.id)));
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

        <div className="space-y-4 text-sm text-stone-300">
          <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
            <label className="space-y-2 text-sm text-stone-300">
              <span className="block text-xs uppercase tracking-[0.25em] text-stone-400">
                Category
              </span>
              <select
                value={selectedCategoryId}
                onChange={(event) => setSelectedCategoryId(event.target.value)}
                className="w-full rounded-xl border border-stone-700 bg-stone-900 px-4 py-3 text-stone-50 outline-none transition focus:border-amber-400"
              >
                {selectedWebsite.categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <span className="block text-xs uppercase tracking-[0.25em] text-stone-400">
                  Subcategories
                </span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedSectionIds((current) =>
                        current.filter(
                          (sectionId) =>
                            !visibleSections.some((section) => section.id === sectionId)
                        )
                      )
                    }
                    className="text-xs font-semibold text-stone-400 transition hover:text-stone-200"
                  >
                    Deselect category
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedSectionIds((current) => [
                        ...current.filter(
                          (sectionId) =>
                            !visibleSections.some((section) => section.id === sectionId)
                        ),
                        ...visibleSections.map((section) => section.id),
                      ])
                    }
                    className="text-xs font-semibold text-amber-300 transition hover:text-amber-200"
                  >
                    Select category
                  </button>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {visibleSections.map((section) => {
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

          <div className="flex items-center justify-between gap-3">
            <span className="block text-xs uppercase tracking-[0.25em] text-stone-400">
              All Selected Subcategories
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
                onClick={() =>
                  setSelectedSectionIds(
                    selectedWebsite.categories.flatMap((category) =>
                      category.sections.map((section) => section.id)
                    )
                  )
                }
                className="text-xs font-semibold text-amber-300 transition hover:text-amber-200"
              >
                Select all
              </button>
            </div>
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

      {scrapeProgress ? <ScrapeProgressBar progress={scrapeProgress} variantCount={liveRecords.length} /> : null}
      {applyProgress ? <ApplyProgressBar progress={applyProgress} /> : null}

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

// ─── Progress types ──────────────────────────────────────────────────────────

type ScrapeProgress = {
  phase: "discovering" | "scraping" | "finishing";
  category: string | null;
  productIndex: number;
  productTotal: number;
  message: string;
};

type ApplyProgress = {
  message: string;
  index: number;
  total: number;
};

// ─── Progress parsers ────────────────────────────────────────────────────────

function parseScrapeProgress(message: string): ScrapeProgress {
  // "Loading product 5/120: https://..."
  const productMatch = message.match(/Loading product (\d+)\/(\d+)/);
  if (productMatch) {
    return {
      phase: "scraping",
      category: null,
      productIndex: Number(productMatch[1]),
      productTotal: Number(productMatch[2]),
      message,
    };
  }

  // "Fetching category Whey Protein page 2: https://..."
  const categoryMatch = message.match(/Fetching category (.+?) page \d+/);
  if (categoryMatch) {
    return {
      phase: "discovering",
      category: categoryMatch[1],
      productIndex: 0,
      productTotal: 0,
      message,
    };
  }

  // "Discovered N unique products across M sections..."
  const discoveredMatch = message.match(/Discovered (\d+) unique products.*scraping (\d+)/);
  if (discoveredMatch) {
    return {
      phase: "scraping",
      category: null,
      productIndex: 0,
      productTotal: Number(discoveredMatch[2]),
      message,
    };
  }

  return { phase: "finishing", category: null, productIndex: 0, productTotal: 0, message };
}

// ─── Streaming import helper ─────────────────────────────────────────────────

async function streamImportRun(
  url: string,
  body: object,
  onProgress: (progress: ApplyProgress) => void
): Promise<ImportResponse> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.body) throw new Error("No response body");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let result: ImportResponse | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";

    for (const part of parts) {
      const eventMatch = part.match(/^event: (\w+)/m);
      const dataMatch = part.match(/^data: (.+)$/m);
      if (!eventMatch || !dataMatch) continue;

      const event = eventMatch[1];
      try {
        const payload = JSON.parse(dataMatch[1]);
        if (event === "progress") {
          onProgress(payload as ApplyProgress);
        } else if (event === "complete") {
          result = payload as ImportResponse;
        } else if (event === "error") {
          throw new Error((payload as { error?: string }).error ?? "Import failed");
        }
      } catch (parseError) {
        if (parseError instanceof SyntaxError) continue;
        throw parseError;
      }
    }
  }

  if (!result) throw new Error("Stream ended without completion");
  return result;
}

// ─── Progress bar components ─────────────────────────────────────────────────

function ScrapeProgressBar({ progress, variantCount }: { progress: ScrapeProgress; variantCount: number }) {
  const pct =
    progress.phase === "scraping" && progress.productTotal > 0
      ? Math.round((progress.productIndex / progress.productTotal) * 100)
      : null;

  return (
    <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-0.5">
          <div className="text-xs font-semibold uppercase tracking-widest text-amber-400">
            {progress.phase === "discovering" ? "Discovering Products" : progress.phase === "scraping" ? "Scraping Products" : "Finishing"}
          </div>
          {progress.phase === "discovering" && progress.category ? (
            <div className="text-sm text-stone-300">
              Category: <span className="font-medium text-amber-300">{progress.category}</span>
            </div>
          ) : progress.phase === "scraping" && progress.productTotal > 0 ? (
            <div className="text-sm text-stone-300">
              Product <span className="font-medium text-amber-300">{progress.productIndex}</span> of <span className="font-medium">{progress.productTotal}</span>
              {variantCount > 0 ? <span className="ml-2 text-stone-400">· {variantCount} variants scraped</span> : null}
            </div>
          ) : (
            <div className="text-sm text-stone-400 truncate max-w-xl">{progress.message}</div>
          )}
        </div>
        {pct !== null ? (
          <div className="text-2xl font-bold tabular-nums text-amber-400">{pct}%</div>
        ) : null}
      </div>
      {pct !== null ? (
        <div className="h-2 w-full rounded-full bg-stone-800 overflow-hidden">
          <div
            className="h-full rounded-full bg-amber-400 transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      ) : (
        <div className="h-2 w-full rounded-full bg-stone-800 overflow-hidden">
          <div className="h-full w-full rounded-full bg-amber-400/30 animate-pulse" />
        </div>
      )}
    </div>
  );
}

function ApplyProgressBar({ progress }: { progress: ApplyProgress }) {
  const pct =
    progress.total > 0 ? Math.round((progress.index / progress.total) * 100) : null;

  return (
    <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-0.5">
          <div className="text-xs font-semibold uppercase tracking-widest text-emerald-400">
            Applying Changes
          </div>
          <div className="text-sm text-stone-300 truncate max-w-xl">{progress.message}</div>
          {progress.total > 0 ? (
            <div className="text-xs text-stone-400">
              {progress.index} of {progress.total} entries
            </div>
          ) : null}
        </div>
        {pct !== null ? (
          <div className="text-2xl font-bold tabular-nums text-emerald-400">{pct}%</div>
        ) : null}
      </div>
      {pct !== null ? (
        <div className="h-2 w-full rounded-full bg-stone-800 overflow-hidden">
          <div
            className="h-full rounded-full bg-emerald-400 transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      ) : (
        <div className="h-2 w-full rounded-full bg-stone-800 overflow-hidden">
          <div className="h-full w-full rounded-full bg-emerald-400/30 animate-pulse" />
        </div>
      )}
    </div>
  );
}
