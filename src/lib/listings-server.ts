import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { asAccountKind, type AccountKind, safeHttpUrl } from "@/lib/qonvo-data";
import { canKind, kindActionHint, type KindAction } from "@/lib/permissions";
import { gateText } from "@/lib/mod-cache";

export type ListingKind = "job" | "market" | "rent";
export type Listing = {
  id: string;
  kind: ListingKind;
  title: string;
  body: string;
  city: string;
  contact: string;
  link: string;
  company: string;
  status: "pending" | "approved" | "rejected";
  submitter: string;
  ts: number;
  views: number;
  days: number;
  expiresAt?: number;
  image?: string;
};

function nid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function asKind(v: string): ListingKind {
  return v === "market" || v === "rent" ? v : "job";
}

const ACTION: Record<ListingKind, KindAction> = {
  job: "jobs.post",
  market: "market.list",
  rent: "rent.list",
};

async function kindOf(userId: string): Promise<AccountKind> {
  try {
    const sql = await getSql();
    const rows = await sql<{ kind: string | null }>`select kind from nf_profiles where user_id = ${userId} limit 1`;
    return asAccountKind(rows[0]?.kind);
  } catch {
    return "member";
  }
}

async function handleOf(userId: string) {
  const sql = await getSql();
  const rows = await sql<{ handle: string }>`select handle from nf_profiles where user_id = ${userId} limit 1`;
  return (rows[0]?.handle || userId).slice(0, 24);
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

async function ensure() {
  const sql = await getSql();
  await sql.query(`CREATE TABLE IF NOT EXISTS nf_listings (
    id TEXT PRIMARY KEY, kind TEXT NOT NULL, title TEXT NOT NULL,
    body TEXT NOT NULL DEFAULT '', city TEXT NOT NULL DEFAULT '',
    contact TEXT NOT NULL DEFAULT '', link TEXT NOT NULL DEFAULT '',
    company TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'pending',
    submitter TEXT NOT NULL DEFAULT '', user_id TEXT, ts BIGINT NOT NULL, views INTEGER NOT NULL DEFAULT 0,
    days INT NOT NULL DEFAULT 30, expires_at BIGINT)`);
  await sql.query(`CREATE TABLE IF NOT EXISTS nf_apps (
    id TEXT PRIMARY KEY, listing_id TEXT NOT NULL, user_id TEXT NOT NULL,
    handle TEXT NOT NULL, note TEXT NOT NULL DEFAULT '', ts BIGINT NOT NULL)`);
  try {
    await sql.query(`ALTER TABLE nf_listings ADD COLUMN IF NOT EXISTS days INT NOT NULL DEFAULT 30`);
    await sql.query(`ALTER TABLE nf_listings ADD COLUMN IF NOT EXISTS expires_at BIGINT`);
  } catch {
    /* exists */
  }
}

type ListingRow = {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  city: string | null;
  contact: string | null;
  link: string | null;
  company: string | null;
  status: string;
  submitter: string | null;
  ts: number | string;
  views: number | string | null;
  days?: number | string | null;
  expires_at?: number | string | null;
};

function map(r: ListingRow): Listing {
  return {
    id: r.id,
    kind: asKind(r.kind),
    title: r.title,
    body: r.body ?? "",
    city: r.city ?? "",
    contact: r.contact ?? "",
    link: r.link ?? "",
    company: r.company ?? "",
    status: r.status === "approved" || r.status === "rejected" ? r.status : "pending",
    submitter: r.submitter ?? "",
    ts: Number(r.ts),
    views: Number(r.views ?? 0),
    days: Number(r.days ?? 30),
    expiresAt: r.expires_at ? Number(r.expires_at) : undefined,
  };
}

export const listListings = createServerFn({ method: "GET" })
  .validator((d: { kind: string; staff?: boolean }) => d)
  .handler(async ({ data }) => {
    const sql = await getSql();
    try {
      await ensure();
    } catch {
      /* exists */
    }
    const kind = asKind(data.kind);
    const now = Date.now();
    const rows = await sql<ListingRow>`select id, kind, title, body, city, contact, link, company, status, submitter, ts, views, days, expires_at from nf_listings where kind = ${kind} and status = 'approved' and (expires_at is null or expires_at > ${now}) order by ts desc limit 80`;
    return rows.map(map);
  });

export const saveListing = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { kind: string; title: string; body?: string; city?: string; contact?: string; link?: string; company?: string; days?: number }) => d)
  .handler(async ({ context, data }) => {
    const kind = asKind(data.kind);
    const ak = await kindOf(context.userId);
    if (!canKind(ak, ACTION[kind])) return { ok: false as const, reason: kindActionHint(ACTION[kind]) };
    const title = data.title.trim().slice(0, 120);
    if (title.length < 3) return { ok: false as const, reason: "Add a title." };
    const submitter = await handleOf(context.userId);
    const gate = await gateText("feeds", `${title} ${data.body ?? ""}`, { userId: context.userId, author: submitter });
    if (!gate.ok) return { ok: false as const, reason: gate.reason };
    const sql = await getSql();
    try {
      await ensure();
    } catch {
      /* exists */
    }
    const id = nid();
    const link = safeHttpUrl(data.link ?? "") ?? "";
    const days = [7, 14, 30].includes(Number(data.days)) ? Number(data.days) : 30;
    await sql`insert into nf_listings (id, kind, title, body, city, contact, link, company, status, submitter, user_id, ts, views, days)
      values (${id}, ${kind}, ${title}, ${(data.body ?? "").slice(0, 2000)}, ${(data.city ?? "").slice(0, 80)}, ${(data.contact ?? "").slice(0, 120)}, ${link}, ${(data.company ?? "").slice(0, 80)}, ${"pending"}, ${submitter}, ${context.userId}, ${Date.now()}, ${0}, ${days})`;
    return { ok: true as const, id };
  });

export const applyListing = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { id: string; note?: string }) => d)
  .handler(async ({ context, data }) => {
    const ak = await kindOf(context.userId);
    if (!canKind(ak, "jobs.apply")) return { ok: false as const, reason: kindActionHint("jobs.apply") };
    const sql = await getSql();
    const handle = await handleOf(context.userId);
    const id = nid();
    try {
      await ensure();
    } catch {
      /* exists */
    }
    await sql`insert into nf_apps (id, listing_id, user_id, handle, note, ts) values (${id}, ${data.id}, ${context.userId}, ${handle}, ${(data.note ?? "").slice(0, 500)}, ${Date.now()})`;
    return { ok: true as const };
  });

export const setListingStatus = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { id: string; status: "approved" | "rejected" }) => d)
  .handler(async ({ context, data }) => {
    const role = await staffRole(context.userId);
    if (role !== "super" && role !== "admin") throw new Error("Forbidden");
    const sql = await getSql();
    if (data.status === "approved") {
      const rows = await sql<{ days: number | string | null }>`select days from nf_listings where id = ${data.id} limit 1`;
      const days = Number(rows[0]?.days ?? 30) || 30;
      const exp = Date.now() + days * 86_400_000;
      await sql`update nf_listings set status = ${data.status}, expires_at = ${exp} where id = ${data.id}`;
    } else {
      await sql`update nf_listings set status = ${data.status} where id = ${data.id}`;
    }
    return { ok: true as const };
  });

export const listListingQueue = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    if (!(await staffRole(context.userId))) return [];
    const sql = await getSql();
    try {
      await ensure();
    } catch {
      return [];
    }
    const rows = await sql<ListingRow>`select id, kind, title, body, city, contact, link, company, status, submitter, ts, views, days, expires_at from nf_listings order by ts desc limit 80`;
    return rows.map(map);
  });

export const listMyListings = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((d?: { kind?: string }) => d ?? {})
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    try {
      await ensure();
    } catch {
      /* exists */
    }
    const kindFilter = data.kind ? asKind(data.kind) : null;
    const rows = kindFilter
      ? await sql<ListingRow>`select id, kind, title, body, city, contact, link, company, status, submitter, ts, views, days, expires_at from nf_listings where user_id = ${context.userId} and kind = ${kindFilter} order by ts desc limit 40`
      : await sql<ListingRow>`select id, kind, title, body, city, contact, link, company, status, submitter, ts, views, days, expires_at from nf_listings where user_id = ${context.userId} order by ts desc limit 80`;
    return rows.map(map);
  });

export type MyApp = {
  id: string;
  listingId: string;
  title: string;
  company: string;
  city: string;
  note: string;
  ts: number;
  status: string;
};

export const listMyApps = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    try {
      await ensure();
    } catch {
      return [] as MyApp[];
    }
    const rows = await sql<{
      id: string;
      listing_id: string;
      note: string | null;
      ts: number | string;
      title: string | null;
      company: string | null;
      city: string | null;
      status: string | null;
    }>`select a.id, a.listing_id, a.note, a.ts, l.title, l.company, l.city, l.status
      from nf_apps a
      left join nf_listings l on l.id = a.listing_id
      where a.user_id = ${context.userId}
      order by a.ts desc limit 40`;
    return rows.map(
      (r): MyApp => ({
        id: r.id,
        listingId: r.listing_id,
        title: r.title ?? "Job",
        company: r.company ?? "",
        city: r.city ?? "",
        note: r.note ?? "",
        ts: Number(r.ts),
        status: r.status ?? "unknown",
      }),
    );
  });

