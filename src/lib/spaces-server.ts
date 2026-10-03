import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware, optionalAuthMiddleware } from "@/lib/auth/middleware";
import { assertStaff } from "@/lib/staff-server";
import { safeHttpUrl } from "@/lib/qonvo-data";

export type SpaceItem = {
  id: string;
  kind: "service" | "offer" | "product";
  title: string;
  badge: string;
  price: string;
  duration: string;
  image: string;
  description: string;
};

export type SpaceCard = {
  id: string;
  handle: string;
  name: string;
  username: string;
  category: string;
  tagline: string;
  description: string;
  location: string;
  logo: string;
  banner: string;
  status: "Published" | "Draft" | "Private";
  visitors: number;
  enquiries: number;
  whatsapp: string;
  email: string;
  website: string;
  hours: string;
  ts: number;
  items: SpaceItem[];
};

function nid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function asStatus(v: string): SpaceCard["status"] {
  return v === "Published" || v === "Private" ? v : "Draft";
}

async function ensure() {
  const sql = await getSql();
  await sql.query(`CREATE TABLE IF NOT EXISTS nf_spaces (
    id TEXT PRIMARY KEY, user_id TEXT NOT NULL, handle TEXT NOT NULL DEFAULT '',
    business_name TEXT NOT NULL, username TEXT NOT NULL UNIQUE, category TEXT NOT NULL DEFAULT '',
    tagline TEXT NOT NULL DEFAULT '', description TEXT NOT NULL DEFAULT '', location TEXT NOT NULL DEFAULT '',
    logo_url TEXT NOT NULL DEFAULT '', banner_url TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'Draft',
    visitors INT NOT NULL DEFAULT 0, enquiries INT NOT NULL DEFAULT 0, whatsapp TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL DEFAULT '', website TEXT NOT NULL DEFAULT '', hours TEXT NOT NULL DEFAULT '', ts BIGINT NOT NULL)`);
  await sql.query(`CREATE TABLE IF NOT EXISTS nf_space_items (
    id TEXT PRIMARY KEY, space_id TEXT NOT NULL, kind TEXT NOT NULL DEFAULT 'service',
    title TEXT NOT NULL, badge TEXT NOT NULL DEFAULT '', price TEXT NOT NULL DEFAULT '',
    duration TEXT NOT NULL DEFAULT '', image_url TEXT NOT NULL DEFAULT '', description TEXT NOT NULL DEFAULT '',
    active INT NOT NULL DEFAULT 1)`);
  await sql.query(`CREATE TABLE IF NOT EXISTS nf_space_follows (
    user_id TEXT NOT NULL, space_id TEXT NOT NULL, ts BIGINT NOT NULL, PRIMARY KEY (user_id, space_id))`);
}

type SpaceRow = {
  id: string;
  handle: string | null;
  business_name: string;
  username: string;
  category: string | null;
  tagline: string | null;
  description: string | null;
  location: string | null;
  logo_url: string | null;
  banner_url: string | null;
  status: string;
  visitors: number | string | null;
  enquiries: number | string | null;
  whatsapp: string | null;
  email: string | null;
  website: string | null;
  hours: string | null;
  ts: number | string;
};

function mapSpace(r: SpaceRow, items: SpaceItem[] = []): SpaceCard {
  return {
    id: r.id,
    handle: r.handle ?? "",
    name: r.business_name,
    username: r.username,
    category: r.category ?? "",
    tagline: r.tagline ?? "",
    description: r.description ?? "",
    location: r.location ?? "",
    logo: r.logo_url ?? "",
    banner: r.banner_url ?? "",
    status: asStatus(r.status),
    visitors: Number(r.visitors ?? 0),
    enquiries: Number(r.enquiries ?? 0),
    whatsapp: r.whatsapp ?? "",
    email: r.email ?? "",
    website: r.website ?? "",
    hours: r.hours ?? "",
    ts: Number(r.ts),
    items,
  };
}

async function itemsFor(ids: string[]) {
  const grouped = new Map<string, SpaceItem[]>();
  if (!ids.length) return grouped;
  const sql = await getSql();
  const rows = await sql<{
    id: string;
    space_id: string;
    kind: string;
    title: string;
    badge: string | null;
    price: string | null;
    duration: string | null;
    image_url: string | null;
    description: string | null;
  }>`select id, space_id, kind, title, badge, price, duration, image_url, description from nf_space_items where active = 1 order by title asc`;
  for (const r of rows) {
    if (!ids.includes(r.space_id)) continue;
    const list = grouped.get(r.space_id) ?? [];
    list.push({
      id: r.id,
      kind: r.kind === "offer" || r.kind === "product" ? r.kind : "service",
      title: r.title,
      badge: r.badge ?? "",
      price: r.price ?? "",
      duration: r.duration ?? "",
      image: r.image_url ?? "",
      description: r.description ?? "",
    });
    grouped.set(r.space_id, list);
  }
  return grouped;
}

export const listPublicSpaces = createServerFn({ method: "GET" })
  .validator((d: { q?: string }) => d ?? {})
  .handler(async ({ data }) => {
    const sql = await getSql();
    try {
      await ensure();
    } catch {
      return [] as SpaceCard[];
    }
    const rows = await sql<SpaceRow>`select id, handle, business_name, username, category, tagline, description, location, logo_url, banner_url, status, visitors, enquiries, whatsapp, email, website, hours, ts from nf_spaces where status = 'Published' order by ts desc limit 40`;
    const q = (data.q ?? "").trim().toLowerCase();
    const filtered = q
      ? rows.filter((r) => `${r.business_name} ${r.username} ${r.category} ${r.location}`.toLowerCase().includes(q))
      : rows;
    const items = await itemsFor(filtered.map((r) => r.id));
    return filtered.map((r) => mapSpace(r, items.get(r.id) ?? []));
  });

export const listMySpaces = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    try {
      await ensure();
    } catch {
      return [] as SpaceCard[];
    }
    const rows = await sql<SpaceRow>`select id, handle, business_name, username, category, tagline, description, location, logo_url, banner_url, status, visitors, enquiries, whatsapp, email, website, hours, ts from nf_spaces where user_id = ${context.userId} order by ts desc limit 20`;
    const items = await itemsFor(rows.map((r) => r.id));
    return rows.map((r) => mapSpace(r, items.get(r.id) ?? []));
  });

export const getSpace = createServerFn({ method: "GET" })
  .validator((d: { username: string }) => d)
  .handler(async ({ data }) => {
    const sql = await getSql();
    try {
      await ensure();
    } catch {
      return null;
    }
    const name = data.username.trim().toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 24);
    const rows = await sql<SpaceRow>`select id, handle, business_name, username, category, tagline, description, location, logo_url, banner_url, status, visitors, enquiries, whatsapp, email, website, hours, ts from nf_spaces where username = ${name} limit 1`;
    const row = rows[0];
    if (!row || row.status !== "Published") return null;
    await sql`update nf_spaces set visitors = visitors + 1 where id = ${row.id}`;
    const items = await itemsFor([row.id]);
    return mapSpace({ ...row, visitors: Number(row.visitors ?? 0) + 1 }, items.get(row.id) ?? []);
  });

export const saveSpace = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    (d: {
      id?: string;
      name: string;
      username: string;
      category?: string;
      tagline?: string;
      description?: string;
      location?: string;
      logo?: string;
      banner?: string;
      status?: string;
      whatsapp?: string;
      email?: string;
      website?: string;
      hours?: string;
    }) => d,
  )
  .handler(async ({ context, data }) => {
    const name = data.name.trim().slice(0, 80);
    const username = data.username.trim().toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 24);
    if (name.length < 2) return { ok: false as const, reason: "Add a business name." };
    if (username.length < 3) return { ok: false as const, reason: "Handle needs 3+ letters." };
    const sql = await getSql();
    await ensure();
    const handleRows = await sql<{ handle: string }>`select handle from nf_profiles where user_id = ${context.userId} limit 1`;
    const handle = handleRows[0]?.handle || "member";
    const taken = await sql<{ id: string; user_id: string }>`select id, user_id from nf_spaces where username = ${username} limit 1`;
    if (taken[0] && taken[0].user_id !== context.userId && taken[0].id !== data.id) {
      return { ok: false as const, reason: "That handle is taken." };
    }
    const mine = await sql<{ n: number }>`select count(*)::int as n from nf_spaces where user_id = ${context.userId}`;
    if (!data.id && Number(mine[0]?.n ?? 0) >= 5) return { ok: false as const, reason: "Five spaces is the current limit." };
    const status = asStatus(data.status || "Published");
    const logo = (data.logo ?? "").startsWith("data:image/") || safeHttpUrl(data.logo ?? "") ? (data.logo ?? "").slice(0, 900000) : "";
    const banner = (data.banner ?? "").startsWith("data:image/") || safeHttpUrl(data.banner ?? "") ? (data.banner ?? "").slice(0, 900000) : "";
    const website = safeHttpUrl(data.website ?? "") ?? "";
    if (data.id) {
      const own = await sql<{ id: string }>`select id from nf_spaces where id = ${data.id} and user_id = ${context.userId} limit 1`;
      if (!own[0]) return { ok: false as const, reason: "That space is not yours." };
      await sql`update nf_spaces set business_name = ${name}, username = ${username}, category = ${(data.category ?? "").slice(0, 40)}, tagline = ${(data.tagline ?? "").slice(0, 140)}, description = ${(data.description ?? "").slice(0, 2000)}, location = ${(data.location ?? "").slice(0, 80)}, logo_url = ${logo}, banner_url = ${banner}, status = ${status}, whatsapp = ${(data.whatsapp ?? "").slice(0, 32)}, email = ${(data.email ?? "").slice(0, 80)}, website = ${website}, hours = ${(data.hours ?? "").slice(0, 80)} where id = ${data.id}`;
      return { ok: true as const, id: data.id, username };
    }
    const id = nid();
    await sql`insert into nf_spaces (id, user_id, handle, business_name, username, category, tagline, description, location, logo_url, banner_url, status, visitors, enquiries, whatsapp, email, website, hours, ts)
      values (${id}, ${context.userId}, ${handle}, ${name}, ${username}, ${(data.category ?? "").slice(0, 40)}, ${(data.tagline ?? "").slice(0, 140)}, ${(data.description ?? "").slice(0, 2000)}, ${(data.location ?? "").slice(0, 80)}, ${logo}, ${banner}, ${status}, ${0}, ${0}, ${(data.whatsapp ?? "").slice(0, 32)}, ${(data.email ?? "").slice(0, 80)}, ${website}, ${(data.hours ?? "").slice(0, 80)}, ${Date.now()})`;
    return { ok: true as const, id, username };
  });

export const saveSpaceItem = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { spaceId: string; kind?: string; title: string; badge?: string; price?: string; duration?: string; image?: string; description?: string }) => d)
  .handler(async ({ context, data }) => {
    const title = data.title.trim().slice(0, 80);
    if (title.length < 2) return { ok: false as const, reason: "Add a title." };
    const sql = await getSql();
    await ensure();
    const own = await sql<{ id: string }>`select id from nf_spaces where id = ${data.spaceId} and user_id = ${context.userId} limit 1`;
    if (!own[0]) return { ok: false as const, reason: "That space is not yours." };
    const kind = data.kind === "offer" || data.kind === "product" ? data.kind : "service";
    const id = nid();
    const image = (data.image ?? "").startsWith("data:image/") || safeHttpUrl(data.image ?? "") ? (data.image ?? "").slice(0, 900000) : "";
    await sql`insert into nf_space_items (id, space_id, kind, title, badge, price, duration, image_url, description, active)
      values (${id}, ${data.spaceId}, ${kind}, ${title}, ${(data.badge ?? "").slice(0, 40)}, ${(data.price ?? "").slice(0, 32)}, ${(data.duration ?? "").slice(0, 32)}, ${image}, ${(data.description ?? "").slice(0, 400)}, ${1})`;
    return { ok: true as const, id };
  });

export const spacePulse = createServerFn({ method: "GET" })
  .middleware([optionalAuthMiddleware])
  .validator((d: { spaceId: string }) => d)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await ensure();
    const rows = await sql<{ n: number }>`select count(*)::int as n from nf_space_follows where space_id = ${data.spaceId}`;
    const mine = context.userId
      ? await sql<{ user_id: string }>`select user_id from nf_space_follows where space_id = ${data.spaceId} and user_id = ${context.userId} limit 1`
      : [];
    return { followers: Number(rows[0]?.n ?? 0), followed: Boolean(mine[0]) };
  });

export const toggleSpaceFollow = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { spaceId: string }) => d)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await ensure();
    const hit = await sql<{ user_id: string }>`select user_id from nf_space_follows where space_id = ${data.spaceId} and user_id = ${context.userId} limit 1`;
    if (hit[0]) {
      await sql`delete from nf_space_follows where space_id = ${data.spaceId} and user_id = ${context.userId}`;
      return { ok: true as const, followed: false };
    }
    await sql`insert into nf_space_follows (user_id, space_id, ts) values (${context.userId}, ${data.spaceId}, ${Date.now()})`;
    return { ok: true as const, followed: true };
  });

export const noteEnquiry = createServerFn({ method: "POST" })
  .validator((d: { spaceId: string }) => d)
  .handler(async ({ data }) => {
    const sql = await getSql();
    await ensure();
    await sql`update nf_spaces set enquiries = enquiries + 1 where id = ${data.spaceId}`;
    return { ok: true as const };
  });

export const deleteSpaceItem = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { id: string }) => d)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await ensure();
    const own = await sql<{ id: string }>`select i.id from nf_space_items i join nf_spaces s on s.id = i.space_id where i.id = ${data.id} and s.user_id = ${context.userId} limit 1`;
    if (!own[0]) return { ok: false as const, reason: "That item is not yours." };
    await sql`delete from nf_space_items where id = ${data.id}`;
    return { ok: true as const };
  });

export const listSpaceDesk = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await assertStaff(context.userId);
    const sql = await getSql();
    await ensure();
    const rows = await sql<{ id: string; business_name: string; username: string; status: string; handle: string }>`select id, business_name, username, status, handle from nf_spaces order by ts desc limit 20`;
    return rows.map((r) => ({ id: r.id, name: r.business_name, username: r.username, status: r.status, handle: r.handle }));
  });

export const parkSpace = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { id: string; status?: string }) => d)
  .handler(async ({ context, data }) => {
    await assertStaff(context.userId);
    const sql = await getSql();
    const status = data.status === "Published" ? "Published" : "Draft";
    await sql`update nf_spaces set status = ${status} where id = ${data.id}`;
    return { ok: true as const };
  });
