import type { ProductGroupWithSelection } from "./price-comparison-table.types";

const NOISE_LABELS = /^(nutritional information|typical values|contains \d+ servings?)$/i;
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
  const ingredients = product.ingredients;
  const nutritionRows = (product.nutritionalInformation ?? []).filter((row) =>
    isCleanNutritionRow(row)
  );

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-950/70 p-4">
      <div className="mb-3 flex flex-wrap gap-4 text-xs text-gray-400">
        <span>Flavour: <span className="text-white">{product.flavour ?? "-"}</span></span>
        <span>Size: <span className="text-white">{product.size}</span></span>
        <span>Servings: <span className="text-white">{product.servings ?? "-"}</span></span>
      </div>

      {product.description ? (
        <div className="mb-4">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">Description</h4>
          <p className="whitespace-pre-line text-sm leading-6 text-gray-300">{product.description}</p>
        </div>
      ) : null}

      {ingredients ? (
        <div className="mb-4">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">Ingredients</h4>
          <p className="whitespace-pre-line text-sm leading-6 text-gray-300">{ingredients}</p>
        </div>
      ) : null}

      {nutritionRows.length ? (
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">Nutritional Information</h4>
          <div className="overflow-x-auto rounded-lg border border-gray-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-900/80 text-gray-400">
                <tr>
                  <th className="px-3 py-2 font-semibold">Nutrient</th>
                  <th className="px-3 py-2 font-semibold">Per 100g</th>
                  <th className="px-3 py-2 font-semibold">Per Serving</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {nutritionRows.map((row) => (
                  <tr key={row.label}>
                    <td className="px-3 py-2 text-gray-300">{row.label}</td>
                    <td className="px-3 py-2 text-gray-300">{row.per100g ?? "-"}</td>
                    <td className="px-3 py-2 text-gray-300">{row.perServing ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

    </div>
  );
}
