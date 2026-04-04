"use client";

import type { Dispatch, SetStateAction } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

type VoucherCodesRecord = {
  id: number;
  type: string | null;
  title: string | null;
  description: string | null;
  code: string | null;
  codePartial: string | null;
  ctaText: string | null;
  ctaSubtext: string | null;
  lastUsed: string | null;
  expiresAt: string | null;
  isExclusive: boolean;
  worksWithSale: boolean;
  isHighlighted: boolean;
  termsAvailable: boolean;
  merchantUrl: string | null;
  sourceUrl: string;
  scrapedAt: string;
};

type VoucherCodesResponse = {
  ok: boolean;
  startedAt: string;
  finishedAt: string;
  count?: number;
  error?: string;
  records?: VoucherCodesRecord[];
};

type VoucherCodeTestResult = {
  id: number;
  code: string | null;
  title: string | null;
  status:
    | "working"
    | "not_applicable"
    | "invalid"
    | "expired"
    | "already_used"
    | "better_offer"
    | "error";
  isWorking: boolean;
  messageType: string | null;
  message: string | null;
  quantityTested: number;
  basketSubtotal: number | null;
  basketTotalAfterCode: number | null;
  discountAmount: number | null;
  testedAt: string;
};

type VoucherCodesTestResponse = {
  ok: boolean;
  startedAt: string;
  finishedAt: string;
  count?: number;
  error?: string;
  testResults?: VoucherCodeTestResult[];
};

type VoucherCodesImportResponse = {
  ok: boolean;
  startedAt: string;
  finishedAt: string;
  error?: string;
  importResult?: {
    imported: number;
    created: number;
    updated: number;
    skipped: number;
  };
};

export function VoucherCodesScraperPanel() {
  const [isRunning, setIsRunning] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lines, setLines] = useState<string[]>([]);
  const [records, setRecords] = useState<VoucherCodesRecord[]>([]);
  const [result, setResult] = useState<VoucherCodesResponse | null>(null);
  const [testResults, setTestResults] = useState<VoucherCodeTestResult[]>([]);
  const [importResult, setImportResult] = useState<VoucherCodesImportResponse["importResult"] | null>(
    null
  );
  const progressContainerRef = useRef<HTMLDivElement | null>(null);
  const testResultsById = useMemo(
    () =>
      Object.fromEntries(testResults.map((testResult) => [testResult.id, testResult])) as Record<
        number,
        VoucherCodeTestResult
      >,
    [testResults]
  );

  async function runScraper() {
    setIsRunning(true);
    setError(null);
    setLines([]);
    setRecords([]);
    setResult(null);
    setTestResults([]);
    setImportResult(null);

    try {
      const payload = await streamVoucherScraperRun(setLines, setRecords);
      setResult(payload);
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : "Unknown error");
    } finally {
      setIsRunning(false);
    }
  }

  async function testCodes() {
    setIsTesting(true);
    setError(null);

    try {
      if (!records.length) {
        throw new Error("Run the voucher scraper first so there are codes to test");
      }

      const response = await fetch("/api/admin/scrapers/vouchers/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ records }),
      });

      const payload = (await response.json()) as VoucherCodesTestResponse;
      if (!response.ok || !payload.ok || !payload.testResults) {
        throw new Error(payload.error ?? "Voucher code test failed");
      }

      setTestResults(payload.testResults);
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : "Unknown error");
    } finally {
      setIsTesting(false);
    }
  }

  async function importWorkingCodes() {
    setIsImporting(true);
    setError(null);

    try {
      if (!records.length || !testResults.length) {
        throw new Error("Run and test the voucher codes before importing them");
      }

      const response = await fetch("/api/admin/scrapers/vouchers/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ records, testResults }),
      });

      const payload = (await response.json()) as VoucherCodesImportResponse;
      if (!response.ok || !payload.ok || !payload.importResult) {
        throw new Error(payload.error ?? "Voucher code import failed");
      }

      setImportResult(payload.importResult);
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : "Unknown error");
    } finally {
      setIsImporting(false);
    }
  }

  useEffect(() => {
    const element = progressContainerRef.current;
    if (!element) return;
    element.scrollTop = element.scrollHeight;
  }, [lines]);

  return (
    <section className="space-y-6 rounded-[2rem] border border-stone-800 bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.18),_transparent_28%),linear-gradient(180deg,_rgba(28,25,23,0.96),_rgba(12,10,9,0.96))] p-6 shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-stone-50">
            VoucherCodes Myprotein Scraper
          </h2>
          <p className="max-w-2xl text-sm leading-6 text-stone-300">
            Pull live Myprotein voucher codes from VoucherCodes and inspect the current
            codes, flags, and outbound offer links.
          </p>
        </div>

        <button
          type="button"
          onClick={runScraper}
          disabled={isRunning}
          className="rounded-xl bg-sky-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:bg-stone-700 disabled:text-stone-400"
        >
          {isRunning ? "Running..." : "Run Voucher Scraper"}
        </button>
        <button
          type="button"
          onClick={testCodes}
          disabled={isTesting || isRunning || records.length === 0}
          className="rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-5 py-3 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:border-stone-700 disabled:bg-stone-900 disabled:text-stone-500"
        >
          {isTesting ? "Testing..." : "Test Codes"}
        </button>
        <button
          type="button"
          onClick={importWorkingCodes}
          disabled={
            isImporting ||
            isRunning ||
            isTesting ||
            !testResults.some(
              (resultItem) =>
                resultItem.status === "working" || resultItem.status === "better_offer"
            )
          }
          className="rounded-xl border border-amber-400/40 bg-amber-500/10 px-5 py-3 text-sm font-semibold text-amber-200 transition hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:border-stone-700 disabled:bg-stone-900 disabled:text-stone-500"
        >
          {isImporting ? "Importing..." : "Import Working Codes"}
        </button>
      </header>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Status" value={isRunning ? "Running" : result ? "Completed" : "Idle"} />
        <StatCard label="Codes" value={String(result?.count ?? records.length)} />
        <StatCard label="Log Lines" value={String(lines.length)} />
        <StatCard
          label="Last Finished"
          value={result?.finishedAt ? new Date(result.finishedAt).toLocaleTimeString() : "Not run yet"}
        />
      </div>

      {testResults.length ? (
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard
            label="Working"
            value={String(testResults.filter((resultItem) => resultItem.status === "working").length)}
          />
          <StatCard
            label="Better Offer"
            value={String(
              testResults.filter((resultItem) => resultItem.status === "better_offer").length
            )}
          />
          <StatCard
            label="Not Applicable"
            value={String(
              testResults.filter((resultItem) => resultItem.status === "not_applicable").length
            )}
          />
          <StatCard
            label="Failed"
            value={String(
              testResults.filter(
                (resultItem) =>
                  resultItem.status === "invalid" ||
                  resultItem.status === "expired" ||
                  resultItem.status === "already_used" ||
                  resultItem.status === "error"
              ).length
            )}
          />
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-4 text-sm text-red-200">
          {error}
        </div>
      ) : null}
      {importResult ? (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-4 text-sm text-emerald-100">
          Imported {importResult.imported} working codes. Created {importResult.created},
          updated {importResult.updated}, skipped {importResult.skipped}.
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.4fr)]">
        <div className="overflow-hidden rounded-[1.5rem] border border-stone-800 bg-stone-950/70">
          <div className="border-b border-stone-800 px-4 py-3 text-xs uppercase tracking-[0.2em] text-stone-400">
            Live Progress
          </div>
          <div
            ref={progressContainerRef}
            className="max-h-72 overflow-y-auto px-4 py-4 font-mono text-xs leading-6 text-stone-300"
          >
            {lines.length ? (
              lines.map((line, index) => <div key={`${index}-${line}`}>{line}</div>)
            ) : (
              <div className="text-stone-500">Run the scraper to watch progress lines appear here.</div>
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-[1.5rem] border border-stone-800 bg-stone-950/70">
          <div className="border-b border-stone-800 px-4 py-3 text-xs uppercase tracking-[0.2em] text-stone-400">
            Live Voucher Codes
          </div>
          <div className="max-h-[40rem] overflow-y-auto">
            {records.length ? (
              <div className="divide-y divide-stone-800">
                {records.map((record) => (
                  <div key={record.id} className="space-y-3 px-4 py-4 text-sm text-stone-200">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <p className="font-medium text-stone-50">{record.title ?? "Untitled code"}</p>
                        <div className="flex flex-wrap gap-2 text-xs">
                          <Badge tone={record.isHighlighted ? "amber" : "stone"}>
                            {record.isHighlighted ? "Highlighted" : "Standard"}
                          </Badge>
                          <Badge tone={record.isExclusive ? "emerald" : "stone"}>
                            {record.isExclusive ? "Exclusive" : "Non-exclusive"}
                          </Badge>
                          <Badge tone={record.worksWithSale ? "sky" : "stone"}>
                            {record.worksWithSale ? "Works with sale" : "No sale flag"}
                          </Badge>
                          {testResultsById[record.id] ? (
                            <Badge tone={toneForTestStatus(testResultsById[record.id].status)}>
                              {labelForTestStatus(testResultsById[record.id].status)}
                            </Badge>
                          ) : null}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-sky-400/30 bg-sky-500/10 px-4 py-3 text-right">
                        <div className="text-xs uppercase tracking-[0.2em] text-sky-200">Code</div>
                        <div className="mt-1 font-mono text-lg font-semibold text-sky-100">
                          {record.code ?? record.codePartial ?? "-"}
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-2 text-xs text-stone-400 sm:grid-cols-2">
                      <div>Last used: {record.lastUsed ?? "-"}</div>
                      <div>Expires: {record.expiresAt ? new Date(record.expiresAt).toLocaleString() : "-"}</div>
                      <div>Terms button: {record.termsAvailable ? "Yes" : "No"}</div>
                      <div>CTA: {record.ctaText ?? "-"}</div>
                      {testResultsById[record.id] ? (
                        <>
                          <div>
                            Quantity tested: {testResultsById[record.id].quantityTested}
                          </div>
                          <div>
                            Discount:
                            {" "}
                            {formatCurrency(testResultsById[record.id].discountAmount)}
                          </div>
                          <div>
                            Basket total:
                            {" "}
                            {formatCurrency(testResultsById[record.id].basketTotalAfterCode)}
                          </div>
                          <div>
                            Test message:
                            {" "}
                            {testResultsById[record.id].messageType ?? "-"}
                          </div>
                        </>
                      ) : null}
                    </div>

                    {record.description ? <p className="text-xs text-stone-300">{record.description}</p> : null}
                    {testResultsById[record.id]?.message ? (
                      <p className="text-xs text-stone-400">{testResultsById[record.id].message}</p>
                    ) : null}

                    <div className="flex flex-wrap gap-4 text-xs">
                      {record.merchantUrl ? (
                        <a
                          href={record.merchantUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sky-300 underline-offset-4 hover:underline"
                        >
                          Open merchant link
                        </a>
                      ) : null}
                      <a
                        href={record.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-stone-300 underline-offset-4 hover:underline"
                      >
                        Open source page
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-4 py-12 text-center text-sm text-stone-500">
                Voucher codes will appear here after the scraper runs.
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

async function streamVoucherScraperRun(
  onProgress: Dispatch<SetStateAction<string[]>>,
  onRecord: Dispatch<SetStateAction<VoucherCodesRecord[]>>
) {
  return new Promise<VoucherCodesResponse>((resolve, reject) => {
    const source = new EventSource("/api/admin/scrapers/vouchers/stream");
    let lines: string[] = [];

    source.addEventListener("progress", (event) => {
      const payload = JSON.parse((event as MessageEvent<string>).data) as { message: string };
      lines = [...lines, payload.message];
      onProgress(lines);
    });

    source.addEventListener("record", (event) => {
      const payload = JSON.parse((event as MessageEvent<string>).data) as {
        record: VoucherCodesRecord;
      };
      onRecord((current) => [...current, payload.record]);
    });

    source.addEventListener("complete", (event) => {
      resolve(JSON.parse((event as MessageEvent<string>).data) as VoucherCodesResponse);
      source.close();
    });

    source.addEventListener("error", (event) => {
      let message = "Voucher scraper run failed";
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

function StatCard(props: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-stone-800 bg-stone-900/70 px-4 py-4">
      <p className="text-xs uppercase tracking-[0.2em] text-stone-500">{props.label}</p>
      <p className="mt-2 text-lg font-semibold text-stone-50">{props.value}</p>
    </div>
  );
}

function Badge(props: { tone: "amber" | "emerald" | "sky" | "stone"; children: string }) {
  const className =
    props.tone === "amber"
      ? "bg-amber-500/15 text-amber-300"
      : props.tone === "emerald"
        ? "bg-emerald-500/15 text-emerald-300"
        : props.tone === "sky"
          ? "bg-sky-500/15 text-sky-300"
          : "bg-stone-800 text-stone-300";

  return <span className={`inline-flex rounded-full px-3 py-1 ${className}`}>{props.children}</span>;
}

function formatCurrency(value: number | null) {
  if (value === null) return "-";
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 2,
  }).format(value);
}

function toneForTestStatus(status: VoucherCodeTestResult["status"]): "amber" | "emerald" | "sky" | "stone" {
  switch (status) {
    case "working":
      return "emerald";
    case "better_offer":
      return "sky";
    case "not_applicable":
      return "amber";
    default:
      return "stone";
  }
}

function labelForTestStatus(status: VoucherCodeTestResult["status"]) {
  switch (status) {
    case "working":
      return "Working";
    case "better_offer":
      return "Better offer";
    case "not_applicable":
      return "Not applicable";
    case "invalid":
      return "Invalid";
    case "expired":
      return "Expired";
    case "already_used":
      return "Already used";
    default:
      return "Error";
  }
}
