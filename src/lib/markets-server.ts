import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";

export type MarketDesk = "stocks" | "crypto" | "forex" | "sports" | "weather" | "tech";

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

export type WxCity = {
  name: string;
  region: string;
  temp: number;
  hi: number;
  lo: number;
  wind: number;
  humidity: number;
  code: number;
  text: string;
};

export type TechStory = {
  id: string;
  title: string;
  url: string;
  pts: number;
  comments: number;
  by: string;
  source: string;
};

export type StocksPayload = { ts: number; indices: Quote[]; world: Quote[]; us: Quote[]; ngx: Quote[] };
export type CryptoPayload = { ts: number; coins: Quote[]; btcDom: number; vol: number };
export type ForexPayload = { ts: number; ngn: number; pairs: FxPair[]; board: { code: string; px: number }[] };
export type SportsPayload = { ts: number; live: SportEvent[]; slate: SportEvent[] };
export type WeatherPayload = { ts: number; cities: WxCity[] };
export type TechPayload = { ts: number; stories: TechStory[] };

type DeskMap = {
  stocks: StocksPayload;
  crypto: CryptoPayload;
  forex: ForexPayload;
  sports: SportsPayload;
  weather: WeatherPayload;
  tech: TechPayload;
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
    headers: {
      accept: "application/json,text/plain,*/*",
      "accept-language": "en-US,en;q=0.9",
      "user-agent": UA,
      referer: "https://www.espn.com/",
    },
  });
  if (!r.ok) throw new Error(String(r.status));
  const ct = r.headers.get("content-type") || "";
  if (ct.includes("json")) return r.json();
  const t = await r.text();
  try {
    return JSON.parse(t);
  } catch {
    return t;
  }
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
const WORLD = ["^FTSE", "^GDAXI", "^FCHI", "^STOXX50E", "^N225", "^HSI", "^AXJO", "^BSESN"];
const US = ["AAPL", "MSFT", "NVDA", "GOOGL", "AMZN", "META", "TSLA", "JPM", "XOM", "BRK-B", "UNH", "V", "AVGO", "LLY"];
const NAMES: Record<string, string> = {
  "^GSPC": "S&P 500",
  "^DJI": "Dow Jones",
  "^IXIC": "Nasdaq Composite",
  "^FTSE": "FTSE 100",
  "^GDAXI": "DAX",
  "^FCHI": "CAC 40",
  "^STOXX50E": "Euro Stoxx 50",
  "^N225": "Nikkei 225",
  "^HSI": "Hang Seng",
  "^AXJO": "ASX 200",
  "^BSESN": "Sensex",
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
  AVGO: "Broadcom",
  LLY: "Eli Lilly",
};

function asQuote(symbol: string, meta: {
  shortName?: string;
  regularMarketPrice?: number;
  chartPreviousClose?: number;
  previousClose?: number;
  regularMarketVolume?: number;
  regularMarketDayHigh?: number;
  regularMarketDayLow?: number;
}, close: (number | null)[] | undefined): Quote | null {
  const px = num(meta.regularMarketPrice);
  if (!px) return null;
  const prev = num(meta.chartPreviousClose || meta.previousClose, px);
  const spark = (close ?? []).filter((x): x is number => typeof x === "number" && Number.isFinite(x)).slice(-64);
  return {
    s: symbol,
    n: NAMES[symbol] || (meta.shortName || symbol).slice(0, 42),
    px,
    ch: px - prev,
    chp: prev ? ((px - prev) / prev) * 100 : 0,
    spark,
    vol: num(meta.regularMarketVolume),
    hi: num(meta.regularMarketDayHigh),
    lo: num(meta.regularMarketDayLow),
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

async function yahooSparkBatch(symbols: string[], range = "1d"): Promise<Quote[]> {
  const u = `https://query1.finance.yahoo.com/v8/finance/spark?symbols=${encodeURIComponent(symbols.join(","))}&interval=15m&range=${range}`;
  try {
    const j = (await pull(u, 8000)) as Record<string, SparkRow>;
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
        spark: close.slice(-64),
      });
    }
    return out;
  } catch {
    return [];
  }
}

async function yahooChart(symbol: string): Promise<Quote | null> {
  try {
    const u = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=15m&range=5d`;
    const j = (await pull(u, 4500)) as {
      chart?: {
        result?: {
          meta?: {
            shortName?: string;
            regularMarketPrice?: number;
            chartPreviousClose?: number;
            previousClose?: number;
            regularMarketVolume?: number;
            regularMarketDayHigh?: number;
            regularMarketDayLow?: number;
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
  const all = [...IDX, ...WORLD, ...US];
  const batched = await yahooSparkBatch(all, "5d");
  const have = new Set(batched.map((q) => q.s));
  const missing = all.filter((s) => !have.has(s));
  if (missing.length) {
    const extra = await Promise.all(missing.slice(0, 10).map(yahooChart));
    extra.forEach((q) => {
      if (q) batched.push(q);
    });
  }
  const idx = new Set(IDX);
  const world = new Set(WORLD);
  if (!batched.length) throw new Error("stocks");
  return {
    ts: Date.now(),
    indices: batched.filter((q) => idx.has(q.s)),
    world: batched.filter((q) => world.has(q.s)),
    us: batched.filter((q) => !idx.has(q.s) && !world.has(q.s)),
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
    spark: (c.sparkline_in_7d?.price ?? []).slice(-48),
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
  const codes = ["EUR", "GBP", "JPY", "GHS", "ZAR", "KES", "CAD", "CHF", "AUD", "CNY", "XOF", "INR", "BRL"];
  const board = [{ code: "NGN", px: ngn }, ...codes.map((c) => ({ code: c, px: pick(c) })).filter((x) => x.px)];
  const pairs: FxPair[] = [];
  if (ngn) pairs.push({ pair: "USD/NGN", px: ngn, base: "USD", quote: "NGN" });
  const eur = pick("EUR");
  const gbp = pick("GBP");
  const jpy = pick("JPY");
  const ghs = pick("GHS");
  const zar = pick("ZAR");
  const inr = pick("INR");
  if (eur) pairs.push({ pair: "EUR/USD", px: 1 / eur, base: "EUR", quote: "USD" });
  if (gbp) pairs.push({ pair: "GBP/USD", px: 1 / gbp, base: "GBP", quote: "USD" });
  if (jpy) pairs.push({ pair: "USD/JPY", px: jpy, base: "USD", quote: "JPY" });
  if (eur && ngn) pairs.push({ pair: "EUR/NGN", px: ngn / eur, base: "EUR", quote: "NGN" });
  if (gbp && ngn) pairs.push({ pair: "GBP/NGN", px: ngn / gbp, base: "GBP", quote: "NGN" });
  if (ghs && ngn) pairs.push({ pair: "GHS/NGN", px: ngn / ghs, base: "GHS", quote: "NGN" });
  if (zar) pairs.push({ pair: "USD/ZAR", px: zar, base: "USD", quote: "ZAR" });
  if (inr) pairs.push({ pair: "USD/INR", px: inr, base: "USD", quote: "INR" });
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
  odds?: { details?: string }[] | { details?: string };
}): string {
  const fromComp = ev.competitions?.[0]?.odds?.[0]?.details;
  if (fromComp) return fromComp;
  const raw = ev.odds;
  const details = Array.isArray(raw) ? raw[0]?.details : raw?.details;
  if (details) return details;
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

type EspnComp = {
  homeAway?: string;
  score?: string;
  displayName?: string;
  team?: { displayName?: string; abbreviation?: string };
};

function fromComps(
  id: string,
  league: string,
  comps: EspnComp[],
  state: "pre" | "in" | "post",
  clock: string,
  lean: string,
): SportEvent | null {
  const home = comps.find((x) => x.homeAway === "home") ?? comps[1];
  const away = comps.find((x) => x.homeAway === "away") ?? comps[0];
  if (!home && !away) return null;
  const hName = home?.team?.displayName || home?.displayName || "Home";
  const aName = away?.team?.displayName || away?.displayName || "Away";
  const hs = home?.score === "" || home?.score == null ? null : num(home.score);
  const as = away?.score === "" || away?.score == null ? null : num(away.score);
  return {
    id,
    league,
    home: hName,
    away: aName,
    hs: state === "pre" ? null : hs,
    as: state === "pre" ? null : as,
    clock,
    state,
    lean,
  };
}

async function espnBoard(path: string, league: string): Promise<SportEvent[]> {
  const j = (await pull(`https://site.web.api.espn.com/apis/site/v2/sports/${path}`, 5500)) as {
    events?: {
      id?: string;
      name?: string;
      competitions?: {
        status?: { type?: { state?: string; shortDetail?: string; detail?: string } };
        competitors?: EspnComp[];
        odds?: { details?: string }[];
      }[];
    }[];
  };
  return (j.events ?? [])
    .map((ev) => {
      const c = ev.competitions?.[0];
      const comps = c?.competitors ?? [];
      if (comps.length < 2) {
        if (!ev.name) return null;
        const st = espnState(c?.status?.type?.state || "pre");
        return {
          id: ev.id || `${league}-${ev.name}`,
          league,
          home: ev.name,
          away: "",
          hs: null,
          as: null,
          clock: c?.status?.type?.shortDetail || c?.status?.type?.detail || "",
          state: st,
          lean: "",
        } satisfies SportEvent;
      }
      return fromComps(
        ev.id || `${league}-${comps[0]?.team?.abbreviation}-${comps[1]?.team?.abbreviation}`,
        league,
        comps,
        espnState(c?.status?.type?.state || "pre"),
        c?.status?.type?.shortDetail || c?.status?.type?.detail || "",
        espnLean(ev),
      );
    })
    .filter((x): x is SportEvent => !!x)
    .slice(0, 18);
}

async function espnHeader(): Promise<SportEvent[]> {
  try {
    const j = (await pull("https://site.web.api.espn.com/apis/v2/scoreboard/header", 6000)) as {
      sports?: {
        name?: string;
        leagues?: {
          abbreviation?: string;
          name?: string;
          events?: {
            id?: string;
            status?: string;
            summary?: string;
            competitors?: EspnComp[];
            fullStatus?: { type?: { state?: string; shortDetail?: string; detail?: string } };
            odds?: { details?: string };
          }[];
        }[];
      }[];
    };
    const out: SportEvent[] = [];
    for (const s of j.sports ?? []) {
      for (const lg of s.leagues ?? []) {
        const league = lg.abbreviation || lg.name || s.name || "Board";
        for (const ev of lg.events ?? []) {
          const st = espnState(ev.fullStatus?.type?.state || ev.status || "pre");
          const row = fromComps(
            ev.id || `${league}-${out.length}`,
            league,
            ev.competitors ?? [],
            st,
            ev.fullStatus?.type?.shortDetail || ev.summary || "",
            ev.odds?.details || "",
          );
          if (row) out.push(row);
        }
      }
    }
    return out;
  } catch {
    return [];
  }
}

async function tsdbLive(): Promise<SportEvent[]> {
  const out: SportEvent[] = [];
  const sports = ["Soccer", "Basketball", "Ice Hockey", "American Football", "Tennis", "Cricket", "Fighting"];
  const packs = await Promise.allSettled(
    sports.map((s) => pull(`https://www.thesportsdb.com/api/v1/json/3/livescore.php?s=${encodeURIComponent(s)}`, 5000)),
  );
  for (const p of packs) {
    if (p.status !== "fulfilled") continue;
    const j = p.value as {
      livescore?: {
        idLiveScore?: string;
        strLeague?: string;
        strHomeTeam?: string;
        strAwayTeam?: string;
        intHomeScore?: string;
        intAwayScore?: string;
        strStatus?: string;
        strProgress?: string;
        strEventTime?: string;
      }[];
    };
    for (const row of j.livescore ?? []) {
      const stRaw = (row.strStatus || "").toUpperCase();
      const live = stRaw === "1H" || stRaw === "2H" || stRaw === "HT" || stRaw === "ET" || stRaw === "LIVE" || stRaw === "Q1" || stRaw === "Q2" || stRaw === "Q3" || stRaw === "Q4" || stRaw === "OT" || stRaw === "P1" || stRaw === "P2" || stRaw === "P3";
      const done = stRaw === "FT" || stRaw === "AET" || stRaw === "PEN" || stRaw === "FT-PEN";
      out.push({
        id: row.idLiveScore || `${row.strHomeTeam}-${row.strAwayTeam}`,
        league: row.strLeague || "Live",
        home: row.strHomeTeam || "Home",
        away: row.strAwayTeam || "Away",
        hs: row.intHomeScore == null || row.intHomeScore === "" ? null : num(row.intHomeScore),
        as: row.intAwayScore == null || row.intAwayScore === "" ? null : num(row.intAwayScore),
        clock: live ? `${stRaw}${row.strProgress ? ` ${row.strProgress}'` : ""}` : row.strEventTime || stRaw,
        state: live ? "in" : done ? "post" : "pre",
        lean: "",
      });
    }
  }
  return out;
}

async function tsdbUpcoming(): Promise<SportEvent[]> {
  const ids: [string, string][] = [
    ["4328", "Premier League"],
    ["4335", "La Liga"],
    ["4332", "Serie A"],
    ["4331", "Bundesliga"],
    ["4334", "Ligue 1"],
    ["4480", "UCL"],
    ["4387", "NBA"],
    ["4391", "NFL"],
  ];
  const packs = await Promise.allSettled(
    ids.map(([id]) => pull(`https://www.thesportsdb.com/api/v1/json/3/eventsnextleague.php?id=${id}`, 5000)),
  );
  const out: SportEvent[] = [];
  packs.forEach((p, i) => {
    if (p.status !== "fulfilled") return;
    const league = ids[i][1];
    const j = p.value as {
      events?: {
        idEvent?: string;
        strHomeTeam?: string;
        strAwayTeam?: string;
        intHomeScore?: string | null;
        intAwayScore?: string | null;
        strTime?: string;
        dateEvent?: string;
        strStatus?: string;
      }[];
    };
    for (const ev of (j.events ?? []).slice(0, 6)) {
      out.push({
        id: ev.idEvent || `${league}-${ev.strHomeTeam}-${ev.strAwayTeam}`,
        league,
        home: ev.strHomeTeam || "Home",
        away: ev.strAwayTeam || "Away",
        hs: ev.intHomeScore == null || ev.intHomeScore === "" ? null : num(ev.intHomeScore),
        as: ev.intAwayScore == null || ev.intAwayScore === "" ? null : num(ev.intAwayScore),
        clock: [ev.dateEvent, ev.strTime].filter(Boolean).join(" · "),
        state: "pre",
        lean: "",
      });
    }
  });
  return out;
}

function mergeSports(rows: SportEvent[]): SportEvent[] {
  const seen = new Set<string>();
  const out: SportEvent[] = [];
  for (const e of rows) {
    const k = `${e.league}|${e.home}|${e.away}|${e.id}`.toLowerCase();
    const k2 = `${e.home}|${e.away}`.toLowerCase();
    if (seen.has(k) || seen.has(k2)) continue;
    seen.add(k);
    seen.add(k2);
    out.push(e);
  }
  return out;
}

async function loadSports(): Promise<SportsPayload> {
  const boards: [string, string][] = [
    ["soccer/eng.1/scoreboard", "Premier League"],
    ["soccer/esp.1/scoreboard", "La Liga"],
    ["soccer/ita.1/scoreboard", "Serie A"],
    ["soccer/ger.1/scoreboard", "Bundesliga"],
    ["soccer/fra.1/scoreboard", "Ligue 1"],
    ["soccer/uefa.champions/scoreboard", "UCL"],
    ["soccer/uefa.europa/scoreboard", "UEL"],
    ["soccer/usa.1/scoreboard", "MLS"],
    ["soccer/ned.1/scoreboard", "Eredivisie"],
    ["soccer/mex.1/scoreboard", "Liga MX"],
    ["soccer/bra.1/scoreboard", "Brasileirão"],
    ["basketball/nba/scoreboard", "NBA"],
    ["football/nfl/scoreboard", "NFL"],
    ["hockey/nhl/scoreboard", "NHL"],
    ["baseball/mlb/scoreboard", "MLB"],
    ["racing/f1/scoreboard", "F1"],
  ];
  const packs = await Promise.allSettled([
    ...boards.map(([p, n]) => espnBoard(p, n)),
    espnHeader(),
    tsdbLive(),
    tsdbUpcoming(),
  ]);
  const all = mergeSports(packs.flatMap((p) => (p.status === "fulfilled" ? p.value : [])));
  return { ts: Date.now(), live: all.filter((e) => e.state === "in"), slate: all.filter((e) => e.state !== "in") };
}

const WX: { name: string; region: string; lat: number; lon: number }[] = [
  { name: "Lagos", region: "Nigeria", lat: 6.5244, lon: 3.3792 },
  { name: "Abuja", region: "Nigeria", lat: 9.0765, lon: 7.3986 },
  { name: "London", region: "UK", lat: 51.5074, lon: -0.1278 },
  { name: "New York", region: "USA", lat: 40.7128, lon: -74.006 },
  { name: "Dubai", region: "UAE", lat: 25.2048, lon: 55.2708 },
  { name: "Johannesburg", region: "South Africa", lat: -26.2041, lon: 28.0473 },
  { name: "Nairobi", region: "Kenya", lat: -1.2921, lon: 36.8219 },
  { name: "Accra", region: "Ghana", lat: 5.6037, lon: -0.187 },
  { name: "Paris", region: "France", lat: 48.8566, lon: 2.3522 },
  { name: "Tokyo", region: "Japan", lat: 35.6762, lon: 139.6503 },
  { name: "Singapore", region: "Asia", lat: 1.3521, lon: 103.8198 },
  { name: "São Paulo", region: "Brazil", lat: -23.5505, lon: -46.6333 },
];

function wxText(code: number) {
  if (code === 0) return "Clear";
  if (code <= 3) return "Partly cloudy";
  if (code <= 48) return "Fog";
  if (code <= 57) return "Drizzle";
  if (code <= 67) return "Rain";
  if (code <= 77) return "Snow";
  if (code <= 82) return "Showers";
  if (code <= 86) return "Snow showers";
  if (code <= 99) return "Thunder";
  return "Sky";
}

async function loadWeather(): Promise<WeatherPayload> {
  const packs = await Promise.allSettled(
    WX.map((c) =>
      pull(
        `https://api.open-meteo.com/v1/forecast?latitude=${c.lat}&longitude=${c.lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min&timezone=auto`,
        5000,
      ).then((j) => {
        const o = j as {
          current?: { temperature_2m?: number; relative_humidity_2m?: number; weather_code?: number; wind_speed_10m?: number };
          daily?: { temperature_2m_max?: number[]; temperature_2m_min?: number[] };
        };
        const code = num(o.current?.weather_code);
        return {
          name: c.name,
          region: c.region,
          temp: num(o.current?.temperature_2m),
          hi: num(o.daily?.temperature_2m_max?.[0], num(o.current?.temperature_2m)),
          lo: num(o.daily?.temperature_2m_min?.[0], num(o.current?.temperature_2m)),
          wind: num(o.current?.wind_speed_10m),
          humidity: num(o.current?.relative_humidity_2m),
          code,
          text: wxText(code),
        } satisfies WxCity;
      }),
    ),
  );
  let cities = packs.flatMap((p) => (p.status === "fulfilled" ? [p.value] : []));
  if (!cities.length) {
    const fallback = await Promise.allSettled(
      ["Lagos", "London", "New York", "Dubai"].map((name) =>
        pull(`https://wttr.in/${encodeURIComponent(name)}?format=j1`, 5000).then((j) => {
          const o = j as {
            current_condition?: { temp_C?: string; humidity?: string; windspeedKmph?: string; weatherDesc?: { value?: string }[] }[];
            weather?: { maxtempC?: string; mintempC?: string }[];
          };
          const cur = o.current_condition?.[0];
          return {
            name,
            region: "",
            temp: num(cur?.temp_C),
            hi: num(o.weather?.[0]?.maxtempC, num(cur?.temp_C)),
            lo: num(o.weather?.[0]?.mintempC, num(cur?.temp_C)),
            wind: num(cur?.windspeedKmph),
            humidity: num(cur?.humidity),
            code: 0,
            text: cur?.weatherDesc?.[0]?.value || "Sky",
          } satisfies WxCity;
        }),
      ),
    );
    cities = fallback.flatMap((p) => (p.status === "fulfilled" ? [p.value] : []));
  }
  if (!cities.length) throw new Error("wx");
  return { ts: Date.now(), cities };
}

async function loadTech(): Promise<TechPayload> {
  const stories: TechStory[] = [];
  const [hn, dev] = await Promise.allSettled([
    pull("https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=18", 6000),
    pull("https://dev.to/api/articles?top=2&per_page=12", 6000),
  ]);
  if (hn.status === "fulfilled") {
    const j = hn.value as {
      hits?: { objectID?: string; title?: string; url?: string; points?: number; num_comments?: number; author?: string; story_url?: string }[];
    };
    for (const h of j.hits ?? []) {
      if (!h.title) continue;
      stories.push({
        id: `hn-${h.objectID}`,
        title: h.title,
        url: h.url || h.story_url || `https://news.ycombinator.com/item?id=${h.objectID}`,
        pts: num(h.points),
        comments: num(h.num_comments),
        by: h.author || "",
        source: "Front page",
      });
    }
  }
  if (dev.status === "fulfilled") {
    const j = dev.value as {
      id?: number;
      title?: string;
      url?: string;
      positive_reactions_count?: number;
      comments_count?: number;
      user?: { name?: string };
    }[];
    for (const a of j ?? []) {
      if (!a.title || !a.url) continue;
      stories.push({
        id: `dev-${a.id}`,
        title: a.title,
        url: a.url,
        pts: num(a.positive_reactions_count),
        comments: num(a.comments_count),
        by: a.user?.name || "",
        source: "Engineering",
      });
    }
  }
  if (!stories.length) throw new Error("tech");
  return { ts: Date.now(), stories };
}

export const getMarketDesk = createServerFn({ method: "GET" })
  .validator((d: { desk: MarketDesk }) => d)
  .handler(async ({ data }): Promise<DeskMap[MarketDesk]> => {
    const desk = data.desk;
    if (desk === "stocks") return cachedLoad("stocks", 60_000, loadStocks);
    if (desk === "crypto") return cachedLoad("crypto", 45_000, loadCrypto);
    if (desk === "forex") return cachedLoad("forex", 90_000, loadForex);
    if (desk === "weather") return cachedLoad("weather", 15 * 60_000, loadWeather);
    if (desk === "tech") return cachedLoad("tech", 5 * 60_000, loadTech);
    return cachedLoad("sports", 30_000, loadSports);
  });
