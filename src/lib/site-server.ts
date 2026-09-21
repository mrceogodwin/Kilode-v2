import { createHash } from "node:crypto";
import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { assertStaff } from "@/lib/staff-server";
import { allowWrite, RATE_BLOCKED } from "@/lib/rate-limit";

export type ShareKey = "x" | "wa" | "tg" | "fb" | "copy";

export type PublicSite = {
  installToast: boolean;
  visitorsToday: number;
  visitorsAll: number;
  members: number;
  digest: number;
  subscribers: number;
  shares: Record<ShareKey, number>;
};

const ZERO_SHARES: Record<ShareKey, number> = { x: 0, wa: 0, tg: 0, fb: 0, copy: 0 };

function utcDay(ts = Date.now()) {
  return new Date(ts).toISOString().slice(0, 10);
}

async function ensure() {
  const sql = await getSql();
  try {
    await sql`alter table nf_site add column if not exists install_toast integer not null default 1`;
  } catch {
    /* exists */
  }
  await sql`create table if not exists nf_visits (day text primary key, n integer not null default 0)`;
  await sql`create table if not exists nf_visit_seen (k text primary key, day text not null, ts bigint not null)`;
  await sql`create table if not exists nf_shares (k text primary key, n integer not null default 0)`;
  await sql`create table if not exists nf_digest (email text primary key, ts bigint not null)`;
  return sql;
}

async function loadPublic(): Promise<PublicSite> {
  try {
    const sql = await ensure();
    const flag = await sql<{ install_toast: number | string | boolean | null }>`select install_toast from nf_site where id = 1 limit 1`;
    const today = utcDay();
    const dayRows = await sql<{ n: string | number }>`select n from nf_visits where day = ${today} limit 1`;
    const allRows = await sql<{ n: string | number }>`select coalesce(sum(n), 0) as n from nf_visits`;
    const members = await sql<{ n: string | number }>`select count(*) as n from "user"`;
    const digestRows = await sql<{ n: string | number }>`select count(*) as n from nf_digest`;
    const installToast = flag[0]?.install_toast !== 0 && flag[0]?.install_toast !== false && flag[0]?.install_toast !== "0";
    const shareRows = await sql<{ k: string; n: string | number }>`select k, n from nf_shares`;
    const shares = { ...ZERO_SHARES };
    for (const r of shareRows) {
      if (r.k in shares) shares[r.k as ShareKey] = Number(r.n ?? 0);
    }
    const membersN = Number(members[0]?.n ?? 0);
    const digestN = Number(digestRows[0]?.n ?? 0);
    return {
      installToast,
      visitorsToday: Number(dayRows[0]?.n ?? 0),
      visitorsAll: Number(allRows[0]?.n ?? 0),
      members: membersN,
      digest: digestN,
      subscribers: membersN + digestN,
      shares,
    };
  } catch {
    return { installToast: true, visitorsToday: 0, visitorsAll: 0, members: 0, digest: 0, subscribers: 0, shares: { ...ZERO_SHARES } };
  }
}

export const getPublicSite = createServerFn({ method: "GET" }).handler(async (): Promise<PublicSite> => loadPublic());

export const pingVisit = createServerFn({ method: "POST" })
  .validator((d: { sid: string }) => d)
  .handler(async ({ data }) => {
    const sid = data.sid.replace(/[^a-zA-Z0-9-]/g, "").slice(0, 64);
    if (sid.length < 8) return loadPublic();
    if (!allowWrite(`visit:${sid}`, 3, 60_000)) return { ...(await loadPublic()), reason: RATE_BLOCKED };
    const sql = await ensure();
    const day = utcDay();
    const k = createHash("sha256").update(`${sid}|${day}`).digest("hex").slice(0, 32);
    const seen = await sql<{ k: string }>`select k from nf_visit_seen where k = ${k} limit 1`;
    if (!seen[0]) {
      await sql`insert into nf_visit_seen (k, day, ts) values (${k}, ${day}, ${Date.now()}) on conflict (k) do nothing`;
      await sql`insert into nf_visits (day, n) values (${day}, 1) on conflict (day) do update set n = nf_visits.n + 1`;
      try {
        await sql`delete from nf_visit_seen where ts < ${Date.now() - 3 * 86400_000}`;
      } catch {
        /* ignore */
      }
    }
    return loadPublic();
  });

export const saveSiteFlags = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { installToast?: boolean }) => d)
  .handler(async ({ context, data }) => {
    await assertStaff(context.userId, "super");
    const sql = await ensure();
    const toast = data.installToast === false ? 0 : 1;
    const existing = await sql<{ id: number }>`select id from nf_site where id = 1 limit 1`;
    if (existing[0]) await sql`update nf_site set install_toast = ${toast}, ts = ${Date.now()} where id = 1`;
    else await sql`insert into nf_site (id, chat_ttl_hours, install_toast, ts) values (1, 24, ${toast}, ${Date.now()})`;
    return { ok: true as const, installToast: toast === 1 };
  });

export const pingShare = createServerFn({ method: "POST" })
  .validator((d: { k: ShareKey }) => d)
  .handler(async ({ data }) => {
    const k = data.k;
    if (!["x", "wa", "tg", "fb", "copy"].includes(k)) return loadPublic();
    if (!allowWrite(`share:${k}`, 20, 60_000)) return loadPublic();
    const sql = await ensure();
    await sql`insert into nf_shares (k, n) values (${k}, 1) on conflict (k) do update set n = nf_shares.n + 1`;
    return loadPublic();
  });
