import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { assertStaff } from "@/lib/staff-server";
import { safeHttpUrl, youtubeId } from "@/lib/qonvo-data";

export type SocialRow = {
  id: string;
  name: string;
  handle: string;
  url: string;
  blurb: string;
  thumb: string;
  followers: string;
  sort: number;
};

export type TvLive = {
  title: string;
  blurb: string;
  youtubeId: string;
  live: boolean;
  url: string;
};

const SEED: SocialRow[] = [
  { id: "youtube", name: "YouTube", handle: "", url: "", blurb: "Shows, news clips, live.", thumb: "", followers: "TV", sort: 1 },
  { id: "tiktok", name: "TikTok", handle: "", url: "", blurb: "Shorts from the desk.", thumb: "", followers: "Clips", sort: 2 },
  { id: "instagram", name: "Instagram", handle: "", url: "", blurb: "Stills and stories.", thumb: "", followers: "Grid", sort: 3 },
  { id: "x", name: "X", handle: "", url: "", blurb: "Breaking and replies.", thumb: "", followers: "Feed", sort: 4 },
  { id: "facebook", name: "Facebook", handle: "", url: "", blurb: "Longer posts and live.", thumb: "", followers: "Page", sort: 5 },
  { id: "telegram", name: "Telegram", handle: "@Builtbystacks", url: "https://t.me/Builtbystacks", blurb: "Alerts in your pocket.", thumb: "", followers: "Channel", sort: 6 },
  { id: "whatsapp", name: "WhatsApp", handle: "", url: "", blurb: "Status and channel drops.", thumb: "", followers: "Chat", sort: 7 },
];

const EMPTY_TV: TvLive = {
  title: "Kilode TV Live",
  blurb: "Live from the Kilode desk.",
  youtubeId: "",
  live: false,
  url: "",
};

async function ensure() {
  const sql = await getSql();
  await sql.query(`create table if not exists nf_socials (
    id text primary key, name text not null, handle text not null default '',
    url text not null default '', blurb text not null default '',
    thumb text not null default '', followers text not null default '', sort int not null default 0)`);
  const n = await sql<{ n: string | number }>`select count(*) as n from nf_socials`;
  if (Number(n[0]?.n ?? 0) === 0) {
    for (const s of SEED) {
      await sql`insert into nf_socials (id, name, handle, url, blurb, thumb, followers, sort)
        values (${s.id}, ${s.name}, ${s.handle}, ${s.url}, ${s.blurb}, ${s.thumb}, ${s.followers}, ${s.sort})`;
    }
  }
  await sql.query(`update nf_socials set url = '', handle = '' where url in (
    'https://www.youtube.com/@KilodeTV',
    'https://www.tiktok.com/@kilode.ng',
    'https://www.instagram.com/kilode.ng',
    'https://x.com/kilode_ng',
    'https://www.facebook.com/kilode.ng',
    'https://whatsapp.com/channel'
  )`);

  await sql.query(`create table if not exists nf_tv_live (
    id text primary key default 'live',
    title text not null default '',
    blurb text not null default '',
    youtube_url text not null default '',
    live int not null default 0,
    updated_at bigint not null default 0
  )`);
  const tvN = await sql<{ n: string | number }>`select count(*) as n from nf_tv_live where id = 'live'`;
  if (Number(tvN[0]?.n ?? 0) === 0) {
    await sql`insert into nf_tv_live (id, title, blurb, youtube_url, live, updated_at)
      values ('live', ${EMPTY_TV.title}, ${EMPTY_TV.blurb}, '', 0, ${Date.now()})
      on conflict (id) do nothing`;
  }
}

function row(r: SocialRow): SocialRow {
  return {
    id: r.id,
    name: r.name,
    handle: r.handle || "",
    url: r.url || "",
    blurb: r.blurb || "",
    thumb: r.thumb || "",
    followers: r.followers || "",
    sort: Number(r.sort) || 0,
  };
}

function tvOf(r: {
  title: string | null;
  blurb: string | null;
  youtube_url: string | null;
  live: number | string | boolean | null;
}): TvLive {
  const rawUrl = (r.youtube_url || "").trim();
  const id = youtubeId(rawUrl) || "";
  const url = id ? (safeHttpUrl(rawUrl) || (rawUrl.startsWith("http") ? rawUrl.slice(0, 300) : `https://www.youtube.com/watch?v=${id}`)) : "";
  return {
    title: (r.title || EMPTY_TV.title).trim() || EMPTY_TV.title,
    blurb: (r.blurb || "").trim() || EMPTY_TV.blurb,
    youtubeId: id,
    live: r.live === true || r.live === 1 || r.live === "1",
    url,
  };
}

export const listSocials = createServerFn({ method: "GET" }).handler(async () => {
  await ensure();
  const sql = await getSql();
  const rows = await sql<SocialRow>`select id, name, handle, url, blurb, thumb, followers, sort from nf_socials order by sort asc, name asc`;
  return rows.map(row);
});

export const saveSocial = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: Partial<SocialRow> & { id: string }) => d)
  .handler(async ({ context, data }) => {
    await assertStaff(context.userId, "super");
    await ensure();
    const sql = await getSql();
    const id = data.id.trim().slice(0, 32);
    if (!id) return { ok: false as const, reason: "Need an id" };
    const name = (data.name || id).trim().slice(0, 40);
    const handle = (data.handle || "").trim().slice(0, 60);
    const url = safeHttpUrl(data.url || "") || (data.url || "").trim().slice(0, 300);
    const blurb = (data.blurb || "").trim().slice(0, 180);
    const thumb = safeHttpUrl(data.thumb || "") || "";
    const followers = (data.followers || "").trim().slice(0, 24);
    const sort = Number(data.sort) || 0;
    await sql`insert into nf_socials (id, name, handle, url, blurb, thumb, followers, sort)
      values (${id}, ${name}, ${handle}, ${url}, ${blurb}, ${thumb}, ${followers}, ${sort})
      on conflict (id) do update set name = ${name}, handle = ${handle}, url = ${url}, blurb = ${blurb}, thumb = ${thumb}, followers = ${followers}, sort = ${sort}`;
    return { ok: true as const };
  });

export const deleteSocial = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { id: string }) => d)
  .handler(async ({ context, data }) => {
    await assertStaff(context.userId, "super");
    const sql = await getSql();
    await sql`delete from nf_socials where id = ${data.id}`;
    return { ok: true as const };
  });

export const getTvLive = createServerFn({ method: "GET" }).handler(async (): Promise<TvLive> => {
  try {
    await ensure();
    const sql = await getSql();
    const rows = await sql<{
      title: string;
      blurb: string;
      youtube_url: string;
      live: number | string | boolean | null;
    }>`select title, blurb, youtube_url, live from nf_tv_live where id = 'live' limit 1`;
    if (!rows[0]) return { ...EMPTY_TV };
    return tvOf(rows[0]);
  } catch {
    return { ...EMPTY_TV };
  }
});

export const saveTvLive = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { title?: string; blurb?: string; youtubeUrl?: string; live?: boolean }) => d)
  .handler(async ({ context, data }) => {
    await assertStaff(context.userId, "super");
    await ensure();
    const sql = await getSql();
    const title = (data.title || EMPTY_TV.title).trim().slice(0, 80) || EMPTY_TV.title;
    const blurb = (data.blurb || "").trim().slice(0, 200) || EMPTY_TV.blurb;
    const raw = (data.youtubeUrl || "").trim();
    let youtubeUrl = "";
    if (raw) {
      const id = youtubeId(raw);
      if (!id) return { ok: false as const, reason: "Need a valid YouTube URL or 11-char id" };
      youtubeUrl = safeHttpUrl(raw) || `https://www.youtube.com/watch?v=${id}`;
    }
    const live = data.live && youtubeUrl ? 1 : 0;
    const ts = Date.now();
    await sql`insert into nf_tv_live (id, title, blurb, youtube_url, live, updated_at)
      values ('live', ${title}, ${blurb}, ${youtubeUrl}, ${live}, ${ts})
      on conflict (id) do update set title = ${title}, blurb = ${blurb}, youtube_url = ${youtubeUrl}, live = ${live}, updated_at = ${ts}`;
    return { ok: true as const, live: tvOf({ title, blurb, youtube_url: youtubeUrl, live }) };
  });
