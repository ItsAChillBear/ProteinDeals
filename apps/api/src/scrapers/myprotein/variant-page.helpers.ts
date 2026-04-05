import * as cheerio from "cheerio";
import { resolveUrl } from "./helpers.js";

export function collapseWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function toDocumentText(html: string) {
  return collapseWhitespace(
    html
      .replace(/<[^>]+>/g, " ")
      .replace(/\\u00a0|&nbsp;/gi, " ")
      .replace(/\s+/g, " ")
  );
}

export function extractDiscountedPrice(documentText: string) {
  const match = documentText.match(/discounted price\s*(?:Ã‚Â£|\$|Ã¢â€šÂ¬)\s*\d+(?:\.\d+)?/i);
  return match ? match[0] : null;
}

export function extractWasPrice(documentText: string) {
  const match = documentText.match(/was\s*(?:Ã‚Â£|\$|Ã¢â€šÂ¬)\s*\d+(?:\.\d+)?/i);
  return match ? match[0] : null;
}

export function extractRetailerProductId(pageUrl: string) {
  const pathname = new URL(pageUrl).pathname.replace(/\/+$/, "");
  const segments = pathname.split("/").filter(Boolean);
  const lastSegment = segments.at(-1) ?? null;
  return lastSegment && /^\d+$/.test(lastSegment) ? lastSegment : null;
}

export function isInStock($: cheerio.CheerioAPI, documentText: string) {
  if (
    $("[data-e2e='add-to-basket'][disabled]").length > 0 ||
    $("#pdp-sticky-atb-btn[disabled]").length > 0
  ) {
    return false;
  }

  if (/notify me when available/i.test(documentText) && !/\bin stock\b/i.test(documentText)) {
    return false;
  }

  return /\bin stock\b/i.test(documentText) || /add to basket/i.test(documentText);
}

export function extractPricePerServing($: cheerio.CheerioAPI, html: string) {
  const candidates = [
    $(".pricePerServing").first().text(),
    $("[class*='pricePerServing']").first().text(),
    $("[data-e2e*='price-per-serving']").first().text(),
  ];

  for (const candidate of candidates) {
    const normalized = collapseWhitespace(candidate);
    if (/\bper serving\b/i.test(normalized)) {
      return normalized;
    }
  }

  const documentText = toDocumentText(html);
  const match = documentText.match(/(?:Â£|\$|â‚¬)\s*\d+(?:\.\d+)?\s+per serving\b/i);
  return match ? match[0].trim() : null;
}

export function extractVariantImageUrl($: cheerio.CheerioAPI, pageUrl: string) {
  const selectors = [
    "img.productImages_image",
    "[data-e2e='product-image']",
    "img.athenaProductImageSlider_image",
    "img[class*='productImages_image']",
  ];

  for (const selector of selectors) {
    const element = $(selector).first();
    const candidate =
      element.attr("src")?.trim() ??
      element.attr("data-src")?.trim() ??
      element.attr("data-zoom-image")?.trim() ??
      element.attr("srcset")?.split(",")[0]?.trim().split(" ")[0] ??
      null;
    if (!candidate) continue;
    return resolveUrl(pageUrl, candidate);
  }

  const fallback =
    $("meta[property='og:image']").attr("content")?.trim() ??
    $("img").first().attr("src")?.trim() ??
    null;
  return fallback ? resolveUrl(pageUrl, fallback) : null;
}

export function extractProteinPer100g($: cheerio.CheerioAPI, html: string): number | null {
  for (const table of $("table").toArray()) {
    const amount = extractProteinPer100gFromTable($, table);
    if (amount !== null) return amount;
  }

  const nutritionBlocks = [
    "[data-e2e*='nutrition']",
    "[class*='nutrition']",
    "[class*='Nutrition']",
  ];

  for (const selector of nutritionBlocks) {
    for (const element of $(selector).toArray()) {
      const blockText = collapseWhitespace($(element).text());
      const amount = extractProteinFromNutritionText(blockText);
      if (amount !== null) return amount;
    }
  }

  const documentAmount = extractProteinPer100gFromDocumentText(toDocumentText(html));
  if (documentAmount !== null) return documentAmount;

  return null;
}

function extractProteinPer100gFromDocumentText(text: string): number | null {
  const match = text.match(
    /per\s*100g(?:\s+per\s*serving)?[\s\S]{0,2000}?\bprotein\b[^0-9]{0,40}(\d+(?:\.\d+)?)\s*g\b/i
  );
  return match ? Number(match[1]) : null;
}

function extractProteinPer100gFromTable(
  $: cheerio.CheerioAPI,
  table: unknown
): number | null {
  const rows = $(table as any).find("tr").toArray();
  if (!rows.length) return null;

  const headerRow = rows.find((row) => {
    const cells = $(row).find("th, td").toArray();
    return cells.some((cell) => /per\s*100g/i.test(collapseWhitespace($(cell).text())));
  });

  if (!headerRow) return null;

  const headerCells = $(headerRow).find("th, td").toArray();
  const per100gColumnIndex = headerCells.findIndex((cell) =>
    /per\s*100g/i.test(collapseWhitespace($(cell).text()))
  );
  if (per100gColumnIndex === -1) return null;

  for (const row of rows) {
    const cells = $(row).find("th, td");
    if (cells.length <= per100gColumnIndex) continue;

    const label = collapseWhitespace($(cells[0]).text()).toLowerCase();
    if (!isProteinLabel(label)) continue;

    const value = collapseWhitespace($(cells[per100gColumnIndex]).text());
    const amount = extractGramValue(value);
    if (amount !== null) return amount;
  }

  return null;
}

function extractProteinFromNutritionText(text: string): number | null {
  const match = text.match(/(?:^|\b)protein\b[^0-9]{0,20}(\d+(?:\.\d+)?)\s*g\b/i);
  return match ? Number(match[1]) : null;
}

function extractGramValue(value: string): number | null {
  const match = value.match(/(\d+(?:\.\d+)?)\s*g\b/i);
  return match ? Number(match[1]) : null;
}

function isProteinLabel(label: string) {
  return label === "protein" || label.startsWith("protein ");
}
