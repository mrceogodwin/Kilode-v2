import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Briefcase, Headphones, ImagePlus, Lock, Video } from "lucide-react";
import { avatarUrl, timeAgo } from "@/lib/qonvo-data";
import { uploadTakeMedia, readVideoSeconds, trimTakeVideo } from "@/lib/supabase";
import { getPublicSite } from "@/lib/site-server";
import { listPublicSpaces, type SpaceCard } from "@/lib/spaces-server";
import { SocialDesk } from "@/components/social-desk";
import { Tip } from "@/components/tip";
import { connectFellow, listConnects, replyConnect, applyTake, deleteOwnReply, deleteOwnTake, editOwnTake, getTake, likeTake, likeReply, listLikeFaces, listMyBlocks, listMyMutes, listMyTags, listSavedTakeIds, listSavedTakes, listTakes, listFollowingTakes, listMyFollows, listTakeReplies, listTakesByTag, listTopicTakes, listTrending, listWordMutes, muteWord, pinOwnTake, replyTake, reportTake, repostTake, saveTake, searchPeople, seeTake, suggestFollows, toggleFollow, togglePing, toggleReplyLock, toggleSaveTake, toggleSensitive, toggleTagFollow, voteTake, type ConnectRow, type FellowRow, type TakeKind, type TakeReply, type TakeRow } from "@/lib/takes-server";
import { kilodeSound, setSounds } from "@/lib/sfx";
import { sendDm } from "@/lib/social-server";
import { ReportMenu } from "@/components/report-menu";
import { LinkText } from "@/components/link-text";
import { VerifiedMark } from "@/components/handle-link";
import { mentionQuery } from "@/lib/board-rules";
import { PushStrip } from "@/components/artist-push";


function heatOf(t: TakeRow) {
  return t.likes * 3 + t.reposts * 4 + t.comments * 2 + t.fact + t.cap + t.voteA + t.voteB;
}

function plainBits(s: string) {
  let out = s;
  for (let i = 0; i < 2; i++) {
    out = out
      .replace(/&/g, "&")
      .replace(/&#(\d+);/g, (_, n) => {
        const c = Number(n);
        return c > 0 && c < 0x110000 ? String.fromCodePoint(c) : _;
      })
      .replace(/'|&#39;/g, "'")
      .replace(/"/g, '"');
  }
  return out;
}

function Face({ handle, photo, size = 28 }: { handle: string; photo?: string; size?: number }) {
  const [src, setSrc] = useState(avatarUrl(handle, photo));
  useEffect(() => setSrc(avatarUrl(handle, photo)), [handle, photo]);
  return (
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      className="shrink-0 rounded-full bg-panel-3 object-cover"
      style={{ width: size, height: size }}
      onError={() => setSrc(avatarUrl(handle))}
    />
  );
}

function TrendPage({ onClose, faces, live }: { onClose: () => void; faces: Record<string, string>; live: string[] }) {
  const [filter, setFilter] = useState<"hot" | "debate" | "news" | "topics">("hot");
  const [rows, setRows] = useState<(TakeRow & { score?: number })[]>([]);
  const [topics, setTopics] = useState<{ word: string; n: number }[]>([]);
  const [next, setNext] = useState(0);
  const [busy, setBusy] = useState(false);
  function load(offset: number, f: typeof filter, append: boolean) {
    setBusy(true);
    void listTrending({ data: { offset, filter: f === "topics" ? "hot" : f } })
      .then((r) => {
        setRows((cur) => (append ? [...cur, ...r.takes.filter((t) => !cur.some((c) => c.id === t.id))] : r.takes));
        setTopics(r.topics);
        setNext(r.next);
      })
      .catch(() => {
        if (!append) setRows([]);
      })
      .finally(() => setBusy(false));
  }
  useEffect(() => {
    load(0, filter, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);
  const chips = [
    ["hot", "Hot takes"],
    ["debate", "Fact or Cap"],
    ["news", "News"],
    ["topics", "Topics"],
  ] as const;
  return (
    <div className="pb-2">
      <button type="button" className="mb-2 text-[14px] font-semibold text-lime-2" onClick={onClose}>
        ← Back
      </button>
      <h2 className="text-lg font-extrabold">Trending <Tip text="Last 48 hours. Ranked by likes, reposts, replies, and Fact or Cap." /></h2>
      <div className="mt-3 flex gap-1.5 overflow-x-auto pb-2">
        {chips.map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`soc-chip shrink-0 px-3 py-1 text-[12px] ${filter === id ? "on" : ""}`}
            onClick={() => setFilter(id)}
          >
            {label}
          </button>
        ))}
      </div>
      {filter === "topics" ? (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {topics.length === 0 ? <p className="text-[12px] text-muted">No topics in this window yet.</p> : null}
          {topics.map((t) => (
            <span key={t.word} className="rounded-full border border-line px-2.5 py-1 text-[12px]">
              {t.word} · {t.n}
            </span>
          ))}
        </div>
      ) : null}
      <div className="space-y-2">
        {rows.length === 0 && !busy ? <p className="py-6 text-center text-[13px] text-muted">Nothing is moving in this filter yet.</p> : null}
        {rows.map((t) => (
          <article key={t.id} className="glass-3d px-2.5 py-2">
            <div className="flex items-center gap-1.5">
              <Face handle={t.handle} photo={faces[t.handle.toLowerCase()]} size={28} />
              <a href={`/u/${encodeURIComponent(t.handle)}`} className="min-w-0 flex-1">
                <div className="flex items-center gap-1 text-[13px] font-semibold">
                  <span className="truncate">{t.name || t.handle}</span>
                  {live.includes(t.handle.toLowerCase()) ? <span className="live-dot" /> : null}
                  {t.verified ? <VerifiedMark /> : null}
                </div>
                <div className="text-[11px] text-muted">@{t.handle} · {timeAgo(t.ts)}</div>
              </a>
              <span className="trend-chip">{t.score || heatOf(t)}</span>
            </div>
            <p className="mt-1.5 whitespace-pre-wrap text-[13px] leading-snug"><LinkText text={t.body} /></p>
            {t.fact + t.cap > 0 ? (
              <div className="mt-1 text-[11px] text-muted">Fact {pct(t.fact, t.cap)}% · Cap {100 - pct(t.fact, t.cap)}%</div>
            ) : null}
            <div className="mt-1 text-[11px] text-muted">{t.comments} replies · {t.reposts} reposts · {t.likes} likes</div>
          </article>
        ))}
      </div>
      {next > 0 ? (
        <button type="button" disabled={busy} className="btn-join mt-3 mb-6 w-full rounded-xl py-2.5 text-[13px] font-bold disabled:opacity-50" onClick={() => load(next, filter, true)}>
          {busy ? "Loading" : "Load more"}
        </button>
      ) : null}
    </div>
  );
}

const KEY = "kilode-takes-v3";

const bag = new Map<string, unknown>();

export function readBag<T>(key: string, fallback: T): T {
  if (bag.has(key)) return bag.get(key) as T;
  if (typeof window === "undefined") return fallback;
  try {
    const raw = sessionStorage.getItem("kbag:" + key);
    if (!raw) return fallback;
    const value = JSON.parse(raw) as T;
    bag.set(key, value);
    return value;
  } catch {
    return fallback;
  }
}

export function writeBag(key: string, value: unknown) {
  bag.set(key, value);
  try {
    sessionStorage.setItem("kbag:" + key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

export function linksFrom(rows: ConnectRow[]) {
  const next: Record<string, "out" | "in" | "ask"> = {};
  for (const r of rows) {
    const state = r.dir === "friend" ? "in" : r.dir === "out" ? "out" : r.dir === "in" ? "ask" : undefined;
    if (!state) continue;
    if (next[r.id] !== "in") next[r.id] = state;
    const handle = (r.handle || "").toLowerCase();
    if (handle && next[handle] !== "in") next[handle] = state;
  }
  return next;
}

function bootCache(): { takes: TakeRow[]; fellows: FellowRow[] } {
  if (typeof window === "undefined") return { takes: [], fellows: [] };
  try {
    const j = JSON.parse(localStorage.getItem(KEY) || "") as { takes?: TakeRow[]; fellows?: FellowRow[] };
    if (Array.isArray(j.takes)) return { takes: j.takes, fellows: Array.isArray(j.fellows) ? j.fellows : [] };
  } catch {
    /* first open */
  }
  return { takes: [], fellows: [] };
}

function writeCache(takes: TakeRow[], fellows: FellowRow[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ takes: takes.slice(0, 40), fellows }));
  } catch {
    /* ignore */
  }
}

export function rememberTake(take: TakeRow, notify = true) {
  const cur = bootCache();
  const takes = [take, ...cur.takes.filter((t) => t.id !== take.id)].slice(0, 40);
  writeCache(takes, cur.fellows);
  if (notify) window.dispatchEvent(new CustomEvent("kilode:take", { detail: take }));
}

export async function shareNewsToSocials(p: { title: string; excerpt?: string; author?: string; category?: string; caption?: string; href?: string }) {
  const caption = (p.caption || "").trim();
  const body = (caption || p.title).slice(0, 280);
  const href = (p.href || "").startsWith("/p/") ? p.href : "";
  const r = await saveTake({
    data: {
      body,
      kind: "quote",
      quoteName: (p.author || "Kilode").slice(0, 40),
      quoteHandle: (p.author || "kilode").toLowerCase().replace(/[^a-z0-9._-]+/g, "").slice(0, 24) || "kilode",
      quoteBody: (caption ? p.title : p.excerpt || p.category || "From Feeds").slice(0, 180),
      quoteHref: href,
    },
  });
  if (r.ok) rememberTake(r.take);
  return r;
}

const REPORTS = ["Spam", "Scam or fraud", "Harassment or hate", "Nudity or sexual", "Misinformation", "Other"] as const;

const KINDS: { id: TakeKind; label: string }[] = [
  { id: "news", label: "News" },
  { id: "take", label: "Take" },
  { id: "job", label: "Job" },
  { id: "music", label: "Music" },
  { id: "banter", label: "Debate" },
];

const HINT: Record<string, string> = {
  news: "News is one short line. People mark it Fact or Cap.",
  take: "Take is your opinion. People mark it Fact or Cap.",
  job: "Job is a role. Add pay and place. A seeker can apply once.",
  music: "Music is a song link. Play opens Spotify, Audiomack, Apple, or YouTube.",
  banter: "Debate is two sides. People pick For or Against.",
};

function pillsFor(account: string) {
  if (account === "artist") return KINDS.filter((k) => k.id === "take" || k.id === "music" || k.id === "banter");
  if (account === "job_poster") return KINDS.filter((k) => k.id === "take" || k.id === "job" || k.id === "banter");
  if (account === "writer") return KINDS.filter((k) => k.id === "news" || k.id === "take" || k.id === "banter");
  return KINDS.filter((k) => k.id === "news" || k.id === "take" || k.id === "banter");
}

function pct(a: number, b: number) {
  const t = a + b;
  if (!t) return 50;
  return Math.round((a / t) * 100);
}

function needLogin(e: unknown) {
  const m = e instanceof Error ? e.message : String(e || "");
  return /unauthor|sign in|forbidden/i.test(m);
}

let wantSocialTrend = false;
const seenOnce = new Set<string>();
/** Header fire: open Socials on the trending page. */
export function openSocialTrending() {
  wantSocialTrend = true;
  if (typeof window !== "undefined") window.dispatchEvent(new Event("kilode:socials-trend"));
}
export function openSocialFellows() {
  wantSocialTrend = false;
  if (typeof window !== "undefined") window.dispatchEvent(new Event("kilode:socials-fellows"));
}

const SOCIAL_CUTS = [
  ["all", "For you"],
  ["following", "Following"],
  ["trending", "Trending"],
  ["topics", "Topics"],
  ["saved", "Saved"],
] as const;

function LiquidCuts({ value, onPick }: { value: string; onPick: (id: (typeof SOCIAL_CUTS)[number][0]) => void }) {
  const rail = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const root = rail.current;
    const pill = root?.querySelector<HTMLElement>(".liquid-pill");
    const el = root?.querySelector<HTMLButtonElement>(`[data-cut="${value}"]`);
    if (!root || !pill) return;
    if (!el) {
      pill.style.width = "0px";
      return;
    }
    pill.style.width = `${el.offsetWidth}px`;
    pill.style.transform = `translate3d(${el.offsetLeft}px,0,0)`;
  }, [value]);
  return (
    <div className="liquid-rail" ref={rail} role="tablist" aria-label="Socials">
      <span className="liquid-pill" />
      {SOCIAL_CUTS.map(([id, label]) => (
        <button key={id} type="button" data-cut={id} role="tab" aria-selected={value === id} className={value === id ? "on" : ""} onClick={() => onPick(id)}>
          {label}
        </button>
      ))}
    </div>
  );
}

export function SocialsFeed({ authed, account = "member", me = "", face = "", lane = "posts", onOpenPeople, onOpenFeed }: { authed: boolean; account?: string; me?: string; face?: string; lane?: "people" | "posts"; onOpenPeople?: () => void; onOpenFeed?: () => void }) {
  const pills = pillsFor(account);
  const boot = bootCache();
  const [takes, setTakes] = useState<TakeRow[]>(boot.takes);
  const [booted, setBooted] = useState(boot.takes.length > 0);
  const [fellows, setFellows] = useState<FellowRow[]>(boot.fellows);
  const [next, setNext] = useState(0);
  const [err, setErr] = useState("");
  const [body, setBody] = useState("");
  const [place, setPlace] = useState("");
  const [alt, setAlt] = useState("");
  const [circle, setCircle] = useState<"" | "followers">("");
  const [linkNote, setLinkNote] = useState("");
  const [shot, setShot] = useState("");
  const [clip, setClip] = useState("");
  const [mediaBusy, setMediaBusy] = useState(false);
  const [videoCap, setVideoCap] = useState(15);
  const [pendingClip, setPendingClip] = useState<{ file: File; duration: number; start: number } | null>(null);
  const [spaces, setSpaces] = useState<SpaceCard[]>([]);
  const trimHold = useRef(false);
  const clipping = useRef(false);
  const trimTimer = useRef(0);
  const [line, setLine] = useState("");
  const [kind, setKind] = useState<TakeKind>("take");
  const draftReady = useRef(false);
  useEffect(() => {
    try {
      const saved = localStorage.getItem("kilode-take-draft") || "";
      if (saved) setBody((cur) => cur || saved);
    } catch { /* ignore */ }
    draftReady.current = true;
  }, []);
  useEffect(() => {
    if (!draftReady.current || !body) return;
    try { localStorage.setItem("kilode-take-draft", body); } catch { /* ignore */ }
  }, [body]);
  useEffect(() => {
    if (!pillsFor(account).some((k) => k.id === kind)) setKind("take");
  }, [account, kind]);
  useEffect(() => {
    void getPublicSite().then((s) => {
      setVideoCap(s.takeVideoSeconds || 15);
      setSounds(s.soundsOn !== false);
    }).catch(() => undefined);
    void listPublicSpaces({ data: {} }).then((rows) => setSpaces(Array.isArray(rows) ? rows.slice(0, 8) : [])).catch(() => setSpaces([]));
  }, []);
  const [busy, setBusy] = useState(false);
  const [linked, setLinked] = useState<Record<string, "out" | "in" | "ask">>(() => linksFrom(readBag<ConnectRow[]>("connects", [])));
  const [following, setFollowing] = useState<Record<string, true>>({});
  const [followsYou, setFollowsYou] = useState<Record<string, true>>({});
  const [followTakes, setFollowTakes] = useState<TakeRow[]>([]);
  const [followNext, setFollowNext] = useState(0);
  const [followLoaded, setFollowLoaded] = useState(false);
  const [feedCut, setFeedCut] = useState<"all" | "following" | "trending" | "tag" | "topics" | "saved">("all");
  const [myTags, setMyTags] = useState<string[]>([]);
  const [topicTakes, setTopicTakes] = useState<TakeRow[]>([]);
  const [topicLoaded, setTopicLoaded] = useState(false);
  const [savedTakes, setSavedTakes] = useState<TakeRow[]>([]);
  const [savedLoaded, setSavedLoaded] = useState(false);
  const [pings, setPings] = useState<Record<string, true>>({});
  const [tag, setTag] = useState("");
  const [tagTakes, setTagTakes] = useState<TakeRow[]>([]);
  const [tagNext, setTagNext] = useState(0);
  const [trendTakes, setTrendTakes] = useState<TakeRow[]>([]);
  const [trendNext, setTrendNext] = useState(0);
  const [trendLoaded, setTrendLoaded] = useState(false);
  const [saved, setSaved] = useState<Record<string, true>>({});
  const [blocked, setBlocked] = useState<Record<string, true>>({});
  const [muted, setMuted] = useState<Record<string, true>>({});
  const [quoting, setQuoting] = useState<TakeRow | null>(null);
  const [suggested, setSuggested] = useState<{ id: string; handle: string; role: string; mutuals: number; photo?: string }[]>([]);
  const likeLock = useRef(new Set<string>());
  const [dmFor, setDmFor] = useState<FellowRow | null>(null);
  const [dmBody, setDmBody] = useState("");
  const [dmNote, setDmNote] = useState("");
  const [dmBusy, setDmBusy] = useState(false);
  const [openReply, setOpenReply] = useState("");
  const [stage, setStage] = useState<null | { id: string; mode: "thread" | "photo" }>(null);
  const [reply, setReply] = useState("");
  const [replyShot, setReplyShot] = useState("");
  const [replySort, setReplySort] = useState<"new" | "top">("new");
  const [threads, setThreads] = useState<Record<string, TakeReply[]>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [applied, setApplied] = useState<Record<string, boolean>>({});
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const [reposted, setReposted] = useState<Record<string, boolean>>({});
  const [voted, setVoted] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState("");
  const [q, setQ] = useState("");
  const [people, setPeople] = useState<{ handle: string; name: string; role: string; line: string; verified: number }[]>([]);
  const [live, setLive] = useState<string[]>([]);
  const [faces, setFaces] = useState<Record<string, string>>({});
  const [likeFaces, setLikeFaces] = useState<Record<string, { handle: string; photo: string }[]>>({});
  const [trendOpen, setTrendOpen] = useState(false);
  useEffect(() => {
    const ids = [...takes, ...followTakes, ...trendTakes, ...tagTakes].map((t) => t.id).filter(Boolean).slice(0, 40);
    if (!ids.length) return;
    let dead = false;
    void listLikeFaces({ data: { ids } })
      .then((rows) => {
        if (dead) return;
        const next: Record<string, { handle: string; photo: string }[]> = {};
        for (const r of rows) {
          const bag = next[r.takeId] || [];
          if (!bag.some((x) => x.handle === r.handle)) bag.push({ handle: r.handle, photo: r.photo });
          next[r.takeId] = bag;
        }
        setLikeFaces(next);
      })
      .catch(() => undefined);
    return () => {
      dead = true;
    };
  }, [takes, followTakes, trendTakes, tagTakes]);
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("take") || "";
    if (!id) return;
    let dead = false;
    void getTake({ data: id }).then((t) => {
      if (dead || !t) return;
      setTakes((list) => (list.some((x) => x.id === t.id) ? list : [t, ...list]));
      setOpenReply(id);
      void listTakeReplies({ data: { id } }).then((rows) => {
        if (!dead) setThreads((m) => ({ ...m, [id]: rows }));
      });
      window.setTimeout(() => {
        document.querySelector(`[data-take="${CSS.escape(id)}"]`)?.scrollIntoView({ block: "center" });
      }, 350);
    });
    return () => {
      dead = true;
    };
  }, []);
  useEffect(() => {
    const onTrend = () => {
      wantSocialTrend = false;
      setTrendOpen(true);
    };
    const onFellows = () => {
      wantSocialTrend = false;
      setTrendOpen(false);
    };
    if (wantSocialTrend) onTrend();
    window.addEventListener("kilode:socials-trend", onTrend);
    window.addEventListener("kilode:socials-fellows", onFellows);
    return () => {
      window.removeEventListener("kilode:socials-trend", onTrend);
      window.removeEventListener("kilode:socials-fellows", onFellows);
    };
  }, []);
  const [reportId, setReportId] = useState("");
  const [menuTake, setMenuTake] = useState<TakeRow | null>(null);
  const [editTake, setEditTake] = useState<TakeRow | null>(null);
  const [editBody, setEditBody] = useState("");
  const [words, setWords] = useState<string[]>([]);
  const [hiddenIds, setHiddenIds] = useState<Record<string, true>>({});
  const [mentions, setMentions] = useState<{ handle: string; role: string }[]>([]);
  const [reportNote, setReportNote] = useState("");

  function goLogin() {
    window.location.href = "/login?mode=up";
  }

  useEffect(() => {
    const onTake = (e: Event) => {
      const take = (e as CustomEvent<TakeRow>).detail;
      if (!take?.id) return;
      setTakes((list) => [take, ...list.filter((t) => t.id !== take.id)]);
    };
    window.addEventListener("kilode:take", onTake);
    let dead = false;
    void listTakes()
      .then((r) => {
        if (dead) return;
        setTakes((cur) => {
          const server = r.takes;
          const local = cur.filter((t) => !server.some((s) => s.id === t.id) && !t.id.startsWith("seed-"));
          const merged = [...local, ...server];
          return merged.filter((t, i) => merged.findIndex((x) => x.id === t.id) === i);
        });
        setFellows(r.fellows);
        setNext(r.next);
        setLive(Array.isArray(r.live) ? r.live : []);
        setFaces(r.faces && typeof r.faces === "object" ? r.faces : {});
        writeCache(r.takes, r.fellows);
        setBooted(true);
      })
      .catch(() => {
        if (!dead && takes.length === 0) setErr("Socials will retry. You can still write.");
        if (!dead) setBooted(true);
      });
    return () => {
      dead = true;
      window.removeEventListener("kilode:take", onTake);
    };
  }, []);

  useEffect(() => {
    if (!authed) return;
    void listConnects()
      .then((rows) => {
        const next: Record<string, "out" | "in" | "ask"> = {};
        for (const r of rows) {
          const state = r.dir === "friend" ? "in" : r.dir === "out" ? "out" : r.dir === "in" ? "ask" : undefined;
          if (!state) continue;
          if (next[r.id] !== "in") next[r.id] = state;
          const handle = (r.handle || "").toLowerCase();
          if (handle && next[handle] !== "in") next[handle] = state;
        }
        setLinked(next);
        writeBag("connects", rows);
      })
      .catch(() => undefined);
  }, [authed]);

  useEffect(() => {
    if (!authed) return;
    void listMyFollows()
      .then((r) => {
        const next: Record<string, true> = {};
        for (const p of r.following) {
          if (p.id) next[p.id] = true;
          if (p.handle) next[p.handle.toLowerCase()] = true;
        }
        const you: Record<string, true> = {};
        for (const p of r.followers) {
          if (p.id) you[p.id] = true;
          if (p.handle) you[p.handle.toLowerCase()] = true;
        }
        setFollowing(next);
        setFollowsYou(you);
      })
      .catch(() => undefined);
    void suggestFollows()
      .then(setSuggested)
      .catch(() => setSuggested([]));
    void listSavedTakeIds()
      .then((ids) => {
        const next: Record<string, true> = {};
        for (const id of ids) next[id] = true;
        setSaved(next);
      })
      .catch(() => undefined);
    void listMyBlocks()
      .then((rows) => {
        const next: Record<string, true> = {};
        for (const row of rows) if (row.handle) next[row.handle.toLowerCase()] = true;
        setBlocked(next);
      })
      .catch(() => undefined);
    void listMyTags()
      .then((rows) => setMyTags(rows))
      .catch(() => undefined);
    void listWordMutes()
      .then((rows) => setWords(rows))
      .catch(() => undefined);
    void listMyMutes()
      .then((rows) => {
        const next: Record<string, true> = {};
        for (const row of rows) if (row.handle) next[row.handle.toLowerCase()] = true;
        setMuted(next);
      })
      .catch(() => undefined);
  }, [authed]);

  useEffect(() => {
    const onBlock = (e: Event) => {
      const handle = String((e as CustomEvent<string>).detail || "").toLowerCase();
      if (!handle) return;
      setBlocked((m) => ({ ...m, [handle]: true }));
    };
    const onUnblock = (e: Event) => {
      const handle = String((e as CustomEvent<string>).detail || "").toLowerCase();
      if (!handle) return;
      setBlocked((m) => {
        const next = { ...m };
        delete next[handle];
        return next;
      });
    };
    window.addEventListener("kilode:block", onBlock);
    window.addEventListener("kilode:unblock", onUnblock);
    const onMute = (e: Event) => {
      const handle = String((e as CustomEvent<string>).detail || "").toLowerCase();
      if (!handle) return;
      setMuted((m) => ({ ...m, [handle]: true }));
    };
    const onUnmute = (e: Event) => {
      const handle = String((e as CustomEvent<string>).detail || "").toLowerCase();
      if (!handle) return;
      setMuted((m) => {
        const next = { ...m };
        delete next[handle];
        return next;
      });
    };
    window.addEventListener("kilode:mute", onMute);
    window.addEventListener("kilode:unmute", onUnmute);
    return () => {
      window.removeEventListener("kilode:block", onBlock);
      window.removeEventListener("kilode:unblock", onUnblock);
      window.removeEventListener("kilode:mute", onMute);
      window.removeEventListener("kilode:unmute", onUnmute);
    };
  }, []);

  useEffect(() => {
    if (!authed || feedCut !== "following" || followLoaded) return;
    let dead = false;
    void listFollowingTakes()
      .then((r) => {
        if (dead) return;
        setFollowTakes(r.takes);
        setFollowNext(r.next);
        setFollowLoaded(true);
      })
      .catch(() => {
        if (!dead) setFollowLoaded(true);
      });
    return () => {
      dead = true;
    };
  }, [authed, feedCut, followLoaded]);

  useEffect(() => {
    const onTag = (e: Event) => {
      const next = String((e as CustomEvent<string>).detail || "").toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 24);
      if (next.length < 2) return;
      setTag(next);
      setFeedCut("tag");
      setTagTakes([]);
      setTagNext(0);
    };
    window.addEventListener("kilode:tag", onTag);
    return () => window.removeEventListener("kilode:tag", onTag);
  }, []);

  useEffect(() => {
    if (feedCut !== "tag" || tag.length < 2) return;
    let dead = false;
    void listTakesByTag({ data: { tag } })
      .then((r) => {
        if (dead) return;
        setTagTakes(r.takes);
        setTagNext(r.next);
      })
      .catch(() => {
        if (!dead) setTagTakes([]);
      });
    return () => {
      dead = true;
    };
  }, [feedCut, tag]);

  useEffect(() => {
    if (feedCut !== "trending" || trendLoaded) return;
    let dead = false;
    void listTrending()
      .then((r) => {
        if (dead) return;
        setTrendTakes(r.takes);
        setTrendNext(r.next);
        setTrendLoaded(true);
      })
      .catch(() => {
        if (!dead) setTrendLoaded(true);
      });
    return () => {
      dead = true;
    };
  }, [feedCut, trendLoaded]);

  useEffect(() => {
    if (feedCut !== "topics" || topicLoaded) return;
    let dead = false;
    void listTopicTakes()
      .then((rows) => {
        if (dead) return;
        setTopicTakes(rows);
        setTopicLoaded(true);
      })
      .catch(() => {
        if (!dead) setTopicLoaded(true);
      });
    return () => {
      dead = true;
    };
  }, [feedCut, topicLoaded]);

  useEffect(() => {
    if (feedCut !== "saved" || savedLoaded) return;
    let dead = false;
    void listSavedTakes()
      .then((rows) => {
        if (dead) return;
        setSavedTakes(rows);
        setSavedLoaded(true);
      })
      .catch(() => {
        if (!dead) setSavedLoaded(true);
      });
    return () => {
      dead = true;
    };
  }, [feedCut, savedLoaded]);

  function theyFollow(handle: string, id?: string) {
    return !!(followsYou[(handle || "").toLowerCase()] || (id && followsYou[id]));
  }

  function followLabel(handle: string, id?: string) {
    if (followed(handle, id)) return "Following";
    if (theyFollow(handle, id)) return "Follow back";
    return "Follow";
  }

  function followed(handle: string, id?: string) {
    return !!(following[(handle || "").toLowerCase()] || (id && following[id]));
  }

  function flipFollow(handle: string, id?: string) {
    if (!authed) return goLogin();
    const h = (handle || "").toLowerCase();
    if (!h && !id) return;
    const was = followed(handle, id);
    setFollowing((m) => {
      const next = { ...m };
      if (was) {
        if (h) delete next[h];
        if (id) delete next[id];
      } else {
        if (h) next[h] = true;
        if (id) next[id] = true;
      }
      return next;
    });
    void toggleFollow({ data: { id, handle } })
      .then((r) => {
        if (!r.ok) {
          setFollowing((m) => {
            const next = { ...m };
            if (was) {
              if (h) next[h] = true;
              if (id) next[id] = true;
            } else {
              if (h) delete next[h];
              if (id) delete next[id];
            }
            return next;
          });
          if (r.reason) setErr(r.reason);
          return;
        }
        setFollowing((m) => {
          const next = { ...m };
          if (r.on) {
            if (h) next[h] = true;
            if (id) next[id] = true;
          } else {
            if (h) delete next[h];
            if (id) delete next[id];
          }
          return next;
        });
        if (r.on) setSuggested((list) => list.filter((p) => p.handle.toLowerCase() !== h && p.id !== id));
        else if (h) setFollowTakes((list) => list.filter((t) => (t.handle || "").toLowerCase() !== h));
      })
      .catch((e) => {
        if (needLogin(e)) goLogin();
        setFollowing((m) => {
          const next = { ...m };
          if (was) {
            if (h) next[h] = true;
            if (id) next[id] = true;
          } else {
            if (h) delete next[h];
            if (id) delete next[id];
          }
          return next;
        });
      });
  }

  useEffect(() => {
    try {
      const saved = localStorage.getItem("kilode-take-draft") || "";
      if (saved && !body) setBody(saved.slice(0, 280));
    } catch { /* private mode */ }
    // restore once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    const t = window.setTimeout(() => {
      try {
        if (body.trim()) localStorage.setItem("kilode-take-draft", body.slice(0, 280));
        else localStorage.removeItem("kilode-take-draft");
      } catch { /* ignore */ }
    }, 400);
    return () => window.clearTimeout(t);
  }, [body]);

  useEffect(() => {
    const hit = body.match(/(^|\s)@([a-z0-9._-]{1,24})$/i);
    const q = hit?.[2]?.toLowerCase() || "";
    if (q.length < 1) {
      setMentions([]);
      return;
    }
    const t = window.setTimeout(() => {
      void searchPeople({ data: { q } })
        .then((rows) => setMentions(rows.slice(0, 4).map((p) => ({ handle: p.handle, role: p.role }))))
        .catch(() => setMentions([]));
    }, 180);
    return () => window.clearTimeout(t);
  }, [body]);

  useEffect(() => {
    const needle = q.trim();
    if (needle.length < 2) {
      setPeople([]);
      return;
    }
    const t = window.setTimeout(() => {
      void searchPeople({ data: { q: needle } })
        .then(setPeople)
        .catch(() => setPeople([]));
    }, 250);
    return () => window.clearTimeout(t);
  }, [q]);

  async function keepClip(file: File, start: number) {
    if (clipping.current) return;
    clipping.current = true;
    setPendingClip(null);
    setMediaBusy(true);
    setErr("");
    try {
      const blob = await trimTakeVideo(file, start, videoCap);
      const cut = new File([blob], "clip.webm", { type: blob.type || "video/webm" });
      const r = await uploadTakeMedia(cut, { maxSeconds: videoCap + 2 });
      setClip(r.url);
    } catch (err) {
      setErr(err instanceof Error ? err.message : "Could not trim that video.");
    } finally {
      clipping.current = false;
      setMediaBusy(false);
    }
  }

  async function post() {
    if (!authed) return goLogin();
    const text = body.trim();
    if (!text) {
      setErr("Write something first.");
      return;
    }
    if (kind === "job" && line.trim().length < 2) {
      setErr("Add the role details. Pay, place, or years.");
      return;
    }
    setBusy(true);
    setErr("");
    const pending = saveTake({
      data: quoting
        ? { body: text, kind: "quote", quoteName: quoting.name, quoteHandle: quoting.handle, quoteBody: quoting.body, image: shot, video: clip, circle }
        : { body: text, kind, line, image: shot, video: clip, place, alt, circle },
    });
    const timeout = new Promise<{ ok: false; reason: string }>((resolve) => {
      window.setTimeout(() => resolve({ ok: false, reason: "The server took too long. Try Post again." }), 12000);
    });
    try {
      const r = await Promise.race([pending, timeout]);
      if (!r.ok) setErr(r.reason);
      else {
        setTakes((list) => [r.take, ...list.filter((t) => t.id !== r.take.id)]);
        rememberTake(r.take, false);
        setBody("");
        setPlace("");
        setAlt("");
        setLine("");
        setShot("");
        setClip("");
        setCircle("");
        setQuoting(null);
        setMentions([]);
        kilodeSound("sent");
        try { localStorage.removeItem("kilode-take-draft"); } catch { /* ignore */ }
      }
    } catch (e) {
      if (needLogin(e)) goLogin();
      else setErr("Could not post. Try again.");
    } finally {
      setBusy(false);
    }
  }

  function patch(id: string, fn: (t: TakeRow) => TakeRow) {
    setTakes((list) => list.map((t) => (t.id === id ? fn(t) : t)));
  }

  async function vote(id: string, side: "fact" | "cap" | "a" | "b") {
    if (!authed) return goLogin();
    if (voted[id] === side || busyId === id) return;
    const prev = voted[id];
    setVoted((m) => ({ ...m, [id]: side }));
    setBusyId(id);
    patch(id, (t) => {
      const next = { ...t };
      if (prev === "fact") next.fact = Math.max(0, next.fact - 1);
      if (prev === "cap") next.cap = Math.max(0, next.cap - 1);
      if (prev === "a") next.voteA = Math.max(0, next.voteA - 1);
      if (prev === "b") next.voteB = Math.max(0, next.voteB - 1);
      if (side === "fact") next.fact += 1;
      if (side === "cap") next.cap += 1;
      if (side === "a") next.voteA += 1;
      if (side === "b") next.voteB += 1;
      return next;
    });
    try {
      const r = await voteTake({ data: { id, side } });
      if (!r.ok) setVoted((m) => ({ ...m, [id]: prev || "" }));
    } catch (e) {
      setVoted((m) => ({ ...m, [id]: prev || "" }));
      if (needLogin(e)) goLogin();
    } finally {
      setBusyId("");
    }
  }

  function linkState(f: FellowRow) {
    return linked[f.id] || linked[(f.handle || "").toLowerCase()];
  }

  const [fellowCap, setFellowCap] = useState(8);
  const needle = q.trim().toLowerCase();
  const mineHandle = me.trim().toLowerCase();
  const hidden = (handle: string) => !!(blocked[(handle || "").toLowerCase()] || muted[(handle || "").toLowerCase()]);
  const pool = fellows.filter((f) => f.handle && f.handle.toLowerCase() !== mineHandle && !hidden(f.handle));
  const matched = needle
    ? pool.filter((f) => `${f.name} ${f.handle} ${f.role}`.toLowerCase().includes(needle))
    : pool;
  const shownFellows = matched.slice(0, fellowCap);
  const takeSource = feedCut === "following" ? followTakes : feedCut === "trending" ? trendTakes : feedCut === "tag" ? tagTakes : feedCut === "topics" ? topicTakes : feedCut === "saved" ? savedTakes : takes;
  const shownTakes = takeSource.filter((t) => {
    if (hidden(t.handle) || hiddenIds[t.id]) return false;
    if (words.some((word) => t.body.toLowerCase().includes(word))) return false;
    if (!needle) return true;
    return `${t.name} ${t.handle} ${t.role} ${t.body}`.toLowerCase().includes(needle);
  });
  const seenKey = shownTakes.slice(0, 8).map((t) => t.id).join(",");
  useEffect(() => {
    const ids = seenKey.split(",").filter((id) => id && !seenOnce.has(id));
    if (!ids.length) return;
    for (const id of ids) seenOnce.add(id);
    let seen: string[] = [];
    try { seen = JSON.parse(sessionStorage.getItem("kilode-seen") || "[]"); } catch { seen = []; }
    const fresh = ids.filter((id) => !seen.includes(id));
    try { sessionStorage.setItem("kilode-seen", JSON.stringify([...seen, ...ids].slice(-400))); } catch { /* ignore */ }
    for (const id of fresh.length ? fresh : ids) {
      if (seen.includes(id)) continue;
      void seeTake({ data: { id } }).then((r) => {
        if (r.ok && r.views) patch(id, (row) => ({ ...row, views: r.views }));
      });
    }
  }, [seenKey]);
  const liveTags = (() => {
    const bag = new Map<string, number>();
    const re = /#([A-Za-z0-9_]{2,24})/g;
    for (const t of takes) {
      re.lastIndex = 0;
      let hit: RegExpExecArray | null;
      while ((hit = re.exec(t.body))) bag.set(hit[1].toLowerCase(), (bag.get(hit[1].toLowerCase()) || 0) + 1);
    }
    return [...bag.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name]) => name);
  })();

  if (trendOpen) {
    return (
      <div className="mb-3">
        <TrendPage onClose={() => setTrendOpen(false)} faces={faces} live={live} />
      </div>
    );
  }

  return (
    <div className="mb-3">
      <label className="mb-3 block">
        <span className="sr-only">Find a member</span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search @username, people, topics..."
          className="soc-find w-full px-3 py-2 outline-none"
          style={{ fontSize: 16 }}
        />
      </label>
      {people.length > 0 ? (
        <div className="soc-people">
          {people.map((p) => (
            <div key={p.handle} className="soc-person">
              <a href={`/u/${encodeURIComponent(p.handle)}`}>
                <img src={avatarUrl(p.handle)} alt="" />
                <span>
                  <strong>@{p.handle}</strong>
                  <em>{p.role}{p.line ? ` · ${p.line}` : ""}</em>
                </span>
              </a>
              <button type="button" className={followed(p.handle) ? "on" : ""} onClick={() => flipFollow(p.handle)}>
                {followLabel(p.handle)}
              </button>
            </div>
          ))}
        </div>
      ) : null}
      {lane === "posts" ? (
        <div className="soc-tools mb-2">
          <button type="button" className="soc-tool" onClick={() => onOpenPeople?.()}>Connect</button>
          <button type="button" className="soc-tool" onClick={() => setTrendOpen(true)}>Trending</button>
          <button type="button" className="soc-tool" onClick={() => window.dispatchEvent(new CustomEvent("kilode:goto", { detail: { screen: "market" } }))}>Market</button>
          <button type="button" className="soc-tool" onClick={() => window.dispatchEvent(new CustomEvent("kilode:goto", { detail: { screen: "teams" } }))}>Groups</button>
        </div>
      ) : (
        <button type="button" className="mb-2 text-[12px] font-semibold text-fg" onClick={() => onOpenFeed?.()}>
          Back to the feed
        </button>
      )}
      {lane !== "posts" ? (
      <>
      <SocialDesk takes={takes} fellows={fellows} me={me} />
      <div className="mb-2">
        <div className="mb-1.5 text-[12px] font-semibold text-fg">Connect with Fellows</div>
        <div className="flex gap-1.5">
          <button
            type="button"
            className="soc-chip px-2.5 py-1 text-[12px]"
            onClick={() => setTrendOpen(true)}
          >
            Trending
          </button>
          <button
            type="button"
            className="rounded-full border border-line bg-transparent px-2.5 py-1 text-[12px] font-semibold text-fg"
            onClick={() => window.dispatchEvent(new CustomEvent("kilode:goto", { detail: { screen: "market" } }))}
          >
            Marketplace
          </button>
          <button
            type="button"
            className="rounded-full border border-line bg-transparent px-2.5 py-1 text-[12px] font-semibold text-fg"
            onClick={() => window.dispatchEvent(new CustomEvent("kilode:goto", { detail: { screen: "teams" } }))}
          >
            Groups
          </button>
        </div>
      </div>
      <div className="-mx-1 mb-3 flex gap-2 overflow-x-auto px-1 pb-1">
        {shownFellows.length === 0 ? <p className="px-1 text-[11px] text-muted">Real members show here after they join.</p> : null}
        {shownFellows.map((f) => (
          <div key={f.id} className="relative w-[168px] shrink-0 glass-3d px-2.5 py-2">
            <div className="absolute right-1.5 top-1.5">
              <ReportMenu handle={f.handle} signedIn={authed} />
            </div>
            <a href={`/u/${encodeURIComponent(f.handle)}`} className="flex items-center gap-1.5 pr-5">
              <Face handle={f.handle} photo={f.photo || faces[f.handle.toLowerCase()]} size={28} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1 text-[12px] font-semibold">
                  <span className="truncate">{f.name}</span>
                  {live.includes(f.handle.toLowerCase()) ? <span className="live-dot" title="Active" /> : null}
                  {f.verified ? <VerifiedMark /> : null}
                </div>
                <div className="truncate text-[10px] text-muted">{f.role}</div>
              </div>
            </a>
            <div className="mt-1 line-clamp-2 text-[10px] leading-snug text-muted">{f.line}</div>
            <div className="mt-1.5 flex gap-1">
              <button
                type="button"
                className={`follow-slim ${followed(f.handle, f.id) ? "on" : ""}`}
                onClick={() => flipFollow(f.handle, f.id)}
              >
                {followLabel(f.handle, f.id)}
              </button>
              <button
                type="button"
                disabled={linkState(f) === "out"}
                className="fellow-act rounded-full border px-2.5 py-1 text-[10px] font-bold disabled:opacity-70"
                onClick={() => {
                  if (!authed) return goLogin();
                  if (linkState(f) === "in") return;
                  if (linkState(f) === "ask") {
                    void replyConnect({ data: { id: f.id, accept: true } }).then((r) => {
                      if (!r.ok) return;
                      setLinked((m) => ({ ...m, [f.id]: "in", [(f.handle || "").toLowerCase()]: "in" }));
                    });
                    return;
                  }
                  setLinked((m) => ({ ...m, [f.id]: "out", [(f.handle || "").toLowerCase()]: "out" }));
                  void connectFellow({ data: { id: f.id } }).then((r) => {
                    if (!r.ok) {
                      setLinked((m) => {
                        const next = { ...m };
                        delete next[f.id];
                        return next;
                      });
                      return;
                    }
                    if (r.status === "accepted") {
                      setLinked((m) => ({ ...m, [f.id]: "in", [(f.handle || "").toLowerCase()]: "in" }));
                    }
                  }).catch((e) => {
                    if (needLogin(e)) goLogin();
                    setLinked((m) => {
                      const next = { ...m };
                      delete next[f.id];
                      return next;
                    });
                  });
                }}
              >
                {linkState(f) === "in" ? "Friends" : linkState(f) === "out" ? "Asked" : linkState(f) === "ask" ? "Accept" : "Connect"}
              </button>
              {linkState(f) === "in" ? (
              <button
                type="button"
                className="soc-chip px-2.5 py-1 text-[10px]"
                onClick={() => {
                  if (!authed) return goLogin();
                  setDmFor(f);
                  setDmBody("");
                  setDmNote("");
                }}
              >
                Message
              </button>
              ) : null}
            </div>
          </div>
        ))}
        {fellowCap < matched.length ? (
          <button type="button" className="w-[88px] shrink-0 rounded-[12px] border border-line text-[11px] font-bold text-lime-2" onClick={() => setFellowCap((n) => n + 8)}>
            Load more
          </button>
        ) : null}
      </div>
      {suggested.length > 0 ? (
        <div className="mb-3">
          <div className="mb-1.5 text-[12px] font-semibold text-fg">People you may know</div>
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {suggested.filter((p) => !hidden(p.handle)).map((p) => (
              <div key={p.id} className="w-[148px] shrink-0 rounded-[12px] border border-line px-2.5 py-2">
                <a href={`/u/${encodeURIComponent(p.handle)}`} className="block truncate text-[12px] font-semibold">@{p.handle}</a>
                <div className="truncate text-[10px] text-muted">{p.mutuals > 0 ? `${p.mutuals} mutual follows` : p.role}</div>
                <button type="button" className="follow-slim mt-1.5" onClick={() => flipFollow(p.handle, p.id)}>
                  {theyFollow(p.handle, p.id) ? "Follow back" : "Follow"}
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {dmFor ? (
        <form
          className="mb-3 glass-3d px-2.5 py-2"
          onSubmit={(e) => {
            e.preventDefault();
            const text = dmBody.trim();
            if (!text || dmBusy) return;
            setDmBusy(true);
            setDmNote("");
            void sendDm({ data: { to: dmFor.handle, body: text } })
              .then((r) => {
                if (r.ok) {
                  setDmBody("");
                  setDmNote(`Sent to @${dmFor.handle}. They see it when they open the bell or Messages.`);
                } else setDmNote(r.reason);
              })
              .catch((err) => {
                if (needLogin(err)) goLogin();
                else setDmNote("Could not send. Try once more.");
              })
              .finally(() => setDmBusy(false));
          }}
        >
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[11px] font-semibold">Message @{dmFor.handle}</span>
            <button type="button" className="text-[10px] text-muted" onClick={() => setDmFor(null)}>
              Close
            </button>
          </div>
          <div className="flex gap-1.5">
            <input
              value={dmBody}
              onChange={(e) => setDmBody(e.target.value)}
              maxLength={500}
              placeholder="Write a message"
              className="min-w-0 flex-1 rounded-[10px] border border-line bg-bg px-2 py-1.5 outline-none"
              style={{ fontSize: 16 }}
            />
            <button type="submit" disabled={dmBusy} className="soc-chip px-2.5 text-[11px] disabled:opacity-60">
              {dmBusy ? "…" : "Send"}
            </button>
          </div>
          {dmNote ? <p className="mt-1 text-[10px] leading-snug text-muted">{dmNote}</p> : null}
        </form>
      ) : null}
      </>
      ) : null}

      {lane !== "people" ? (
      <>
      <LiquidCuts value={feedCut} onPick={(id) => { setTag(""); setFeedCut(id); }} />
      {tag ? (
        <div className="mb-2 flex gap-1.5">
          <button type="button" className="soc-chip on shrink-0 px-2.5 py-1 text-[12px]" onClick={() => setFeedCut("tag")}>#{tag}</button>
          <button
            type="button"
            className="soc-chip shrink-0 px-2.5 py-1 text-[12px]"
            onClick={() => {
              if (!authed) return goLogin();
              void toggleTagFollow({ data: { tag } }).then((r) => {
                if (!r.ok) return;
                setMyTags((list) => r.on ? (list.includes(r.tag) ? list : [...list, r.tag]) : list.filter((x) => x !== r.tag));
                setTopicLoaded(false);
              });
            }}
          >
            {myTags.includes(tag) ? "Following topic" : "Follow topic"}
          </button>
        </div>
      ) : null}
      {liveTags.filter((name) => !myTags.includes(name)).length > 0 && feedCut !== "tag" ? (
        <div className="mb-2 flex gap-1.5 overflow-x-auto">
          {liveTags.filter((name) => !myTags.includes(name)).map((name) => (
            <button key={name} type="button" className="topic-chip shrink-0" onClick={() => { setTag(name); setFeedCut("tag"); setTagTakes([]); }}>
              #{name}
            </button>
          ))}
        </div>
      ) : null}
      {myTags.length > 0 && feedCut !== "tag" ? (
        <div className="mb-2 flex gap-1.5 overflow-x-auto">
          {myTags.map((name) => (
            <button key={name} type="button" className="topic-chip shrink-0" onClick={() => { setTag(name); setFeedCut("tag"); setTagTakes([]); setTopicLoaded(false); }}>
              #{name}
            </button>
          ))}
        </div>
      ) : null}
      <PushStrip />
      <div className="take-compose mb-3 glass-3d px-2.5 py-2">
        {quoting ? (
          <div className="mb-2 flex items-start justify-between gap-2 rounded-[10px] border border-line px-2 py-1.5">
            <p className="line-clamp-2 text-[11px] text-muted">Quoting @{quoting.handle}: {quoting.body}</p>
            <button type="button" className="shrink-0 text-[10px] font-bold text-fg" onClick={() => setQuoting(null)}>Clear</button>
          </div>
        ) : null}
        <div className="flex items-start gap-2">
          <img src={avatarUrl(me || "me", face)} alt="" className="mt-0.5 size-7 rounded-full bg-panel-3 object-cover" />
          <textarea
            id="kilode-take"
            value={body}
            maxLength={280}
            rows={2}
            placeholder="What's happening?"
            className="min-h-9 flex-1 resize-none bg-transparent text-[13px] leading-snug outline-none"
            style={{ fontSize: 16 }}
            onChange={(e) => {
              const v = e.target.value;
              setBody(v);
              const who = mentionQuery(v);
              if (!who) {
                setMentions([]);
                return;
              }
              void searchPeople({ data: { q: who } })
                .then((rows) => setMentions(rows.slice(0, 5).map((p) => ({ handle: p.handle, role: p.role }))))
                .catch(() => setMentions([]));
            }}
          />
        </div>
        <div className="mt-1 flex gap-1.5">
          <input value={place} onChange={(e) => setPlace(e.target.value)} maxLength={40} placeholder="City, optional" className="min-w-0 flex-1 rounded-md border border-line bg-transparent px-2 py-1 text-[12px] outline-none" style={{ fontSize: 16 }} />
          {shot ? <input value={alt} onChange={(e) => setAlt(e.target.value)} maxLength={80} placeholder="Photo note" className="min-w-0 flex-1 rounded-md border border-line bg-transparent px-2 py-1 text-[12px] outline-none" style={{ fontSize: 16 }} /> : null}
        </div>
        {mentions.length > 0 ? (
          <div className="mention-list">
            {mentions.map((p) => (
              <button
                key={p.handle}
                type="button"
                className="block w-full px-2 py-1.5 text-left text-[12px]"
                onClick={() => {
                  setBody((cur) => cur.replace(/(^|\s)@[a-z0-9._-]{0,24}$/i, `$1@${p.handle} `));
                  setMentions([]);
                }}
              >
                @{p.handle} <span className="text-muted">{p.role}</span>
              </button>
            ))}
          </div>
        ) : mentionQuery(body) && mentions.length === 0 ? (
          <p className="px-1 text-[11px] text-muted">No account matches that name.</p>
        ) : null}
        {kind === "job" ? (
          <input
            value={line}
            onChange={(e) => setLine(e.target.value)}
            placeholder="Pay · place · years"
            className="mt-1 w-full bg-transparent text-[12px] outline-none"
            style={{ fontSize: 16 }}
          />
        ) : null}
        {kind === "music" ? (
          <input
            value={line}
            onChange={(e) => setLine(e.target.value)}
            placeholder="Song link from Spotify, Audiomack, Apple, or YouTube"
            className="mt-1 w-full bg-transparent text-[12px] outline-none"
            style={{ fontSize: 16 }}
          />
        ) : null}
        <div className="mt-1 flex items-center justify-between gap-2">
          <p className="min-w-0 text-[10px] text-muted">{HINT[kind]}</p>
          <span className={`shrink-0 text-[10px] tabular-nums ${body.length > 250 ? "text-[#ffd45a]" : "text-muted"}`}>{body.length}/280{body.trim() ? " · draft" : ""}</span>
        </div>
        {shot ? (
          <div className="relative mt-2">
            <img src={shot} alt="" className="max-h-52 w-full rounded-[10px] object-cover" />
            <button type="button" className="absolute right-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-bold text-white" onClick={() => setShot("")}>Remove</button>
          </div>
        ) : null}
        {pendingClip ? (
          <div className="mt-2 rounded-[10px] border border-line px-2 py-2">
            <p className="text-[11px] text-fg">This clip is {Math.round(pendingClip.duration)}s. Kilode keeps {videoCap}s{pendingClip.start < 0.2 ? " from the start" : ` from ${Math.round(pendingClip.start)}s`}.</p>
            <input
              type="range"
              className="mt-1 w-full"
              min={0}
              max={Math.max(0, Math.floor(pendingClip.duration - videoCap))}
              step={1}
              value={Math.min(pendingClip.start, Math.max(0, pendingClip.duration - videoCap))}
              aria-label="Where the clip starts"
              onChange={(e) => {
                trimHold.current = true;
                setPendingClip((cur) => (cur ? { ...cur, start: Number(e.target.value) } : cur));
              }}
            />
            <div className="mt-1 flex gap-1.5">
              <button type="button" className="soc-chip px-2 py-1 text-[11px]" onClick={() => void keepClip(pendingClip.file, pendingClip.start)}>Keep this part</button>
              <button type="button" className="px-2 py-1 text-[11px] text-muted" onClick={() => { trimHold.current = true; window.clearTimeout(trimTimer.current); setPendingClip(null); }}>Cancel</button>
            </div>
          </div>
        ) : null}
        {clip ? (
          <div className="relative mt-2">
            <video src={clip} controls playsInline className="max-h-52 w-full rounded-[10px] bg-black" />
            <button type="button" className="absolute right-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-bold text-white" onClick={() => setClip("")}>Remove</button>
          </div>
        ) : null}
        <div className="mt-1.5 flex items-center gap-1">
          <label className="grid size-7 shrink-0 cursor-pointer place-items-center rounded-full border border-line text-muted" aria-label="Add photo">
            <ImagePlus className="size-3.5" />
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif,.jpg,.jpeg,.png,.webp"
              className="sr-only"
              disabled={mediaBusy}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                setMediaBusy(true);
                void uploadTakeMedia(file)
                  .then((r) => setShot(r.url))
                .catch((err) => {
                  const raw = err instanceof Error ? err.message : "";
                  setErr(/bytestring|8288/i.test(raw) ? "That photo did not leave the phone. Try a JPG." : raw || "Photo did not upload.");
                })
                  .finally(() => setMediaBusy(false));
              }}
            />
          </label>
          <label className="grid size-7 shrink-0 cursor-pointer place-items-center rounded-full border border-line text-muted" aria-label="Add video">
            <Video className="size-3.5" />
            <input
              type="file"
              accept="video/mp4,video/webm,video/quicktime"
              className="sr-only"
              disabled={mediaBusy}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                setMediaBusy(true);
                setErr("");
                void readVideoSeconds(file)
                  .then((seconds) => {
                    if (seconds > videoCap + 0.25) {
                      trimHold.current = false;
                      window.clearTimeout(trimTimer.current);
                      setPendingClip({ file, duration: seconds, start: 0 });
                      setMediaBusy(false);
                      trimTimer.current = window.setTimeout(() => {
                        if (trimHold.current) return;
                        void keepClip(file, 0);
                      }, 900);
                      return;
                    }
                    return uploadTakeMedia(file, { maxSeconds: videoCap }).then((r) => setClip(r.url));
                  })
                  .catch((err) => setErr(err instanceof Error ? err.message : "Video did not upload."))
                  .finally(() => setMediaBusy(false));
              }}
            />
          </label>
          <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto">
            {pills.map((k) => (
              <button
                key={k.id}
                type="button"
                className={`soc-chip shrink-0 px-1.5 py-0.5 text-[10px] ${kind === k.id ? "on" : ""}`}
                onClick={() => setKind(k.id)}
              >
                {k.label}
              </button>
            ))}
          </div>
          <button type="button" className={`soc-chip shrink-0 px-1.5 py-0.5 text-[10px] ${circle === "followers" ? "on" : ""}`} onClick={() => setCircle((c) => (c === "followers" ? "" : "followers"))}>
            {circle === "followers" ? "Followers" : "Everyone"}
          </button>
          <button type="button" disabled={busy || mediaBusy || body.trim().length < 1} className="btn-join min-w-14 shrink-0 rounded-full px-3 py-1 text-[11px] font-bold disabled:opacity-50" onClick={() => void post()}>
            {busy || mediaBusy ? "Sending" : "Post"}
          </button>
        </div>
        {err ? <p className="mt-1 text-[12px] font-semibold text-danger" role="alert">{err}</p> : null}
      </div>
      {lane === "posts" && suggested.filter((p) => !hidden(p.handle)).length > 0 ? (
        <div className="mb-3">
          <div className="mb-1.5 text-[12px] font-semibold">People you may know</div>
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {suggested.filter((p) => !hidden(p.handle)).slice(0, 8).map((p) => (
              <div key={p.id || p.handle} className="know-card">
                <img src={avatarUrl(p.handle, p.photo)} alt="" className="mb-1 size-8 rounded-full bg-panel-3 object-cover" />
                <a href={`/u/${encodeURIComponent(p.handle)}`} className="block truncate text-[12px] font-semibold">@{p.handle}</a>
                <div className="truncate text-[10px] text-muted">{p.mutuals > 0 ? `${p.mutuals} mutual` : "New on Kilode"}</div>
                <button type="button" className={`know-follow ${followed(p.handle, p.id) ? "on" : ""}`} onClick={() => flipFollow(p.handle, p.id)}>
                  {followed(p.handle, p.id) ? "Following" : theyFollow(p.handle, p.id) ? "Follow back" : "Follow"}
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {lane === "posts" && spaces.length > 0 ? (
        <div className="mb-3">
          <div className="mb-1.5 flex items-center justify-between">
            <div className="text-[12px] font-semibold">Discover this space</div>
            <button type="button" className="text-[11px] font-bold text-muted" onClick={() => window.dispatchEvent(new CustomEvent("kilode:goto", { detail: { screen: "spaces" } }))}>See all</button>
          </div>
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {spaces.map((s) => (
              <button
                key={s.id}
                type="button"
                className="know-card text-left"
                onClick={() => {
                  try { sessionStorage.setItem("kilode-space", s.username); } catch { /* ignore */ }
                  window.dispatchEvent(new CustomEvent("kilode:space", { detail: s.username }));
                  window.dispatchEvent(new CustomEvent("kilode:goto", { detail: { screen: "spaces" } }));
                }}
              >
                <div className="truncate text-[12px] font-semibold">{s.name}</div>
                <div className="truncate text-[10px] text-muted">{s.category || "Business"}{s.location ? ` · ${s.location}` : ""}</div>
                <span className="soc-tool mt-1.5 inline-flex">View space</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {!booted && shownTakes.length === 0 ? (
        <div className="soc-skel" aria-hidden>
          <span /><span /><span />
        </div>
      ) : shownTakes.length === 0 ? (
        <div className="soc-empty">
          <strong>
            {feedCut === "following" ? "Your people" : feedCut === "saved" ? "Saved" : feedCut === "trending" ? "Quiet" : "The feed"}
          </strong>
          <span>
          {feedCut === "following" && !followLoaded
            ? "Loading who you follow…"
            : feedCut === "following"
              ? "Follow people. Their takes land here."
              : feedCut === "trending" && !trendLoaded
                ? "Loading what is moving…"
                : feedCut === "trending"
                  ? "Nothing is moving in the last two days."
                  : feedCut === "tag"
                    ? `No takes on #${tag} yet.`
                    : feedCut === "topics" && !topicLoaded
                      ? "Loading your topics…"
                      : feedCut === "topics"
                        ? "Follow a topic. Those takes land here."
                        : feedCut === "saved" && !savedLoaded
                          ? "Loading saved takes…"
                          : feedCut === "saved"
                            ? "Save a take and it stays here."
                            : "No takes yet. Be first."}
          </span>
        </div>
      ) : null}
      <div className="space-y-2">
        {shownTakes.map((t) => (
          <TakeCard
            key={t.id}
            take={t}
            photo={faces[(t.handle || "").toLowerCase()]}
            hot={heatOf(t) >= 4}
            live={live.includes((t.handle || "").toLowerCase())}
            revealed={!!revealed[t.id]}
            applied={!!applied[t.id]}
            replyOpen={stage?.id === t.id ? false : openReply === t.id}
            reply={openReply === t.id ? reply : ""}
            onReveal={() => setRevealed((m) => ({ ...m, [t.id]: true }))}
            onApply={() => {
              if (!authed) return goLogin();
              setBusyId(t.id);
              void applyTake({ data: { id: t.id } })
                .then((r) => {
                  if (!r.ok) setErr(r.reason);
                  else setApplied((m) => ({ ...m, [t.id]: true }));
                })
                .catch((e) => {
                  if (needLogin(e)) goLogin();
                  else setErr("Could not apply.");
                })
                .finally(() => setBusyId(""));
            }}
            onVote={(side) => void vote(t.id, side)}
            voteSide={voted[t.id] || ""}
            onReport={() => {
              setReportNote("");
              setMenuTake(t);
            }}
            onLike={() => {
              if (!authed) return goLogin();
              if (likeLock.current.has(t.id)) return;
              likeLock.current.add(t.id);
              const was = !!liked[t.id];
              setLiked((m) => ({ ...m, [t.id]: !was }));
              if (!was) kilodeSound("tick");
              patch(t.id, (row) => ({ ...row, likes: Math.max(0, row.likes + (was ? -1 : 1)) }));
              void likeTake({ data: { id: t.id } })
                .then((r) => {
                  setLiked((m) => ({ ...m, [t.id]: !!r.liked }));
                  if (typeof r.likes === "number") patch(t.id, (row) => ({ ...row, likes: r.likes }));
                })
                .catch((e) => {
                  setLiked((m) => ({ ...m, [t.id]: was }));
                  patch(t.id, (row) => ({ ...row, likes: Math.max(0, row.likes + (was ? 1 : -1)) }));
                  if (needLogin(e)) goLogin();
                })
                .finally(() => likeLock.current.delete(t.id));
            }}
            onRepost={() => {
              if (!authed) return goLogin();
              if (busyId === t.id) return;
              const was = !!reposted[t.id];
              setBusyId(t.id);
              void repostTake({ data: { id: t.id } })
                .then((r) => {
                  if (!r.ok) return;
                  setReposted((m) => ({ ...m, [t.id]: r.reposted }));
                  if (r.reposted && !was) patch(t.id, (row) => ({ ...row, reposts: row.reposts + 1 }));
                  if (!r.reposted && was) patch(t.id, (row) => ({ ...row, reposts: Math.max(0, row.reposts - 1) }));
                })
                .catch((e) => {
                  if (needLogin(e)) goLogin();
                })
                .finally(() => setBusyId(""));
            }}
            onShare={() => {
              const url = `${window.location.origin}/?tab=socials&take=${encodeURIComponent(t.id)}`;
              if (navigator.share) void navigator.share({ title: "Kilode", text: t.body, url }).catch(() => undefined);
              else void navigator.clipboard?.writeText(url);
            }}
            mine={!!me && t.handle.toLowerCase() === me.toLowerCase()}
            link={linked[t.id] || linked[(t.handle || "").toLowerCase()] || ""}
            liked={!!liked[t.id]}
            following={followed(t.handle)}
            followsYou={theyFollow(t.handle)}
            saved={!!saved[t.id]}
            onSave={() => {
              if (!authed) return goLogin();
              const was = !!saved[t.id];
              setSaved((m) => {
                const next = { ...m };
                if (was) delete next[t.id];
                else next[t.id] = true;
                return next;
              });
              void toggleSaveTake({ data: { id: t.id } })
                .then((r) => {
                  if (!r.ok) {
                    setSaved((m) => {
                      const next = { ...m };
                      if (was) next[t.id] = true;
                      else delete next[t.id];
                      return next;
                    });
                    if (r.reason) setErr(r.reason);
                    return;
                  }
                  setSaved((m) => {
                    const next = { ...m };
                    if (r.on) next[t.id] = true;
                    else delete next[t.id];
                    return next;
                  });
                })
                .catch((e) => {
                  if (needLogin(e)) goLogin();
                });
            }}
            onFollow={() => flipFollow(t.handle)}
            likers={likeFaces[t.id] || []}
            onQuote={() => {
              if (!authed) return goLogin();
              setQuoting(t);
              setBody("");
              setErr("");
            }}
            onReplyOpen={() => {
              setStage({ id: t.id, mode: "thread" });
              setOpenReply(t.id);
              setReply("");
              setReplyShot("");
              if (threads[t.id]) return;
              void listTakeReplies({ data: { id: t.id } }).then((rows) => {
                setThreads((m) => ({ ...m, [t.id]: rows }));
              });
            }}
            onPhotoOpen={() => {
              setStage({ id: t.id, mode: "photo" });
              setOpenReply(t.id);
              if (threads[t.id]) return;
              void listTakeReplies({ data: { id: t.id } }).then((rows) => {
                setThreads((m) => ({ ...m, [t.id]: rows }));
              });
            }}
            onReplyChange={setReply}
            replyShot={openReply === t.id ? replyShot : ""}
            onReplyFile={(file) => {
              if (!authed) return goLogin();
              setBusyId(t.id);
              void uploadTakeMedia(file)
                .then((m) => {
                  if (m.kind !== "image") return;
                  setReplyShot(m.url);
                })
                .catch((e) => {
                  const raw = e instanceof Error ? e.message : "";
                  setErr(/bytestring|8288/i.test(raw) ? "That photo did not leave the phone. Try a JPG." : raw || "Photo did not upload.");
                })
                .finally(() => setBusyId(""));
            }}
            onClearReplyShot={() => setReplyShot("")}
            replySort={replySort}
            onReplySort={setReplySort}
            onReplyLike={(id) => {
              if (!authed) return goLogin();
              void likeReply({ data: { id } })
                .then((r) => {
                  if (!r.ok) {
                    if (r.reason) setErr(r.reason);
                    return;
                  }
                  if (r.on) kilodeSound("tick");
                  setThreads((m) => ({
                    ...m,
                    [t.id]: (m[t.id] || []).map((row) => (row.id === id ? { ...row, liked: r.on, likes: r.likes } : row)),
                  }));
                })
                .catch((e) => {
                  if (needLogin(e)) goLogin();
                });
            }}
            replies={[...(threads[t.id] || [])].sort((a, b) => (replySort === "top" ? (b.likes || 0) - (a.likes || 0) || b.ts - a.ts : a.ts - b.ts))}
            meHandle={me}
            onDeleteReply={(id) => {
              void deleteOwnReply({ data: { id } }).then((r) => {
                if (!r.ok) return;
                setThreads((m) => ({ ...m, [t.id]: (m[t.id] || []).filter((row) => row.id !== id) }));
                patch(t.id, (row) => ({ ...row, comments: Math.max(0, row.comments - 1) }));
              });
            }}
            onReplySend={() => {
              if (!authed) return goLogin();
              const text = reply.trim();
              if ((!text && !replyShot) || busyId === t.id) return;
              setBusyId(t.id);
              void replyTake({ data: { id: t.id, body: text, image: replyShot } })
                .then((r) => {
                  if (!r.ok) {
                    setErr(r.reason);
                    return;
                  }
                  kilodeSound("sent");
                  patch(t.id, (row) => ({ ...row, comments: row.comments + 1, lastReply: r.reply.body || "Photo" }));
                  setThreads((m) => ({ ...m, [t.id]: [...(m[t.id] || []), r.reply] }));
                  setReply("");
                  setReplyShot("");
                })
                .catch((e) => {
                  if (needLogin(e)) goLogin();
                  else setErr("Could not reply.");
                })
                .finally(() => setBusyId(""));
            }}
          />
        ))}
      </div>
      {stage ? (() => {
        const t = shownTakes.find((row) => row.id === stage.id);
        if (!t) return null;
        const image = typeof t.meta.image === "string" ? t.meta.image : "";
        const rows = [...(threads[t.id] || [])].sort((a, b) => a.ts - b.ts);
        return (
          <div className="take-stage" role="dialog" aria-modal="true" aria-label={stage.mode === "photo" ? "Photo" : "Comments"}>
            <div className="take-stage-bar">
              <button type="button" onClick={() => { setStage(null); setOpenReply(""); }}>Close</button>
              <b>{stage.mode === "photo" ? "Photo" : "Comments"}</b>
            </div>
            <div className="take-stage-scroll">
              <div className="take-stage-who"><b>{t.name || t.handle}</b><span>@{t.handle}</span></div>
              {t.body ? <p>{t.body}</p> : null}
              {image ? <img src={image} alt="" className="take-stage-photo" referrerPolicy="no-referrer" /> : null}
              <div className="take-stage-replies">
                {rows.length === 0 ? <p>No comments yet.</p> : rows.map((r) => (
                  <div key={r.id}>
                    <b>@{r.handle}</b>
                    {r.body ? <span>{r.body}</span> : null}
                    {r.image ? <img src={r.image} alt="" /> : null}
                  </div>
                ))}
              </div>
              <form
                className="take-stage-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!authed) return goLogin();
                  const text = reply.trim();
                  if ((!text && !replyShot) || busyId === t.id) return;
                  setBusyId(t.id);
                  void replyTake({ data: { id: t.id, body: text, image: replyShot } })
                    .then((r) => {
                      if (!r.ok) {
                        setErr(r.reason);
                        return;
                      }
                      kilodeSound("sent");
                      patch(t.id, (row) => ({ ...row, comments: row.comments + 1, lastReply: r.reply.body || "Photo" }));
                      setThreads((m) => ({ ...m, [t.id]: [...(m[t.id] || []), r.reply] }));
                      setReply("");
                      setReplyShot("");
                    })
                    .catch(() => setErr("Could not reply."))
                    .finally(() => setBusyId(""));
                }}
              >
                <input value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Write a comment" />
                <button type="submit" disabled={busyId === t.id}>{busyId === t.id ? "…" : "Send"}</button>
              </form>
            </div>
          </div>
        );
      })() : null}
      {(feedCut === "following" ? followNext : feedCut === "trending" ? trendNext : feedCut === "tag" ? tagNext : next) ? (
        <button
          type="button"
          className="soc-more"
          onClick={() => {
            if (feedCut === "following") {
              void listFollowingTakes({ data: { before: followNext } }).then((r) => {
                setFollowTakes((list) => [...list, ...r.takes.filter((t) => !list.some((x) => x.id === t.id))]);
                setFollowNext(r.next);
              });
              return;
            }
            if (feedCut === "trending") {
              void listTrending({ data: { offset: trendNext } }).then((r) => {
                setTrendTakes((list) => [...list, ...r.takes.filter((t) => !list.some((x) => x.id === t.id))]);
                setTrendNext(r.next);
              });
              return;
            }
            if (feedCut === "tag") {
              void listTakesByTag({ data: { tag, before: tagNext } }).then((r) => {
                setTagTakes((list) => [...list, ...r.takes.filter((t) => !list.some((x) => x.id === t.id))]);
                setTagNext(r.next);
              });
              return;
            }
            void listTakes({ data: { before: next } }).then((r) => {
              setTakes((list) => [...list, ...r.takes]);
              setNext(r.next);
            });
          }}
        >
          Load more
        </button>
      ) : null}
      </>
      ) : null}
      {menuTake ? (
        <div className="fixed inset-0 z-50 flex items-end bg-black/60" onClick={() => setMenuTake(null)}>
          <div
            className="w-full rounded-t-2xl px-4 pt-3 pb-[max(16px,env(safe-area-inset-bottom))]"
            style={{ background: "var(--report-bg)", color: "var(--report-fg)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full" style={{ background: "var(--report-line)" }} />
            <div className="text-[18px] font-bold" style={{ color: "var(--report-fg)" }}>Gist</div>
            {me && menuTake.handle.toLowerCase() === me.toLowerCase() ? (
              <button
                type="button"
                className="block w-full border-b py-3 text-left text-[16px] font-semibold text-danger"
                style={{ borderColor: "var(--report-line)" }}
                onClick={() => {
                  const row = menuTake;
                  setMenuTake(null);
                  if (!authed) return goLogin();
                  void deleteOwnTake({ data: { id: row.id } })
                    .then((r) => {
                      if (!r.ok) setErr(r.reason);
                      else setTakes((list) => list.filter((x) => x.id !== row.id));
                    })
                    .catch((e) => {
                      if (needLogin(e)) goLogin();
                      else setErr("Could not delete.");
                    });
                }}
              >
                Delete
              </button>
            ) : null}
            {me && menuTake.handle.toLowerCase() === me.toLowerCase() && Date.now() - menuTake.ts < 30 * 60 * 1000 ? (
              <button
                type="button"
                className="block w-full border-b py-3 text-left text-[16px]"
                style={{ color: "var(--report-fg)", borderColor: "var(--report-line)" }}
                onClick={() => {
                  setEditTake(menuTake);
                  setEditBody(menuTake.body);
                  setMenuTake(null);
                }}
              >
                Edit
              </button>
            ) : null}
            {me && menuTake.handle.toLowerCase() === me.toLowerCase() ? (
              <button
                type="button"
                className="block w-full border-b py-3 text-left text-[16px]"
                style={{ color: "var(--report-fg)", borderColor: "var(--report-line)" }}
                onClick={() => {
                  const row = menuTake;
                  setMenuTake(null);
                  void pinOwnTake({ data: { id: row.id } }).then((r) => {
                    if (!r.ok) return;
                    setTakes((list) => list.map((t) => t.handle.toLowerCase() === row.handle.toLowerCase() ? { ...t, meta: { ...t.meta, pinned: t.id === row.id && r.pinned ? "1" : "" } } : t));
                  });
                }}
              >
                {menuTake.meta.pinned === "1" ? "Unpin" : "Pin to profile"}
              </button>
            ) : null}
            <button
              type="button"
              className="block w-full border-b py-3 text-left text-[16px]"
              style={{ color: "var(--report-fg)", borderColor: "var(--report-line)" }}
              onClick={() => {
                setHiddenIds((m) => ({ ...m, [menuTake.id]: true }));
                setMenuTake(null);
              }}
            >
              Not for me
            </button>
            <button
              type="button"
              className="block w-full border-b py-3 text-left text-[16px]"
              style={{ color: "var(--report-fg)", borderColor: "var(--report-line)" }}
              onClick={() => {
                const word = window.prompt("Mute which word?", "")?.trim().toLowerCase() || "";
                setMenuTake(null);
                if (!authed) return goLogin();
                if (word.length < 2) return;
                void muteWord({ data: { word } }).then((r) => {
                  if (r.ok) setWords((list) => list.includes(r.word) ? list : [...list, r.word]);
                  else setErr(r.reason);
                });
              }}
            >
              Mute a word
            </button>
            <button
              type="button"
              className="block w-full border-b py-3 text-left text-[16px]"
              style={{ color: "var(--report-fg)", borderColor: "var(--report-line)" }}
              onClick={() => {
                const handle = menuTake.handle;
                setMenuTake(null);
                if (!authed) return goLogin();
                void togglePing({ data: { handle } }).then((r) => {
                  if (!r.ok) return;
                  setPings((m) => {
                    const next = { ...m };
                    if (r.on) next[handle.toLowerCase()] = true;
                    else delete next[handle.toLowerCase()];
                    return next;
                  });
                });
              }}
            >
              {pings[menuTake.handle.toLowerCase()] ? "Stop post alerts" : "Alert me on their posts"}
            </button>
            {me && menuTake.handle.toLowerCase() === me.toLowerCase() ? (
              <button
                type="button"
                className="block w-full border-b py-3 text-left text-[16px]"
                style={{ color: "var(--report-fg)", borderColor: "var(--report-line)" }}
                onClick={() => {
                  const id = menuTake.id;
                  setMenuTake(null);
                  void toggleReplyLock({ data: { id } }).then((r) => {
                    if (!r.ok) return;
                    patch(id, (row) => ({ ...row, meta: { ...row.meta, replies: r.off ? "off" : "" } }));
                  });
                }}
              >
                {menuTake.meta.replies === "off" ? "Turn replies on" : "Turn replies off"}
              </button>
            ) : null}
            {me && menuTake.handle.toLowerCase() === me.toLowerCase() ? (
              <button
                type="button"
                className="block w-full border-b py-3 text-left text-[16px]"
                style={{ color: "var(--report-fg)", borderColor: "var(--report-line)" }}
                onClick={() => {
                  const id = menuTake.id;
                  setMenuTake(null);
                  void toggleSensitive({ data: { id } }).then((r) => {
                    if (!r.ok) return;
                    patch(id, (row) => ({ ...row, meta: { ...row.meta, sensitive: r.on ? "1" : "" } }));
                  });
                }}
              >
                {menuTake.meta.sensitive === "1" ? "Clear sensitive" : "Mark sensitive"}
              </button>
            ) : null}
            <button
              type="button"
              className="block w-full border-b py-3 text-left text-[16px]"
              style={{ color: "var(--report-fg)", borderColor: "var(--report-line)" }}
              onClick={() => {
                const id = menuTake.id;
                setMenuTake(null);
                const url = `${window.location.origin}/?tab=socials&take=${encodeURIComponent(id)}`;
                void navigator.clipboard?.writeText(url).then(() => {
                  setLinkNote("Link copied.");
                  window.setTimeout(() => setLinkNote(""), 1600);
                }).catch(() => setLinkNote(url));
              }}
            >
              Copy link
            </button>
            <button
              type="button"
              className="block w-full border-b py-3 text-left text-[16px]"
              style={{ color: "var(--report-fg)", borderColor: "var(--report-line)" }}
              onClick={() => {
                setReportId(menuTake.id);
                setMenuTake(null);
              }}
            >
              Report
            </button>
            <button type="button" className="mt-1 w-full py-3 text-center text-[16px]" style={{ color: "var(--report-muted)" }} onClick={() => setMenuTake(null)}>
              Cancel
            </button>
          </div>
        </div>
      ) : null}
      {editTake ? (
        <div className="fixed inset-0 z-50 flex items-end bg-black/60" onClick={() => setEditTake(null)}>
          <form
            className="w-full rounded-t-2xl px-4 pt-3 pb-[max(16px,env(safe-area-inset-bottom))]"
            style={{ background: "var(--report-bg)", color: "var(--report-fg)" }}
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => {
              e.preventDefault();
              const row = editTake;
              const next = editBody.trim();
              if (!row || next.length < 1) return;
              void editOwnTake({ data: { id: row.id, body: next } }).then((r) => {
                if (!r.ok) setErr(r.reason);
                else setTakes((list) => list.map((t) => (t.id === row.id ? { ...t, body: r.body, meta: { ...t.meta, edited: "1" } } : t)));
                setEditTake(null);
              });
            }}
          >
            <div className="mb-2 text-[16px] font-bold">Edit take</div>
            <textarea value={editBody} maxLength={280} onChange={(e) => setEditBody(e.target.value)} className="min-h-24 w-full rounded-xl border border-line bg-transparent p-2 text-[14px] outline-none" style={{ fontSize: 16 }} />
            <button type="submit" className="btn-join mt-2 w-full rounded-full py-2 text-[13px] font-bold">Save</button>
          </form>
        </div>
      ) : null}
      {reportId ? (
        <div className="fixed inset-0 z-50 flex items-end bg-black/60" onClick={() => setReportId("")}>
          <div
            className="w-full rounded-t-2xl px-4 pt-3 pb-[max(16px,env(safe-area-inset-bottom))]"
            style={{ background: "var(--report-bg)", color: "var(--report-fg)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full" style={{ background: "var(--report-line)" }} />
            <div className="text-[18px] font-bold" style={{ color: "var(--report-fg)" }}>Report gist</div>
            <p className="mt-1 text-[13px]" style={{ color: "var(--report-muted)" }}>Why are you reporting this?</p>
            <div className="mt-2">
              {REPORTS.map((reason) => (
                <button
                  key={reason}
                  type="button"
                  className="block w-full border-b py-3 text-left text-[16px]"
                  style={{ color: "var(--report-fg)", borderColor: "var(--report-line)" }}
                  onClick={() => {
                    if (!authed) return goLogin();
                    void reportTake({ data: { id: reportId, reason } })
                      .then((r) => {
                        setReportId("");
                        setReportNote(r.ok ? "Report sent. Staff will see it." : r.reason);
                      })
                      .catch((e) => {
                        if (needLogin(e)) goLogin();
                        else setReportNote("Could not send the report.");
                      });
                  }}
                >
                  {reason}
                </button>
              ))}
            </div>
            <button type="button" className="mt-1 w-full py-3 text-center text-[16px]" style={{ color: "var(--report-muted)" }} onClick={() => setReportId("")}>
              Cancel
            </button>
          </div>
        </div>
      ) : null}
      {reportNote ? <p className="mt-2 text-center text-[11px] text-muted">{reportNote}</p> : null}
      {linkNote ? <p className="mt-2 text-center text-[11px] text-muted">{linkNote}</p> : null}
    </div>
  );
}

function KSpark() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className="size-3.5">
      <path d="M8 1.2 9.4 6.1 14.4 8 9.4 9.9 8 14.8 6.6 9.9 1.6 8 6.6 6.1Z" />
    </svg>
  );
}
function KTalk() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className="size-3.5">
      <path d="M3 3.2h10a1 1 0 0 1 1 1v6.2a1 1 0 0 1-1 1H7.2L4 14.2v-2.8H3a1 1 0 0 1-1-1V4.2a1 1 0 0 1 1-1Z" />
    </svg>
  );
}
function KLoop() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className="size-3.5">
      <path d="M12.5 6.2A4.6 4.6 0 0 0 4 5.2L2.6 6.4M3.5 9.8A4.6 4.6 0 0 0 12 10.8l1.4-1.2" />
      <path d="M2.2 3.6v3h3M13.8 12.4v-3h-3" />
    </svg>
  );
}
function KSend() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className="size-3.5">
      <path d="M2.2 8.2 13.6 2.6 9.2 13.4 7.4 8.8Z" />
    </svg>
  );
}
function KMark() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className="size-3.5">
      <path d="M4 2.5h8a1 1 0 0 1 1 1V14l-5-2.6L3 14V3.5a1 1 0 0 1 1-1Z" />
    </svg>
  );
}

function TakeCard({
  take,
  photo,
  hot,
  live,
  revealed,
  applied,
  replyOpen,
  reply,
  replyShot = "",
  onReplyFile,
  onClearReplyShot,
  replySort = "new",
  onReplySort,
  onReplyLike,
  onReveal,
  onApply,
  onVote,
  voteSide = "",
  onReport,
  onLike,
  onRepost,
  onShare,
  onReplyOpen,
  onPhotoOpen,
  onReplyChange,
  onReplySend,
  replies,
  meHandle,
  onDeleteReply,
  mine,
  link,
  liked,
  following,
  followsYou,
  saved,
  onSave,
  onQuote,
  onFollow,
  likers = [],
}: {
  take: TakeRow;
  photo?: string;
  hot?: boolean;
  live?: boolean;
  revealed: boolean;
  applied: boolean;
  replyOpen: boolean;
  reply: string;
  replyShot?: string;
  onReplyFile?: (file: File) => void;
  onClearReplyShot?: () => void;
  replySort?: "new" | "top";
  onReplySort?: (v: "new" | "top") => void;
  onReplyLike?: (id: string) => void;
  onReveal: () => void;
  onApply: () => void;
  onVote: (side: "fact" | "cap" | "a" | "b") => void;
  voteSide?: string;
  onReport: () => void;
  onLike: () => void;
  onRepost: () => void;
  onShare: () => void;
  onReplyOpen: () => void;
  onPhotoOpen?: () => void;
  onReplyChange: (v: string) => void;
  onReplySend: () => void;
  replies: TakeReply[];
  meHandle?: string;
  onDeleteReply?: (id: string) => void;
  mine: boolean;
  link: "" | "out" | "in" | "ask";
  liked: boolean;
  following: boolean;
  followsYou: boolean;
  saved: boolean;
  onSave: () => void;
  onQuote: () => void;
  onFollow: () => void;
  likers?: { handle: string; photo: string }[];
}) {
  const ghost = take.kind === "ghost";
  const locked = take.meta.lock === true && !revealed;
  const veiled = (take.meta.sensitive === "1" || take.meta.sensitive === true) && !revealed && !mine;
  const fact = pct(take.fact, take.cap);
  const banter = pct(take.voteA, take.voteB);
  const expires = typeof take.meta.expires === "number" ? take.meta.expires : 0;
  const hours = expires ? Math.max(0, Math.round((expires - Date.now()) / 3600000)) : 0;
  const seenLike = useRef(false);
  const [burst, setBurst] = useState("");
  useEffect(() => {
    if (!seenLike.current) {
      seenLike.current = true;
      return;
    }
    if (!liked) return;
    setBurst("like");
    const t = window.setTimeout(() => setBurst(""), 420);
    return () => window.clearTimeout(t);
  }, [liked]);
  const tap = useRef(0);
  function onPhoto() {
    const now = Date.now();
    if (now - tap.current < 280) {
      tap.current = 0;
      if (!liked) onLike();
      return;
    }
    tap.current = now;
    window.setTimeout(() => {
      if (tap.current !== now) return;
      tap.current = 0;
      onPhotoOpen?.();
    }, 280);
  }
  return (
    <article className="take-card glass-3d px-2.5 py-2" data-take={take.id}>
      {take.via ? <div className="mb-1 text-[10px] font-semibold text-muted">Reposted by @{take.via}</div> : null}
      <div className="flex items-start gap-2">
        <Face handle={ghost ? "ghost" : take.handle} photo={ghost ? "" : photo} size={28} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <span className="take-name truncate">
              {ghost ? (
                "Anonymous"
              ) : (
                <a href={`/u/${encodeURIComponent(take.handle)}`} className="hover:underline">
                  {take.name}
                </a>
              )}
            </span>
            {!ghost && live ? <span className="live-dot" title="Active" /> : null}
            {!ghost && take.verified ? <VerifiedMark /> : null}
            {!ghost ? <span className="truncate text-[10px] text-muted">@{take.handle}</span> : null}
            <span className="shrink-0 text-[10px] text-muted">· {timeAgo(take.ts)}{take.meta.edited === "1" ? " · Edited" : ""}</span>
            {!ghost && !mine ? (
              <button type="button" className={`take-follow ${following ? "on" : ""}`} onClick={onFollow}>
                {following ? "Following" : followsYou ? "Follow back" : "Follow"}
              </button>
            ) : null}
            <button type="button" aria-label="Report gist" className={`${!ghost && !mine ? "" : "ml-auto"} shrink-0 px-1 text-[12px] font-bold tracking-widest text-muted`} onClick={onReport}>
              =
            </button>
          </div>
          {take.role ? <div className="text-[10px] text-muted">{take.role}</div> : null}
          {take.kind === "news" ? <div className="mt-1 text-[10px] font-semibold text-lime-2">News</div> : null}
          {ghost ? (
            <div className="mt-0.5 flex items-center justify-between text-[10px] text-violet-300/80">
              <span>Ghost Take</span>
              <span>{hours ? `expires in ${hours}h` : "expires soon"}</span>
            </div>
          ) : null}
          {take.kind === "job" ? (
            <div className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-lime-2">
              <Briefcase className="size-3" /> Job
            </div>
          ) : null}
          {take.kind === "music" ? (
            <div className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-lime-2">
              <Headphones className="size-3" /> Music
            </div>
          ) : null}
          {take.kind === "banter" ? <div className="mt-1 text-[10px] font-semibold tracking-[0.08em] text-muted">DEBATE</div> : null}
          {take.kind === "quote" && typeof take.meta.stance === "string" ? (
            <div className="mt-1 text-[10px] font-semibold tracking-[0.08em] text-lime-2">{take.meta.stance}</div>
          ) : null}
          {take.meta.street === true ? <div className="mt-0.5 text-[9px] text-amber-200/80">Street Certified</div> : null}
          {hot ? <div className="trend-chip mt-1">Trending</div> : null}
          {Date.now() - take.ts < 6 * 3600_000 ? <div className="fresh-chip mt-1">New</div> : null}
          {take.meta.circle === "followers" ? <div className="fresh-chip mt-1">Followers</div> : null}
          {take.meta.pinned === "1" ? <div className="mt-1 text-[10px] font-semibold text-muted">Pinned</div> : null}
          {typeof take.views === "number" && take.views > 0 ? <div className="mt-1 text-[10px] text-muted">{take.views.toLocaleString()} seen</div> : null}

          {locked ? (
            <button type="button" className="mt-1.5 flex w-full items-center justify-center gap-1 rounded-[10px] border border-line py-3 text-[11px] text-muted" onClick={onReveal}>
              <Lock className="size-3" /> Tap to reveal
            </button>
          ) : veiled ? (
            <button type="button" className="sens-veil" onClick={onReveal}>Sensitive · tap to view</button>
          ) : (
            <>
              <p className={`mt-1 whitespace-pre-wrap text-[13px] leading-snug ${ghost ? "text-white/80" : ""}`}>
                <LinkText text={take.body} />
              </p>
              {typeof take.meta.place === "string" && take.meta.place ? <p className="mt-1 text-[11px] text-muted">{take.meta.place}</p> : null}
              {take.meta.replies === "off" ? <p className="mt-1 text-[11px] text-muted">Replies are off</p> : null}
              {typeof take.meta.video === "string" && take.meta.video.startsWith("http") ? (
                <video src={take.meta.video} poster={typeof take.meta.image === "string" ? take.meta.image : undefined} controls playsInline className="mt-2 max-h-80 w-full rounded-[10px] bg-black" />
              ) : typeof take.meta.image === "string" && (take.meta.image.startsWith("http") || take.meta.image.startsWith("data:image/")) ? (
                <img src={take.meta.image} alt={typeof take.meta.alt === "string" ? take.meta.alt : ""} referrerPolicy="no-referrer" className="take-photo" onClick={onPhoto} />
              ) : null}
            </>
          )}

          {take.kind === "quote" ? (
            typeof take.meta.quoteHref === "string" && take.meta.quoteHref.startsWith("/p/") ? (
              <button
                type="button"
                className="take-quote"
                onClick={() => window.dispatchEvent(new CustomEvent("kilode:read", { detail: take.meta.quoteHref }))}
              >
                <div className="text-[10px] text-muted">{String(take.meta.quoteName || "")} @{String(take.meta.quoteHandle || "")}</div>
                <div className="text-[12px] leading-snug text-fg/80">{plainBits(String(take.meta.quoteBody || ""))}</div>
                <div className="mt-1 text-[10px] font-semibold text-lime-2">Open story</div>
              </button>
            ) : (
              <div className="take-quote">
                <div className="text-[10px] text-muted">{String(take.meta.quoteName || "")} @{String(take.meta.quoteHandle || "")}</div>
                <div className="text-[12px] leading-snug text-fg/80">{plainBits(String(take.meta.quoteBody || ""))}</div>
              </div>
            )
          ) : null}

          {take.kind === "job" && typeof take.meta.line === "string" ? <div className="mt-1 text-[11px] text-muted">{take.meta.line}</div> : null}
          {take.kind === "job" ? (
            <button type="button" disabled={applied} className="mt-1.5 rounded-[10px] border border-lime-2/40 px-2 py-1 text-[10px] font-semibold text-lime-2 disabled:opacity-60" onClick={onApply}>
              {applied ? "Applied" : "Apply"}
            </button>
          ) : null}

          {take.kind === "music" ? (
            <div className="mt-1.5 flex items-center gap-2">
              <div className="grid size-9 place-items-center rounded-[8px] bg-panel-3 text-lime-2">
                <Headphones className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[12px] font-semibold">{String(take.meta.title || take.body)}</div>
                <div className="text-[10px] text-muted">{String(take.meta.artist || take.name)}</div>
              </div>
              {typeof take.meta.url === "string" && /^https?:\/\//i.test(take.meta.url) ? (
                <a href={take.meta.url} target="_blank" rel="noopener noreferrer" className="rounded-[10px] border border-line px-2 py-1 text-[10px] font-semibold text-lime-2">
                  Play
                </a>
              ) : null}
            </div>
          ) : null}

          {(take.kind === "take" || take.kind === "news" || take.kind === "quote") ? (
            <div className="soc-fact">
              <div>
                <button type="button" className={voteSide === "fact" ? "on" : ""} onClick={() => onVote("fact")}>FACT {take.fact + take.cap > 0 ? `${fact}%` : ""}</button>
                <button type="button" className={voteSide === "cap" ? "on" : ""} onClick={() => onVote("cap")}>CAP {take.fact + take.cap > 0 ? `${100 - fact}%` : ""}</button>
              </div>
              <div className="take-meter"><div style={{ width: `${take.fact + take.cap > 0 ? fact : 0}%` }} /></div>
              <p>{take.fact + take.cap > 0 ? `${(take.fact + take.cap).toLocaleString()} votes` : "No votes yet"}{voteSide === "fact" || voteSide === "cap" ? ` · Your vote: ${voteSide.toUpperCase()}` : ""}</p>
            </div>
          ) : null}

          {take.kind === "banter" ? (
            <div className="mt-2">
              <div className="mb-1 flex justify-between text-[10px] font-semibold">
                <button type="button" className="text-lime-2" onClick={() => onVote("a")}>{String(take.meta.a || "For")} {banter}%</button>
                <button type="button" className="text-muted" onClick={() => onVote("b")}>{String(take.meta.b || "Against")} {100 - banter}%</button>
              </div>
              <div className="take-meter">
                <div className="h-full bg-lime-2" style={{ width: `${banter}%` }} />
              </div>
            </div>
          ) : null}

          {replyOpen && replies.length > 1 ? (
            <div className="mt-2 flex gap-3 text-[10px] font-bold">
              <button type="button" className={replySort === "new" ? "text-lime-2" : "text-muted"} onClick={() => onReplySort?.("new")}>Newest</button>
              <button type="button" className={replySort === "top" ? "text-lime-2" : "text-muted"} onClick={() => onReplySort?.("top")}>Top</button>
            </div>
          ) : null}
          {replyOpen && replies.length > 0 ? (
            <div className="mt-2 space-y-1.5 border-t border-line pt-2">
              {replies.map((r) => (
                <div key={r.id} className="take-reply">
                  <a href={`/u/${encodeURIComponent(r.handle)}`} className="font-semibold">@{r.handle}</a>
                  <span className="text-muted"> · {timeAgo(r.ts)}</span>
                  {onDeleteReply && meHandle && r.handle.toLowerCase() === meHandle.toLowerCase() ? (
                    <button type="button" className="ml-2 text-[10px] font-bold text-muted" onClick={() => onDeleteReply(r.id)}>Delete</button>
                  ) : null}
                  {r.body ? <p className="whitespace-pre-wrap"><LinkText text={r.body} /></p> : null}
                  {r.image ? <img src={r.image} alt="" className="mt-1 max-h-40 w-full rounded-[10px] object-cover" /> : null}
                  <button type="button" className={`mt-0.5 text-[10px] font-bold ${r.liked ? "text-lime-2" : "text-muted"}`} onClick={() => onReplyLike?.(r.id)}>
                    {r.liked ? "Liked" : "Like"}{r.likes ? ` ${r.likes}` : ""}
                  </button>
                </div>
              ))}
            </div>
          ) : replyOpen ? (
            <p className="mt-2 text-[11px] text-muted">No replies yet.</p>
          ) : take.lastReply ? (
            <p className="mt-1.5 text-[11px] text-muted">Reply · {take.lastReply}</p>
          ) : null}
          {replyOpen ? (
            <form
              className="mt-1.5 flex flex-col gap-1"
              onSubmit={(e) => {
                e.preventDefault();
                onReplySend();
              }}
            >
              {replyShot ? (
                <div className="relative">
                  <img src={replyShot} alt="" className="max-h-32 w-full rounded-[10px] object-cover" />
                  <button type="button" className="absolute right-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-bold text-white" onClick={() => onClearReplyShot?.()}>Remove</button>
                </div>
              ) : null}
              <div className="flex gap-1">
                <label className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-[10px] border border-line text-muted">
                  <ImagePlus className="size-3.5" />
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif,.jpg,.jpeg,.png,.webp"
                    className="sr-only"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (file) onReplyFile?.(file);
                    }}
                  />
                </label>
                <input value={reply} onChange={(e) => onReplyChange(e.target.value)} placeholder="Reply" className="min-w-0 flex-1 rounded-[10px] border border-line bg-bg px-2 py-1 outline-none" style={{ fontSize: 16 }} />
                <button type="submit" className="reply-send">Send</button>
              </div>
            </form>
          ) : null}

        </div>
      </div>
      <div className="take-react">
        <button type="button" className={`${liked ? "on" : ""} ${burst === "like" ? "pop" : ""}`} onClick={onLike}>
          <KSpark /> {take.likes ? take.likes.toLocaleString() : ""}
        </button>
        <button type="button" onClick={onReplyOpen}>
          <KTalk /> {take.comments ? take.comments.toLocaleString() : ""}
        </button>
        <button type="button" className="repost" onClick={(e) => { e.currentTarget.classList.remove("spin"); void e.currentTarget.offsetWidth; e.currentTarget.classList.add("spin"); onRepost(); }}>
          <KLoop /> {take.reposts ? take.reposts.toLocaleString() : ""}
        </button>
        <button type="button" className={saved ? "on" : ""} onClick={onSave} aria-label={saved ? "Unsave" : "Save"}>
          <KMark />
        </button>
        <button type="button" className="text-[11px] font-bold" onClick={onQuote}>Quote</button>
        <button type="button" onClick={onShare} aria-label="Share">
          <KSend />
        </button>
        <span className="take-faces" aria-label="Liked by">
          {likers.slice(0, 3).map((p) => (
            <img key={p.handle} src={avatarUrl(p.handle, p.photo)} alt="" title={p.handle} />
          ))}
        </span>
      </div>
    </article>
  );
}
