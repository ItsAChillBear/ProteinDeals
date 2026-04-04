import type { VoucherCodesOffer } from "./vouchercodes.js";

const MYPROTEIN_HOST = "https://www.myprotein.com";
const TEST_PRODUCT_URL =
  "https://www.myprotein.com/p/sports-nutrition/impact-whey-protein/10530943/";
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

export interface VoucherCodeTestResult {
  id: number;
  code: string | null;
  title: string | null;
  status:
    | "working"
    | "not_applicable"
    | "invalid"
    | "expired"
    | "already_used"
    | "better_offer"
    | "error";
  isWorking: boolean;
  messageType: string | null;
  message: string | null;
  quantityTested: number;
  basketSubtotal: number | null;
  basketTotalAfterCode: number | null;
  discountAmount: number | null;
  testedAt: string;
}

interface TestContext {
  basketCookieName: string;
  sku: number;
  unitPrice: number;
  currency: string;
}

export async function testVoucherCodes(
  offers: VoucherCodesOffer[],
  options: {
    fetchImpl?: typeof fetch;
    onProgress?: (message: string) => void | Promise<void>;
    onResult?: (result: VoucherCodeTestResult) => void | Promise<void>;
  } = {}
) {
  const fetchImpl = options.fetchImpl ?? fetch;
  const context = await loadTestContext(fetchImpl);
  const results: VoucherCodeTestResult[] = [];

  await options.onProgress?.(
    `Loaded test context: sku ${context.sku}, unit price GBP ${context.unitPrice.toFixed(2)}`
  );

  for (const [index, offer] of offers.entries()) {
    const label = offer.code ?? offer.codePartial ?? `offer-${offer.id}`;
    await options.onProgress?.(`Testing ${index + 1}/${offers.length}: ${label}`);
    const result = await testSingleVoucherCode(offer, context, fetchImpl);
    results.push(result);
    await options.onResult?.(result);
    await options.onProgress?.(
      `${label}: ${result.status}${result.messageType ? ` (${result.messageType})` : ""}`
    );
  }

  return results;
}

async function loadTestContext(fetchImpl: typeof fetch): Promise<TestContext> {
  const basketHtml = await fetchText(`${MYPROTEIN_HOST}/basket/`, fetchImpl);
  const basketCookieName =
    basketHtml.match(/"basketCookieName":"([^"]+)"/)?.[1] ?? "myprotein";

  const productHtml = await fetchText(TEST_PRODUCT_URL, fetchImpl);
  const defaultVariantMatch = productHtml.match(
    /"defaultVariant":\{"sku":(\d+).*?"price":\{"price":\{"currency":"([^"]+)","amount":"([^"]+)"/s
  );

  if (!defaultVariantMatch) {
    throw new Error("Could not extract a stable Myprotein test variant");
  }

  const sku = Number(defaultVariantMatch[1]);
  const currency = defaultVariantMatch[2];
  const unitPrice = Number(defaultVariantMatch[3]);

  if (!Number.isFinite(sku) || !Number.isFinite(unitPrice) || !currency) {
    throw new Error("Invalid Myprotein test variant data");
  }

  return {
    basketCookieName,
    sku,
    unitPrice,
    currency,
  };
}

async function testSingleVoucherCode(
  offer: VoucherCodesOffer,
  context: TestContext,
  fetchImpl: typeof fetch
): Promise<VoucherCodeTestResult> {
  const code = offer.code;
  const quantityTested = determineQuantity(offer.title, context.unitPrice);

  if (!code) {
    return {
      id: offer.id,
      code: offer.code,
      title: offer.title,
      status: "error",
      isWorking: false,
      messageType: null,
      message: "No voucher code available to test",
      quantityTested,
      basketSubtotal: null,
      basketTotalAfterCode: null,
      discountAmount: null,
      testedAt: new Date().toISOString(),
    };
  }

  const client = new MyproteinOperationClient(fetchImpl, context.basketCookieName);
  await client.bootstrap();

  const addResponse = await client.operation("AddToBasket", {
    id: client.getBasketId(),
    items: [{ sku: context.sku, quantity: quantityTested }],
    currency: context.currency,
    shippingDestination: "GB",
    loyaltyEnabled: false,
    enableAdvancedBYOB: true,
    hasSubscriptions: true,
  });

  const addPayload = asRecord(asRecord(addResponse.data)?.addProductsToBasket);
  client.setBasketId(addPayload?.id);
  const basketId = asString(addPayload?.id) ?? client.getBasketId();

  const applyResponse = await client.operation(
    "ApplyPromocode",
    {
      id: basketId,
      code,
      currency: context.currency,
      shippingDestination: "GB",
      hasSubscriptions: true,
      enableAdvancedBYOB: true,
    },
    { "X-Basket-Version": "1" }
  );

  const payload = asRecord(asRecord(applyResponse.data)?.applyCodeToBasket);
  const messages = Array.isArray(payload?.messages) ? payload.messages : [];
  const lastMessage = asRecord(messages[messages.length - 1]);
  const messageType = asString(lastMessage?.type);
  const message = asString(lastMessage?.message);
  const newDiscountCodeOfferApplied = payload?.newDiscountCodeOfferApplied === true;
  const appliedOffers = Array.isArray(payload?.appliedOffers) ? payload.appliedOffers : [];

  const status = classifyVoucherStatus({
    messageType,
    newDiscountCodeOfferApplied,
    appliedOffersCount: appliedOffers.length,
  });

  return {
    id: offer.id,
    code,
    title: offer.title,
    status,
    isWorking: status === "working" || status === "better_offer",
    messageType,
    message,
    quantityTested,
    basketSubtotal: parseAmount(payload?.standardPrice),
    basketTotalAfterCode: parseAmount(payload?.chargePrice),
    discountAmount: parseAmount(payload?.discount),
    testedAt: new Date().toISOString(),
  };
}

function classifyVoucherStatus(input: {
  messageType: string | null;
  newDiscountCodeOfferApplied: boolean;
  appliedOffersCount: number;
}): VoucherCodeTestResult["status"] {
  if (input.newDiscountCodeOfferApplied) return "working";
  if (input.messageType === "BETTER_OFFER_ALREADY_APPLIED" && input.appliedOffersCount > 0) {
    return "better_offer";
  }

  switch (input.messageType) {
    case "CODE_VALID_BUT_NOT_APPLICABLE_TO_BASKET":
    case "REFERRER_NOT_ELIGIBLE":
    case "PRODUCT_OUT_OF_STOCK":
    case "PRODUCT_MAX_PER_ORDER_EXCEEDED":
      return "not_applicable";
    case "CODE_INVALID":
      return "invalid";
    case "CODE_EXPIRED":
      return "expired";
    case "PROMO_CODE_ALREADY_USED":
      return "already_used";
    default:
      return "error";
  }
}

function determineQuantity(title: string | null, unitPrice: number) {
  const normalizedTitle = title?.toLowerCase() ?? "";
  const thresholdMatch = normalizedTitle.match(/over\s*[£]?\s*(\d+(?:\.\d+)?)/i);
  const minimumSpend = thresholdMatch ? Number(thresholdMatch[1]) + 5 : 55;
  return Math.max(1, Math.ceil(minimumSpend / unitPrice));
}

function parseAmount(value: unknown) {
  const amount = asRecord(value)?.amount;
  if (typeof amount === "string" && amount.trim()) {
    const numeric = Number(amount);
    return Number.isFinite(numeric) ? numeric : null;
  }
  if (typeof amount === "number" && Number.isFinite(amount)) {
    return amount;
  }
  return null;
}

async function fetchText(url: string, fetchImpl: typeof fetch) {
  const response = await fetchImpl(url, {
    headers: {
      "user-agent": USER_AGENT,
      "accept-language": "en-GB,en;q=0.9",
    },
  });

  if (!response.ok) {
    throw new Error(`Request failed for ${url}: ${response.status} ${response.statusText}`);
  }

  return response.text();
}

class MyproteinOperationClient {
  private readonly cookieJar = new Map<string, string>();
  private basketId: string | null = null;

  constructor(
    private readonly fetchImpl: typeof fetch,
    private readonly basketCookieName: string
  ) {}

  async bootstrap() {
    const response = await this.fetchWithCookies(`${MYPROTEIN_HOST}/basket/`);
    await response.text();
    this.basketId = this.readBasketIdFromCookie();
  }

  getBasketId() {
    return this.basketId;
  }

  setBasketId(value: unknown) {
    const basketId = asString(value);
    if (!basketId) return;
    this.basketId = basketId;
    const encoded = Buffer.from(basketId, "utf8").toString("base64");
    this.cookieJar.set(`ElysiumBasket${this.basketCookieName}_V6`, encoded);
  }

  async operation(
    name: string,
    variables: Record<string, unknown>,
    extraHeaders: Record<string, string> = {}
  ) {
    const response = await this.fetchWithCookies(`${MYPROTEIN_HOST}/api/operation/${name}/`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-altitude-instance": "myprotein",
        "x-horizon-client": "altitude-storefront-nutrition",
        ...extraHeaders,
      },
      body: JSON.stringify({
        operationName: name,
        variables,
      }),
    });

    if (!response.ok) {
      throw new Error(`${name} failed: ${response.status} ${response.statusText}`);
    }

    return (await response.json()) as { data?: Record<string, unknown> };
  }

  private async fetchWithCookies(url: string, init: RequestInit = {}) {
    const response = await this.fetchImpl(url, {
      ...init,
      headers: {
        "user-agent": USER_AGENT,
        "accept-language": "en-GB,en;q=0.9",
        ...(this.cookieJar.size ? { cookie: this.getCookieHeader() } : {}),
        ...(init.headers ?? {}),
      },
    });

    this.captureSetCookies(response);
    return response;
  }

  private captureSetCookies(response: Response) {
    const getSetCookie = (
      response.headers as Headers & { getSetCookie?: () => string[] }
    ).getSetCookie;
    const setCookies = getSetCookie?.call(response.headers) ?? [];

    for (const entry of setCookies) {
      const [cookiePair] = entry.split(";");
      const separatorIndex = cookiePair.indexOf("=");
      if (separatorIndex <= 0) continue;
      this.cookieJar.set(
        cookiePair.slice(0, separatorIndex),
        cookiePair.slice(separatorIndex + 1)
      );
    }
  }

  private getCookieHeader() {
    return [...this.cookieJar.entries()]
      .map(([key, value]) => `${key}=${value}`)
      .join("; ");
  }

  private readBasketIdFromCookie() {
    const encoded = this.cookieJar.get(`ElysiumBasket${this.basketCookieName}_V6`);
    if (!encoded) return null;

    const cleaned = encoded.replaceAll('"', "");
    try {
      return Buffer.from(cleaned, "base64").toString("utf8");
    } catch {
      return cleaned;
    }
  }
}

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
