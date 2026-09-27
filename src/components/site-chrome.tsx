import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Share2, X } from "lucide-react";
import { fmtCount, type Post } from "@/lib/qonvo-data";
import { DigestBox, GetAppRow, TelegramLink } from "@/components/get-app";
import { ABOUT_SHORT } from "@/lib/legal";
import { getPublicSite, pingShare, pingVisit, saveSiteFlags, type PublicSite, type ShareKey } from "@/lib/site-server";

const GONE_KEY = "kilode-install-toast";
const SID_KEY = "kilode-vid";
export const EMPTY_PUBLIC_SITE: PublicSite = {
  installToast: true,
  videosMenuVisible: true,
  photosOn: true,
  payOff: "",
  visitorsToday: 0,
  visitorsAll: 0,
  members: 0,
  digest: 0,
  subscribers: 0,
  shares: { x: 0, wa: 0, tg: 0, fb: 0, copy: 0 },
};
const EMPTY = EMPTY_PUBLIC_SITE;

type PublicSiteCtx = { site: PublicSite; setSite: (s: PublicSite) => void; refresh: () => void };
const PublicSiteContext = createContext<PublicSiteCtx>({
  site: EMPTY,
  setSite: () => undefined,
  refresh: () => undefined,
});

/** SSR-friendly site stats. Prefers loader `initial`, then soft-refreshes client-side without wiping on failure. */
export function PublicSiteProvider({ initial, children }: { initial?: PublicSite; children: ReactNode }) {
  const [site, setSite] = useState<PublicSite>(initial ?? EMPTY);
  const refresh = useCallback(() => {
    void getPublicSite()
      .then(setSite)
      .catch(() => undefined);
  }, []);
  useEffect(() => {
    if (initial) setSite(initial);
  }, [initial]);
  useEffect(() => {
    if (initial) return;
    refresh();
  }, [refresh, initial]);
  const value = useMemo(() => ({ site, setSite, refresh }), [site, refresh]);
  return <PublicSiteContext.Provider value={value}>{children}</PublicSiteContext.Provider>;
}

export function usePublicSite() {
  return useContext(PublicSiteContext);
}

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
    <div className="trend-ticker flex min-h-9 min-w-0 flex-1 items-center gap-2 overflow-hidden rounded-md px-1.5">
      <span className="btn-yellow inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[9px] font-extrabold tracking-[0.12em] text-black">
        <svg viewBox="0 0 16 16" className="size-3" aria-hidden>
          <path d="M2 12 6.1 7.6 8.5 9.8 14 3.4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M10.2 3.4H14v3.6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        TRENDING
      </span>
      <div className="min-w-0 flex-1 overflow-hidden">
        <div className="ticker-track gap-6 px-0 text-[11px] leading-7">
          {loop.map((p, i) => (
            <button
              key={`${p.id}-${i}`}
              type="button"
              className="shrink-0 font-medium hover:text-lime-2"
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

function IconX() {
  return (
    <svg viewBox="0 0 24 24" className="size-3.5 fill-current" aria-hidden>
      <path d="M18.9 2H22l-6.8 7.8L23 22h-6.5l-5.1-6.7L5.8 22H2.7l7.3-8.3L1 2h6.6l4.6 6.1L18.9 2Zm-1.1 18h1.8L6.3 3.9H4.4L17.8 20Z" />
    </svg>
  );
}
function IconWa() {
  return (
    <svg viewBox="0 0 24 24" className="size-4 fill-current" aria-hidden>
      <path d="M12.04 2C6.58 2 2.15 6.4 2.15 11.83c0 1.74.46 3.44 1.34 4.94L2 22l5.4-1.41a10.1 10.1 0 0 0 4.64 1.12h.01c5.46 0 9.89-4.4 9.89-9.84C21.94 6.4 17.5 2 12.04 2Zm5.72 13.99c-.24.68-1.4 1.25-1.93 1.33-.49.07-1.1.1-1.78-.11-.41-.13-.94-.3-1.61-.59-2.84-1.23-4.7-4.1-4.84-4.29-.14-.19-1.15-1.53-1.15-2.92 0-1.39.73-2.07.99-2.36.26-.29.57-.36.76-.36h.55c.18 0 .41-.07.64.49.24.58.82 2 .89 2.14.07.15.12.32.02.51-.1.2-.15.32-.3.5-.14.17-.3.38-.43.51-.14.14-.29.29-.12.56.16.27.73 1.2 1.57 1.95 1.08.96 1.99 1.26 2.26 1.4.27.14.43.12.59-.07.16-.19.68-.79.86-1.06.18-.27.36-.22.61-.13.24.1 1.54.73 1.8.86.27.13.44.2.51.31.07.11.07.64-.17 1.32Z" />
    </svg>
  );
}
function IconTg() {
  return (
    <svg viewBox="0 0 24 24" className="size-4 fill-current" aria-hidden>
      <path d="M21.5 3.5 2.8 10.7c-1.3.5-1.3 1.2-.2 1.5l4.8 1.5 1.9 5.8c.2.7.4 1 1.1.6l2.7-2.5 5.3 3.9c1 .6 1.7.3 2-1l3.4-16c.4-1.5-.5-2.2-1.6-1.7Z" />
    </svg>
  );
}
function IconFb() {
  return (
    <svg viewBox="0 0 24 24" className="size-4 fill-current" aria-hidden>
      <path d="M14 9h3V6h-3c-2.2 0-4 1.8-4 4v2H8v3h2v7h3v-7h2.6l.4-3H13v-2c0-.6.4-1 1-1Z" />
    </svg>
  );
}

export function SiteFooter() {
  const { site, setSite } = usePublicSite();
  function share(kind: ShareKey) {
    const url = "https://kilode.ng";
    const text = "Kilode — Talk News. Real People.";
    if (kind === "x") window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, "_blank", "noopener");
    if (kind === "wa") window.open(`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`, "_blank", "noopener");
    if (kind === "tg") window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`, "_blank", "noopener");
    if (kind === "fb") window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, "_blank", "noopener");
    if (kind === "copy") void navigator.clipboard?.writeText(url);
    void pingShare({ data: { k: kind } })
      .then(setSite)
      .catch(() => undefined);
  }
  const n = site.shares ?? EMPTY.shares;
  const members = site.members || 0;
  const subs = site.subscribers || site.digest || 0;
  const joinHint =
    subs > 0
      ? members === 1
        ? `Join 1 subscriber · pick a username.`
        : `Join ${subs.toLocaleString("en-US")} subscribers · pick a username.`
      : members <= 0
        ? "Create a handle to post, chat, and save."
        : members === 1
          ? "1 member already here — pick a username and join."
          : `${members.toLocaleString("en-US")} members — pick a username and join.`;
  const stats: { key: string; label: string; value: number; live?: boolean }[] = [
    { key: "today", label: "Today", value: site.visitorsToday ?? 0, live: true },
    { key: "visitors", label: "Visitors", value: site.visitorsAll ?? 0 },
    { key: "joined", label: "Joined", value: site.members ?? 0 },
    { key: "subs", label: "Subscribers", value: subs },
  ];
  return (
    <footer className="site-foot mt-5 overflow-hidden rounded-2xl px-3 py-3.5 sm:px-3.5 sm:py-4">
      <div className="text-center">
        <p className="text-[9px] font-semibold tracking-[0.16em] text-lime-2 uppercase">Kilode</p>
        <h2 className="chrome-head mx-auto mt-0.5 max-w-[20rem] text-balance">Join Kilode.ng</h2>
        <p className="mt-1 text-[11px] leading-snug text-muted">Talk News. Real People. Password only — no email to sign up.</p>
        <p className="mt-0.5 text-[11px] leading-snug text-muted/90">{joinHint}</p>
      </div>

      <a
        href="/login?mode=up"
        className="btn-join mt-3 flex min-h-10 w-full items-center justify-center rounded-xl px-3 text-[13px] font-bold"
      >
        Create account
      </a>
      <p className="mt-1.5 text-center text-[11px] text-muted">
        Already here?{" "}
        <a href="/login?mode=in" className="font-semibold text-lime-2 underline-offset-2 hover:underline">
          Sign in
        </a>
      </p>

      <div className="foot-stats mt-3 grid grid-cols-4 overflow-hidden rounded-lg" aria-label="Site stats">
        {stats.map((s) => (
          <div key={s.key} className="foot-stat px-1 py-1.5 text-center">
            <div className="flex items-center justify-center gap-0.5">
              {s.live ? <span className="size-1 animate-pulse rounded-full bg-lime-2" /> : null}
              <span className="text-[13px] font-bold tabular-nums leading-none text-fg">{fmtCount(s.value)}</span>
            </div>
            <div className="mt-0.5 text-[8px] font-semibold tracking-[0.1em] text-muted uppercase">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="foot-section mt-3 border-t pt-2.5 text-center">
        <p className="text-[9px] font-semibold tracking-[0.14em] text-lime-2 uppercase">About Kilode</p>
        <p className="mx-auto mt-1 max-w-[18rem] px-2 text-center text-[11px] leading-snug break-words text-muted">{ABOUT_SHORT}</p>
        <a href="/terms#about" className="mt-1 inline-block text-[11px] font-semibold text-lime-2 underline-offset-2 hover:underline">
          Read the full about
        </a>
      </div>

      <div className="foot-section mt-3 border-t pt-2.5">
        <div className="mb-1.5 text-center text-[9px] font-semibold tracking-[0.14em] text-lime-2 uppercase">Share Kilode</div>
        <div className="grid grid-cols-5 gap-0.5">
          <ShareChip label="X" count={n.x} className="bg-black text-white ring-1 ring-white/25" onClick={() => share("x")}>
            <IconX />
          </ShareChip>
          <ShareChip label="WA" count={n.wa} className="bg-[#25D366] text-white" onClick={() => share("wa")}>
            <IconWa />
          </ShareChip>
          <ShareChip label="TG" count={n.tg} className="bg-[#229ED9] text-white" onClick={() => share("tg")}>
            <IconTg />
          </ShareChip>
          <ShareChip label="FB" count={n.fb} className="bg-[#1877F2] text-white" onClick={() => share("fb")}>
            <IconFb />
          </ShareChip>
          <ShareChip label="Share" count={n.copy} className="bg-lime-2 text-white" onClick={() => share("copy")}>
            <Share2 className="size-3" />
          </ShareChip>
        </div>
      </div>

      <div className="foot-section mt-2.5 space-y-2 border-t pt-2.5">
        <div className="foot-digest rounded-xl px-2.5 pt-2 pb-2">
          <div className="mb-1.5 text-center text-[9px] font-semibold tracking-[0.14em] text-lime-2 uppercase">Email updates</div>
          <DigestBox quiet defaultOpen />
        </div>
        <div className="menu-install overflow-hidden rounded-xl">
          <GetAppRow />
        </div>
      </div>

      <p className="mt-2.5 text-center text-[10px] leading-snug text-muted">
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
      <p className="mt-1 flex items-center justify-center gap-1 text-[10px] text-muted">
        <TelegramLink />
      </p>
    </footer>
  );
}

function ShareChip({
  label,
  count,
  className,
  onClick,
  children,
}: {
  label: string;
  count: number;
  className: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={`${label}${count ? `, ${fmtCount(count)} shares` : ""}`}
      onClick={onClick}
      className="foot-share flex flex-col items-center gap-0.5 rounded-lg px-0.5 py-1 transition hover:bg-white/5"
    >
      <span className={`grid size-8 place-items-center rounded-full shadow-[0_1px_0_rgba(0,0,0,0.22)] ${className}`}>{children}</span>
      <span className="text-[8px] font-semibold leading-none tracking-wide text-fg/90">{label}</span>
      <span className="text-[8px] tabular-nums text-muted">{fmtCount(count)}</span>
    </button>
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
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    const nav = window.navigator as Navigator & { standalone?: boolean };
    if (nav.standalone) return;
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
    <div className="pointer-events-none fixed bottom-[calc(3.6rem+env(safe-area-inset-bottom))] left-2 z-40 w-[min(300px,calc(100vw-5.5rem))] md:bottom-4">
      <div className="pointer-events-auto flex overflow-hidden rounded-2xl border border-line bg-panel shadow-[0_10px_24px_rgba(0,0,0,0.35)]">
        <GetAppRow />
        <button
          type="button"
          aria-label="Dismiss"
          className="grid w-11 shrink-0 place-items-center border-l border-line text-muted"
          onClick={() => {
            try {
              localStorage.setItem(GONE_KEY, "1");
            } catch {
              /* ignore */
            }
            setOn(false);
          }}
        >
          <X className="size-4" />
        </button>
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
