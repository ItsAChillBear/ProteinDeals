import { CheckCircle, Copy, ExternalLink, XCircle } from "lucide-react";
import type { ProductGroupWithSelection } from "./price-comparison-table.types";

const NOISE_LABELS = /^(nutritional information|typical values|contains \d+ servings?)$/i;

type DiscountCode = { label: string; code: string; type: "refer" | "promo"; description?: string };
const RETAILER_REFER_CODES: Record<string, DiscountCode[]> = {
  MyProtein: [
    {
      label: "Refer a Friend",
      code: "CHILL-R3E",
      type: "refer",
      description: "Get £15 credit when you spend £45 on your first order.",
    },
  ],
};

const CODE_TYPE_ORDER: DiscountCode["type"][] = ["refer", "promo"];
const CODE_TYPE_LABELS: Record<DiscountCode["type"], string> = {
  refer: "Refer a Friend",
  promo: "Promo Codes",
};
type NutritionRow = { label: string; per100g: string | null; perServing: string | null };

function isCleanNutritionRow(row: NutritionRow) {
  if (NOISE_LABELS.test(row.label.trim())) return false;
  if (row.label === row.per100g && row.label === row.perServing) return false;
  if (row.label.length > 60) return false;
  return true;
}

export default function PriceComparisonExpandedDetails({
  group,
}: {
  group: ProductGroupWithSelection;
}) {
  const product = group.selected;
  const codes = [...(RETAILER_REFER_CODES[group.retailer] ?? []), ...(product.discountCodes ?? [])];
  const ingredients = product.ingredients;
  const nutritionRows = (product.nutritionalInformation ?? []).filter((row) =>
    isCleanNutritionRow(row)
  );

  const codesByType = CODE_TYPE_ORDER.map((type) => ({
    type,
    codes: codes.filter((c) => c.type === type),
  })).filter((g) => g.codes.length > 0);

  return (
    <div className="rounded-xl border border-theme bg-theme p-4">
      <div className="mb-3 flex items-center gap-3">
        <a href={product.url} target="_blank" rel="noopener noreferrer sponsored" className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-green-500">
          Visit site <ExternalLink className="h-3 w-3" />
        </a>
        {product.inStock
          ? <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-green-500"><CheckCircle className="h-4 w-4 flex-shrink-0" />In Stock</span>
          : <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-red-500"><XCircle className="h-4 w-4 flex-shrink-0" />Out of Stock</span>}
      </div>
      <div className="flex items-stretch gap-6 divide-x divide-theme">
        <div className="flex-1 min-w-0">
          {product.description ? (
            <div className="mb-4">
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-theme-3">Description</h4>
              <p className="whitespace-pre-line text-sm leading-6 text-theme-2">{product.description}</p>
            </div>
          ) : null}

          {ingredients ? (
            <div className="mb-4">
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-theme-3">Ingredients</h4>
              <div className="whitespace-pre-line text-sm leading-6 text-theme-2">
                {renderMarkedText(ingredients)}
              </div>
            </div>
          ) : null}

          {nutritionRows.length ? (
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-theme-3">Nutritional Information</h4>
              <div className="overflow-x-auto rounded-lg border border-theme">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-2 text-theme-3">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Nutrient</th>
                      <th className="px-3 py-2 font-semibold">Per 100g</th>
                      <th className="px-3 py-2 font-semibold">Per Serving</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-theme">
                    {nutritionRows.map((row) => (
                      <tr key={row.label}>
                        <td className="px-3 py-2 text-theme-2">{row.label}</td>
                        <td className="px-3 py-2 text-theme-2">{row.per100g ?? "-"}</td>
                        <td className="px-3 py-2 text-theme-2">{row.perServing ?? "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>

        {codesByType.length > 0 ? (
          <div className="flex-[2] min-w-0 flex flex-col pl-6">
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-theme-3">Discount Codes</h4>
            <div className="overflow-x-auto rounded-lg border border-theme flex-1">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-2 text-theme-3">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Code</th>
                    <th className="px-3 py-2 font-semibold">Type</th>
                    <th className="px-3 py-2 font-semibold">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-theme">
                  {codesByType.flatMap(({ type, codes: typeCodes }) =>
                    typeCodes.map((c) => (
                      <tr key={c.code} className={c.type === "refer" ? "bg-gradient-to-r from-amber-500/10 via-yellow-300/10 to-amber-500/10 bg-[length:200%_100%] animate-shimmer" : ""}>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <div className="relative inline-flex">
                            {c.type === "refer" ? <span className="absolute -left-2 -top-2 text-sm leading-none text-amber-400">★</span> : null}
                            <button
                              type="button"
                              onClick={() => navigator.clipboard.writeText(c.code)}
                              className={`inline-flex items-center justify-between gap-1.5 rounded-lg px-2.5 py-1 font-mono font-semibold tracking-wide transition min-w-[9rem] ${c.type === "refer" ? "border border-amber-500/40 bg-amber-500/10 text-theme-2 hover:bg-amber-500/20" : "border border-green-500/30 bg-green-500/10 text-green-500 hover:bg-green-500/20"}`}
                              title="Click to copy"
                            >
                              {c.code}
                              <Copy className="h-3 w-3 opacity-60" />
                            </button>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-theme-2 whitespace-nowrap">{CODE_TYPE_LABELS[type]}</td>
                        <td className="px-3 py-2 text-theme-2">
                          {c.description ?? "-"}
                          {c.type === "refer" ? <span className="ml-2 text-[10px] text-theme-4">— Help support the website</span> : null}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}


function renderMarkedText(value: string) {
  return value.split("\n").map((line, lineIndex) => (
    <span key={`${line}-${lineIndex}`}>
      {line.split(/(\*\*.*?\*\*)/g).map((part, partIndex) => {
        const match = part.match(/^\*\*(.*?)\*\*$/);
        if (!match) return <span key={partIndex}>{part}</span>;
        return <strong key={partIndex} className="font-semibold text-theme">{match[1]}</strong>;
      })}
      {lineIndex < value.split("\n").length - 1 ? "\n" : null}
    </span>
  ));
}
