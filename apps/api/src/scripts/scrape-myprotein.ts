import "dotenv/config";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { scrapeMyproteinWheyProducts } from "../scrapers/myprotein.js";

async function main() {
  const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
  const outputArg = process.argv.find((arg) => arg.startsWith("--output="));
  const limitProducts = limitArg ? Number(limitArg.split("=")[1]) : undefined;
  const outputPath =
    outputArg?.split("=")[1] ?? resolve(process.cwd(), "myprotein-whey.json");

  const records = await scrapeMyproteinWheyProducts({
    limitProducts:
      typeof limitProducts === "number" && Number.isFinite(limitProducts)
        ? limitProducts
        : undefined,
  });

  await writeFile(outputPath, JSON.stringify(records, null, 2), "utf8");
  console.log(
    `Scraped ${records.length} Myprotein variants to ${outputPath}`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
