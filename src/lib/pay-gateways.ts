import { randomBytes } from "node:crypto";
import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { readAiKey } from "@/lib/keys-server";
import { allowWrite, RATE_BLOCKED } from "@/lib/rate-limit";
import { loadAdCatalog } from "@/lib/ad-catalog-server";
import { asAccountKind, isAdPlacement } from "@/lib/qonvo-data";
import { canKind, kindActionHint } from "@/lib/permissions";
import { accountEmail } from "@/lib/account-email";
import { SITE } from "@/lib/seo";
import { cleanReceiptEmail, isPayProvider, koboFromNgn, ngnFromUsd, nowpaymentsSignature, paystackSignature, safeEqual, type PayProvider } from "@/lib/pay-money";

async function ensure() {
  const sql = await getSql();
  await sql`create table if not exists nf_checkouts (
    reference text primary key,
    user_id text not null,
    kind text not null,
    purpose text not null default '',
    provider text not null,
    amount_usd integer not null,
    amount_ngn integer not null,
    status text not null default 'pending',
    used_by text not null default '',
    ts bigint not null,
    paid_at bigint not null default 0
  )`;
  try {
    await sql`alter table nf_checkouts add column if not exists provider_ref text not null default ''`;
  } catch {
    /* column already there */
  }
  return sql;
}

async function secretOf(id: "paystack_secret" | "flutterwave_secret" | "flutterwave_hash" | "nowpayments_api" | "nowpayments_ipn") {
  const env =
    id === "paystack_secret"
      ? process.env.PAYSTACK_SECRET_KEY
      : id === "flutterwave_secret"
        ? process.env.FLUTTERWAVE_SECRET_KEY || process.env.FLW_SECRET_KEY
        : id === "flutterwave_hash"
          ? process.env.FLUTTERWAVE_HASH || process.env.FLW_SECRET_HASH
          : id === "nowpayments_api"
            ? process.env.NOWPAYMENTS_API_KEY
            : process.env.NOWPAYMENTS_IPN_SECRET;
  const fromEnv = env?.trim() || "";
  if (fromEnv) return fromEnv;
  return readAiKey(id);
}

async function rateOf() {
  const env = Number(process.env.KILODE_NGN_PER_USD || "");
  if (env >= 100 && env <= 20000) return Math.round(env);
  const raw = Number(await readAiKey("ngn_per_usd"));
  if (raw >= 100 && raw <= 20000) return Math.round(raw);
  return 1600;
}

async function verifyUsd() {
  const env = Number(process.env.KILODE_VERIFY_USD || "");
  if (env >= 1 && env <= 500) return Math.round(env);
  const raw = Number(await readAiKey("verify_usd"));
  if (raw >= 1 && raw <= 500) return Math.round(raw);
  return 5;
}

async function eventUsd() {
  const env = Number(process.env.KILODE_EVENT_USD || "");
  if (env >= 1 && env <= 500) return Math.round(env);
  const raw = Number(await readAiKey("event_usd"));
  if (raw >= 1 && raw <= 500) return Math.round(raw);
  return 10;
}

async function quote(kind: "ad" | "event" | "verify", purpose: string) {
  const rate = await rateOf();
  if (kind === "verify") {
    const usd = await verifyUsd();
    const ngn = ngnFromUsd(usd, rate);
    if (!ngn) return null;
    return { usd, ngn, purpose: "badge" };
  }
  if (kind === "event") {
    const usd = await eventUsd();
    const ngn = ngnFromUsd(usd, rate);
    if (!ngn) return null;
    return { usd, ngn, purpose: "listing" };
  }
  if (!isAdPlacement(purpose)) return null;
  const catalog = await loadAdCatalog();
  const usd = Math.round(catalog.prices[purpose] || 0);
  const ngn = ngnFromUsd(usd, rate);
  if (!ngn) return null;
  return { usd, ngn, purpose };
}

function origin() {
  return (process.env.SITE_URL || SITE.url || "https://kilode.ng").replace(/\/$/, "");
}

async function payerEmail(userId: string, receipt: string) {
  const typed = cleanReceiptEmail(receipt);
  if (typed) return typed;
  const sql = await getSql();
  const rows = await sql<{ handle: string | null }>`select handle from nf_profiles where user_id = ${userId} limit 1`;
  return accountEmail(rows[0]?.handle || userId.slice(0, 12));
}

async function openPaystack(opts: { secret: string; email: string; reference: string; ngn: number }) {
  const res = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: { Authorization: `Bearer ${opts.secret}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      email: opts.email,
      amount: koboFromNgn(opts.ngn),
      currency: "NGN",
      reference: opts.reference,
      callback_url: `${origin()}/pay/done`,
      metadata: { app: "kilode", reference: opts.reference },
    }),
    signal: AbortSignal.timeout(12000),
  });
  const json = (await res.json().catch(() => null)) as { status?: boolean; message?: string; data?: { authorization_url?: string } } | null;
  const url = json?.data?.authorization_url || "";
  if (!res.ok || !json?.status || !url.startsWith("https://")) return { ok: false as const, reason: (json?.message || "Paystack did not open a checkout.").slice(0, 160) };
  return { ok: true as const, url };
}

async function openFlutterwave(opts: { secret: string; email: string; reference: string; ngn: number; name: string }) {
  const res = await fetch("https://api.flutterwave.com/v3/payments", {
    method: "POST",
    headers: { Authorization: `Bearer ${opts.secret}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      tx_ref: opts.reference,
      amount: opts.ngn,
      currency: "NGN",
      redirect_url: `${origin()}/pay/done`,
      customer: { email: opts.email, name: opts.name },
      customizations: { title: "Kilode", description: "Kilode listing payment" },
      meta: { app: "kilode" },
    }),
    signal: AbortSignal.timeout(12000),
  });
  const json = (await res.json().catch(() => null)) as { status?: string; message?: string; data?: { link?: string } } | null;
  const url = json?.data?.link || "";
  if (!res.ok || json?.status !== "success" || !url.startsWith("https://")) return { ok: false as const, reason: (json?.message || "Flutterwave did not open a checkout.").slice(0, 160) };
  return { ok: true as const, url };
}

async function openNowPayments(opts: { apiKey: string; reference: string; usd: number; description: string }) {
  const res = await fetch("https://api.nowpayments.io/v1/invoice", {
    method: "POST",
    headers: { "x-api-key": opts.apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      price_amount: opts.usd,
      price_currency: "usd",
      order_id: opts.reference,
      order_description: opts.description.slice(0, 140),
      ipn_callback_url: `${origin()}/api/pay/nowpayments`,
      success_url: `${origin()}/pay/done`,
      cancel_url: `${origin()}/pay/done`,
    }),
    signal: AbortSignal.timeout(12000),
  });
  const json = (await res.json().catch(() => null)) as { id?: string | number; invoice_url?: string; message?: string } | null;
  const url = json?.invoice_url || "";
  const invoiceId = String(json?.id || "");
  if (!res.ok || !url.startsWith("https://") || !invoiceId) {
    return { ok: false as const, reason: (json?.message || "Crypto checkout did not open.").slice(0, 160) };
  }
  return { ok: true as const, url, invoiceId };
}

const PAID_CRYPTO = new Set(["finished", "confirmed"]);

async function verifyNowPayments(invoiceId: string, expectUsd: number): Promise<Verify> {
  const key = await secretOf("nowpayments_api");
  if (!key || !invoiceId) return { ok: false, reason: "Crypto payment is not confirmed yet." };
  const res = await fetch(`https://api.nowpayments.io/v1/invoice-payment/${encodeURIComponent(invoiceId)}`, {
    headers: { "x-api-key": key },
    signal: AbortSignal.timeout(12000),
  });
  const json = (await res.json().catch(() => null)) as
    | { payment_status?: string; price_amount?: number | string }
    | { payment_status?: string; price_amount?: number | string }[]
    | null;
  const row = Array.isArray(json) ? json[0] : json;
  const status = String(row?.payment_status || "");
  if (!PAID_CRYPTO.has(status)) return { ok: false, reason: "Crypto payment is not confirmed yet." };
  const amount = Number(row?.price_amount || 0);
  if (amount > 0 && amount + 0.01 < expectUsd) return { ok: false, reason: "Crypto amount is lower than the price." };
  return { ok: true, ngn: 0 };
}

type Verify = { ok: true; ngn: number } | { ok: false; reason: string };

async function verifyWithProvider(provider: PayProvider, reference: string, expectNgn: number, expectUsd = 0, invoiceId = ""): Promise<Verify> {
  if (provider === "nowpayments") return verifyNowPayments(invoiceId, expectUsd);
  if (provider === "paystack") {
    const secret = await secretOf("paystack_secret");
    if (!secret) return { ok: false, reason: "Paystack is not set up yet." };
    const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${secret}` },
      signal: AbortSignal.timeout(12000),
    });
    const json = (await res.json().catch(() => null)) as { data?: { status?: string; currency?: string; amount?: number } } | null;
    const data = json?.data;
    if (data?.status !== "success" || data.currency !== "NGN") return { ok: false, reason: "Paystack has not confirmed this payment." };
    if (Number(data.amount) < koboFromNgn(expectNgn)) return { ok: false, reason: "Paystack amount is lower than the price." };
    return { ok: true, ngn: expectNgn };
  }
  const secret = await secretOf("flutterwave_secret");
  if (!secret) return { ok: false, reason: "Flutterwave is not set up yet." };
  const res = await fetch(`https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${secret}` },
    signal: AbortSignal.timeout(12000),
  });
  const json = (await res.json().catch(() => null)) as { data?: { status?: string; currency?: string; amount?: number } } | null;
  const data = json?.data;
  if (data?.status !== "successful" || data.currency !== "NGN") return { ok: false, reason: "Flutterwave has not confirmed this payment." };
  if (Number(data.amount) + 0.01 < expectNgn) return { ok: false, reason: "Flutterwave amount is lower than the price." };
  return { ok: true, ngn: expectNgn };
}

export const listPayMethods = createServerFn({ method: "GET" }).handler(async () => {
  const [paystack, flutterwave, nowpayments, ngnPerUsd, listingUsd, badgeUsd] = await Promise.all([
    secretOf("paystack_secret"),
    secretOf("flutterwave_secret"),
    secretOf("nowpayments_api"),
    rateOf(),
    eventUsd(),
    verifyUsd(),
  ]);
  return {
    paystack: Boolean(paystack),
    flutterwave: Boolean(flutterwave),
    nowpayments: Boolean(nowpayments),
    ngnPerUsd,
    eventUsd: listingUsd,
    verifyUsd: badgeUsd,
  };
});

export const startCheckout = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { provider?: string; kind?: string; purpose?: string; email?: string }) => d)
  .handler(async ({ context, data }) => {
    const provider = String(data.provider || "");
    const kind = data.kind === "event" ? "event" : data.kind === "verify" ? "verify" : data.kind === "ad" ? "ad" : "";
    if (!isPayProvider(provider) || !kind) return { ok: false as const, reason: "Pick Paystack, Flutterwave, or crypto." };
    if (!(await allowWrite(`pay:${context.userId}`, 8, 600_000))) return { ok: false as const, reason: RATE_BLOCKED };
    if (kind === "ad") {
      const sql = await getSql();
      const rows = await sql<{ kind: string | null }>`select kind from nf_profiles where user_id = ${context.userId} limit 1`;
      if (!canKind(asAccountKind(rows[0]?.kind), "ads.submit")) return { ok: false as const, reason: kindActionHint("ads.submit") };
    }
    const priced = await quote(kind, String(data.purpose || ""));
    if (!priced) return { ok: false as const, reason: "That price is not set." };
    const secretId = provider === "paystack" ? "paystack_secret" : provider === "flutterwave" ? "flutterwave_secret" : "nowpayments_api";
    const secret = await secretOf(secretId);
    if (!secret) {
      return {
        ok: false as const,
        reason: provider === "paystack" ? "Paystack is not set up yet." : provider === "flutterwave" ? "Flutterwave is not set up yet." : "Crypto checkout is not set up yet.",
      };
    }
    const reference = `kld_${randomBytes(9).toString("hex")}`;
    const email = await payerEmail(context.userId, String(data.email || ""));
    const sql = await ensure();
    await sql`insert into nf_checkouts (reference, user_id, kind, purpose, provider, amount_usd, amount_ngn, status, used_by, ts, paid_at, provider_ref)
      values (${reference}, ${context.userId}, ${kind}, ${priced.purpose}, ${provider}, ${priced.usd}, ${priced.ngn}, ${"pending"}, ${""}, ${Date.now()}, ${0}, ${""})`;
    const opened =
      provider === "paystack"
        ? await openPaystack({ secret, email, reference, ngn: priced.ngn })
        : provider === "flutterwave"
          ? await openFlutterwave({ secret, email, reference, ngn: priced.ngn, name: email.split("@")[0] || "Kilode" })
          : await openNowPayments({ apiKey: secret, reference, usd: priced.usd, description: `Kilode ${kind} ${priced.purpose}` });
    if (!opened.ok) {
      await sql`delete from nf_checkouts where reference = ${reference} and status = ${"pending"}`;
      return opened;
    }
    if ("invoiceId" in opened && opened.invoiceId) {
      await sql`update nf_checkouts set provider_ref = ${opened.invoiceId} where reference = ${reference}`;
    }
    return { ok: true as const, reference, url: opened.url, amountNgn: priced.ngn, amountUsd: priced.usd, provider };
  });

export const confirmCheckout = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { reference?: string }) => d)
  .handler(async ({ context, data }) => {
    const reference = String(data.reference || "").trim().slice(0, 80);
    if (!reference.startsWith("kld_")) return { ok: false as const, reason: "Unknown payment." };
    const sql = await ensure();
    const rows = await sql<{ user_id: string; provider: string; amount_ngn: number; amount_usd: number; status: string; provider_ref: string }>`
      select user_id, provider, amount_ngn, amount_usd, status, provider_ref from nf_checkouts where reference = ${reference} limit 1`;
    const row = rows[0];
    if (!row || row.user_id !== context.userId) return { ok: false as const, reason: "That payment is not on this account." };
    if (row.status === "paid" || row.status === "used") return { ok: true as const, reference, amountNgn: Number(row.amount_ngn), status: row.status };
    if (!isPayProvider(row.provider)) return { ok: false as const, reason: "Unknown payment." };
    const verified = await verifyWithProvider(row.provider, reference, Number(row.amount_ngn), Number(row.amount_usd), row.provider_ref || "");
    if (!verified.ok) return { ok: false as const, reason: verified.reason };
    await sql`update nf_checkouts set status = ${"paid"}, paid_at = ${Date.now()} where reference = ${reference} and status = ${"pending"}`;
    return { ok: true as const, reference, amountNgn: Number(row.amount_ngn), status: "paid" };
  });

async function grantVerified(userId: string, reference: string) {
  const sql = await getSql();
  try {
    await sql.query(`ALTER TABLE nf_profiles ADD COLUMN IF NOT EXISTS verified INTEGER NOT NULL DEFAULT 0`);
  } catch {
    /* exists */
  }
  await sql`update nf_profiles set verified = ${1} where user_id = ${userId}`;
  const who = await sql<{ handle: string | null }>`select handle from nf_profiles where user_id = ${userId} limit 1`;
  const handle = (who[0]?.handle || "").slice(0, 24);
  await sql`create table if not exists nf_verify_requests (
    user_id text primary key,
    handle text not null default '',
    reference text not null,
    status text not null default 'approved',
    ts bigint not null
  )`;
  const cur = await sql<{ user_id: string }>`select user_id from nf_verify_requests where user_id = ${userId} limit 1`;
  if (cur[0]) {
    await sql`update nf_verify_requests set handle = ${handle}, reference = ${reference.slice(0, 80)}, status = ${"approved"}, ts = ${Date.now()} where user_id = ${userId}`;
  } else {
    await sql`insert into nf_verify_requests (user_id, handle, reference, status, ts) values (${userId}, ${handle}, ${reference.slice(0, 80)}, ${"approved"}, ${Date.now()})`;
  }
  const note = "Kilode: your badge is on. Payment confirmed, so verification is live on your name.";
  try {
    await sql`insert into nf_notes (id, user_id, text, href, ts, seen) values (${`n-${Date.now().toString(36)}`}, ${userId}, ${note}, ${`/u/${handle}`}, ${Date.now()}, ${0})`;
  } catch {
    /* bell can miss */
  }
}

export const submitVerification = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { reference?: string }) => d)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const already = await sql<{ verified: number | boolean | null }>`select verified from nf_profiles where user_id = ${context.userId} limit 1`;
    if (already[0]?.verified === true || Number(already[0]?.verified) === 1) return { ok: true as const, status: "verified" as const };
    const taken = await takePaidCheckout({
      reference: String(data.reference || ""),
      userId: context.userId,
      kind: "verify",
      purpose: "badge",
      refId: context.userId,
    });
    if (!taken.ok) return taken;
    await grantVerified(context.userId, String(data.reference || ""));
    return { ok: true as const, status: "verified" as const };
  });

export async function takePaidCheckout(opts: { reference: string; userId: string; kind: "ad" | "event" | "verify"; purpose: string; refId: string }) {
  const reference = opts.reference.trim().slice(0, 80);
  if (!reference.startsWith("kld_")) return { ok: false as const, reason: "Pay with Paystack, Flutterwave, or crypto first." };
  const sql = await ensure();
  const rows = await sql<{ user_id: string; kind: string; purpose: string; status: string; amount_ngn: number; provider: string }>`
    select user_id, kind, purpose, status, amount_ngn, provider from nf_checkouts where reference = ${reference} limit 1`;
  const row = rows[0];
  if (!row || row.user_id !== opts.userId) return { ok: false as const, reason: "That payment is not on this account." };
  if (row.kind !== opts.kind || row.purpose !== opts.purpose) return { ok: false as const, reason: "This payment was for a different item." };
  if (row.status === "used") return { ok: false as const, reason: "This payment was already used." };
  if (row.status !== "paid") return { ok: false as const, reason: "Payment is not confirmed yet." };
  const taken = await sql<{ reference: string }>`
    update nf_checkouts set status = ${"used"}, used_by = ${opts.refId}
    where reference = ${reference} and status = ${"paid"} and user_id = ${opts.userId}
    returning reference`;
  if (!taken[0]) return { ok: false as const, reason: "This payment was already used." };
  return { ok: true as const, note: `${row.provider} verified · ₦${row.amount_ngn}`.slice(0, 180), amount: String(row.amount_ngn), provider: row.provider };
}

export async function releaseCheckout(reference: string, refId: string) {
  const sql = await ensure();
  await sql`update nf_checkouts set status = ${"paid"}, used_by = ${""} where reference = ${reference} and used_by = ${refId} and status = ${"used"}`;
}

export const pingGateway = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { provider?: string }) => d)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const staff = await sql<{ role: string }>`select role from nf_staff where user_id = ${context.userId} limit 1`;
    if (staff[0]?.role !== "super") throw new Error("Forbidden");
    const provider = String(data.provider || "");
    if (provider === "paystack") {
      const secret = await secretOf("paystack_secret");
      if (!secret) return { ok: false as const, reason: "Paste the Paystack secret first." };
      const res = await fetch("https://api.paystack.co/balance", { headers: { Authorization: `Bearer ${secret}` }, signal: AbortSignal.timeout(12000) });
      return res.ok ? { ok: true as const, reason: "Paystack answered." } : { ok: false as const, reason: "Paystack rejected that secret." };
    }
    if (provider === "flutterwave") {
      const secret = await secretOf("flutterwave_secret");
      if (!secret) return { ok: false as const, reason: "Paste the Flutterwave secret first." };
      const res = await fetch("https://api.flutterwave.com/v3/balances", { headers: { Authorization: `Bearer ${secret}` }, signal: AbortSignal.timeout(12000) });
      return res.ok ? { ok: true as const, reason: "Flutterwave answered." } : { ok: false as const, reason: "Flutterwave rejected that secret." };
    }
    if (provider === "nowpayments") {
      const secret = await secretOf("nowpayments_api");
      if (!secret) return { ok: false as const, reason: "Paste the NOWPayments API key first." };
      const res = await fetch("https://api.nowpayments.io/v1/status", { headers: { "x-api-key": secret }, signal: AbortSignal.timeout(12000) });
      return res.ok ? { ok: true as const, reason: "NOWPayments answered." } : { ok: false as const, reason: "NOWPayments rejected that key." };
    }
    return { ok: false as const, reason: "Unknown provider." };
  });

export async function markCheckoutFromWebhook(provider: PayProvider, reference: string, paidUsd?: number) {
  const sql = await ensure();
  const rows = await sql<{ user_id: string; kind: string; purpose: string; amount_ngn: number; amount_usd: number; status: string; provider_ref: string }>`
    select user_id, kind, purpose, amount_ngn, amount_usd, status, provider_ref from nf_checkouts where reference = ${reference} and provider = ${provider} limit 1`;
  const row = rows[0];
  if (!row) return { ok: false as const, status: 404 };
  if (row.status !== "paid" && row.status !== "used") {
    if (provider === "nowpayments") {
      if (paidUsd != null && Number(paidUsd) + 0.01 < Number(row.amount_usd)) return { ok: false as const, status: 409 };
    } else {
      const verified = await verifyWithProvider(provider, reference, Number(row.amount_ngn), Number(row.amount_usd), row.provider_ref || "");
      if (!verified.ok) return { ok: false as const, status: 409 };
    }
    await sql`update nf_checkouts set status = ${"paid"}, paid_at = ${Date.now()} where reference = ${reference} and status = ${"pending"}`;
  }
  if (row.kind === "verify") {
    await takePaidCheckout({
      reference,
      userId: row.user_id,
      kind: "verify",
      purpose: row.purpose || "badge",
      refId: row.user_id,
    }).catch(() => undefined);
    await grantVerified(row.user_id, reference);
  }
  return { ok: true as const, status: 200 };
}

export async function handlePaystackWebhook(raw: string, signature: string) {
  const secret = await secretOf("paystack_secret");
  if (!secret || !safeEqual(signature || "", paystackSignature(secret, raw))) return new Response("bad signature", { status: 401 });
  let reference = "";
  try {
    const body = JSON.parse(raw) as { event?: string; data?: { reference?: string } };
    if (body.event !== "charge.success") return new Response("ok", { status: 200 });
    reference = String(body.data?.reference || "");
  } catch {
    return new Response("bad json", { status: 400 });
  }
  const result = await markCheckoutFromWebhook("paystack", reference);
  return new Response(result.ok ? "ok" : "not verified", { status: result.status });
}

export async function handleFlutterwaveWebhook(raw: string, verifHash: string) {
  const hash = await secretOf("flutterwave_hash");
  if (!hash) return new Response("hash not set", { status: 503 });
  if (!safeEqual(verifHash || "", hash)) return new Response("bad hash", { status: 401 });
  let reference = "";
  try {
    const body = JSON.parse(raw) as { data?: { tx_ref?: string; status?: string } };
    if (body.data?.status && body.data.status !== "successful") return new Response("ok", { status: 200 });
    reference = String(body.data?.tx_ref || "");
  } catch {
    return new Response("bad json", { status: 400 });
  }
  const result = await markCheckoutFromWebhook("flutterwave", reference);
  return new Response(result.ok ? "ok" : "not verified", { status: result.status });
}

export async function handleNowPaymentsWebhook(raw: string, signature: string) {
  const secret = await secretOf("nowpayments_ipn");
  if (!secret) return new Response("ipn secret not set", { status: 503 });
  if (!safeEqual(signature || "", nowpaymentsSignature(secret, raw))) return new Response("bad signature", { status: 401 });
  let reference = "";
  let status = "";
  let paidUsd = 0;
  try {
    const body = JSON.parse(raw) as { payment_status?: string; order_id?: string; price_amount?: number | string };
    status = String(body.payment_status || "");
    reference = String(body.order_id || "");
    paidUsd = Number(body.price_amount || 0);
  } catch {
    return new Response("bad json", { status: 400 });
  }
  if (!PAID_CRYPTO.has(status)) return new Response("ok", { status: 200 });
  const result = await markCheckoutFromWebhook("nowpayments", reference, paidUsd);
  return new Response(result.ok ? "ok" : "not verified", { status: result.status });
}
