import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";
import {
  Briefcase, Clapperboard, Eye, Hash, Home, Menu, MessageCircle, Music, Plus,
  Search, Share2, Store, ThumbsUp, Users, Megaphone, Building2, Calendar,
} from "lucide-react";
import { avatarUrl, timeAgo } from "@/lib/qonvo-data";
import { likeTake, listTakes, saveTake, voteTake, type FellowRow, type TakeRow } from "@/lib/takes-server";
import { SitePulsePanel } from "@/components/pulse-panel";
import { PushStrip } from "@/components/artist-push";

type News = { id: string; title: string; image?: string; category?: string; ts: number; views?: number; status?: string };

const RINGS = ["#e25b4a", "#f0b429", "#7a4db8", "#1f8f4e", "#3a6ea5", "#111111"];

function ringOf(name: string) {
  let n = 0;
  for (const c of name) n += c.charCodeAt(0);
  return RINGS[n % RINGS.length];
}

function shotOf(meta: TakeRow["meta"]) {
  const img = meta?.image;
  return typeof img === "string" && (img.startsWith("http") || img.startsWith("data:image/")) ? img : "";
}

function roleLabel(role: string) {
  const raw = (role || "member").replace(/_/g, " ").replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "").trim();
  if (!raw) return "Member";
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function heatOf(t: TakeRow) {
  return (t.likes || 0) * 3 + (t.reposts || 0) * 4 + (t.comments || 0) * 2 + (t.fact || 0) + (t.cap || 0);
}

function takeUrl(id: string) {
  return `${window.location.origin}/?tab=feeds&take=${encodeURIComponent(id)}`;
}

function asTakes(v: unknown): TakeRow[] {
  if (Array.isArray(v)) return v as TakeRow[];
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    if (Array.isArray(o.takes)) return o.takes as TakeRow[];
    if (Array.isArray(o.items)) return o.items as TakeRow[];
  }
  return [];
}

function readFab() {
  try {
    return localStorage.getItem("kilode-fab") !== "0";
  } catch {
    return true;
  }
}

const HUBS = [
  { key: "cinema", label: "Cinema", sub: "Watch & vote", icon: Clapperboard, color: "#7a4db8" },
  { key: "jobs", label: "Jobs", sub: "Hire · Apply", icon: Briefcase, color: "#1f8f4e" },
  { key: "market", label: "Market", sub: "Shop local", icon: Store, color: "#e25b4a" },
  { key: "music", label: "Music", sub: "Artists live", icon: Music, color: "#f0b429" },
  { key: "communities", label: "Rooms", sub: "Chat live", icon: Users, color: "#3a6ea5" },
  { key: "ads", label: "Ads", sub: "Promote", icon: Megaphone, color: "#1877F2" },
  { key: "rent", label: "Rent", sub: "Spaces", icon: Building2, color: "#0ea5e9" },
  { key: "spaces", label: "Events", sub: "Happenings", icon: Calendar, color: "#db2777" },
] as const;

export function SocialFirst({
  me,
  face,
  authed,
  news,
  onLikes,
  onSend,
  onCreate,
  onMe,
  onMenu,
  onOpenNews,
  onOpen,
  onNeedAuth,
}: {
  me: string;
  face?: string;
  authed: boolean;
  news?: News[];
  onLikes: () => void;
  onSend: () => void;
  onCreate: () => void;
  onMe: () => void;
  onMenu: () => void;
  onOpenNews: (id?: string) => void;
  onOpen?: (key: string) => void;
  onNeedAuth: () => void;
}) {
  const [lane, setLane] = useState<"feed" | "media">("feed");
  const [find, setFind] = useState(false);
  const [q, setQ] = useState("");
  const [takes, setTakes] = useState<TakeRow[]>([]);
  const [people, setPeople] = useState<FellowRow[]>([]);
  const [cut, setCut] = useState("trending");
  const [voted, setVoted] = useState<Record<string, "" | "fact" | "cap">>({});
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const [note, setNote] = useState("");
  const [chromeHidden, setChromeHidden] = useState(false);
  const [fabOn, setFabOn] = useState(true);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const lastY = useRef(0);

  useEffect(() => {
    setFabOn(readFab());
    const onFab = (ev: Event) => {
      const d = (ev as CustomEvent).detail;
      if (d && typeof d.on === "boolean") setFabOn(d.on);
      else setFabOn(readFab());
    };
    const onLane = (ev: Event) => {
      const d = (ev as CustomEvent).detail;
      if (d?.lane === "media") setLane("media");
      if (d?.lane === "feed") setLane("feed");
    };
    window.addEventListener("kilode:fab", onFab as EventListener);
    window.addEventListener("kilode:lane", onLane as EventListener);
    return () => {
      window.removeEventListener("kilode:fab", onFab as EventListener);
      window.removeEventListener("kilode:lane", onLane as EventListener);
    };
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const raw = await listTakes({ data: {} } as any).catch(() => listTakes(undefined as any));
        if (!alive) return;
        setTakes(asTakes(raw));
        if (raw && typeof raw === "object" && Array.isArray((raw as any).fellows)) {
          setPeople((raw as any).fellows);
        }
      } catch {
        if (alive) setNote("Could not load feed");
      }
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const y = el.scrollTop;
      const dy = y - lastY.current;
      if (y < 28) setChromeHidden(false);
      else if (dy > 6) setChromeHidden(true);
      else if (dy < -6) setChromeHidden(false);
      lastY.current = y;
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [lane]);

  const refresh = async () => {
    try {
      const raw = await listTakes({ data: {} } as any).catch(() => listTakes(undefined as any));
      setTakes(asTakes(raw));
    } catch { /* ignore */ }
  };

  const onPost = async (e: FormEvent) => {
    e.preventDefault();
    if (!authed) return onNeedAuth();
    if (!draft.trim() || posting) return;
    setPosting(true);
    try {
      await saveTake({ data: { body: draft.trim() } } as any);
      setDraft("");
      await refresh();
    } catch {
      setNote("Post failed");
    } finally {
      setPosting(false);
    }
  };

  const doVote = async (id: string, kind: "fact" | "cap") => {
    if (!authed) return onNeedAuth();
    setVoted((v) => ({ ...v, [id]: kind }));
    try { await voteTake({ data: { id, kind } } as any); } catch { /* ignore */ }
  };

  const doLike = async (id: string) => {
    if (!authed) return onNeedAuth();
    try { await likeTake({ data: { id } } as any); await refresh(); } catch { /* ignore */ }
  };

  const filtered = (Array.isArray(takes) ? takes : []).filter((t) => {
    if (!q.trim()) return true;
    return `${t.handle || ""} ${t.body || ""}`.toLowerCase().includes(q.toLowerCase());
  });

  const trending = [...(Array.isArray(takes) ? takes : [])].sort((a, b) => heatOf(b) - heatOf(a)).slice(0, 8);
  const tickText = trending.map((t) => (t.body || "").slice(0, 48)).filter(Boolean).join("  ·  ") || "Talk Nigeria. Live.";
  const know = people.filter((p) => p.handle && p.handle.toLowerCase() !== (me || "").toLowerCase()).slice(0, 8);

  const open = (key: string) => { if (onOpen) onOpen(key); };

  const create = () => {
    if (!authed) return onNeedAuth();
    onCreate();
  };

  const dockBtn: CSSProperties = {
    background: "none",
    border: 0,
    color: "#fff",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 2,
    fontSize: 10,
    flex: 1,
    padding: "4px 0",
    fontWeight: 600,
  };

  return (
    <div className="sf-root" data-sf="1" style={{ height: "100%", display: "flex", flexDirection: "column", background: "#fff", minHeight: 0, position: "relative" }}>
      <header
        className="sf-top"
        style={{
          background: "#1877F2",
          color: "#fff",
          padding: "10px 12px",
          display: "flex",
          alignItems: "center",
          gap: 6,
          flexShrink: 0,
          transform: chromeHidden ? "translateY(-110%)" : "translateY(0)",
          transition: "transform 0.22s ease",
          position: chromeHidden ? "absolute" : "relative",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 35,
        }}
      >
        <button type="button" onClick={onMenu} aria-label="Menu" style={{ background: "none", border: 0, color: "#fff", padding: 4 }}>
          <Menu size={20} />
        </button>
        <strong style={{ flex: 1, fontSize: 18, fontWeight: 800 }}>Kilode!</strong>
        <button type="button" aria-label="Search" onClick={() => setFind((v) => !v)} style={{ background: "none", border: 0, color: "#fff", padding: 6 }}>
          <Search size={18} />
        </button>
        <button type="button" aria-label="Forum chat" onClick={() => open("communities")} style={{ background: "none", border: 0, color: "#fff", padding: 6 }}>
          <Hash size={18} />
        </button>
        <button type="button" aria-label="Messages" onClick={onSend} style={{ background: "none", border: 0, color: "#fff", padding: 6 }}>
          <MessageCircle size={18} />
        </button>
      </header>

      {find && !chromeHidden ? (
        <div className="sf-find" style={{ padding: "8px 12px", borderBottom: "1px solid #E7ECF2", flexShrink: 0 }}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search takes…" autoFocus style={{ width: "100%", border: "1px solid #E7ECF2", borderRadius: 999, padding: "10px 14px", fontSize: 14 }} />
        </div>
      ) : null}

      <div ref={scrollRef} style={{ flex: 1, overflow: "auto", minHeight: 0, paddingTop: chromeHidden ? 8 : 0, paddingBottom: chromeHidden ? 24 : 8 }}>
        {lane === "feed" ? (
          <>
            <div className="sf-tick" aria-label="Trending">
              <span className="sf-tick-label">TRENDING</span>
              <div className="sf-tick-track"><div className="sf-tick-marquee">{tickText} · {tickText}</div></div>
            </div>

            <form onSubmit={onPost} style={{ padding: 12, display: "flex", gap: 8, alignItems: "center", borderBottom: "1px solid #F1F5F9" }}>
              <img src={avatarUrl(me || "guest", face)} alt="" width={36} height={36} style={{ borderRadius: "50%" }} />
              <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="What's happening?" style={{ flex: 1, border: "1px solid #E7ECF2", borderRadius: 999, padding: "10px 14px", fontSize: 14 }} />
              <button type="submit" disabled={posting || !draft.trim()} style={{ background: "#1877F2", color: "#fff", border: 0, borderRadius: 999, padding: "8px 14px", fontWeight: 700, fontSize: 13 }}>Post</button>
            </form>

            <PushStrip />

            {know.length > 0 ? (
              <section style={{ margin: "10px 12px", padding: 12, background: "#fff", border: "1px solid #E7ECF2", borderRadius: 16 }}>
                <b style={{ fontSize: 13, color: "#172033" }}>People you may know</b>
                <div style={{ display: "flex", gap: 10, overflowX: "auto", marginTop: 10, paddingBottom: 4 }}>
                  {know.map((p) => (
                    <div key={p.id || p.handle} style={{ flex: "0 0 110px", textAlign: "center" }}>
                      <img src={p.photo || avatarUrl(p.handle)} alt="" width={56} height={56} style={{ borderRadius: "50%", objectFit: "cover" }} />
                      <div style={{ fontSize: 12, fontWeight: 700, marginTop: 6 }}>{(p.name || p.handle).slice(0, 12)}</div>
                      <div style={{ fontSize: 10, color: "#64748B" }}>{roleLabel(p.role)}</div>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {filtered.map((t) => {
              const img = shotOf(t.meta);
              return (
                <article key={t.id} style={{ padding: "14px 12px", borderBottom: "1px solid #F1F5F9" }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <img src={avatarUrl(t.handle || "u", (t as any).face)} alt="" width={40} height={40} style={{ borderRadius: "50%", border: `2px solid ${ringOf(t.handle || "u")}` }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{t.handle || "anon"}</div>
                      <div style={{ fontSize: 12, color: "#64748B" }}>{roleLabel(t.role || "member")}</div>
                    </div>
                    <span style={{ fontSize: 11, color: "#94A3B8" }}>{timeAgo(t.ts)}</span>
                  </div>
                  <p style={{ margin: "10px 0 8px", fontSize: 15, lineHeight: 1.45, color: "#0f172a" }}>{t.body}</p>
                  {img ? <img src={img} alt="" style={{ width: "100%", borderRadius: 12, maxHeight: 280, objectFit: "cover" }} /> : null}
                  <div style={{ display: "flex", gap: 12, marginTop: 10, alignItems: "center", fontSize: 12, color: "#64748B" }}>
                    <button type="button" onClick={() => doLike(t.id)} style={{ background: "none", border: 0, display: "flex", gap: 4, alignItems: "center", color: "inherit" }}><ThumbsUp size={14} /> {t.likes || 0}</button>
                    <span style={{ display: "flex", gap: 4, alignItems: "center" }}><MessageCircle size={14} /> {t.comments || 0}</span>
                    <span style={{ display: "flex", gap: 4, alignItems: "center" }}><Eye size={14} /> {t.views || 0}</span>
                    <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                      <button type="button" onClick={() => doVote(t.id, "fact")} style={{ background: voted[t.id] === "fact" ? "#E0F2FE" : "#F1F5F9", border: 0, borderRadius: 999, padding: "4px 10px", fontSize: 11 }}>Fact {t.fact || 0}</button>
                      <button type="button" onClick={() => doVote(t.id, "cap")} style={{ background: voted[t.id] === "cap" ? "#FEE2E2" : "#F1F5F9", border: 0, borderRadius: 999, padding: "4px 10px", fontSize: 11 }}>Cap {t.cap || 0}</button>
                      <button type="button" onClick={() => navigator.share?.({ url: takeUrl(t.id), text: t.body }).catch(() => navigator.clipboard?.writeText(takeUrl(t.id)))} style={{ background: "#F1F5F9", border: 0, borderRadius: "50%", width: 28, height: 28, display: "grid", placeItems: "center" }}><Share2 size={12} /></button>
                    </div>
                  </div>
                </article>
              );
            })}
            {!filtered.length ? <div className="sf-empty">No takes yet — be the first.</div> : null}
            {note ? <div className="sf-empty">{note}</div> : null}
          </>
        ) : (
          <>
            <div className="sf-media-tick" aria-label="Media ticker" style={{ overflow: "hidden", padding: "8px 12px", borderBottom: "1px solid #E7ECF2" }}>
              <div className="sf-tick-marquee" style={{ whiteSpace: "nowrap", animation: "sfTick 24s linear infinite", fontSize: 12, color: "#334155" }}>{tickText} · {tickText}</div>
            </div>

            <div className="sf-segs" role="tablist" aria-label="Media segments" style={{ display: "flex", gap: 8, padding: "8px 12px", overflowX: "auto" }}>
              {["trending", "news", "cinema", "music", "jobs", "market"].map((s) => (
                <button key={s} type="button" className={cut === s ? "on" : ""} onClick={() => { setCut(s); if (s === "cinema" || s === "jobs" || s === "market" || s === "music") open(s); }} style={{ flex: "0 0 auto", border: cut === s ? "1px solid #1877F2" : "1px solid #E7ECF2", background: cut === s ? "#1877F2" : "#fff", color: cut === s ? "#fff" : "#334155", borderRadius: 999, padding: "6px 12px", fontSize: 12, fontWeight: 600, textTransform: "capitalize" }}>{s}</button>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, padding: 12 }}>
              {HUBS.map((h) => {
                const Icon = h.icon;
                return (
                  <button key={h.key} type="button" onClick={() => open(h.key)} style={{ textAlign: "left", border: "1px solid #E7ECF2", borderRadius: 14, padding: 12, background: "#fff", boxShadow: "0 1px 0 rgba(24,119,242,0.06)" }}>
                    <span style={{ width: 32, height: 32, borderRadius: 10, background: `${h.color}18`, color: h.color, display: "grid", placeItems: "center" }}><Icon size={16} /></span>
                    <div style={{ fontWeight: 700, fontSize: 13, marginTop: 8, color: "#172033" }}>{h.label}</div>
                    <div style={{ fontSize: 11, color: "#64748B", marginTop: 2 }}>{h.sub}</div>
                  </button>
                );
              })}
            </div>

            <button type="button" onClick={() => open("ads")} style={{ display: "block", width: "calc(100% - 24px)", margin: "4px 12px 12px", padding: "14px 16px", borderRadius: 14, border: "1px dashed rgba(24,119,242,0.35)", background: "linear-gradient(135deg,#EFF6FF,#F8FAFC)", textAlign: "left" }}>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.06em", color: "#1877F2", textTransform: "uppercase" }}>Sponsored</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#172033", marginTop: 4 }}>Reach Naija audiences on Kilode</div>
              <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>Place an ad · Feeds · Chat · Cinema</div>
            </button>

            <div className="sf-carousel" aria-label="Featured stories" style={{ display: "flex", gap: 10, overflowX: "auto", padding: "0 12px 12px", scrollSnapType: "x mandatory" }}>
              {(news || []).slice(0, 8).map((n) => (
                <div key={n.id} className="sf-card" onClick={() => onOpenNews(n.id)} role="button" tabIndex={0} style={{ flex: "0 0 78%", scrollSnapAlign: "start", borderRadius: 14, overflow: "hidden", background: "#0f172a", color: "#fff", position: "relative", minHeight: 160 }}>
                  {n.image ? <img src={n.image} alt="" style={{ width: "100%", height: 160, objectFit: "cover", display: "block" }} /> : <div style={{ height: 160, background: "#1e293b" }} />}
                  <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: 12, background: "linear-gradient(transparent, rgba(0,0,0,0.75))", fontSize: 13, fontWeight: 700 }}>{n.title}</div>
                </div>
              ))}
              {!(news || []).length ? <div className="sf-card" style={{ flex: "0 0 78%", minHeight: 120, borderRadius: 14, background: "#F1F5F9", display: "grid", placeItems: "center", color: "#64748B", fontSize: 13 }}>Featured stories loading…</div> : null}
            </div>

            <button type="button" onClick={() => open("ads")} style={{ display: "block", width: "calc(100% - 24px)", margin: "0 12px 12px", padding: "12px 14px", borderRadius: 12, border: "1px solid #E7ECF2", background: "#fff", textAlign: "left" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8" }}>AD · Kilode</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#172033", marginTop: 2 }}>Promote your brand between the stories people actually read.</div>
            </button>

            <div className="sf-news-list" style={{ padding: "0 12px 12px" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#172033", marginBottom: 8 }}>Latest news</div>
              {(news || []).slice(0, 12).map((n) => (
                <div key={n.id} className="sf-news-row" onClick={() => onOpenNews(n.id)} role="button" tabIndex={0} style={{ display: "flex", gap: 10, padding: "10px 0", borderBottom: "1px solid #F1F5F9", alignItems: "center" }}>
                  <img src={n.image || avatarUrl(n.id)} alt="" style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, lineHeight: 1.35 }}>{n.title}</div>
                    <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>{n.category || "News"} · {timeAgo(n.ts)}</div>
                  </div>
                </div>
              ))}
            </div>

            <button type="button" onClick={() => open("ads")} style={{ display: "block", width: "calc(100% - 24px)", margin: "0 12px 16px", padding: "16px", borderRadius: 14, border: 0, background: "#1877F2", color: "#fff", textAlign: "center", fontWeight: 700, fontSize: 14 }}>
              Place an ad on Kilode →
            </button>

            <div style={{ padding: 12 }}><SitePulsePanel /></div>
          </>
        )}
      </div>

      {fabOn ? (
        <button
          type="button"
          aria-label="Create"
          onClick={create}
          style={{
            position: "absolute",
            right: 16,
            bottom: chromeHidden ? "max(20px, env(safe-area-inset-bottom))" : 72,
            zIndex: 40,
            width: 56,
            height: 56,
            borderRadius: "50%",
            border: 0,
            background: "#1877F2",
            color: "#fff",
            boxShadow: "0 6px 20px rgba(24,119,242,0.45)",
            display: "grid",
            placeItems: "center",
            transition: "bottom 0.22s ease, transform 0.22s ease",
            transform: chromeHidden ? "scale(1)" : "scale(0.92)",
          }}
        >
          <Plus size={26} strokeWidth={2.5} />
        </button>
      ) : null}

      <nav
        className="sf-dock"
        aria-label="Primary"
        style={{
          display: "flex",
          background: "#1877F2",
          color: "#fff",
          padding: "8px 0 max(8px, env(safe-area-inset-bottom))",
          justifyContent: "space-around",
          alignItems: "center",
          flexShrink: 0,
          transform: chromeHidden ? "translateY(110%)" : "translateY(0)",
          transition: "transform 0.22s ease",
          position: chromeHidden ? "absolute" : "relative",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 30,
        }}
      >
        <button type="button" className={lane === "feed" ? "on" : ""} aria-label="Home" onClick={() => { setLane("feed"); setChromeHidden(false); }} style={dockBtn}>
          <Home size={20} /><span className="sf-dock-lab">Home</span>
        </button>
        <button type="button" className={lane === "media" ? "on" : ""} aria-label="Media" onClick={() => { setLane("media"); setChromeHidden(false); }} style={dockBtn}>
          <Orbit /><span className="sf-dock-lab">Media</span>
        </button>
        <button type="button" className="sf-me" aria-label="Me" onClick={onMe} style={dockBtn}>
          <img src={avatarUrl(me || "me", face)} alt="" width={22} height={22} style={{ borderRadius: "50%" }} />
          <span className="sf-dock-lab">Me</span>
        </button>
      </nav>
    </div>
  );
}

function Orbit() {
  return (
    <svg viewBox="0 0 24 24" width={20} height={20} aria-hidden>
      <circle cx="12" cy="12" r="3.1" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="12" cy="4.2" r="1.35" fill="currentColor" />
      <circle cx="18.6" cy="15.6" r="1.35" fill="currentColor" />
      <circle cx="5.4" cy="15.6" r="1.35" fill="currentColor" />
    </svg>
  );
}
