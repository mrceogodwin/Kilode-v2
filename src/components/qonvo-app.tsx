import { useCallback, useEffect, useState, type CSSProperties, type ReactNode } from "react";
import {
  X, Volume2, VolumeX, ChevronLeft, Home, Briefcase, Store, Clapperboard, Users, User,
  Plus, Megaphone, Search, Bell, Inbox, Settings, HelpCircle, Hash, Tv, Building2,
  Bookmark, Music, Calendar, Shield, Info, CircleDollarSign,
} from "lucide-react";
import { PublicSiteProvider } from "@/components/site-chrome";
import type { PublicSite } from "@/lib/site-server";
import { SocialFirst } from "@/components/social-first";
import { QonvoScreen } from "@/components/qonvo-screens";
import { CinemaPane } from "@/components/cinema-pane";
import { useQonvo } from "@/lib/use-qonvo";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { kilodeSound, setSounds, soundsEnabled } from "@/lib/sfx";
import { STAFF_PATH } from "@/lib/staff-path";
import type { MenuId } from "@/lib/qonvo-data";

const OPEN_MAP: Record<string, MenuId> = {
  jobs: "jobs",
  market: "market",
  rent: "rent",
  me: "dashboard",
  dashboard: "dashboard",
  create: "create",
  cinema: "tv",
  music: "tv",
  communities: "community",
  community: "community",
  notes: "notifications",
  notifications: "notifications",
  inbox: "inbox",
  search: "search",
  ads: "ads",
  spaces: "spaces",
  trending: "trending",
  profile: "profile",
  settings: "settings",
  help: "help",
  how: "how",
  pricing: "pricing",
  admin: "admin",
  article: "forum",
  news: "forum",
  forum: "forum",
  bookmarks: "bookmarks",
  teams: "teams",
  badges: "badges",
  leaderboard: "leaderboard",
  contact: "contact",
  tv: "tv",
};

function readOpenKey(): string {
  if (typeof window === "undefined") return "";
  try {
    return (new URL(window.location.href).searchParams.get("open") || "").toLowerCase().trim();
  } catch {
    return "";
  }
}

function readOpen(): MenuId | null {
  const raw = readOpenKey();
  return raw ? OPEN_MAP[raw] || null : null;
}

function screenTitle(id: MenuId, openKey: string) {
  if (openKey === "cinema") return "Cinema";
  if (openKey === "music") return "Music";
  if (openKey === "tv") return "Kilode TV";
  const map: Partial<Record<MenuId, string>> = {
    dashboard: "My Space",
    tv: "Cinema & TV",
    community: "Communities",
    jobs: "Jobs",
    market: "Marketplace",
    rent: "Rent",
    create: "Create",
    ads: "Ads",
    notifications: "Notifications",
    inbox: "Messages",
    search: "Search",
    profile: "Edit profile",
    settings: "Settings",
    help: "Help",
    how: "How Kilode works",
    pricing: "Pricing",
    forum: "Feeds",
    trending: "Trending",
    spaces: "Spaces",
    bookmarks: "Bookmarks",
    teams: "Teams",
    badges: "Badges",
    leaderboard: "Leaderboard",
    contact: "Contact",
    admin: "Admin",
  };
  return map[id] || id;
}

export function QonvoApp({ initialSite }: { initialSite?: PublicSite } = {}) {
  return (
    <PublicSiteProvider initial={initialSite}>
      <Shell />
    </PublicSiteProvider>
  );
}

function Shell() {
  const store = useQonvo();
  const session = useCurrentUserState();
  const signedIn = Boolean(session.user);
  const [menuOpen, setMenuOpen] = useState(false);
  const [sfxOn, setSfxOn] = useState(true);
  const [screen, setScreen] = useState<MenuId | null>(null);
  const [openKey, setOpenKey] = useState("");

  useEffect(() => {
    setSfxOn(soundsEnabled());
    setScreen(readOpen());
    setOpenKey(readOpenKey());
    const onPop = () => {
      setScreen(readOpen());
      setOpenKey(readOpenKey());
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const go = useCallback((id: MenuId | null, key?: string) => {
    setScreen(id);
    const k = key || (id ? Object.entries(OPEN_MAP).find(([, v]) => v === id)?.[0] || id : "");
    setOpenKey(id ? k : "");
    try {
      const u = new URL(window.location.href);
      if (!id) u.searchParams.delete("open");
      else u.searchParams.set("open", k);
      window.history.pushState({}, "", u.toString());
    } catch { /* ignore */ }
  }, []);

  const toggleSfx = useCallback(() => {
    const next = !soundsEnabled();
    setSounds(next);
    setSfxOn(next);
    if (next) kilodeSound("tick");
  }, []);

  const goLogin = (mode: "in" | "up" = "up") => {
    window.location.href = mode === "in" ? "/login?mode=in" : "/login?mode=up";
  };

  const close = () => setMenuOpen(false);
  const needAuth = ["dashboard", "create", "inbox", "notifications", "profile", "settings", "bookmarks"];

  const openPane = (key: string) => {
    close();
    const id = OPEN_MAP[key];
    if (!id) return;
    if (!signedIn && needAuth.includes(id)) return goLogin("up");
    go(id, key);
  };

  const row = (icon: ReactNode, label: string, onClick: () => void): ReactNode => (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "flex",
        width: "100%",
        alignItems: "center",
        gap: 12,
        padding: "11px 12px",
        margin: "3px 0",
        border: "1px solid #E7ECF2",
        borderRadius: 12,
        background: "#fff",
        color: "#172033",
        fontWeight: 600,
        fontSize: 13,
        textAlign: "left",
      }}
    >
      <span style={{ width: 28, height: 28, borderRadius: 8, background: "#F7F9FC", display: "grid", placeItems: "center", color: "#1877F2", flexShrink: 0 }}>
        {icon}
      </span>
      <span style={{ flex: 1 }}>{label}</span>
    </button>
  );

  const section = (title: string) => (
    <p style={{ margin: "14px 4px 6px", fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", color: "#94A3B8", textTransform: "uppercase" }}>
      {title}
    </p>
  );

  const immersive = openKey === "cinema";

  return (
    <div
      className="kilode-shell relative flex min-h-0 flex-col overflow-hidden bg-bg text-fg"
      data-sf="1"
      data-home={screen ? "0" : "1"}
      data-paper="1"
      style={{ height: "100dvh", maxHeight: "100dvh" }}
    >
      {screen ? (
        <div className="flex min-h-0 flex-1 flex-col" style={{ background: immersive ? "#0B0D12" : "#fff" }}>
          <header
            style={{
              background: immersive ? "#0B0D12" : "#1877F2",
              color: "#fff",
              padding: "10px 12px",
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexShrink: 0,
              borderBottom: immersive ? "1px solid rgba(255,255,255,0.08)" : "none",
            }}
          >
            <button type="button" aria-label="Back" onClick={() => go(null)} style={{ background: "none", border: 0, color: "#fff", padding: 4, display: "flex" }}>
              <ChevronLeft size={22} />
            </button>
            <strong style={{ flex: 1, fontSize: 16, fontWeight: 700 }}>{screenTitle(screen, openKey)}</strong>
            <button type="button" onClick={() => setMenuOpen(true)} style={{ background: "none", border: 0, color: "#fff", fontSize: 13, fontWeight: 600 }}>
              Menu
            </button>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {immersive ? (
              <CinemaPane />
            ) : (
              <QonvoScreen id={screen} store={store} onHome={() => go(null)} onForum={() => go("forum")} />
            )}
          </div>
        </div>
      ) : (
        <SocialFirst
          me={store.handle || ""}
          face={store.face}
          authed={store.authed || signedIn}
          news={store.posts}
          onLikes={() => openPane("notes")}
          onSend={() => openPane("inbox")}
          onCreate={() => openPane("create")}
          onMe={() => openPane("me")}
          onMenu={() => { kilodeSound("sheet"); setMenuOpen(true); }}
          onOpenNews={(id) => {
            if (id) window.location.href = `/p/${encodeURIComponent(id)}`;
            else openPane("news");
          }}
          onOpen={(key) => openPane(key)}
          onNeedAuth={() => goLogin("up")}
        />
      )}

      {menuOpen ? (
        <div className="fixed inset-0 z-[80] flex" style={{ background: "rgba(0,0,0,0.45)" }}>
          <aside className="flex h-full w-[min(340px,92vw)] flex-col overflow-hidden bg-white shadow-xl" style={{ borderRight: "1px solid #E7ECF2" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", borderBottom: "1px solid #E7ECF2" }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: "#172033" }}>Kilode</div>
                <div style={{ fontSize: 11, color: "#64748B" }}>{signedIn ? `@${store.handle || "you"}` : "Guest"}</div>
              </div>
              <button type="button" aria-label="Close" onClick={close} style={{ background: "none", border: 0, padding: 8 }}>
                <X size={18} color="#172033" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto" style={{ padding: "8px 10px 24px" }}>
              {section("Discover")}
              {row(<Home size={15} />, "Home feed", () => { close(); go(null); })}
              {row(<Hash size={15} />, "Trending", () => openPane("trending"))}
              {row(<Clapperboard size={15} />, "Cinema", () => openPane("cinema"))}
              {row(<Music size={15} />, "Music", () => openPane("music"))}
              {row(<Users size={15} />, "Communities", () => openPane("communities"))}
              {row(<Tv size={15} />, "Kilode TV", () => openPane("tv"))}

              {section("Opportunity")}
              {row(<Briefcase size={15} />, "Jobs", () => openPane("jobs"))}
              {row(<Store size={15} />, "Marketplace", () => openPane("market"))}
              {row(<Building2 size={15} />, "Rent / Spaces", () => openPane("rent"))}
              {row(<Megaphone size={15} />, "Advertise", () => openPane("ads"))}
              {row(<Calendar size={15} />, "Spaces & events", () => openPane("spaces"))}

              {section("You")}
              {row(<User size={15} />, "My Space", () => openPane("me"))}
              {row(<Plus size={15} />, "Create", () => openPane("create"))}
              {row(<Bell size={15} />, "Notifications", () => openPane("notes"))}
              {row(<Inbox size={15} />, "Messages", () => openPane("inbox"))}
              {row(<Bookmark size={15} />, "Bookmarks", () => openPane("bookmarks"))}
              {row(<Search size={15} />, "Search", () => openPane("search"))}

              {section("More")}
              {row(<CircleDollarSign size={15} />, "Pricing", () => openPane("pricing"))}
              {row(<Info size={15} />, "How Kilode works", () => openPane("how"))}
              {row(<HelpCircle size={15} />, "Help & FAQ", () => openPane("help"))}
              {row(<Settings size={15} />, "Settings", () => openPane("settings"))}
              {signedIn ? row(<Shield size={15} />, "Staff desk", () => { close(); window.location.href = STAFF_PATH; }) : null}

              <button
                type="button"
                onClick={toggleSfx}
                style={{
                  display: "flex",
                  width: "100%",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  padding: "12px 14px",
                  margin: "12px 0 4px",
                  border: "1px solid #E7ECF2",
                  borderRadius: 12,
                  background: "#F7F9FC",
                  color: "#172033",
                  fontWeight: 600,
                  fontSize: 13,
                }}
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  {sfxOn ? <Volume2 size={16} /> : <VolumeX size={16} />}
                  Sounds
                </span>
                <span style={{ borderRadius: 999, padding: "4px 12px", fontSize: 11, fontWeight: 700, background: sfxOn ? "#1877F2" : "#E7ECF2", color: sfxOn ? "#fff" : "#64748B" }}>
                  {sfxOn ? "On" : "Off"}
                </span>
              </button>

              {!signedIn ? (
                <button type="button" onClick={() => goLogin("up")} style={{ display: "block", width: "100%", marginTop: 10, padding: "12px 14px", border: 0, borderRadius: 12, background: "#1877F2", color: "#fff", fontWeight: 700, fontSize: 14 }}>
                  Join Kilode
                </button>
              ) : null}
            </div>
          </aside>
          <button type="button" className="min-h-0 flex-1" style={{ background: "transparent", border: 0 }} aria-label="Close menu" onClick={close} />
        </div>
      ) : null}
    </div>
  );
}
