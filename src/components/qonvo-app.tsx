import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { X, Volume2, VolumeX, ChevronLeft } from "lucide-react";
import { PublicSiteProvider } from "@/components/site-chrome";
import type { PublicSite } from "@/lib/site-server";
import { SocialFirst } from "@/components/social-first";
import { QonvoScreen } from "@/components/qonvo-screens";
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
};

function readOpen(): MenuId | null {
  if (typeof window === "undefined") return null;
  try {
    const u = new URL(window.location.href);
    const raw = (u.searchParams.get("open") || "").toLowerCase().trim();
    if (!raw) return null;
    return OPEN_MAP[raw] || null;
  } catch {
    return null;
  }
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

  useEffect(() => {
    setSfxOn(soundsEnabled());
    setScreen(readOpen());
    const onPop = () => setScreen(readOpen());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const go = useCallback((id: MenuId | null) => {
    setScreen(id);
    try {
      const u = new URL(window.location.href);
      if (!id) {
        u.searchParams.delete("open");
      } else {
        const key = Object.entries(OPEN_MAP).find(([, v]) => v === id)?.[0] || id;
        u.searchParams.set("open", key);
      }
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

  const rowStyle: CSSProperties = {
    display: "flex",
    width: "100%",
    alignItems: "center",
    gap: 10,
    padding: "12px 14px",
    margin: "4px 0",
    border: "1px solid #E7ECF2",
    borderRadius: 12,
    background: "#fff",
    color: "#172033",
    fontWeight: 600,
    fontSize: 13,
  };

  const openPane = (key: string) => {
    close();
    const id = OPEN_MAP[key];
    if (!id) return;
    if (!signedIn && ["dashboard", "create", "inbox", "notifications", "profile", "settings"].includes(id)) {
      return goLogin("up");
    }
    go(id);
  };

  return (
    <div
      className="kilode-shell relative flex min-h-0 flex-col overflow-hidden bg-bg text-fg"
      data-sf="1"
      data-home={screen ? "0" : "1"}
      data-paper="1"
      style={{ height: "100dvh", maxHeight: "100dvh" }}
    >
      {screen ? (
        <div className="flex min-h-0 flex-1 flex-col" style={{ background: "#fff" }}>
          <header
            style={{
              background: "#1877F2",
              color: "#fff",
              padding: "10px 12px",
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexShrink: 0,
            }}
          >
            <button
              type="button"
              aria-label="Back"
              onClick={() => go(null)}
              style={{ background: "none", border: 0, color: "#fff", padding: 4, display: "flex", alignItems: "center" }}
            >
              <ChevronLeft size={22} />
            </button>
            <strong style={{ flex: 1, fontSize: 16, fontWeight: 700, textTransform: "capitalize" }}>
              {screen === "dashboard" ? "My Space" : screen === "tv" ? "Cinema" : screen}
            </strong>
            <button type="button" onClick={() => setMenuOpen(true)} style={{ background: "none", border: 0, color: "#fff", fontSize: 13, fontWeight: 600 }}>
              Menu
            </button>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <QonvoScreen
              id={screen}
              store={store}
              onHome={() => go(null)}
              onForum={() => go("forum")}
            />
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
          onMenu={() => setMenuOpen(true)}
          onOpenNews={(id) => {
            if (id) window.location.href = `/p/${encodeURIComponent(id)}`;
            else openPane("news");
          }}
          onNeedAuth={() => goLogin("up")}
        />
      )}

      {menuOpen ? (
        <div className="fixed inset-0 z-[80] flex" style={{ background: "rgba(0,0,0,0.45)" }}>
          <aside
            className="flex h-full w-[min(320px,88vw)] flex-col overflow-y-auto bg-white p-4 shadow-xl"
            style={{ borderRight: "1px solid #E7ECF2" }}
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-bold text-[#172033]">Menu</span>
              <button type="button" aria-label="Close" onClick={close} style={{ background: "none", border: 0, padding: 8 }}>
                <X size={18} color="#172033" />
              </button>
            </div>

            <button type="button" style={rowStyle} onClick={() => { close(); go(null); }}>
              Home feed
            </button>
            <button type="button" style={rowStyle} onClick={() => openPane("jobs")}>
              Jobs
            </button>
            <button type="button" style={rowStyle} onClick={() => openPane("market")}>
              Market
            </button>
            <button type="button" style={rowStyle} onClick={() => openPane("cinema")}>
              Cinema
            </button>
            <button type="button" style={rowStyle} onClick={() => openPane("communities")}>
              Communities
            </button>
            <button type="button" style={rowStyle} onClick={() => openPane("me")}>
              My Space
            </button>
            <button type="button" style={rowStyle} onClick={() => openPane("create")}>
              Create
            </button>
            <button type="button" style={rowStyle} onClick={() => openPane("ads")}>
              Ads
            </button>
            {signedIn ? (
              <button type="button" style={rowStyle} onClick={() => { close(); window.location.href = STAFF_PATH; }}>
                Staff desk
              </button>
            ) : null}

            <button type="button" style={rowStyle} onClick={toggleSfx}>
              {sfxOn ? <Volume2 size={16} /> : <VolumeX size={16} />}
              <span>{sfxOn ? "Sounds On" : "Sounds Off"}</span>
            </button>

            {!signedIn ? (
              <button
                type="button"
                style={{ ...rowStyle, border: 0, background: "#1877F2", color: "#fff", fontWeight: 700, marginTop: 8 }}
                onClick={() => goLogin("up")}
              >
                Join Kilode
              </button>
            ) : null}
          </aside>
          <button
            type="button"
            className="min-h-0 flex-1"
            style={{ background: "rgba(0,0,0,0.45)", border: 0 }}
            aria-label="Close menu"
            onClick={close}
          />
        </div>
      ) : null}
    </div>
  );
}
