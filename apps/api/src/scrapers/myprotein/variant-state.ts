export function extractVariantStateMap(html: string) {
  const bySku = new Map<string, any>();
  const currentVariantMatches = [
    ...html.matchAll(/"currentVariant":(\{[\s\S]*?"price":\{[\s\S]*?\}\})/g),
  ];

  for (const match of currentVariantMatches) {
    const parsed = tryParseJsonObject(match[1]);
    const sku = parsed?.sku;
    if (sku !== undefined && sku !== null) {
      bySku.set(String(sku), parsed);
    }
  }

  const broadMatches = [
    ...html.matchAll(
      /"subscriptionContracts":\[[\s\S]*?\],"content":\[[\s\S]*?\],"sku":(\d+)[\s\S]*?"price":\{"price":\{"currency":"[^"]+","amount":"([^"]+)"/g
    ),
  ];
  for (const match of broadMatches) {
    const sku = match[1];
    if (!bySku.has(sku)) {
      bySku.set(sku, { sku: Number(sku), price: { price: { amount: match[2] } } });
    }
  }

  return bySku;
}

export function getSubscriptionPriceFromVariantState(variantState: any): number | null {
  if (!variantState) return null;
  const contracts = Array.isArray(variantState.subscriptionContracts)
    ? variantState.subscriptionContracts
    : [];
  if (!contracts.length) return null;

  const initialDiscountPercentage =
    contracts.find((contract: any) => contract?.recommended)?.initialDiscountPercentage ??
    contracts[0]?.initialDiscountPercentage;
  const basePrice = Number(variantState?.price?.price?.amount);

  if (!Number.isFinite(basePrice) || !Number.isFinite(initialDiscountPercentage)) {
    return null;
  }

  return Math.round(basePrice * (1 - initialDiscountPercentage / 100) * 100) / 100;
}

function tryParseJsonObject(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
