export function ScraperProgressLog(props: { lines: string[] }) {
  return (
    <div className="overflow-hidden rounded-[1.5rem] border border-stone-800 bg-stone-950/70">
      <div className="border-b border-stone-800 px-4 py-3 text-xs uppercase tracking-[0.2em] text-stone-400">
        Live Progress
      </div>
      <div className="max-h-72 overflow-y-auto px-4 py-4 font-mono text-xs leading-6 text-stone-300">
        {props.lines.length ? (
          props.lines.map((line, index) => <div key={`${index}-${line}`}>{line}</div>)
        ) : (
          <div className="text-stone-500">
            Run the scraper to watch progress lines appear here.
          </div>
        )}
      </div>
    </div>
  );
}
