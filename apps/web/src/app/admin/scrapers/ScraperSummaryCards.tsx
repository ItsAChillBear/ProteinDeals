type SummaryCounts = Record<"create" | "update" | "delete" | "unchanged", number>;

export function ScraperSummaryCards(props: {
  status: string;
  variantCount: number;
  logLines: number;
  finishedAt: string | null;
  summary: SummaryCounts | null;
}) {
  return (
    <>
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Status" value={props.status} />
        <StatCard label="Variants" value={String(props.variantCount)} />
        <StatCard label="Log Lines" value={String(props.logLines)} />
        <StatCard
          label="Last Finished"
          value={
            props.finishedAt ? new Date(props.finishedAt).toLocaleTimeString() : "Not run yet"
          }
        />
      </div>

      {props.summary ? (
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard label="Creates" value={String(props.summary.create)} />
          <StatCard label="Updates" value={String(props.summary.update)} />
          <StatCard label="Deletes" value={String(props.summary.delete)} />
          <StatCard label="Unchanged" value={String(props.summary.unchanged)} />
        </div>
      ) : null}
    </>
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
