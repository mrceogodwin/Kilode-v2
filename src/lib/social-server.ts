import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { asAccountKind } from "@/lib/qonvo-data";
import { gateText } from "@/lib/mod-cache";
import { allowWrite, RATE_BLOCKED } from "@/lib/rate-limit";
import { LANGS, type LangId } from "@/lib/i18n";
import { readAiKey } from "@/lib/keys-server";

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

let notesReady = false;
let dmReady = false;

async function ensureNotes(sql: Awaited<ReturnType<typeof getSql>>) {
  if (notesReady) return;
  await sql`create table if not exists nf_notes (
    id text primary key,
    user_id text not null,
    text text not null,
    href text,
    ts bigint not null,
    seen integer not null default 0
  )`;
  notesReady = true;
}

async function ensureDm(sql: Awaited<ReturnType<typeof getSql>>) {
  if (dmReady) return;
  await sql`create table if not exists nf_dm (
    id text primary key,
    from_id text not null,
    from_handle text not null,
    to_handle text not null,
    to_user_id text,
    body text not null,
    ts bigint not null
  )`;
  await sql`alter table nf_dm add column if not exists to_user_id text`;
  dmReady = true;
}

export async function pushNote(userId: string, text: string, href?: string) {
  if (!userId) return;
  try {
    const sql = await getSql();
    await ensureNotes(sql);
    await sql`insert into nf_notes (id, user_id, text, href, ts, seen) values (${nid()}, ${userId}, ${text.slice(0, 240)}, ${href ?? ""}, ${Date.now()}, ${0})`;
  } catch {
    /* a missed note must never break the action that created it */
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
    const deepl = await readAiKey("deepl");
    const gcloud = await readAiKey("google_translate");
    let out = "";
    try {
      if (deepl) {
        const res = await fetch("https://api-free.deepl.com/v2/translate", {
          method: "POST",
          headers: { authorization: `DeepL-Auth-Key ${deepl}`, "content-type": "application/json" },
          body: JSON.stringify({ text: [text], target_lang: to.toUpperCase() }),
        });
        const j = (await res.json()) as { translations?: { text?: string }[] };
        out = j.translations?.[0]?.text?.trim() || "";
      } else if (gcloud) {
        const res = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(gcloud)}`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ q: text, target: to, format: "text" }),
        });
        const j = (await res.json()) as { data?: { translations?: { translatedText?: string }[] } };
        out = j.data?.translations?.[0]?.translatedText?.trim() || "";
      } else {
        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${to}`;
        const res = await fetch(url, { headers: { Accept: "application/json" } });
        const json = (await res.json()) as { responseData?: { translatedText?: string }; responseStatus?: number };
        out = json.responseData?.translatedText?.trim() || "";
        if (json.responseStatus === 403) return { ok: false as const, reason: "Translate is busy. Try again." };
      }
      if (!out) return { ok: false as const, reason: "Translate is busy. Try again." };
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
      where coalesce(status, 'publish') not in ('hidden', 'rejected', 'draft')
        and (lower(author) = ${profile.handle.toLowerCase()} or user_id = ${profile.user_id})
      order by ts desc limit 24`;
    let tracks: { id: string; title: string; artist: string; url: string; platform: string }[] = [];
    try {
      tracks = await sql<{ id: string; title: string; artist: string; url: string; platform: string }>`
        select id, title, artist, url, platform from nf_tracks
        where lower(author) = ${profile.handle.toLowerCase()} or lower(artist) = ${profile.handle.toLowerCase()}
        order by ts desc limit 8`;
    } catch {
      tracks = [];
    }
    let photo = "";
    try {
      const flag = await sql<{ photos_on: number | string | null }>`select photos_on from nf_site where id = 1 limit 1`;
      const on = !flag[0] || (flag[0].photos_on !== 0 && flag[0].photos_on !== "0");
      if (on) {
        const pic = await sql<{ photo: string | null }>`select photo from nf_profiles where user_id = ${profile.user_id} limit 1`;
        const url = String(pic[0]?.photo || "");
        if (/^https:\/\//i.test(url)) photo = url.slice(0, 500);
        else if (url.startsWith("data:image/jpeg;base64,") && url.length <= 120_000) photo = url;
      }
    } catch {
      photo = "";
    }
    let lastSeen = 0;
    try {
      const seen = await sql<{ seen: number | string | null }>`select max(seen) as seen from nf_presence where lower(handle) = ${profile.handle.toLowerCase()}`;
      lastSeen = Number(seen[0]?.seen || 0);
    } catch {
      lastSeen = 0;
    }
    let verified = false;
    try {
      const flag = await sql<{ verified: number | boolean | null }>`select verified from nf_profiles where user_id = ${profile.user_id} limit 1`;
      verified = flag[0]?.verified === true || Number(flag[0]?.verified) === 1;
    } catch {
      verified = false;
    }
    let friends: { handle: string }[] = [];
    try {
      friends = await sql<{ handle: string }>`
        select handle from (
          select pt.handle as handle from nf_connects c
            join nf_profiles pt on pt.user_id = c.fellow_id
            where c.user_id = ${profile.user_id} and lower(coalesce(c.status, '')) = 'accepted'
          union
          select pf.handle as handle from nf_connects c
            join nf_profiles pf on pf.user_id = c.user_id
            where c.fellow_id = ${profile.user_id} and lower(coalesce(c.status, '')) = 'accepted'
        ) f
        where handle is not null and length(trim(handle)) > 0
        limit 24`;
    } catch {
      friends = [];
    }
    return {
      userId: profile.user_id,
      handle: profile.handle,
      bio: profile.bio ?? "",
      city: profile.city ?? "",
      kind: asAccountKind(profile.kind),
      stage: profile.stage ?? "",
      genre: profile.genre ?? "",
      website: profile.website ?? "",
      brand: profile.brand ?? "",
      photo,
      lastSeen,
      verified,
      friends: friends.map((f) => f.handle),
      posts: posts.map((p) => ({ ...p, ts: Number(p.ts), views: Number(p.views ?? 0) })),
      tracks,
    };
  });

export const listNotes = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    try {
      await ensureNotes(sql);
      const rows = await sql<{ id: string; text: string; href: string | null; ts: number | string; seen: number }>`
        select id, text, href, ts, seen from nf_notes where user_id = ${context.userId} order by ts desc limit 40`;
      let pals = new Set<string>();
      try {
        const friends = await sql<{ handle: string }>`
          select p.handle from nf_profiles p
          join nf_connects c on (
            (c.user_id = p.user_id and c.fellow_id = ${context.userId})
            or (c.fellow_id = p.user_id and c.user_id = ${context.userId})
          )
          where lower(coalesce(c.status, '')) = 'accepted' and p.user_id <> ${context.userId}`;
        pals = new Set(friends.map((f) => f.handle.toLowerCase()));
      } catch {
        pals = new Set();
      }
      const drop = new Set<string>();
      for (const r of rows) {
        const m = /^@([A-Za-z0-9._-]+) wants to connect/i.exec(r.text);
        if (m && pals.has(m[1].toLowerCase())) drop.add(r.id);
      }
      if (drop.size) {
        for (const id of drop) {
          await sql`delete from nf_notes where id = ${id} and user_id = ${context.userId}`;
        }
      }
      return rows
        .filter((r) => !drop.has(r.id))
        .map((r) => ({ id: r.id, text: r.text, href: r.href || undefined, ts: Number(r.ts), seen: Number(r.seen) }));
    } catch {
      return [];
    }
  });

export const markNotesRead = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    try {
      await ensureNotes(sql);
      await sql`update nf_notes set seen = 1 where user_id = ${context.userId} and seen = 0`;
    } catch {
      /* ignore */
    }
    return { ok: true as const };
  });

export const listInbox = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const me = await publicHandle(context.userId);
    try {
      await ensureDm(sql);
      const rows = await sql<{ id: string; from_handle: string; to_handle: string; body: string; ts: number | string }>`
        select id, from_handle, to_handle, body, ts from nf_dm
        where from_id = ${context.userId} or to_user_id = ${context.userId} or lower(to_handle) = ${me.toLowerCase()}
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
    const to = data.to.trim().replace(/^@/, "").slice(0, 24);
    const body = data.body.trim().slice(0, 500);
    if (!to || !body) return { ok: false as const, reason: "Need a username and a message." };
    if (!(await allowWrite(`dm:${context.userId}`, 12))) return { ok: false as const, reason: RATE_BLOCKED };
    const sql = await getSql();
    const from = await publicHandle(context.userId);
    if (to.toLowerCase() === from.toLowerCase()) return { ok: false as const, reason: "That is you." };
    const gate = await gateText("comments", body, { userId: context.userId, author: from });
    if (!gate.ok) return { ok: false as const, reason: gate.reason };
    const toId = await userIdByHandle(to);
    if (!toId) return { ok: false as const, reason: "No user with that handle." };
    if (toId === context.userId) return { ok: false as const, reason: "That is you." };
    try {
      const blocked = await sql<{ user_id: string }>`
        select user_id from nf_blocks
        where (user_id = ${context.userId} and blocked_id = ${toId}) or (user_id = ${toId} and blocked_id = ${context.userId})
        limit 1`;
      if (blocked[0]) return { ok: false as const, reason: "You can't message this person." };
    } catch {
      /* block table is created on first block */
    }
    try {
      const row = await sql<{ status: string | null }>`
        select status from nf_connects
        where lower(coalesce(status, '')) = 'accepted'
          and ((user_id = ${context.userId} and fellow_id = ${toId}) or (user_id = ${toId} and fellow_id = ${context.userId}))
        limit 1`;
      if (!row[0]) return { ok: false as const, reason: "They have to accept your request before you can message." };
    } catch {
      return { ok: false as const, reason: "They have to accept your request before you can message." };
    }
    const toHandle = await publicHandle(toId);
    const id = nid();
    try {
      await ensureDm(sql);
      await sql`insert into nf_dm (id, from_id, from_handle, to_handle, to_user_id, body, ts)
        values (${id}, ${context.userId}, ${from}, ${toHandle}, ${toId}, ${gate.text}, ${Date.now()})`;
    } catch {
      return { ok: false as const, reason: "Inbox is not ready. Try once more." };
    }
    const preview = gate.text.length > 80 ? `${gate.text.slice(0, 77)}…` : gate.text;
    await pushNote(toId, `DM from @${from}: ${preview}`, "/?open=inbox");
    return { ok: true as const, id };
  });
