import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
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
};

export const CINEMA_SECTIONS = ["watching", "top", "trending", "nigerian", "global", "coming"] as const;
export type CinemaSection = (typeof CINEMA_SECTIONS)[number];

/** Official trailers only. Kilode never hosts the file. Used to seed an empty table and as a client fallback. */
export const CINEMA_SEED: CinemaMovie[] = [
  { id: "seed-black-panther", youtube_id: "xjDjIWPwcPU", title: "Black Panther", section: "global", status: "approved", watching: true, votes: 18, submitter: "Kilode", ts: 1726700000000 },
  { id: "seed-wakanda", youtube_id: "_Z3QKkl1WyM", title: "Black Panther: Wakanda Forever", section: "global", status: "approved", watching: false, votes: 14, submitter: "Kilode", ts: 1726700001000 },
  { id: "seed-woman-king", youtube_id: "3RDaPV_rJ1Y", title: "The Woman King", section: "nigerian", status: "approved", watching: false, votes: 11, submitter: "Kilode", ts: 1726700002000 },
  { id: "seed-dune", youtube_id: "8g18jFHCLXk", title: "Dune", section: "coming", status: "approved", watching: false, votes: 9, submitter: "Kilode", ts: 1726700003000 },
  { id: "seed-endgame", youtube_id: "TcMBFSGVi1c", title: "Avengers: Endgame", section: "coming", status: "approved", watching: false, votes: 8, submitter: "Kilode", ts: 1726700004000 },
  { id: "seed-noway", youtube_id: "JfVOs4VSpmA", title: "Spider-Man: No Way Home", section: "global", status: "approved", watching: false, votes: 7, submitter: "Kilode", ts: 1726700005000 },
  { id: "seed-johnwick", youtube_id: "qEVUtrk8_B4", title: "John Wick: Chapter 4", section: "global", status: "approved", watching: false, votes: 6, submitter: "Kilode", ts: 1726700006000 },
  { id: "seed-oppen", youtube_id: "uYPbbksJxIg", title: "Oppenheimer", section: "coming", status: "approved", watching: false, votes: 5, submitter: "Kilode", ts: 1726700007000 },
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
}): CinemaMovie {
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

export const listCinema = createServerFn({ method: "GET" })
  .validator((d?: { section?: string }) => d ?? {})
  .handler(async ({ data }) => {
    try {
      await ensureMovies();
      await seedCinemaIfEmpty();
      await crownIfEmpty();
    } catch {
      return { watching: CINEMA_SEED.find((m) => m.watching) ?? CINEMA_SEED[0], movies: CINEMA_SEED };
    }
    const sql = await getSql();
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
    }>`select id, youtube_id, title, section, status, watching, votes, submitter, ts from nf_movies where status = 'approved' order by watching desc, votes desc, ts desc limit 80`;
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
    } catch {
      /* exists */
    }
    const id = data.id.trim();
    if (!id) return { ok: false as const, reason: "Missing movie." };
    const day = todayUtc();
    try {
      await sql`insert into nf_votes (user_id, movie_id, day, ts) values (${context.userId}, ${id}, ${day}, ${Date.now()})`;
    } catch {
      return { ok: false as const, reason: "You already voted on this title today. Come back tomorrow." };
    }
    await sql`update nf_movies set votes = coalesce(votes, 0) + 1 where id = ${id} and status = 'approved'`;
    return { ok: true as const };
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
