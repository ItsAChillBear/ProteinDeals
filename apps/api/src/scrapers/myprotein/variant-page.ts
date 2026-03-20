import * as cheerio from "cheerio";
import { fetchSubscriptionFragment, extractSubscriptionValues } from "./subscription.js";
import { firstNumber, resolveUrl } from "./helpers.js";

export async function parseVariantPage(html: string, pageUrl: string, fetchImpl: typeof fetch) {
  const $ = cheerio.load(html);
  const ariaLabel = $("pdp-sticky-atb").attr("aria-label")?.trim() ?? null;
  const parts = ariaLabel?.split(" - ").map((part) => part.trim()).filter(Boolean) ?? [];
  const subscriptionFragmentHtml = await fetchSubscriptionFragment($, pageUrl, fetchImpl);
  const subscription = extractSubscriptionValues(html, subscriptionFragmentHtml, $);

  return {
    ariaLabel,
    flavour: parts.length >= 4 ? parts[parts.length - 1] : null,
    sizeLabel: parts.length >= 2 ? parts[1] : null,
    servingsLabel: parts.length >= 3 ? parts[2] : null,
    price: firstNumber([
      $("#pdp-sticky-price .price").text(),
      $("[data-e2e='product-price']").first().text(),
      $("span.price").first().text(),
    ]),
    originalPrice: firstNumber([
      $("[data-e2e='rrp-price']").first().text(),
      $("s.price").first().text(),
      $(".price-was-save-container s").first().text(),
    ]),
    ...subscription,
    proteinPer100g: extractProteinPer100g($),
    inStock:
      $("[data-e2e='add-to-basket'][disabled]").length === 0 &&
      $("#pdp-sticky-atb-btn[disabled]").length === 0,
    currency: html.includes('"priceCurrency":"GBP"') ? "GBP" : null,
    imageUrl: extractVariantImageUrl($, pageUrl),
    retailerProductId: new URL(pageUrl).searchParams.get("variation"),
  };
}

function extractVariantImageUrl($: cheerio.CheerioAPI, pageUrl: string) {
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

function extractProteinPer100g($: cheerio.CheerioAPI): number | null {
  const text = $("body").text();
  const match = text.match(/Protein\s*[:\s]+\s*(\d+(?:\.\d+)?)\s*g/iu);
  return match ? Number(match[1]) : null;
}
