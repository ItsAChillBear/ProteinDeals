import * as cheerio from "cheerio";
import { firstCurrencyAmount, resolveUrl } from "./helpers.js";

export async function fetchSubscriptionFragment(
  $: cheerio.CheerioAPI,
  pageUrl: string,
  fetchImpl: typeof fetch
) {
  const fragmentPath =
    $("[data-e2e='subscribe-tab']").attr("data-fragment") ??
    $("#subscribe-tab").attr("data-fragment");
  if (!fragmentPath) return null;

  const url = resolveUrl(pageUrl, fragmentPath);
  try {
    const response = await fetchImpl(url, {
      method: "POST",
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        accept: "text/html, */*; q=0.01",
        "accept-language": "en-GB,en;q=0.9",
        referer: pageUrl,
        "x-requested-with": "XMLHttpRequest",
        "content-type": "application/json",
      },
      body: JSON.stringify({ variation: new URL(pageUrl).searchParams.get("variation") }),
    });
    if (!response.ok) return null;
    return await response.text();
  } catch {
    return null;
  }
}

export function extractSubscriptionValues(
  html: string,
  subscriptionFragmentHtml: string | null | undefined,
  $: cheerio.CheerioAPI
) {
  const subscription$ = subscriptionFragmentHtml ? cheerio.load(subscriptionFragmentHtml) : null;
  return {
    subscriptionPrice: firstCurrencyAmount([
      $("#subscription-price").first().text(),
      $("[data-e2e='subscribe-tab'] #subscription-price").first().text(),
      $("[data-e2e='subscribe-tab']").first().text(),
      subscription$?.("#subscription-price").first().text(),
      subscription$?.root().text(),
      extractSubscriptionBlockText($),
      extractElementInnerHtmlCurrency(html, "subscription-price"),
      extractElementInnerHtmlCurrency(subscriptionFragmentHtml, "subscription-price"),
    ]),
    subscriptionSavings: firstCurrencyAmount([
      $("#subscription-save").first().text(),
      $("[data-e2e='subscribe-tab'] #subscription-save").first().text(),
      $("[data-e2e='subscribe-tab']").first().text(),
      subscription$?.("#subscription-save").first().text(),
      subscription$?.root().text(),
      extractSubscriptionBlockText($),
      extractElementInnerHtmlCurrency(html, "subscription-save"),
      extractElementInnerHtmlCurrency(subscriptionFragmentHtml, "subscription-save"),
    ]),
  };
}

export function extractSubscriptionBlockText($: cheerio.CheerioAPI) {
  return collapseWhitespace(
    $("[data-e2e='subscribe-tab']").first().text() ||
      $("#subscribe-tab").first().text() ||
      $("body").text().match(/Subscription[\s\S]{0,200}/i)?.[0] ||
      ""
  );
}

export function extractElementInnerHtmlCurrency(
  html: string | null | undefined,
  elementId: string
) {
  if (!html) return null;
  const escapedId = elementId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = html.match(new RegExp(`id=["']${escapedId}["'][^>]*>([\\s\\S]{0,80}?)<`, "i"));
  if (!match) return null;
  return match[1]
    .replace(/&pound;/gi, "£")
    .replace(/&#163;/g, "£")
    .replace(/<[^>]+>/g, " ")
    .trim();
}

function collapseWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}
