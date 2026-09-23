import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { assertStaff } from "@/lib/staff-server";
import { AD_SLOT_DEFS, isAdUnit, isPubId, type AdSlotKind, type AdSlotRow } from "@/lib/ad-slots";
import { safeHttpUrl, youtubeId } from "@/lib/qonvo-data";
import { allowWrite, RATE_BLOCKED } from "@/lib/rate-limit";
import { env } from "@/lib/env.server";

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
function digestMailReady() {
  return Boolean(env("RESEND_API_KEY") || env("SMTP_URL") || (env("SMTP_HOST") && env("SMTP_USER")));
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
    // Save-only today: no post-publish cron / Resend / SMTP sender is wired yet.
    // When adding sends, use RESEND_API_KEY (or SMTP_URL / SMTP_HOST+SMTP_USER+SMTP_PASS) and fan out one-by-one from nf_digest.
    return { ok: true as const, mailReady: digestMailReady() };
  });

export const listDigestCount = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await assertStaff(context.userId, "super");
    const sql = await ensure();
    const rows = await sql<{ n: string | number }>`select count(*) as n from nf_digest`;
    return { n: Number(rows[0]?.n ?? 0) };
  });
