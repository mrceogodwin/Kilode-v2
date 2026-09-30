import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware, optionalAuthMiddleware } from "@/lib/auth/middleware";
import { safeHttpUrl } from "@/lib/qonvo-data";
import { gateText } from "@/lib/mod-cache";
import { allowWrite, RATE_BLOCKED } from "@/lib/rate-limit";
import { verifyCryptoTx } from "@/lib/pay-match";
import { isCardProvider } from "@/lib/pay-money";
import { deskCharge } from "@/lib/site-server";

const CATS = ["tech", "music", "culture", "cinema", "food", "sports"] as const;
export type EventCat = (typeof CATS)[number];

export type EEvent = {
  id: string;
  title: string;
  blurb: string;
  category: EventCat;
  place: string;
  link: string;
  cover: string;
  ticket: string;
  startsAt: number;
  endsAt: number;
  status: string;
  flagship: boolean;
  submitter: string;
  rsvps: number;
  mine: boolean;
  coin: string;
  amount: string;
  txHash: string;
  matchNote: string;
};

function nid() {
  return `e-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function catOf(v: string): EventCat {
  return (CATS as readonly string[]).includes(v) ? (v as EventCat) : "culture";
}

function num(v: unknown) {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

async function staffRole(userId: string) {
  const sql = await getSql();
  try {
    const rows = await sql<{ role: string }>`select role from nf_staff where user_id = ${userId} limit 1`;
    return rows[0]?.role ?? null;
  } catch {
    return null;
  }
}

async function handleOf(userId: string) {
  const sql = await getSql();
  const rows = await sql<{ handle: string }>`select handle from nf_profiles where user_id = ${userId} limit 1`;
  return String(rows[0]?.handle || "member").slice(0, 24);
}

async function ensure() {
  const sql = await getSql();
  await sql.query(`CREATE TABLE IF NOT EXISTS nf_events (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    blurb TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL DEFAULT 'culture',
    place TEXT NOT NULL DEFAULT '',
    link TEXT NOT NULL DEFAULT '',
    cover TEXT NOT NULL DEFAULT '',
    starts_at BIGINT NOT NULL,
    ends_at BIGINT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    flagship INTEGER NOT NULL DEFAULT 0,
    submitter TEXT NOT NULL DEFAULT '',
    user_id TEXT,
    ts BIGINT NOT NULL
  )`);
  await sql.query(`ALTER TABLE nf_events ADD COLUMN IF NOT EXISTS coin TEXT NOT NULL DEFAULT ''`);
  await sql.query(`ALTER TABLE nf_events ADD COLUMN IF NOT EXISTS amount TEXT NOT NULL DEFAULT ''`);
  await sql.query(`ALTER TABLE nf_events ADD COLUMN IF NOT EXISTS tx_hash TEXT NOT NULL DEFAULT ''`);
  await sql.query(`ALTER TABLE nf_events ADD COLUMN IF NOT EXISTS match_note TEXT NOT NULL DEFAULT ''`);
  await sql.query(`ALTER TABLE nf_events ADD COLUMN IF NOT EXISTS ticket TEXT NOT NULL DEFAULT ''`);
  await sql.query(`CREATE TABLE IF NOT EXISTS nf_event_rsvp (
    event_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    ts BIGINT NOT NULL,
    PRIMARY KEY (event_id, user_id)
  )`);
}

function mapRow(r: Record<string, unknown>, mine: boolean): EEvent {
  return {
    id: String(r.id),
    title: String(r.title || ""),
    blurb: String(r.blurb || ""),
    category: catOf(String(r.category || "")),
    place: String(r.place || ""),
    link: String(r.link || ""),
    cover: String(r.cover || ""),
    ticket: String(r.ticket || ""),
    startsAt: num(r.starts_at),
    endsAt: num(r.ends_at),
    status: String(r.status || "pending"),
    flagship: num(r.flagship) === 1,
    submitter: String(r.submitter || ""),
    rsvps: num(r.rsvps),
    mine,
    coin: String(r.coin || ""),
    amount: String(r.amount || ""),
    txHash: String(r.tx_hash || ""),
    matchNote: String(r.match_note || ""),
  };
}

export async function archiveExpiredEvents() {
  await ensure();
  const sql = await getSql();
  const now = Date.now();
  const rows = await sql<{ id: string }>`
    update nf_events set status = 'archived', flagship = 0
    where status = 'approved' and ends_at < ${now}
    returning id`;
  return { archived: rows.length };
}

export const listEvents = createServerFn({ method: "GET" })
  .middleware([optionalAuthMiddleware])
  .handler(async ({ context }): Promise<{ hero: EEvent | null; events: EEvent[] }> => {
    const empty = { hero: null as EEvent | null, events: [] as EEvent[] };
    try {
      await ensure();
      const sql = await getSql();
      const now = Date.now();
      const userId = context.userId ?? "";
      const rows = await sql<Record<string, unknown>>`
        select id, title, blurb, category, place, link, cover, ticket, starts_at, ends_at, status, flagship, submitter, user_id
        from nf_events
        where status = 'approved' and ends_at > ${now}
        order by flagship desc, starts_at asc
        limit 48`;
      const ids = rows.map((r) => String(r.id));
      const counts = new Map<string, number>();
      const mine = new Set<string>();
      if (ids.length) {
        const rsv = await sql<{ event_id: string; user_id: string }>`select event_id, user_id from nf_event_rsvp limit 2000`;
        for (const row of rsv) {
          if (!ids.includes(String(row.event_id))) continue;
          counts.set(String(row.event_id), (counts.get(String(row.event_id)) ?? 0) + 1);
          if (userId && row.user_id === userId) mine.add(String(row.event_id));
        }
      }
      const events = rows.map((r) => {
        const id = String(r.id);
        return mapRow({ ...r, rsvps: counts.get(id) ?? 0, mine: mine.has(id) ? 1 : 0 }, mine.has(id));
      });
      const hero = events.find((e) => e.flagship) ?? events[0] ?? null;
      if (events.length) return { hero, events };
      const start = Date.now() + 86_400_000;
      const showcase: EEvent[] = [
        { id: "ev-lounge", title: "Kilode Lounge Live", blurb: "Talk and music.", category: "music", place: "Lagos", link: "", cover: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80", ticket: "", startsAt: start, endsAt: start + 3 * 3_600_000, status: "approved", flagship: true, submitter: "Kilode", rsvps: 0, mine: false, coin: "", amount: "", txHash: "", matchNote: "" },
        { id: "ev-market", title: "Aba Makers Day", blurb: "Clothes, shoes, and craft.", category: "culture", place: "Aba", link: "", cover: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=800&q=80", ticket: "", startsAt: start + 86_400_000, endsAt: start + 86_400_000 + 4 * 3_600_000, status: "approved", flagship: false, submitter: "Kilode", rsvps: 0, mine: false, coin: "", amount: "", txHash: "", matchNote: "" },
        { id: "ev-screen", title: "Cinema Night", blurb: "One film, then the argument.", category: "cinema", place: "Abuja", link: "", cover: "https://images.unsplash.com/photo-1470225620780-dba8ba60b75b?auto=format&fit=crop&w=800&q=80", ticket: "", startsAt: start + 2 * 86_400_000, endsAt: start + 2 * 86_400_000 + 3 * 3_600_000, status: "approved", flagship: false, submitter: "Kilode", rsvps: 0, mine: false, coin: "", amount: "", txHash: "", matchNote: "" },
      ];
      return { hero: showcase[0], events: showcase };
    } catch {
      return empty;
    }
  });

export const submitEvent = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { title?: string; blurb?: string; category?: string; place?: string; link?: string; cover?: string; ticket?: string; startsAt?: number; endsAt?: number; coin?: string; amount?: string; txHash?: string }) => d)
  .handler(async ({ data, context }) => {
    if (!(await allowWrite(`e-sub:${context.userId}`, 3, 3_600_000))) throw new Error(RATE_BLOCKED);
    const title = String(data.title || "").trim().slice(0, 80);
    const blurb = String(data.blurb || "").trim().slice(0, 280);
    if (title.length < 4) throw new Error("Give the event a title.");
    const startsAt = num(data.startsAt);
    const endsAt = num(data.endsAt) || startsAt + 3 * 3_600_000;
    const now = Date.now();
    if (startsAt < now - 60_000) throw new Error("Start time has to be in the future.");
    if (endsAt <= startsAt) throw new Error("End time has to be after the start.");
    if (endsAt - startsAt > 14 * 86_400_000) throw new Error("An event can run for 14 days at most.");
    if (startsAt > now + 180 * 86_400_000) throw new Error("Pick a date inside the next 6 months.");
    const handle = await handleOf(context.userId);
    const gated = await gateText("feeds", `${title}\n${blurb}`, { userId: context.userId, author: handle });
    if (!gated.ok) throw new Error(gated.reason);
    const link = data.link ? safeHttpUrl(data.link) || "" : "";
    if (data.link && !link) throw new Error("Link must start with https.");
    const cover = data.cover ? safeHttpUrl(data.cover) || "" : "";
    if (data.cover && !cover) throw new Error("Cover must be an https image link.");
    const ticket = String(data.ticket || "").trim().slice(0, 40);
    const sql = await getSql();
    const charge = await deskCharge("events").catch(() => ({ paid: false, usd: 0, cryptoEnabled: true }));
    await ensure();
    const id = nid();
    const status = charge.paid ? "awaiting_pay" : "pending";
    await sql`insert into nf_events (id, title, blurb, category, place, link, cover, ticket, starts_at, ends_at, status, flagship, submitter, user_id, ts, coin, amount, tx_hash)
      values (${id}, ${title}, ${blurb}, ${catOf(String(data.category || ""))}, ${String(data.place || "").trim().slice(0, 60)}, ${link}, ${cover}, ${ticket}, ${startsAt}, ${endsAt}, ${status}, ${0}, ${handle}, ${context.userId}, ${now}, ${""}, ${""}, ${""})`;
    return { ok: true as const, id, needsPay: charge.paid, priceUsd: charge.usd, cryptoEnabled: charge.cryptoEnabled };
  });

export const rsvpEvent = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { id?: string }) => d)
  .handler(async ({ data, context }) => {
    const id = String(data.id || "").slice(0, 40);
    if (!id) throw new Error("Missing event.");
    if (!(await allowWrite(`e-rsvp:${context.userId}`, 12, 60_000))) throw new Error(RATE_BLOCKED);
    await ensure();
    const sql = await getSql();
    const rows = await sql<{ id: string; status: string; ends_at: number | string }>`
      select id, status, ends_at from nf_events where id = ${id} limit 1`;
    const row = rows[0];
    if (!row || row.status !== "approved" || num(row.ends_at) < Date.now()) throw new Error("That event is not open.");
    await sql`insert into nf_event_rsvp (event_id, user_id, ts) values (${id}, ${context.userId}, ${Date.now()}) on conflict (event_id, user_id) do nothing`;
    const n = await sql<{ n: string | number }>`select count(*) as n from nf_event_rsvp where event_id = ${id}`;
    return { ok: true as const, rsvps: num(n[0]?.n), mine: true };
  });

export const adminEvents = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const role = await staffRole(context.userId);
    if (role !== "super" && role !== "admin") throw new Error("Forbidden");
    await ensure();
    const sql = await getSql();
    const rows = await sql<Record<string, unknown>>`
      select e.*, (select count(*) from nf_event_rsvp r where r.event_id = e.id) as rsvps
      from nf_events e
      order by e.ts desc
      limit 80`;
    const events = rows.map((r) => mapRow(r, false));
    return {
      pending: events.filter((e) => e.status === "pending").length,
      live: events.filter((e) => e.status === "approved" && e.endsAt > Date.now()).length,
      rsvps: events.reduce((n, e) => n + e.rsvps, 0),
      events,
    };
  });

export const setEvent = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { id?: string; status?: string; flagship?: boolean }) => d)
  .handler(async ({ data, context }) => {
    const role = await staffRole(context.userId);
    if (role !== "super" && role !== "admin") throw new Error("Forbidden");
    const id = String(data.id || "").slice(0, 40);
    if (!id) throw new Error("Missing event.");
    await ensure();
    const sql = await getSql();
    if (data.flagship === true) {
      await sql`update nf_events set flagship = 0 where flagship = 1`;
      await sql`update nf_events set flagship = 1, status = 'approved' where id = ${id}`;
    } else if (data.flagship === false) {
      await sql`update nf_events set flagship = 0 where id = ${id}`;
    }
    if (data.status === "approved" || data.status === "rejected" || data.status === "archived") {
      await sql`update nf_events set status = ${data.status} where id = ${id}`;
      if (data.status !== "approved") await sql`update nf_events set flagship = 0 where id = ${id}`;
    }
    return { ok: true as const };
  });

export const matchEventPay = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { id?: string }) => d)
  .handler(async ({ data, context }) => {
    const role = await staffRole(context.userId);
    if (role !== "super" && role !== "admin") throw new Error("Forbidden");
    if (!(await allowWrite(`e-match:${context.userId}`, 8, 60_000))) throw new Error(RATE_BLOCKED);
    const id = String(data.id || "").slice(0, 40);
    await ensure();
    const sql = await getSql();
    const rows = await sql<{ coin: string; tx_hash: string }>`select coin, tx_hash from nf_events where id = ${id} limit 1`;
    const row = rows[0];
    if (!row?.tx_hash) throw new Error("No hash on this event.");
    if (isCardProvider(row.coin || "")) {
      try {
        const paid = await sql<{ status: string; amount_ngn: number }>`select status, amount_ngn from nf_checkouts where reference = ${row.tx_hash} limit 1`;
        const ok = paid[0]?.status === "paid" || paid[0]?.status === "used";
        const note = ok ? `${row.coin} verified · ₦${paid[0]?.amount_ngn ?? ""}` : "This Paystack/Flutterwave reference is not verified yet.";
        await sql`update nf_events set match_note = ${note.slice(0, 280)} where id = ${id}`;
        return { ok, reason: note };
      } catch {
        throw new Error("Payment table is not ready yet.");
      }
    }
    const wallets = await sql<{ coin: string; address: string }>`select coin, address from nf_wallets`;
    const result = await verifyCryptoTx({ coin: row.coin || "", txHash: row.tx_hash, wallets });
    const note = result.reason.slice(0, 280);
    await sql`update nf_events set match_note = ${note} where id = ${id}`;
    return { ok: result.ok, reason: note };
  });

export const purgeEvents = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const role = await staffRole(context.userId);
    if (role !== "super") throw new Error("Forbidden");
    return archiveExpiredEvents();
  });
