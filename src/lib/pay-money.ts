export const CARD_PROVIDERS = ["paystack", "flutterwave", "bachs"] as const;
export type CardProvider = (typeof CARD_PROVIDERS)[number];
export const PAY_PROVIDERS = ["paystack", "flutterwave", "nowpayments", "bachs"] as const;
export type PayProvider = (typeof PAY_PROVIDERS)[number];

export function isCardProvider(v: string): v is CardProvider {
  return v === "paystack" || v === "flutterwave" || v === "bachs";
}

export function isPayProvider(v: string): v is PayProvider {
  return v === "paystack" || v === "flutterwave" || v === "nowpayments" || v === "bachs";
}

/** Whole naira from a whole-dollar price. Rate is naira per 1 USD. */
export function ngnFromUsd(usd: number, ngnPerUsd: number) {
  const dollars = Math.round(Number(usd));
  const rate = Math.round(Number(ngnPerUsd));
  if (!Number.isFinite(dollars) || dollars < 1) return 0;
  if (!Number.isFinite(rate) || rate < 100 || rate > 20000) return 0;
  const ngn = dollars * rate;
  return ngn < 100 ? 0 : ngn;
}

export function koboFromNgn(ngn: number) {
  return Math.round(ngn) * 100;
}

/** Loaded only when a webhook verifies a signature. Never a top-level import — that crashes the browser bundle. */
async function hmacSha512(secret: string, payload: string) {
  const { createHmac } = await import("node:crypto");
  return createHmac("sha512", secret).update(payload).digest("hex");
}

export function paystackSignature(secret: string, rawBody: string) {
  return hmacSha512(secret, rawBody);
}

function sortJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortJson);
  if (value && typeof value === "object") {
    const src = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(src).sort()) out[key] = sortJson(src[key]);
    return out;
  }
  return value;
}

/** NOWPayments IPN: HMAC-SHA512 of the recursively key-sorted JSON body. */
export function nowpaymentsSignature(secret: string, rawBody: string) {
  try {
    const sorted = sortJson(JSON.parse(rawBody) as unknown);
    return hmacSha512(secret, JSON.stringify(sorted));
  } catch {
    return Promise.resolve("");
  }
}

export function safeEqual(a: string, b: string) {
  if (a.length !== b.length || a.length === 0) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function cleanReceiptEmail(raw: string) {
  const email = raw.trim().toLowerCase().slice(0, 80);
  if (!/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(email)) return "";
  return email;
}

/** Bachs accepts decimal string amounts. */
export function bachsAmount(usd: number) {
  const n = Math.round(Number(usd));
  if (!Number.isFinite(n) || n < 1) return "0.00";
  return `${n}.00`;
}
