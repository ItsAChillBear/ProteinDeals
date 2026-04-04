import "dotenv/config";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { scrapeMyproteinVoucherCodes } from "../scrapers/vouchercodes.js";

async function main() {
  const outputArg = process.argv.find((arg) => arg.startsWith("--output="));
  const outputPath =
    outputArg?.split("=")[1] ?? resolve(process.cwd(), "myprotein-vouchercodes.json");

  const records = await scrapeMyproteinVoucherCodes({
    onProgress: (message) => {
      console.log(message);
    },
  });

  await writeFile(outputPath, JSON.stringify(records, null, 2), "utf8");
  console.log(`Scraped ${records.length} Myprotein voucher codes to ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
