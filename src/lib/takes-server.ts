import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { allowWrite, RATE_BLOCKED } from "@/lib/rate-limit";
import { gateText } from "@/lib/mod-cache";

export type TakeKind = "take" | "news" | "quote" | "ghost" | "job" | "music" | "banter";

export type TakeRow = {
  id: string;
  handle: string;
  name: string;
  role: string;
  verified: number;
  kind: TakeKind;
  body: string;
  meta: Record<string, string | number | boolean>;
  fact: number;
  cap: number;
  voteA: number;
  voteB: number;
  comments: number;
  reposts: number;
  likes: number;
  ts: number;
  lastReply: string;
};

export type FellowRow = {
  id: string;
  handle: string;
  name: string;
  role: string;
  line: string;
  verified: number;
};

const KINDS = new Set<TakeKind>(["take", "news", "quote", "ghost", "job", "music", "banter"]);

function nid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function num(v: unknown) {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function metaOf(raw: string) {
  try {
    const v = JSON.parse(raw || "{}") as Record<string, string | number | boolean>;
    return v && typeof v === "object" ? v : {};
  } catch {
    return {};
  }
}

async function ensureSeed() {
  const sql = await getSql();
  const n = await sql<{ n: string | number }>`select count(*) as n from nf_takes`;
  if (num(n[0]?.n) > 0) return;
  const now = Date.now();
  const rows: Array<[string, string, string, string, number, TakeKind, string, Record<string, string | number | boolean>, number, number, number, number, number, number, number, number]> = [
    ["seed-take-1", "tundeverse", "TundeVerse", "Tech Enthusiast", 1, "take", "The new Lagos tech scene is different this year. More real builders, less talk.\n\nWhat's your take?", { street: true }, 81, 19, 0, 0, 4, 2, 18, now - 12 * 60_000],
    ["seed-quote-1", "lilycoded", "LilyCoded", "Creator", 1, "quote", "This is the part people skip. The builders are already shipping.", { stance: "AGREED", quoteName: "TundeVerse", quoteHandle: "tundeverse", quoteBody: "More real builders, less talk." }, 12, 3, 0, 0, 1, 0, 6, now - 40 * 60_000],
    ["seed-ghost-1", "ghost", "Anonymous", "", 0, "ghost", "Some of una still dey fake am for the group chat. The work is outside.", { expires: now + 18 * 3600_000 }, 0, 0, 0, 0, 3, 1, 9, now - 2 * 3600_000],
    ["seed-job-1", "jobalertng", "JobAlertNG", "Recruiter", 1, "job", "We're hiring — Senior Frontend Developer", { line: "Remote · $20–35/hr · 2–5 yrs" }, 0, 0, 0, 0, 2, 1, 7, now - 5 * 3600_000],
    ["seed-music-1", "lilycoded", "LilyCoded", "Music", 1, "music", "Late Night Lekki", { artist: "LilyCoded", title: "Late Night Lekki" }, 0, 0, 0, 0, 0, 2, 11, now - 8 * 3600_000],
    ["seed-banter-1", "adablog", "AdaBlog", "Writer", 0, "banter", "Where is the real tech scene right now?", { a: "Lagos Tech", b: "Abuja Tech" }, 0, 0, 62, 38, 5, 1, 4, now - 26 * 3600_000],
    ["seed-lock-1", "tundeverse", "TundeVerse", "Tech Enthusiast", 1, "news", "The shortlist for the Yaba residency just dropped. Names are inside.", { lock: true }, 20, 6, 0, 0, 0, 0, 3, now - 3 * 3600_000],
  ];
  for (const r of rows) {
    await sql`insert into nf_takes (id, user_id, handle, name, role, verified, kind, body, meta, fact, cap, vote_a, vote_b, comments, reposts, likes, ts)
      values (${r[0]}, ${"seed"}, ${r[1]}, ${r[2]}, ${r[3]}, ${r[4]}, ${r[5]}, ${r[6]}, ${JSON.stringify(r[7])}, ${r[8]}, ${r[9]}, ${r[10]}, ${r[11]}, ${r[12]}, ${r[13]}, ${r[14]}, ${r[15]})
      on conflict (id) do nothing`;
  }
  const fellows: FellowRow[] = [
    { id: "f-tunde", handle: "tundeverse", name: "TundeVerse", role: "Tech Enthusiast", line: "Creators → Founders", verified: 1 },
    { id: "f-lily", handle: "lilycoded", name: "LilyCoded", role: "Creator", line: "Creators → Collaborators", verified: 1 },
    { id: "f-job", handle: "jobalertng", name: "JobAlertNG", role: "Recruiter", line: "Job Seekers → Recruiters", verified: 1 },
    { id: "f-ada", handle: "adablog", name: "AdaBlog", role: "Writer", line: "Writers → Readers", verified: 0 },
  ];
  for (const [i, f] of fellows.entries()) {
    await sql`insert into nf_fellows (id, handle, name, role, line, verified, sort)
      values (${f.id}, ${f.handle}, ${f.name}, ${f.role}, ${f.line}, ${f.verified}, ${i})
      on conflict (id) do nothing`;
  }
}

function mapTake(r: Record<string, unknown>): TakeRow {
  const kind = String(r.kind || "take") as TakeKind;
  return {
    id: String(r.id),
    handle: String(r.handle || ""),
    name: String(r.name || r.handle || ""),
    role: String(r.role || ""),
    verified: num(r.verified),
    kind: KINDS.has(kind) ? kind : "take",
    body: String(r.body || ""),
    meta: metaOf(String(r.meta || "{}")),
    fact: num(r.fact),
    cap: num(r.cap),
    voteA: num(r.vote_a),
    voteB: num(r.vote_b),
    comments: num(r.comments),
    reposts: num(r.reposts),
    likes: num(r.likes),
    ts: num(r.ts),
    lastReply: String(r.last_reply || ""),
  };
}

export const listTakes = createServerFn({ method: "GET" })
  .validator((d: { before?: number } | undefined) => d ?? {})
  .handler(async ({ data }) => {
    await ensureSeed();
    const sql = await getSql();
    const before = Number(data?.before || 0);
    const rows = before
      ? await sql`select t.*, (select body from nf_take_replies r where r.take_id = t.id order by r.ts desc limit 1) as last_reply
          from nf_takes t where t.ts < ${before} order by t.ts desc limit 20`
      : await sql`select t.*, (select body from nf_take_replies r where r.take_id = t.id order by r.ts desc limit 1) as last_reply
          from nf_takes t order by t.ts desc limit 20`;
    const fellows = await sql<FellowRow>`select id, handle, name, role, line, verified from nf_fellows order by sort asc, name asc limit 12`;
    const takes = (rows as Record<string, unknown>[]).map(mapTake);
    const next = takes.length === 20 ? takes[takes.length - 1].ts : 0;
    return { takes, fellows, next };
  });

async function handleOf(userId: string) {
  const sql = await getSql();
  const rows = await sql<{ handle: string }>`select handle from nf_profiles where user_id = ${userId} limit 1`;
  return (rows[0]?.handle || "member").slice(0, 24);
}

export const saveTake = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { body: string; kind: string; line?: string; quoteName?: string; quoteHandle?: string; quoteBody?: string }) => d)
  .handler(async ({ data, context }) => {
    const userId = context.userId;
    if (!allowWrite(`take:${userId}`, 12)) return { ok: false as const, reason: RATE_BLOCKED };
    const kind = (KINDS.has(data.kind as TakeKind) ? data.kind : "take") as TakeKind;
    if (kind === "ghost") return { ok: false as const, reason: "That format is not open yet." };
    const body = data.body.trim().slice(0, 280);
    if (body.length < 2) return { ok: false as const, reason: "Write a little more." };
    const handle = await handleOf(userId);
    const checked = await gateText("feeds", body, { userId, author: handle });
    if (!checked.ok) return { ok: false as const, reason: checked.reason };
    const clean = checked.text;
    const meta: Record<string, string> = {};
    if (kind === "job" && data.line) meta.line = data.line.trim().slice(0, 80);
    if (kind === "music") meta.title = clean;
    if (kind === "banter") {
      meta.a = "For";
      meta.b = "Against";
    }
    if (kind === "quote") {
      meta.stance = "REPOST";
      meta.quoteName = (data.quoteName || "Kilode").slice(0, 40);
      meta.quoteHandle = (data.quoteHandle || "kilode").slice(0, 24);
      meta.quoteBody = (data.quoteBody || clean).slice(0, 180);
    }
    const id = nid();
    const ts = Date.now();
    const sql = await getSql();
    await sql`insert into nf_takes (id, user_id, handle, name, role, verified, kind, body, meta, fact, cap, vote_a, vote_b, comments, reposts, likes, ts)
      values (${id}, ${userId}, ${handle.toLowerCase()}, ${handle}, ${""}, ${0}, ${kind}, ${clean}, ${JSON.stringify(meta)}, ${0}, ${0}, ${0}, ${0}, ${0}, ${0}, ${0}, ${ts})`;
    return { ok: true as const, take: mapTake({ id, handle: handle.toLowerCase(), name: handle, role: "", verified: 0, kind, body: clean, meta: JSON.stringify(meta), fact: 0, cap: 0, vote_a: 0, vote_b: 0, comments: 0, reposts: 0, likes: 0, ts, last_reply: "" }) };
  });

export const voteTake = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { id: string; side: string }) => d)
  .handler(async ({ data, context }) => {
    const side = data.side === "fact" || data.side === "cap" || data.side === "a" || data.side === "b" ? data.side : "";
    if (!side || !data.id) return { ok: false as const, reason: "Pick a side." };
    if (!allowWrite(`vote:${context.userId}`, 30)) return { ok: false as const, reason: RATE_BLOCKED };
    const sql = await getSql();
    const prev = await sql<{ side: string }>`select side from nf_take_votes where take_id = ${data.id} and user_id = ${context.userId} limit 1`;
    if (prev[0]?.side === side) return { ok: true as const };
    const col = side === "fact" ? "fact" : side === "cap" ? "cap" : side === "a" ? "vote_a" : "vote_b";
    if (prev[0]?.side) {
      const old = prev[0].side === "fact" ? "fact" : prev[0].side === "cap" ? "cap" : prev[0].side === "a" ? "vote_a" : "vote_b";
      await sql.query(`update nf_takes set ${old} = greatest(${old} - 1, 0) where id = $1`, [data.id]);
      await sql`update nf_take_votes set side = ${side} where take_id = ${data.id} and user_id = ${context.userId}`;
    } else {
      await sql`insert into nf_take_votes (take_id, user_id, side) values (${data.id}, ${context.userId}, ${side})`;
    }
    await sql.query(`update nf_takes set ${col} = ${col} + 1 where id = $1`, [data.id]);
    return { ok: true as const };
  });

export const likeTake = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    if (!data.id) return { ok: false as const, liked: false };
    const sql = await getSql();
    const hit = await sql<{ take_id: string }>`select take_id from nf_take_likes where take_id = ${data.id} and user_id = ${context.userId} limit 1`;
    if (hit[0]) {
      await sql`delete from nf_take_likes where take_id = ${data.id} and user_id = ${context.userId}`;
      await sql`update nf_takes set likes = greatest(likes - 1, 0) where id = ${data.id}`;
      return { ok: true as const, liked: false };
    }
    await sql`insert into nf_take_likes (take_id, user_id) values (${data.id}, ${context.userId}) on conflict do nothing`;
    await sql`update nf_takes set likes = likes + 1 where id = ${data.id}`;
    return { ok: true as const, liked: true };
  });

export const replyTake = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { id: string; body: string }) => d)
  .handler(async ({ data, context }) => {
    const body = data.body.trim().slice(0, 180);
    if (!data.id || body.length < 1) return { ok: false as const, reason: "Write a reply." };
    if (!allowWrite(`reply:${context.userId}`, 20)) return { ok: false as const, reason: RATE_BLOCKED };
    const handle = await handleOf(context.userId);
    const checked = await gateText("comments", body, { userId: context.userId, author: handle });
    if (!checked.ok) return { ok: false as const, reason: checked.reason };
    const clean = checked.text;
    const sql = await getSql();
    await sql`insert into nf_take_replies (id, take_id, user_id, handle, body, ts) values (${nid()}, ${data.id}, ${context.userId}, ${handle}, ${clean}, ${Date.now()})`;
    await sql`update nf_takes set comments = comments + 1 where id = ${data.id}`;
    return { ok: true as const, body: clean };
  });

let repostTableReady = false;

export const repostTake = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    if (!data.id) return { ok: false as const, reposted: false };
    if (!allowWrite(`repost:${context.userId}`, 20)) return { ok: false as const, reason: RATE_BLOCKED, reposted: false };
    const sql = await getSql();
    if (!repostTableReady) {
      await sql`create table if not exists nf_take_reposts (take_id text not null, user_id text not null, primary key (take_id, user_id))`;
      repostTableReady = true;
    }
    const inserted = await sql<{ take_id: string }>`insert into nf_take_reposts (take_id, user_id) values (${data.id}, ${context.userId}) on conflict do nothing returning take_id`;
    if (!inserted[0]) return { ok: true as const, reposted: false };
    await sql`update nf_takes set reposts = reposts + 1 where id = ${data.id}`;
    return { ok: true as const, reposted: true };
  });

export const connectFellow = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    if (!data.id) return { ok: false as const, reason: "Missing person." };
    const sql = await getSql();
    await sql`insert into nf_connects (user_id, fellow_id) values (${context.userId}, ${data.id}) on conflict do nothing`;
    return { ok: true as const };
  });

const REPORT_REASONS = new Set(["Spam", "Scam or fraud", "Harassment or hate", "Nudity or sexual", "Misinformation", "Other"]);

export const reportTake = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { id: string; reason: string }) => d)
  .handler(async ({ context, data }) => {
    const reason = REPORT_REASONS.has(data.reason) ? data.reason : "";
    const id = (data.id || "").trim().slice(0, 40);
    if (!reason || !id) return { ok: false as const, reason: "Pick a reason." };
    if (!allowWrite(`report:${context.userId}`, 5)) return { ok: false as const, reason: "Slow down. Try again in a minute." };
    const sql = await getSql();
    const handle = await handleOf(context.userId);
    await sql`insert into nf_reports (id, post_id, user_id, author, reason, ts) values (${nid()}, ${"take:" + id}, ${context.userId}, ${handle}, ${reason}, ${Date.now()})`;
    return { ok: true as const };
  });

export const searchPeople = createServerFn({ method: "GET" })
  .validator((d: { q?: string }) => ({ q: (d?.q || "").slice(0, 24) }))
  .handler(async ({ data }) => {
    const q = data.q.trim().toLowerCase().replace(/^@/, "").replace(/[^a-z0-9._-]/g, "");
    if (q.length < 2) return [];
    const sql = await getSql();
    try {
      const rows = await sql<{ handle: string; kind: string | null; bio: string | null; verified: boolean | number | null }>`
        select handle, kind, bio, verified from nf_profiles
        where lower(handle) like ${q + "%"}
        order by handle asc
        limit 8`;
      return rows.map((r) => ({
        handle: r.handle,
        name: r.handle,
        role: r.kind || "member",
        line: (r.bio || "").slice(0, 80),
        verified: r.verified ? 1 : 0,
      }));
    } catch {
      return [];
    }
  });
