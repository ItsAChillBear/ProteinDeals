"use client";

import type { Dispatch, MutableRefObject, ReactNode, SetStateAction } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ScraperDiffTable } from "./ScraperDiffTable";
import { ScraperLiveColumn } from "./ScraperLiveColumn";
import { ScraperSummaryCards } from "./ScraperSummaryCards";
import type { ImportResponse, PreviewResponse, ScraperRecord, ScraperResponse } from "./types";

export function MyproteinScraperPanel() {
  const [limit, setLimit] = useState("2");
  const [isRunning, setIsRunning] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [result, setResult] = useState<ScraperResponse | null>(null);
  const [preview, setPreview] = useState<PreviewResponse["preview"] | null>(null);
  const [importResult, setImportResult] = useState<ImportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progressLines, setProgressLines] = useState<string[]>([]);
  const [liveRecords, setLiveRecords] = useState<ScraperRecord[]>([]);
  const isPausedRef = useRef(false);
  const bufferedLinesRef = useRef<string[]>([]);
  const bufferedRecordsRef = useRef<ScraperRecord[]>([]);

  async function runScraper() {
    setIsRunning(true);
    setError(null);
    setResult(null);
    setPreview(null);
    setImportResult(null);
    setProgressLines([]);
    setLiveRecords([]);
    setIsPaused(false);
    bufferedLinesRef.current = [];
    bufferedRecordsRef.current = [];

    try {
      const scrapeResult = await streamScraperRun(limit, setProgressLines, setLiveRecords, {
        isPausedRef,
        bufferedLinesRef,
        bufferedRecordsRef,
      });
      setResult(scrapeResult);
      await loadPreview(scrapeResult.records ?? []);
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : "Unknown error");
      setResult(null);
      setPreview(null);
    } finally {
      setIsRunning(false);
    }
  }

  async function loadPreview(records: ScraperResponse["records"]) {
    const response = await fetch(`/api/admin/scrapers/myprotein/preview`, {
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

    try {
      const records = result?.records ?? [];
      if (!records.length) {
        throw new Error("Run the scraper first so there are results to apply");
      }

      const response = await fetch(`/api/admin/scrapers/myprotein/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ records, entryIds }),
      });
      const payload = (await response.json()) as ImportResponse;
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "Apply failed");
      }

      setImportResult(payload);
      await loadPreview(records);
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : "Unknown error");
    } finally {
      setIsApplying(false);
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
          <h2 className="text-2xl font-semibold text-stone-50">Myprotein Whey Scraper</h2>
          <p className="max-w-2xl text-sm leading-6 text-stone-300">
            Run the live scraper, preview creates, updates, deletes, and unchanged variants,
            then apply each change individually or commit the full diff.
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
        </div>
      </header>

      <ScraperSummaryCards
        status={isRunning ? "Running" : result ? "Completed" : "Idle"}
        variantCount={result?.count ?? 0}
        logLines={progressLines.length}
        finishedAt={result?.finishedAt ?? null}
        summary={preview?.summary ?? null}
      />

      {error ? <Message tone="error">{error}</Message> : null}
      {importResult?.importResult ? <ImportMessage result={importResult.importResult} /> : null}

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
  limit: string,
  onProgress: Dispatch<SetStateAction<string[]>>,
  onRecord: Dispatch<SetStateAction<ScraperRecord[]>>,
  options?: {
    isPausedRef?: MutableRefObject<boolean>;
    bufferedLinesRef?: MutableRefObject<string[]>;
    bufferedRecordsRef?: MutableRefObject<ScraperRecord[]>;
  }
) {
  const limitValue = Number(limit);
  const params = new URLSearchParams();
  if (Number.isFinite(limitValue) && limitValue > 0) {
    params.set("limit", String(limitValue));
  }

  return new Promise<ScraperResponse>((resolve, reject) => {
    const source = new EventSource(`/api/admin/scrapers/myprotein/stream?${params.toString()}`);
    let lines: string[] = [];

    source.addEventListener("progress", (event) => {
      const payload = JSON.parse((event as MessageEvent<string>).data) as { message: string };
      lines = [...lines, payload.message];
      if (options?.isPausedRef?.current) {
        options.bufferedLinesRef?.current.push(payload.message);
      } else {
        onProgress(lines);
      }
    });

    source.addEventListener("variant", (event) => {
      const payload = JSON.parse((event as MessageEvent<string>).data) as {
        record: ScraperRecord;
      };
      if (options?.isPausedRef?.current) {
        options.bufferedRecordsRef?.current.push(payload.record);
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

function Message(props: { tone: "error" | "success"; children: ReactNode }) {
  const className =
    props.tone === "error"
      ? "border-red-500/40 bg-red-500/10 text-red-200"
      : "border-emerald-500/30 bg-emerald-500/10 text-emerald-100";
  return <div className={`rounded-2xl border px-4 py-4 text-sm ${className}`}>{props.children}</div>;
}
