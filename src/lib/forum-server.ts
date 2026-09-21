import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { asAccountKind, type AccountKind, type AdPlacement } from "@/lib/qonvo-data";
import { canKind, kindActionHint, type KindAction } from "@/lib/permissions";
import { gateText } from "@/lib/mod-cache";
import { pushNote, userIdByHandle } from "@/lib/social-server";
import { allowWrite, RATE_BLOCKED } from "@/lib/rate-limit";
import { applyMatch } from "@/lib/pay-match";

async function kindOf(userId: string): Promise<AccountKind> {
  try {
    const sql = await getSql();
    const rows = await sql<{ kind: string | null }>`select kind from nf_profiles where user_id = ${userId} limit 1`;
    return asAccountKind(rows[0]?.kind);
  } catch {
    return "member";
  }
}

async function requireKind(userId: string, action: KindAction) {
  const kind = await kindOf(userId);
  if (!canKind(kind, action)) return kindActionHint(action);
  return null;
}

function nid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

async function publicHandle(userId: string) {
  const sql = await getSql();
  const rows = await sql<{ handle: string }>`select handle from nf_profiles where user_id = ${userId} limit 1`;
  const h = rows[0]?.handle?.trim();
  if (h) return h.slice(0, 24);
  return userId.slice(0, 12);
}

async function musicCover(url: string, platform: string) {
  const ctrl = AbortSignal.timeout(2500);
  try {
    if (platform === "Spotify") {
      const r = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`, { signal: ctrl });
      const j = (await r.json()) as { thumbnail_url?: string };
      return j.thumbnail_url ?? "";
    }
    if (platform === "SoundCloud") {
      const r = await fetch(`https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(url)}`, { signal: ctrl });
      const j = (await r.json()) as { thumbnail_url?: string };
      return j.thumbnail_url ?? "";
    }
  } catch {
    return "";
  }
  return "";
}

const gTtl = globalThis as typeof globalThis & { __nfChatTtl?: { at: number; hours: number } };

export function invalidateChatTtl() {
  gTtl.__nfChatTtl = undefined;
}

export async function loadChatTtlHours(): Promise<number> {
  if (gTtl.__nfChatTtl && Date.now() - gTtl.__nfChatTtl.at < 12_000) return gTtl.__nfChatTtl.hours;
  try {
    const sql = await getSql();
    const rows = await sql<{ chat_ttl_hours: number | string }>`select chat_ttl_hours from nf_site where id = 1 limit 1`;
    const hours = Number(rows[0]?.chat_ttl_hours ?? 24);
    const n = Number.isFinite(hours) && hours >= 0 ? Math.floor(hours) : 24;
    gTtl.__nfChatTtl = { at: Date.now(), hours: n };
    return n;
  } catch {
    return 24;
  }
}

async function restrictionOf(userId: string): Promise<"ban" | "mute" | null> {
  try {
    const sql = await getSql();
    const rows = await sql<{ kind: string; until_ts: number | string }>`select kind, until_ts from nf_mod_users where user_id = ${userId} limit 1`;
    const r = rows[0];
    if (!r) return null;
    const until = Number(r.until_ts);
    if (until > 0 && until < Date.now()) {
      await sql`delete from nf_mod_users where user_id = ${userId}`;
      return null;
    }
    return r.kind === "ban" || r.kind === "mute" ? r.kind : null;
  } catch {
    return null;
  }
}

async function roomPresence(roomId: string) {
  try {
    const sql = await getSql();
    const cut = Date.now() - 45_000;
    const rows = await sql<{ handle: string; typing_until: number | string }>`
      select handle, typing_until from nf_presence
      where room_id = ${roomId} and seen >= ${cut}
      order by seen desc limit 16`;
    const now = Date.now();
    const online = rows.map((r) => ({
      handle: r.handle,
      typing: Number(r.typing_until) > now,
    }));
    return { online, typing: online.filter((u) => u.typing).map((u) => u.handle) };
  } catch {
    return { online: [] as { handle: string; typing: boolean }[], typing: [] as string[] };
  }
}

export const getChatTtl = createServerFn({ method: "GET" }).handler(async () => {
  const hours = await loadChatTtlHours();
  return { hours };
});

export const listPosts = createServerFn({ method: "GET" }).handler(async () => {
  const sql = await getSql();
  const posts = await sql<{
    id: string;
    title: string;
    body: string;
    excerpt: string | null;
    category: string | null;
    tags: string | null;
    link: string | null;
    image: string | null;
    slug: string | null;
    status: string;
    author: string;
    ts: number | string;
    views: number | string | null;
  }>`select id, title, body, excerpt, category, tags, link, image, slug, status, author, ts, views from nf_posts where status = 'publish' order by ts desc limit 520`;
  const comments = await sql<{
    post_id: string;
    author: string;
    body: string;
    ts: number | string;
    parent_ts: number | string | null;
  }>`select post_id, author, body, ts, parent_ts from nf_comments order by ts asc`;
  return posts.map((p) => ({
    ...p,
    ts: Number(p.ts),
    views: Number(p.views ?? 0),
    comments: comments
      .filter((c) => c.post_id === p.id)
      .map((c) => ({ author: c.author, body: c.body, ts: Number(c.ts), parentTs: c.parent_ts ? Number(c.parent_ts) : undefined })),
  }));
});

export const savePost = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { title: string; body: string; excerpt?: string; category?: string; tags?: string; link?: string; image?: string; slug?: string; seoTitle?: string; seoDesc?: string; altText?: string; sourceName?: string; status?: "draft" | "publish"; commentsOn?: boolean }) => d)
  .handler(async ({ context, data }) => {
    if (!allowWrite(`post:${context.userId}`, 8)) return { ok: false as const, reason: RATE_BLOCKED };
    const title = data.title.trim();
    const body = data.body.trim();
    if (!title || !body) return null;
    const sql = await getSql();
    const id = nid();
    const ts = Date.now();
    const author = await publicHandle(context.userId);
    if ((await restrictionOf(context.userId)) === "ban") return { ok: false as const, reason: "This account is banned." };
    const blocked = await requireKind(context.userId, "feeds.post");
    if (blocked) return { ok: false as const, reason: blocked };
    const gate = await gateText("feeds", body, { userId: context.userId, author });
    if (!gate.ok) return { ok: false as const, reason: gate.reason };
    const excerpt = data.excerpt ?? gate.text.slice(0, 140);
    const seoTitle = (data.seoTitle ?? "").trim().slice(0, 80);
    const seoDesc = (data.seoDesc ?? "").trim().slice(0, 180);
    const altText = (data.altText ?? "").trim().slice(0, 120);
    const sourceName = (data.sourceName ?? "").trim().slice(0, 80);
    const status = data.status === "draft" ? "draft" : "publish";
    const commentsOn = data.commentsOn === false ? 0 : 1;
    try {
      await sql`insert into nf_posts (id, user_id, title, body, excerpt, category, tags, link, image, slug, status, author, ts, seo_title, seo_desc, alt_text, source_name, comments_on)
        values (${id}, ${context.userId}, ${title}, ${gate.text}, ${excerpt}, ${data.category ?? "General"}, ${data.tags ?? ""}, ${data.link ?? ""}, ${data.image ?? ""}, ${data.slug ?? ""}, ${status}, ${author}, ${ts}, ${seoTitle}, ${seoDesc}, ${altText}, ${sourceName}, ${commentsOn})`;
    } catch {
      await sql`insert into nf_posts (id, user_id, title, body, excerpt, category, tags, link, image, slug, status, author, ts)
        values (${id}, ${context.userId}, ${title}, ${gate.text}, ${excerpt}, ${data.category ?? "General"}, ${data.tags ?? ""}, ${data.link ?? ""}, ${data.image ?? ""}, ${data.slug ?? ""}, ${status}, ${author}, ${ts})`;
    }
    return { id };
  });

export const saveComment = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { postId: string; body: string; parentTs?: number }) => d)
  .handler(async ({ context, data }) => {
    const body = data.body.trim();
    if (!body || !data.postId) return null;
    const sql = await getSql();
    const id = nid();
    const ts = Date.now();
    const author = await publicHandle(context.userId);
    if ((await restrictionOf(context.userId)) === "ban") return { ok: false as const, reason: "This account is banned." };
    const gate = await gateText("comments", body, { userId: context.userId, author });
    if (!gate.ok) return { ok: false as const, reason: gate.reason };
    await sql`insert into nf_comments (id, post_id, user_id, author, body, ts, parent_ts)
      values (${id}, ${data.postId}, ${context.userId}, ${author}, ${gate.text}, ${ts}, ${data.parentTs ?? null})`;
    try {
      const post = await sql<{ user_id: string; title: string }>`select user_id, title from nf_posts where id = ${data.postId} limit 1`;
      if (post[0] && post[0].user_id !== context.userId) {
        await pushNote(post[0].user_id, `${author} commented on “${post[0].title.slice(0, 40)}”`, `/p/${data.postId}`);
      }
      if (data.parentTs) {
        const parent = await sql<{ user_id: string; author: string }>`select user_id, author from nf_comments where post_id = ${data.postId} and ts = ${data.parentTs} limit 1`;
        if (parent[0] && parent[0].user_id !== context.userId) {
          await pushNote(parent[0].user_id, `${author} replied to your comment`, `/p/${data.postId}`);
        }
      }
    } catch {
      /* notes optional */
    }
    return { id };
  });

export const listTracks = createServerFn({ method: "GET" }).handler(async () => {
  const sql = await getSql();
  const rows = await sql<{
    id: string;
    title: string;
    artist: string;
    url: string;
    platform: string;
    embed: string | null;
    cover: string | null;
    genre: string | null;
    album: string | null;
    note: string | null;
    tags: string | null;
    author: string;
    ts: number | string;
    views: number | string | null;
  }>`select id, title, artist, url, platform, embed, cover, genre, album, note, tags, author, ts, views from nf_tracks order by ts desc limit 80`;
  return rows.map((r) => ({ ...r, ts: Number(r.ts), views: Number(r.views ?? 0) }));
});

export const saveTrack = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { title: string; artist: string; url: string; platform: string; embed?: string; cover?: string; genre?: string; album?: string; note?: string; tags?: string }) => d)
  .handler(async ({ context, data }) => {
    if (!allowWrite(`track:${context.userId}`, 8)) return { ok: false as const, reason: RATE_BLOCKED };
    const sql = await getSql();
    if ((await restrictionOf(context.userId)) === "ban") return { ok: false as const, reason: "This account is banned." };
    const blocked = await requireKind(context.userId, "music.submit");
    if (blocked) return { ok: false as const, reason: blocked };
    const author = await publicHandle(context.userId);
    const gate = await gateText("music", `${data.title} ${data.artist} ${data.note ?? ""}`, { userId: context.userId, author });
    if (!gate.ok) return { ok: false as const, reason: gate.reason };
    const id = nid();
    const ts = Date.now();
    const cover = data.cover?.trim() || (await musicCover(data.url, data.platform));
    await sql`insert into nf_tracks (id, user_id, title, artist, url, platform, embed, cover, genre, album, note, tags, author, ts)
      values (${id}, ${context.userId}, ${data.title}, ${data.artist}, ${data.url}, ${data.platform}, ${data.embed ?? ""}, ${cover}, ${data.genre ?? ""}, ${data.album ?? ""}, ${data.note ?? ""}, ${data.tags ?? ""}, ${author}, ${ts})`;
    return { id };
  });

export const listAds = createServerFn({ method: "GET" }).handler(async () => {
  const sql = await getSql();
  const now = Date.now();
  try {
    const rows = await sql<{
      id: string;
      name: string;
      note: string | null;
      placement: string;
      status: string;
      amount: string | null;
      tx_hash: string | null;
      coin: string | null;
      link: string | null;
      image: string | null;
      kind: string | null;
      video: string | null;
      views: number | string | null;
      ts: number | string;
      days: number | string | null;
      expires_at: number | string | null;
    }>`select id, name, note, placement, status, amount, tx_hash, coin, link, image, kind, video, views, ts, days, expires_at from nf_ads where status = ${"approved"} and (expires_at is null or expires_at > ${now}) order by ts desc limit 200`;
    return rows.map(mapAd);
  } catch {
    const rows = await sql<{
      id: string;
      name: string;
      note: string | null;
      placement: string;
      status: string;
      amount: string | null;
      tx_hash: string | null;
      coin: string | null;
      link: string | null;
      image: string | null;
      kind: string | null;
      video: string | null;
      views: number | string | null;
      ts: number | string;
    }>`select id, name, note, placement, status, amount, tx_hash, coin, link, image, kind, video, views, ts from nf_ads where status = ${"approved"} order by ts desc limit 200`;
    return rows.map((r) => mapAd({ ...r, days: 7, expires_at: null }));
  }
});

function mapAd(r: {
  id: string;
  name: string;
  note: string | null;
  placement: string;
  status: string;
  amount: string | null;
  tx_hash: string | null;
  coin: string | null;
  link: string | null;
  image: string | null;
  kind: string | null;
  video: string | null;
  views: number | string | null;
  ts: number | string;
  days?: number | string | null;
  expires_at?: number | string | null;
}) {
  return {
    id: r.id,
    name: r.name,
    note: r.note ?? "",
    placement: (r.placement || "board") as CampaignPlacement,
    status: r.status as "pending" | "paid" | "approved" | "rejected",
    amount: r.amount ?? undefined,
    txHash: r.tx_hash ?? undefined,
    coin: r.coin ?? undefined,
    link: r.link ?? undefined,
    image: r.image ?? undefined,
    kind: (r.kind as Campaign["kind"]) || undefined,
    video: r.video ?? undefined,
    views: Number(r.views ?? 0),
    ts: Number(r.ts),
    days: Number(r.days ?? 7),
    expiresAt: r.expires_at ? Number(r.expires_at) : undefined,
  };
}

type CampaignPlacement = AdPlacement | "sidebar" | "hero";
type Campaign = { kind?: "image" | "video" | "image-text" | "video-text" | "text" };

export const listMyAds = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    try {
      const rows = await sql<{
        id: string;
        name: string;
        note: string | null;
        placement: string;
        status: string;
        amount: string | null;
        tx_hash: string | null;
        coin: string | null;
        link: string | null;
        image: string | null;
        kind: string | null;
        video: string | null;
        views: number | string | null;
        ts: number | string;
        days: number | string | null;
        expires_at: number | string | null;
      }>`select id, name, note, placement, status, amount, tx_hash, coin, link, image, kind, video, views, ts, days, expires_at from nf_ads where user_id = ${context.userId} order by ts desc limit 40`;
      return rows.map(mapAd);
    } catch {
      return [] as ReturnType<typeof mapAd>[];
    }
  });

export const saveAdRow = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { name: string; note: string; placement?: string; status?: string; amount?: string; txHash?: string; coin?: string; link?: string; image?: string; kind?: string; video?: string; days?: number }) => d)
  .handler(async ({ context, data }) => {
    if (!allowWrite(`ad:${context.userId}`, 6)) return { ok: false as const, reason: RATE_BLOCKED };
    const name = data.name.trim();
    if (!name) return null;
    const sql = await getSql();
    try {
      await sql`alter table nf_ads add column if not exists days int not null default 7`;
      await sql`alter table nf_ads add column if not exists expires_at bigint`;
    } catch {
      /* older drivers */
    }
    if ((await restrictionOf(context.userId)) === "ban") return { ok: false as const, reason: "This account is banned." };
    const blocked = await requireKind(context.userId, "ads.submit");
    if (blocked) return { ok: false as const, reason: blocked };
    try {
      await sql`create table if not exists nf_ad_catalog (k text primary key, v text not null)`;
      const capRows = await sql<{ v: string }>`select v from nf_ad_catalog where k = ${"daily_cap"}`;
      const cap = Math.min(200, Number(capRows[0]?.v ?? 40) || 40);
      const dayStart = new Date();
      dayStart.setHours(0, 0, 0, 0);
      const today = await sql<{ n: string | number }>`select count(*) as n from nf_ads where ts >= ${dayStart.getTime()}`;
      if (Number(today[0]?.n ?? 0) >= cap) {
        return { ok: false as const, reason: "Today's ad slots are full. Try again tomorrow." };
      }
    } catch {
      /* catalog optional on first boot */
    }
    const author = await publicHandle(context.userId);
    const gate = await gateText("ads", `${name} ${data.note}`, { userId: context.userId, author });
    if (!gate.ok) return { ok: false as const, reason: gate.reason };
    const id = nid();
    const ts = Date.now();
    const days = [1, 7, 14, 30].includes(Number(data.days)) ? Number(data.days) : 7;
    const txHash = (data.txHash ?? "").trim();
    if (txHash) {
      const dup = await sql<{ id: string }>`select id from nf_ads where tx_hash = ${txHash} and status in ('paid', 'approved') limit 1`;
      if (dup[0]) return { ok: false as const, reason: "This transaction hash is already used." };
    }
    await sql`insert into nf_ads (id, user_id, name, note, placement, status, amount, tx_hash, coin, link, image, kind, video, views, ts, days)
      values (${id}, ${context.userId}, ${name}, ${data.note}, ${data.placement ?? "board"}, ${"pending"}, ${data.amount ?? ""}, ${txHash}, ${data.coin ?? ""}, ${data.link ?? ""}, ${data.image ?? ""}, ${data.kind ?? "image-text"}, ${data.video ?? ""}, ${0}, ${ts}, ${days})`;
    if (txHash) {
      const matched = await applyMatch(id, data.coin ?? "", txHash).catch(() => null);
      if (matched) return { id, status: matched.status, match: matched.reason };
    }
    return { id, status: "pending" as const };
  });

export const listWallets = createServerFn({ method: "GET" }).handler(async () => {
  const sql = await getSql();
  const rows = await sql<{ coin: string; address: string }>`select coin, address from nf_wallets`;
  return rows;
});

const gPurge = globalThis as typeof globalThis & { __nfChatPurgeAt?: number };

export const listMsgs = createServerFn({ method: "GET" })
  .validator((d: string | { roomId: string; before?: number; after?: number }) =>
    typeof d === "string" ? { roomId: d } : d,
  )
  .handler(async ({ data }) => {
    const roomId = data.roomId;
    const sql = await getSql();
    const hours = await loadChatTtlHours();
    const cut = hours > 0 ? Date.now() - hours * 3600_000 : 0;
    const now = Date.now();
    if (cut && (!gPurge.__nfChatPurgeAt || now - gPurge.__nfChatPurgeAt > 60_000)) {
      gPurge.__nfChatPurgeAt = now;
      try {
        await sql`delete from nf_msgs where ts < ${cut}`;
      } catch {
        /* ignore */
      }
    }
    type Row = { n: string; t: string; ts: number | string; parent_ts?: number | string | null; parent_n?: string | null; parent_t?: string | null };
    let rows: Row[] = [];
    const selectLive = async () => {
      try {
        return await sql<Row>`select n, t, ts, parent_ts, parent_n, parent_t from nf_msgs where room_id = ${roomId} and ts >= ${cut} order by ts desc limit 40`;
      } catch {
        return (await sql<{ n: string; t: string; ts: number | string }>`select n, t, ts from nf_msgs where room_id = ${roomId} and ts >= ${cut} order by ts desc limit 40`) as Row[];
      }
    };
    if (data.before) {
      try {
        rows = await sql<Row>`select n, t, ts, parent_ts, parent_n, parent_t from nf_msgs where room_id = ${roomId} and ts < ${data.before} and ts >= ${cut} order by ts desc limit 40`;
      } catch {
        rows = (await sql<{ n: string; t: string; ts: number | string }>`select n, t, ts from nf_msgs where room_id = ${roomId} and ts < ${data.before} and ts >= ${cut} order by ts desc limit 40`) as Row[];
      }
      rows = rows.slice().reverse();
    } else if (data.after) {
      try {
        rows = await sql<Row>`select n, t, ts, parent_ts, parent_n, parent_t from nf_msgs where room_id = ${roomId} and ts > ${data.after} and ts >= ${cut} order by ts asc limit 40`;
      } catch {
        rows = (await sql<{ n: string; t: string; ts: number | string }>`select n, t, ts from nf_msgs where room_id = ${roomId} and ts > ${data.after} and ts >= ${cut} order by ts asc limit 40`) as Row[];
      }
    } else {
      const latest = await selectLive();
      rows = latest.slice().reverse();
    }
    const msgs = rows.map((r) => {
      const parentTs = r.parent_ts ? Number(r.parent_ts) : undefined;
      return {
        n: r.n,
        t: r.t,
        ts: Number(r.ts),
        rx: {} as Record<string, number>,
        parentTs: parentTs || undefined,
        parentN: r.parent_n || undefined,
        parentT: r.parent_t || undefined,
      };
    });
    if (msgs.length) {
      try {
        const rx = await sql<{ ts: number | string; kind: string; n: number | string }>`select ts, kind, n from nf_rx where room_id = ${roomId}`;
        const bag = new Map<number, Record<string, number>>();
        rx.forEach((x) => {
          const k = Number(x.ts);
          const cur = bag.get(k) ?? {};
          cur[x.kind] = Number(x.n);
          bag.set(k, cur);
        });
        msgs.forEach((m) => {
          const r = bag.get(m.ts);
          if (r) m.rx = r;
        });
      } catch {
        /* ignore */
      }
    }
    let older = false;
    let newer = false;
    if (msgs.length) {
      const first = msgs[0].ts;
      const last = msgs[msgs.length - 1].ts;
      const olderRows = await sql<{ n: string }>`select n from nf_msgs where room_id = ${roomId} and ts < ${first} and ts >= ${cut} limit 1`;
      const newerRows = await sql<{ n: string }>`select n from nf_msgs where room_id = ${roomId} and ts > ${last} and ts >= ${cut} limit 1`;
      older = olderRows.length > 0;
      newer = newerRows.length > 0;
    } else if (data.after) {
      newer = false;
    }
    const presence = await roomPresence(roomId);
    return { msgs, older, newer, hours, online: presence.online, typing: presence.typing };
  });

export const saveMsg = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { roomId: string; text: string; parentTs?: number }) => d)
  .handler(async ({ context, data }) => {
    if (!allowWrite(`msg:${context.userId}`, 30)) return { ok: false as const, reason: RATE_BLOCKED };
    const text = data.text.trim();
    if (!text) return null;
    const hit = await restrictionOf(context.userId);
    if (hit === "ban") return { ok: false as const, reason: "You are banned from chat." };
    if (hit === "mute") return { ok: false as const, reason: "You are muted." };
    const sql = await getSql();
    const id = nid();
    const ts = Date.now();
    const n = await publicHandle(context.userId);
    const gate = await gateText("chat", text, { userId: context.userId, author: n, roomId: data.roomId });
    if (!gate.ok) return { ok: false as const, reason: gate.reason };
    let parentN: string | undefined;
    let parentT: string | undefined;
    const parentTs = data.parentTs && data.parentTs > 0 ? data.parentTs : undefined;
    if (parentTs) {
      try {
        const p = await sql<{ n: string; t: string }>`select n, t from nf_msgs where room_id = ${data.roomId} and ts = ${parentTs} limit 1`;
        if (p[0]) {
          parentN = p[0].n;
          parentT = p[0].t.slice(0, 80);
        }
      } catch {
        /* ignore */
      }
    }
    try {
      await sql`insert into nf_msgs (id, user_id, room_id, n, t, ts, parent_ts, parent_n, parent_t) values (${id}, ${context.userId}, ${data.roomId}, ${n}, ${gate.text}, ${ts}, ${parentTs ?? null}, ${parentN ?? null}, ${parentT ?? null})`;
    } catch {
      await sql`insert into nf_msgs (id, user_id, room_id, n, t, ts) values (${id}, ${context.userId}, ${data.roomId}, ${n}, ${gate.text}, ${ts})`;
    }
    if (parentN && parentN !== n) {
      const uid = await userIdByHandle(parentN);
      if (uid) await pushNote(uid, `${n} replied in chat`, "/");
    }
    return { id, n, ts, t: gate.text, parentTs, parentN, parentT };
  });

export const pingPresence = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { roomId: string; typing?: boolean }) => d)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const handle = await publicHandle(context.userId);
    const now = Date.now();
    const typingUntil = data.typing ? now + 8_000 : 0;
    try {
      const existing = await sql<{ user_id: string }>`select user_id from nf_presence where user_id = ${context.userId} and room_id = ${data.roomId} limit 1`;
      if (existing[0]) {
        await sql`update nf_presence set handle = ${handle}, typing_until = ${typingUntil}, seen = ${now} where user_id = ${context.userId} and room_id = ${data.roomId}`;
      } else {
        await sql`insert into nf_presence (user_id, room_id, handle, typing_until, seen) values (${context.userId}, ${data.roomId}, ${handle}, ${typingUntil}, ${now})`;
      }
    } catch {
      try {
        await sql.query(`CREATE TABLE IF NOT EXISTS nf_presence (
          user_id TEXT NOT NULL, room_id TEXT NOT NULL, handle TEXT NOT NULL,
          typing_until BIGINT NOT NULL DEFAULT 0, seen BIGINT NOT NULL, PRIMARY KEY (user_id, room_id))`);
        await sql`insert into nf_presence (user_id, room_id, handle, typing_until, seen) values (${context.userId}, ${data.roomId}, ${handle}, ${typingUntil}, ${now})`;
      } catch {
        /* ignore */
      }
    }
    return roomPresence(data.roomId);
  });

export const purgeMsgs = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((roomId: string) => roomId)
  .handler(async ({ context, data: roomId }) => {
    const sql = await getSql();
    const staff = await sql<{ role: string }>`select role from nf_staff where user_id = ${context.userId} limit 1`.catch(() => [] as { role: string }[]);
    const role = staff[0]?.role;
    if (role !== "super" && role !== "admin") throw new Error("Forbidden");
    await sql`delete from nf_msgs where room_id = ${roomId}`;
  });

export const listPins = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql<{ room_id: string }>`select room_id from nf_pins where user_id = ${context.userId} order by ts desc`;
    return rows.map((r) => r.room_id);
  });

export const savePin = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { roomId: string; on: boolean }) => d)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    if (data.on) {
      await sql`insert into nf_pins (user_id, room_id, ts) values (${context.userId}, ${data.roomId}, ${Date.now()})
        on conflict (user_id, room_id) do nothing`;
    } else {
      await sql`delete from nf_pins where user_id = ${context.userId} and room_id = ${data.roomId}`;
    }
  });

export const listTeams = createServerFn({ method: "GET" }).handler(async () => {
  const sql = await getSql();
  const rows = await sql<{ id: string; name: string; members: string }>`select id, name, members from nf_teams order by ts desc limit 40`;
  return rows.map((r) => ({ id: r.id, name: r.name, members: r.members.split(",").filter(Boolean) }));
});

export const saveTeam = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { name: string }) => d)
  .handler(async ({ context, data }) => {
    if (!allowWrite(`team:${context.userId}`, 6)) return { ok: false as const, reason: RATE_BLOCKED };
    const name = data.name.trim().slice(0, 40);
    if (name.length < 2) return { ok: false as const, reason: "Name needs 2+ characters." };
    const sql = await getSql();
    const n = await sql<{ n: string | number }>`select count(*) as n from nf_teams where user_id = ${context.userId}`;
    if (Number(n[0]?.n ?? 0) >= 3) return { ok: false as const, reason: "Max 3 teams you create." };
    const id = nid();
    const who = await publicHandle(context.userId);
    await sql`insert into nf_teams (id, user_id, name, members, ts) values (${id}, ${context.userId}, ${name}, ${who}, ${Date.now()})`;
    return { ok: true as const, id, name, members: [who] };
  });

export const joinTeamRow = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: string) => id)
  .handler(async ({ context, data: id }) => {
    const sql = await getSql();
    const rows = await sql<{ members: string }>`select members from nf_teams where id = ${id} limit 1`;
    if (!rows[0]) return null;
    const who = await publicHandle(context.userId);
    const members = rows[0].members.split(",").filter(Boolean);
    if (!members.includes(who)) {
      if (members.length >= 40) return { ok: false as const, reason: "This team is full (40)." };
      members.push(who);
    }
    await sql`update nf_teams set members = ${members.join(",")} where id = ${id}`;
    return { id, members };
  });

export const getProfile = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const empty = { handle: "", bio: "", city: "", kind: "member" as AccountKind, stage: "", genre: "", website: "", brand: "", face: "", verified: false };
    try {
      const rows = await sql<{
        handle: string;
        bio: string | null;
        city: string | null;
        kind: string | null;
        stage: string | null;
        genre: string | null;
        website: string | null;
        brand: string | null;
        face: string | null;
        verified?: number | string | boolean | null;
      }>`select handle, bio, city, kind, stage, genre, website, brand, face, verified from nf_profiles where user_id = ${context.userId} limit 1`;
      if (!rows[0]) return empty;
      return {
        handle: rows[0].handle,
        bio: rows[0].bio ?? "",
        city: rows[0].city ?? "",
        kind: asAccountKind(rows[0].kind),
        stage: rows[0].stage ?? "",
        genre: rows[0].genre ?? "",
        website: rows[0].website ?? "",
        brand: rows[0].brand ?? "",
        face: rows[0].face ?? "",
        verified: Number(rows[0].verified) === 1 || rows[0].verified === true,
      };
    } catch {
      const rows = await sql<{ handle: string; bio: string | null; city: string | null }>`select handle, bio, city from nf_profiles where user_id = ${context.userId} limit 1`;
      return rows[0] ? { ...empty, handle: rows[0].handle, bio: rows[0].bio ?? "", city: rows[0].city ?? "" } : empty;
    }
  });

export const saveProfile = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { handle: string; bio?: string; city?: string; kind?: string; stage?: string; genre?: string; website?: string; brand?: string; face?: string }) => d)
  .handler(async ({ context, data }) => {
    const handle = data.handle.trim().slice(0, 24);
    if (!handle) return null;
    const bio = data.bio ?? "";
    const city = data.city ?? "";
    const stage = (data.stage ?? "").trim().slice(0, 80);
    const genre = (data.genre ?? "").trim().slice(0, 80);
    const website = (data.website ?? "").trim().slice(0, 200);
    const brand = (data.brand ?? "").trim().slice(0, 80);
    const face = (data.face ?? "").trim().slice(0, 32);
    const sql = await getSql();
    const existing = await sql<{ user_id: string; kind: string | null }>`select user_id, kind from nf_profiles where user_id = ${context.userId} limit 1`;
    const kind = existing[0]?.kind ? asAccountKind(existing[0].kind) : asAccountKind(data.kind);
    try {
      if (existing[0]) {
        await sql`update nf_profiles set handle = ${handle}, bio = ${bio}, city = ${city}, kind = ${kind}, stage = ${stage}, genre = ${genre}, website = ${website}, brand = ${brand}, face = ${face}, ts = ${Date.now()} where user_id = ${context.userId}`;
      } else {
        await sql`insert into nf_profiles (user_id, handle, bio, city, kind, stage, genre, website, brand, face, ts) values (${context.userId}, ${handle}, ${bio}, ${city}, ${kind}, ${stage}, ${genre}, ${website}, ${brand}, ${face}, ${Date.now()})`;
      }
    } catch {
      if (existing[0]) {
        await sql`update nf_profiles set handle = ${handle}, bio = ${bio}, city = ${city}, ts = ${Date.now()} where user_id = ${context.userId}`;
      } else {
        await sql`insert into nf_profiles (user_id, handle, bio, city, ts) values (${context.userId}, ${handle}, ${bio}, ${city}, ${Date.now()})`;
      }
    }
    return { handle, kind, face };
  });

export const sendMail = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((body: string) => body)
  .handler(async ({ context, data: raw }) => {
    const body = raw.trim();
    if (!body) return null;
    const sql = await getSql();
    const id = nid();
    const author = await publicHandle(context.userId);
    await sql`insert into nf_mail (id, user_id, author, body, ts) values (${id}, ${context.userId}, ${author}, ${body}, ${Date.now()})`;
    return { id };
  });

export const listScores = createServerFn({ method: "GET" }).handler(async () => {
  const sql = await getSql();
  const rows = await sql<{ n: string; c: string | number }>`select n, count(*) as c from nf_msgs group by n order by count(*) desc limit 20`;
  return rows.map((r) => ({ name: r.n, n: Number(r.c) }));
});

export const saveRx = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { roomId: string; ts: number; kind: string }) => d)
  .handler(async ({ data }) => {
    const sql = await getSql();
    const existing = await sql<{ n: number | string }>`select n from nf_rx where room_id = ${data.roomId} and ts = ${data.ts} and kind = ${data.kind} limit 1`;
    if (existing[0]) {
      await sql`update nf_rx set n = ${Number(existing[0].n) + 1} where room_id = ${data.roomId} and ts = ${data.ts} and kind = ${data.kind}`;
    } else {
      await sql`insert into nf_rx (room_id, ts, kind, n) values (${data.roomId}, ${data.ts}, ${data.kind}, ${1})`;
    }
  });

export const reportPost = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { postId: string; reason: string }) => d)
  .handler(async ({ context, data }) => {
    const reason = data.reason.trim().slice(0, 280);
    if (!reason || !data.postId) return null;
    const sql = await getSql();
    const id = nid();
    const author = await publicHandle(context.userId);
    await sql`insert into nf_reports (id, post_id, user_id, author, reason, ts) values (${id}, ${data.postId}, ${context.userId}, ${author}, ${reason}, ${Date.now()})`;
    return { id };
  });

export const listJoins = createServerFn({ method: "GET" }).handler(async () => {
  const sql = await getSql();
  const rows = await sql<{ name: string; room: string | null; ts: number | string }>`select name, room, ts from nf_joins order by ts desc limit 20`;
  return rows.map((r) => ({ name: r.name, room: r.room ?? undefined, ts: Number(r.ts) }));
});

export const saveJoin = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { name: string; room?: string }) => d)
  .handler(async ({ data }) => {
    const sql = await getSql();
    const name = data.name.trim().slice(0, 24);
    if (!name) return;
    const existing = await sql<{ name: string }>`select name from nf_joins where name = ${name} limit 1`;
    if (existing[0]) {
      await sql`update nf_joins set room = ${data.room ?? ""}, ts = ${Date.now()} where name = ${name}`;
    } else {
      await sql`insert into nf_joins (name, room, ts) values (${name}, ${data.room ?? ""}, ${Date.now()})`;
    }
  });

export const bumpView = createServerFn({ method: "POST" })
  .validator((d: { table: "posts" | "ads" | "tracks"; id: string }) => d)
  .handler(async ({ data }) => {
    const sql = await getSql();
    if (data.table === "posts") await sql`update nf_posts set views = coalesce(views, 0) + 1 where id = ${data.id}`;
    else if (data.table === "ads") await sql`update nf_ads set views = coalesce(views, 0) + 1 where id = ${data.id}`;
    else await sql`update nf_tracks set views = coalesce(views, 0) + 1 where id = ${data.id}`;
  });

