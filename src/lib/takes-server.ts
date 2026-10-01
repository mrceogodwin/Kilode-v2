import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { allowWrite, RATE_BLOCKED } from "@/lib/rate-limit";
import { gateText } from "@/lib/mod-cache";
import { pushNote } from "@/lib/social-server";

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
  photo?: string;
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

let samplesCleared = false;

async function ensureSeed() {
  if (samplesCleared) return;
  try {
    const sql = await getSql();
    await sql`delete from nf_takes where user_id = ${"seed"} or id like ${"seed-%"}`;
    samplesCleared = true;
  } catch {
    /* table not ready yet — the list query still hides sample ids */
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
          from nf_takes t where t.ts < ${before} and t.user_id <> ${"seed"} and t.id not like ${"seed-%"} order by t.ts desc limit 20`
      : await sql`select t.*, (select body from nf_take_replies r where r.take_id = t.id order by r.ts desc limit 1) as last_reply
          from nf_takes t where t.user_id <> ${"seed"} and t.id not like ${"seed-%"} order by t.ts desc limit 20`;
    const takes = (rows as Record<string, unknown>[]).map(mapTake);
    const next = takes.length === 20 ? takes[takes.length - 1].ts : 0;
    let fellows: FellowRow[] = [];
    try {
      const people = await sql<{ id: string; handle: string; role: string | null; line: string | null; verified: number | boolean | null; photo: string | null }>`
        select user_id as id, handle, kind as role, left(coalesce(bio, ''), 80) as line, verified,
          case
            when photo like 'https://%' then left(photo, 400)
            when left(coalesce(photo, ''), 23) = 'data:image/jpeg;base64,' and length(photo) < 70000 then photo
            else ''
          end as photo
        from nf_profiles
        where handle is not null and length(trim(handle)) > 1
        order by ts desc nulls last
        limit 24`;
      fellows = people
        .filter((p) => p.handle && p.handle !== "member")
        .map((p) => ({
          id: p.id,
          handle: p.handle,
          name: p.handle,
          role: p.role || "member",
          line: (p.line || "").trim(),
          verified: p.verified === true || Number(p.verified) === 1 ? 1 : 0,
          photo: p.photo || "",
        }));
    } catch {
      try {
        const people = await sql<{ id: string; handle: string; role: string | null; line: string | null; verified: number | boolean | null }>`
          select user_id as id, handle, kind as role, left(coalesce(bio, ''), 80) as line, verified
          from nf_profiles
          where handle is not null and length(trim(handle)) > 1
          order by ts desc nulls last
          limit 24`;
        fellows = people
          .filter((p) => p.handle && p.handle !== "member")
          .map((p) => ({
            id: p.id,
            handle: p.handle,
            name: p.handle,
            role: p.role || "member",
            line: (p.line || "").trim(),
            verified: p.verified === true || Number(p.verified) === 1 ? 1 : 0,
            photo: "",
          }));
      } catch {
        fellows = [];
      }
    }
    let faces: Record<string, string> = {};
    try {
      const pics = await sql<{ h: string; photo: string }>`
        select lower(handle) as h,
          case
            when photo like 'https://%' then left(photo, 400)
            when left(coalesce(photo, ''), 23) = 'data:image/jpeg;base64,' and length(photo) < 70000 then photo
            else ''
          end as photo
        from nf_profiles
        where photo is not null and length(photo) > 12
        limit 60`;
      for (const p of pics) if (p.h && p.photo) faces[p.h] = p.photo;
    } catch {
      faces = {};
    }
    let live: string[] = [];
    try {
      const rows = await sql<{ h: string }>`select lower(handle) as h from nf_presence where seen > ${Date.now() - 180000} limit 80`;
      live = rows.map((r) => r.h).filter(Boolean);
    } catch {
      live = [];
    }
    return { takes, fellows, next, live, faces };
  });

export const listLive = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const sql = await getSql();
    const rows = await sql<{ h: string }>`select lower(handle) as h from nf_presence where seen > ${Date.now() - 180000} limit 80`;
    return rows.map((r) => r.h).filter(Boolean);
  } catch {
    return [] as string[];
  }
});

export const listTrending = createServerFn({ method: "GET" })
  .validator((d: { offset?: number; filter?: string } | undefined) => d ?? {})
  .handler(async ({ data }) => {
    const sql = await getSql();
    const offset = Math.max(0, Math.min(180, Number(data?.offset || 0)));
    const filter = data?.filter === "news" || data?.filter === "debate" ? data.filter : "hot";
    const since = Date.now() - 48 * 3600_000;
    try {
      const rows =
        filter === "news"
          ? await sql`select t.*, (coalesce(t.likes,0)*2 + coalesce(t.reposts,0)*3 + coalesce(t.comments,0)*2 + coalesce(t.fact,0) + coalesce(t.cap,0) + coalesce(t.vote_a,0) + coalesce(t.vote_b,0)) as score
              from nf_takes t where t.ts > ${since} and t.kind = ${"news"} and t.user_id <> ${"seed"} and t.id not like ${"seed-%"}
              order by score desc, t.ts desc limit 15 offset ${offset}`
          : filter === "debate"
            ? await sql`select t.*, (coalesce(t.likes,0)*2 + coalesce(t.reposts,0)*3 + coalesce(t.comments,0)*2 + coalesce(t.fact,0) + coalesce(t.cap,0) + coalesce(t.vote_a,0) + coalesce(t.vote_b,0)) as score
              from nf_takes t where t.ts > ${since} and (t.kind = ${"banter"} or coalesce(t.fact,0) + coalesce(t.cap,0) > 0) and t.user_id <> ${"seed"} and t.id not like ${"seed-%"}
              order by score desc, t.ts desc limit 15 offset ${offset}`
            : await sql`select t.*, (coalesce(t.likes,0)*2 + coalesce(t.reposts,0)*3 + coalesce(t.comments,0)*2 + coalesce(t.fact,0) + coalesce(t.cap,0) + coalesce(t.vote_a,0) + coalesce(t.vote_b,0)) as score
              from nf_takes t where t.ts > ${since} and t.user_id <> ${"seed"} and t.id not like ${"seed-%"}
              order by score desc, t.ts desc limit 15 offset ${offset}`;
      const takes = (rows as Record<string, unknown>[]).map((r) => ({ ...mapTake(r), score: num(r.score) }));
      const words = await sql<{ body: string }>`select body from nf_takes where ts > ${since} and user_id <> ${"seed"} order by ts desc limit 80`;
      return { takes, next: takes.length === 15 ? offset + 15 : 0, topics: topicCounts(words.map((w) => w.body)) };
    } catch {
      return { takes: [] as (TakeRow & { score: number })[], next: 0, topics: [] as { word: string; n: number }[] };
    }
  });

const TOPIC_STOP = new Set(["the", "and", "that", "this", "with", "from", "your", "have", "just", "what", "when", "they", "them", "been", "were", "will", "into", "about", "after", "before", "their", "there", "would", "could", "should", "kilode", "repost"]);

function topicCounts(bodies: string[]) {
  const bag = new Map<string, number>();
  for (const body of bodies) {
    for (const w of body.toLowerCase().split(/[^a-z0-9]+/)) {
      if (w.length < 4 || TOPIC_STOP.has(w)) continue;
      bag.set(w, (bag.get(w) || 0) + 1);
    }
  }
  return [...bag.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([word, n]) => ({ word, n }));
}

export const listUserTakes = createServerFn({ method: "GET" })
  .validator((handle: string) => handle)
  .handler(async ({ data }) => {
    const handle = String(data || "").trim().replace(/^@/, "").slice(0, 24).toLowerCase();
    if (!handle) return [] as TakeRow[];
    try {
      const sql = await getSql();
      const rows = await sql`select t.* from nf_takes t where lower(t.handle) = ${handle} and t.user_id <> ${"seed"} order by t.ts desc limit 20`;
      return (rows as Record<string, unknown>[]).map(mapTake);
    } catch {
      return [] as TakeRow[];
    }
  });

function kindsForAccount(account: string): TakeKind[] {
  if (account === "artist") return ["take", "music", "banter", "quote"];
  if (account === "job_poster") return ["take", "job", "banter", "quote"];
  if (account === "writer") return ["take", "news", "banter", "quote"];
  return ["take", "news", "banter", "quote"];
}

async function handleOf(userId: string) {
  const p = await profileOf(userId);
  return p.handle;
}

async function profileOf(userId: string) {
  try {
    const sql = await getSql();
    const rows = await sql<{ handle: string | null; kind: string | null; verified: number | boolean | null }>`
      select handle, kind, verified from nf_profiles where user_id = ${userId} limit 1`;
    const row = rows[0];
    const handle = (row?.handle || "member").trim().slice(0, 24) || "member";
    return { handle, role: (row?.kind || "member").slice(0, 24), verified: row?.verified ? 1 : 0 };
  } catch {
    return { handle: "member", role: "member", verified: 0 };
  }
}

export const saveTake = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { body: string; kind: string; line?: string; quoteName?: string; quoteHandle?: string; quoteBody?: string; quoteHref?: string }) => d)
  .handler(async ({ data, context }) => {
    try {
      const userId = context.userId;
      if (!(await allowWrite(`take:${userId}`, 20))) return { ok: false as const, reason: RATE_BLOCKED };
      const kind = (KINDS.has(data.kind as TakeKind) ? data.kind : "take") as TakeKind;
      if (kind === "ghost") return { ok: false as const, reason: "That format is not open yet." };
      const body = (data.body || "").trim().slice(0, 280);
      if (body.length < 1) return { ok: false as const, reason: "Write something first." };
      const who = await profileOf(userId);
      const allowed = kindsForAccount(who.role);
      if (!allowed.includes(kind)) return { ok: false as const, reason: "That format is not your account type." };
      const checked = await gateText("feeds", body, { userId, author: who.handle });
      if (!checked.ok) return { ok: false as const, reason: checked.reason };
      const clean = checked.text;
      const meta: Record<string, string> = {};
      if (kind === "job") {
        const line = (data.line || "").trim().slice(0, 80);
        if (line.length < 2) return { ok: false as const, reason: "Add the role details. Pay, place, or years." };
        meta.line = line;
      }
      if (kind === "music") {
        meta.title = clean;
        const url = (data.line || "").trim().slice(0, 200);
        if (url && /^https?:\/\//i.test(url)) meta.url = url;
      }
      if (kind === "banter") {
        meta.a = "For";
        meta.b = "Against";
      }
      if (kind === "quote") {
        meta.stance = "REPOST";
        meta.quoteName = (data.quoteName || "Kilode").slice(0, 40);
        meta.quoteHandle = (data.quoteHandle || "kilode").slice(0, 24);
        meta.quoteBody = (data.quoteBody || clean).slice(0, 180);
        if (data.quoteHref && data.quoteHref.startsWith("/p/")) meta.quoteHref = data.quoteHref.slice(0, 180);
      }
      const id = nid();
      const ts = Date.now();
      const sql = await getSql();
      const write = async () => {
        await sql`insert into nf_takes (id, user_id, handle, name, role, verified, kind, body, meta, fact, cap, vote_a, vote_b, comments, reposts, likes, ts)
          values (${id}, ${userId}, ${who.handle.toLowerCase()}, ${who.handle}, ${who.role}, ${who.verified}, ${kind}, ${clean}, ${JSON.stringify(meta)}, ${0}, ${0}, ${0}, ${0}, ${0}, ${0}, ${0}, ${ts})`;
      };
      try {
        await write();
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (/does not exist/i.test(msg)) {
          await sql`create table if not exists nf_takes (
            id text primary key,
            user_id text not null default '',
            handle text not null,
            name text not null,
            role text not null default '',
            verified integer not null default 0,
            kind text not null default 'take',
            body text not null default '',
            meta text not null default '{}',
            fact integer not null default 0,
            cap integer not null default 0,
            vote_a integer not null default 0,
            vote_b integer not null default 0,
            comments integer not null default 0,
            reposts integer not null default 0,
            likes integer not null default 0,
            ts bigint not null
          )`;
          await write();
        } else {
          return { ok: false as const, reason: "Post did not save. Try again." };
        }
      }
      return {
        ok: true as const,
        take: mapTake({
          id,
          handle: who.handle.toLowerCase(),
          name: who.handle,
          role: who.role,
          verified: who.verified,
          kind,
          body: clean,
          meta: JSON.stringify(meta),
          fact: 0,
          cap: 0,
          vote_a: 0,
          vote_b: 0,
          comments: 0,
          reposts: 0,
          likes: 0,
          ts,
          last_reply: "",
        }),
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/unauthor|forbidden/i.test(msg)) throw err;
      return { ok: false as const, reason: "Post did not save. Try again." };
    }
  });

export const voteTake = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { id: string; side: string }) => d)
  .handler(async ({ data, context }) => {
    const side = data.side === "fact" || data.side === "cap" || data.side === "a" || data.side === "b" ? data.side : "";
    if (!side || !data.id) return { ok: false as const, reason: "Pick a side." };
    if (!(await allowWrite(`vote:${context.userId}`, 30))) return { ok: false as const, reason: RATE_BLOCKED };
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
    if (!data.id) return { ok: false as const, liked: false, likes: 0 };
    const sql = await getSql();
    await sql`create table if not exists nf_take_likes (
      take_id text not null,
      user_id text not null,
      primary key (take_id, user_id)
    )`;
    const inserted = await sql<{ take_id: string }>`insert into nf_take_likes (take_id, user_id) values (${data.id}, ${context.userId}) on conflict do nothing returning take_id`;
    if (inserted[0]) {
      const rows = await sql<{ likes: number | string }>`update nf_takes set likes = coalesce(likes, 0) + 1 where id = ${data.id} returning likes`;
      return { ok: true as const, liked: true, likes: Number(rows[0]?.likes ?? 0) };
    }
    await sql`delete from nf_take_likes where take_id = ${data.id} and user_id = ${context.userId}`;
    const rows = await sql<{ likes: number | string }>`update nf_takes set likes = greatest(coalesce(likes, 0) - 1, 0) where id = ${data.id} returning likes`;
    return { ok: true as const, liked: false, likes: Number(rows[0]?.likes ?? 0) };
  });

export const replyTake = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { id: string; body: string }) => d)
  .handler(async ({ data, context }) => {
    const body = data.body.trim().slice(0, 180);
    if (!data.id || body.length < 1) return { ok: false as const, reason: "Write a reply." };
    if (!(await allowWrite(`reply:${context.userId}`, 20))) return { ok: false as const, reason: RATE_BLOCKED };
    const handle = await handleOf(context.userId);
    const checked = await gateText("comments", body, { userId: context.userId, author: handle });
    if (!checked.ok) return { ok: false as const, reason: checked.reason };
    const clean = checked.text;
    const sql = await getSql();
    await sql`insert into nf_take_replies (id, take_id, user_id, handle, body, ts) values (${nid()}, ${data.id}, ${context.userId}, ${handle}, ${clean}, ${Date.now()})`;
    await sql`update nf_takes set comments = comments + 1 where id = ${data.id}`;
    return { ok: true as const, body: clean };
  });

export const applyTake = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    if (!data.id) return { ok: false as const, reason: "That job is missing." };
    if (!(await allowWrite(`apply:${context.userId}`, 12))) return { ok: false as const, reason: RATE_BLOCKED };
    const sql = await getSql();
    await sql`create table if not exists nf_take_applies (
      take_id text not null,
      user_id text not null,
      handle text not null default '',
      ts bigint not null,
      primary key (take_id, user_id)
    )`;
    const row = await sql<{ kind: string }>`select kind from nf_takes where id = ${data.id} limit 1`;
    if (row[0]?.kind !== "job") return { ok: false as const, reason: "That is not a job." };
    const who = await profileOf(context.userId);
    if (who.role === "job_poster") return { ok: false as const, reason: "Job posters apply from a seeker account." };
    const ins = await sql`insert into nf_take_applies (take_id, user_id, handle, ts)
      values (${data.id}, ${context.userId}, ${who.handle}, ${Date.now()})
      on conflict (take_id, user_id) do nothing
      returning take_id`;
    if (!ins[0]) return { ok: true as const, sent: false };
    return { ok: true as const, sent: true };
  });

let repostTableReady = false;

export const repostTake = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    if (!data.id) return { ok: false as const, reposted: false };
    if (!(await allowWrite(`repost:${context.userId}`, 20))) return { ok: false as const, reason: RATE_BLOCKED, reposted: false };
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

async function ensureConnects(sql: Awaited<ReturnType<typeof getSql>>) {
  await sql`create table if not exists nf_connects (
    user_id text not null,
    fellow_id text not null,
    status text not null default 'pending',
    primary key (user_id, fellow_id)
  )`;
  await sql`alter table nf_connects add column if not exists status text not null default 'pending'`;
}

export type ConnectRow = {
  id: string;
  handle: string;
  role: string;
  dir: "in" | "out" | "friend";
};

export const listConnects = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    try {
      await ensureConnects(sql);
      const rows = await sql<{
        user_id: string;
        fellow_id: string;
        status: string | null;
        from_handle: string | null;
        from_kind: string | null;
        to_handle: string | null;
        to_kind: string | null;
      }>`select c.user_id, c.fellow_id, c.status,
          pf.handle as from_handle, pf.kind as from_kind,
          pt.handle as to_handle, pt.kind as to_kind
        from nf_connects c
        left join nf_profiles pf on pf.user_id = c.user_id
        left join nf_profiles pt on pt.user_id = c.fellow_id
        where c.user_id = ${context.userId} or c.fellow_id = ${context.userId}
        limit 80`;
      const best = new Map<string, ConnectRow>();
      const put = (row: ConnectRow) => {
        const prev = best.get(row.id);
        if (!prev || (prev.dir !== "friend" && row.dir === "friend")) best.set(row.id, row);
      };
      for (const r of rows) {
        const status = String(r.status || "").trim().toLowerCase();
        const pending = status !== "accepted";
        const mine = r.user_id === context.userId;
        if (!pending) {
          const other = mine ? r.fellow_id : r.user_id;
          put({
            id: other,
            handle: (mine ? r.to_handle : r.from_handle) || "member",
            role: (mine ? r.to_kind : r.from_kind) || "member",
            dir: "friend",
          });
        } else if (mine) {
          put({ id: r.fellow_id, handle: r.to_handle || "member", role: r.to_kind || "member", dir: "out" });
        } else {
          put({ id: r.user_id, handle: r.from_handle || "member", role: r.from_kind || "member", dir: "in" });
        }
      }
      return [...best.values()];
    } catch {
      return [] as ConnectRow[];
    }
  });

export const replyConnect = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { id: string; accept: boolean }) => d)
  .handler(async ({ context, data }) => {
    const id = (data.id || "").trim().slice(0, 80);
    if (!id) return { ok: false as const, reason: "Missing person." };
    const sql = await getSql();
    await ensureConnects(sql);
    if (data.accept) {
      const byHandle = await sql<{ user_id: string }>`select user_id from nf_profiles where lower(handle) = lower(${id}) limit 1`;
      const who = byHandle[0]?.user_id || id;
      const updated = await sql<{ user_id: string; fellow_id: string }>`update nf_connects set status = ${"accepted"}
        where (user_id = ${who} and fellow_id = ${context.userId})
           or (user_id = ${context.userId} and fellow_id = ${who})
        returning user_id, fellow_id`;
      if (!updated.length) return { ok: false as const, reason: "That request is not on this account." };
      const themId = updated[0].user_id === context.userId ? updated[0].fellow_id : updated[0].user_id;
      const me = await profileOf(context.userId);
      const them = await profileOf(themId);
      if (me.handle && me.handle !== "member") await pushNote(themId, `@${me.handle} accepted your connect.`, "/?open=friends");
      if (them.handle) {
        try {
          await sql`delete from nf_notes where user_id = ${context.userId} and text ilike ${"%" + them.handle + " wants to connect%"}`;
        } catch {
          /* note table may be missing */
        }
      }
    } else {
      const byHandle = await sql<{ user_id: string }>`select user_id from nf_profiles where lower(handle) = lower(${id}) limit 1`;
      const who = byHandle[0]?.user_id || id;
      await sql`delete from nf_connects where (user_id = ${who} and fellow_id = ${context.userId}) or (user_id = ${context.userId} and fellow_id = ${who})`;
    }
    return { ok: true as const };
  });

export const disconnectFellow = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { id: string }) => d)
  .handler(async ({ context, data }) => {
    const id = (data.id || "").trim().slice(0, 80);
    if (!id) return { ok: false as const, reason: "Missing person." };
    const sql = await getSql();
    await ensureConnects(sql);
    await sql`delete from nf_connects where (user_id = ${context.userId} and fellow_id = ${id}) or (user_id = ${id} and fellow_id = ${context.userId})`;
    return { ok: true as const };
  });

export const connectFellow = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    if (!data.id) return { ok: false as const, reason: "Missing person." };
    if (!(await allowWrite(`connect:${context.userId}`, 20))) return { ok: false as const, reason: RATE_BLOCKED };
    const sql = await getSql();
    await ensureConnects(sql);
    if (data.id === context.userId) return { ok: false as const, reason: "That is you." };
    const existing = await sql<{ status: string | null }>`select status from nf_connects where user_id = ${context.userId} and fellow_id = ${data.id} limit 1`;
    if (String(existing[0]?.status || "").toLowerCase() === "accepted") return { ok: true as const, status: "accepted" as const };
    if (existing[0]) return { ok: true as const, status: "pending" as const };
    const inserted = await sql<{ fellow_id: string }>`insert into nf_connects (user_id, fellow_id, status) values (${context.userId}, ${data.id}, ${"pending"}) on conflict (user_id, fellow_id) do nothing returning fellow_id`;
    if (inserted[0]) {
      const me = await profileOf(context.userId);
      if (me.handle && me.handle !== "member") {
        await pushNote(data.id, `@${me.handle} wants to connect.`, "/?open=friends");
      }
    }
    return { ok: true as const, status: "pending" as const };
  });

export const connectByHandle = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { handle: string }) => d)
  .handler(async ({ context, data }) => {
    const handle = data.handle.trim().replace(/^@/, "").slice(0, 24);
    if (!handle) return { ok: false as const, reason: "Missing person." };
    const sql = await getSql();
    const rows = await sql<{ user_id: string }>`select user_id from nf_profiles where lower(handle) = ${handle.toLowerCase()} limit 1`;
    const id = rows[0]?.user_id || "";
    if (!id) return { ok: false as const, reason: "No user with that handle." };
    if (id === context.userId) return { ok: false as const, reason: "That is you." };
    if (!(await allowWrite(`connect:${context.userId}`, 20))) return { ok: false as const, reason: RATE_BLOCKED };
    await ensureConnects(sql);
    const existing = await sql<{ status: string | null }>`select status from nf_connects where user_id = ${context.userId} and fellow_id = ${id} limit 1`;
    if (String(existing[0]?.status || "").toLowerCase() === "accepted") return { ok: true as const, status: "accepted" as const };
    if (existing[0]) return { ok: true as const, status: "pending" as const };
    const inserted = await sql<{ fellow_id: string }>`insert into nf_connects (user_id, fellow_id, status) values (${context.userId}, ${id}, ${"pending"}) on conflict (user_id, fellow_id) do nothing returning fellow_id`;
    if (inserted[0]) {
      const me = await profileOf(context.userId);
      if (me.handle && me.handle !== "member") await pushNote(id, `@${me.handle} wants to connect.`, "/?open=friends");
    }
    return { ok: true as const, status: "pending" as const };
  });

export type FollowPerson = { id: string; handle: string; role: string; back: boolean };

let followsReady = false;

async function ensureFollows(sql: Awaited<ReturnType<typeof getSql>>) {
  if (followsReady) return;
  await sql`create table if not exists nf_follows (
    follower_id text not null,
    followee_id text not null,
    ts bigint not null default 0,
    primary key (follower_id, followee_id)
  )`;
  followsReady = true;
}

async function personId(sql: Awaited<ReturnType<typeof getSql>>, id: string, handle: string) {
  const cleanId = id.trim().slice(0, 80);
  if (cleanId) {
    const byId = await sql<{ user_id: string }>`select user_id from nf_profiles where user_id = ${cleanId} limit 1`;
    if (byId[0]?.user_id) return byId[0].user_id;
  }
  const h = handle.trim().replace(/^@/, "").slice(0, 24).toLowerCase();
  if (!h) return "";
  const byHandle = await sql<{ user_id: string }>`select user_id from nf_profiles where lower(handle) = ${h} limit 1`;
  return byHandle[0]?.user_id || "";
}

export const listMyFollows = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    await ensureFollows(sql);
    const following = await sql<{ id: string; handle: string | null; role: string | null; back: boolean | number | string | null }>`
      select f.followee_id as id, p.handle, p.kind as role,
        exists(
          select 1 from nf_follows b
          where b.follower_id = f.followee_id and b.followee_id = ${context.userId}
        ) as back
      from nf_follows f
      left join nf_profiles p on p.user_id = f.followee_id
      where f.follower_id = ${context.userId}
      order by f.ts desc
      limit 80`;
    const followers = await sql<{ id: string; handle: string | null; role: string | null; back: boolean | number | string | null }>`
      select f.follower_id as id, p.handle, p.kind as role,
        exists(
          select 1 from nf_follows b
          where b.follower_id = ${context.userId} and b.followee_id = f.follower_id
        ) as back
      from nf_follows f
      left join nf_profiles p on p.user_id = f.follower_id
      where f.followee_id = ${context.userId}
      order by f.ts desc
      limit 80`;
    const on = (v: boolean | number | string | null) => v === true || v === 1 || v === "t" || v === "true";
    const map = (rows: { id: string; handle: string | null; role: string | null; back: boolean | number | string | null }[]): FollowPerson[] =>
      rows
        .filter((r) => r.handle && r.handle !== "member")
        .map((r) => ({ id: r.id, handle: r.handle || "", role: r.role || "member", back: on(r.back) }));
    return { following: map(following), followers: map(followers) };
  });

export const listFollowingTakes = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((d: { before?: number } | undefined) => d ?? {})
  .handler(async ({ context, data }) => {
    await ensureSeed();
    const sql = await getSql();
    await ensureFollows(sql);
    const before = Number(data?.before || 0);
    const rows = before
      ? await sql`select t.*, (select body from nf_take_replies r where r.take_id = t.id order by r.ts desc limit 1) as last_reply
          from nf_takes t
          join nf_follows f on f.followee_id = t.user_id and f.follower_id = ${context.userId}
          where t.ts < ${before} and t.user_id <> ${"seed"} and t.id not like ${"seed-%"}
          order by t.ts desc
          limit 20`
      : await sql`select t.*, (select body from nf_take_replies r where r.take_id = t.id order by r.ts desc limit 1) as last_reply
          from nf_takes t
          join nf_follows f on f.followee_id = t.user_id and f.follower_id = ${context.userId}
          where t.user_id <> ${"seed"} and t.id not like ${"seed-%"}
          order by t.ts desc
          limit 20`;
    const takes = (rows as Record<string, unknown>[]).map(mapTake);
    return { takes, next: takes.length === 20 ? takes[takes.length - 1].ts : 0 };
  });

export const followLook = createServerFn({ method: "GET" })
  .validator((d: { handle?: string }) => ({ handle: (d?.handle || "").replace(/^@/, "").slice(0, 24) }))
  .handler(async ({ data }) => {
    const empty = { followers: 0, following: 0, mutuals: 0, followerHandles: [] as string[], followingHandles: [] as string[] };
    const handle = data.handle.trim().toLowerCase();
    if (!handle) return empty;
    const sql = await getSql();
    await ensureFollows(sql);
    const who = await sql<{ user_id: string }>`select user_id from nf_profiles where lower(handle) = ${handle} limit 1`;
    const id = who[0]?.user_id || "";
    if (!id) return empty;
    const followersN = await sql<{ n: string | number }>`select count(*) as n from nf_follows where followee_id = ${id}`;
    const followingN = await sql<{ n: string | number }>`select count(*) as n from nf_follows where follower_id = ${id}`;
    const mutualN = await sql<{ n: string | number }>`
      select count(*) as n from nf_follows a
      join nf_follows b on b.follower_id = a.followee_id and b.followee_id = a.follower_id
      where a.follower_id = ${id}`;
    const followerRows = await sql<{ handle: string | null }>`
      select p.handle from nf_follows f
      join nf_profiles p on p.user_id = f.follower_id
      where f.followee_id = ${id}
      order by f.ts desc
      limit 20`;
    const followingRows = await sql<{ handle: string | null }>`
      select p.handle from nf_follows f
      join nf_profiles p on p.user_id = f.followee_id
      where f.follower_id = ${id}
      order by f.ts desc
      limit 20`;
    const names = (rows: { handle: string | null }[]) => rows.map((r) => r.handle || "").filter((h) => h && h !== "member");
    return {
      followers: Number(followersN[0]?.n || 0),
      following: Number(followingN[0]?.n || 0),
      mutuals: Number(mutualN[0]?.n || 0),
      followerHandles: names(followerRows),
      followingHandles: names(followingRows),
    };
  });

export const toggleFollow = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { id?: string; handle?: string }) => ({
    id: (d?.id || "").slice(0, 80),
    handle: (d?.handle || "").replace(/^@/, "").slice(0, 24),
  }))
  .handler(async ({ context, data }) => {
    if (!(await allowWrite(`follow:${context.userId}`, 40))) return { ok: false as const, reason: RATE_BLOCKED, on: false };
    const sql = await getSql();
    await ensureFollows(sql);
    const id = await personId(sql, data.id, data.handle);
    if (!id) return { ok: false as const, reason: "No user with that handle.", on: false };
    if (id === context.userId) return { ok: false as const, reason: "That is you.", on: false };
    const existing = await sql<{ followee_id: string }>`select followee_id from nf_follows where follower_id = ${context.userId} and followee_id = ${id} limit 1`;
    if (existing[0]) {
      await sql`delete from nf_follows where follower_id = ${context.userId} and followee_id = ${id}`;
      return { ok: true as const, on: false };
    }
    await sql`insert into nf_follows (follower_id, followee_id, ts) values (${context.userId}, ${id}, ${Date.now()}) on conflict (follower_id, followee_id) do nothing`;
    const me = await profileOf(context.userId);
    if (me.handle && me.handle !== "member") await pushNote(id, `@${me.handle} followed you.`, `/u/${encodeURIComponent(me.handle)}`);
    return { ok: true as const, on: true };
  });

export const suggestFollows = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    try {
      await ensureFollows(sql);
      const rows = await sql<{ id: string; handle: string | null; role: string | null; mutuals: string | number | null }>`
        select p.user_id as id, p.handle, p.kind as role,
          (
            select count(*) from nf_follows mine
            join nf_follows theirs on theirs.follower_id = mine.followee_id and theirs.followee_id = p.user_id
            where mine.follower_id = ${context.userId}
          ) as mutuals
        from nf_profiles p
        where p.user_id <> ${context.userId}
          and p.handle is not null
          and length(trim(p.handle)) > 1
          and not exists (
            select 1 from nf_follows f where f.follower_id = ${context.userId} and f.followee_id = p.user_id
          )
        order by mutuals desc
        limit 8`;
      return rows
        .filter((r) => r.handle && r.handle !== "member")
        .map((r) => ({
          id: r.id,
          handle: r.handle || "",
          role: r.role || "member",
          mutuals: Number(r.mutuals || 0),
        }));
    } catch {
      return [] as { id: string; handle: string; role: string; mutuals: number }[];
    }
  });

const REPORT_REASONS = new Set(["Spam", "Scam or fraud", "Harassment or hate", "Nudity or sexual", "Misinformation", "Other"]);

export const reportTake = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { id: string; reason: string }) => d)
  .handler(async ({ context, data }) => {
    const reason = REPORT_REASONS.has(data.reason) ? data.reason : "";
    const id = (data.id || "").trim().slice(0, 40);
    if (!reason || !id) return { ok: false as const, reason: "Pick a reason." };
    if (!(await allowWrite(`report:${context.userId}`, 5))) return { ok: false as const, reason: "Slow down. Try again in a minute." };
    const sql = await getSql();
    const handle = await handleOf(context.userId);
    await sql`insert into nf_reports (id, post_id, user_id, author, reason, ts) values (${nid()}, ${"take:" + id}, ${context.userId}, ${handle}, ${reason}, ${Date.now()})`;
    return { ok: true as const };
  });

export const deleteOwnTake = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { id: string }) => d)
  .handler(async ({ context, data }) => {
    const id = (data.id || "").trim().slice(0, 40);
    if (!id) return { ok: false as const, reason: "Missing gist." };
    if (!(await allowWrite(`deltake:${context.userId}`, 8))) return { ok: false as const, reason: "Slow down." };
    const sql = await getSql();
    const gone = await sql<{ id: string }>`delete from nf_takes where id = ${id} and user_id = ${context.userId} returning id`;
    if (!gone[0]) return { ok: false as const, reason: "You can only delete your own gist." };
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
