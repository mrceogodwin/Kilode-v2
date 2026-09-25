import { getSql } from "@/lib/db";

/** One row per transaction hash. Text only. No chain call. */
export function normHash(raw: string) {
  return raw.trim().toLowerCase();
}

export function hashOk(raw: string) {
  const h = raw.trim();
  return h.length >= 32 && h.length <= 128 && /^[0-9a-zA-Z]+$/.test(h);
}

async function ensure() {
  const sql = await getSql();
  await sql.query(`CREATE TABLE IF NOT EXISTS nf_tx (
    hash TEXT PRIMARY KEY,
    kind TEXT NOT NULL,
    ref_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    coin TEXT NOT NULL DEFAULT '',
    amount TEXT NOT NULL DEFAULT '',
    ts BIGINT NOT NULL
  )`);
}

export async function claimTx(opts: {
  hash: string;
  kind: string;
  refId: string;
  userId: string;
  coin: string;
  amount: string;
}): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (!hashOk(opts.hash)) {
    return { ok: false, reason: "Paste the full transaction hash. Letters and numbers only." };
  }
  const hash = normHash(opts.hash);
  await ensure();
  const sql = await getSql();
  const taken = await sql<{ hash: string }>`select hash from nf_tx where hash = ${hash} limit 1`;
  if (taken[0]) return { ok: false, reason: "This transaction hash is already used." };
  try {
    const ad = await sql<{ id: string }>`select id from nf_ads where lower(coalesce(tx_hash, '')) = ${hash} and id <> ${opts.refId} limit 1`;
    if (ad[0]) return { ok: false, reason: "This transaction hash is already used on an ad." };
  } catch {
    /* ads table may be absent in a fresh database */
  }
  try {
    const ev = await sql<{ id: string }>`select id from nf_events where lower(coalesce(tx_hash, '')) = ${hash} and id <> ${opts.refId} limit 1`;
    if (ev[0]) return { ok: false, reason: "This transaction hash is already used on an event." };
  } catch {
    /* events table may be absent until the first event */
  }
  try {
    await sql`insert into nf_tx (hash, kind, ref_id, user_id, coin, amount, ts)
      values (${hash}, ${opts.kind}, ${opts.refId}, ${opts.userId}, ${opts.coin.slice(0, 12)}, ${opts.amount.slice(0, 40)}, ${Date.now()})`;
  } catch {
    return { ok: false, reason: "This transaction hash is already used." };
  }
  return { ok: true };
}

export async function releaseTx(hash: string, refId: string) {
  try {
    const sql = await getSql();
    await sql`delete from nf_tx where hash = ${normHash(hash)} and ref_id = ${refId}`;
  } catch {
    /* ledger is best-effort on rollback */
  }
}
