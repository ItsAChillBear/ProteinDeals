import * as cheerio from "cheerio";
import type { JsonLdNode } from "./types.js";

export function extractJsonLdNodes(html: string): JsonLdNode[] {
  const $ = cheerio.load(html);
  const nodes: JsonLdNode[] = [];
  $("script[type='application/ld+json']").each((_, element) => {
    const raw = $(element).contents().text();
    if (!raw.trim()) return;
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          const node = asObject(item);
          if (node) nodes.push(node);
        }
        return;
      }
      const object = asObject(parsed);
      if (!object) return;
      const graph = asArray(object["@graph"]);
      if (graph.length) {
        for (const item of graph) {
          const node = asObject(item);
          if (node) nodes.push(node);
        }
        return;
      }
      nodes.push(object);
    } catch {
      return;
    }
  });
  return nodes;
}

export function extractCategoryProductUrls(nodes: JsonLdNode[], categoryUrl: string): string[] {
  const urls = new Set<string>();
  for (const node of nodes) {
    if (node["@type"] !== "ItemList") continue;
    for (const item of asArray(node.itemListElement)) {
      const product = asObject(item);
      const href = asString(product?.url) ?? asString(product?.["@id"]);
      if (!href || !href.includes("/p/")) continue;
      urls.add(resolveUrl(categoryUrl, href.split("?")[0]));
    }
  }
  return [...urls];
}

export function extractVariantFlavour(variant: JsonLdNode): string | null {
  for (const property of asArray(variant.additionalProperty)) {
    const entry = asObject(property);
    if (entry && String(entry.name).toLowerCase() === "flavour") {
      return asString(entry.value);
    }
  }
  return null;
}

export function extractBrandName(node: JsonLdNode): string | null {
  return asString(asObject(node.brand)?.name);
}

export async function fetchText(url: string, fetchImpl: typeof fetch): Promise<string> {
  const response = await fetchImpl(url, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "accept-language": "en-GB,en;q=0.9",
    },
  });
  if (!response.ok) {
    throw new Error(`Request failed for ${url}: ${response.status} ${response.statusText}`);
  }
  return response.text();
}

export function parseSizeToGrams(value: string | null): number | null {
  if (!value) return null;
  const normalized = value.toLowerCase().replace(/,/g, ".");
  const kgMatch = normalized.match(/(\d+(?:\.\d+)?)\s*kg\b/);
  if (kgMatch) return Number(kgMatch[1]) * 1000;
  const gMatch = normalized.match(/(\d+(?:\.\d+)?)\s*g\b/);
  if (gMatch) return Number(gMatch[1]);
  return null;
}

export function firstNumber(values: Array<string | null | undefined>): number | null {
  for (const value of values) {
    const parsed = parseCurrency(value ?? null);
    if (parsed !== null) return parsed;
  }
  return null;
}

export function firstCurrencyAmount(values: Array<string | null | undefined>): number | null {
  for (const value of values) {
    const parsed = parsePoundAmount(value ?? null);
    if (parsed !== null) return parsed;
  }
  return null;
}

export function parseNumber(value: unknown): number | null {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim()) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  }
  return null;
}

export function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function parseCurrency(value: string | null): number | null {
  if (!value) return null;
  const normalized = value.replace(/[^\d.]/g, "");
  return normalized ? Number(normalized) : null;
}

export function parsePoundAmount(value: string | null): number | null {
  if (!value) return null;
  const match = value.match(/(?:£|Â£)\s*(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)/);
  if (!match) return null;
  const numeric = Number(match[1].replace(/,/g, ""));
  return Number.isFinite(numeric) ? numeric : null;
}

export function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function asObject(value: unknown): JsonLdNode | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonLdNode)
    : null;
}

export function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function resolveUrl(baseUrl: string, input: string): string {
  return new URL(input, baseUrl).toString();
}
