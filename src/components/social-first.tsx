import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  Activity, Bell, Briefcase, Clapperboard, Eye, FileText, Layers,
  Menu, MessageCircle, Music, Plus, Search, Share2, Store, ThumbsUp, Users, Megaphone, Building2, Calendar, X, Zap, Image as ImageIcon,
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
    <div className="kilode-quora" data-kilode-home="quora">
      <header className="kq-header">
        <button className="kq-wordmark" type="button" onClick={() => { setTag(""); setLane("feed"); void refresh(); }}>Kilode<span>!</span></button>
        <nav className="kq-top-nav" aria-label="Primary navigation">
          <button type="button" className="active" onClick={() => { setTag(""); setLane("feed"); void refresh(); }}><Activity size={19} /><span>Home</span></button>
          <button type="button" onClick={() => open("following")}><Users size={19} /><span>Following</span></button>
          <button type="button" onClick={() => open("answer")}><MessageCircle size={19} /><span>Answer</span></button>
          <button type="button" onClick={() => open("spaces")}><Layers size={19} /><span>Spaces</span></button>
        </nav>
        <label className="kq-search">
          <Search size={17} aria-hidden="true" />
          <input aria-label="Search Kilode" placeholder="Search Kilode" onKeyDown={(e) => { if (e.key === "Enter") { const q = (e.currentTarget.value || "").trim(); if (q) open(q); } }} />
        </label>
        <div className="kq-header-actions">
          <button type="button" aria-label="Notifications" onClick={onLikes}><Bell size={20} /></button>
          <button type="button" aria-label="Messages" onClick={onSend}><MessageCircle size={20} /></button>
          <button type="button" aria-label="Menu" onClick={onMenu}><Menu size={20} /></button>
          <button type="button" aria-label="Profile" onClick={onMe} className="kq-avatar-button"><img src={avatarUrl(me || "guest", face)} alt="" /></button>
        </div>
      </header>

      <div className="kq-layout">
        <aside className="kq-left">
          <button className="kq-create" type="button" onClick={create}><Plus size={18} /> Create post</button>
          <button className="kq-nav-active" type="button" onClick={() => { setTag(""); setLane("feed"); void refresh(); }}>For You</button>
          <button type="button" onClick={() => open("following")}>Following</button>
          <button type="button" onClick={() => open("answer")}>Answer</button>
          <div className="kq-side-label">TOPICS</div>
          {[
            ["News", "news"], ["Entertainment", "entertainment"], ["Gossip", "gossip"],
            ["Politics", "politics"], ["Business", "business"], ["Technology", "technology"],
            ["Trending", "trending"]
          ].map(([label, key]) => <button key={key} type="button" onClick={() => open(key)}>{label}</button>)}
          <div className="kq-side-footer">About · Terms · Privacy</div>
        </aside>

        <main className="kq-feed">
          <div className="kq-feed-heading">
            <div><div className="kq-eyebrow">YOUR DAILY FEED</div><h1>{tag ? `#${tag}` : "For You"}</h1></div>
            {tag ? <button type="button" className="kq-text-button" onClick={() => void clearTag()}>Clear topic</button> : null}
          </div>

          <nav className="kq-mobile-topics" aria-label="Explore topics">
            {[
              ["For You", ""], ["News", "news"], ["Entertainment", "entertainment"], ["Gossip", "gossip"],
              ["Politics", "politics"], ["Business", "business"], ["Technology", "technology"], ["Trending", "trending"]
            ].map(([label, key]) => (
              <button key={label} type="button" className={(tag || "") === key ? "on" : ""} onClick={() => key ? open(key) : (setTag(""), setLane("feed"), void refresh())}>{label}</button>
            ))}
          </nav>

          <form className="kq-composer" onSubmit={onPost}>
            <img src={avatarUrl(me || "guest", face)} alt="" />
            <div className="kq-composer-main">
              <textarea value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="What do you want to ask or share?" rows={2} />
              {media ? <div className="kq-attachment"><img src={media} alt="Post attachment preview" /><button type="button" onClick={() => setMedia("")}>Remove image</button></div> : null}
              <div className="kq-composer-actions">
                <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => pickMedia(e.target.files?.[0])} />
                <button type="button" onClick={() => fileRef.current?.click()}><ImageIcon size={17} /> Photo</button>
                <button type="submit" className="kq-submit" disabled={posting || (!draft.trim() && !media)}>{posting ? "Posting…" : "Post"}</button>
              </div>
            </div>
          </form>

          {filtered.length === 0 && (!news || news.length === 0) ? <div className="kq-empty"><h2>Start the conversation</h2><p>There are no posts to show yet. Share something with the Kilode community.</p></div> : null}
          {filtered.length === 0 && Array.isArray(news) ? news.slice(0, 8).map((item) => (
            <article key={`news-${item.id}`} className="kq-news-card">
              <div className="kq-post-meta"><span className="kq-source-mark">K!</span><div className="kq-post-author"><strong>Kilode News</strong><span>{item.category || "Latest"}</span></div></div>
              <div className="kq-news-body"><div className="kq-news-copy"><h2>{item.title}</h2><button type="button" className="kq-read" onClick={() => onOpenNews(item.id)}>Read story ↗</button></div>{item.image ? <button type="button" className="kq-news-image" onClick={() => onOpenNews(item.id)} aria-label={`Read ${item.title}`}><img src={item.image} alt="" /></button> : null}</div>
            </article>
          )) : null}

          {filtered.map((t, index) => {
            const shot = shotOf(t.meta);
            const isLive = live.includes((t.handle || "").toLowerCase());
            return (
              <div key={t.id} className="kq-feed-entry">
              <article className="kq-post">
                <div className="kq-post-meta">
                  <img className="kq-post-avatar" src={faceOf(t.handle, faces, t.face)} alt="" />
                  <div className="kq-post-author"><strong>@{t.handle}</strong><span>{roleLabel(t.role || "")} · {timeAgo(t.ts)}</span></div>
                  <button type="button" className="kq-more" aria-label="Post options" onClick={() => setMenuId(menuId === t.id ? null : t.id)}>···</button>
                </div>
                {menuId === t.id ? <div className="kq-post-menu">
                  <button type="button" onClick={() => void doFollow(t.handle)}>{following[t.handle.toLowerCase()] ? "Following" : "Follow"}</button>
                  <button type="button" onClick={() => void doSave(t.id)}>{saved[t.id] ? "Saved" : "Save"}</button>
                  <button type="button" onClick={() => void doRepost(t.id)}>Repost</button>
                  <button type="button" onClick={() => void doMute(t.handle)}>Mute</button>
                  <button type="button" onClick={() => void doBlock(t.handle)}>Block</button>
                </div> : null}
                <p className="kq-post-body">{bodyWithTags(t.body || "")}</p>
                {shot ? <img className="kq-post-media" src={shot} alt="" /> : null}
                <div className="kq-post-actions">
                  <button type="button" onClick={() => void doLike(t.id)}><ThumbsUp size={17} /> {t.likes || 0}</button>
                  <button type="button" onClick={() => void openThread(t.id)}><MessageCircle size={17} /> {t.comments || 0}</button>
                  <button type="button" onClick={() => { void navigator.clipboard?.writeText(takeUrl(t.id)); setNote("Link copied"); }}><Share2 size={17} /> Share</button>
                  <button type="button" className={voted[t.id] === "fact" ? "kq-voted" : ""} onClick={() => void doVote(t.id, "fact")}>Fact {t.fact || 0}</button>
                  <button type="button" className={voted[t.id] === "cap" ? "kq-voted" : ""} onClick={() => void doVote(t.id, "cap")}>Cap {t.cap || 0}</button>
                </div>
              </article>
              {(index + 1) % 3 === 0 && Array.isArray(news) && news[Math.floor(index / 3)] ? (() => {
                const item = news[Math.floor(index / 3)];
                return <article key={`news-inline-${item.id}`} className="kq-news-card">
                  <div className="kq-post-meta"><span className="kq-source-mark">K!</span><div className="kq-post-author"><strong>Kilode News</strong><span>{item.category || "Latest"}</span></div></div>
                  <div className="kq-news-body"><div className="kq-news-copy"><h2>{item.title}</h2><button type="button" className="kq-read" onClick={() => onOpenNews(item.id)}>Read story ↗</button></div>{item.image ? <button type="button" className="kq-news-image" onClick={() => onOpenNews(item.id)} aria-label={`Read ${item.title}`}><img src={item.image} alt="" /></button> : null}</div>
                </article>;
              })() : null}
              </div>
            );
          })}

          {threadId ? <div className="kq-modal-backdrop" onClick={() => setThreadId(null)}>
            <section className="kq-replies" onClick={(e) => e.stopPropagation()}>
              <div className="kq-replies-heading"><h2>Replies</h2><button type="button" onClick={() => setThreadId(null)} aria-label="Close replies"><X size={19} /></button></div>
              {replies.map((r) => <div key={r.id} className="kq-reply"><strong>@{r.handle}</strong><p>{r.body}</p></div>)}
              <form onSubmit={onReply} className="kq-reply-form"><input value={replyDraft} onChange={(e) => setReplyDraft(e.target.value)} placeholder="Write a reply…" /><button type="submit" disabled={replying || !replyDraft.trim()}>{replying ? "Sending…" : "Reply"}</button></form>
            </section>
          </div> : null}

          {storyView ? <div className="kq-story-view"><div><img src={faceOf(storyView.handle, faces)} alt="" /><strong>@{storyView.handle}</strong><button type="button" onClick={() => setStoryView(null)} aria-label="Close story"><X size={20} /></button></div><img src={storyView.image} alt="" /></div> : null}
          {note ? <div className="kq-toast" role="status">{note}</div> : null}
        </main>

        <aside className="kq-right">
          <section className="kq-right-panel"><h2>Trending</h2>{trending.length ? trending.slice(0, 5).map((t) => <button key={t.id} type="button" onClick={() => openTag((t.body || "").split(/\s+/).find((w) => w.startsWith("#"))?.slice(1) || "trending")}><span>Trending</span><strong>{(t.body || "Join the conversation").slice(0, 76)}</strong><small>{t.comments || 0} replies</small></button>) : <p>Conversations from across Kilode will appear here.</p>}</section>
          <section className="kq-right-panel"><h2>Explore topics</h2><p>News, entertainment, gossip, politics, business and culture in one feed.</p><button type="button" className="kq-read" onClick={() => open("trending")}>Explore topics ↗</button></section>
        </aside>
      </div>
      <nav className="kq-mobile-bottom" aria-label="Main navigation">
        <button type="button" onClick={() => { setTag(""); setLane("feed"); void refresh(); }}><Activity size={19} /><span>Home</span></button>
        <button type="button" onClick={() => open("following")}><Users size={19} /><span>Following</span></button>
        <button type="button" className="kq-mobile-create" onClick={create}><Plus size={21} /><span>Create</span></button>
        <button type="button" onClick={onLikes}><Bell size={19} /><span>Alerts</span></button>
        <button type="button" onClick={onMe}><img src={avatarUrl(me || "guest", face)} alt="" /><span>Profile</span></button>
      </nav>
    </div>
  );
}
