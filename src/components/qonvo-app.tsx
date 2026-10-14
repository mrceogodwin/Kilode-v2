import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { X, Volume2, VolumeX } from "lucide-react";
import { PublicSiteProvider } from "@/components/site-chrome";
import type { PublicSite } from "@/lib/site-server";
import { SocialFirst } from "@/components/social-first";
import { useQonvo } from "@/lib/use-qonvo";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { kilodeSound, setSounds, soundsEnabled } from "@/lib/sfx";

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

  useEffect(() => {
    setSfxOn(soundsEnabled());
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
          setMenuOpen(false);
          if (!signedIn) return goLogin("up");
          window.location.href = "/?open=notes";
        }}
        onSend={() => {
          setMenuOpen(false);
          if (!signedIn) return goLogin("in");
          window.location.href = "/?open=inbox";
        }}
        onCreate={() => {
          setMenuOpen(false);
          if (!signedIn) return goLogin("up");
          window.location.href = "/?open=create";
        }}
        onMe={() => {
          setMenuOpen(false);
          if (!signedIn) return goLogin("up");
          window.location.href = "/?open=me";
        }}
        onMenu={() => {
          kilodeSound("sheet");
          setMenuOpen((v) => !v);
        }}
        onOpenNews={(id) => {
          if (id) window.location.href = `/p/${id}`;
        }}
        onNeedAuth={() => goLogin("up")}
      />

      {menuOpen ? (
        <div className="app-drawer menu-drawer" style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex" }}>
          <aside
            className="menu-sheet flex h-full min-h-0 w-[min(360px,92vw)] flex-col overflow-hidden"
            style={{ background: "#fff", color: "#172033", borderRight: "1px solid #E7ECF2" }}
          >
            <div
              className="menu-head flex items-center justify-between gap-2"
              style={{ borderBottom: "1px solid #E7ECF2", padding: "12px 14px" }}
            >
              <strong style={{ fontSize: 14 }}>Menu</strong>
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setMenuOpen(false)}
                style={{ width: 36, height: 36, border: 0, background: "transparent", color: "#172033" }}
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain" style={{ padding: "8px 10px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  padding: "12px 14px",
                  margin: "4px 0 10px",
                  background: "#F7F9FC",
                  border: "1px solid #E7ECF2",
                  borderRadius: 12,
                }}
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600 }}>
                  {sfxOn ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
                  Sounds
                </span>
                <button
                  type="button"
                  onClick={toggleSfx}
                  aria-pressed={sfxOn}
                  style={{
                    border: 0,
                    borderRadius: 999,
                    padding: "6px 14px",
                    fontSize: 11,
                    fontWeight: 700,
                    background: sfxOn ? "#1877F2" : "#E7ECF2",
                    color: sfxOn ? "#fff" : "#64748B",
                  }}
                >
                  {sfxOn ? "On" : "Off"}
                </button>
              </div>

              <button type="button" style={rowStyle} onClick={() => { setMenuOpen(false); window.location.href = "/"; }}>
                Home
              </button>
              <button
                type="button"
                style={rowStyle}
                onClick={() => {
                  setMenuOpen(false);
                  if (!signedIn) return goLogin("up");
                  window.location.href = "/?open=me";
                }}
              >
                My Space
              </button>
              <button type="button" style={rowStyle} onClick={() => { setMenuOpen(false); window.location.href = "/?tab=cinema"; }}>
                Cinema
              </button>
              <button
                type="button"
                style={rowStyle}
                onClick={() => {
                  setMenuOpen(false);
                  window.location.href = signedIn ? "/?open=create" : "/login?mode=up";
                }}
              >
                Create
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
            </div>
          </aside>
          <button
            type="button"
            className="min-h-0 flex-1"
            style={{ background: "rgba(0,0,0,0.45)", border: 0 }}
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
          />
        </div>
      ) : null}
    </div>
  );
}
