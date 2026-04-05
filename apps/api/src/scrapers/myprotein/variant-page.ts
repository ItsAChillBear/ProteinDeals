import * as cheerio from "cheerio";
import { firstNumber } from "./helpers.js";
import { fetchSubscriptionFragment, extractSubscriptionValues } from "./subscription.js";
import {
  extractDiscountedPrice,
  extractPricePerServing,
  extractProteinPer100g,
  extractRetailerProductId,
  extractVariantImageUrl,
  extractWasPrice,
  isInStock,
  toDocumentText,
} from "./variant-page.helpers.js";

export async function parseVariantPage(html: string, pageUrl: string, fetchImpl: typeof fetch) {
  const $ = cheerio.load(html);
  const ariaLabel = $("pdp-sticky-atb").attr("aria-label")?.trim() ?? null;
  const parts = ariaLabel?.split(" - ").map((part) => part.trim()).filter(Boolean) ?? [];
  const subscriptionFragmentHtml = await fetchSubscriptionFragment($, pageUrl, fetchImpl);
  const subscription = extractSubscriptionValues(html, subscriptionFragmentHtml, $);
  const documentText = toDocumentText(html);

  return {
    ariaLabel,
    flavour: parts.length >= 4 ? parts[parts.length - 1] : null,
    sizeLabel: parts.length >= 2 ? parts[1] : null,
    servingsLabel: parts.length >= 3 ? parts[2] : null,
    pricePerServingLabel: extractPricePerServing($, html),
    price: firstNumber([
      $("#pdp-sticky-price .price").text(),
      $("[data-e2e='product-price']").first().text(),
      $("span.price").first().text(),
      extractDiscountedPrice(documentText),
    ]),
    originalPrice: firstNumber([
      $("[data-e2e='rrp-price']").first().text(),
      $("s.price").first().text(),
      $(".price-was-save-container s").first().text(),
      extractWasPrice(documentText),
    ]),
    ...subscription,
    proteinPer100g: extractProteinPer100g($, html),
    inStock: isInStock($, documentText),
    currency: html.includes('"priceCurrency":"GBP"') ? "GBP" : null,
    imageUrl: extractVariantImageUrl($, pageUrl),
    retailerProductId:
      new URL(pageUrl).searchParams.get("variation") ?? extractRetailerProductId(pageUrl),
  };
}
