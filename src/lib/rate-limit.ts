import { getSql } from "@/lib/db";

/** Fast local reject, then a shared Postgres count so every server sees the same limit. */
const buckets = new Map<string, { n: number; t: number }>();
const MAX_KEYS = 8000;
let tableReady = false;

function localAllow(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  if (buckets.size > MAX_KEYS) {
    for (const [k, v] of buckets) {
      if (now - v.t > windowMs) buckets.delete(k);
      if (buckets.size < MAX_KEYS / 2) break;
    }
  }
  const b = buckets.get(key);
  if (!b || now - b.t > windowMs) {
    buckets.set(key, { n: 1, t: now });
    return true;
  }
  if (b.n >= max) return false;
  b.n += 1;
  return true;
}

export async function allowWrite(key: string, max: number, windowMs = 60_000): Promise<boolean> {
  if (!localAllow(key, max, windowMs)) return false;
  const safeKey = key.slice(0, 80);
  try {
    const sql = await getSql();
    if (!tableReady) {
      await sql`create table if not exists nf_rate (
        k text primary key,
        n integer not null,
        t bigint not null
      )`;
      tableReady = true;
    }
    const now = Date.now();
    const rows = await sql<{ n: number | string }>`
      insert into nf_rate (k, n, t) values (${safeKey}, ${1}, ${now})
      on conflict (k) do update set
        n = case when ${now} - nf_rate.t > ${windowMs} then 1 else nf_rate.n + 1 end,
        t = case when ${now} - nf_rate.t > ${windowMs} then ${now} else nf_rate.t end
      returning n`;
    return Number(rows[0]?.n ?? 1) <= max;
  } catch {
    return true;
  }
}

export const RATE_BLOCKED = "Slow down. Try again in a minute.";
