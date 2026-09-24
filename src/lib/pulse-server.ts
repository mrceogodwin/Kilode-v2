import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { assertStaff } from "@/lib/staff-server";

export type Pulse = {
  members: number;
  posts: number;
  drafts: number;
  takes: number;
  chats: number;
  ads: number;
  tracks: number;
  listings: number;
  mine?: {
    posts: number;
    takes: number;
    chats: number;
    ads: number;
    tracks: number;
    listings: number;
  };
};

const g = globalThis as typeof globalThis & { __nfPulse?: { at: number; pulse: Pulse } };

async function n(sql: Awaited<ReturnType<typeof getSql>>, text: string, params: unknown[] = []) {
  try {
    const rows = await sql.query<{ n: string | number }>(text, params);
    const v = Number(rows[0]?.n ?? 0);
    return Number.isFinite(v) ? v : 0;
  } catch {
    return 0;
  }
}

async function siteCounts(): Promise<Pulse> {
  if (g.__nfPulse && Date.now() - g.__nfPulse.at < 180_000) return g.__nfPulse.pulse;
  const sql = await getSql();
  const pulse: Pulse = {
    members: await n(sql, `select count(*) as n from nf_profiles`),
    posts: await n(sql, `select count(*) as n from nf_posts where status is distinct from 'draft'`),
    drafts: await n(sql, `select count(*) as n from nf_posts where status = 'draft'`),
    takes: await n(sql, `select count(*) as n from nf_takes`),
    chats: await n(sql, `select count(*) as n from nf_msgs`),
    ads: await n(sql, `select count(*) as n from nf_ads`),
    tracks: await n(sql, `select count(*) as n from nf_tracks`),
    listings: await n(sql, `select count(*) as n from nf_listings`),
  };
  g.__nfPulse = { at: Date.now(), pulse };
  return pulse;
}

export const sitePulse = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await assertStaff(context.userId);
    return siteCounts();
  });

export const myPulse = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const id = context.userId;
    return {
      posts: await n(sql, `select count(*) as n from nf_posts where user_id = $1`, [id]),
      takes: await n(sql, `select count(*) as n from nf_takes where user_id = $1`, [id]),
      chats: await n(sql, `select count(*) as n from nf_msgs where user_id = $1`, [id]),
      ads: await n(sql, `select count(*) as n from nf_ads where user_id = $1`, [id]),
      tracks: await n(sql, `select count(*) as n from nf_tracks where user_id = $1`, [id]),
      listings: await n(sql, `select count(*) as n from nf_listings where user_id = $1`, [id]),
    };
  });
