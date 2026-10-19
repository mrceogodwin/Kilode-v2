import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Share2, X } from "lucide-react";
import { fmtCount, type Post } from "@/lib/qonvo-data";
import { DigestBox, TelegramLink } from "@/components/get-app";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { getPublicSite, pingShare, pingVisit, saveSiteFlags, DEFAULT_DESKS, type PublicSite, type ShareKey } from "@/lib/site-server";

const GONE_KEY = "kilode-install-toast";
const SID_KEY = "kilode-vid";
export const EMPTY_PUBLIC_SITE: PublicSite = {
  installToast: true,
  videosMenuVisible: true,
  photosOn: true,
  payOff: "",
  cryptoEnabled: true,
  paystackEnabled: true,
  flutterwaveEnabled: true,
  bachsEnabled: true,
  desks: {
    jobs: { ...DEFAULT_DESKS.jobs },
    market: { ...DEFAULT_DESKS.market },
    rent: { ...DEFAULT_DESKS.rent },
    events: { ...DEFAULT_DESKS.events },
    cinema: { ...DEFAULT_DESKS.cinema },
  },
  visitorsToday: 0,
  visitorsAll: 0,
  members: 0,
  digest: 0,
  subscribers: 0,
  shares: { x: 0, wa: 0, tg: 0, fb: 0, copy: 0 },
  takeVideoSeconds: 15,
  soundsOn: true,
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

function decodeBits(s: string) {
  let out = s;
  for (let i = 0; i < 2; i++) {
    out = out
      .replace(/&#(\d+);/g, (_, n) => {
        const c = Number(n);
        return c > 0 && c < 0x110000 ? String.fromCodePoint(c) : _;
      })
      .replace(/&/g, "&")
      .replace(/"/g, '"')
      .replace(/&#039;|'/g, "'");
  }
  return out;
}

export function TrendingTicker({ posts, onOpen, names = false }: { posts: Post[]; onOpen: (id: string) => void; names?: boolean }) {
  const items = useMemo(() => {
    const ranked = [...posts]
      .filter((p) => p.status !== "draft" && p.title)
      .sort((a, b) => (b.views ?? 0) - (a.views ?? 0) || b.ts - a.ts);
    if (!names) return ranked.slice(0, 12);
    const seen = new Set<string>();
    const out: Post[] = [];
    for (const p of ranked) {
      const key = shortName(p).toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(p);
      if (out.length >= 10) break;
    }
    return out;
  }, [posts, names]);
  const loop = items.length ? [...items, ...items] : [];
  if (!loop.length) return null;
  return (
    <div className="trend-ticker flex min-h-9 min-w-0 flex-1 items-center gap-2 overflow-hidden rounded-full px-1">
      <span className="home-trend-pill">
        <svg viewBox="0 0 16 16" className="size-3" aria-hidden>
          <path d="M3 11.5 7 6.2l2.2 2.1L13 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M9.2 4H13v3.6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        TRENDING
      </span>
      <div className="min-w-0 flex-1 overflow-hidden">
        <div className="ticker-track gap-0 px-0 text-[13px] leading-8">
          {loop.map((p, i) => (
            <button key={`${p.id}-${i}`} type="button" className="shrink-0 font-medium hover:text-lime-2" onClick={() => onOpen(p.id)}>
              {names ? shortName(p) : decodeBits(p.title)}
              {names ? <span className="mx-2 text-muted">•</span> : <span className="ml-1.5 font-normal text-muted">{fmtCount(p.views ?? 0)}</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function shortName(p: Post) {
  const tag = (p.tags || "")
    .split(/[,#]+/)
    .map((t) => t.trim())
    .find((t) => t.length > 2 && t.length < 22);
  if (tag) return tag;
  return decodeBits(p.title).split(/\s+/).slice(0, 2).join(" ");
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
  const session = useCurrentUserState();
  const signedIn = Boolean(session.user);
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
    <footer className="site-foot mt-5 overflow-hidden rounded-2xl px-3.5 py-4 sm:px-4">
      {signedIn ? null : (
        <div className="text-center">
          <img src="/kilode-official.png" alt="Kilode" className="join-logo join-logo-dark mx-auto h-14 w-auto" />
          <img src="/kilode-logo-ivory.png" alt="" className="join-logo join-logo-ivory mx-auto h-14 w-auto" />
          <p className="mt-2 text-[10px] font-semibold tracking-[0.22em] text-white/55 uppercase">Talk news. Real people.</p>
          <p className="mx-auto mt-2 max-w-[20rem] text-[12px] leading-snug text-white/75">
            Password only. No email to sign up. {joinHint}
          </p>
          <a
            href="/login?mode=up"
            className="btn-yellow mt-3 flex min-h-11 w-full items-center justify-center rounded-full px-3 text-[14px] font-extrabold text-black"
          >
            Create account
          </a>
          <p className="mt-1.5 text-[11px] text-muted">
            Already here?{" "}
            <a href="/login?mode=in" className="font-semibold text-fg underline-offset-2 hover:underline">
              Sign in
            </a>
          </p>
        </div>
      )}

      <img src="/kilode-word.png?v=3" alt="Kilode" className="foot-mark mx-auto mt-1 h-8 w-auto" />

      <div className="foot-digest mt-3 rounded-xl px-2.5 pt-2 pb-2">
        <div className="mb-1.5 text-center text-[9px] font-semibold tracking-[0.14em] text-muted uppercase">Subscribe</div>
        <DigestBox quiet defaultOpen={false} />
      </div>

      <div className="mt-3 border-t border-white/10 pt-2.5">
        <div className="mb-1.5 text-center text-[9px] font-semibold tracking-[0.14em] text-muted uppercase">Share</div>
        <div className="grid grid-cols-5 gap-0.5">
          <ShareChip label="X" count={n.x} onClick={() => share("x")}>
            <IconX />
          </ShareChip>
          <ShareChip label="WA" count={n.wa} onClick={() => share("wa")}>
            <IconWa />
          </ShareChip>
          <ShareChip label="TG" count={n.tg} onClick={() => share("tg")}>
            <IconTg />
          </ShareChip>
          <ShareChip label="FB" count={n.fb} onClick={() => share("fb")}>
            <IconFb />
          </ShareChip>
          <ShareChip label="Share" count={n.copy} onClick={() => share("copy")}>
            <Share2 className="size-3.5" />
          </ShareChip>
        </div>
      </div>

      <a href="/install" className="foot-install">
        <span>Install Kilode</span>
        <em>Add it to your home screen</em>
      </a>

      <div className="foot-stats mt-3 grid grid-cols-4 overflow-hidden rounded-xl" aria-label="Site stats">
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

      <p className="mt-2.5 text-center text-[10px] leading-snug text-muted">
        <a href="/terms" className="underline">
          Terms
        </a>
        {" · "}
        <a href="/privacy" className="underline">
          Privacy
        </a>
        {" · "}
        <a href="/rules" className="underline">
          Rules
        </a>
        {" · "}
        <a href="/safety" className="underline">
          Safety
        </a>
        {" · "}
        <a href="/how-to" className="underline">
          How to use
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
  onClick,
  children,
}: {
  label: string;
  count: number;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={`${label}${count ? `, ${fmtCount(count)} shares` : ""}`}
      onClick={onClick}
      className="foot-share flex flex-col items-center gap-0.5 rounded-lg px-0.5 py-1"
    >
      <span className="foot-3d kilode-share grid size-9 place-items-center rounded-[10px]">{children}</span>
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
