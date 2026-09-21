import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";

export type MarketDesk = "stocks" | "crypto" | "forex" | "sports";

export type Quote = {
  s: string;
  n: string;
  px: number;
  ch: number;
  chp: number;
  spark: number[];
  vol?: number;
  hi?: number;
  lo?: number;
  extra?: string;
};

export type FxPair = { pair: string; px: number; base: string; quote: string };

export type SportEvent = {
  id: string;
  league: string;
  home: string;
  away: string;
  hs: number | null;
  as: number | null;
  clock: string;
  state: "pre" | "in" | "post";
  lean: string;
};

export type StocksPayload = { ts: number; indices: Quote[]; us: Quote[]; ngx: Quote[] };
export type CryptoPayload = { ts: number; coins: Quote[]; btcDom: number; vol: number };
export type ForexPayload = { ts: number; ngn: number; pairs: FxPair[]; board: { code: string; px: number }[] };
export type SportsPayload = { ts: number; live: SportEvent[]; slate: SportEvent[] };

type DeskMap = {
  stocks: StocksPayload;
  crypto: CryptoPayload;
  forex: ForexPayload;
  sports: SportsPayload;
};

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

async function cacheGet(k: string, ttl: number): Promise<string | null> {
  try {
    const sql = await getSql();
    await sql`create table if not exists nf_market_cache (k text primary key, v text not null, ts bigint not null)`;
    const rows = await sql<{ v: string; ts: string | number }>`select v, ts from nf_market_cache where k = ${k} limit 1`;
    const row = rows[0];
    if (!row) return null;
    if (Date.now() - Number(row.ts) > ttl) return `stale:${row.v}`;
    return row.v;
  } catch {
    return null;
  }
}

async function cachePut(k: string, v: string) {
  try {
    const sql = await getSql();
    await sql`insert into nf_market_cache (k, v, ts) values (${k}, ${v}, ${Date.now()}) on conflict (k) do update set v = ${v}, ts = ${Date.now()}`;
  } catch {
    /* ignore */
  }
}

async function pull(url: string, ms = 5000): Promise<unknown> {
  const r = await fetch(url, {
    signal: AbortSignal.timeout(ms),
    headers: { accept: "application/json", "user-agent": UA },
  });
  if (!r.ok) throw new Error(String(r.status));
  return r.json();
}

function num(v: unknown, d = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
}

async function cachedLoad<T>(k: string, ttl: number, load: () => Promise<T>): Promise<T> {
  const hit = await cacheGet(k, ttl);
  if (hit && !hit.startsWith("stale:")) return JSON.parse(hit) as T;
  try {
    const data = await load();
    await cachePut(k, JSON.stringify(data));
    return data;
  } catch {
    if (hit?.startsWith("stale:")) return JSON.parse(hit.slice(6)) as T;
    throw new Error("desk");
  }
}

const IDX = ["^GSPC", "^DJI", "^IXIC"];
const US = ["AAPL", "MSFT", "NVDA", "GOOGL", "AMZN", "META", "TSLA", "JPM", "XOM", "BRK-B", "UNH", "V"];
const NAMES: Record<string, string> = {
  "^GSPC": "S&P 500",
  "^DJI": "Dow Jones",
  "^IXIC": "Nasdaq Composite",
  AAPL: "Apple",
  MSFT: "Microsoft",
  NVDA: "NVIDIA",
  GOOGL: "Alphabet",
  AMZN: "Amazon",
  META: "Meta",
  TSLA: "Tesla",
  JPM: "JPMorgan",
  XOM: "Exxon Mobil",
  "BRK-B": "Berkshire Hathaway",
  UNH: "UnitedHealth",
  V: "Visa",
};

function asQuote(symbol: string, meta: {
  shortName?: string;
  regularMarketPrice?: number;
  chartPreviousClose?: number;
  previousClose?: number;
  regularMarketVolume?: number;
}, close: (number | null)[] | undefined): Quote | null {
  const px = num(meta.regularMarketPrice);
  if (!px) return null;
  const prev = num(meta.chartPreviousClose || meta.previousClose, px);
  const spark = (close ?? []).filter((x): x is number => typeof x === "number" && Number.isFinite(x)).slice(-32);
  return {
    s: symbol,
    n: NAMES[symbol] || (meta.shortName || symbol).slice(0, 42),
    px,
    ch: px - prev,
    chp: prev ? ((px - prev) / prev) * 100 : 0,
    spark,
    vol: num(meta.regularMarketVolume),
  };
}

type SparkRow = {
  symbol?: string;
  close?: number[];
  fulldayPrice?: number;
  fulldayChange?: number;
  fulldayChangePercent?: number;
  previousClose?: number;
  chartPreviousClose?: number;
};

async function yahooSparkBatch(symbols: string[]): Promise<Quote[]> {
  const u = `https://query1.finance.yahoo.com/v8/finance/spark?symbols=${encodeURIComponent(symbols.join(","))}&interval=15m&range=1d`;
  try {
    const j = (await pull(u, 7000)) as Record<string, SparkRow>;
    const out: Quote[] = [];
    for (const [k, v] of Object.entries(j ?? {})) {
      if (!v || typeof v !== "object" || Array.isArray(v)) continue;
      const close = (v.close ?? []).filter((x) => Number.isFinite(x));
      const px = num(v.fulldayPrice || close[close.length - 1]);
      if (!px) continue;
      const symbol = v.symbol || k;
      const prev = num(v.previousClose || v.chartPreviousClose, px);
      out.push({
        s: symbol,
        n: NAMES[symbol] || symbol.replace("^", ""),
        px,
        ch: num(v.fulldayChange, px - prev),
        chp: num(v.fulldayChangePercent, prev ? ((px - prev) / prev) * 100 : 0),
        spark: close.slice(-32),
      });
    }
    return out;
  } catch {
    return [];
  }
}

async function yahooChart(symbol: string): Promise<Quote | null> {
  try {
    const u = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=15m&range=1d`;
    const j = (await pull(u, 4500)) as {
      chart?: {
        result?: {
          meta?: {
            shortName?: string;
            regularMarketPrice?: number;
            chartPreviousClose?: number;
            previousClose?: number;
            regularMarketVolume?: number;
          };
          indicators?: { quote?: { close?: (number | null)[] }[] };
        }[];
      };
    };
    const res = j.chart?.result?.[0];
    if (!res?.meta) return null;
    return asQuote(symbol, res.meta, res.indicators?.quote?.[0]?.close);
  } catch {
    return null;
  }
}

async function loadStocks(): Promise<StocksPayload> {
  const all = [...IDX, ...US];
  const batched = await yahooSparkBatch(all);
  const have = new Set(batched.map((q) => q.s));
  const missing = all.filter((s) => !have.has(s));
  if (missing.length) {
    const extra = await Promise.all(missing.slice(0, 8).map(yahooChart));
    extra.forEach((q) => {
      if (q) batched.push(q);
    });
  }
  const idx = new Set(IDX);
  if (!batched.length) throw new Error("stocks");
  return {
    ts: Date.now(),
    indices: batched.filter((q) => idx.has(q.s)),
    us: batched.filter((q) => !idx.has(q.s)),
    ngx: [],
  };
}

async function loadCryptoGecko(): Promise<CryptoPayload> {
  const j = (await pull(
    "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=40&page=1&sparkline=true&price_change_percentage=24h",
    7000,
  )) as {
    symbol?: string;
    name?: string;
    current_price?: number;
    price_change_24h?: number;
    price_change_percentage_24h?: number;
    market_cap?: number;
    total_volume?: number;
    high_24h?: number;
    low_24h?: number;
    sparkline_in_7d?: { price?: number[] };
  }[];
  const coins: Quote[] = (j ?? []).filter((c) => c.symbol).map((c) => ({
    s: (c.symbol || "").toUpperCase(),
    n: c.name || c.symbol || "",
    px: num(c.current_price),
    ch: num(c.price_change_24h),
    chp: num(c.price_change_percentage_24h),
    spark: (c.sparkline_in_7d?.price ?? []).slice(-32),
    vol: num(c.total_volume),
    hi: num(c.high_24h),
    lo: num(c.low_24h),
    extra: String(Math.round(num(c.market_cap))),
  }));
  const btc = coins.find((c) => c.s === "BTC");
  const total = coins.reduce((a, c) => a + num(c.extra), 0);
  const vol = coins.reduce((a, c) => a + num(c.vol), 0);
  if (!coins.length) throw new Error("crypto");
  return { ts: Date.now(), coins, btcDom: total && btc ? (num(btc.extra) / total) * 100 : 0, vol };
}

const BINANCE_MAP: Record<string, string> = {
  BTCUSDT: "Bitcoin",
  ETHUSDT: "Ethereum",
  BNBUSDT: "BNB",
  SOLUSDT: "Solana",
  XRPUSDT: "XRP",
  ADAUSDT: "Cardano",
  DOGEUSDT: "Dogecoin",
  TONUSDT: "Toncoin",
  TRXUSDT: "TRON",
  AVAXUSDT: "Avalanche",
  LINKUSDT: "Chainlink",
  DOTUSDT: "Polkadot",
  MATICUSDT: "Polygon",
  LTCUSDT: "Litecoin",
  SHIBUSDT: "Shiba Inu",
  ATOMUSDT: "Cosmos",
  UNIUSDT: "Uniswap",
  XLMUSDT: "Stellar",
  NEARUSDT: "NEAR",
  APTUSDT: "Aptos",
};

async function loadCryptoLore(): Promise<CryptoPayload> {
  const j = (await pull("https://api.coinlore.net/api/tickers/?start=0&limit=40", 7000)) as {
    data?: {
      symbol?: string;
      name?: string;
      price_usd?: string;
      percent_change_24h?: string;
      market_cap_usd?: string;
      volume24?: number;
    }[];
  };
  const coins: Quote[] = (j.data ?? []).filter((c) => c.symbol).map((c) => ({
    s: (c.symbol || "").toUpperCase(),
    n: c.name || c.symbol || "",
    px: num(c.price_usd),
    ch: 0,
    chp: num(c.percent_change_24h),
    spark: [],
    vol: num(c.volume24),
    extra: String(Math.round(num(c.market_cap_usd))),
  }));
  const btc = coins.find((c) => c.s === "BTC");
  const total = coins.reduce((a, c) => a + num(c.extra), 0);
  const vol = coins.reduce((a, c) => a + num(c.vol), 0);
  if (!coins.length) throw new Error("crypto");
  return { ts: Date.now(), coins, btcDom: total && btc ? (num(btc.extra) / total) * 100 : 0, vol };
}

async function loadCryptoBinance(): Promise<CryptoPayload> {
  const j = (await pull("https://data-api.binance.vision/api/v3/ticker/24hr", 7000)) as {
    symbol?: string;
    lastPrice?: string;
    priceChange?: string;
    priceChangePercent?: string;
    quoteVolume?: string;
    highPrice?: string;
    lowPrice?: string;
  }[];
  const coins: Quote[] = [];
  for (const row of j ?? []) {
    const n = BINANCE_MAP[row.symbol || ""];
    if (!n) continue;
    coins.push({
      s: (row.symbol || "").replace(/USDT$/, ""),
      n,
      px: num(row.lastPrice),
      ch: num(row.priceChange),
      chp: num(row.priceChangePercent),
      spark: [],
      vol: num(row.quoteVolume),
      hi: num(row.highPrice),
      lo: num(row.lowPrice),
    });
  }
  coins.sort((a, b) => (b.vol || 0) - (a.vol || 0));
  const btc = coins.find((c) => c.s === "BTC");
  const vol = coins.reduce((a, c) => a + num(c.vol), 0);
  if (!coins.length) throw new Error("crypto");
  return { ts: Date.now(), coins, btcDom: btc ? 52 : 0, vol };
}

async function loadCrypto(): Promise<CryptoPayload> {
  try {
    return await loadCryptoGecko();
  } catch {
    try {
      return await loadCryptoLore();
    } catch {
      return loadCryptoBinance();
    }
  }
}

function fxFromRates(r: Record<string, number>): ForexPayload {
  const ngn = num(r.NGN || r.ngn);
  const pick = (c: string) => num(r[c] || r[c.toLowerCase()]);
  const codes = ["EUR", "GBP", "JPY", "GHS", "ZAR", "KES", "CAD", "CHF", "AUD", "CNY", "XOF"];
  const board = [{ code: "NGN", px: ngn }, ...codes.map((c) => ({ code: c, px: pick(c) })).filter((x) => x.px)];
  const pairs: FxPair[] = [];
  if (ngn) pairs.push({ pair: "USD/NGN", px: ngn, base: "USD", quote: "NGN" });
  const eur = pick("EUR");
  const gbp = pick("GBP");
  const jpy = pick("JPY");
  const ghs = pick("GHS");
  const zar = pick("ZAR");
  if (eur) pairs.push({ pair: "EUR/USD", px: 1 / eur, base: "EUR", quote: "USD" });
  if (gbp) pairs.push({ pair: "GBP/USD", px: 1 / gbp, base: "GBP", quote: "USD" });
  if (jpy) pairs.push({ pair: "USD/JPY", px: jpy, base: "USD", quote: "JPY" });
  if (eur && ngn) pairs.push({ pair: "EUR/NGN", px: ngn / eur, base: "EUR", quote: "NGN" });
  if (gbp && ngn) pairs.push({ pair: "GBP/NGN", px: ngn / gbp, base: "GBP", quote: "NGN" });
  if (ghs && ngn) pairs.push({ pair: "GHS/NGN", px: ngn / ghs, base: "GHS", quote: "NGN" });
  if (zar) pairs.push({ pair: "USD/ZAR", px: zar, base: "USD", quote: "ZAR" });
  if (!ngn && !pairs.length) throw new Error("fx");
  return { ts: Date.now(), ngn, pairs, board };
}

async function loadForex(): Promise<ForexPayload> {
  try {
    const j = (await pull("https://open.er-api.com/v6/latest/USD", 6000)) as { rates?: Record<string, number> };
    return fxFromRates(j.rates ?? {});
  } catch {
    const j = (await pull("https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json", 6000)) as {
      usd?: Record<string, number>;
    };
    const usd = j.usd ?? {};
    const rates: Record<string, number> = {};
    for (const [k, v] of Object.entries(usd)) rates[k.toUpperCase()] = v;
    return fxFromRates(rates);
  }
}

function espnState(s: string): "pre" | "in" | "post" {
  if (s === "in") return "in";
  if (s === "post") return "post";
  return "pre";
}

function espnLean(ev: {
  competitions?: {
    competitors?: { homeAway?: string; score?: string; records?: { summary?: string }[]; team?: { displayName?: string } }[];
    odds?: { details?: string }[];
  }[];
}): string {
  const odds = ev.competitions?.[0]?.odds?.[0]?.details;
  if (odds) return odds;
  const comps = ev.competitions?.[0]?.competitors ?? [];
  const home = comps.find((c) => c.homeAway === "home");
  const away = comps.find((c) => c.homeAway === "away");
  const hw = Number((home?.records?.[0]?.summary || "").split("-")[0]);
  const aw = Number((away?.records?.[0]?.summary || "").split("-")[0]);
  if (Number.isFinite(hw) && Number.isFinite(aw) && hw !== aw) {
    return hw > aw ? `Lean ${home?.team?.displayName ?? "home"}` : `Lean ${away?.team?.displayName ?? "away"}`;
  }
  return "";
}

async function espnBoard(path: string, league: string): Promise<SportEvent[]> {
  const j = (await pull(`https://site.api.espn.com/apis/site/v2/sports/${path}`, 6000)) as {
    events?: {
      id?: string;
      competitions?: {
        status?: { type?: { state?: string; shortDetail?: string; detail?: string } };
        competitors?: { homeAway?: string; score?: string; team?: { displayName?: string; abbreviation?: string } }[];
        odds?: { details?: string }[];
      }[];
    }[];
  };
  return (j.events ?? []).slice(0, 14).map((ev) => {
    const c = ev.competitions?.[0];
    const home = c?.competitors?.find((x) => x.homeAway === "home");
    const away = c?.competitors?.find((x) => x.homeAway === "away");
    const st = espnState(c?.status?.type?.state || "pre");
    const hs = home?.score === "" || home?.score == null ? null : num(home.score);
    const as = away?.score === "" || away?.score == null ? null : num(away.score);
    return {
      id: ev.id || `${league}-${home?.team?.abbreviation}-${away?.team?.abbreviation}`,
      league,
      home: home?.team?.displayName || "Home",
      away: away?.team?.displayName || "Away",
      hs: st === "pre" ? null : hs,
      as: st === "pre" ? null : as,
      clock: c?.status?.type?.shortDetail || c?.status?.type?.detail || "",
      state: st,
      lean: espnLean(ev),
    };
  });
}

async function loadSports(): Promise<SportsPayload> {
  const packs = await Promise.allSettled([
    espnBoard("soccer/eng.1/scoreboard", "Premier League"),
    espnBoard("soccer/esp.1/scoreboard", "La Liga"),
    espnBoard("soccer/ita.1/scoreboard", "Serie A"),
    espnBoard("soccer/uefa.champions/scoreboard", "UCL"),
    espnBoard("soccer/nga.1/scoreboard", "NPFL"),
    espnBoard("soccer/caf.nations/scoreboard", "AFCON"),
    espnBoard("basketball/nba/scoreboard", "NBA"),
  ]);
  const all = packs.flatMap((p) => (p.status === "fulfilled" ? p.value : []));
  return { ts: Date.now(), live: all.filter((e) => e.state === "in"), slate: all.filter((e) => e.state !== "in") };
}

export const getMarketDesk = createServerFn({ method: "GET" })
  .validator((d: { desk: MarketDesk }) => d)
  .handler(async ({ data }): Promise<DeskMap[MarketDesk]> => {
    const desk = data.desk;
    if (desk === "stocks") return cachedLoad("stocks", 60_000, loadStocks);
    if (desk === "crypto") return cachedLoad("crypto", 45_000, loadCrypto);
    if (desk === "forex") return cachedLoad("forex", 90_000, loadForex);
    return cachedLoad("sports", 30_000, loadSports);
  });
