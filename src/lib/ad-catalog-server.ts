import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { assertStaff } from "@/lib/staff-server";
import { AD_PLACEMENTS } from "@/lib/qonvo-data";

export type AdCatalog = {
  dailyCap: number;
  pageSize: number;
  featuredN: number;
  prices: Record<string, number>;
  /** Missing or true = paid checkout. False = free, staff review. */
  paidSlots: Record<string, boolean>;
  heroPosts: boolean;
  heroPaid: boolean;
  heroGoogle: boolean;
  heroVideo: boolean;
  heroMs: number;
};

const DEFAULTS: AdCatalog = {
  dailyCap: 40,
  pageSize: 12,
  featuredN: 8,
  prices: Object.fromEntries(AD_PLACEMENTS.map((p) => [p.id, p.usd])),
  paidSlots: Object.fromEntries(AD_PLACEMENTS.map((p) => [p.id, true])),
  heroPosts: true,
  heroPaid: true,
  heroGoogle: true,
  heroVideo: true,
  heroMs: 7000,
};

async function table() {
  const sql = await getSql();
  await sql`create table if not exists nf_ad_catalog (k text primary key, v text not null)`;
  return sql;
}

function num(v: string | undefined, fallback: number) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export async function loadAdCatalog(): Promise<AdCatalog> {
  try {
    const sql = await table();
    const rows = await sql<{ k: string; v: string }>`select k, v from nf_ad_catalog`;
    const map = Object.fromEntries(rows.map((r) => [r.k, r.v]));
    const prices = { ...DEFAULTS.prices };
    const paidSlots = { ...DEFAULTS.paidSlots };
    for (const p of AD_PLACEMENTS) {
      const key = `price_${p.id.replace(/-/g, "_")}`;
      if (map[key]) prices[p.id] = num(map[key], p.usd);
      const paidKey = `paid_${p.id.replace(/-/g, "_")}`;
      if (map[paidKey] === "0") paidSlots[p.id] = false;
      if (map[paidKey] === "1") paidSlots[p.id] = true;
    }
    return {
      dailyCap: Math.min(200, num(map.daily_cap, DEFAULTS.dailyCap)),
      pageSize: Math.min(48, num(map.page_size, DEFAULTS.pageSize)),
      featuredN: Math.min(24, num(map.featured_n, DEFAULTS.featuredN)),
      prices,
      paidSlots,
      heroPosts: map.hero_posts !== "0",
      heroPaid: map.hero_paid !== "0",
      heroGoogle: map.hero_google !== "0",
      heroVideo: map.hero_video !== "0",
      heroMs: Math.min(15000, Math.max(4000, num(map.hero_ms, DEFAULTS.heroMs))),
    };
  } catch {
    return DEFAULTS;
  }
}

export const listAdCatalog = createServerFn({ method: "GET" }).handler(async () => loadAdCatalog());

export const saveAdCatalog = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { dailyCap?: number; pageSize?: number; featuredN?: number; prices?: Record<string, number>; paidSlots?: Record<string, boolean>; heroPosts?: boolean; heroPaid?: boolean; heroGoogle?: boolean; heroVideo?: boolean; heroMs?: number }) => d)
  .handler(async ({ context, data }) => {
    await assertStaff(context.userId, "super");
    const sql = await table();
    const pairs: [string, string][] = [];
    if (data.dailyCap) pairs.push(["daily_cap", String(Math.max(1, Math.min(200, Math.round(data.dailyCap))))]);
    if (data.pageSize) pairs.push(["page_size", String(Math.max(6, Math.min(48, Math.round(data.pageSize))))]);
    if (data.featuredN) pairs.push(["featured_n", String(Math.max(3, Math.min(24, Math.round(data.featuredN))))]);
    if (typeof data.heroPosts === "boolean") pairs.push(["hero_posts", data.heroPosts ? "1" : "0"]);
    if (typeof data.heroPaid === "boolean") pairs.push(["hero_paid", data.heroPaid ? "1" : "0"]);
    if (typeof data.heroGoogle === "boolean") pairs.push(["hero_google", data.heroGoogle ? "1" : "0"]);
    if (typeof data.heroVideo === "boolean") pairs.push(["hero_video", data.heroVideo ? "1" : "0"]);
    if (data.heroMs) pairs.push(["hero_ms", String(Math.max(4000, Math.min(15000, Math.round(data.heroMs))))]);
    if (data.prices) {
      for (const p of AD_PLACEMENTS) {
        const n = Number(data.prices[p.id]);
        if (Number.isFinite(n) && n > 0) pairs.push([`price_${p.id.replace(/-/g, "_")}`, String(Math.round(n))]);
      }
    }
    if (data.paidSlots) {
      for (const p of AD_PLACEMENTS) {
        if (typeof data.paidSlots[p.id] === "boolean") pairs.push([`paid_${p.id.replace(/-/g, "_")}`, data.paidSlots[p.id] ? "1" : "0"]);
      }
    }
    for (const [k, v] of pairs) {
      await sql`insert into nf_ad_catalog (k, v) values (${k}, ${v}) on conflict (k) do update set v = ${v}`;
    }
    return { ok: true as const, catalog: await loadAdCatalog() };
  });
