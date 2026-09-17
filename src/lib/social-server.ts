import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { asAccountKind } from "@/lib/qonvo-data";
import { gateText } from "@/lib/mod-cache";
import { LANGS, type LangId } from "@/lib/i18n";

function nid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function hashKey(lang: string, src: string) {
  const s = `${lang}\n${src}`;
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return `t${(h >>> 0).toString(16)}${s.length.toString(36)}`;
}

async function publicHandle(userId: string) {
  const sql = await getSql();
  const rows = await sql<{ handle: string }>`select handle from nf_profiles where user_id = ${userId} limit 1`;
  return (rows[0]?.handle || userId).slice(0, 24);
}

export async function userIdByHandle(handle: string) {
  const h = handle.trim().toLowerCase();
  if (!h) return null;
  const sql = await getSql();
  const p = await sql<{ user_id: string }>`select user_id from nf_profiles where lower(handle) = ${h} limit 1`;
  if (p[0]) return p[0].user_id;
  const u = await sql<{ id: string }>`select id from "user" where lower(name) = ${h} limit 1`;
  return u[0]?.id ?? null;
}

export async function pushNote(userId: string, text: string, href?: string) {
  if (!userId) return;
  try {
    const sql = await getSql();
    await sql`insert into nf_notes (id, user_id, text, href, ts, seen) values (${nid()}, ${userId}, ${text.slice(0, 240)}, ${href ?? ""}, ${Date.now()}, ${0})`;
  } catch {
    /* table may not exist on first boot */
  }
}

export const translateText = createServerFn({ method: "POST" })
  .validator((d: { text: string; to: string }) => d)
  .handler(async ({ data }) => {
    const text = data.text.trim().slice(0, 800);
    const to = (LANGS.some((l) => l.id === data.to) ? data.to : "en") as LangId;
    if (!text) return { ok: false as const, reason: "Nothing to translate." };
    const id = hashKey(to, text);
    const sql = await getSql();
    try {
      const hit = await sql<{ out: string }>`select out from nf_i18n where id = ${id} limit 1`;
      if (hit[0]?.out) return { ok: true as const, text: hit[0].out, to };
    } catch {
      /* ignore */
    }
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${to}`;
    try {
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      const json = (await res.json()) as { responseData?: { translatedText?: string }; responseStatus?: number };
      const out = json.responseData?.translatedText?.trim();
      if (!out || json.responseStatus === 403) return { ok: false as const, reason: "Translate is busy. Try again." };
      try {
        await sql`insert into nf_i18n (id, lang, src, out, ts) values (${id}, ${to}, ${text.slice(0, 800)}, ${out.slice(0, 2000)}, ${Date.now()})`;
      } catch {
        /* ignore cache write */
      }
      return { ok: true as const, text: out, to };
    } catch {
      return { ok: false as const, reason: "Translate failed." };
    }
  });

export const getPublicProfile = createServerFn({ method: "GET" })
  .validator((handle: string) => handle)
  .handler(async ({ data: raw }) => {
    const handle = raw.trim().slice(0, 24);
    if (!handle) return null;
    const sql = await getSql();
    let profile = (
      await sql<{
        user_id: string;
        handle: string;
        bio: string | null;
        city: string | null;
        kind: string | null;
        stage: string | null;
        genre: string | null;
        website: string | null;
        brand: string | null;
      }>`select user_id, handle, bio, city, kind, stage, genre, website, brand from nf_profiles where lower(handle) = ${handle.toLowerCase()} limit 1`
    )[0];
    if (!profile) {
      const u = await sql<{ id: string; name: string }>`select id, name from "user" where lower(name) = ${handle.toLowerCase()} limit 1`;
      if (!u[0]) return null;
      profile = { user_id: u[0].id, handle: u[0].name, bio: null, city: null, kind: "member", stage: null, genre: null, website: null, brand: null };
    }
    const posts = await sql<{ id: string; title: string; excerpt: string | null; image: string | null; slug: string | null; ts: number | string; views: number | string | null }>`
      select id, title, excerpt, image, slug, ts, views from nf_posts
      where status = 'publish' and lower(author) = ${profile.handle.toLowerCase()}
      order by ts desc limit 12`;
    let tracks: { id: string; title: string; artist: string; url: string; platform: string }[] = [];
    try {
      tracks = await sql<{ id: string; title: string; artist: string; url: string; platform: string }>`
        select id, title, artist, url, platform from nf_tracks
        where lower(author) = ${profile.handle.toLowerCase()} or lower(artist) = ${profile.handle.toLowerCase()}
        order by ts desc limit 8`;
    } catch {
      tracks = [];
    }
    return {
      handle: profile.handle,
      bio: profile.bio ?? "",
      city: profile.city ?? "",
      kind: asAccountKind(profile.kind),
      stage: profile.stage ?? "",
      genre: profile.genre ?? "",
      website: profile.website ?? "",
      brand: profile.brand ?? "",
      posts: posts.map((p) => ({ ...p, ts: Number(p.ts), views: Number(p.views ?? 0) })),
      tracks,
    };
  });

export const listNotes = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    try {
      const rows = await sql<{ id: string; text: string; href: string | null; ts: number | string; seen: number }>`
        select id, text, href, ts, seen from nf_notes where user_id = ${context.userId} order by ts desc limit 40`;
      return rows.map((r) => ({ id: r.id, text: r.text, href: r.href || undefined, ts: Number(r.ts), seen: Number(r.seen) }));
    } catch {
      return [];
    }
  });

export const listInbox = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const me = await publicHandle(context.userId);
    try {
      const rows = await sql<{ id: string; from_handle: string; to_handle: string; body: string; ts: number | string }>`
        select id, from_handle, to_handle, body, ts from nf_dm
        where from_id = ${context.userId} or lower(to_handle) = ${me.toLowerCase()} or to_user_id = ${context.userId}
        order by ts desc limit 40`;
      return rows.map((r) => ({ id: r.id, from: r.from_handle, to: r.to_handle, body: r.body, ts: Number(r.ts) }));
    } catch {
      return [];
    }
  });

export const sendDm = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { to: string; body: string }) => d)
  .handler(async ({ context, data }) => {
    const to = data.to.trim().slice(0, 24);
    const body = data.body.trim().slice(0, 500);
    if (!to || !body) return { ok: false as const, reason: "Need a username and a message." };
    const sql = await getSql();
    const from = await publicHandle(context.userId);
    if (to.toLowerCase() === from.toLowerCase()) return { ok: false as const, reason: "That is you." };
    const gate = await gateText("comments", body, { userId: context.userId, author: from });
    if (!gate.ok) return { ok: false as const, reason: gate.reason };
    const toId = await userIdByHandle(to);
    if (!toId) return { ok: false as const, reason: "No user with that handle." };
    const id = nid();
    try {
      await sql`insert into nf_dm (id, from_id, from_handle, to_handle, to_user_id, body, ts)
        values (${id}, ${context.userId}, ${from}, ${to}, ${toId}, ${gate.text}, ${Date.now()})`;
    } catch {
      return { ok: false as const, reason: "Inbox is not ready." };
    }
    await pushNote(toId, `DM from ${from}`, "/");
    return { ok: true as const, id };
  });
