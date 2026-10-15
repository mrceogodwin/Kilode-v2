import { readAiKey } from "@/lib/keys-server";
import { SITE } from "@/lib/seo";
import { bachsAmount } from "@/lib/pay-money";

function origin() {
  return (process.env.SITE_URL || SITE.url || "https://kilode.ng").replace(/\/$/, "");
}

export async function bachsSecret() {
  const env = (process.env.BACHS_API_KEY || "").trim();
  if (env) return env;
  return readAiKey("bachs_secret");
}

function bachsBase(secret: string) {
  if (secret.startsWith("sk_sandbox_")) return "https://sandbox-api.bachs.io";
  return "https://api.bachs.io";
}

/** Hosted checkout with raw USD pricing + optional NGN lock. */
export async function openBachsCheckout(opts: {
  secret: string;
  email: string;
  name: string;
  reference: string;
  usd: number;
  ngn: number;
  description: string;
}) {
  const amount = bachsAmount(opts.usd);
  if (amount === "0.00") return { ok: false as const, reason: "Invalid Bachs amount." };
  const body: Record<string, unknown> = {
    pricing: {
      currency: "USD",
      amount,
      currency_options: opts.ngn >= 100 ? { NGN: `${Math.round(opts.ngn)}.00` } : undefined,
    },
    customer: { email: opts.email, name: opts.name.slice(0, 80) || "Kilode" },
    success_url: `${origin()}/pay/done`,
    cancel_url: `${origin()}/pay/done`,
    reference: opts.reference.slice(0, 128),
    metadata: { app: "kilode", reference: opts.reference, note: opts.description.slice(0, 120) },
    expires_in_minutes: 60,
  };
  // strip undefined nested
  const pricing = body.pricing as Record<string, unknown>;
  if (!pricing.currency_options) delete pricing.currency_options;

  const res = await fetch(`${bachsBase(opts.secret)}/v1/checkout-sessions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${opts.secret}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  const json = (await res.json().catch(() => null)) as {
    checkout_id?: string;
    checkout_url?: string;
    message?: string;
    error?: { message?: string };
  } | null;
  const url = json?.checkout_url || "";
  const checkoutId = String(json?.checkout_id || "");
  if (!res.ok || !url.startsWith("https://") || !checkoutId) {
    const reason = (json?.error?.message || json?.message || "Bachs did not open a checkout.").slice(0, 160);
    return { ok: false as const, reason };
  }
  return { ok: true as const, url, checkoutId };
}

export async function verifyBachsCheckout(checkoutId: string, expectUsd: number) {
  const secret = await bachsSecret();
  if (!secret || !checkoutId) return { ok: false as const, reason: "Bachs payment is not confirmed yet." };
  const res = await fetch(`${bachsBase(secret)}/v1/checkout-sessions/${encodeURIComponent(checkoutId)}`, {
    headers: { Authorization: `Bearer ${secret}`, Accept: "application/json" },
    signal: AbortSignal.timeout(12000),
  });
  const json = (await res.json().catch(() => null)) as {
    status?: string;
    amount_total?: string | number;
    currency?: string;
  } | null;
  const status = String(json?.status || "").toLowerCase();
  const paid = status === "complete" || status === "completed" || status === "paid" || status === "succeeded";
  if (!res.ok || !paid) return { ok: false as const, reason: "Bachs payment is not confirmed yet." };
  const amount = Number(json?.amount_total || 0);
  if (amount > 0 && amount + 0.01 < expectUsd) return { ok: false as const, reason: "Bachs amount is lower than the price." };
  return { ok: true as const, ngn: 0 };
}
