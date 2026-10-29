import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  Activity, Bell, Briefcase, Clapperboard, Eye, FileText, Layers,
  Menu, MessageCircle, Music, Plus, Share2, Store, ThumbsUp, Users, Megaphone, Building2, Calendar, X, Zap, Image as ImageIcon,
} from "lucide-react";
import { avatarUrl, timeAgo } from "@/lib/qonvo-data";
import {
  likeTake, listTakes, listTakeReplies, replyTake, saveTake, voteTake,
  toggleFollow, toggleMute, toggleBlock, toggleSaveTake, repostTake, listStories, listTakesByTag, postStory,
  type FellowRow, type TakeRow,
} from "@/lib/takes-server";
import { SitePulsePanel } from "@/components/pulse-panel";
import { PushStrip } from "@/components/artist-push";
import { HomeMediaLane } from "@/components/home-media-lane";

type News = { id: string; title: string; image?: string; category?: string; ts: number; views?: number; status?: string };

const RINGS = ["#e25b4a", "#f0b429", "#7a4db8", "#1f8f4e", "#3a6ea5", "#111111"];
function toJpegData(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const max = 720;
      let w = img.width, h = img.height;
      if (w > max || h > max) { const s = Math.min(max / w, max / h); w = Math.round(w * s); h = Math.round(h * s); }
      const c = document.createElement("canvas");
      c.width = w; c.height = h;
      const ctx = c.getContext("2d");
      if (!ctx) { reject(new Error("canvas")); return; }
      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      let q = 0.82, out = c.toDataURL("image/jpeg", q);
      while (out.length > 160000 && q > 0.4) { q -= 0.1; out = c.toDataURL("image/jpeg", q); }
      resolve(out);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("image")); };
    img.src = url;
  });
}
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
  { key: "ads", label: "Ads", sub: "Promote", icon: Megaphone, color: "#35c46a" },
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
  const [following, setFollowing] = useState<Record<string, boolean>>({});
  const [menuId, setMenuId] = useState<string | null>(null);
  const [tag, setTag] = useState("");
  const [stories, setStories] = useState<{ id: string; handle: string; image: string; ts: number }[]>([]);
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [storyView, setStoryView] = useState<{ id: string; handle: string; image: string; ts: number } | null>(null);
  const [storyBusy, setStoryBusy] = useState(false);
  const storyFileRef = useRef<HTMLInputElement | null>(null);
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
        try {
          const st = await listStories({ data: {} } as any);
          if (alive && st && Array.isArray((st as any).stories)) setStories((st as any).stories);
        } catch { /* stories optional */ }
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

  const onStoryFile = async (file?: File | null) => {
    if (!authed) return onNeedAuth();
    if (!file || !file.type.startsWith("image/")) return;
    setStoryBusy(true);
    try {
      const jpeg = await toJpegData(file);
      const res = await postStory({ data: jpeg } as any);
      if (res && (res as any).ok === false) setNote((res as any).reason || "Story failed");
      else {
        setNote("Story live for 24h");
        try {
          const st = await listStories({ data: {} } as any);
          if (st && Array.isArray((st as any).stories)) setStories((st as any).stories);
        } catch { /* ignore */ }
      }
    } catch { setNote("Use a smaller photo for stories"); }
    finally {
      setStoryBusy(false);
      if (storyFileRef.current) storyFileRef.current.value = "";
    }
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

  const doFollow = async (handle: string) => {
    if (!authed) return onNeedAuth();
    try {
      const res = await toggleFollow({ data: { handle } } as any);
      setFollowing((f) => ({ ...f, [handle.toLowerCase()]: !!(res as any)?.on }));
    } catch { setNote("Follow failed"); }
  };

  const doMute = async (handle: string) => {
    if (!authed) return onNeedAuth();
    try {
      await toggleMute({ data: { handle } } as any);
      setTakes((rows) => rows.filter((r) => (r.handle || "").toLowerCase() !== handle.toLowerCase()));
      setMenuId(null);
      setNote(`Muted @${handle}`);
    } catch { setNote("Mute failed"); }
  };

  const doBlock = async (handle: string) => {
    if (!authed) return onNeedAuth();
    try {
      await toggleBlock({ data: { handle } } as any);
      setTakes((rows) => rows.filter((r) => (r.handle || "").toLowerCase() !== handle.toLowerCase()));
      setMenuId(null);
      setNote(`Blocked @${handle}`);
    } catch { setNote("Block failed"); }
  };

  const doSave = async (id: string) => {
    if (!authed) return onNeedAuth();
    try {
      const res = await toggleSaveTake({ data: { id } } as any);
      setSaved((s) => ({ ...s, [id]: !!(res as any)?.on }));
      setMenuId(null);
    } catch { setNote("Save failed"); }
  };

  const doRepost = async (id: string) => {
    if (!authed) return onNeedAuth();
    try {
      await repostTake({ data: { id } } as any);
      setMenuId(null);
      setNote("Reposted");
      await refresh();
    } catch { setNote("Repost failed"); }
  };

  const openTag = async (word: string) => {
    const clean = word.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 24);
    if (clean.length < 2) return;
    setTag(clean);
    try {
      const res = await listTakesByTag({ data: { tag: clean } } as any);
      setTakes(asTakes(res));
    } catch { setNote("Tag load failed"); }
  };

  const clearTag = async () => { setTag(""); await refresh(); };

  const bodyWithTags = (body: string) => {
    const parts = body.split(/(#[A-Za-z0-9_]{2,24})/g);
    return parts.map((part, i) =>
      part.startsWith("#") && part.length > 2 ? (
        <button key={i} type="button" onClick={() => openTag(part.slice(1))} style={{ background: "none", border: 0, color: "#35c46a", fontWeight: 700, padding: 0, fontSize: "inherit" }}>{part}</button>
      ) : <span key={i}>{part}</span>
    );
  };

  const filtered = Array.isArray(takes) ? takes : [];
  const trending = [...filtered].sort((a, b) => heatOf(b) - heatOf(a)).slice(0, 8);
  const tickText = trending.map((t) => (t.body || "").slice(0, 48)).filter(Boolean).join("  ·  ") || "Talk Nigeria. Live.";
  const know = people.filter((p) => p.handle && p.handle.toLowerCase() !== (me || "").toLowerCase()).slice(0, 8);
  const open = (key: string) => { if (onOpen) onOpen(key); };
  const create = () => { if (!authed) return onNeedAuth(); onCreate(); };

  return (
    <div className="sf-root" data-sf="1" data-dock="v32" style={{ height: "100%", display: "flex", flexDirection: "column", background: "#080808", color: "#f5f5f5", minHeight: 0, position: "relative" }}>
      <header className="sf-top" style={{
        background: "#080808", color: "#f5f5f5", borderBottom: "1px solid #262626",
        padding: "max(8px, env(safe-area-inset-top, 0px)) max(16px, calc((100vw - 1040px) / 2)) 10px",
        display: "flex", alignItems: "center", gap: 14, flexShrink: 0,
        transform: chromeHidden ? "translateY(-110%)" : "translateY(0)",
        transition: "transform 0.22s ease",
        position: "relative", zIndex: 35, minHeight: 58,
      }}>
        <button type="button" onClick={onMenu} aria-label="Menu" className="sf-hdr-pill"><Menu size={18} /></button>
        <strong style={{ flex: 1, fontSize: 24, fontWeight: 800, letterSpacing: "-0.04em", fontFamily: "Plus Jakarta Sans, sans-serif" }}>Kilode!</strong>
        <button type="button" aria-label="People" className="sf-hdr-pill" onClick={() => open("communities")}><Users size={16} /></button>
        <button type="button" aria-label="Notifications" className="sf-hdr-pill" onClick={onLikes}><Bell size={16} /></button>
        <button type="button" aria-label="Activity" className="sf-hdr-pill" onClick={() => open("trending")}><Zap size={16} /></button>
        <button type="button" aria-label="Messages" className="sf-hdr-pill" onClick={onSend}><MessageCircle size={16} /></button>
        <button type="button" aria-label="Me" onClick={onMe} style={{ background: "none", border: 0, padding: 0, marginLeft: 2 }}>
          <img src={avatarUrl(me || "guest", face)} alt="" width={30} height={30} style={{ borderRadius: "50%", border: "2px solid rgba(255,255,255,0.55)", display: "block" }} />
        </button>
      </header>

      <div ref={scrollRef} className="kilode-quora-scroll" style={{ flex: 1, overflow: "auto", minHeight: 0, WebkitOverflowScrolling: "touch", overscrollBehavior: "contain", paddingTop: chromeHidden ? 8 : 0, paddingBottom: 32 }}>
        {lane === "feed" ? (
          <>
            {Array.isArray(news) && news.length > 0 ? (
              <section className="kilode-editorial-feed" aria-label="Latest stories">
                {news.slice(0, 6).map((item) => (
                  <article key={item.id} className="kilode-editorial-item">
                    <div className="kilode-editorial-copy">
                      <div className="kilode-editorial-category">{item.category || "News"}</div>
                      <h2>{item.title}</h2>
                      <button type="button" onClick={() => onOpenNews(item.id)} className="kilode-read-link">Read <span aria-hidden="true">↗</span></button>
                    </div>
                    {item.image ? <img src={item.image} alt="" /> : null}
                  </article>
                ))}
              </section>
            ) : null}

            <div className="sf-tick" aria-label="Trending">
              <span className="sf-tick-label">TRENDING</span>
              <div className="sf-tick-track"><div className="sf-tick-marquee">{tickText} · {tickText}</div></div>
            </div>

            {(know.length > 0 || live.length > 0 || stories.length > 0) ? (
              <div style={{ display: "flex", gap: 12, overflowX: "auto", padding: "12px 14px 8px", borderBottom: "1px solid #F1F5F9" }}>
                <input ref={storyFileRef} type="file" accept="image/*" hidden onChange={(e) => void onStoryFile(e.target.files?.[0])} />
                <button type="button" disabled={storyBusy} onClick={() => { if (!authed) return onNeedAuth(); storyFileRef.current?.click(); }} style={{ flex: "0 0 auto", background: "none", border: 0, textAlign: "center", width: 64, opacity: storyBusy ? 0.6 : 1 }}>
                  <span style={{ width: 52, height: 52, borderRadius: "50%", border: "2px dashed #1877F2", display: "grid", placeItems: "center", margin: "0 auto", color: "#35c46a" }}><Plus size={20} /></span>
                  <div style={{ fontSize: 10, marginTop: 4, fontWeight: 600 }}>{storyBusy ? "Posting…" : "Your story"}</div>
                </button>
                {stories.map((s) => (
                  <button key={s.id} type="button" onClick={() => setStoryView(s)} style={{ flex: "0 0 auto", textAlign: "center", width: 64, background: "none", border: 0, padding: 0, color: "inherit" }}>
                    <img src={s.image || faceOf(s.handle, faces)} alt="" width={52} height={52} style={{ borderRadius: "50%", objectFit: "cover", border: "2.5px solid #F0B429", display: "block", margin: "0 auto" }} />
                    <div style={{ fontSize: 10, marginTop: 4, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis" }}>@{s.handle}</div>
                  </button>
                ))}
                {know.slice(0, 6).map((p) => (
                  <button key={p.handle} type="button" onClick={() => doFollow(p.handle)} style={{ flex: "0 0 auto", textAlign: "center", width: 64, background: "none", border: 0, padding: 0 }}>
                    <img src={faceOf(p.handle, faces)} alt="" width={52} height={52} style={{ borderRadius: "50%", objectFit: "cover", border: live.includes((p.handle || "").toLowerCase()) ? "2.5px solid #22c55e" : "2px solid #E7ECF2", display: "block", margin: "0 auto" }} />
                    <div style={{ fontSize: 10, marginTop: 4, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis" }}>@{p.handle}</div>
                  </button>
                ))}
              </div>
            ) : null}

            <form onSubmit={onPost} style={{ padding: "12px 14px", borderBottom: "1px solid #F1F5F9" }}>
              <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <img src={avatarUrl(me || "guest", face)} alt="" width={40} height={40} style={{ borderRadius: "50%" }} />
                <div style={{ flex: 1 }}>
                  <textarea value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="What is happening?" rows={2} style={{ width: "100%", border: "1px solid #E7ECF2", borderRadius: 12, padding: 10, fontSize: 14, resize: "vertical", outline: "none" }} />
                  {media ? <img src={media} alt="" style={{ marginTop: 8, maxHeight: 160, borderRadius: 12 }} /> : null}
                  <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center" }}>
                    <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => pickMedia(e.target.files?.[0])} />
                    <button type="button" onClick={() => fileRef.current?.click()} style={{ background: "none", border: 0, color: "#35c46a" }}><ImageIcon size={18} /></button>
                    {media ? <button type="button" onClick={() => setMedia("")} style={{ background: "none", border: 0, color: "#ef4444", fontSize: 12 }}>Remove</button> : null}
                    <button type="submit" disabled={posting || (!draft.trim() && !media)} style={{ marginLeft: "auto", background: "#35c46a", color: "#111111", border: 0, borderRadius: 999, padding: "8px 16px", fontWeight: 700, opacity: posting || (!draft.trim() && !media) ? 0.5 : 1 }}>{posting ? "Posting…" : "Post"}</button>
                  </div>
                </div>
              </div>
            </form>

            {tag ? (
              <div style={{ padding: "8px 14px", display: "flex", gap: 8, alignItems: "center", background: "#151515" }}>
                <span style={{ fontWeight: 700, color: "#35c46a" }}>#{tag}</span>
                <button type="button" onClick={() => void clearTag()} style={{ marginLeft: "auto", border: 0, background: "none", fontSize: 12, color: "#a3a3a3" }}>Clear</button>
              </div>
            ) : null}

            <div style={{ padding: "0 0 24px" }}>
              {filtered.length === 0 ? (
                <p style={{ padding: 24, textAlign: "center", color: "#a3a3a3", fontSize: 13 }}>No takes yet. Be the first.</p>
              ) : null}
              {filtered.map((t) => {
                const shot = shotOf(t.meta);
                const isLive = live.includes((t.handle || "").toLowerCase());
                return (
                  <article key={t.id} style={{ padding: "14px 14px 10px", borderBottom: "1px solid #F1F5F9" }}>
                    <div style={{ display: "flex", gap: 10 }}>
                      <img src={faceOf(t.handle, faces, t.face)} alt="" width={40} height={40} style={{ borderRadius: "50%", border: isLive ? "2px solid #22c55e" : "2px solid transparent" }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                          <strong style={{ fontSize: 14 }}>@{t.handle}</strong>
                          <span style={{ fontSize: 11, color: "#a3a3a3" }}>{roleLabel(t.role || "")}</span>
                          <span style={{ fontSize: 11, color: "#737373" }}>· {timeAgo(t.ts)}</span>
                          <button type="button" onClick={() => setMenuId(menuId === t.id ? null : t.id)} style={{ marginLeft: "auto", background: "none", border: 0, color: "#737373", fontSize: 18, lineHeight: 1 }}>···</button>
                        </div>
                        {menuId === t.id ? (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                            <button type="button" onClick={() => void doFollow(t.handle)} style={{ fontSize: 12, border: "1px solid #E7ECF2", borderRadius: 999, padding: "4px 10px", background: "#111111" }}>{following[t.handle.toLowerCase()] ? "Following" : "Follow"}</button>
                            <button type="button" onClick={() => void doSave(t.id)} style={{ fontSize: 12, border: "1px solid #E7ECF2", borderRadius: 999, padding: "4px 10px", background: "#111111" }}>{saved[t.id] ? "Saved" : "Save"}</button>
                            <button type="button" onClick={() => void doRepost(t.id)} style={{ fontSize: 12, border: "1px solid #E7ECF2", borderRadius: 999, padding: "4px 10px", background: "#111111" }}>Repost</button>
                            <button type="button" onClick={() => void doMute(t.handle)} style={{ fontSize: 12, border: "1px solid #E7ECF2", borderRadius: 999, padding: "4px 10px", background: "#111111" }}>Mute</button>
                            <button type="button" onClick={() => void doBlock(t.handle)} style={{ fontSize: 12, border: "1px solid #E7ECF2", borderRadius: 999, padding: "4px 10px", background: "#111111", color: "#ef4444" }}>Block</button>
                          </div>
                        ) : null}
                        <p style={{ margin: "6px 0 0", fontSize: 14, lineHeight: 1.45, whiteSpace: "pre-wrap" }}>{bodyWithTags(t.body || "")}</p>
                        {shot ? <img src={shot} alt="" style={{ marginTop: 8, width: "100%", maxHeight: 320, objectFit: "cover", borderRadius: 12 }} /> : null}
                        <div style={{ display: "flex", gap: 14, marginTop: 10, alignItems: "center" }}>
                          <button type="button" onClick={() => void doLike(t.id)} style={{ background: "none", border: 0, display: "flex", alignItems: "center", gap: 4, color: "#a3a3a3", fontSize: 13 }}><ThumbsUp size={16} /> {t.likes || 0}</button>
                          <button type="button" onClick={() => void openThread(t.id)} style={{ background: "none", border: 0, display: "flex", alignItems: "center", gap: 4, color: "#a3a3a3", fontSize: 13 }}><MessageCircle size={16} /> {t.comments || 0}</button>
                          <button type="button" onClick={() => { void navigator.clipboard?.writeText(takeUrl(t.id)); setNote("Link copied"); }} style={{ background: "none", border: 0, display: "flex", alignItems: "center", gap: 4, color: "#a3a3a3", fontSize: 13 }}><Share2 size={16} /></button>
                          <button type="button" onClick={() => void doVote(t.id, "fact")} style={{ background: "none", border: 0, fontSize: 12, color: voted[t.id] === "fact" ? "#35c46a" : "#737373", fontWeight: 700 }}>Fact {t.fact || 0}</button>
                          <button type="button" onClick={() => void doVote(t.id, "cap")} style={{ background: "none", border: 0, fontSize: 12, color: voted[t.id] === "cap" ? "#ef4444" : "#737373", fontWeight: 700 }}>Cap {t.cap || 0}</button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            {threadId ? (
              <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 70, display: "flex", alignItems: "flex-end" }} onClick={() => setThreadId(null)}>
                <div style={{ background: "#111111", width: "100%", maxHeight: "70vh", borderRadius: "16px 16px 0 0", padding: 16, overflow: "auto" }} onClick={(e) => e.stopPropagation()}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                    <strong>Replies</strong>
                    <button type="button" onClick={() => setThreadId(null)} style={{ background: "none", border: 0 }}><X size={18} /></button>
                  </div>
                  {replies.map((r) => (
                    <div key={r.id} style={{ padding: "8px 0", borderBottom: "1px solid #F1F5F9" }}>
                      <strong style={{ fontSize: 13 }}>@{r.handle}</strong>
                      <p style={{ margin: "4px 0 0", fontSize: 13 }}>{r.body}</p>
                    </div>
                  ))}
                  <form onSubmit={onReply} style={{ display: "flex", gap: 8, marginTop: 12 }}>
                    <input value={replyDraft} onChange={(e) => setReplyDraft(e.target.value)} placeholder="Write a reply…" style={{ flex: 1, border: "1px solid #E7ECF2", borderRadius: 999, padding: "10px 14px", fontSize: 14 }} />
                    <button type="submit" disabled={replying || !replyDraft.trim()} style={{ background: "#35c46a", color: "#111111", border: 0, borderRadius: 999, padding: "10px 16px", fontWeight: 700 }}>Reply</button>
                  </form>
                </div>
              </div>
            ) : null}

            {storyView ? (
              <div style={{ position: "fixed", inset: 0, background: "#0B0D12", zIndex: 80, display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px", color: "#111111" }}>
                  <img src={faceOf(storyView.handle, faces)} alt="" width={32} height={32} style={{ borderRadius: "50%" }} />
                  <strong>@{storyView.handle}</strong>
                  <button type="button" onClick={() => setStoryView(null)} style={{ marginLeft: "auto", background: "none", border: 0, color: "#111111" }}><X size={20} /></button>
                </div>
                <img src={storyView.image} alt="" style={{ flex: 1, objectFit: "contain", width: "100%" }} />
              </div>
            ) : null}

            {note ? <div style={{ position: "fixed", bottom: 80, left: "50%", transform: "translateX(-50%)", background: "#111", color: "#111111", padding: "8px 14px", borderRadius: 999, fontSize: 12, zIndex: 60 }}>{note}</div> : null}
          </>
        ) : (
          <HomeMediaLane
            news={news}
            tickText={tickText}
            onOpen={onOpen}
            onOpenNews={onOpenNews}
          />
        )}
      </div>

      <nav aria-label="Explore topics" className="kilode-quora-topics">
        <button type="button" onClick={() => { setLane("feed"); setTag(""); void refresh(); }}>For you</button>
        <button type="button" onClick={() => open("news")}>News</button>
        <button type="button" onClick={() => open("entertainment")}>Entertainment</button>
        <button type="button" onClick={() => open("politics")}>Politics</button>
        <button type="button" onClick={() => open("business")}>Business</button>
        <button type="button" onClick={() => open("trending")}>Trending</button>
      </nav></nav>
    </div>
  );
}
