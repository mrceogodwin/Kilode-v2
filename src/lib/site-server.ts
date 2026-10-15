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
  videosMenuVisible: boolean;
  photosOn: boolean;
  payOff: string;
  cryptoEnabled: boolean;
  paystackEnabled: boolean;
  flutterwaveEnabled: boolean;
  bachsEnabled: boolean;
  desks: Record<DeskPay, DeskMoney>;
  takeVideoSeconds: number;
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
  const desks = {
    jobs: { ...DEFAULT_DESKS.jobs },
    market: { ...DEFAULT_DESKS.market },
    rent: { ...DEFAULT_DESKS.rent },
    events: { ...DEFAULT_DESKS.events },
    cinema: { ...DEFAULT_DESKS.cinema },
  };
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
    await sql`alter table nf_site add column if not exists paystack_enabled integer not null default 1`;
    await sql`alter table nf_site add column if not exists flutterwave_enabled integer not null default 1`;
    await sql`alter table nf_site add column if not exists bachs_enabled integer not null default 1`;
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
    paystackEnabled: true,
    flutterwaveEnabled: true,
    bachsEnabled: true,
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
      sql<Record<string, unknown>>`select install_toast, videos_menu_visible, photos_on, pay_off, crypto_enabled, paystack_enabled, flutterwave_enabled, bachs_enabled, jobs_is_paid, jobs_price, market_is_paid, market_price, rent_is_paid, rent_price, events_is_paid, events_price, cinema_is_paid, cinema_price, take_video_seconds, sounds_on from nf_site where id = 1 limit 1`.catch(() => []),
      sql<{ n: string | number }>`select n from nf_visits where day = ${today} limit 1`.catch(() => []),
      sql<{ n: string | number }>`select coalesce(sum(n), 0) as n from nf_visits`.catch(() => []),
      sql<{ n: string | number }>`select count(*) as n from "user"`.catch(() => []),
      sql<{ n: string | number }>`select count(*) as n from nf_digest`.catch(() => []),
      sql<{ k: string; n: string | number }>`select k, n from nf_shares`.catch(() => []),
    ]);
    const row = flag[0] as Record<string, unknown> | undefined;
    const shares = { ...ZERO_SHARES };
    for (const r of shareRows) {
      if (r.k in shares) shares[r.k as ShareKey] = Number(r.n ?? 0);
    }
    const membersN = Number(members[0]?.n ?? 0);
    const digestN = Number(digestRows[0]?.n ?? 0);
    return {
      installToast: onFlag(row?.install_toast, true),
      videosMenuVisible: onFlag(row?.videos_menu_visible, true),
      photosOn: onFlag(row?.photos_on, true),
      payOff: String(row?.pay_off || ""),
      cryptoEnabled: onFlag(row?.crypto_enabled, true),
      paystackEnabled: onFlag(row?.paystack_enabled, true),
      flutterwaveEnabled: onFlag(row?.flutterwave_enabled, true),
      bachsEnabled: onFlag(row?.bachs_enabled, true),
      desks: desksFrom(row),
      visitorsToday: Number(dayRows[0]?.n ?? 0),
      visitorsAll: Number(allRows[0]?.n ?? 0),
      members: membersN,
      digest: digestN,
      subscribers: membersN + digestN,
      shares,
      takeVideoSeconds: Math.min(60, Math.max(5, Math.round(Number(row?.take_video_seconds || 15)) || 15)),
      soundsOn: onFlag(row?.sounds_on, true),
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
  return {
    ...site.desks[desk],
    cryptoEnabled: site.cryptoEnabled,
    paystackEnabled: site.paystackEnabled,
    flutterwaveEnabled: site.flutterwaveEnabled,
    bachsEnabled: site.bachsEnabled,
  };
}

export const saveSiteFlags = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    (d: {
      installToast?: boolean;
      videosMenuVisible?: boolean;
      photosOn?: boolean;
      payOff?: string;
      cryptoEnabled?: boolean;
      paystackEnabled?: boolean;
      flutterwaveEnabled?: boolean;
      bachsEnabled?: boolean;
      takeVideoSeconds?: number;
      soundsOn?: boolean;
      desks?: Partial<Record<DeskPay, Partial<DeskMoney>>>;
    }) => d,
  )
  .handler(async ({ context, data }) => {
    await assertStaff(context.userId, "super");
    const sql = await ensure();
    const existing = await sql<{ id: number; install_toast: unknown; videos_menu_visible: unknown; photos_on: unknown; pay_off: string | null }>`select id, install_toast, videos_menu_visible, photos_on, pay_off from nf_site where id = 1 limit 1`.catch(() => []);
    const toast = data.installToast === undefined ? (onFlag(existing[0]?.install_toast, true) ? 1 : 0) : data.installToast ? 1 : 0;
    const videos = data.videosMenuVisible === undefined ? (onFlag(existing[0]?.videos_menu_visible, true) ? 1 : 0) : data.videosMenuVisible ? 1 : 0;
    const photos = data.photosOn === undefined ? (onFlag(existing[0]?.photos_on, true) ? 1 : 0) : data.photosOn ? 1 : 0;
    const payOff = (data.payOff === undefined ? String(existing[0]?.pay_off || "") : data.payOff)
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s === "ads" || s === "events")
      .join(",");
    if (existing[0]) {
      await sql`update nf_site set install_toast = ${toast}, videos_menu_visible = ${videos}, photos_on = ${photos}, pay_off = ${payOff}, ts = ${Date.now()} where id = 1`;
    } else {
      await sql`insert into nf_site (id, chat_ttl_hours, install_toast, videos_menu_visible, photos_on, pay_off, ts) values (1, 24, ${toast}, ${videos}, ${photos}, ${payOff}, ${Date.now()})`;
    }
    const current = await loadPublic();
    const crypto = data.cryptoEnabled === undefined ? (current.cryptoEnabled ? 1 : 0) : data.cryptoEnabled ? 1 : 0;
    const paystack = data.paystackEnabled === undefined ? (current.paystackEnabled ? 1 : 0) : data.paystackEnabled ? 1 : 0;
    const flutterwave = data.flutterwaveEnabled === undefined ? (current.flutterwaveEnabled ? 1 : 0) : data.flutterwaveEnabled ? 1 : 0;
    const bachs = data.bachsEnabled === undefined ? (current.bachsEnabled ? 1 : 0) : data.bachsEnabled ? 1 : 0;
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
    await sql`update nf_site set crypto_enabled = ${crypto}, paystack_enabled = ${paystack}, flutterwave_enabled = ${flutterwave}, bachs_enabled = ${bachs}, jobs_is_paid = ${desks.jobs.paid ? 1 : 0}, jobs_price = ${desks.jobs.usd}, market_is_paid = ${desks.market.paid ? 1 : 0}, market_price = ${desks.market.usd}, rent_is_paid = ${desks.rent.paid ? 1 : 0}, rent_price = ${desks.rent.usd}, events_is_paid = ${desks.events.paid ? 1 : 0}, events_price = ${desks.events.usd}, cinema_is_paid = ${desks.cinema.paid ? 1 : 0}, cinema_price = ${desks.cinema.usd} where id = 1`;
    if (typeof data.takeVideoSeconds === "number" && Number.isFinite(data.takeVideoSeconds)) {
      const secs = Math.min(60, Math.max(5, Math.round(data.takeVideoSeconds)));
      await sql`update nf_site set take_video_seconds = ${secs} where id = 1`;
    }
    if (typeof data.soundsOn === "boolean") {
      await sql`update nf_site set sounds_on = ${data.soundsOn ? 1 : 0} where id = 1`;
    }
    return {
      ok: true as const,
      installToast: toast === 1,
      videosMenuVisible: videos === 1,
      photosOn: photos === 1,
      payOff,
      cryptoEnabled: crypto === 1,
      paystackEnabled: paystack === 1,
      flutterwaveEnabled: flutterwave === 1,
      bachsEnabled: bachs === 1,
      desks,
    };
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
