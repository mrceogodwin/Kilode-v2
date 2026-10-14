import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { X, Volume2, VolumeX } from "lucide-react";
import { PublicSiteProvider } from "@/components/site-chrome";
import type { PublicSite } from "@/lib/site-server";
import { SocialFirst } from "@/components/social-first";
import { useQonvo } from "@/lib/use-qonvo";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { kilodeSound, setSounds, soundsEnabled } from "@/lib/sfx";
import { STAFF_PATH } from "@/lib/staff-path";

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
  const [isStaff, setIsStaff] = useState(false);

  useEffect(() => {
    setSfxOn(soundsEnabled());
  }, []);

  useEffect(() => {
    if (!signedIn) { setIsStaff(false); return; }
    try {
      const flag = localStorage.getItem("kilode-staff-hint");
      setIsStaff(flag === "1");
    } catch { /* ignore */ }
  }, [signedIn]);

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

  return (
    <div
      className="kilode-shell relative flex min-h-0 flex-col overflow-hidden bg-bg text-fg"
      data-sf="1"
      data-home="1"
      data-paper="1"
      style={{ height: "100dvh", maxHeight: "100dvh" }}
    >
      <SocialFirst
        me={store.handle || ""}
        face={store.face}
        authed={store.authed || signedIn}
        news={store.posts}
        onLikes={() => {
          close();
          if (!signedIn) return goLogin("up");
          window.location.href = "/?open=notes";
        }}
        onSend={() => {
          close();
          if (!signedIn) return goLogin("in");
          window.location.href = "/?open=inbox";
        }}
        onCreate={() => {
          close();
          if (!signedIn) return goLogin("up");
          window.location.href = "/?open=create";
        }}
        onMe={() => {
          close();
          if (!signedIn) return goLogin("up");
          window.location.href = "/?open=me";
        }}
        onMenu={() => setMenuOpen(true)}
        onOpenNews={(id) => {
          window.location.href = id ? `/?open=article&id=${encodeURIComponent(id)}` : "/?open=news";
        }}
        onNeedAuth={() => goLogin("up")}
      />

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

            <button type="button" style={rowStyle} onClick={() => { close(); window.location.href = "/"; }}>
              Home feed
            </button>
            <button type="button" style={rowStyle} onClick={() => { close(); window.location.href = "/?open=jobs"; }}>
              Jobs
            </button>
            <button type="button" style={rowStyle} onClick={() => { close(); window.location.href = "/?open=market"; }}>
              Market
            </button>
            <button type="button" style={rowStyle} onClick={() => { close(); window.location.href = "/?open=music"; }}>
              Music
            </button>
            <button type="button" style={rowStyle} onClick={() => { close(); window.location.href = "/?open=cinema"; }}>
              Cinema
            </button>
            <button type="button" style={rowStyle} onClick={() => { close(); window.location.href = "/?open=communities"; }}>
              Communities
            </button>
            {isStaff || signedIn ? (
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
