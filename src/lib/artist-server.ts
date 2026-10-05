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
    ts BIGINT NOT NULL,
    expires_at BIGINT
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
      cover: string | null; clicks: number | string | null; ts: number | string; expires_at: number | string | null; days: number | string;
    }>`select id, handle, title, note, url, network, cover, clicks, ts, expires_at, days from nf_pushes
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
        cover: string | null; clicks: number | string | null; ts: number | string; expires_at: number | string | null; days: number | string; status: string;
      }>`select id, handle, title, note, url, network, cover, clicks, ts, expires_at, days, status from nf_pushes
        where user_id = ${context.userId} order by ts desc limit 12`;
      return rows.map((r) => ({
        id: r.id,
        title: r.title,
        network: r.network,
        url: r.url,
        clicks: Number(r.clicks ?? 0),
        status: r.status,
        expiresAt: Number(r.expires_at ?? 0),
        days: Number(r.days),
      }));
    } catch {
      return [];
    }
  });

export const savePush = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { title?: string; note?: string; url?: string; days?: number; txHash?: string }) => d)
  .handler(async ({ context, data }) => {
    if (!(await allowWrite(`push:${context.userId}`, 4))) return { ok: false as const, reason: RATE_BLOCKED };
    const kind = await kindOf(context.userId);
    if (!canKind(kind, "music.submit")) return { ok: false as const, reason: kindActionHint("music.submit") };
    const title = (data.title ?? "").trim().slice(0, 80);
    if (title.length < 2) return { ok: false as const, reason: "Add a title." };
    const link = pushNetwork(data.url ?? "");
    if (!link) return { ok: false as const, reason: "Use an https link from Instagram, TikTok, X, YouTube, Spotify, Audiomack, Apple Music, SoundCloud, or Deezer." };
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
      await sql`insert into nf_pushes (id, user_id, handle, title, note, url, network, cover, days, status, tx_hash, clicks, ts, expires_at)
        values (${id}, ${context.userId}, ${handle}, ${title}, ${(data.note ?? "").trim().slice(0, 140)}, ${link.url}, ${link.network}, ${cover}, ${days}, ${"live"}, ${String(data.txHash || "")}, ${0}, ${now}, ${expires})`;
    } catch (e) {
      await releaseCheckout(String(data.txHash || ""), id);
      throw e;
    }
    return { ok: true as const, id, expiresAt: expires };
  });

export const seePush = createServerFn({ method: "POST" })
  .validator((d: { id?: string }) => d)
  .handler(async ({ data }) => {
    const id = String(data.id || "").slice(0, 40);
    if (!id) return { ok: false as const };
    try {
      const sql = await ensure();
      await sql`update nf_pushes set clicks = clicks + 1 where id = ${id}`;
    } catch {
      return { ok: false as const };
    }
    return { ok: true as const };
  });
