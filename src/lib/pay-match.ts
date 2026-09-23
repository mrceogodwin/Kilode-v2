import { getSql } from "@/lib/db";

/** On-chain tx check against Kilode wallets. No API keys. Public explorers only. */

export type WalletRow = { coin: string; address: string };

export type MatchResult = {
  ok: boolean;
  coin: string;
  received: string;
  to: string;
  confirmed: boolean;
  reason: string;
};

const CTRL = () => AbortSignal.timeout(8000);

function normCoin(c: string) {
  const x = c.trim().toLowerCase();
  if (x === "bitcoin" || x === "btc") return "btc";
  if (x === "ethereum" || x === "eth") return "eth";
  if (x === "solana" || x === "sol") return "sol";
  return x;
}

function inferCoin(hash: string, hint: string) {
  const h = hash.trim();
  if (hint) return normCoin(hint);
  if (/^0x[0-9a-fA-F]{64}$/.test(h)) return "eth";
  if (/^[0-9a-fA-F]{64}$/.test(h)) return "btc";
  if (/^[1-9A-HJ-NP-Za-km-z]{64,88}$/.test(h)) return "sol";
  return "";
}

function addrOf(wallets: WalletRow[], coin: string) {
  const want = normCoin(coin);
  const row = wallets.find((w) => normCoin(w.coin) === want);
  return (row?.address || "").trim();
}

function sameAddr(a: string, b: string, coin: string) {
  if (!a || !b) return false;
  if (coin === "sol") return a === b;
  return a.toLowerCase() === b.toLowerCase();
}

async function getJson(url: string, init?: RequestInit) {
  const r = await fetch(url, { ...init, signal: CTRL() });
  if (!r.ok) throw new Error(`explorer ${r.status}`);
  return r.json() as Promise<unknown>;
}

async function matchBtc(txid: string, wallet: string): Promise<MatchResult> {
  const hash = txid.replace(/^0x/i, "").toLowerCase();
  const j = (await getJson(`https://mempool.space/api/tx/${hash}`).catch(() =>
    getJson(`https://blockstream.info/api/tx/${hash}`),
  )) as {
    status?: { confirmed?: boolean };
    vout?: { scriptpubkey_address?: string; value?: number }[];
  };
  const hits = (j.vout ?? []).filter((v) => sameAddr(v.scriptpubkey_address ?? "", wallet, "btc"));
  const sats = hits.reduce((n, v) => n + Number(v.value ?? 0), 0);
  const confirmed = Boolean(j.status?.confirmed);
  if (!hits.length) {
    return { ok: false, coin: "btc", received: "", to: wallet, confirmed, reason: "This tx does not pay the Kilode BTC wallet." };
  }
  const received = (sats / 1e8).toFixed(8).replace(/0+$/, "").replace(/\.$/, "") + " BTC";
  if (!confirmed) {
    return { ok: false, coin: "btc", received, to: wallet, confirmed: false, reason: "Seen on chain, not confirmed yet. Try Match again in a few minutes." };
  }
  return { ok: true, coin: "btc", received, to: wallet, confirmed: true, reason: `Confirmed · ${received} to Kilode BTC` };
}

async function matchEth(txid: string, wallet: string): Promise<MatchResult> {
  const hash = txid.startsWith("0x") ? txid : `0x${txid}`;
  const body = (method: string) =>
    JSON.stringify({ jsonrpc: "2.0", id: 1, method, params: [hash] });
  async function rpc(url: string, method: string) {
    const j = (await getJson(url, { method: "POST", headers: { "content-type": "application/json" }, body: body(method) })) as {
      result?: { to?: string; value?: string; status?: string } | null;
      error?: { message?: string };
    };
    if (j.error) throw new Error(j.error.message || "rpc");
    return j.result ?? null;
  }
  const tx =
    (await rpc("https://cloudflare-eth.com", "eth_getTransactionByHash").catch(() => null)) ??
    (await rpc("https://eth.llamarpc.com", "eth_getTransactionByHash"));
  if (!tx) {
    return { ok: false, coin: "eth", received: "", to: wallet, confirmed: false, reason: "Ethereum RPC has not seen this hash." };
  }
  const to = tx.to ?? "";
  const wei = BigInt(tx.value || "0x0");
  const eth = Number(wei) / 1e18;
  const received = `${eth.toFixed(6).replace(/0+$/, "").replace(/\.$/, "")} ETH`;
  if (!sameAddr(to, wallet, "eth")) {
    return { ok: false, coin: "eth", received, to, confirmed: false, reason: "This tx does not pay the Kilode ETH wallet." };
  }
  const receipt =
    (await rpc("https://cloudflare-eth.com", "eth_getTransactionReceipt").catch(() => null)) ??
    (await rpc("https://eth.llamarpc.com", "eth_getTransactionReceipt"));
  const confirmed = receipt?.status === "0x1";
  if (!confirmed) {
    return { ok: false, coin: "eth", received, to: wallet, confirmed: false, reason: "Seen on Ethereum, not confirmed (or failed)." };
  }
  return { ok: true, coin: "eth", received, to: wallet, confirmed: true, reason: `Confirmed · ${received} to Kilode ETH` };
}

async function matchSol(sig: string, wallet: string): Promise<MatchResult> {
  const j = (await getJson("https://api.mainnet-beta.solana.com", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "getTransaction",
      params: [sig, { encoding: "jsonParsed", maxSupportedTransactionVersion: 0 }],
    }),
  })) as {
    result?: {
      meta?: { err?: unknown };
      transaction?: { message?: { instructions?: { parsed?: { info?: { destination?: string; lamports?: number } } }[] } };
    } | null;
  };
  const tx = j.result;
  if (!tx) {
    return { ok: false, coin: "sol", received: "", to: wallet, confirmed: false, reason: "Solana RPC has not seen this signature." };
  }
  if (tx.meta?.err) {
    return { ok: false, coin: "sol", received: "", to: wallet, confirmed: false, reason: "This Solana tx failed on chain." };
  }
  const ins = tx.transaction?.message?.instructions ?? [];
  let lamports = 0;
  let hit = false;
  for (const i of ins) {
    const dest = i.parsed?.info?.destination ?? "";
    const n = Number(i.parsed?.info?.lamports ?? 0);
    if (sameAddr(dest, wallet, "sol")) {
      hit = true;
      lamports += n;
    }
  }
  const received = `${(lamports / 1e9).toFixed(6).replace(/0+$/, "").replace(/\.$/, "")} SOL`;
  if (!hit) {
    return { ok: false, coin: "sol", received: "", to: wallet, confirmed: false, reason: "This tx does not pay the Kilode SOL wallet." };
  }
  return { ok: true, coin: "sol", received, to: wallet, confirmed: true, reason: `Confirmed · ${received} to Kilode SOL` };
}

export async function verifyCryptoTx(opts: {
  coin: string;
  txHash: string;
  wallets: WalletRow[];
}): Promise<MatchResult> {
  const hash = opts.txHash.trim();
  if (hash.length < 20) {
    return { ok: false, coin: "", received: "", to: "", confirmed: false, reason: "Paste a full transaction hash." };
  }
  const coin = inferCoin(hash, opts.coin);
  if (!coin || !["btc", "eth", "sol"].includes(coin)) {
    return { ok: false, coin, received: "", to: "", confirmed: false, reason: "Coin must be BTC, ETH, or SOL for auto-match." };
  }
  const wallet = addrOf(opts.wallets, coin);
  if (!wallet) {
    return { ok: false, coin, received: "", to: "", confirmed: false, reason: `No ${coin.toUpperCase()} wallet saved. Kilode must paste one in wallets.` };
  }
  try {
    if (coin === "btc") return await matchBtc(hash, wallet);
    if (coin === "eth") return await matchEth(hash, wallet);
    return await matchSol(hash, wallet);
  } catch {
    return {
      ok: false,
      coin,
      received: "",
      to: wallet,
      confirmed: false,
      reason: "Chain lookup failed. Public explorer timed out — try Match again, or mark paid by hand if you already checked.",
    };
  }
}

export async function applyMatch(id: string, coin: string, txHash: string): Promise<MatchResult & { id: string; status: string }> {
  const sql = await getSql();
  const hash = txHash.trim();
  const dup = await sql<{ id: string }>`select id from nf_ads where tx_hash = ${hash} and id <> ${id} and status in ('paid', 'approved') limit 1`;
  if (dup[0]) {
    return { id, status: "pending", ok: false, coin, received: "", to: "", confirmed: false, reason: "This tx hash is already used on another ad." };
  }
  const rows = await sql<WalletRow>`select coin, address from nf_wallets`;
  const result = await verifyCryptoTx({ coin, txHash: hash, wallets: rows });
  const note = result.reason.slice(0, 280);
  try {
    await sql`alter table nf_ads add column if not exists match_note text not null default ''`;
  } catch {
    /* exists */
  }
  if (result.ok) {
    const amount = result.received;
    await sql`update nf_ads set status = ${"paid"}, match_note = ${note}, amount = coalesce(nullif(amount, ''), ${amount}) where id = ${id} and status in ('pending', 'paid')`;
    return { id, status: "paid", ...result };
  }
  await sql`update nf_ads set match_note = ${note} where id = ${id}`;
  return { id, status: "pending", ...result };
}
