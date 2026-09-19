/** In-process write limiter. Fine on Vercel Hobby (one isolate). Not a global firewall. */
const buckets = new Map<string, { n: number; t: number }>();

const MAX_KEYS = 8000;

export function allowWrite(key: string, max: number, windowMs = 60_000): boolean {
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

export const RATE_BLOCKED = "Slow down. Try again in a minute.";
