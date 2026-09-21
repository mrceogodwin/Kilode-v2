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
} from "@/lib/markets-server";
import { fmtCount } from "@/lib/qonvo-data";

export type { MarketDesk };

export const DESKS: { id: MarketDesk; label: string }[] = [
  { id: "stocks", label: "STOCKS" },
  { id: "crypto", label: "CRYPTO" },
  { id: "forex", label: "FOREX" },
  { id: "sports", label: "SPORTS" },
];

export function MarketRail({ onPick, active }: { onPick: (d: MarketDesk) => void; active?: MarketDesk | null }) {
  return (
    <div className="desk-rail mb-3 grid grid-cols-4 gap-1.5">
      {DESKS.map((d) => (
        <button key={d.id} type="button" className={`desk-pill ${active === d.id ? "on" : ""}`} onClick={() => onPick(d.id)}>
          {d.label}
        </button>
      ))}
    </div>
  );
}

function Spark({ pts, up }: { pts: number[]; up: boolean }) {
  if (pts.length < 2) return <span className="inline-block h-6 w-14" />;
  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const span = max - min || 1;
  const d = pts
    .map((p, i) => {
      const x = (i / (pts.length - 1)) * 72;
      const y = 22 - ((p - min) / span) * 20;
      return `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg viewBox="0 0 72 24" className="h-6 w-14" aria-hidden>
      <path d={d} fill="none" stroke={up ? "#6b9e78" : "#c05050"} strokeWidth="1.4" />
    </svg>
  );
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

const EMPTY_STOCKS: StocksPayload = { ts: Date.now(), indices: [], us: [], ngx: [] };
const EMPTY_CRYPTO: CryptoPayload = { ts: Date.now(), coins: [], btcDom: 0, vol: 0 };
const EMPTY_FOREX: ForexPayload = { ts: Date.now(), ngn: 0, pairs: [], board: [] };
const EMPTY_SPORTS: SportsPayload = { ts: Date.now(), live: [], slate: [] };

export function MarketsDesk({ desk, onDesk, onBack }: { desk: MarketDesk; onDesk: (d: MarketDesk) => void; onBack: () => void }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center gap-2 border-b border-line px-3 py-2">
        <button type="button" aria-label="Back" className="grid size-8 place-items-center rounded-md border border-line" onClick={onBack}>
          <ChevronLeft className="size-4" />
        </button>
        <div className="news-flash">{DESKS.find((d) => d.id === desk)?.label}</div>
        <div className="ml-auto flex min-w-0 gap-1 overflow-x-auto">
          {DESKS.map((d) => (
            <button key={d.id} type="button" className={`desk-pill shrink-0 px-2 ${desk === d.id ? "on" : ""}`} onClick={() => onDesk(d.id)}>
              {d.label}
            </button>
          ))}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 pb-8">
        {desk === "stocks" ? <StocksDesk /> : null}
        {desk === "crypto" ? <CryptoDesk /> : null}
        {desk === "forex" ? <ForexDesk /> : null}
        {desk === "sports" ? <SportsDesk /> : null}
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
  const ngxOpen = mins("Africa/Lagos") >= 10 * 60 && mins("Africa/Lagos") < 14 * 60 + 30;
  const ny = mins("America/New_York");
  const nyOpen = ny >= 9 * 60 + 30 && ny < 16 * 60;
  const t = (tz: string) => new Date(now).toLocaleTimeString("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit" });
  return (
    <div className="grid grid-cols-2 gap-1.5">
      <div className="raised rounded-xl px-3 py-2">
        <div className="text-[9px] tracking-[0.16em] text-muted">LAGOS</div>
        <div className="text-[16px] font-semibold tabular-nums">{t("Africa/Lagos")}</div>
        <div className={`text-[10px] ${ngxOpen ? "text-lime-2" : "text-muted"}`}>{ngxOpen ? "NGX open" : "NGX closed"}</div>
      </div>
      <div className="raised rounded-xl px-3 py-2">
        <div className="text-[9px] tracking-[0.16em] text-muted">NEW YORK</div>
        <div className="text-[16px] font-semibold tabular-nums">{t("America/New_York")}</div>
        <div className={`text-[10px] ${nyOpen ? "text-lime-2" : "text-muted"}`}>{nyOpen ? "NYSE open" : "NYSE closed"}</div>
      </div>
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
      <Spark pts={q.spark} up={q.chp >= 0} />
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
  const names = [...d.us, ...d.ngx];
  const gainers = [...names].sort((a, b) => b.chp - a.chp).slice(0, 4);
  const losers = [...names].sort((a, b) => a.chp - b.chp).slice(0, 4);
  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <p className="text-[10px] tracking-[0.18em] text-lime-2">EQUITIES · FLOOR</p>
        <span className="text-[10px] tabular-nums text-muted">Lagos · {stamp(d.ts)}</span>
      </div>
      <SessionClocks />
      <div className="grid grid-cols-3 gap-1.5">
        {d.indices.map((q) => (
          <div key={q.s} className="raised rounded-xl px-2 py-2.5">
            <div className="text-[9px] tracking-[0.12em] text-muted">{q.s.replace("^", "")}</div>
            <div className="mt-0.5 text-[15px] font-semibold tabular-nums">{px(q.px)}</div>
            <Ch chp={q.chp} />
            <Spark pts={q.spark} up={q.chp >= 0} />
          </div>
        ))}
      </div>
      {names.length ? (
        <div className="grid grid-cols-4 gap-1">
          {names.slice(0, 8).map((q) => (
            <Heat key={q.s} q={q} />
          ))}
        </div>
      ) : null}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <div className="mb-1 text-[10px] tracking-[0.16em] text-lime-2">ADVANCE</div>
          {gainers.map((q) => (
            <div key={q.s} className="flex items-center justify-between py-1 text-[12px]">
              <span className="truncate font-semibold">{q.s.replace(".LA", "")}</span>
              <Ch chp={q.chp} />
            </div>
          ))}
        </div>
        <div>
          <div className="mb-1 text-[10px] tracking-[0.16em] text-danger">DECLINE</div>
          {losers.map((q) => (
            <div key={q.s} className="flex items-center justify-between py-1 text-[12px]">
              <span className="truncate font-semibold">{q.s.replace(".LA", "")}</span>
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
      {d.ngx.length ? (
        <div className="overflow-hidden rounded-2xl border border-line">
          <div className="px-3 py-2 text-[10px] tracking-[0.16em] text-lime-2">NGX LAGOS</div>
          {d.ngx.map((q, i) => (
            <div key={q.s} className={i ? "border-t border-line" : ""}>
              <QuoteRow q={q} />
            </div>
          ))}
        </div>
      ) : null}
      {!names.length && !d.indices.length ? <p className="text-center text-[12px] text-muted">Equities desk is quiet. Open again in a moment.</p> : null}
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
      <div className="grid grid-cols-2 gap-1.5">
        {[btc, eth].filter(Boolean).map((q) => (
          <div key={q!.s} className="rounded-2xl border border-lime-2/25 bg-lime-2/5 px-3 py-3">
            <div className="flex items-center justify-between">
              <div className="text-[10px] tracking-[0.16em] text-lime-2">{q!.s}</div>
              <Ch chp={q!.chp} />
            </div>
            <div className="mt-1 text-[22px] font-semibold tabular-nums leading-none">${px(q!.px, q!.px > 10 ? 0 : 2)}</div>
            <div className="mt-2">
              <Spark pts={q!.spark} up={q!.chp >= 0} />
            </div>
            {q!.hi && q!.lo ? (
              <div className="mt-1 flex justify-between text-[10px] tabular-nums text-muted">
                <span>L {px(q!.lo, 0)}</span>
                <span>H {px(q!.hi, 0)}</span>
              </div>
            ) : null}
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2 text-[11px] tabular-nums text-muted">
        {d.btcDom ? <span className="rounded-full border border-line px-2 py-0.5">BTC {d.btcDom.toFixed(1)}%</span> : null}
        {d.vol ? <span className="rounded-full border border-line px-2 py-0.5">Vol ${fmtCount(Math.round(d.vol))}</span> : null}
        <span className="rounded-full border border-line px-2 py-0.5">{d.coins.length} assets</span>
      </div>
      {d.btcDom ? (
        <div>
          <div className="mb-1 flex justify-between text-[10px] tracking-[0.12em] text-muted">
            <span>BTC WEIGHT</span>
            <span className="tabular-nums">{d.btcDom.toFixed(1)}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-panel-3">
            <div className="h-full rounded-full bg-lime-2" style={{ width: `${Math.min(100, d.btcDom)}%` }} />
          </div>
        </div>
      ) : null}
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
            <Spark pts={q.spark} up={q.chp >= 0} />
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
  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <p className="text-[10px] tracking-[0.18em] text-lime-2">NAIRA · CROSSES</p>
        <span className="text-[10px] tabular-nums text-muted">Lagos · {stamp(d.ts)}</span>
      </div>
      <div className="rounded-2xl border border-lime-2/30 bg-gradient-to-br from-lime-2/10 to-transparent px-4 py-5">
        <div className="text-[11px] tracking-[0.2em] text-lime-2">USD / NGN</div>
        <div className="mt-1 text-[36px] font-semibold tabular-nums leading-none">{d.ngn ? px(d.ngn, 2) : "—"}</div>
        <p className="mt-2 text-[11px] text-muted">One dollar, in naira. Print on this desk.</p>
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
              <div className="text-[10px] tracking-[0.14em] text-muted">{p.pair}</div>
              <div className="mt-1 text-[18px] font-semibold tabular-nums">{px(p.px, p.px > 20 ? 2 : 4)}</div>
            </div>
          ))}
      </div>
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
        <span>{e.league}</span>
        <span className={e.state === "in" ? "desk-live text-lime-2" : ""}>{e.state === "in" ? "LIVE" : e.clock}</span>
      </div>
      <div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div className="text-right text-[13px] font-semibold leading-tight">{e.home}</div>
        <div className="min-w-[56px] text-center text-[18px] font-semibold tabular-nums">
          {e.hs == null && e.as == null ? "vs" : `${e.hs ?? "–"}–${e.as ?? "–"}`}
        </div>
        <div className="text-[13px] font-semibold leading-tight">{e.away}</div>
      </div>
      {e.lean ? <div className="mt-2 text-center text-[10px] tracking-[0.08em] text-lime-2">{e.lean}</div> : null}
    </div>
  );
}

function SportsDesk() {
  const d = useDesk("sports", EMPTY_SPORTS);
  const [tab, setTab] = useState<"live" | "slate">("live");
  const [lg, setLg] = useState("All");
  const leagues = useMemo(() => {
    if (!d) return [];
    return [...new Set([...d.live, ...d.slate].map((e) => e.league))];
  }, [d]);
  if (!d) return <Wait />;
  const pool = (tab === "live" ? d.live : d.slate).filter((e) => lg === "All" || e.league === lg);
  const groups = [...new Set(pool.map((e) => e.league))];
  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <p className="text-[10px] tracking-[0.18em] text-lime-2">MATCH CENTRE</p>
        <span className="text-[10px] tabular-nums text-muted">Lagos · {stamp(d.ts)}</span>
      </div>
      <div className="flex gap-1.5">
        <button type="button" className={`desk-pill ${tab === "live" ? "on" : ""}`} onClick={() => setTab("live")}>
          LIVE{d.live.length ? ` · ${d.live.length}` : ""}
        </button>
        <button type="button" className={`desk-pill ${tab === "slate" ? "on" : ""}`} onClick={() => setTab("slate")}>
          SLATE
        </button>
      </div>
      {leagues.length > 1 ? (
        <div className="flex gap-1 overflow-x-auto pb-1">
          <button type="button" className={`desk-pill shrink-0 px-2 ${lg === "All" ? "on" : ""}`} onClick={() => setLg("All")}>
            ALL
          </button>
          {leagues.map((name) => (
            <button key={name} type="button" className={`desk-pill shrink-0 px-2 ${lg === name ? "on" : ""}`} onClick={() => setLg(name)}>
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
        <p className="py-8 text-center text-[12px] text-muted">{tab === "live" ? "No live matches on the board. Open Slate." : "Slate is empty right now."}</p>
      ) : null}
    </div>
  );
}
