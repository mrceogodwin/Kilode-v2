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
  const [lane, setLane] = useState<"feed" | "media">("media");
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
        <button key={i} type="button" onClick={() => openTag(part.slice(1))} style={{ background: "none", border: 0, color: "#1877F2", fontWeight: 700, padding: 0, fontSize: "inherit" }}>{part}</button>
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
    <div className="sf-root" data-sf="1" data-dock="v32" style={{ height: "100%", display: "flex", flexDirection: "column", background: "#fff", minHeight: 0, position: "relative" }}>
      <header className="sf-top" style={{
        background: "#1877F2", color: "#fff",
        padding: "max(6px, env(safe-area-inset-top, 0px)) 10px 8px",
        display: "flex", alignItems: "center", gap: 6, flexShrink: 0,
        transform: chromeHidden ? "translateY(-110%)" : "translateY(0)",
        transition: "transform 0.22s ease",
        position: "relative", zIndex: 35, minHeight: 48,
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

      <div ref={scrollRef} style={{ flex: 1, overflow: "auto", minHeight: 0, WebkitOverflowScrolling: "touch", overscrollBehavior: "contain", paddingTop: chromeHidden ? 8 : 0, paddingBottom: 72 }}>
        {lane === "feed" ? (
          <>
            <div className="sf-tick" aria-label="Trending">
              <span className="sf-tick-label">TRENDING</span>
              <div className="sf-tick-track"><div className="sf-tick-marquee">{tickText} · {tickText}</div></div>
            </div>
            <p style={{ padding: 16, color: "#64748B", fontSize: 13 }}>Loading social feed…</p>
          </>
        ) : (
          <>
            <div style={{ padding: 16 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800 }}>Home</h2>
              <p style={{ color: "#64748B", fontSize: 13 }}>News, hubs, and media. Open Socials for the feed.</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 }}>
                {HUBS.map((h) => {
                  const Icon = h.icon;
                  return (
                    <button key={h.key} type="button" onClick={() => open(h.key)} style={{ textAlign: "left", border: "1px solid #E7ECF2", borderRadius: 16, padding: 12, background: "#fff" }}>
                      <span style={{ display: "inline-grid", placeItems: "center", width: 32, height: 32, borderRadius: 10, background: h.color + "22", color: h.color }}><Icon size={16} /></span>
                      <div style={{ fontWeight: 800, marginTop: 6 }}>{h.label}</div>
                      <div style={{ fontSize: 11, color: "#64748B" }}>{h.sub}</div>
                    </button>
                  );
                })}
              </div>
            </div>
            <div style={{ padding: "0 12px 24px" }}><SitePulsePanel /></div>
          </>
        )}
      </div>

      <nav aria-label="Primary" className="sf-dock-v2" style={{ display: chromeHidden ? "none" : "flex" }}>
        <button type="button" aria-label="Home" className={lane === "media" ? "on" : ""} onClick={() => setLane("media")}><FileText size={20} /><span>Home</span></button>
        <button type="button" aria-label="Socials" className={lane === "feed" ? "on" : ""} onClick={() => setLane("feed")}><Users size={20} /><span>Socials</span></button>
        <button type="button" aria-label="Create" className="sf-dock-plus" onClick={create}><Plus size={26} strokeWidth={2.5} /></button>
        <button type="button" aria-label="Activity" onClick={() => open("trending")}><Activity size={20} /><span>Activity</span></button>
        <button type="button" aria-label="My Space" onClick={onMe}><Layers size={20} /><span>My Space</span></button>
      </nav>
    </div>
  );
}
