import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware, optionalAuthMiddleware } from "@/lib/auth/middleware";
import { asAccountKind, type AccountKind, youtubeId } from "@/lib/qonvo-data";
import { canKind, kindActionHint } from "@/lib/permissions";
import { gateText } from "@/lib/mod-cache";
import { allowWrite, RATE_BLOCKED } from "@/lib/rate-limit";

export type CinemaMovie = {
  id: string;
  youtube_id: string;
  title: string;
  section: "nigerian" | "global" | "coming";
  status: "pending" | "approved" | "rejected";
  watching: boolean;
  votes: number;
  submitter: string;
  ts: number;
  /** Community star average 0–5 (from nf_cinema_rate). */
  rating_avg: number;
  /** Number of star ratings. */
  rating_n: number;
  /** True when the signed-in user already voted on this title today (UTC). */
  voted_today: boolean;
};

export const CINEMA_SECTIONS = ["watching", "top", "trending", "nigerian", "global", "coming"] as const;
export type CinemaSection = (typeof CINEMA_SECTIONS)[number];

/** Official trailers only. Kilode never hosts the file. Used to seed an empty table and as a client fallback. */
export const CINEMA_SEED: CinemaMovie[] = [
  { id: "seed-black-panther", youtube_id: "xjDjIWPwcPU", title: "Black Panther", section: "global", status: "approved", watching: true, votes: 18, submitter: "Kilode", ts: 1726700000000 , rating_avg: 0, rating_n: 0, voted_today: false },
  { id: "seed-wakanda", youtube_id: "_Z3QKkl1WyM", title: "Black Panther: Wakanda Forever", section: "global", status: "approved", watching: false, votes: 14, submitter: "Kilode", ts: 1726700001000 , rating_avg: 0, rating_n: 0, voted_today: false },
  { id: "seed-woman-king", youtube_id: "3RDaPV_rJ1Y", title: "The Woman King", section: "nigerian", status: "approved", watching: false, votes: 11, submitter: "Kilode", ts: 1726700002000 , rating_avg: 0, rating_n: 0, voted_today: false },
  { id: "seed-dune", youtube_id: "8g18jFHCLXk", title: "Dune", section: "coming", status: "approved", watching: false, votes: 9, submitter: "Kilode", ts: 1726700003000 , rating_avg: 0, rating_n: 0, voted_today: false },
  { id: "seed-endgame", youtube_id: "TcMBFSGVi1c", title: "Avengers: Endgame", section: "coming", status: "approved", watching: false, votes: 8, submitter: "Kilode", ts: 1726700004000 , rating_avg: 0, rating_n: 0, voted_today: false },
  { id: "seed-noway", youtube_id: "JfVOs4VSpmA", title: "Spider-Man: No Way Home", section: "global", status: "approved", watching: false, votes: 7, submitter: "Kilode", ts: 1726700005000 , rating_avg: 0, rating_n: 0, voted_today: false },
  { id: "seed-johnwick", youtube_id: "qEVUtrk8_B4", title: "John Wick: Chapter 4", section: "global", status: "approved", watching: false, votes: 6, submitter: "Kilode", ts: 1726700006000 , rating_avg: 0, rating_n: 0, voted_today: false },
  { id: "seed-oppen", youtube_id: "uYPbbksJxIg", title: "Oppenheimer", section: "coming", status: "approved", watching: false, votes: 5, submitter: "Kilode", ts: 1726700007000 , rating_avg: 0, rating_n: 0, voted_today: false },
];

function nid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function todayUtc() {
  return new Date().toISOString().slice(0, 10);
}

function asSection(v: string | null | undefined): CinemaMovie["section"] {
  return v === "nigerian" || v === "coming" ? v : "global";
}

function mapRow(r: {
  id: string;
  youtube_id: string;
  title: string;
  section: string;
  status: string;
  watching: number | string | boolean | null;
  votes: number | string | null;
  submitter: string | null;
  ts: number | string;
  rating_avg?: number | string | null;
  rating_n?: number | string | null;
  voted_today?: number | string | boolean | null;
}): CinemaMovie {
  const avg = Number(r.rating_avg ?? 0);
  return {
    id: r.id,
    youtube_id: r.youtube_id,
    title: r.title,
    section: asSection(r.section),
    status: r.status === "approved" || r.status === "rejected" ? r.status : "pending",
    watching: Number(r.watching) === 1 || r.watching === true,
    votes: Number(r.votes ?? 0),
    submitter: r.submitter ?? "",
    ts: Number(r.ts),
    rating_avg: Number.isFinite(avg) ? avg : 0,
    rating_n: Number(r.rating_n ?? 0),
    voted_today: Number(r.voted_today) === 1 || r.voted_today === true,
  };
}

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

async function ensureMovies() {
  const sql = await getSql();
  await sql.query(`CREATE TABLE IF NOT EXISTS nf_movies (
    id TEXT PRIMARY KEY, youtube_id TEXT NOT NULL, title TEXT NOT NULL,
    section TEXT NOT NULL DEFAULT 'global', status TEXT NOT NULL DEFAULT 'pending',
    watching INTEGER NOT NULL DEFAULT 0, votes INTEGER NOT NULL DEFAULT 0,
    submitter TEXT NOT NULL DEFAULT '', user_id TEXT, ts BIGINT NOT NULL)`);
  await sql.query(`CREATE TABLE IF NOT EXISTS nf_votes (
    user_id TEXT NOT NULL, movie_id TEXT NOT NULL, day TEXT NOT NULL, ts BIGINT NOT NULL,
    PRIMARY KEY (user_id, movie_id, day))`);
  await sql.query(`CREATE UNIQUE INDEX IF NOT EXISTS nf_movies_yt ON nf_movies (youtube_id)`);
}

async function seedCinemaIfEmpty() {
  const sql = await getSql();
  const n = await sql<{ n: string | number }>`select count(*) as n from nf_movies`;
  if (Number(n[0]?.n ?? 0) > 0) return;
  for (const m of CINEMA_SEED) {
    try {
      await sql`insert into nf_movies (id, youtube_id, title, section, status, watching, votes, submitter, ts)
        values (${m.id}, ${m.youtube_id}, ${m.title}, ${m.section}, ${"approved"}, ${m.watching ? 1 : 0}, ${m.votes}, ${m.submitter}, ${m.ts})`;
    } catch {
      /* duplicate */
    }
  }
}

async function crownIfEmpty() {
  const sql = await getSql();
  const on = await sql<{ n: string | number }>`select count(*) as n from nf_movies where status = 'approved' and watching = 1`;
  if (Number(on[0]?.n ?? 0) > 0) return;
  const top = await sql<{ id: string }>`select id from nf_movies where status = 'approved' order by votes desc, ts desc limit 1`;
  if (top[0]) await sql`update nf_movies set watching = 1 where id = ${top[0].id}`;
}

/**
 * Upsert official trailer seeds into nf_movies (curated cache). Never calls
 * YouTube search. Additive: leaves user-submitted pending/approved rows alone.
 * Used by Super Fetch and the once-daily Vercel Cron.
 */
export async function runCinemaCatalogFetch(): Promise<{
  ok: true;
  inserted: number;
  updated: number;
  watching: number;
}> {
  await ensureMovies();
  const sql = await getSql();
  let inserted = 0;
  let updated = 0;
  for (const m of CINEMA_SEED) {
    const byId = await sql<{
      id: string;
      youtube_id: string;
      submitter: string | null;
      user_id: string | null;
    }>`select id, youtube_id, submitter, user_id from nf_movies where id = ${m.id} limit 1`;
    if (byId[0]) {
      await sql`update nf_movies set youtube_id = ${m.youtube_id}, title = ${m.title}, section = ${m.section}, status = ${"approved"}, submitter = ${m.submitter}
        where id = ${m.id}`;
      updated += 1;
      continue;
    }
    const byYt = await sql<{
      id: string;
      submitter: string | null;
      user_id: string | null;
    }>`select id, submitter, user_id from nf_movies where youtube_id = ${m.youtube_id} limit 1`;
    if (byYt[0]) {
      const row = byYt[0];
      const isSeedish = row.id.startsWith("seed-") || (row.submitter === "Kilode" && !row.user_id);
      if (isSeedish) {
        await sql`update nf_movies set title = ${m.title}, section = ${m.section}, status = ${"approved"}, submitter = ${m.submitter}
          where id = ${row.id}`;
        updated += 1;
      }
      /* user-submitted row with same youtube_id — leave untouched */
      continue;
    }
    try {
      await sql`insert into nf_movies (id, youtube_id, title, section, status, watching, votes, submitter, ts)
        values (${m.id}, ${m.youtube_id}, ${m.title}, ${m.section}, ${"approved"}, ${m.watching ? 1 : 0}, ${m.votes}, ${m.submitter}, ${m.ts})`;
      inserted += 1;
    } catch {
      /* race / unique — ignore */
    }
  }
  await seedCinemaIfEmpty();
  await crownIfEmpty();
  const watchingRows = await sql<{ n: string | number }>`select count(*) as n from nf_movies where status = 'approved' and watching = 1`;
  return { ok: true as const, inserted, updated, watching: Number(watchingRows[0]?.n ?? 0) };
}

export const fetchCinemaCatalog = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const role = await staffRole(context.userId);
    if (role !== "super") throw new Error("Forbidden");
    return runCinemaCatalogFetch();
  });

export const listCinema = createServerFn({ method: "GET" })
  .middleware([optionalAuthMiddleware])
  .validator((d?: { section?: string }) => d ?? {})
  .handler(async ({ data, context }) => {
    try {
      await ensureMovies();
      await ensureCinemaExtra();
      await seedCinemaIfEmpty();
      await crownIfEmpty();
    } catch {
      return { watching: CINEMA_SEED.find((m) => m.watching) ?? CINEMA_SEED[0], movies: CINEMA_SEED };
    }
    const sql = await getSql();
    const userId = context.userId;
    const day = todayUtc();
    /* Ratings + today's vote via scalar subqueries (Neon-friendly; no join explode). */
    const rows = await sql<{
      id: string;
      youtube_id: string;
      title: string;
      section: string;
      status: string;
      watching: number | string | boolean | null;
      votes: number | string | null;
      submitter: string | null;
      ts: number | string;
      rating_avg: number | string | null;
      rating_n: number | string | null;
      voted_today: number | string | null;
    }>`select id, youtube_id, title, section, status, watching, votes, submitter, ts,
        (select coalesce(avg(stars), 0) from nf_cinema_rate r where r.movie_id = nf_movies.id) as rating_avg,
        (select count(*) from nf_cinema_rate r where r.movie_id = nf_movies.id) as rating_n,
        case when ${userId ?? ""} = '' then 0
          when exists (
            select 1 from nf_votes v
            where v.movie_id = nf_movies.id and v.user_id = ${userId ?? ""} and v.day = ${day}
          ) then 1 else 0 end as voted_today
      from nf_movies where status = 'approved' order by watching desc, votes desc, ts desc limit 80`;
    const movies = rows.map(mapRow);
    const watching = movies.find((m) => m.watching) ?? movies[0] ?? null;
    const sec = data.section || "watching";
    let list = movies;
    if (sec === "nigerian" || sec === "global" || sec === "coming") list = movies.filter((m) => m.section === sec);
    else if (sec === "trending" || sec === "top") list = [...movies].sort((a, b) => b.votes - a.votes || b.ts - a.ts);
    /* watching tab: keep full list so "Also in Cinema" is not empty */
    return { watching, movies: list.length ? list : movies };
  });

export const submitMovie = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { title: string; url: string; section?: string }) => d)
  .handler(async ({ context, data }) => {
    if (!allowWrite(`cin-sub:${context.userId}`, 8)) return { ok: false as const, reason: RATE_BLOCKED };
    const kind = await kindOf(context.userId);
    if (!canKind(kind, "cinema.submit")) return { ok: false as const, reason: kindActionHint("cinema.submit") };
    const yt = youtubeId(data.url);
    if (!yt) return { ok: false as const, reason: "Paste a YouTube watch / youtu.be / embed URL. We do not host video files." };
    const title = data.title.trim().slice(0, 120);
    if (title.length < 2) return { ok: false as const, reason: "Add the movie title." };
    const section = asSection(data.section);
    const submitter = await handleOf(context.userId);
    const gate = await gateText("feeds", title, { userId: context.userId, author: submitter });
    if (!gate.ok) return { ok: false as const, reason: gate.reason };
    const sql = await getSql();
    try {
      await ensureMovies();
    } catch {
      /* already there */
    }
    const dup = await sql<{ id: string }>`select id from nf_movies where youtube_id = ${yt} limit 1`;
    if (dup[0]) return { ok: false as const, reason: "That YouTube URL is already in Cinema." };
    const id = nid();
    await sql`insert into nf_movies (id, youtube_id, title, section, status, watching, votes, submitter, user_id, ts)
      values (${id}, ${yt}, ${title}, ${section}, ${"pending"}, ${0}, ${0}, ${submitter}, ${context.userId}, ${Date.now()})`;
    return { ok: true as const, id };
  });

export const voteMovie = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { id: string }) => d)
  .handler(async ({ context, data }) => {
    if (!allowWrite(`cin-vote:${context.userId}`, 20)) return { ok: false as const, reason: RATE_BLOCKED };
    const sql = await getSql();
    try {
      await ensureMovies();
      await seedCinemaIfEmpty();
    } catch {
      /* exists */
    }
    const id = data.id.trim();
    if (!id) return { ok: false as const, reason: "Missing movie." };
    const exists = await sql<{ id: string; votes: number | string | null; status: string }>`
      select id, votes, status from nf_movies where id = ${id} limit 1`;
    if (!exists[0]) return { ok: false as const, reason: "That title is not in Cinema yet." };
    if (exists[0].status !== "approved") return { ok: false as const, reason: "Only approved titles can be voted." };
    const day = todayUtc();
    try {
      await sql`insert into nf_votes (user_id, movie_id, day, ts) values (${context.userId}, ${id}, ${day}, ${Date.now()})`;
    } catch (e: unknown) {
      const code = typeof e === "object" && e && "code" in e ? String((e as { code: unknown }).code) : "";
      const msg = e instanceof Error ? e.message : String(e ?? "");
      if (code === "23505" || /duplicate key|unique/i.test(msg)) {
        return { ok: false as const, reason: "You already voted on this title today. Come back tomorrow." };
      }
      return { ok: false as const, reason: "Could not save your vote. Try again." };
    }
    await sql`update nf_movies set votes = coalesce(votes, 0) + 1 where id = ${id} and status = 'approved'`;
    const after = await sql<{ votes: number | string | null }>`select votes from nf_movies where id = ${id} limit 1`;
    return { ok: true as const, votes: Number(after[0]?.votes ?? Number(exists[0].votes ?? 0) + 1) };
  });

export const listMyCinema = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    try {
      await ensureMovies();
    } catch {
      return [] as CinemaMovie[];
    }
    const rows = await sql<{
      id: string;
      youtube_id: string;
      title: string;
      section: string;
      status: string;
      watching: number | string | boolean | null;
      votes: number | string | null;
      submitter: string | null;
      ts: number | string;
    }>`select id, youtube_id, title, section, status, watching, votes, submitter, ts from nf_movies where user_id = ${context.userId} order by ts desc limit 40`;
    return rows.map(mapRow);
  });

export const listCinemaQueue = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    if (!(await staffRole(context.userId))) return [];
    const sql = await getSql();
    try {
      await ensureMovies();
      await seedCinemaIfEmpty();
    } catch {
      /* ok */
    }
    const rows = await sql<{
      id: string;
      youtube_id: string;
      title: string;
      section: string;
      status: string;
      watching: number | string | boolean | null;
      votes: number | string | null;
      submitter: string | null;
      ts: number | string;
    }>`select id, youtube_id, title, section, status, watching, votes, submitter, ts from nf_movies order by ts desc limit 80`;
    return rows.map(mapRow);
  });

export const setMovieStatus = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { id: string; status: "approved" | "rejected"; watching?: boolean }) => d)
  .handler(async ({ context, data }) => {
    const role = await staffRole(context.userId);
    if (role !== "super" && role !== "admin") throw new Error("Forbidden");
    const sql = await getSql();
    if (data.watching) {
      await sql`update nf_movies set watching = 0`;
      await sql`update nf_movies set status = ${"approved"}, watching = 1 where id = ${data.id}`;
    } else {
      await sql`update nf_movies set status = ${data.status}, watching = 0 where id = ${data.id}`;
    }
    return { ok: true as const };
  });

export type CinemaQuiz = {
  id: string;
  movie_id: string;
  topic: string;
  q: string;
  a: string;
  b: string;
  c: string;
  d: string;
  e: string;
  answer: string;
};

async function ensureCinemaExtra() {
  const sql = await getSql();
  await sql.query(`CREATE TABLE IF NOT EXISTS nf_cinema_rate (
    movie_id TEXT NOT NULL, user_id TEXT NOT NULL, stars INTEGER NOT NULL, ts BIGINT NOT NULL,
    PRIMARY KEY (movie_id, user_id))`);
  await sql.query(`CREATE TABLE IF NOT EXISTS nf_cinema_quiz (
    id TEXT PRIMARY KEY, movie_id TEXT NOT NULL, topic TEXT NOT NULL DEFAULT 'general',
    q TEXT NOT NULL, a TEXT NOT NULL, b TEXT NOT NULL, c TEXT NOT NULL, d TEXT NOT NULL, e TEXT NOT NULL,
    answer TEXT NOT NULL)`);
}

const QUIZ_SEED: CinemaQuiz[] = [
  { id: "q-bp-1", movie_id: "seed-black-panther", topic: "Nollywood / Africa", q: "Who directed Black Panther?", a: "Ryan Coogler", b: "Ava DuVernay", c: "Barry Jenkins", d: "Jordan Peele", e: "Steve McQueen", answer: "A" },
  { id: "q-bp-2", movie_id: "seed-black-panther", topic: "Story", q: "What is the African nation in the film?", a: "Zamunda", b: "Wakanda", c: "Genovia", d: "Asgard", e: "Latveria", answer: "B" },
  { id: "q-wk-1", movie_id: "seed-woman-king", topic: "Nollywood / Africa", q: "The Woman King is set among which warriors?", a: "Zulu", b: "Maasai", c: "Agojie of Dahomey", d: "Ashanti", e: "Mandinka", answer: "C" },
];

export const getCinemaExtra = createServerFn({ method: "GET" })
  .middleware([optionalAuthMiddleware])
  .validator((d: { movieId: string }) => d)
  .handler(async ({ data, context }) => {
    try {
      await ensureCinemaExtra();
    } catch {
      return { avg: 0, n: 0, mine: 0, quiz: QUIZ_SEED.filter((q) => q.movie_id === data.movieId) };
    }
    const sql = await getSql();
    const movieId = data.movieId.trim();
    const n = await sql<{ n: string | number; avg: string | number | null }>`select count(*) as n, avg(stars)::float as avg from nf_cinema_rate where movie_id = ${movieId}`;
    let mine = 0;
    if (context.userId) {
      const mineRows = await sql<{ stars: number | string | null }>`
        select stars from nf_cinema_rate where movie_id = ${movieId} and user_id = ${context.userId} limit 1`;
      mine = Number(mineRows[0]?.stars ?? 0);
    }
    let quiz = await sql<CinemaQuiz>`select id, movie_id, topic, q, a, b, c, d, e, answer from nf_cinema_quiz where movie_id = ${movieId} limit 12`;
    if (!quiz.length) {
      for (const q of QUIZ_SEED) {
        try {
          await sql`insert into nf_cinema_quiz (id, movie_id, topic, q, a, b, c, d, e, answer)
            values (${q.id}, ${q.movie_id}, ${q.topic}, ${q.q}, ${q.a}, ${q.b}, ${q.c}, ${q.d}, ${q.e}, ${q.answer})`;
        } catch {
          /* dup */
        }
      }
      quiz = await sql<CinemaQuiz>`select id, movie_id, topic, q, a, b, c, d, e, answer from nf_cinema_quiz where movie_id = ${movieId} limit 12`;
      if (!quiz.length) quiz = QUIZ_SEED.filter((q) => q.movie_id === movieId);
    }
    const avg = Number(n[0]?.avg ?? 0);
    return {
      avg: Number.isFinite(avg) ? avg : 0,
      n: Number(n[0]?.n ?? 0),
      mine: Number.isFinite(mine) ? mine : 0,
      quiz,
    };
  });

export const rateMovie = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { id: string; stars: number }) => d)
  .handler(async ({ context, data }) => {
    if (!allowWrite(`cin-rate:${context.userId}`, 20)) return { ok: false as const, reason: RATE_BLOCKED };
    const stars = Math.min(5, Math.max(1, Math.round(Number(data.stars))));
    if (!Number.isFinite(stars) || stars < 1) return { ok: false as const, reason: "Pick 1–5 stars." };
    const id = (data.id || "").trim();
    if (!id) return { ok: false as const, reason: "Missing movie." };
    const sql = await getSql();
    try {
      await ensureMovies();
      await ensureCinemaExtra();
      await seedCinemaIfEmpty();
    } catch {
      /* tables */
    }
    const exists = await sql<{ id: string }>`select id from nf_movies where id = ${id} and status = 'approved' limit 1`;
    if (!exists[0]) return { ok: false as const, reason: "That title is not in Cinema yet." };
    await sql`insert into nf_cinema_rate (movie_id, user_id, stars, ts) values (${id}, ${context.userId}, ${stars}, ${Date.now()})
      on conflict (movie_id, user_id) do update set stars = ${stars}, ts = ${Date.now()}`;
    const n = await sql<{ n: string | number; avg: string | number | null }>`select count(*) as n, avg(stars)::float as avg from nf_cinema_rate where movie_id = ${id}`;
    const avg = Number(n[0]?.avg ?? stars);
    return { ok: true as const, avg: Number.isFinite(avg) ? avg : stars, n: Number(n[0]?.n ?? 1), mine: stars };
  });

export const saveCinemaQuiz = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: CinemaQuiz) => d)
  .handler(async ({ context, data }) => {
    const role = await staffRole(context.userId);
    if (role !== "super" && role !== "admin") throw new Error("Forbidden");
    await ensureCinemaExtra();
    const sql = await getSql();
    const id = data.id || nid();
    const answer = data.answer.toUpperCase().slice(0, 1);
    if (!"ABCDE".includes(answer)) return { ok: false as const, reason: "Answer must be A–E." };
    await sql`insert into nf_cinema_quiz (id, movie_id, topic, q, a, b, c, d, e, answer)
      values (${id}, ${data.movie_id}, ${data.topic.slice(0, 40)}, ${data.q.slice(0, 240)}, ${data.a.slice(0, 120)}, ${data.b.slice(0, 120)}, ${data.c.slice(0, 120)}, ${data.d.slice(0, 120)}, ${data.e.slice(0, 120)}, ${answer})
      on conflict (id) do update set q = excluded.q, a = excluded.a, b = excluded.b, c = excluded.c, d = excluded.d, e = excluded.e, answer = excluded.answer, topic = excluded.topic`;
    return { ok: true as const, id };
  });
