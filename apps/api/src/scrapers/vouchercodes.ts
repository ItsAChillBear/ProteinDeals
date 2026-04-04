import * as cheerio from "cheerio";

const DEFAULT_VOUCHERCODES_URL =
  "https://www.vouchercodes.co.uk/myprotein.co.uk?rc=9113757";

const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

type UnknownRecord = Record<string, unknown>;

export interface VoucherCodesOffer {
  id: number;
  type: string | null;
  title: string | null;
  description: string | null;
  code: string | null;
  codePartial: string | null;
  ctaText: string | null;
  ctaSubtext: string | null;
  lastUsed: string | null;
  expiresAt: string | null;
  isExclusive: boolean;
  worksWithSale: boolean;
  isHighlighted: boolean;
  termsAvailable: boolean;
  merchantUrl: string | null;
  sourceUrl: string;
  scrapedAt: string;
}

export interface ScrapeVoucherCodesOptions {
  url?: string;
  fetchImpl?: typeof fetch;
  onProgress?: (message: string) => void | Promise<void>;
}

export async function scrapeMyproteinVoucherCodes(
  options: ScrapeVoucherCodesOptions = {}
): Promise<VoucherCodesOffer[]> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const sourceUrl = options.url ?? DEFAULT_VOUCHERCODES_URL;

  await options.onProgress?.(`Fetching ${sourceUrl}`);
  const html = await fetchText(sourceUrl, fetchImpl);
  await options.onProgress?.("Parsing offer cards and embedded Nuxt data");

  const offerStateMap = extractOfferStateMap(html);
  const $ = cheerio.load(html);
  const offers: VoucherCodesOffer[] = [];

  for (const element of $("[data-qa^='el:offer offerId:']").toArray()) {
    const qa = $(element).attr("data-qa") ?? "";
    const offerId = extractOfferId(qa);
    if (offerId === null) continue;

    const type = extractOfferType(qa);
    if (type !== "code") continue;

    const state = offerStateMap.get(offerId);
    const dates = asRecord(state?.dates);
    const button = asRecord(state?.button);
    const flags = asRecord(state?.flags);
    const layout = asRecord(state?.layout);
    const outlink = asString(state?.outlink);
    const expiresAtUnix = asNumber(dates?.expires);

    const buttonText = cleanText(
      $(element).find("[data-qa='el:offerPrimaryButton']").first().text()
    );
    const voucherCode = asString(state?.voucherCode);

    offers.push({
      id: offerId,
      type,
      title: cleanText($(element).find("[data-qa='el:offerTitle']").first().text()),
      description: cleanText($(element).find("[data-qa='el:offerDetails']").first().text()),
      code: voucherCode ?? inferVisibleVoucherCode(buttonText),
      codePartial:
        cleanText($(element).find("[data-qa='el:codeReveal']").first().text()) ??
        asString(state?.voucherCodePartial),
      ctaText: asString(button?.text),
      ctaSubtext:
        cleanText($(element).find(".text-center.text-xs.font-normal.text-gray-700").first().text()) ??
        asString(layout?.ctaSubtext),
      lastUsed:
        cleanText($(element).find("[data-qa='el:offerDetails']").first().text()) ??
        asString(state?.lastUsed),
      expiresAt:
        expiresAtUnix !== null && expiresAtUnix > 0
          ? new Date(expiresAtUnix * 1000).toISOString()
          : null,
      isExclusive: qa.includes("exclusive:true") || asBoolean(flags?.exclusive),
      worksWithSale:
        qa.includes("worksWithSale:true") || asBoolean(flags?.worksWithSale),
      isHighlighted: qa.includes("highlighted:true"),
      termsAvailable: $(element).find("[data-qa='el:offerTermsButton']").length > 0,
      merchantUrl: outlink ? new URL(outlink, sourceUrl).toString() : null,
      sourceUrl,
      scrapedAt: new Date().toISOString(),
    });
  }

  offers.sort((left, right) => left.id - right.id);
  await options.onProgress?.(`Collected ${offers.length} voucher codes`);
  return offers;
}

async function fetchText(url: string, fetchImpl: typeof fetch) {
  const response = await fetchImpl(url, {
    headers: {
      "user-agent": DEFAULT_USER_AGENT,
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "accept-language": "en-GB,en;q=0.9",
    },
  });

  if (!response.ok) {
    throw new Error(`Request failed for ${url}: ${response.status} ${response.statusText}`);
  }

  return response.text();
}

function extractOfferStateMap(html: string) {
  const nuxtDataMatch = html.match(
    /<script type="application\/json" data-nuxt-data="nuxt-app"[^>]*>([\s\S]*?)<\/script>/
  );
  if (!nuxtDataMatch) return new Map<number, UnknownRecord>();

  const table = JSON.parse(nuxtDataMatch[1]) as JsonValue[];
  const revived = reviveNuxtValue(table, 0);
  const offers = new Map<number, Record<string, unknown>>();
  collectOfferObjects(revived, offers);
  return offers;
}

function reviveNuxtValue(
  table: JsonValue[],
  pointer: JsonValue,
  seen = new Map<number, unknown>()
): unknown {
  if (pointer === null || typeof pointer === "boolean" || typeof pointer === "string") {
    return pointer;
  }

  if (typeof pointer === "number") {
    const target = table[pointer];
    if (target === undefined) {
      return pointer;
    }
    if (seen.has(pointer)) {
      return seen.get(pointer);
    }
    seen.set(pointer, null);
    const revived: unknown = reviveNuxtValue(table, target, seen);
    seen.set(pointer, revived);
    return revived;
  }

  if (Array.isArray(pointer)) {
    if (pointer[0] === "ShallowReactive" || pointer[0] === "Reactive" || pointer[0] === "EmptyRef") {
      return pointer.length > 1 ? reviveNuxtValue(table, pointer[1], seen) : null;
    }

    const revivedArray: unknown[] = [];
    for (const [index, item] of pointer.entries()) {
      if (index === 0 && typeof item === "string") {
        revivedArray.push(item);
        continue;
      }
      const revivedItem: unknown = reviveNuxtValue(table, item, seen);
      revivedArray.push(revivedItem);
    }
    return revivedArray;
  }

  const revivedObject: UnknownRecord = {};
  for (const [key, value] of Object.entries(pointer)) {
    revivedObject[key] = reviveNuxtValue(table, value, seen);
  }
  return revivedObject;
}

function collectOfferObjects(value: unknown, offers: Map<number, UnknownRecord>) {
  if (!value) return;
  if (Array.isArray(value)) {
    for (const item of value) {
      collectOfferObjects(item, offers);
    }
    return;
  }
  if (typeof value !== "object") return;

  const record = value as UnknownRecord;
  if (record.type && record.id && typeof record.type === "object") {
    const typeName = asString((record.type as UnknownRecord).name);
    const id = asNumber(record.id);
    if (typeName === "code" && id !== null) {
      offers.set(id, record);
    }
  }

  for (const nested of Object.values(record)) {
    collectOfferObjects(nested, offers);
  }
}

function extractOfferId(value: string) {
  const match = value.match(/offerId:(\d+)/);
  return match ? Number(match[1]) : null;
}

function extractOfferType(value: string) {
  const match = value.match(/offerType:([a-z]+)/i);
  return match?.[1]?.toLowerCase() ?? null;
}

function cleanText(value: string | null | undefined) {
  if (!value) return null;
  const normalized = value
    .replace(/Â£/g, "£")
    .replace(/â€¢/g, "•")
    .replace(/\s+/g, " ")
    .trim();
  return normalized || null;
}

function asString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asBoolean(value: unknown) {
  return typeof value === "boolean" ? value : false;
}

function asRecord(value: unknown): UnknownRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null;
}

function inferVisibleVoucherCode(value: string | null) {
  if (!value) return null;
  if (/^get code/i.test(value) || /^get deal/i.test(value)) {
    return null;
  }
  return value;
}
