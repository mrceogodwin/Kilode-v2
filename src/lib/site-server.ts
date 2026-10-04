import { createHash } from "node:crypto";
import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { assertStaff } from "@/lib/staff-server";
import { allowWrite, RATE_BLOCKED } from "@/lib/rate-limit";

export type ShareKey = "x" | "wa" | "tg" | "fb" | "copy";

export const DESK_PAY = ["jobs", "market", "rent", "events", "cinema"] as const;
export type DeskPay = (typeof DESK_PAY)[number];
export type DeskMoney = { paid: boolean; usd: number };

export const DEFAULT_DESKS: Record<DeskPay, DeskMoney> = {
  jobs: { paid: false, usd: 5 },
  market: { paid: false, usd: 3 },
  rent: { paid: false, usd: 5 },
  events: { paid: false, usd: 10 },
  cinema: { paid: false, usd: 4 },
};

export type PublicSite = {
  installToast: boolean;
  /** When false, hamburger omits Videos (Clips on Kilode). Default true. */
  videosMenuVisible: boolean;
  /** When false, pasted profile photo links are not shown. Default true. */
  photosOn: boolean;
  /** Account desks that skip crypto for now. Comma list: ads,events */
  payOff: string;
  /** When false, NOWPayments is hidden everywhere. */
  cryptoEnabled: boolean;
  /** Free = staff review. Paid = checkout, then the listing goes live. */
  desks: Record<DeskPay, DeskMoney>;
  /** Take videos longer than this are trimmed. Default 15. */
  takeVideoSeconds: number;
  /** Kilode click, send, comment, and request sounds. Super admin can turn them off. */
  soundsOn: boolean;
  visitorsToday: number;
  visitorsAll: number;
  members: number;
  digest: number;
  subscribers: number;
  shares: Record<ShareKey, number>;
};

const ZERO_SHARES: Record<ShareKey, number> = { x: 0, wa: 0, tg: 0, fb: 0, copy: 0 };

function onFlag(v: unknown, fallback: boolean) {
  if (v == null || v === "") return fallback;
  return !(v === 0 || v === false || v === "0");
}

function usdOf(v: unknown, fallback: number) {
  const n = Math.round(Number(v));
  if (n >= 1 && n <= 500) return n;
  return fallback;
}

function desksFrom(row: Record<string, unknown> | undefined): Record<DeskPay, DeskMoney> {
  const desks = { ...DEFAULT_DESKS, jobs: { ...DEFAULT_DESKS.jobs }, market: { ...DEFAULT_DESKS.market }, rent: { ...DEFAULT_DESKS.rent }, events: { ...DEFAULT_DESKS.events }, cinema: { ...DEFAULT_DESKS.cinema } };
  if (!row) return desks;
  for (const k of DESK_PAY) {
    desks[k] = {
      paid: onFlag(row[`${k}_is_paid`], false),
      usd: usdOf(row[`${k}_price`], DEFAULT_DESKS[k].usd),
    };
  }
  return desks;
}

function utcDay(ts = Date.now()) {
  return new Date(ts).toISOString().slice(0, 10);
}

async function ensure() {
  const sql = await getSql();
  try {
    await sql`alter table nf_site add column if not exists install_toast integer not null default 1`;
    await sql`alter table nf_site add column if not exists videos_menu_visible integer not null default 1`;
    await sql`alter table nf_site add column if not exists photos_on integer not null default 1`;
    await sql`alter table nf_site add column if not exists pay_off text not null default ''`;
    await sql`alter table nf_site add column if not exists crypto_enabled integer not null default 1`;
    await sql`alter table nf_site add column if not exists jobs_is_paid integer not null default 0`;
    await sql`alter table nf_site add column if not exists jobs_price integer not null default 5`;
    await sql`alter table nf_site add column if not exists market_is_paid integer not null default 0`;
    await sql`alter table nf_site add column if not exists market_price integer not null default 3`;
    await sql`alter table nf_site add column if not exists rent_is_paid integer not null default 0`;
    await sql`alter table nf_site add column if not exists rent_price integer not null default 5`;
    await sql`alter table nf_site add column if not exists events_is_paid integer not null default 0`;
    await sql`alter table nf_site add column if not exists events_price integer not null default 10`;
    await sql`alter table nf_site add column if not exists cinema_is_paid integer not null default 0`;
    await sql`alter table nf_site add column if not exists cinema_price integer not null default 4`;
    await sql`alter table nf_site add column if not exists take_video_seconds integer not null default 15`;
    await sql`alter table nf_site add column if not exists sounds_on integer not null default 1`;
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
  const empty: PublicSite = {
    installToast: true,
    videosMenuVisible: true,
    photosOn: true,
    payOff: "",
    cryptoEnabled: true,
    desks: {
      jobs: { ...DEFAULT_DESKS.jobs },
      market: { ...DEFAULT_DESKS.market },
      rent: { ...DEFAULT_DESKS.rent },
      events: { ...DEFAULT_DESKS.events },
      cinema: { ...DEFAULT_DESKS.cinema },
    },
    visitorsToday: 0,
    visitorsAll: 0,
    members: 0,
    digest: 0,
    subscribers: 0,
    shares: { ...ZERO_SHARES },
    takeVideoSeconds: 15,
    soundsOn: true,
  };
  try {
    const sql = await ensure();
    const today = utcDay();
    const [flag, dayRows, allRows, members, digestRows, shareRows] = await Promise.all([
      sql<{
        install_toast: number | string | boolean | null;
        videos_menu_visible: number | string | boolean | null;
        photos_on: number | string | boolean | null;
        pay_off: string | null;
        crypto_enabled: number | string | boolean | null;
        jobs_is_paid: number | string | boolean | null;
        jobs_price: number | string | null;
        market_is_paid: number | string | boolean | null;
        market_price: number | string | null;
        rent_is_paid: number | string | boolean | null;
        rent_price: number | string | null;
        events_is_paid: number | string | boolean | null;
        events_price: number | string | null;
        cinema_is_paid: number | string | boolean | null;
        cinema_price: number | string | null;
        take_video_seconds: number | string | null;
        sounds_on: number | string | boolean | null;
      }>`select install_toast, videos_menu_visible, photos_on, pay_off, crypto_enabled, jobs_is_paid, jobs_price, market_is_paid, market_price, rent_is_paid, rent_price, events_is_paid, events_price, cinema_is_paid, cinema_price, take_video_seconds, sounds_on from nf_site where id = 1 limit 1`.catch(() => []),
      sql<{ n: string | number }>`select n from nf_visits where day = ${today} limit 1`.catch(() => []),
      sql<{ n: string | number }>`select coalesce(sum(n), 0) as n from nf_visits`.catch(() => []),
      sql<{ n: string | number }>`select count(*) as n from "user"`.catch(() => []),
      sql<{ n: string | number }>`select count(*) as n from nf_digest`.catch(() => []),
      sql<{ k: string; n: string | number }>`select k, n from nf_shares`.catch(() => []),
    ]);
    const installToast =
      !flag[0] || (flag[0].install_toast !== 0 && flag[0].install_toast !== false && flag[0].install_toast !== "0");
    const videosMenuVisible =
      !flag[0] ||
      (flag[0].videos_menu_visible !== 0 &&
        flag[0].videos_menu_visible !== false &&
        flag[0].videos_menu_visible !== "0");
    const photosOn =
      !flag[0] || (flag[0].photos_on !== 0 && flag[0].photos_on !== false && flag[0].photos_on !== "0");
    const shares = { ...ZERO_SHARES };
    for (const r of shareRows) {
      if (r.k in shares) shares[r.k as ShareKey] = Number(r.n ?? 0);
    }
    const membersN = Number(members[0]?.n ?? 0);
    const digestN = Number(digestRows[0]?.n ?? 0);
    return {
      installToast,
      videosMenuVisible,
      photosOn,
      payOff: String(flag[0]?.pay_off || ""),
      cryptoEnabled: onFlag(flag[0]?.crypto_enabled, true),
      desks: desksFrom(flag[0] as Record<string, unknown> | undefined),
      visitorsToday: Number(dayRows[0]?.n ?? 0),
      visitorsAll: Number(allRows[0]?.n ?? 0),
      members: membersN,
      digest: digestN,
      subscribers: membersN + digestN,
      shares,
      takeVideoSeconds: Math.min(60, Math.max(5, Math.round(Number(flag[0]?.take_video_seconds || 15)) || 15)),
      soundsOn: onFlag(flag[0]?.sounds_on, true),
    };
  } catch {
    return empty;
  }
}

export const getPublicSite = createServerFn({ method: "GET" }).handler(async (): Promise<PublicSite> => loadPublic());

export const pingVisit = createServerFn({ method: "POST" })
  .validator((d: { sid: string }) => d)
  .handler(async ({ data }) => {
    const sid = data.sid.replace(/[^a-zA-Z0-9-]/g, "").slice(0, 64);
    if (sid.length < 8) return loadPublic();
    if (!(await allowWrite(`visit:${sid}`, 3, 60_000))) return { ...(await loadPublic()), reason: RATE_BLOCKED };
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

export async function deskCharge(desk: DeskPay) {
  const site = await loadPublic();
  return { ...site.desks[desk], cryptoEnabled: site.cryptoEnabled };
}

export const saveSiteFlags = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { installToast?: boolean; videosMenuVisible?: boolean; photosOn?: boolean; payOff?: string; cryptoEnabled?: boolean; takeVideoSeconds?: number; soundsOn?: boolean; desks?: Partial<Record<DeskPay, Partial<DeskMoney>>> }) => d)
  .handler(async ({ context, data }) => {
    await assertStaff(context.userId, "super");
    const sql = await ensure();
    const existing = await sql<{
      id: number;
      install_toast: number | string | boolean | null;
      videos_menu_visible: number | string | boolean | null;
      photos_on: number | string | boolean | null;
      pay_off: string | null;
    }>`select id, install_toast, videos_menu_visible, photos_on, pay_off from nf_site where id = 1 limit 1`.catch(() => []);
    const curToast =
      !existing[0] ||
      (existing[0].install_toast !== 0 && existing[0].install_toast !== false && existing[0].install_toast !== "0");
    const curVideos =
      !existing[0] ||
      (existing[0].videos_menu_visible !== 0 &&
        existing[0].videos_menu_visible !== false &&
        existing[0].videos_menu_visible !== "0");
    const toast = data.installToast === undefined ? (curToast ? 1 : 0) : data.installToast === false ? 0 : 1;
    const videos = data.videosMenuVisible === undefined ? (curVideos ? 1 : 0) : data.videosMenuVisible === false ? 0 : 1;
    const photos = data.photosOn === undefined ? (!existing[0] || (existing[0].photos_on !== 0 && existing[0].photos_on !== false && existing[0].photos_on !== "0") ? 1 : 0) : data.photosOn === false ? 0 : 1;
    const payOff = (data.payOff === undefined ? String(existing[0]?.pay_off || "") : data.payOff).split(",").map((s) => s.trim()).filter((s) => s === "ads" || s === "events").join(",");
    if (existing[0]) {
      await sql`update nf_site set install_toast = ${toast}, videos_menu_visible = ${videos}, photos_on = ${photos}, pay_off = ${payOff}, ts = ${Date.now()} where id = 1`;
    } else {
      await sql`insert into nf_site (id, chat_ttl_hours, install_toast, videos_menu_visible, photos_on, pay_off, ts) values (1, 24, ${toast}, ${videos}, ${photos}, ${payOff}, ${Date.now()})`;
    }
    const current = await loadPublic();
    const crypto = data.cryptoEnabled === undefined ? (current.cryptoEnabled ? 1 : 0) : data.cryptoEnabled ? 1 : 0;
    const desks = {
      jobs: { ...current.desks.jobs },
      market: { ...current.desks.market },
      rent: { ...current.desks.rent },
      events: { ...current.desks.events },
      cinema: { ...current.desks.cinema },
    };
    if (data.desks) {
      for (const k of DESK_PAY) {
        const patch = data.desks[k];
        if (!patch) continue;
        if (patch.paid !== undefined) desks[k].paid = !!patch.paid;
        if (patch.usd !== undefined) desks[k].usd = usdOf(patch.usd, desks[k].usd);
      }
    }
    await sql`update nf_site set crypto_enabled = ${crypto}, jobs_is_paid = ${desks.jobs.paid ? 1 : 0}, jobs_price = ${desks.jobs.usd}, market_is_paid = ${desks.market.paid ? 1 : 0}, market_price = ${desks.market.usd}, rent_is_paid = ${desks.rent.paid ? 1 : 0}, rent_price = ${desks.rent.usd}, events_is_paid = ${desks.events.paid ? 1 : 0}, events_price = ${desks.events.usd}, cinema_is_paid = ${desks.cinema.paid ? 1 : 0}, cinema_price = ${desks.cinema.usd} where id = 1`;
    if (typeof data.takeVideoSeconds === "number" && Number.isFinite(data.takeVideoSeconds)) {
      const secs = Math.min(60, Math.max(5, Math.round(data.takeVideoSeconds)));
      await sql`update nf_site set take_video_seconds = ${secs} where id = 1`;
    }
    if (typeof data.soundsOn === "boolean") {
      await sql`update nf_site set sounds_on = ${data.soundsOn ? 1 : 0} where id = 1`;
    }
    return { ok: true as const, installToast: toast === 1, videosMenuVisible: videos === 1, photosOn: photos === 1, payOff, cryptoEnabled: crypto === 1, desks };
  });

export const pingShare = createServerFn({ method: "POST" })
  .validator((d: { k: ShareKey }) => d)
  .handler(async ({ data }) => {
    const k = data.k;
    if (!["x", "wa", "tg", "fb", "copy"].includes(k)) return loadPublic();
    if (!(await allowWrite(`share:${k}`, 20, 60_000))) return loadPublic();
    const sql = await ensure();
    await sql`insert into nf_shares (k, n) values (${k}, 1) on conflict (k) do update set n = nf_shares.n + 1`;
    return loadPublic();
  });
