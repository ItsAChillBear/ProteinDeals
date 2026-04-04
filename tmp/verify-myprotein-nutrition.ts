import { extractMyproteinProductContent } from "../apps/api/src/scrapers/myprotein/content.ts";

const snippets = {
  explicitPerGram: `
    <table><tbody>
      <tr><td></td><td>Per 100g</td><td>Per 51g</td><td>% RI</td></tr>
      <tr><td>Energy</td><td>405kcal</td><td>206kcal</td><td>10%</td></tr>
      <tr><td>Protein</td><td>34g</td><td>18g</td><td>36%</td></tr>
      <tr><td>Salt</td><td>1.80g</td><td>0.90g</td><td>15%</td></tr>
    </tbody></table>
  `,
  containsFormat: `
    <table><tbody>
      <tr><td>NUTRITIONAL INFORMATION</td></tr>
      <tr><td>Typical Values</td><td>100g contains</td><td>A serving contains</td><td>% Reference Intake</td><td>Reference Intake</td></tr>
      <tr><td>Energy</td><td>384kcal</td><td>192kcal</td><td>19%</td><td>2000kcal</td></tr>
      <tr><td>Protein</td><td>30g</td><td>15g</td><td>60%</td><td>50g</td></tr>
      <tr><td>Salt</td><td>0.12g</td><td>0.06g</td><td>2%</td><td>6g</td></tr>
      <tr><td>Contains 50 servings</td></tr>
    </tbody></table>
  `,
  heuristicOnly: `
    <table><tbody>
      <tr><td>Typical Values</td><td>Base</td><td>Dose</td><td>RI%</td></tr>
      <tr><td>Energy</td><td>400kcal</td><td>200kcal</td><td>10%</td></tr>
      <tr><td>Fat</td><td>10g</td><td>5g</td><td>7%</td></tr>
      <tr><td>Carbohydrate</td><td>20g</td><td>10g</td><td>8%</td></tr>
      <tr><td>Protein</td><td>30g</td><td>15g</td><td>30%</td></tr>
      <tr><td>Salt</td><td>1g</td><td>0.5g</td><td>9%</td></tr>
    </tbody></table>
  `,
};

for (const [name, html] of Object.entries(snippets)) {
  const parsed = extractMyproteinProductContent(`<html><body>${html}</body></html>`);
  console.log(name, JSON.stringify(parsed.nutritionalInformation, null, 2));
}
