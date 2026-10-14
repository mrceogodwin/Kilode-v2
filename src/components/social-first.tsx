import { useEffect, useState, type FormEvent } from "react";
import { Eye, Flame, Heart, Home, LayoutGrid, Menu, MessageCircle, MoreHorizontal, Newspaper, Plus, Search, Send, Share2, ThumbsUp } from "lucide-react";
import { avatarUrl, timeAgo } from "@/lib/qonvo-data";
import { likeTake, listStories, listTakes, saveTake, toggleFollow, voteTake, type FellowRow, type TakeRow } from "@/lib/takes-server";
import { SitePulsePanel } from "@/components/pulse-panel";
import { PushStrip } from "@/components/artist-push";

type News = { id: string; title: string; image?: string; category?: string; ts: number; views?: number; status?: string };

const RINGS = ["#e25b4a", "#f0b429", "#7a4db8", "#1f8f4e", "#3a6ea5", "#111111"];

function ringOf(name: string) {
  let n = 0;
  for (const c of name) n += c.charCodeAt(0);
  return RINGS[n % RINGS.length];
}

function tagsOf(body: string) {
  return [...body.matchAll(/#([A-Za-z0-9_]{2,24})/g)].slice(0, 3).map((m) => `#${m[1]}`);
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

const ROLE_GRID = [
  { key: "artist", label: "Artists", color: "#7a4db8" },
  { key: "member", label: "Members", color: "#3a6ea5" },
  { key: "advertiser", label: "Advertisers", color: "#f0b429" },
  { key: "job", label: "Job posters", color: "#1f8f4e" },
];

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
  onNeedAuth: () => void;
}) {
  const [lane, setLane] = useState<"feed" | "media">("feed");
  const [find, setFind] = useState(false);
  const [q, setQ] = useState("");
  const [takes, setTakes] = useState<TakeRow[]>([]);
  const [next, setNext] = useState(0);
  const [people, setPeople] = useState<FellowRow[]>([]);
  const [stories, setStories] = useState<{ id: string; handle: string; image: string; ts: number }[]>([]);
  const [moreBusy, setMoreBusy] = useState(false);
  const [cut, setCut] = useState("trending");
  const [voted, setVoted] = useState<Record<string, "" | "fact" | "cap">>({});
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const [followed, setFollowed] = useState<Record<string, boolean>>({});
  const [note, setNote] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [t, s] = await Promise.all([
          listTakes({ limit: 24 }),
          listStories().catch(() => [] as any),
        ]);
        if (!alive) return;
        setTakes(t?.items || t || []);
        setNext(t?.next || 0);
        setStories(Array.isArray(s) ? s : s?.items || []);
      } catch (e) {
        if (alive) setNote("Could not load feed");
      }
    })();
    return () => { alive = false; };
  }, []);

  const refresh = async () => {
    try {
      const t = await listTakes({ limit: 24 });
      setTakes(t?.items || t || []);
      setNext(t?.next || 0);
    } catch { /* ignore */ }
  };

  const onPost = async (e: FormEvent) => {
    e.preventDefault();
    if (!authed) return onNeedAuth();
    if (!draft.trim() || posting) return;
    setPosting(true);
    try {
      await saveTake({ body: draft.trim() });
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
    try { await voteTake({ id, kind }); } catch { /* ignore */ }
  };

  const doLike = async (id: string) => {
    if (!authed) return onNeedAuth();
    try { await likeTake({ id }); await refresh(); } catch { /* ignore */ }
  };

  const filtered = takes.filter((t) => {
    if (!q.trim()) return true;
    const hay = `${t.handle || ""} ${t.body || ""}`.toLowerCase();
    return hay.includes(q.toLowerCase());
  });

  const trending = [...takes].sort((a, b) => heatOf(b) - heatOf(a)).slice(0, 8);
  const tickText = trending.map((t) => (t.body || "").slice(0, 48)).filter(Boolean).join("  ·  ") || "Talk Nigeria. Live.";

  return (
    <div className="sf-root" data-sf="1" style={{ height: "100%", display: "flex", flexDirection: "column", background: "#fff", minHeight: 0 }}>
      <header className="sf-top" style={{ background: "#1877F2", color: "#fff", padding: "10px 12px", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <button type="button" onClick={onMenu} aria-label="Menu" style={{ background: "none", border: 0, color: "#fff", padding: 4 }}><Menu size={20} /></button>
        <strong style={{ flex: 1, fontSize: 18, fontWeight: 800 }}>Kilode!</strong>
        <button type="button" aria-label="Likes" onClick={onLikes} style={{ background: "none", border: 0, color: "#fff" }}><Heart size={18} /></button>
        <button type="button" aria-label="Send" onClick={onSend} style={{ background: "none", border: 0, color: "#fff" }}><Send size={18} /></button>
      </header>

      {find ? (
        <div className="sf-find" style={{ padding: "8px 12px", borderBottom: "1px solid #E7ECF2" }}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search takes…" style={{ width: "100%", border: "1px solid #E7ECF2", borderRadius: 999, padding: "10px 14px", fontSize: 14 }} />
        </div>
      ) : null}

      <div style={{ flex: 1, overflow: "auto", minHeight: 0 }}>
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

            {filtered.map((t) => {
              const img = shotOf(t.meta);
              return (
                <article key={t.id} style={{ padding: "14px 12px", borderBottom: "1px solid #F1F5F9" }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <img src={avatarUrl(t.handle || "u", t.face)} alt="" width={40} height={40} style={{ borderRadius: "50%", border: `2px solid ${ringOf(t.handle || "u")}` }} />
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
            <div className="sf-media-tick" aria-label="Media ticker">
              <div className="sf-tick-marquee" style={{ animation: "sfTick 24s linear infinite" }}>{tickText} · {tickText}</div>
            </div>
            <div className="sf-segs" role="tablist" aria-label="Media segments">
              {["trending", "news", "cinema", "music", "jobs"].map((s) => (
                <button key={s} type="button" className={cut === s ? "on" : ""} onClick={() => setCut(s)}>{s}</button>
              ))}
            </div>
            <div className="sf-carousel" aria-label="Featured stories">
              {(news || []).slice(0, 6).map((n) => (
                <div key={n.id} className="sf-card" onClick={() => onOpenNews(n.id)} role="button" tabIndex={0}>
                  {n.image ? <img src={n.image} alt="" /> : <div style={{ height: 160, background: "#1e293b" }} />}
                  <div className="cap">{n.title}</div>
                </div>
              ))}
              {!(news || []).length ? (
                <div className="sf-card"><div className="cap">Featured stories loading…</div></div>
              ) : null}
            </div>
            <div className="sf-role-grid">
              {ROLE_GRID.map((r) => (
                <div key={r.key} className="sf-role-card">
                  <div style={{ fontWeight: 700, fontSize: 13, color: r.color }}>{r.label}</div>
                  <div style={{ fontSize: 11, color: "#64748B", marginTop: 4 }}>Discover · Follow</div>
                </div>
              ))}
            </div>
            <div className="sf-news-list">
              {(news || []).slice(0, 10).map((n) => (
                <div key={n.id} className="sf-news-row" onClick={() => onOpenNews(n.id)} role="button" tabIndex={0}>
                  <img src={n.image || avatarUrl(n.id)} alt="" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, lineHeight: 1.35 }}>{n.title}</div>
                    <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>{n.category || "News"} · {timeAgo(n.ts)}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="sf-ads-box">Sponsored · Reach Naija audiences on Kilode</div>
            <div style={{ padding: 12 }}>
              <SitePulsePanel />
            </div>
          </>
        )}
      </div>

      <nav className="sf-dock" aria-label="Primary" style={{ display: "flex", background: "#1877F2", color: "#fff", padding: "8px 0 max(8px, env(safe-area-inset-bottom))", justifyContent: "space-around", alignItems: "center", flexShrink: 0 }}>
        <button type="button" className={lane === "feed" ? "on" : ""} aria-label="Home" onClick={() => setLane("feed")} style={{ background: "none", border: 0, color: "#fff", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, fontSize: 10 }}><Home size={20} /><span className="sf-dock-lab">Home</span></button>
        <button type="button" className={find ? "on" : ""} aria-label="Search" onClick={() => setFind((v) => !v)} style={{ background: "none", border: 0, color: "#fff", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, fontSize: 10 }}><Search size={20} /><span className="sf-dock-lab">Search</span></button>
        <button type="button" className="sf-plus" aria-label="Create" onClick={() => { if (!authed) { onNeedAuth(); return; } onCreate(); }} style={{ background: "#fff", color: "#1877F2", border: 0, borderRadius: 16, width: 48, height: 48, marginTop: -12, boxShadow: "0 4px 12px rgba(24,119,242,0.35)", display: "grid", placeItems: "center" }}><Plus size={22} /></button>
        <button type="button" className={lane === "media" ? "on" : ""} aria-label="Media" onClick={() => setLane("media")} style={{ background: "none", border: 0, color: "#fff", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, fontSize: 10 }}><Orbit /><span className="sf-dock-lab">Media</span></button>
        <button type="button" className="sf-me" aria-label="Me" onClick={onMe} style={{ background: "none", border: 0, color: "#fff", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, fontSize: 10 }}>
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
