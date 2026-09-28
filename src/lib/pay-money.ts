import { createHmac, timingSafeEqual } from "node:crypto";

export const CARD_PROVIDERS = ["paystack", "flutterwave"] as const;
export type CardProvider = (typeof CARD_PROVIDERS)[number];

export function isCardProvider(v: string): v is CardProvider {
  return v === "paystack" || v === "flutterwave";
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
