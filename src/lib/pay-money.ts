import { createHmac, timingSafeEqual } from "node:crypto";

export const CARD_PROVIDERS = ["paystack", "flutterwave"] as const;
export type CardProvider = (typeof CARD_PROVIDERS)[number];
export const PAY_PROVIDERS = ["paystack", "flutterwave", "nowpayments"] as const;
export type PayProvider = (typeof PAY_PROVIDERS)[number];

export function isCardProvider(v: string): v is CardProvider {
  return v === "paystack" || v === "flutterwave";
}

export function isPayProvider(v: string): v is PayProvider {
  return v === "paystack" || v === "flutterwave" || v === "nowpayments";
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

export function paystackSignature(secret: string, rawBody: string) {
  return createHmac("sha512", secret).update(rawBody).digest("hex");
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
    return createHmac("sha512", secret).update(JSON.stringify(sorted)).digest("hex");
  } catch {
    return "";
  }
}

export function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length || left.length === 0) return false;
  return timingSafeEqual(left, right);
}

export function cleanReceiptEmail(raw: string) {
  const email = raw.trim().toLowerCase().slice(0, 80);
  if (!/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(email)) return "";
  return email;
}
