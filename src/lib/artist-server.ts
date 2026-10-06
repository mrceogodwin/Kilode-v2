import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { canKind, kindActionHint } from "@/lib/permissions";
import { asAccountKind, type AccountKind } from "@/lib/qonvo-data";
import { allowWrite, RATE_BLOCKED } from "@/lib/rate-limit";
import { releaseCheckout, takePaidCheckout } from "@/lib/pay-gateways";
import { appleTrackId, artworkFromLookup, pushDays, pushNetwork } from "@/lib/artist-rules";

function nid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

async function ensure() {
  const sql = await getSql();
  await sql.query(`CREATE TABLE IF NOT EXISTS nf_pushes (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    handle TEXT NOT NULL,
    title TEXT NOT NULL,
    note TEXT NOT NULL DEFAULT '',
    url TEXT NOT NULL,
    network TEXT NOT NULL,
    cover TEXT NOT NULL DEFAULT '',
    days INT NOT NULL,
    status TEXT NOT NULL,
    tx_hash TEXT NOT NULL DEFAULT '',
    clicks INT NOT NULL DEFAULT 0,
    views INT NOT NULL DEFAULT 0,
    ts BIGINT NOT NULL,
    expires_at BIGINT
  )`);
  await sql.query(`ALTER TABLE nf_pushes ADD COLUMN IF NOT EXISTS views INT NOT NULL DEFAULT 0`);
  await sql.query(`ALTER TABLE nf_pushes ADD COLUMN IF NOT EXISTS target_city TEXT NOT NULL DEFAULT ''`);
  await sql.query(`ALTER TABLE nf_pushes ADD COLUMN IF NOT EXISTS target_age TEXT NOT NULL DEFAULT ''`);
  await sql.query(`CREATE TABLE IF NOT EXISTS nf_artist_follows (
    user_id TEXT NOT NULL,
    slug TEXT NOT NULL,
    name TEXT NOT NULL DEFAULT '',
    ts BIGINT NOT NULL,
    PRIMARY KEY (user_id, slug)
  )`);
  await sql.query(`CREATE TABLE IF NOT EXISTS nf_presaves (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    artist TEXT NOT NULL,
    title TEXT NOT NULL,
    when_label TEXT NOT NULL DEFAULT '',
    url TEXT NOT NULL DEFAULT '',
    cover TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'open',
    ts BIGINT NOT NULL
  )`);
  await sql.query(`CREATE TABLE IF NOT EXISTS nf_presave_interest (
    presave_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    ts BIGINT NOT NULL,
    PRIMARY KEY (presave_id, user_id)
  )`);
  await sql.query(`CREATE TABLE IF NOT EXISTS nf_payouts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    handle TEXT NOT NULL,
    note TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pending',
    ts BIGINT NOT NULL
  )`);
  return sql;
}

async function kindOf(userId: string): Promise<AccountKind> {
  const sql = await getSql();
  const rows = await sql<{ kind: string | null }>`select kind from nf_profiles where user_id = ${userId} limit 1`;
  return asAccountKind(rows[0]?.kind);
}

async function coverFor(url: string, network: string) {
  const id = appleTrackId(url);
  if (id && network === "Apple Music") {
    try {
      const r = await fetch(`https://itunes.apple.com/lookup?id=${id}`, { signal: AbortSignal.timeout(2500) });
      return artworkFromLookup(await r.json());
    } catch {
      return "";
    }
  }
  if (network === "Spotify" || network === "Audiomack" || network === "SoundCloud") {
    try {
      const endpoint = network === "Spotify"
        ? `https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`
        : network === "Audiomack"
          ? `https://audiomack.com/oembed?url=${encodeURIComponent(url)}&format=json`
          : `https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(url)}`;
      const r = await fetch(endpoint, { signal: AbortSignal.timeout(2500) });
      const j = (await r.json()) as { thumbnail_url?: string };
      return j.thumbnail_url?.startsWith("https://") ? j.thumbnail_url : "";
    } catch {
      return "";
    }
  }
  return "";
}

export type PushCard = {
  id: string;
  handle: string;
  title: string;
  note: string;
  url: string;
  network: string;
  cover: string;
  clicks: number;
  views: number;
  targetCity: string;
  targetAge: string;
  ts: number;
  expiresAt: number;
  days: number;
};

export const listLivePushes = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const sql = await ensure();
    const now = Date.now();
    const rows = await sql<{
      id: string; handle: string; title: string; note: string | null; url: string; network: string;
      cover: string | null; clicks: number | string | null; views: number | string | null; target_city: string | null; target_age: string | null; ts: number | string; expires_at: number | string | null; days: number | string;
    }>`select id, handle, title, note, url, network, cover, clicks, views, target_city, target_age, ts, expires_at, days from nf_pushes
      where status = ${"live"} and expires_at > ${now} order by ts desc limit 8`;
    return rows.map((r): PushCard => ({
      id: r.id,
      handle: r.handle,
      title: r.title,
      note: r.note ?? "",
      url: r.url,
      network: r.network,
      cover: r.cover ?? "",
      clicks: Number(r.clicks ?? 0),
      views: Number(r.views ?? 0),
      targetCity: r.target_city ?? "",
      targetAge: r.target_age ?? "",
      ts: Number(r.ts),
      expiresAt: Number(r.expires_at ?? 0),
      days: Number(r.days),
    }));
  } catch {
    return [] as PushCard[];
  }
});

export const listMyPushes = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    try {
      const sql = await ensure();
      const rows = await sql<{
        id: string; handle: string; title: string; note: string | null; url: string; network: string;
        cover: string | null; clicks: number | string | null; views: number | string | null; ts: number | string; expires_at: number | string | null; days: number | string; status: string;
        target_city: string | null; target_age: string | null; tx_hash: string | null;
      }>`select id, handle, title, note, url, network, cover, clicks, views, ts, expires_at, days, status, target_city, target_age, tx_hash from nf_pushes
        where user_id = ${context.userId} order by ts desc limit 12`;
      return rows.map((r) => ({
        id: r.id,
        title: r.title,
        note: r.note ?? "",
        network: r.network,
        url: r.url,
        cover: r.cover ?? "",
        city: r.target_city ?? "",
        age: r.target_age ?? "",
        clicks: Number(r.clicks ?? 0),
        views: Number(r.views ?? 0),
        status: r.status,
        expiresAt: Number(r.expires_at ?? 0),
        days: Number(r.days),
        receipt: r.tx_hash ?? "",
      }));
    } catch {
      return [];
    }
  });

export const savePush = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { title?: string; note?: string; url?: string; days?: number; txHash?: string; city?: string; age?: string }) => d)
  .handler(async ({ context, data }) => {
    if (!(await allowWrite(`push:${context.userId}`, 4))) return { ok: false as const, reason: RATE_BLOCKED };
    const kind = await kindOf(context.userId);
    if (!canKind(kind, "music.submit")) return { ok: false as const, reason: kindActionHint("music.submit") };
    const title = (data.title ?? "").trim().slice(0, 80);
    if (title.length < 2) return { ok: false as const, reason: "Add a title." };
    const link = pushNetwork(data.url ?? "");
    if (!link) return { ok: false as const, reason: "Use an https link from Instagram, TikTok, X, YouTube, Spotify, Audiomack, Apple Music, SoundCloud, Deezer, or Boomplay." };
    const days = pushDays(`push-${Number(data.days)}`);
    if (!days) return { ok: false as const, reason: "Pick 1, 3, or 7 days." };
    const sql = await ensure();
    const now = Date.now();
    const live = await sql<{ id: string }>`select id from nf_pushes where user_id = ${context.userId} and status = ${"live"} and expires_at > ${now} limit 1`;
    if (live[0]) return { ok: false as const, reason: "You already have a link on Socials. Wait until it ends." };
    const id = nid();
    const taken = await takePaidCheckout({
      reference: String(data.txHash || ""),
      userId: context.userId,
      kind: "push",
      purpose: `push-${days}`,
      refId: id,
    });
    if (!taken.ok) return taken;
    const handleRows = await sql<{ handle: string }>`select handle from nf_profiles where user_id = ${context.userId} limit 1`;
    const handle = (handleRows[0]?.handle || "artist").slice(0, 24);
    const cover = await coverFor(link.url, link.network);
    const expires = now + days * 86_400_000;
    try {
      await sql`insert into nf_pushes (id, user_id, handle, title, note, url, network, cover, days, status, tx_hash, clicks, ts, expires_at, target_city, target_age)
        values (${id}, ${context.userId}, ${handle}, ${title}, ${(data.note ?? "").trim().slice(0, 140)}, ${link.url}, ${link.network}, ${cover}, ${days}, ${"live"}, ${String(data.txHash || "")}, ${0}, ${now}, ${expires}, ${(data.city ?? "").trim().slice(0, 40)}, ${(data.age ?? "").trim().slice(0, 24)})`;
    } catch (e) {
      await releaseCheckout(String(data.txHash || ""), id);
      throw e;
    }
    return { ok: true as const, id, expiresAt: expires };
  });

export const seePush = createServerFn({ method: "POST" })
  .validator((d: { id?: string; kind?: string }) => d)
  .handler(async ({ data }) => {
    const id = String(data.id || "").slice(0, 40);
    if (!id) return { ok: false as const };
    try {
      const sql = await ensure();
      if (data.kind === "view") await sql`update nf_pushes set views = views + 1 where id = ${id}`;
      else await sql`update nf_pushes set clicks = clicks + 1 where id = ${id}`;
    } catch {
      return { ok: false as const };
    }
    return { ok: true as const };
  });

export const setPushState = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { id?: string; action?: string }) => d)
  .handler(async ({ context, data }) => {
    const id = String(data.id || "").slice(0, 40);
    const action = data.action === "pause" || data.action === "resume" || data.action === "end" ? data.action : "";
    if (!id || !action) return { ok: false as const, reason: "Pick a campaign." };
    const sql = await ensure();
    const now = Date.now();
    const rows = await sql<{ status: string; expires_at: number | string }>`select status, expires_at from nf_pushes where id = ${id} and user_id = ${context.userId} limit 1`;
    const row = rows[0];
    if (!row) return { ok: false as const, reason: "That push is not yours." };
    const exp = Number(row.expires_at || 0);
    if (action === "end") {
      await sql`update nf_pushes set status = ${"ended"}, expires_at = ${now} where id = ${id} and user_id = ${context.userId}`;
      return { ok: true as const, status: "ended" };
    }
    if (action === "pause") {
      if (row.status !== "live") return { ok: false as const, reason: "Only a live push can pause." };
      await sql`update nf_pushes set status = ${"paused"} where id = ${id} and user_id = ${context.userId}`;
      return { ok: true as const, status: "paused" };
    }
    if (exp <= now) return { ok: false as const, reason: "This push has ended." };
    const live = await sql<{ id: string }>`select id from nf_pushes where user_id = ${context.userId} and status = ${"live"} and expires_at > ${now} and id <> ${id} limit 1`;
    if (live[0]) return { ok: false as const, reason: "You already have a live push." };
    await sql`update nf_pushes set status = ${"live"} where id = ${id} and user_id = ${context.userId}`;
    return { ok: true as const, status: "live" };
  });

export const artistFollowCount = createServerFn({ method: "GET" })
  .validator((d: { slug?: string }) => d)
  .handler(async ({ data }) => {
    const slug = String(data.slug || "").slice(0, 60);
    if (!slug) return { count: 0, following: false };
    try {
      const sql = await ensure();
      const rows = await sql<{ n: number | string }>`select count(*)::int as n from nf_artist_follows where slug = ${slug}`;
      return { count: Number(rows[0]?.n ?? 0), following: false };
    } catch {
      return { count: 0, following: false };
    }
  });

export const followArtist = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { slug?: string; name?: string }) => d)
  .handler(async ({ context, data }) => {
    const slug = String(data.slug || "").slice(0, 60);
    const name = String(data.name || "").trim().slice(0, 80);
    if (!slug || name.length < 2) return { ok: false as const, reason: "Pick an artist.", following: false, count: 0 };
    const sql = await ensure();
    const mine = await sql<{ user_id: string }>`select user_id from nf_artist_follows where user_id = ${context.userId} and slug = ${slug} limit 1`;
    if (mine[0]) await sql`delete from nf_artist_follows where user_id = ${context.userId} and slug = ${slug}`;
    else await sql`insert into nf_artist_follows (user_id, slug, name, ts) values (${context.userId}, ${slug}, ${name}, ${Date.now()})`;
    const rows = await sql<{ n: number | string }>`select count(*)::int as n from nf_artist_follows where slug = ${slug}`;
    return { ok: true as const, following: !mine[0], count: Number(rows[0]?.n ?? 0) };
  });

export type PreSaveCard = { id: string; artist: string; title: string; whenLabel: string; url: string; cover: string; status: string; interests: number };

export const listPresaves = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const sql = await ensure();
    const rows = await sql<{ id: string; artist: string; title: string; when_label: string | null; url: string | null; cover: string | null; status: string; n: number | string }>`
      select p.id, p.artist, p.title, p.when_label, p.url, p.cover, p.status, count(i.user_id)::int as n
      from nf_presaves p left join nf_presave_interest i on i.presave_id = p.id
      where p.status = ${"open"} group by p.id order by p.ts desc limit 8`;
    return rows.map((r): PreSaveCard => ({
      id: r.id, artist: r.artist, title: r.title, whenLabel: r.when_label ?? "", url: r.url ?? "", cover: r.cover ?? "", status: r.status, interests: Number(r.n ?? 0),
    }));
  } catch {
    return [] as PreSaveCard[];
  }
});

export const savePresave = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { title?: string; whenLabel?: string; url?: string }) => d)
  .handler(async ({ context, data }) => {
    const kind = await kindOf(context.userId);
    if (!canKind(kind, "music.submit")) return { ok: false as const, reason: kindActionHint("music.submit") };
    const title = (data.title ?? "").trim().slice(0, 80);
    const whenLabel = (data.whenLabel ?? "").trim().slice(0, 40);
    if (title.length < 2 || whenLabel.length < 4) return { ok: false as const, reason: "Add the title and the date." };
    const link = pushNetwork(data.url ?? "");
    if (!link) return { ok: false as const, reason: "The drop needs an https music or social link." };
    const sql = await ensure();
    const who = await sql<{ handle: string }>`select handle from nf_profiles where user_id = ${context.userId} limit 1`;
    const id = nid();
    const cover = await coverFor(link.url, link.network);
    await sql`insert into nf_presaves (id, user_id, artist, title, when_label, url, cover, status, ts)
      values (${id}, ${context.userId}, ${(who[0]?.handle || "artist").slice(0, 40)}, ${title}, ${whenLabel}, ${link.url}, ${cover}, ${"open"}, ${Date.now()})`;
    return { ok: true as const, id };
  });

export const wantPresave = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { id?: string }) => d)
  .handler(async ({ context, data }) => {
    const id = String(data.id || "").slice(0, 40);
    if (!id) return { ok: false as const, reason: "Missing drop.", interests: 0 };
    const sql = await ensure();
    const mine = await sql<{ user_id: string }>`select user_id from nf_presave_interest where presave_id = ${id} and user_id = ${context.userId} limit 1`;
    if (mine[0]) await sql`delete from nf_presave_interest where presave_id = ${id} and user_id = ${context.userId}`;
    else await sql`insert into nf_presave_interest (presave_id, user_id, ts) values (${id}, ${context.userId}, ${Date.now()})`;
    const rows = await sql<{ n: number | string }>`select count(*)::int as n from nf_presave_interest where presave_id = ${id}`;
    return { ok: true as const, interests: Number(rows[0]?.n ?? 0), on: !mine[0] };
  });

export const releasePresave = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { id?: string }) => d)
  .handler(async ({ context, data }) => {
    const id = String(data.id || "").slice(0, 40);
    const sql = await ensure();
    const row = await sql<{ user_id: string; title: string; artist: string }>`select user_id, title, artist from nf_presaves where id = ${id} limit 1`;
    if (!row[0] || row[0].user_id !== context.userId) return { ok: false as const, reason: "That drop is not yours.", told: 0 };
    await sql`update nf_presaves set status = ${"released"} where id = ${id}`;
    const people = await sql<{ user_id: string }>`select user_id from nf_presave_interest where presave_id = ${id} limit 40`;
    const { pushNote } = await import("@/lib/social-server");
    let told = 0;
    for (const person of people) {
      try {
        await pushNote(person.user_id, `${row[0].artist} dropped ${row[0].title}`, "/");
        told += 1;
      } catch { /* a missed note does not undo the drop */ }
    }
    return { ok: true as const, told };
  });

export const requestPayout = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { note?: string }) => d)
  .handler(async ({ context, data }) => {
    const kind = await kindOf(context.userId);
    if (!canKind(kind, "music.submit")) return { ok: false as const, reason: kindActionHint("music.submit") };
    const note = (data.note ?? "").trim().slice(0, 180);
    if (note.length < 6) return { ok: false as const, reason: "Say where the money should go." };
    const sql = await ensure();
    const who = await sql<{ handle: string }>`select handle from nf_profiles where user_id = ${context.userId} limit 1`;
    const id = nid();
    await sql`insert into nf_payouts (id, user_id, handle, note, status, ts) values (${id}, ${context.userId}, ${(who[0]?.handle || "artist").slice(0, 24)}, ${note}, ${"pending"}, ${Date.now()})`;
    return { ok: true as const, id, status: "pending" as const };
  });

export const listMyPayouts = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    try {
      const sql = await ensure();
      const rows = await sql<{ id: string; note: string; status: string; ts: number | string }>`select id, note, status, ts from nf_payouts where user_id = ${context.userId} order by ts desc limit 8`;
      return rows.map((r) => ({ id: r.id, note: r.note, status: r.status, ts: Number(r.ts) }));
    } catch {
      return [];
    }
  });
