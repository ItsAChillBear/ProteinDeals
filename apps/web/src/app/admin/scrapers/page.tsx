import { MyproteinScraperPanel } from "./scraper-panel";
import { VoucherCodesScraperPanel } from "./VoucherCodesScraperPanel";

export default function ScrapersAdminPage() {
  return (
    <main className="min-h-screen bg-stone-950 px-6 py-10 text-stone-100">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="space-y-3">
          <p className="text-xs uppercase tracking-[0.35em] text-amber-300">
            Internal Tools
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-stone-50">
            Scraper Control Room
          </h1>
          <p className="max-w-3xl text-sm leading-6 text-stone-300">
            Run the Myprotein whey scraper or the VoucherCodes Myprotein scraper and
            inspect live output before deciding what to do with the results.
          </p>
        </section>

        <MyproteinScraperPanel />
        <VoucherCodesScraperPanel />
      </div>
    </main>
  );
}
