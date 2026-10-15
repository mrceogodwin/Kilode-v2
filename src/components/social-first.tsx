import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  Activity, Bell, Briefcase, Clapperboard, Eye, FileText, Layers,
  Menu, MessageCircle, Music, Plus, Share2, Store, ThumbsUp, Users, Megaphone, Building2, Calendar, X, Zap, Image as ImageIcon,
} from "lucide-react";
import { avatarUrl, timeAgo } from "@/lib/qonvo-data";
import { likeTake, listTakes, listTakeReplies, replyTake, saveTake, voteTake, type FellowRow, type TakeRow } from "@/lib/takes-server";
import { SitePulsePanel } from "@/components/pulse-panel";
import { PushStrip } from "@/components/artist-push";

type News = { id: string; title: string; image?: string; category?: string; ts: number; views?: number; status?: string };

const RINGS = ["#e25b4a", "#f0b429", "#7a4db8", "#1f8f4e", "#3a6ea5", "#111111"];
function faceOf(handle: string, faces: Record<string, string>, face?: string) {
  const h = (handle || "").toLowerCase();
  return faces[h] || face || avatarUrl(handle);
}
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
  me, face, authed, news, onLikes, onSend, onCreate, onMe, onMenu, onOpenNews, onOpen, onNeedAuth,
}: {
  me: string; face?: string; authed: boolean; news?: News[];
  onLikes: () => void; onSend: () => void; onCreate: () => void; onMe: () => void; onMenu: () => void;
  onOpenNews: (id?: string) => void; onOpen?: (key: string) => void; onNeedAuth: () => void;
}) {
  const [lane, setLane] = useState<"feed" | "media">("feed");
  const [takes, setTakes] = useState<TakeRow[]>([]);
  const [people, setPeople] = useState<FellowRow[]>([]);
  const [faces, setFaces] = useState<Record<string, string>>({});
  const [live, setLive] = useState<string[]>([]);
  const [cut, setCut] = useState("trending");
  const [voted, setVoted] = useState<Record<string, "" | "fact" | "cap">>({});
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const [note, setNote] = useState("");
  const [media, setMedia] = useState("");
  const [threadId, setThreadId] = useState<string | null>(null);
  const [replies, setReplies] = useState<{ id: string; handle: string; body: string; ts: number }[]>([]);
  const [replyDraft, setReplyDraft] = useState("");
  const [replying, setReplying] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [chromeHidden, setChromeHidden] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const lastY = useRef(0);

  useEffect(() => {
    const onLane = (ev: Event) => {
      const d = (ev as CustomEvent).detail;
      if (d?.lane === "media") setLane("media");
      if (d?.lane === "feed") setLane("feed");
    };
    window.addEventListener("kilode:lane", onLane as EventListener);
    return () => window.removeEventListener("kilode:lane", onLane as EventListener);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        let raw: unknown = null;
        try { raw = await listTakes({ data: {} } as any); } catch {
          try { raw = await listTakes(); } catch { raw = await listTakes(undefined as any); }
        }
        if (!alive) return;
        setTakes(asTakes(raw));
        if (raw && typeof raw === "object") {
          const o = raw as any;
          if (Array.isArray(o.fellows)) setPeople(o.fellows);
          if (o.faces && typeof o.faces === "object") setFaces(o.faces as Record<string, string>);
          if (Array.isArray(o.live)) setLive(o.live.map((x: any) => String(x).toLowerCase()));
        }
      } catch {
        if (alive) setNote("Could not load feed — pull to retry");
      }
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    setChromeHidden(false);
    lastY.current = 0;
  }, [lane]);

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
      let raw: unknown = null;
      try { raw = await listTakes({ data: {} } as any); } catch { raw = await listTakes(); }
      setTakes(asTakes(raw));
      if (raw && typeof raw === "object") {
        const o = raw as any;
        if (Array.isArray(o.fellows)) setPeople(o.fellows);
        if (o.faces && typeof o.faces === "object") setFaces(o.faces);
        if (Array.isArray(o.live)) setLive(o.live.map((x: any) => String(x).toLowerCase()));
      }
    } catch { /* ignore */ }
  };

  const pickMedia = (file?: File | null) => {
    if (!file || !file.type.startsWith("image/")) return;
    if (file.size > 900_000) { setNote("Image must be under ~900KB"); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const v = String(reader.result || "");
      if (v.startsWith("data:image/")) setMedia(v);
    };
    reader.readAsDataURL(file);
  };

  const openThread = async (id: string) => {
    setThreadId(id);
    setReplyDraft("");
    try {
      const rows = await listTakeReplies({ data: { id } } as any);
      setReplies(Array.isArray(rows) ? rows.map((r: any) => ({
        id: String(r.id), handle: String(r.handle || "user"), body: String(r.body || ""), ts: Number(r.ts || 0),
      })) : []);
    } catch { setReplies([]); }
  };

  const onReply = async (e: FormEvent) => {
    e.preventDefault();
    if (!authed) return onNeedAuth();
    if (!threadId || !replyDraft.trim() || replying) return;
    setReplying(true);
    try {
      const res = await replyTake({ data: { id: threadId, body: replyDraft.trim() } } as any);
      if (res && (res as any).ok === false) setNote((res as any).reason || "Reply failed");
      else { setReplyDraft(""); await openThread(threadId); await refresh(); }
    } catch { setNote("Reply failed"); }
    finally { setReplying(false); }
  };

  const onPost = async (e: FormEvent) => {
    e.preventDefault();
    if (!authed) return onNeedAuth();
    if ((!draft.trim() && !media) || posting) return;
    setPosting(true);
    try {
      await saveTake({ data: { body: draft.trim() || (media ? " " : ""), kind: "take", image: media || undefined } } as any);
      setDraft(""); setMedia(""); await refresh();
    } catch { setNote("Post failed"); }
    finally { setPosting(false); }
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

  const filtered = Array.isArray(takes) ? takes : [];
  const trending = [...filtered].sort((a, b) => heatOf(b) - heatOf(a)).slice(0, 8);
  const tickText = trending.map((t) => (t.body || "").slice(0, 48)).filter(Boolean).join("  ·  ") || "Talk Nigeria. Live.";
  const know = people.filter((p) => p.handle && p.handle.toLowerCase() !== (me || "").toLowerCase()).slice(0, 8);
  const open = (key: string) => { if (onOpen) onOpen(key); };
  const create = () => { if (!authed) return onNeedAuth(); onCreate(); };

  return (
    <div className="sf-root" data-sf="1" data-dock="v32" style={{ height: "100%", display: "flex", flexDirection: "column", background: "#fff", minHeight: 0, position: "relative" }}>
      <header className="sf-top" style={{
        background: "#1877F2", color: "#fff", padding: "8px 10px", display: "flex", alignItems: "center", gap: 6, flexShrink: 0,
        transform: chromeHidden ? "translateY(-110%)" : "translateY(0)", transition: "transform 0.22s ease",
        position: chromeHidden ? "absolute" : "relative", top: 0, left: 0, right: 0, zIndex: 35,
      }}>
        <button type="button" onClick={onMenu} aria-label="Menu" className="sf-hdr-pill"><Menu size={18} /></button>
        <strong style={{ flex: 1, fontSize: 20, fontWeight: 800, letterSpacing: "-0.02em", fontFamily: "Nunito, Plus Jakarta Sans, sans-serif" }}>Kilode!</strong>
        <button type="button" aria-label="People" className="sf-hdr-pill" onClick={() => open("communities")}><Users size={16} /></button>
        <button type="button" aria-label="Notifications" className="sf-hdr-pill" onClick={onLikes}><Bell size={16} /></button>
        <button type="button" aria-label="Activity" className="sf-hdr-pill" onClick={() => open("trending")}><Zap size={16} /></button>
        <button type="button" aria-label="Messages" className="sf-hdr-pill" onClick={onSend}><MessageCircle size={16} /></button>
        <button type="button" aria-label="Me" onClick={onMe} style={{ background: "none", border: 0, padding: 0, marginLeft: 2 }}>
          <img src={avatarUrl(me || "guest", face)} alt="" width={30} height={30} style={{ borderRadius: "50%", border: "2px solid rgba(255,255,255,0.55)", display: "block" }} />
        </button>
      </header>

      <div ref={scrollRef} style={{ flex: 1, overflow: "auto", minHeight: 0, paddingTop: chromeHidden ? 8 : 0, paddingBottom: 8 }}>
        {lane === "feed" ? (
          <>
            <div className="sf-tick" aria-label="Trending">
              <span className="sf-tick-label">TRENDING</span>
              <div className="sf-tick-track"><div className="sf-tick-marquee">{tickText} · {tickText}</div></div>
            </div>

            {(know.length > 0 || live.length > 0) ? (
              <div style={{ display: "flex", gap: 12, overflowX: "auto", padding: "12px 14px 8px", borderBottom: "1px solid #F1F5F9" }}>
                <button type="button" onClick={create} style={{ flex: "0 0 auto", background: "none", border: 0, textAlign: "center", width: 64 }}>
                  <span style={{ width: 52, height: 52, borderRadius: "50%", border: "2px dashed #1877F2", display: "grid", placeItems: "center", margin: "0 auto", color: "#1877F2" }}><Plus size={20} /></span>
                  <div style={{ fontSize: 10, marginTop: 4, fontWeight: 600 }}>Your story</div>
                </button>
                {(know.length ? know : people).slice(0, 12).map((p) => {
                  const on = live.includes((p.handle || "").toLowerCase());
                  return (
                    <a key={p.id || p.handle} href={`/u/${encodeURIComponent(p.handle)}`} style={{ flex: "0 0 auto", textAlign: "center", width: 64, textDecoration: "none", color: "inherit" }}>
                      <img src={p.photo || faceOf(p.handle, faces)} alt="" width={52} height={52} style={{ borderRadius: "50%", objectFit: "cover", border: on ? "2.5px solid #1877F2" : `2px solid ${ringOf(p.handle)}`, display: "block", margin: "0 auto" }} />
                      <div style={{ fontSize: 10, marginTop: 4, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{(p.name || p.handle).slice(0, 10)}</div>
                    </a>
                  );
                })}
              </div>
            ) : null}

            <form onSubmit={onPost} style={{ padding: 12, borderBottom: "1px solid #F1F5F9" }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <img src={avatarUrl(me || "guest", face)} alt="" width={36} height={36} style={{ borderRadius: "50%" }} />
                <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="What's happening?" style={{ flex: 1, border: "1px solid #E7ECF2", borderRadius: 999, padding: "10px 14px", fontSize: 14 }} />
                <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => pickMedia(e.target.files?.[0])} />
                <button type="button" aria-label="Add photo" onClick={() => { if (!authed) return onNeedAuth(); fileRef.current?.click(); }} style={{ background: "#F1F5F9", border: 0, borderRadius: 999, width: 36, height: 36, display: "grid", placeItems: "center", color: "#1877F2" }}><ImageIcon size={16} /></button>
                <button type="submit" disabled={posting || (!draft.trim() && !media)} style={{ background: "#1877F2", color: "#fff", border: 0, borderRadius: 999, padding: "8px 14px", fontWeight: 700, fontSize: 13 }}>Post</button>
              </div>
              {media ? (
                <div style={{ marginTop: 10, position: "relative", display: "inline-block" }}>
                  <img src={media} alt="" style={{ maxHeight: 140, borderRadius: 12, display: "block" }} />
                  <button type="button" aria-label="Remove photo" onClick={() => setMedia("")} style={{ position: "absolute", top: 6, right: 6, background: "rgba(0,0,0,0.55)", color: "#fff", border: 0, borderRadius: 999, width: 28, height: 28, display: "grid", placeItems: "center" }}><X size={14} /></button>
                </div>
              ) : null}
            </form>
            <PushStrip />
            {know.length > 0 ? (
              <section style={{ margin: "10px 12px", padding: 12, background: "#fff", border: "1px solid #E7ECF2", borderRadius: 16 }}>
                <b style={{ fontSize: 13, color: "#172033" }}>People you may know</b>
                <div style={{ display: "flex", gap: 10, overflowX: "auto", marginTop: 10 }}>
                  {know.map((p) => (
                    <a key={p.id || p.handle} href={`/u/${encodeURIComponent(p.handle)}`} style={{ flex: "0 0 110px", textAlign: "center", textDecoration: "none", color: "inherit" }}>
                      <img src={p.photo || faceOf(p.handle, faces)} alt="" width={56} height={56} style={{ borderRadius: "50%", objectFit: "cover" }} />
                      <div style={{ fontSize: 12, fontWeight: 700, marginTop: 6 }}>{(p.name || p.handle).slice(0, 12)}</div>
                      <div style={{ fontSize: 10, color: "#64748B" }}>{roleLabel(p.role)}</div>
                    </a>
                  ))}
                </div>
              </section>
            ) : null}
            {filtered.map((t) => {
              const img = shotOf(t.meta);
              return (
                <article key={t.id} style={{ padding: "14px 12px", borderBottom: "1px solid #F1F5F9" }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <img src={faceOf(t.handle || "u", faces, (t as any).face)} alt="" width={40} height={40} style={{ borderRadius: "50%", border: `2px solid ${ringOf(t.handle || "u")}` }} />
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
                    <button type="button" onClick={() => openThread(t.id)} style={{ background: "none", border: 0, display: "flex", gap: 4, alignItems: "center", color: "inherit" }}><MessageCircle size={14} /> {t.comments || 0}</button>
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
            <div className="sf-media-tick" style={{ overflow: "hidden", padding: "8px 12px", borderBottom: "1px solid #E7ECF2" }}>
              <div className="sf-tick-marquee" style={{ whiteSpace: "nowrap", animation: "sfTick 24s linear infinite", fontSize: 12, color: "#334155" }}>{tickText} · {tickText}</div>
            </div>
            <div className="sf-segs" style={{ display: "flex", gap: 8, padding: "8px 12px", overflowX: "auto" }}>
              {["trending", "news", "cinema", "music", "jobs", "market"].map((s) => (
                <button key={s} type="button" onClick={() => { setCut(s); if (["cinema", "jobs", "market", "music"].includes(s)) open(s); }} style={{
                  flex: "0 0 auto", border: cut === s ? "1px solid #1877F2" : "1px solid #E7ECF2", background: cut === s ? "#1877F2" : "#fff",
                  color: cut === s ? "#fff" : "#334155", borderRadius: 999, padding: "6px 12px", fontSize: 12, fontWeight: 600, textTransform: "capitalize",
                }}>{s}</button>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, padding: 12 }}>
              {HUBS.map((h) => {
                const Icon = h.icon;
                return (
                  <button key={h.key} type="button" onClick={() => open(h.key)} style={{ textAlign: "left", border: "1px solid #E7ECF2", borderRadius: 14, padding: 12, background: "#fff" }}>
                    <span style={{ width: 32, height: 32, borderRadius: 10, background: `${h.color}18`, color: h.color, display: "grid", placeItems: "center" }}><Icon size={16} /></span>
                    <div style={{ fontWeight: 700, fontSize: 13, marginTop: 8, color: "#172033" }}>{h.label}</div>
                    <div style={{ fontSize: 11, color: "#64748B", marginTop: 2 }}>{h.sub}</div>
                  </button>
                );
              })}
            </div>
            <button type="button" onClick={() => open("ads")} style={{ display: "block", width: "calc(100% - 24px)", margin: "4px 12px 12px", padding: "14px 16px", borderRadius: 14, border: "1px dashed rgba(24,119,242,0.35)", background: "linear-gradient(135deg,#EFF6FF,#F8FAFC)", textAlign: "left" }}>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.06em", color: "#1877F2" }}>SPONSORED</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#172033", marginTop: 4 }}>Reach Naija audiences on Kilode</div>
            </button>
            <div className="sf-news-list">
              {(news || []).slice(0, 12).map((n) => (
                <div key={n.id} onClick={() => onOpenNews(n.id)} role="button" tabIndex={0} style={{ display: "flex", gap: 10, padding: "10px 12px", borderBottom: "1px solid #F1F5F9", alignItems: "center" }}>
                  <img src={n.image || avatarUrl(n.id)} alt="" width={56} height={56} style={{ borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{n.title}</div>
                    <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>{n.category || "News"} · {timeAgo(n.ts)}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ padding: "0 12px 24px" }}><SitePulsePanel /></div>
          </>
        )}
      </div>

      <nav aria-label="Primary" className="sf-dock-v2" style={{ display: chromeHidden ? "none" : "flex" }}>
        <button type="button" aria-label="Home" className={lane === "feed" ? "on" : ""} onClick={() => setLane("feed")}>
          <FileText size={20} /><span>Home</span>
        </button>
        <button type="button" aria-label="Socials" className={lane === "media" ? "on" : ""} onClick={() => setLane("media")}>
          <Users size={20} /><span>Socials</span>
        </button>
        <button type="button" aria-label="Create" className="sf-dock-plus" onClick={create}>
          <Plus size={26} strokeWidth={2.5} />
        </button>
        <button type="button" aria-label="Activity" onClick={() => open("trending")}>
          <Activity size={20} /><span>Activity</span>
        </button>
        <button type="button" aria-label="My Space" onClick={onMe}>
          <Layers size={20} /><span>My Space</span>
        </button>
      </nav>

      {threadId ? (
        <div className="fixed inset-0 z-[70] flex flex-col justify-end" style={{ background: "rgba(0,0,0,0.4)" }}>
          <button type="button" aria-label="Close thread" style={{ flex: 1, border: 0, background: "transparent" }} onClick={() => setThreadId(null)} />
          <div style={{ background: "#fff", borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: "72vh", display: "flex", flexDirection: "column", paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", borderBottom: "1px solid #E7ECF2" }}>
              <strong style={{ fontSize: 15 }}>Comments</strong>
              <button type="button" onClick={() => setThreadId(null)} style={{ background: "none", border: 0, padding: 6 }}><X size={18} /></button>
            </div>
            <div style={{ overflow: "auto", flex: 1, padding: "8px 14px" }}>
              {replies.length ? replies.map((r) => (
                <div key={r.id} style={{ padding: "10px 0", borderBottom: "1px solid #F1F5F9" }}>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>@{r.handle}</div>
                  <div style={{ fontSize: 14, marginTop: 4 }}>{r.body}</div>
                  <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 4 }}>{timeAgo(r.ts)}</div>
                </div>
              )) : <div style={{ padding: 24, textAlign: "center", color: "#94A3B8", fontSize: 13 }}>No comments yet — start the thread.</div>}
            </div>
            <form onSubmit={onReply} style={{ display: "flex", gap: 8, padding: "10px 14px", borderTop: "1px solid #E7ECF2" }}>
              <input value={replyDraft} onChange={(e) => setReplyDraft(e.target.value)} placeholder={authed ? "Write a reply…" : "Join to reply"} style={{ flex: 1, border: "1px solid #E7ECF2", borderRadius: 999, padding: "10px 14px", fontSize: 14 }} />
              <button type="submit" disabled={replying || !replyDraft.trim()} style={{ background: "#1877F2", color: "#fff", border: 0, borderRadius: 999, padding: "8px 14px", fontWeight: 700, fontSize: 13 }}>Reply</button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
