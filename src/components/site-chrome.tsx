import { useEffect, useMemo, useState } from "react";
import { Share2, X } from "lucide-react";
import { fmtCount, type Post } from "@/lib/qonvo-data";
import { DigestBox, GetAppRow, JoinCta, TelegramLink } from "@/components/get-app";
import { getPublicSite, pingVisit, saveSiteFlags, type PublicSite } from "@/lib/site-server";

const GONE_KEY = "kilode-install-toast";
const SID_KEY = "kilode-vid";

function sid() {
  try {
    const old = sessionStorage.getItem(SID_KEY);
    if (old && old.length >= 8) return old;
    const next = crypto.randomUUID();
    sessionStorage.setItem(SID_KEY, next);
    return next;
  } catch {
    return `g${Date.now().toString(36)}`;
  }
}

export function TrendingTicker({ posts, onOpen }: { posts: Post[]; onOpen: (id: string) => void }) {
  const items = useMemo(() => {
    const ranked = [...posts]
      .filter((p) => p.status !== "draft" && p.title)
      .sort((a, b) => (b.views ?? 0) - (a.views ?? 0) || b.ts - a.ts)
      .slice(0, 12);
    return ranked.length ? ranked : posts.filter((p) => p.title).slice(0, 8);
  }, [posts]);
  const loop = items.length ? [...items, ...items] : [];
  if (!loop.length) return null;
  return (
    <div className="flex min-h-9 min-w-0 flex-1 items-center gap-2 overflow-hidden rounded-md border border-[#4e7a58]/50 bg-gradient-to-r from-[#1a2a1e] via-[#141414] to-[#1a2a1e] px-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
      <span className="btn-join shrink-0 rounded px-1.5 py-0.5 text-[9px] font-extrabold tracking-[0.16em]">TRENDING</span>
      <div className="min-w-0 flex-1 overflow-hidden">
        <div className="ticker-track gap-6 px-0 text-[11px] leading-7 text-fg">
          {loop.map((p, i) => (
            <button
              key={`${p.id}-${i}`}
              type="button"
              className="shrink-0 font-semibold hover:text-lime-2"
              onClick={() => onOpen(p.id)}
            >
              {p.title}
              <span className="ml-1.5 font-normal text-muted">{fmtCount(p.views ?? 0)}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SiteFooter() {
  const [site, setSite] = useState<PublicSite>({ installToast: true, visitorsToday: 0, visitorsAll: 0, members: 0 });
  useEffect(() => {
    void getPublicSite()
      .then(setSite)
      .catch(() => undefined);
  }, []);
  function share(kind: "x" | "wa" | "tg" | "copy") {
    const url = "https://kilode.ng";
    const text = "Kilode — Talk Nigeria. Live.";
    if (kind === "x") window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, "_blank", "noopener");
    if (kind === "wa") window.open(`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`, "_blank", "noopener");
    if (kind === "tg") window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`, "_blank", "noopener");
    if (kind === "copy") void navigator.clipboard?.writeText(url);
  }
  return (
    <footer className="mt-6 overflow-hidden rounded-2xl border border-line bg-gradient-to-b from-[#1a1f1b] to-[#101010] px-3 py-4">
      <div className="flex items-center gap-2">
        <img src="/kilode-logo-green.png" alt="Kilode" className="h-8 w-auto object-contain" />
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-extrabold tracking-tight">KILODE</div>
          <div className="text-[10px] text-muted">Talk Nigeria. Live.</div>
        </div>
        <JoinCta className="min-w-[108px]" />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] tabular-nums text-muted">
        <span className="inline-flex items-center gap-1 rounded-full border border-lime-2/30 bg-lime-2/10 px-2 py-0.5 text-lime-2">
          <span className="size-1.5 animate-pulse rounded-full bg-lime-2" />
          {fmtCount(site.visitorsToday)} today
        </span>
        <span>{fmtCount(site.visitorsAll)} visitors</span>
        <span>{fmtCount(site.members)} joined</span>
      </div>
      <p className="mt-1 text-[9px] text-muted">Counts unique browsers per day on this site. Not an estimate.</p>
      <div className="mt-3">
        <GetAppRow />
      </div>
      <DigestBox />
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] font-bold tracking-[0.14em] text-muted">SHARE</span>
        <button type="button" className="btn-3d rounded-md px-2 py-1 text-[10px] font-semibold" onClick={() => share("x")}>
          X
        </button>
        <button type="button" className="btn-3d rounded-md px-2 py-1 text-[10px] font-semibold" onClick={() => share("wa")}>
          WhatsApp
        </button>
        <button type="button" className="btn-3d rounded-md px-2 py-1 text-[10px] font-semibold" onClick={() => share("tg")}>
          Telegram
        </button>
        <button type="button" className="btn-3d inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-semibold" onClick={() => share("copy")}>
          <Share2 className="size-3" /> Copy
        </button>
      </div>
      <p className="mt-3 text-center text-[10px] leading-snug text-muted">
        <a href="/terms" className="underline">
          Terms
        </a>
        {" · "}
        <a href="/terms#privacy" className="underline">
          Privacy
        </a>
        {" · "}
        <a href="/terms#rules" className="underline">
          Rules
        </a>
        {" · "}
        <a href="/advertise" className="underline">
          Advertise
        </a>
      </p>
      <p className="mt-1.5 flex items-center justify-center gap-1 text-[10px] text-muted">
        <TelegramLink />
      </p>
    </footer>
  );
}

export function InstallToast() {
  const [on, setOn] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let dead = false;
    try {
      if (localStorage.getItem(GONE_KEY) === "1") return;
    } catch {
      /* ignore */
    }
    const t = window.setTimeout(() => {
      void getPublicSite()
        .then((s) => {
          if (dead) return;
          if (s.installToast) setOn(true);
        })
        .catch(() => undefined)
        .finally(() => {
          if (!dead) setReady(true);
        });
    }, 9000);
    return () => {
      dead = true;
      window.clearTimeout(t);
    };
  }, []);
  useEffect(() => {
    const id = sid();
    void pingVisit({ data: { sid: id } }).catch(() => undefined);
  }, []);
  if (!ready || !on) return null;
  return (
    <div className="pointer-events-none fixed bottom-[calc(3.6rem+env(safe-area-inset-bottom))] left-2 z-40 w-[min(280px,calc(100vw-5.5rem))] md:bottom-4">
      <div className="pointer-events-auto relative overflow-hidden rounded-xl border border-line bg-panel/95 pr-8 shadow-[0_12px_28px_rgba(0,0,0,0.45)] backdrop-blur">
        <button
          type="button"
          aria-label="Dismiss"
          className="absolute top-1.5 right-1.5 grid size-7 place-items-center rounded-md border border-line bg-panel-2"
          onClick={() => {
            try {
              localStorage.setItem(GONE_KEY, "1");
            } catch {
              /* ignore */
            }
            setOn(false);
          }}
        >
          <X className="size-3.5" />
        </button>
        <GetAppRow />
      </div>
    </div>
  );
}

export function SiteFlagsPanel() {
  const [on, setOn] = useState(true);
  const [msg, setMsg] = useState("");
  useEffect(() => {
    void getPublicSite()
      .then((s) => setOn(s.installToast))
      .catch(() => undefined);
  }, []);
  return (
    <div className="md:col-span-2 raised space-y-2 rounded-xl p-3">
      <div className="text-[10px] font-bold tracking-[0.16em] text-lime-2">HOME SCREEN TOAST</div>
      <p className="text-[11px] text-muted">Bottom-left “Get the app” chip. Visitors can X it. It waits 9 seconds and does not come back on that phone after dismiss.</p>
      <label className="flex items-center justify-between gap-2 text-sm">
        <span>Show install toast</span>
        <input
          type="checkbox"
          checked={on}
          onChange={(e) => {
            const next = e.target.checked;
            setOn(next);
            void saveSiteFlags({ data: { installToast: next } }).then((r) => setMsg(r.ok ? (next ? "Toast on" : "Toast off") : "Could not save"));
          }}
        />
      </label>
      {msg ? <p className="text-[11px] text-lime-2">{msg}</p> : null}
    </div>
  );
}
