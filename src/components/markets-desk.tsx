import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft } from "lucide-react";
import {
  getMarketDesk,
  type CryptoPayload,
  type ForexPayload,
  type MarketDesk,
  type Quote,
  type SportEvent,
  type SportsPayload,
  type StocksPayload,
  type TechPayload,
  type WeatherPayload,
} from "@/lib/markets-server";
import { fmtCount } from "@/lib/qonvo-data";

export type { MarketDesk };

export const DESKS: { id: MarketDesk; label: string }[] = [
  { id: "stocks", label: "STOCKS" },
  { id: "crypto", label: "CRYPTO" },
  { id: "forex", label: "FOREX" },
  { id: "sports", label: "SPORTS" },
  { id: "weather", label: "WEATHER" },
  { id: "tech", label: "TECH" },
];

export function MarketRail({ onPick, active }: { onPick: (d: MarketDesk) => void; active?: MarketDesk | null }) {
  return (
    <div className="desk-rail mb-3 flex gap-1">
      {DESKS.map((d) => (
        <button key={d.id} type="button" className={`desk-pill ${active === d.id ? "on" : ""}`} onClick={() => onPick(d.id)}>
          {d.label}
        </button>
      ))}
    </div>
  );
}

function Spark({ pts, up, wide }: { pts: number[]; up: boolean; wide?: boolean }) {
  const series = pts.length >= 2 ? pts : [];
  if (series.length < 2) return <span className={wide ? "inline-block h-16 w-full" : "inline-block h-6 w-16"} />;
  const min = Math.min(...series);
  const max = Math.max(...series);
  const span = max - min || 1;
  const W = wide ? 240 : 80;
  const H = wide ? 64 : 24;
  const d = series
    .map((p, i) => {
      const x = (i / (series.length - 1)) * W;
      const y = H - 2 - ((p - min) / span) * (H - 4);
      return `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
  const area = `${d} L${W} ${H} L0 ${H} Z`;
  const col = up ? "#6b9e78" : "#c05050";
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={wide ? "h-16 w-full" : "h-6 w-16"} aria-hidden preserveAspectRatio="none">
      {wide ? <path d={area} fill={up ? "rgba(107,158,120,.16)" : "rgba(192,80,80,.16)"} /> : null}
      <path d={d} fill="none" stroke={col} strokeWidth={wide ? 1.8 : 1.4} />
    </svg>
  );
}

function sparkOf(q: Quote) {
  if (q.spark.length >= 2) return q.spark;
  if (q.px) return [q.px - (q.ch || 0), q.px];
  return [];
}

function px(n: number, d = 2) {
  if (!Number.isFinite(n)) return "—";
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1000) return n.toLocaleString(undefined, { maximumFractionDigits: d });
  if (Math.abs(n) < 0.01 && n !== 0) return n.toPrecision(3);
  return n.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });
}

function Ch({ chp }: { chp: number }) {
  const up = chp >= 0;
  return (
    <span className={`tabular-nums ${up ? "text-lime-2" : "text-danger"}`}>
      {up ? "+" : ""}
      {chp.toFixed(2)}%
    </span>
  );
}

function Heat({ q }: { q: Quote }) {
  const a = Math.min(1, Math.abs(q.chp) / 6);
  const bg = q.chp >= 0 ? `rgba(107, 158, 120, ${0.1 + a * 0.55})` : `rgba(192, 80, 80, ${0.1 + a * 0.55})`;
  return (
    <div className="rounded-lg px-2 py-2" style={{ background: bg }}>
      <div className="truncate text-[10px] font-semibold tracking-[0.08em]">{q.s.replace(".LA", "").replace("^", "")}</div>
      <Ch chp={q.chp} />
    </div>
  );
}

function Wait() {
  return <p className="px-2 py-10 text-center text-[12px] text-muted">Desk is opening…</p>;
}

function stamp(ts: number) {
  return new Date(ts).toLocaleTimeString("en-GB", { timeZone: "Africa/Lagos", hour: "2-digit", minute: "2-digit" });
}

function useDesk<T>(desk: MarketDesk, empty: T): T | null {
  const [d, setD] = useState<T | null>(null);
  const emptyRef = useRef(empty);
  emptyRef.current = empty;
  useEffect(() => {
    let on = true;
    setD(null);
    const load = () => {
      void getMarketDesk({ data: { desk } })
        .then((r) => {
          if (on) setD(r as T);
        })
        .catch(() => {
          if (on) setD(emptyRef.current);
        });
    };
    load();
    const t = window.setInterval(load, 50_000);
    return () => {
      on = false;
      window.clearInterval(t);
    };
  }, [desk]);
  return d;
}

const EMPTY_STOCKS: StocksPayload = { ts: Date.now(), indices: [], world: [], us: [], ngx: [] };
const EMPTY_CRYPTO: CryptoPayload = { ts: Date.now(), coins: [], btcDom: 0, vol: 0 };
const EMPTY_FOREX: ForexPayload = { ts: Date.now(), ngn: 0, pairs: [], board: [] };
const EMPTY_SPORTS: SportsPayload = { ts: Date.now(), live: [], slate: [] };
const EMPTY_WX: WeatherPayload = { ts: Date.now(), cities: [] };
const EMPTY_TECH: TechPayload = { ts: Date.now(), stories: [] };

export function MarketsDesk({ desk, onDesk, onBack }: { desk: MarketDesk; onDesk: (d: MarketDesk) => void; onBack: () => void }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center gap-1.5 border-b border-line px-2 py-1.5">
        <button type="button" aria-label="Back" className="grid size-8 shrink-0 place-items-center rounded-md border border-line" onClick={onBack}>
          <ChevronLeft className="size-4" />
        </button>
        <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto">
          {DESKS.map((d) => (
            <button key={d.id} type="button" className={`desk-pill ${desk === d.id ? "on" : ""}`} onClick={() => onDesk(d.id)}>
              {d.label}
            </button>
          ))}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 dock-pad">
        {desk === "stocks" ? <StocksDesk /> : null}
        {desk === "crypto" ? <CryptoDesk /> : null}
        {desk === "forex" ? <ForexDesk /> : null}
        {desk === "sports" ? <SportsDesk /> : null}
        {desk === "weather" ? <WeatherDesk /> : null}
        {desk === "tech" ? <TechDesk /> : null}
      </div>
    </div>
  );
}

function SessionClocks() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(t);
  }, []);
  const mins = (tz: string) => {
    const parts = new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date(now));
    const h = Number(parts.find((p) => p.type === "hour")?.value);
    const m = Number(parts.find((p) => p.type === "minute")?.value);
    return h * 60 + m;
  };
  const t = (tz: string) => new Date(now).toLocaleTimeString("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit" });
  const ny = mins("America/New_York");
  const ldn = mins("Europe/London");
  const tky = mins("Asia/Tokyo");
  const rows = [
    { k: "NEW YORK", tz: "America/New_York", on: ny >= 9 * 60 + 30 && ny < 16 * 60, label: "NYSE" },
    { k: "LONDON", tz: "Europe/London", on: ldn >= 8 * 60 && ldn < 16 * 60 + 30, label: "LSE" },
    { k: "TOKYO", tz: "Asia/Tokyo", on: tky >= 9 * 60 && tky < 15 * 60, label: "TSE" },
    { k: "LAGOS", tz: "Africa/Lagos", on: mins("Africa/Lagos") >= 10 * 60 && mins("Africa/Lagos") < 14 * 60 + 30, label: "NGX" },
  ];
  return (
    <div className="grid grid-cols-4 gap-1">
      {rows.map((r) => (
        <div key={r.k} className="raised rounded-xl px-2 py-2">
          <div className="text-[8px] tracking-[0.12em] text-muted">{r.k}</div>
          <div className="text-[13px] font-semibold tabular-nums">{t(r.tz)}</div>
          <div className={`text-[9px] ${r.on ? "text-lime-2" : "text-muted"}`}>{r.on ? `${r.label} open` : `${r.label} closed`}</div>
        </div>
      ))}
    </div>
  );
}

function QuoteRow({ q, prefix }: { q: Quote; prefix?: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-semibold">{q.s.replace(".LA", "").replace("^", "")}</div>
        <div className="truncate text-[10px] text-muted">{q.n}</div>
      </div>
      <Spark pts={sparkOf(q)} up={q.chp >= 0} />
      <div className="w-[92px] text-right">
        <div className="text-[13px] font-semibold tabular-nums">
          {prefix}
          {px(q.px, q.px >= 100 ? 2 : 2)}
        </div>
        <Ch chp={q.chp} />
      </div>
    </div>
  );
}

function StocksDesk() {
  const d = useDesk("stocks", EMPTY_STOCKS);
  if (!d) return <Wait />;
  const hero = d.indices[0] || d.world[0] || d.us[0];
  const names = [...d.us, ...d.ngx];
  const flow = [...d.indices, ...d.world, ...names];
  const gainers = [...names].sort((a, b) => b.chp - a.chp).slice(0, 5);
  const losers = [...names].sort((a, b) => a.chp - b.chp).slice(0, 5);
  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <p className="text-[10px] tracking-[0.18em] text-lime-2">EQUITIES · FLOW</p>
        <span className="text-[10px] tabular-nums text-muted">Lagos · {stamp(d.ts)}</span>
      </div>
      <SessionClocks />
      {hero ? (
        <div className="raised rounded-2xl px-3 py-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-[10px] tracking-[0.16em] text-muted">{hero.n}</div>
              <div className="text-[28px] font-semibold tabular-nums leading-none">{px(hero.px)}</div>
              <Ch chp={hero.chp} />
            </div>
            <div className="text-right text-[10px] tabular-nums text-muted">
              {hero.hi ? <div>H {px(hero.hi)}</div> : null}
              {hero.lo ? <div>L {px(hero.lo)}</div> : null}
            </div>
          </div>
          <div className="mt-2">
            <Spark pts={sparkOf(hero)} up={hero.chp >= 0} wide />
          </div>
        </div>
      ) : null}
      <div className="grid grid-cols-3 gap-1.5">
        {d.indices.map((q) => (
          <div key={q.s} className="raised rounded-xl px-2 py-2.5">
            <div className="text-[9px] tracking-[0.12em] text-muted">{q.n}</div>
            <div className="mt-0.5 text-[15px] font-semibold tabular-nums">{px(q.px)}</div>
            <Ch chp={q.chp} />
            <Spark pts={sparkOf(q)} up={q.chp >= 0} />
          </div>
        ))}
      </div>
      {d.world.length ? (
        <div>
          <div className="mb-1 text-[10px] tracking-[0.16em] text-lime-2">WORLD</div>
          <div className="grid grid-cols-2 gap-1.5">
            {d.world.map((q) => (
              <div key={q.s} className="raised rounded-xl px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-[11px] font-semibold">{q.n}</div>
                    <div className="text-[15px] font-semibold tabular-nums">{px(q.px)}</div>
                    <Ch chp={q.chp} />
                  </div>
                  <Spark pts={sparkOf(q)} up={q.chp >= 0} />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {flow.length ? (
        <div className="grid grid-cols-4 gap-1">
          {flow.slice(0, 12).map((q) => (
            <Heat key={q.s} q={q} />
          ))}
        </div>
      ) : null}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <div className="mb-1 text-[10px] tracking-[0.16em] text-lime-2">ADVANCE</div>
          {gainers.map((q) => (
            <div key={q.s} className="flex items-center justify-between py-1 text-[12px]">
              <span className="truncate font-semibold">{q.s}</span>
              <Ch chp={q.chp} />
            </div>
          ))}
        </div>
        <div>
          <div className="mb-1 text-[10px] tracking-[0.16em] text-danger">DECLINE</div>
          {losers.map((q) => (
            <div key={q.s} className="flex items-center justify-between py-1 text-[12px]">
              <span className="truncate font-semibold">{q.s}</span>
              <Ch chp={q.chp} />
            </div>
          ))}
        </div>
      </div>
      {d.us.length ? (
        <div className="overflow-hidden rounded-2xl border border-line">
          <div className="px-3 py-2 text-[10px] tracking-[0.16em] text-lime-2">UNITED STATES</div>
          {d.us.map((q, i) => (
            <div key={q.s} className={i ? "border-t border-line" : ""}>
              <QuoteRow q={q} />
            </div>
          ))}
        </div>
      ) : null}
      {!names.length && !d.indices.length && !d.world.length ? (
        <p className="text-center text-[12px] text-muted">Equities desk is quiet. Open again in a moment.</p>
      ) : null}
    </div>
  );
}

function CryptoDesk() {
  const d = useDesk("crypto", EMPTY_CRYPTO);
  if (!d) return <Wait />;
  const btc = d.coins.find((c) => c.s === "BTC");
  const eth = d.coins.find((c) => c.s === "ETH");
  const movers = [...d.coins].sort((a, b) => Math.abs(b.chp) - Math.abs(a.chp)).slice(0, 8);
  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <p className="text-[10px] tracking-[0.18em] text-lime-2">DIGITAL ASSETS</p>
        <span className="text-[10px] tabular-nums text-muted">Lagos · {stamp(d.ts)}</span>
      </div>
      {btc ? (
        <div className="raised rounded-2xl px-3 py-3">
          <div className="flex items-end justify-between">
            <div>
              <div className="text-[10px] tracking-[0.16em] text-lime-2">BITCOIN</div>
              <div className="text-[28px] font-semibold tabular-nums leading-none">${px(btc.px, 0)}</div>
              <Ch chp={btc.chp} />
            </div>
            {btc.hi && btc.lo ? (
              <div className="text-right text-[10px] tabular-nums text-muted">
                <div>H {px(btc.hi, 0)}</div>
                <div>L {px(btc.lo, 0)}</div>
              </div>
            ) : null}
          </div>
          <div className="mt-2">
            <Spark pts={sparkOf(btc)} up={btc.chp >= 0} wide />
          </div>
        </div>
      ) : null}
      <div className="grid grid-cols-2 gap-1.5">
        {[eth].filter(Boolean).map((q) => (
          <div key={q!.s} className="rounded-2xl border border-lime-2/25 bg-lime-2/5 px-3 py-3">
            <div className="flex items-center justify-between">
              <div className="text-[10px] tracking-[0.16em] text-lime-2">{q!.s}</div>
              <Ch chp={q!.chp} />
            </div>
            <div className="mt-1 text-[22px] font-semibold tabular-nums leading-none">${px(q!.px, q!.px > 10 ? 0 : 2)}</div>
            <div className="mt-2">
              <Spark pts={sparkOf(q!)} up={q!.chp >= 0} />
            </div>
          </div>
        ))}
        {d.btcDom ? (
          <div className="raised rounded-2xl px-3 py-3">
            <div className="text-[10px] tracking-[0.16em] text-muted">BTC WEIGHT</div>
            <div className="text-[22px] font-semibold tabular-nums">{d.btcDom.toFixed(1)}%</div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-panel-3">
              <div className="h-full rounded-full bg-lime-2" style={{ width: `${Math.min(100, d.btcDom)}%` }} />
            </div>
            {d.vol ? <div className="mt-2 text-[10px] tabular-nums text-muted">Vol ${fmtCount(Math.round(d.vol))}</div> : null}
          </div>
        ) : null}
      </div>
      {movers.length ? (
        <div className="grid grid-cols-4 gap-1">
          {movers.map((q) => (
            <Heat key={q.s} q={q} />
          ))}
        </div>
      ) : null}
      <div className="grid grid-cols-1 overflow-hidden rounded-2xl border border-line">
        {d.coins.map((q, i) => (
          <div key={q.s} className={`flex items-center gap-2 px-3 py-2 ${i ? "border-t border-line" : ""}`}>
            <div className="w-7 text-[10px] tabular-nums text-muted">{i + 1}</div>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-semibold">{q.s}</div>
              <div className="truncate text-[10px] text-muted">{q.n}</div>
            </div>
            <Spark pts={sparkOf(q)} up={q.chp >= 0} />
            <div className="w-[96px] text-right">
              <div className="text-[13px] font-semibold tabular-nums">${px(q.px, q.px >= 1 ? 2 : 4)}</div>
              <Ch chp={q.chp} />
            </div>
          </div>
        ))}
      </div>
      {!d.coins.length ? <p className="text-center text-[12px] text-muted">Digital desk is quiet. Open again in a moment.</p> : null}
    </div>
  );
}

function ForexDesk() {
  const d = useDesk("forex", EMPTY_FOREX);
  const [amt, setAmt] = useState("1");
  const [dir, setDir] = useState<"usd" | "ngn">("usd");
  if (!d) return <Wait />;
  const n = Number(amt) || 0;
  const out = dir === "usd" ? n * d.ngn : d.ngn ? n / d.ngn : 0;
  const ngn = d.pairs.find((p) => p.pair === "USD/NGN");
  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <p className="text-[10px] tracking-[0.18em] text-lime-2">NAIRA · CROSSES</p>
        <span className="text-[10px] tabular-nums text-muted">Lagos · {stamp(d.ts)}</span>
      </div>
      <div className="rounded-2xl border border-lime-2/30 bg-gradient-to-br from-lime-2/10 to-transparent px-4 py-5">
        <div className="flex items-end justify-between gap-2">
          <div>
            <div className="text-[11px] tracking-[0.2em] text-lime-2">USD / NGN</div>
            <div className="mt-1 text-[36px] font-semibold tabular-nums leading-none">{d.ngn ? px(d.ngn, 2) : "—"}</div>
            {ngn && ngn.chp ? <Ch chp={ngn.chp} /> : <p className="mt-2 text-[11px] text-muted">One dollar, in naira.</p>}
          </div>
        </div>
        {ngn && ngn.spark.length > 1 ? (
          <div className="mt-3">
            <Spark pts={ngn.spark} up={ngn.chp >= 0} wide />
          </div>
        ) : null}
      </div>
      {d.ngn ? (
        <div className="raised rounded-2xl px-3 py-3">
          <div className="mb-2 text-[10px] tracking-[0.16em] text-lime-2">CONVERT</div>
          <div className="flex gap-2">
            <input
              value={amt}
              onChange={(e) => setAmt(e.target.value.replace(/[^\d.]/g, ""))}
              inputMode="decimal"
              className="min-h-10 flex-1 rounded-lg border border-line bg-bg px-3 text-[15px] font-semibold tabular-nums"
            />
            <button type="button" className="desk-pill on min-w-[64px]" onClick={() => setDir((v) => (v === "usd" ? "ngn" : "usd"))}>
              {dir === "usd" ? "USD" : "NGN"}
            </button>
          </div>
          <div className="mt-2 text-[20px] font-semibold tabular-nums">
            {px(out, 2)} <span className="text-[11px] font-medium tracking-[0.12em] text-muted">{dir === "usd" ? "NGN" : "USD"}</span>
          </div>
        </div>
      ) : null}
      <div className="grid grid-cols-2 gap-1.5">
        {d.pairs
          .filter((p) => p.pair !== "USD/NGN")
          .map((p) => (
            <div key={p.pair} className="raised rounded-xl px-3 py-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-[10px] tracking-[0.14em] text-muted">{p.pair}</div>
                  <div className="mt-1 text-[18px] font-semibold tabular-nums">{px(p.px, p.px > 20 ? 2 : 4)}</div>
                  {p.chp ? <Ch chp={p.chp} /> : null}
                </div>
                {p.spark.length > 1 ? <Spark pts={p.spark} up={p.chp >= 0} /> : null}
              </div>
            </div>
          ))}
      </div>
      {d.pairs.length ? (
        <div className="grid grid-cols-4 gap-1">
          {d.pairs.slice(0, 8).map((p) => (
            <Heat key={p.pair} q={{ s: p.pair, n: p.pair, px: p.px, ch: 0, chp: p.chp, spark: p.spark }} />
          ))}
        </div>
      ) : null}
      <div className="overflow-hidden rounded-2xl border border-line">
        <div className="px-3 py-2 text-[10px] tracking-[0.16em] text-lime-2">USD BOARD</div>
        {d.board.map((b, i) => (
          <div key={b.code} className={`flex items-center justify-between px-3 py-2 text-[13px] ${i ? "border-t border-line" : ""}`}>
            <span className="font-semibold tracking-[0.08em]">{b.code}</span>
            <span className="tabular-nums">{px(b.px, b.px > 20 ? 2 : 4)}</span>
          </div>
        ))}
      </div>
      {!d.ngn && !d.pairs.length ? <p className="text-center text-[12px] text-muted">FX desk is quiet. Open again in a moment.</p> : null}
    </div>
  );
}

function Match({ e }: { e: SportEvent }) {
  return (
    <div className="raised rounded-2xl px-3 py-3">
      <div className="flex items-center justify-between text-[10px] tracking-[0.12em] text-muted">
        <span className="truncate pr-2">{e.league}</span>
        <span className={e.state === "in" ? "desk-live shrink-0 text-lime-2" : "shrink-0"}>{e.state === "in" ? "LIVE" : e.clock}</span>
      </div>
      <div className={`mt-2 items-center gap-2 ${e.away ? "grid grid-cols-[1fr_auto_1fr]" : ""}`}>
        <div className={`${e.away ? "text-right" : ""} text-[13px] font-semibold leading-tight`}>{e.home}</div>
        {e.away ? (
          <>
            <div className="min-w-[56px] text-center text-[18px] font-semibold tabular-nums">
              {e.hs == null && e.as == null ? "vs" : `${e.hs ?? "–"}–${e.as ?? "–"}`}
            </div>
            <div className="text-[13px] font-semibold leading-tight">{e.away}</div>
          </>
        ) : (
          <div className="mt-1 text-[11px] text-muted">{e.clock}</div>
        )}
      </div>
      {e.lean ? <div className="mt-2 text-center text-[10px] tracking-[0.08em] text-lime-2">{e.lean}</div> : null}
    </div>
  );
}

const FLAG_LEAGUES = [
  "premier league",
  "la liga",
  "serie a",
  "bundesliga",
  "ligue 1",
  "champions",
  "europa",
  "nba",
  "nfl",
  "nhl",
  "mlb",
  "mls",
  "eredivisie",
  "liga mx",
  "brasileir",
  "npfl",
  "afcon",
  "world cup",
  "formula",
  "f1",
];

function leagueRank(name: string) {
  const s = name.toLowerCase();
  const i = FLAG_LEAGUES.findIndex((k) => s.includes(k));
  return i === -1 ? 80 + name.length : i;
}

function SportsDesk() {
  const d = useDesk("sports", EMPTY_SPORTS);
  const upcoming = useMemo(() => (d ? d.slate.filter((e) => e.state === "pre") : []), [d]);
  const finals = useMemo(() => (d ? d.slate.filter((e) => e.state === "post") : []), [d]);
  const [tab, setTab] = useState<"flash" | "live" | "up" | "final">("flash");
  const [lg, setLg] = useState("All");
  useEffect(() => {
    if (!d) return;
    if (tab === "live" && !d.live.length && upcoming.length) setTab("up");
  }, [d, tab, upcoming.length]);
  const leagues = useMemo(() => {
    if (!d) return [];
    return [...new Set([...d.live, ...d.slate].map((e) => e.league))].sort((a, b) => leagueRank(a) - leagueRank(b) || a.localeCompare(b));
  }, [d]);
  if (!d) return <Wait />;
  const flash = [...d.live, ...upcoming, ...finals].sort((a, b) => leagueRank(a.league) - leagueRank(b.league));
  const pool = (tab === "flash" ? flash : tab === "live" ? d.live : tab === "up" ? upcoming : finals)
    .filter((e) => lg === "All" || e.league === lg)
    .slice()
    .sort((a, b) => leagueRank(a.league) - leagueRank(b.league));
  const groups = [...new Set(pool.map((e) => e.league))];
  const tickerSrc = [...d.live].sort((a, b) => leagueRank(a.league) - leagueRank(b.league));
  const ticker = tickerSrc.length
    ? tickerSrc.map((e) => `${e.home} ${e.hs ?? ""}–${e.as ?? ""} ${e.away}`.trim())
    : upcoming.slice(0, 8).map((e) => `${e.home} vs ${e.away} · ${e.clock}`);
  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <p className="text-[10px] tracking-[0.18em] text-lime-2">MATCH CENTRE</p>
        <span className="text-[10px] tabular-nums text-muted">Lagos · {stamp(d.ts)}</span>
      </div>
      {ticker.length ? (
        <div className="overflow-hidden rounded-xl border border-lime-2/25 bg-lime-2/5 px-3 py-2">
          <div className="mb-1 text-[9px] tracking-[0.16em] text-lime-2">{d.live.length ? "SCORE FLASH" : "UP NEXT"}</div>
          <div className="overflow-x-auto whitespace-nowrap text-[12px] font-semibold">{ticker.join("   ·   ")}</div>
        </div>
      ) : null}
      <div className="flex gap-1 overflow-x-auto">
        {(
          [
            ["flash", "BOARD"],
            ["live", d.live.length ? `LIVE · ${d.live.length}` : "LIVE"],
            ["up", upcoming.length ? `UPCOMING · ${upcoming.length}` : "UPCOMING"],
            ["final", "FINAL"],
          ] as const
        ).map(([id, label]) => (
          <button key={id} type="button" className={`desk-pill ${tab === id ? "on" : ""}`} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>
      {leagues.length > 1 ? (
        <div className="flex gap-1 overflow-x-auto pb-1">
          <button type="button" className={`desk-pill ${lg === "All" ? "on" : ""}`} onClick={() => setLg("All")}>
            ALL
          </button>
          {leagues.map((name) => (
            <button key={name} type="button" className={`desk-pill ${lg === name ? "on" : ""}`} onClick={() => setLg(name)}>
              {name.toUpperCase()}
            </button>
          ))}
        </div>
      ) : null}
      {groups.map((name) => (
        <section key={name} className="space-y-2">
          <div className="text-[10px] tracking-[0.16em] text-muted">{name.toUpperCase()}</div>
          {pool
            .filter((e) => e.league === name)
            .map((e) => (
              <Match key={e.id} e={e} />
            ))}
        </section>
      ))}
      {!pool.length ? (
        <p className="py-8 text-center text-[12px] text-muted">
          {tab === "live" ? "No live matches this minute. Open Upcoming." : "Board is quiet. Open again in a moment."}
        </p>
      ) : null}
    </div>
  );
}

function WeatherDesk() {
  const d = useDesk("weather", EMPTY_WX);
  if (!d) return <Wait />;
  const home = d.cities[0];
  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <p className="text-[10px] tracking-[0.18em] text-lime-2">WORLD SKY</p>
        <span className="text-[10px] tabular-nums text-muted">Lagos · {stamp(d.ts)}</span>
      </div>
      {home ? (
        <div className="raised rounded-2xl px-4 py-4">
          <div className="text-[10px] tracking-[0.16em] text-muted">{home.name.toUpperCase()}</div>
          <div className="mt-1 flex items-end justify-between">
            <div className="text-[40px] font-semibold tabular-nums leading-none">{Math.round(home.temp)}°</div>
            <div className="text-right text-[12px] text-muted">
              <div>{home.text}</div>
              <div>
                H {Math.round(home.hi)}° · L {Math.round(home.lo)}°
              </div>
            </div>
          </div>
        </div>
      ) : null}
      <div className="grid grid-cols-2 gap-1.5">
        {d.cities.map((c) => (
          <div key={c.name} className="raised rounded-xl px-3 py-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-[13px] font-semibold">{c.name}</div>
                <div className="text-[10px] text-muted">{c.region || c.text}</div>
              </div>
              <div className="text-[22px] font-semibold tabular-nums leading-none">{Math.round(c.temp)}°</div>
            </div>
            <div className="mt-2 flex justify-between text-[10px] tabular-nums text-muted">
              <span>{c.text}</span>
              <span>
                {Math.round(c.lo)}°/{Math.round(c.hi)}°
              </span>
            </div>
            {c.wind || c.humidity ? (
              <div className="mt-1 text-[10px] text-muted">
                {c.wind ? `${Math.round(c.wind)} wind` : ""}
                {c.wind && c.humidity ? " · " : ""}
                {c.humidity ? `${Math.round(c.humidity)}% rh` : ""}
              </div>
            ) : null}
          </div>
        ))}
      </div>
      {!d.cities.length ? <p className="text-center text-[12px] text-muted">Sky desk is quiet. Open again in a moment.</p> : null}
    </div>
  );
}

function TechDesk() {
  const d = useDesk("tech", EMPTY_TECH);
  if (!d) return <Wait />;
  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <p className="text-[10px] tracking-[0.18em] text-lime-2">TECH WIRE</p>
        <span className="text-[10px] tabular-nums text-muted">Lagos · {stamp(d.ts)}</span>
      </div>
      <div className="overflow-hidden rounded-2xl border border-line">
        {d.stories.map((s, i) => (
          <a key={s.id} href={s.url} target="_blank" rel="noreferrer" className={`block px-3 py-3 ${i ? "border-t border-line" : ""}`}>
            <div className="text-[10px] tracking-[0.14em] text-muted">
              {s.source.toUpperCase()}
              {s.by ? ` · ${s.by}` : ""}
            </div>
            <div className="mt-0.5 text-[14px] font-semibold leading-snug">{s.title}</div>
            <div className="mt-1 text-[10px] tabular-nums text-muted">
              {s.pts ? `${fmtCount(s.pts)} pts` : ""}
              {s.pts && s.comments ? " · " : ""}
              {s.comments ? `${fmtCount(s.comments)} notes` : ""}
            </div>
          </a>
        ))}
      </div>
      {!d.stories.length ? <p className="text-center text-[12px] text-muted">Wire is quiet. Open again in a moment.</p> : null}
    </div>
  );
}
