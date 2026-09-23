import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { assertStaff } from "@/lib/staff-server";
import { AD_SLOT_DEFS, isAdUnit, isPubId, type AdSlotKind, type AdSlotRow } from "@/lib/ad-slots";
import { safeHttpUrl, youtubeId } from "@/lib/qonvo-data";
import { allowWrite, RATE_BLOCKED } from "@/lib/rate-limit";
import { env } from "@/lib/env.server";


async function mailApi() {
  return import("@/lib/mail-send.server");
}

async function ensure() {
  const sql = await getSql();
  await sql`create table if not exists nf_ad_slots (
    id text primary key,
    kind text not null default 'image',
    enabled integer not null default 0,
    label text not null default '',
    image text not null default '',
    video text not null default '',
    link text not null default '',
    html text not null default '',
    pub_id text not null default '',
    ad_unit text not null default '',
    ts bigint not null default 0
  )`;
  try {
    await sql`alter table nf_ad_slots add column if not exists days int not null default 30`;
    await sql`alter table nf_ad_slots add column if not exists expires_at bigint`;
  } catch {
    /* exists */
  }
  await sql`create table if not exists nf_digest (email text primary key, ts bigint not null)`;
  await sql`create table if not exists nf_digest_meta (k text primary key, v text not null)`;
  return sql;
}

function rowOf(r: {
  id: string;
  kind: string;
  enabled: number | string | boolean | null;
  label: string;
  image: string;
  video: string;
  link: string;
  html: string;
  pub_id: string;
  ad_unit: string;
  days?: number | string | null;
  expires_at?: number | string | null;
}): AdSlotRow {
  const days = Number(r.days ?? 30) || 30;
  const expiresAt = r.expires_at ? Number(r.expires_at) : undefined;
  return {
    id: r.id,
    kind: (["image", "video", "google", "html"].includes(r.kind) ? r.kind : "image") as AdSlotKind,
    enabled: r.enabled === true || r.enabled === 1 || r.enabled === "1",
    label: r.label,
    image: r.image,
    video: r.video,
    link: r.link,
    html: r.html,
    pubId: r.pub_id,
    adUnit: r.ad_unit,
    days,
    expiresAt,
  };
}

export const listAdSlots = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const sql = await ensure();
    const rows = await sql<{
      id: string;
      kind: string;
      enabled: number | string | boolean | null;
      label: string;
      image: string;
      video: string;
      link: string;
      html: string;
      pub_id: string;
      ad_unit: string;
      days?: number | string | null;
      expires_at?: number | string | null;
    }>`select id, kind, enabled, label, image, video, link, html, pub_id, ad_unit, days, expires_at from nf_ad_slots`;
    const now = Date.now();
    const map = Object.fromEntries(rows.map((r) => [r.id, rowOf(r)]));
    return AD_SLOT_DEFS.map((d) => {
      const row = map[d.id] ?? { id: d.id, kind: d.kind, enabled: false, label: d.label, image: "", video: "", link: "", html: "", pubId: "", adUnit: "", days: 30 };
      if (row.expiresAt && row.expiresAt < now) return { ...row, enabled: false };
      return row;
    });
  } catch {
    return AD_SLOT_DEFS.map((d) => ({ id: d.id, kind: d.kind, enabled: false, label: d.label, image: "", video: "", link: "", html: "", pubId: "", adUnit: "" }));
  }
});

export const saveAdSlot = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { id: string; kind?: AdSlotKind; enabled?: boolean; image?: string; video?: string; link?: string; html?: string; pubId?: string; adUnit?: string; days?: number }) => d)
  .handler(async ({ context, data }) => {
    const me = await assertStaff(context.userId, "super");
    void me;
    const def = AD_SLOT_DEFS.find((s) => s.id === data.id);
    if (!def) return { ok: false as const, reason: "Unknown slot." };
    const sql = await ensure();
    const kind = data.kind ?? def.kind;
    const image = data.image?.startsWith("data:image/") ? data.image.slice(0, 900_000) : safeHttpUrl(data.image ?? "") ?? "";
    const video = youtubeId(data.video ?? "") ?? "";
    const link = safeHttpUrl(data.link ?? "") ?? "";
    const html = (data.html ?? "").slice(0, 4000);
    const pubId = isPubId(data.pubId ?? "") ? data.pubId!.trim() : "";
    const adUnit = isAdUnit(data.adUnit ?? "") ? data.adUnit!.trim() : "";
    const enabled = data.enabled ? 1 : 0;
    const days = [1, 7, 14, 30].includes(Number(data.days)) ? Number(data.days) : 30;
    const exp = data.enabled ? Date.now() + days * 86_400_000 : null;
    await sql`insert into nf_ad_slots (id, kind, enabled, label, image, video, link, html, pub_id, ad_unit, ts, days, expires_at)
      values (${def.id}, ${kind}, ${enabled}, ${def.label}, ${image}, ${video}, ${link}, ${html}, ${pubId}, ${adUnit}, ${Date.now()}, ${days}, ${exp})
      on conflict (id) do update set kind = ${kind}, enabled = ${enabled}, image = ${image}, video = ${video}, link = ${link}, html = ${html}, pub_id = ${pubId}, ad_unit = ${adUnit}, ts = ${Date.now()}, days = ${days}, expires_at = ${exp}`;
    return { ok: true as const };
  });

/** True when a real outbound mail provider is configured. Digest never fakes sends. */
async function digestMailReady() {
  const { outboundMailReady } = await mailApi();
  return outboundMailReady();
}

export const saveDigest = createServerFn({ method: "POST" })
  .validator((d: { email: string }) => d)
  .handler(async ({ data }) => {
    const ip = "digest";
    if (!allowWrite(ip, 6, 60_000)) return { ok: false as const, reason: RATE_BLOCKED };
    const email = data.email.trim().toLowerCase().slice(0, 120);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false as const, reason: "That does not look like an email." };
    const sql = await ensure();
    await sql`insert into nf_digest (email, ts) values (${email}, ${Date.now()}) on conflict (email) do update set ts = ${Date.now()}`;
    const { outboundMailReady, publicSiteOrigin, sendOutboundMail } = await mailApi();
    const ready = outboundMailReady();
    // Friendly confirm when mail is live — never required for subscribe to succeed.
    if (ready) {
      const origin = publicSiteOrigin();
      void sendOutboundMail({
        to: email,
        subject: "You’re on Kilode email updates",
        text: `Thanks for subscribing to Kilode.\n\nYou’ll get new public posts by email when they go live — one at a time, no spam.\n\nRead Feeds: ${origin}/\nUnsubscribe: reply stop or email support from this address.\n`,
        html: `<p>Thanks for subscribing to <strong>Kilode</strong>.</p><p>You’ll get new public posts by email when they go live — one at a time, no spam.</p><p><a href="${origin}/">Open Feeds</a></p>`,
      }).catch(() => undefined);
    }
    return { ok: true as const, mailReady: ready };
  });

export const listDigestCount = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await assertStaff(context.userId, "super");
    const sql = await ensure();
    const rows = await sql<{ n: string | number }>`select count(*) as n from nf_digest`;
    return { n: Number(rows[0]?.n ?? 0), mailReady: await digestMailReady() };
  });

type DigestPost = { id: string; title: string; excerpt: string | null; author: string; slug: string | null; ts: number | string };

/**
 * Hobby-safe digest fan-out: recent publish posts since last cursor, max 50 recipients / run.
 * Requires RESEND_API_KEY (preferred) or SMTP_URL / SMTP_HOST+SMTP_USER+SMTP_PASS.
 * Optional RESEND_FROM / MAIL_FROM for From: header.
 */
export async function runDigestFanout(opts?: { force?: boolean }): Promise<{
  ok: boolean;
  mailReady: boolean;
  posts: number;
  recipients: number;
  sent: number;
  failed: number;
  reason?: string;
}> {
  const { outboundMailReady, publicSiteOrigin, sendOutboundMail } = await mailApi();
  const mailReady = outboundMailReady();
  if (!mailReady) {
    return { ok: false, mailReady: false, posts: 0, recipients: 0, sent: 0, failed: 0, reason: "Set RESEND_API_KEY (or SMTP_*) on Vercel" };
  }
  const sql = await ensure();
  const meta = await sql<{ v: string }>`select v from nf_digest_meta where k = ${"last_ts"} limit 1`;
  const lastTs = opts?.force ? 0 : Number(meta[0]?.v ?? 0) || 0;
  const posts = await sql<DigestPost>`select id, title, excerpt, author, slug, ts from nf_posts where status = ${"publish"} and ts > ${lastTs} order by ts asc limit 12`;
  if (!posts.length) {
    return { ok: true, mailReady: true, posts: 0, recipients: 0, sent: 0, failed: 0, reason: "No new posts since last digest" };
  }
  const emails = await sql<{ email: string }>`select email from nf_digest order by ts desc limit 50`;
  if (!emails.length) {
    const newest = Number(posts[posts.length - 1]?.ts ?? Date.now());
    await sql`insert into nf_digest_meta (k, v) values (${"last_ts"}, ${String(newest)}) on conflict (k) do update set v = ${String(newest)}`;
    return { ok: true, mailReady: true, posts: posts.length, recipients: 0, sent: 0, failed: 0, reason: "No subscribers yet" };
  }
  const origin = publicSiteOrigin();
  const lines = posts.map((p) => {
    const href = `${origin}/p/${encodeURIComponent(p.slug || p.id)}`;
    return `• ${p.title} — @${p.author}\n  ${href}`;
  });
  const htmlItems = posts
    .map((p) => {
      const href = `${origin}/p/${encodeURIComponent(p.slug || p.id)}`;
      const ex = (p.excerpt || "").trim().slice(0, 140);
      return `<li style="margin:0 0 12px"><a href="${href}"><strong>${escapeHtml(p.title)}</strong></a><br/><span style="color:#666;font-size:13px">@${escapeHtml(p.author)}${ex ? ` — ${escapeHtml(ex)}` : ""}</span></li>`;
    })
    .join("");
  const subject =
    posts.length === 1 ? `Kilode: ${posts[0].title.slice(0, 80)}` : `Kilode: ${posts.length} new posts`;
  const text = `New on Kilode\n\n${lines.join("\n\n")}\n\nOpen Feeds: ${origin}/\n`;
  const html = `<div style="font-family:system-ui,sans-serif;line-height:1.45"><p>New on <strong>Kilode</strong></p><ul style="padding-left:18px">${htmlItems}</ul><p><a href="${origin}/">Open Feeds</a></p><p style="color:#888;font-size:12px">You’re receiving this because you subscribed on Kilode. Reply stop to leave the list.</p></div>`;

  let sent = 0;
  let failed = 0;
  for (const row of emails) {
    const r = await sendOutboundMail({ to: row.email, subject, text, html });
    if (r.ok) sent += 1;
    else failed += 1;
    // Soft pacing for Hobby / provider rate limits
    await new Promise((resolve) => setTimeout(resolve, 120));
  }
  const newest = Number(posts[posts.length - 1]?.ts ?? Date.now());
  await sql`insert into nf_digest_meta (k, v) values (${"last_ts"}, ${String(newest)}) on conflict (k) do update set v = ${String(newest)}`;
  await sql`insert into nf_digest_meta (k, v) values (${"last_run"}, ${String(Date.now())}) on conflict (k) do update set v = ${String(Date.now())}`;
  return { ok: true, mailReady: true, posts: posts.length, recipients: emails.length, sent, failed };
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Super staff trigger — same fan-out as daily cron. */
export const runDigestNow = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d?: { force?: boolean }) => d ?? {})
  .handler(async ({ context, data }) => {
    await assertStaff(context.userId, "super");
    return runDigestFanout({ force: Boolean(data.force) });
  });
