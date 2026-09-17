import { useEffect, useMemo, useRef, useState } from "react";
import {
  Award,
  Bookmark,
  Copy,
  Eye,
  Hash,
  Heart,
  HelpCircle,
  Home,
  LayoutDashboard,
  Link2,
  Mail,
  Megaphone,
  Menu,
  MessageSquare,
  PlusSquare,
  Radio,
  Play,
  Search,
  Send,
  Share2,
  Smile,
  ChevronLeft,
  ChevronRight,
  Settings,
  Trophy,
  User,
  Users,
  UsersRound,
  Shield,
  X,
} from "lucide-react";
import { ACCOUNT_KINDS, MENU, POST_CATS, REGIONS, ROOMS, AD_COINS, chatTtlLabel, fmtCount, handleColor, parseMusicUrl, roomName, timeLabel, youtubeId, type AccountKind, type Campaign, type ChatMsg, type MenuId, type Room } from "@/lib/qonvo-data";
import { DIGITAL_TRACKS, MUSIC_GENRES, MUSIC_RAILS, VIDEO_CATALOG, VIDEO_SECTIONS } from "@/lib/qonvo-seed";
import { useQonvo } from "@/lib/use-qonvo";
import { QonvoScreen } from "@/components/qonvo-screens";
import { QonvoMark, KilodeWord } from "@/components/qonvo-mark";
import { Link } from "@tanstack/react-router";
import { SignedIn, SignedOut, UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { accountEmail, accountEmails, publicUsername } from "@/lib/account-email";
import { authClient } from "@/lib/auth/client";
import { listWallets } from "@/lib/forum-server";
import { AccountKindPicker } from "@/components/account-kind";
import { TranslateBtn } from "@/components/translate-btn";
import { HandleLink } from "@/components/handle-link";

const EMOJIS = ["😀", "😂", "😍", "🔥", "👍", "🙏", "💯", "🎉", "😢", "😮", "😎", "❤️", "🇳🇬", "👀", "🤔", "💭"];

const ICONS: Record<MenuId, typeof Home> = {
  home: Home,
  forum: MessageSquare,
  community: Users,
  search: Search,
  create: PlusSquare,
  profile: User,
  dashboard: LayoutDashboard,
  bookmarks: Bookmark,
  notifications: Radio,
  inbox: Mail,
  teams: UsersRound,
  badges: Award,
  leaderboard: Trophy,
  trending: Hash,
  ads: Megaphone,
  contact: Mail,
  admin: Shield,
  settings: Settings,
  help: HelpCircle,
};

const MENU_GROUPS: { label: string; ids: MenuId[] }[] = [
  { label: "Me", ids: ["profile", "dashboard", "bookmarks", "inbox", "notifications", "teams"] },
  { label: "Discover", ids: ["forum", "trending", "community", "search", "leaderboard", "badges"] },
  { label: "Create", ids: ["create", "ads"] },
  { label: "Account", ids: ["settings", "contact", "help"] },
];

function fmt(n: number) {
  return n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, "") + "K" : String(n);
}

function sameDay(a: number, b: number) {
  const da = new Date(a);
  const db = new Date(b);
  return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate();
}

function chipLabel(ts: number) {
  const d = new Date(ts);
  const now = new Date();
  if (sameDay(ts, now.getTime())) return `Today · ${d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
  return d.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function mentionParts(text: string, handle: string) {
  const h = handle.trim();
  if (!h) return [{ t: text, on: false }];
  const re = new RegExp(`(@?${h.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "ig");
  const out: { t: string; on: boolean }[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push({ t: text.slice(last, m.index), on: false });
    out.push({ t: m[0], on: true });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ t: text.slice(last), on: false });
  return out.length ? out : [{ t: text, on: false }];
}

type ChatRow =
  | { kind: "chip"; key: string; label: string }
  | { kind: "msg"; key: string; m: ChatMsg }
  | { kind: "fold"; key: string; author: string; n: number; hidden: ChatMsg[] }
  | { kind: "ad"; key: string; ad: Campaign };

function chatRows(msgs: ChatMsg[]): ChatRow[] {
  const live = msgs;
  const rows: ChatRow[] = [];
  let i = 0;
  while (i < live.length) {
    const m = live[i];
    const prev = live[i - 1];
    if (!prev || !sameDay(prev.ts, m.ts) || m.ts - prev.ts > 20 * 60 * 1000) {
      rows.push({ kind: "chip", key: `c-${m.ts}`, label: chipLabel(m.ts) });
    }
    let j = i + 1;
    while (j < live.length && live[j].n === m.n) j += 1;
    const run = live.slice(i, j);
    if (run.length >= 4) {
      rows.push({ kind: "msg", key: `${run[0].ts}-a`, m: run[0] });
      rows.push({ kind: "msg", key: `${run[1].ts}-b`, m: run[1] });
      rows.push({ kind: "fold", key: `f-${run[0].ts}`, author: m.n, n: run.length - 3, hidden: run.slice(2, -1) });
      rows.push({ kind: "msg", key: `${run[run.length - 1].ts}-z`, m: run[run.length - 1] });
    } else {
      for (const item of run) rows.push({ kind: "msg", key: String(item.ts) + item.n, m: item });
    }
    i = j;
  }
  return rows;
}

function mixChatAds(rows: ChatRow[], ads: Campaign[]): ChatRow[] {
  if (!ads.length) return rows;
  const out: ChatRow[] = [];
  let n = 0;
  let ai = 0;
  for (const row of rows) {
    out.push(row);
    if (row.kind !== "msg") continue;
    n += 1;
    if (n % 5 !== 0) continue;
    const ad = ads[ai % ads.length];
    out.push({ kind: "ad", key: `ad-${n}-${ad.id}`, ad });
    ai += 1;
  }
  return out;
}


export function QonvoApp() {
  const store = useQonvo();
  const session = useCurrentUserState();
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState("All");
  const [draft, setDraft] = useState("");
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [joinName, setJoinName] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [screen, setScreen] = useState<MenuId>("home");
  const [roomsOpen, setRoomsOpen] = useState(false);
  const [homeTab, setHomeTab] = useState<"chat" | "feeds" | "advert" | "music" | "videos">("feeds");
  const [joinPass, setJoinPass] = useState("");
  const [joinAgree, setJoinAgree] = useState(false);
  const [joinKind, setJoinKind] = useState<AccountKind>("member");
  const [joinErr, setJoinErr] = useState("");
  const logoTaps = useRef({ n: 0, t: 0 });
  const [liveOpen, setLiveOpen] = useState(false);
  const [donateOpen, setDonateOpen] = useState(false);
  const [purge, setPurge] = useState("--:--:--");
  const scroller = useRef<HTMLDivElement>(null);
  const stickBottom = useRef(true);
  const lastMsgCount = useRef(0);
  const [newCount, setNewCount] = useState(0);
  const [openFolds, setOpenFolds] = useState<Record<string, boolean>>({});
  const inputRef = useRef<HTMLInputElement>(null);
  const [replyTo, setReplyTo] = useState<ChatMsg | null>(null);

  const room = ROOMS.find((r) => r.id === store.roomId) ?? ROOMS[0];
  const listed = useMemo(
    () =>
      ROOMS.filter(
        (r) =>
          (region === "All" || r.region === region) &&
          r.name.toLowerCase().includes(query.toLowerCase()),
      ),
    [query, region],
  );

  useEffect(() => {
    stickBottom.current = true;
    lastMsgCount.current = store.msgs.length;
    setNewCount(0);
    setOpenFolds({});
    setReplyTo(null);
    requestAnimationFrame(() => scroller.current?.scrollTo({ top: scroller.current.scrollHeight }));
  }, [store.roomId]);

  useEffect(() => {
    if (homeTab !== "chat") return;
    store.bumpPresence(false);
  }, [homeTab, store.roomId]);

  useEffect(() => {
    const added = store.msgs.length - lastMsgCount.current;
    lastMsgCount.current = store.msgs.length;
    if (added <= 0) return;
    if (stickBottom.current) {
      scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
      setNewCount(0);
    } else setNewCount((n) => n + added);
  }, [store.msgs]);

  const purged = useRef(false);
  useEffect(() => {
    purged.current = false;
    const tick = () => {
      const hours = store.chatHours;
      if (!hours) {
        setPurge("kept");
        return;
      }
      const oldest = store.msgs[0]?.ts;
      const end = oldest ? oldest + hours * 3600_000 : Date.now() + hours * 3600_000;
      const s = Math.max(0, Math.floor((end - Date.now()) / 1000));
      const d = Math.floor(s / 86400);
      const h = String(Math.floor((s % 86400) / 3600)).padStart(2, "0");
      const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
      const sec = String(s % 60).padStart(2, "0");
      setPurge(d > 0 ? `${d}d ${h}:${m}:${sec}` : `${h}:${m}:${sec}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [store.chatHours, store.msgs, store.roomId]);

  function goHome(roomId?: string) {
    if (roomId) {
      store.openRoom(roomId);
      setHomeTab("chat");
    } else setHomeTab("feeds");
    setScreen("home");
    setMenuOpen(false);
    setRoomsOpen(false);
  }

  return (
    <div className="kilode-shell flex h-full min-h-dvh flex-col bg-bg text-fg md:h-dvh md:max-h-dvh md:overflow-hidden">
      <header className="z-20 shrink-0 border-b border-line/80 bg-panel/90 backdrop-blur-md">
        <div className="flex h-12 min-w-0 items-center gap-1.5 px-2 sm:h-14 sm:gap-3 sm:px-3">
          <button
            type="button"
            className="shrink-0"
            aria-label="Kilode home"
            onClick={() => {
              const now = Date.now();
              if (now - logoTaps.current.t > 2500) logoTaps.current.n = 0;
              logoTaps.current.t = now;
              logoTaps.current.n += 1;
              if (logoTaps.current.n >= 5) {
                logoTaps.current.n = 0;
                window.location.href = session.user ? "/ops" : "/login?next=/ops";
                return;
              }
              goHome();
            }}
          >
            <img src="/kilode-logo-green.png" alt="Kilode" className="h-9 w-auto max-w-[200px] object-contain object-left sm:h-10 sm:max-w-[220px]" />
          </button>
          <nav className="mx-auto hidden min-w-0 items-center justify-center gap-1 md:flex">
            <HomeTab label="Feeds" on={homeTab === "feeds" && screen === "home"} onClick={() => { store.setOpenPost(null); setHomeTab("feeds"); setScreen("home"); setMenuOpen(false); }} />
            <HomeTab label="Chat" on={homeTab === "chat" && screen === "home"} onClick={() => { store.setOpenPost(null); setHomeTab("chat"); setScreen("home"); setMenuOpen(false); }} />
            <HomeTab label="Create" on={screen === "create"} onClick={() => { store.authed || session.user ? setScreen("create") : (window.location.href = "/login"); }} />
            <HomeTab label="Music" on={homeTab === "music" && screen === "home"} onClick={() => { store.setOpenPost(null); setHomeTab("music"); setScreen("home"); setMenuOpen(false); }} />
            <HomeTab label="Me" on={screen === "profile" || menuOpen} onClick={() => { setScreen("profile"); setMenuOpen(true); }} />
          </nav>
          <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
            <span className="hidden items-center gap-1.5 text-[11px] font-medium text-lime-2 sm:flex">
              <span className="size-1.5 animate-pulse rounded-full bg-lime-2" />
              Live
            </span>
            {session.isPending ? (
              <span className="h-8 w-12 animate-pulse rounded-lg bg-white/10" />
            ) : (
              <>
                <SignedIn>
                  <UserButton />
                </SignedIn>
                <SignedOut>
                  <Link to="/login" search={{}} className="btn-join rounded-lg px-2.5 py-1.5 text-[11px] font-bold sm:px-3 sm:text-xs">
                    Join
                  </Link>
                </SignedOut>
              </>
            )}

          </div>
        </div>
        <div className="flex flex-nowrap gap-1 overflow-x-auto overscroll-x-contain border-t border-line/60 px-2 py-1 [-ms-overflow-style:none] [scrollbar-width:none] md:hidden [&::-webkit-scrollbar]:hidden">
          <button type="button" className="nav-pill" onClick={() => setRoomsOpen(true)}>Rooms</button>
          <button type="button" className="nav-pill" onClick={() => setLiveOpen(true)}>Live</button>
          <button type="button" className="nav-pill" onClick={() => { setScreen("home"); setHomeTab("videos"); }}>Videos</button>
        </div>
        <div className="h-6 overflow-hidden border-t border-line/60 bg-panel-2">
          <div className="ticker-track px-4 text-[10px] leading-6 text-muted">
            {[...ROOMS.slice(0, 12), ...ROOMS.slice(0, 12)].map((r, i) => (
              <button key={r.id + i} type="button" aria-label={`Open room ${r.name}`} className="shrink-0 hover:text-fg" onClick={() => goHome(r.id)}>
                {r.name} · {fmt(r.online)}
              </button>
            ))}
            {store.campaigns
              .filter((c) => c.status === "approved")
              .flatMap((c) => [c, c])
              .map((c, i) => (
                <span key={c.id + "t" + i} className="shrink-0 text-lime-2">
                  Ad · {c.name}
                </span>
              ))}
          </div>
        </div>
      </header>

      {screen === "home" ? (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {homeTab === "feeds" ? (
            <div className="hidden shrink-0 border-b border-white/[0.05] px-4 py-3 md:block">
              <p className="text-[11px] font-medium tracking-wide text-lime-2">A global forum for every conversation</p>
              <h1 className="text-xl font-extrabold tracking-tight">
                Talk Nigeria. <span className="text-lime-2">Live.</span>
              </h1>
            </div>
          ) : null}
          {homeTab === "feeds" || homeTab === "music" ? (
            <div className="flex shrink-0 justify-end gap-1 border-b border-line px-2 py-0.5">
              {homeTab === "feeds" ? (
                <button type="button" className="btn-join rounded-full px-2.5 py-0.5 text-[10px] font-bold" onClick={() => (store.authed || session.user ? setScreen("create") : (window.location.href = "/login"))}>
                  New post
                </button>
              ) : (
                <button type="button" className="btn-join rounded-full px-2.5 py-0.5 text-[10px] font-bold" onClick={() => (store.authed || session.user ? setScreen("create") : (window.location.href = "/login"))}>
                  Add track
                </button>
              )}
            </div>
          ) : null}

          <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden md:grid-cols-[210px_minmax(0,1fr)_180px]">
            <aside className="hidden min-h-0 overflow-hidden border-r border-white/5 bg-panel md:flex md:flex-col">
              <RoomList query={query} setQuery={setQuery} listed={listed} roomId={store.roomId} onOpen={goHome} />
            </aside>

            <section className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-bg">
              {homeTab === "feeds" ? (
                <FeedPane store={store} />
              ) : homeTab === "music" ? (
                <MusicPane store={store} onAdd={() => (store.authed || session.user ? setScreen("create") : (window.location.href = "/login"))} />
              ) : homeTab === "videos" ? (
                <VideoPane />
              ) : homeTab === "advert" ? (
                <AdvertPane
                  ads={store.campaigns}
                  onCreate={() => (store.authed || session.user ? setScreen("ads") : setJoinOpen(true))}
                  onView={(id) => store.see("ads", id)}
                />
              ) : (
                <>
              <div className="flex items-center justify-between border-b border-white/5 bg-panel px-3 py-2">
                <div>
                  <div className="text-sm font-bold">{room.name}</div>
                  <div className="text-[10px] text-muted">
                    {fmt(room.online)} · {store.handle || "guest"}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label="Older messages"
                    disabled={!store.hasOlder}
                    onClick={() => store.olderChat()}
                    className={`grid size-7 place-items-center rounded-md border text-sm ${store.hasOlder ? "border-line text-fg" : "border-white/5 text-muted/40"}`}
                  >
                    <ChevronLeft className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Newer messages"
                    disabled={!store.hasNewer}
                    onClick={() => store.newerChat()}
                    className={`grid size-7 place-items-center rounded-md border text-sm ${store.hasNewer ? "border-line text-fg" : "border-white/5 text-muted/40"}`}
                  >
                    <ChevronRight className="size-3.5" />
                  </button>
                  <button type="button" onClick={() => setRoomsOpen(true)} className="btn-3d ml-1 rounded-full px-3 py-1 text-xs md:hidden">
                    Rooms
                  </button>
                  <button type="button" onClick={store.pinRoom} className="btn-3d ml-1 rounded-full px-3 py-1 text-xs">
                    Bookmark
                  </button>
                  <button type="button" onClick={() => setDonateOpen(true)} className="ml-1 rounded-full border border-line px-3 py-1 text-[10px] font-semibold text-muted">
                    Donate
                  </button>
                </div>
              </div>
              {store.online.length ? (
                <div className="flex items-center gap-1.5 overflow-x-auto border-b border-white/5 px-3 py-1.5">
                  {store.online.slice(0, 10).map((u) => (
                    <span key={u.handle} className="inline-flex shrink-0 items-center gap-1 rounded-full border border-line px-1.5 py-0.5" title={u.handle}>
                      <span className="size-1.5 rounded-full" style={{ background: handleColor(u.handle) }} />
                      <span className="max-w-[72px] truncate text-[10px]" style={{ color: handleColor(u.handle) }}>{u.handle}</span>
                    </span>
                  ))}
                  {store.typing.filter((n) => n !== store.handle).length ? (
                    <span className="ml-1 shrink-0 text-[10px] text-lime-2">
                      {store.typing.filter((n) => n !== store.handle).slice(0, 2).join(", ")} typing
                      <span className="typing-dots" />
                    </span>
                  ) : null}
                </div>
              ) : null}
              {store.campaigns
                .filter((c) => c.status === "approved" && c.placement === "chat-pin")
                .slice(0, 2)
                .map((c) => (
                  <ChatAdCard key={c.id} ad={c} pinned onView={() => store.see("ads", c.id)} />
                ))}
              <div className="relative min-h-0 flex-1">
              <div
                ref={scroller}
                className="h-full space-y-3 overflow-y-auto overscroll-contain p-3 sm:p-4"
                onScroll={() => {
                  const el = scroller.current;
                  if (!el) return;
                  const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 64;
                  stickBottom.current = atBottom;
                  if (atBottom) setNewCount(0);
                }}
              >
                {store.msgs.length === 0 ? (
                  <div className="space-y-3">
                    <div className="raised rounded-xl p-3">
                      <div className="text-[10px] font-bold tracking-wide text-lime-2 uppercase">Live room</div>
                      <div className="mt-1 text-sm font-bold">{room.name}</div>
                      <p className="mt-1 text-[11px] text-muted">Be first — say hi, drop a take, or jump rooms.</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {["Wave 👋", "Who is here?", "Hot take", "Good morning"].map((t) => (
                          <button
                            key={t}
                            type="button"
                            className="rounded-full border border-line px-3 py-1.5 text-[11px] font-semibold"
                            onClick={() => {
                              if (!(store.authed || session.user)) {
                                window.location.href = "/login";
                                return;
                              }
                              store.send(t);
                            }}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="mb-1.5 text-[10px] font-bold tracking-wide text-muted uppercase">Jump rooms</div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {ROOMS.slice(0, 6).map((r) => (
                          <button key={r.id} type="button" className="raised rounded-lg px-2 py-2 text-left" onClick={() => goHome(r.id)}>
                            <div className="truncate text-[11px] font-semibold">{r.name}</div>
                            <div className="text-[9px] text-muted">{fmt(r.online)} online</div>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="mb-1.5 text-[10px] font-bold tracking-wide text-muted uppercase">Tonight on Kilode</div>
                      <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        {["Afrobeats night", "Tech AMA", "Football watch", "Startup pitch", "Comedy hour"].map((x, i) => (
                          <div key={x} className="w-[120px] shrink-0 overflow-hidden rounded-xl" style={{ background: `linear-gradient(145deg, ${["#14351f","#1a2744","#3b2a16","#2a2438","#2d1f3d"][i]}, #0a0a0a)` }}>
                            <div className="p-2.5">
                              <div className="text-[11px] font-bold leading-tight">{x}</div>
                              <div className="mt-1 text-[9px] text-muted">Tonight</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : null}
                {mixChatAds(
                  chatRows(store.msgs),
                  store.campaigns.filter((c) => c.status === "approved" && c.placement === "chat"),
                ).map((row) => {
                  if (row.kind === "chip") {
                    return (
                      <div key={row.key} className="flex justify-center">
                        <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-muted">{row.label}</span>
                      </div>
                    );
                  }
                  if (row.kind === "ad") {
                    return <ChatAdCard key={row.key} ad={row.ad} onView={() => store.see("ads", row.ad.id)} />;
                  }
                  if (row.kind === "fold") {
                    const open = openFolds[row.key];
                    return (
                      <div key={row.key}>
                        <button
                          type="button"
                          className="text-[11px] text-lime-2"
                          onClick={() => setOpenFolds((m) => ({ ...m, [row.key]: !open }))}
                        >
                          {open ? "Hide" : `${row.n} more from ${row.author}`}
                        </button>
                        {open
                          ? row.hidden.map((m) => (
                              <ChatLine key={m.ts + m.n} m={m} handle={store.handle} onReact={store.react} onReply={(msg) => { setReplyTo(msg); inputRef.current?.focus(); }} />
                            ))
                          : null}
                      </div>
                    );
                  }
                  return <ChatLine key={row.key} m={row.m} handle={store.handle} onReact={store.react} onReply={(msg) => { setReplyTo(msg); inputRef.current?.focus(); }} />;
                })}
              </div>
              {newCount > 0 ? (
                <button
                  type="button"
                  className="btn-3d absolute bottom-2 left-1/2 z-10 -translate-x-1/2 rounded-full px-3 py-1 text-[11px] font-semibold"
                  onClick={() => {
                    stickBottom.current = true;
                    setNewCount(0);
                    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
                  }}
                >
                  {newCount} new ↓
                </button>
              ) : null}
              </div>
              <form
                className="relative flex shrink-0 gap-2 border-t border-line bg-panel/90 p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!(store.authed || session.user)) {
                    window.location.href = "/login";
                    return;
                  }
                  store.send(draft, replyTo?.ts);
                  setDraft("");
                  setReplyTo(null);
                  setEmojiOpen(false);
                  stickBottom.current = true;
                  setNewCount(0);
                  store.bumpPresence(false);
                  inputRef.current?.focus();
                }}
              >
                {replyTo ? (
                  <div className="absolute bottom-full left-2 right-2 mb-1 flex items-center justify-between rounded-lg border border-line bg-panel-2 px-2 py-1">
                    <p className="min-w-0 truncate text-[11px]">
                      Reply to <span style={{ color: handleColor(replyTo.n) }}>{replyTo.n}</span>
                      <span className="text-muted"> · {replyTo.t.slice(0, 60)}</span>
                    </p>
                    <button type="button" className="shrink-0 text-[11px] text-muted" onClick={() => setReplyTo(null)}>
                      ×
                    </button>
                  </div>
                ) : null}
                {emojiOpen ? (
                  <div className="absolute bottom-full left-2 mb-1 grid max-h-36 grid-cols-8 gap-1 overflow-y-auto rounded-xl border border-line bg-panel-2 p-2">
                    {EMOJIS.map((e) => (
                      <button key={e} type="button" className="grid size-8 place-items-center text-base" onClick={() => setDraft((d) => d + e)}>
                        {e}
                      </button>
                    ))}
                  </div>
                ) : null}
                {store.authed || session.user ? (
                  <button type="button" className="btn-3d grid size-11 place-items-center rounded-full" onClick={() => setEmojiOpen((o) => !o)} aria-label="Emoji">
                    <Smile className="size-4 text-lime-2" />
                  </button>
                ) : null}
                <input
                  ref={inputRef}
                  value={draft}
                  onChange={(e) => {
                    if (!(store.authed || session.user)) return;
                    setDraft(e.target.value);
                    store.bumpPresence(true);
                  }}
                  readOnly={!(store.authed || session.user)}
                  placeholder={store.authed || session.user ? "Message + emoji" : "Sign in to chat"}
                  data-chat-input="1"
                  className="min-h-11 flex-1 rounded-full border border-line bg-panel-3 px-4 text-sm outline-none"
                />
                {store.authed || session.user ? (
                  <button type="submit" className="btn-join inline-flex min-h-11 shrink-0 items-center justify-center gap-1 rounded-full px-3.5 text-xs font-bold">
                    <Send className="size-3.5" />
                    Send
                  </button>
                ) : (
                  <Link to="/login" search={{}} className="btn-join inline-flex min-h-11 shrink-0 items-center justify-center gap-1 rounded-full px-3.5 text-xs font-bold">
                    Sign in
                  </Link>
                )}
              </form>
                </>
              )}
            </section>

            <aside className="hidden min-h-0 overflow-y-auto border-l border-white/5 bg-panel md:block">
              {store.campaigns.filter((c) => c.status === "approved" && c.placement === "sidebar").map((c) => (
                <div key={c.id} className="raised m-2 rounded-xl p-3">
                  <div className="text-[10px] uppercase tracking-wide text-muted">Ad</div>
                  <div className="text-sm font-semibold">{c.name}</div>
                </div>
              ))}
              {homeTab === "chat" ? (
              <div className="raised m-2 rounded-xl p-3">
                <div className="text-[10px] uppercase tracking-wide text-muted">Chat lifetime</div>
                <div className="text-base font-extrabold text-danger">{purge === "kept" ? "Kept" : purge}</div>
                <p className="mt-1 text-[10px] text-muted">
                  {store.chatHours === 0
                    ? "Super admin set chat to never expire."
                    : `Messages older than ${chatTtlLabel(store.chatHours)} disappear. Feeds, music, videos, and ads stay.`}
                </p>
              </div>
              ) : null}
              <div className="raised m-2 rounded-xl p-3">
                <div className="mb-2 text-[10px] font-bold tracking-wide text-muted uppercase">Who just joined</div>
                {store.joins.length === 0 ? <p className="text-[11px] text-muted">Waiting for joins</p> : null}
                {store.joins.slice(0, 6).map((j) => (
                  <div key={j.name + j.ts} className="flex items-center justify-between py-1 text-xs">
                    <span className="truncate text-fg">{j.name}</span>
                    <span className="max-w-[72px] truncate text-[10px] text-lime-2">{j.room ? roomName(j.room) : "live"}</span>
                  </div>
                ))}
              </div>
              <div className="raised m-2 rounded-xl p-3">
                <div className="mb-2 text-[10px] font-bold tracking-wide text-muted uppercase">Activity</div>
                {store.notes.length === 0 ? <p className="text-[11px] text-muted">Quiet right now</p> : null}
                {store.notes.slice(0, 8).map((n) => (
                  <div key={n.id} className="border-t border-white/5 py-1.5 text-[11px] text-muted">
                    {n.text}
                  </div>
                ))}
              </div>
            </aside>
          </div>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-hidden">
          <QonvoScreen
            id={screen}
            store={store}
            onHome={goHome}
            onForum={() => {
              setScreen("home");
              setHomeTab(store.tracks[0] && Date.now() - store.tracks[0].ts < 4000 ? "music" : "feeds");
            }}
          />
        </div>
      )}

      <nav className="z-20 grid shrink-0 grid-cols-5 border-t border-line bg-panel/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <Tab icon={<Home className="size-4" />} label="Feeds" on={screen === "home" && homeTab === "feeds"} onClick={() => { setMenuOpen(false); setScreen("home"); setHomeTab("feeds"); store.setOpenPost(null); }} />
        <Tab icon={<MessageSquare className="size-4" />} label="Chat" on={screen === "home" && homeTab === "chat"} onClick={() => { setMenuOpen(false); setScreen("home"); setHomeTab("chat"); }} />
        <Tab icon={<PlusSquare className="size-5" />} label="Create" on={screen === "create"} onClick={() => { setMenuOpen(false); store.authed || session.user ? setScreen("create") : (window.location.href = "/login"); }} />
        <Tab icon={<Radio className="size-4" />} label="Music" on={screen === "home" && homeTab === "music"} onClick={() => { setMenuOpen(false); setScreen("home"); setHomeTab("music"); }} />
        <Tab icon={<User className="size-4" />} label="Me" on={screen === "profile" || menuOpen} onClick={() => { setScreen("profile"); setMenuOpen(true); }} />
      </nav>

      {roomsOpen ? (
        <div className="fixed inset-0 z-30 flex md:hidden">
          <aside className="h-full w-[min(300px,88vw)] overflow-y-auto bg-panel">
            <div className="flex items-center justify-between border-b border-line p-3">
              <strong>Rooms</strong>
              <button type="button" onClick={() => setRoomsOpen(false)}>
                <X className="size-4" />
              </button>
            </div>
            <div className="flex gap-2 overflow-x-auto p-2">
              {REGIONS.slice(0, 8).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRegion(r)}
                  className={`shrink-0 rounded-full border px-2 py-1 text-[11px] ${region === r ? "border-lime-2/50" : "border-line text-muted"}`}
                >
                  {r}
                </button>
              ))}
            </div>
            <RoomList query={query} setQuery={setQuery} listed={listed} roomId={store.roomId} onOpen={goHome} />
          </aside>
          <button type="button" className="flex-1 bg-black/60" aria-label="Close rooms" onClick={() => setRoomsOpen(false)} />
        </div>
      ) : null}

      {liveOpen ? (
        <div className="fixed inset-0 z-30 flex md:hidden">
          <button type="button" className="flex-1 bg-black/60" aria-label="Close live" onClick={() => setLiveOpen(false)} />
          <aside className="h-full w-[min(300px,88vw)] overflow-y-auto bg-panel">
            <div className="flex items-center justify-between border-b border-line p-3">
              <strong>Live</strong>
              <button type="button" onClick={() => setLiveOpen(false)} aria-label="Close">
                <X className="size-4" />
              </button>
            </div>
            <div className="raised m-2 rounded-xl p-3">
              <div className="mb-2 text-[10px] font-bold tracking-wide text-muted uppercase">Who just joined</div>
              {store.joins.length === 0 ? <p className="text-[11px] text-muted">Waiting for joins</p> : null}
              {store.joins.slice(0, 8).map((j) => (
                <div key={j.name + j.ts} className="flex items-center justify-between py-1 text-xs">
                  <span className="truncate text-fg">{j.name}</span>
                  <span className="max-w-[72px] truncate text-[10px] text-lime-2">{j.room ? roomName(j.room) : "live"}</span>
                </div>
              ))}
            </div>
            <div className="raised m-2 rounded-xl p-3">
              <div className="mb-2 text-[10px] font-bold tracking-wide text-muted uppercase">Activity</div>
              {store.notes.length === 0 ? <p className="text-[11px] text-muted">Quiet right now</p> : null}
              {store.notes.slice(0, 10).map((n) => (
                <div key={n.id} className="border-t border-white/5 py-1.5 text-[11px] text-muted">
                  {n.text}
                </div>
              ))}
            </div>
            {homeTab === "chat" ? (
              <div className="raised m-2 rounded-xl p-3">
                <div className="text-[10px] uppercase tracking-wide text-muted">Chat lifetime</div>
                <div className="text-base font-extrabold text-danger">{purge === "kept" ? "Kept" : purge}</div>
              </div>
            ) : null}
          </aside>
        </div>
      ) : null}

      {menuOpen ? (
        <div className="fixed inset-0 z-30 flex">
          <aside className="flex h-full w-[min(320px,90vw)] flex-col border-r border-line bg-panel">
            <div className="flex items-center gap-3 border-b border-line p-4">
              <QonvoMark className="size-10" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold">{store.handle || "Guest"}</div>
                <div className="text-[10px] uppercase tracking-wide text-muted">
                  {session.user ? ACCOUNT_KINDS.find((k) => k.id === store.kind)?.label ?? "Member" : "Me · Kilode"}
                </div>
              </div>
              <button type="button" onClick={() => setMenuOpen(false)} aria-label="Close">
                <X className="size-4" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-3 pb-5">
              <div className="mb-4 grid grid-cols-3 gap-2 px-0.5">
                {[
                  { n: store.posts.length, l: "Posts" },
                  { n: store.pins.length, l: "Rooms" },
                  { n: store.campaigns.filter((c) => c.status === "approved").length, l: "Ads" },
                ].map((s) => (
                  <div key={s.l} className="raised rounded-xl px-2 py-2.5 text-center">
                    <div className="text-sm font-bold text-lime-2">{s.n}</div>
                    <div className="text-[9px] text-muted">{s.l}</div>
                  </div>
                ))}
              </div>

              <div className="mb-4 px-0.5">
                <div className="mb-2 text-[10px] font-semibold tracking-widest text-muted uppercase">Quick</div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "create" as MenuId, label: "Create", tab: null as null | "feeds" | "music" | "chat" | "videos" },
                    { id: "ads" as MenuId, label: "Place ad", tab: null },
                    { id: "inbox" as MenuId, label: "Messages", tab: null },
                    { id: "home" as MenuId, label: "Chat rooms", tab: "chat" as const },
                  ].map((q) => {
                    const Icon = ICONS[q.id === "home" ? "forum" : q.id] ?? MessageSquare;
                    return (
                      <button
                        key={q.label}
                        type="button"
                        className="raised flex items-center gap-2.5 rounded-xl px-3 py-3 text-left"
                        onClick={() => {
                          if (q.tab) {
                            setScreen("home");
                            setHomeTab(q.tab);
                          } else if (q.id === "home") goHome();
                          else setScreen(q.id);
                          setMenuOpen(false);
                        }}
                      >
                        <Icon className="size-4 shrink-0 text-lime-2" />
                        <span className="text-[12px] font-semibold">{q.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {store.campaigns.filter((c) => c.status === "approved").slice(0, 2).length ? (
                <div className="mb-4 px-0.5">
                  <div className="mb-2 text-[10px] font-semibold tracking-widest text-muted uppercase">Sponsored</div>
                  <div className="space-y-2">
                    {store.campaigns
                      .filter((c) => c.status === "approved")
                      .slice(0, 2)
                      .map((c) => (
                        <a
                          key={c.id}
                          href={c.link || "#"}
                          target={c.link ? "_blank" : undefined}
                          rel="noreferrer"
                          onClick={() => {
                            store.see("ads", c.id);
                            setMenuOpen(false);
                          }}
                          className="raised flex items-center gap-2.5 overflow-hidden rounded-xl p-2"
                        >
                          {c.image ? <img src={c.image} alt="" className="h-10 w-12 shrink-0 rounded-md object-cover" /> : <div className="grid h-10 w-12 place-items-center rounded-md bg-panel-3 text-[8px] text-lime-2">AD</div>}
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-[11px] font-semibold">{c.name}</div>
                            <div className="truncate text-[9px] text-muted">{c.note || "Sponsored"}</div>
                          </div>
                        </a>
                      ))}
                  </div>
                </div>
              ) : null}

              <div className="mb-4 px-0.5">
                <div className="mb-2 text-[10px] font-semibold tracking-widest text-muted uppercase">Hot rooms</div>
                <div className="flex flex-wrap gap-2">
                  {ROOMS.slice(0, 8).map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      className="rounded-full border border-line px-2.5 py-1 text-[10px] font-semibold"
                      onClick={() => {
                        goHome(r.id);
                        setMenuOpen(false);
                      }}
                    >
                      {r.name}
                    </button>
                  ))}
                </div>
              </div>

              {MENU_GROUPS.map((group) => (
                <div key={group.label} className="mb-4">
                  <div className="px-1 py-1.5 text-[10px] font-semibold tracking-widest text-muted uppercase">{group.label}</div>
                  <div className="space-y-0.5">
                    {group.ids.map((id) => {
                      const Icon = ICONS[id];
                      const label = MENU.find((m) => m[0] === id)?.[1] ?? id;
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => {
                            if (id === "home") goHome();
                            else setScreen(id);
                            setMenuOpen(false);
                          }}
                          className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm ${
                            screen === id ? "bg-panel-2 text-lime-2" : "hover:bg-panel-2"
                          }`}
                        >
                          <Icon className="size-4 shrink-0 text-lime-2" />
                          <span className="truncate">{label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              <div className="px-2 py-1 text-[10px] font-semibold tracking-widest text-muted uppercase">Also</div>
              <div className="space-y-0.5">
                <button
                  type="button"
                  onClick={() => { setScreen("home"); setHomeTab("videos"); setMenuOpen(false); }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-panel-2"
                >
                  <Play className="size-4 shrink-0 text-lime-2" />
                  Videos
                </button>
                <button
                  type="button"
                  onClick={() => { setScreen("home"); setHomeTab("music"); setMenuOpen(false); }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-panel-2"
                >
                  <Radio className="size-4 shrink-0 text-lime-2" />
                  Music
                </button>
                {session.user ? (
                  <a
                    href="/ops"
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-panel-2"
                    onClick={() => setMenuOpen(false)}
                  >
                    <Shield className="size-4 shrink-0 text-lime-2" />
                    Staff
                  </a>
                ) : null}
              </div>
            </div>
            <div className="border-t border-white/5 px-4 py-4">
              <button type="button" className="btn-join w-full rounded-xl py-2.5 text-[12px] font-bold" onClick={() => { setDonateOpen(true); setMenuOpen(false); }}>
                Donate · keep Kilode up
              </button>
            </div>
          </aside>
          <button type="button" className="flex-1 bg-black/60" aria-label="Close menu" onClick={() => setMenuOpen(false)} />
        </div>
      ) : null}

      {donateOpen ? <DonateSheet onClose={() => setDonateOpen(false)} /> : null}

      {joinOpen ? (
        <div className="fixed inset-0 z-40 grid place-items-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-line bg-panel p-4">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-lg font-bold">Username + password</h2>
              <button type="button" onClick={() => setJoinOpen(false)} aria-label="Close">
                <X className="size-4" />
              </button>
            </div>
            <input
              value={joinName}
              onChange={(e) => setJoinName(e.target.value)}
              placeholder="Username"
              className="mb-2 w-full rounded-lg border border-line bg-black/40 px-3 py-2 text-sm outline-none"
            />
            <input
              type="password"
              value={joinPass}
              onChange={(e) => setJoinPass(e.target.value)}
              placeholder="Password"
              className="mb-3 w-full rounded-lg border border-line bg-black/40 px-3 py-2 text-sm outline-none"
            />
            {joinErr ? <p className="mb-2 text-sm text-danger">{joinErr}</p> : null}
            {store.authErr ? <p className="mb-2 text-sm text-danger">{store.authErr}</p> : null}
            <div className="mb-2">
              <div className="mb-1 text-[10px] font-bold tracking-wide text-muted uppercase">Joining as (new users)</div>
              <AccountKindPicker value={joinKind} onChange={setJoinKind} />
            </div>
            <label className="mb-2 flex items-start gap-2 rounded-lg border border-line p-2 text-[11px] text-muted">
              <input type="checkbox" className="mt-0.5" checked={joinAgree} onChange={(e) => setJoinAgree(e.target.checked)} />
              <span>
                I agree to the{" "}
                <button type="button" className="text-lime-2 underline" onClick={() => { setJoinOpen(false); setScreen("help"); }}>
                  Terms & Conditions
                </button>{" "}
                and that I am responsible for posts, music URLs, and ads I submit.
              </span>
            </label>
            <p className="mb-2 text-[11px] text-muted">No email. Needed to post, list music, or place ads. Browse stays open.</p>
            <div className="flex gap-2">
              <button
                type="button"
                className="flex-1 rounded-lg border border-line bg-panel-3 py-2 text-sm font-bold"
                onClick={() => {
                  void (async () => {
                    setJoinErr("");
                    const handle = publicUsername(joinName);
                    if (handle.length < 3) {
                      setJoinErr("Username needs 3+ characters.");
                      return;
                    }
                    if (joinPass.length < 8) {
                      setJoinErr("Password needs 8+ characters.");
                      return;
                    }
                    if (!joinAgree) {
                      setJoinErr("Accept the Terms to register.");
                      return;
                    }
                    try {
                      sessionStorage.setItem("nf_account", JSON.stringify({ kind: joinKind }));
                    } catch {
                      /* ignore */
                    }
                    const r = await authClient.signUp.email({ email: accountEmail(handle), password: joinPass, name: handle });
                    if (r.error) setJoinErr(r.error.message ?? "Sign up failed");
                    else window.location.reload();
                  })();
                }}
              >
                Register
              </button>
              <button
                type="button"
                className="flex-1 rounded-lg border border-line py-2 text-sm"
                onClick={() => {
                  void (async () => {
                    setJoinErr("");
                    const handle = publicUsername(joinName);
                    let last = "Sign in failed";
                    for (const email of accountEmails(handle)) {
                      const r = await authClient.signIn.email({ email, password: joinPass });
                      if (!r.error) {
                        window.location.reload();
                        return;
                      }
                      last = r.error.message ?? last;
                    }
                    setJoinErr(last);
                  })();
                }}
              >
                Sign in
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Tab({
  icon,
  label,
  on,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  on: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className={`app-tab flex min-h-12 flex-col items-center justify-center gap-0.5 text-[10px] font-semibold ${on ? "on" : ""}`}>
      {icon}
      {label}
    </button>
  );
}

function RoomList({
  query,
  setQuery,
  listed,
  roomId,
  onOpen,
}: {
  query: string;
  setQuery: (v: string) => void;
  listed: Room[];
  roomId: string;
  onOpen: (id: string) => void;
}) {
  return (
    <>
      <div className="shrink-0 border-b border-white/5 p-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search rooms"
          className="w-full rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 text-xs outline-none"
        />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
      {listed.map((r) => (
        <button
          key={r.id}
          type="button"
          onClick={() => onOpen(r.id)}
          className={`flex w-full items-center justify-between border-l-2 px-3 py-2 text-left ${
            r.id === roomId ? "border-lime-2 bg-panel-2" : "border-transparent hover:bg-panel-2"
          }`}
        >
          <span>
            <span className="block text-xs font-semibold">{r.name}</span>
            <span className="text-[10px] text-muted">
              {fmt(r.online)} · {r.region}
            </span>
          </span>
        </button>
      ))}
      </div>
    </>
  );
}

function MusicPane({ store, onAdd }: { store: ReturnType<typeof useQonvo>; onAdd: () => void }) {
  const [q, setQ] = useState("");
  const [genre, setGenre] = useState<(typeof MUSIC_GENRES)[number]>("All");
  const [play, setPlay] = useState<string | null>(null);
  const [mineShown, setMineShown] = useState(8);
  const [digShown, setDigShown] = useState(8);

  const mineAll = useMemo(() => {
    const s = q.trim().toLowerCase();
    return store.tracks.filter((t) => {
      if (genre !== "All" && (t.genre || "Afrobeats") !== genre) return false;
      if (!s) return true;
      return `${t.artist} ${t.title} ${t.author} ${t.genre ?? ""}`.toLowerCase().includes(s);
    });
  }, [store.tracks, q, genre]);

  const digAll = useMemo(() => {
    const s = q.trim().toLowerCase();
    return DIGITAL_TRACKS.filter((t) => {
      if (genre !== "All" && (t.genre || "Afrobeats") !== genre) return false;
      if (!s) return true;
      return `${t.artist} ${t.title} ${t.genre ?? ""}`.toLowerCase().includes(s);
    });
  }, [q, genre]);

  const mine = mineAll.slice(0, mineShown);
  const digital = digAll.slice(0, digShown);
  const chart = [...DIGITAL_TRACKS].slice(0, 10);
  const fresh = [...DIGITAL_TRACKS].slice().reverse().slice(0, 10);

  function Tile({ t, compact }: { t: (typeof store.tracks)[number]; compact?: boolean }) {
    const on = play === t.id;
    return (
      <div className="raised overflow-hidden rounded-lg">
        <button
          type="button"
          data-play="1"
          className={`flex w-full items-center gap-1.5 text-left ${compact ? "px-1 py-1" : "px-1.5 py-1.5"}`}
          onClick={() => {
            setPlay(on ? null : t.id);
            if (!on) store.see("tracks", t.id);
          }}
        >
          {t.cover ? (
            <img src={t.cover} alt="" className={`${compact ? "size-8" : "size-9"} shrink-0 rounded object-cover`} />
          ) : (
            <span className="btn-3d grid size-8 shrink-0 place-items-center rounded-full">
              <Play className="size-3 fill-lime-2 text-lime-2" />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <div className="truncate text-[10px] font-semibold leading-tight">{t.title}</div>
            <div className="truncate text-[8px] text-muted">
              {t.artist}
              {!compact ? ` · ${t.platform}` : ""}
            </div>
          </div>
          <Play className="size-3 shrink-0 text-lime-2" />
        </button>
        {on && t.embed ? (
          <iframe title={t.title} src={`${t.embed}${t.embed.includes("?") ? "&" : "?"}theme=0`} className="h-[72px] w-full border-0" allow="encrypted-media; autoplay" />
        ) : null}
      </div>
    );
  }

  function Rail({ title, items }: { title: string; items: (typeof DIGITAL_TRACKS)[number][] }) {
    return (
      <section className="mb-3">
        <div className="mb-1.5 flex items-center justify-between px-0.5">
          <h3 className="text-[11px] font-bold tracking-wide text-fg">{title}</h3>
          <span className="text-[9px] text-muted">{items.length}</span>
        </div>
        <div className="flex gap-2 overflow-x-auto overscroll-x-contain pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {items.map((t) => (
            <button
              key={`${title}-${t.id}`}
              type="button"
              className="w-[88px] shrink-0 text-left"
              onClick={() => {
                setPlay(t.id);
                store.see("tracks", t.id);
              }}
            >
              <div className="raised aspect-square overflow-hidden rounded-lg">
                {t.cover ? <img src={t.cover} alt="" className="size-full object-cover" /> : <div className="grid size-full place-items-center bg-panel-3"><Play className="size-4 text-lime-2" /></div>}
              </div>
              <div className="mt-1 truncate text-[10px] font-semibold leading-tight">{t.title}</div>
              <div className="truncate text-[8px] text-muted">{t.artist}</div>
            </button>
          ))}
        </div>
      </section>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center gap-2 border-b border-white/5 px-2 py-1.5">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search songs, artists, genres"
          className="min-h-9 flex-1 rounded-lg border border-line bg-panel px-3 text-xs outline-none"
        />
        <button type="button" className="btn-3d shrink-0 rounded-md px-2 py-1 text-[11px] font-semibold" onClick={onAdd}>
          Add
        </button>
      </div>

      <div className="flex shrink-0 flex-nowrap gap-1.5 overflow-x-auto overscroll-x-contain border-b border-line px-3 py-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {MUSIC_GENRES.map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => {
              setGenre(g);
              setMineShown(8);
              setDigShown(8);
            }}
            className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-bold tracking-wide ${genre === g ? "btn-3d text-lime-2" : "border border-line bg-panel-2 text-fg/80"}`}
          >
            {g}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 pb-6">
        <section className="mb-3">
          <div className="mb-1.5 text-[11px] font-bold">Browse</div>
          <div className="flex gap-2 overflow-x-auto overscroll-x-contain pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {MUSIC_RAILS.map((r) => (
              <button key={r.id} type="button" className="w-[132px] shrink-0 overflow-hidden rounded-xl text-left" style={{ background: `linear-gradient(145deg, ${r.color}, #0a0a0a)` }} onClick={onAdd}>
                <div className="p-2.5">
                  <div className="text-[11px] font-bold leading-tight text-fg">{r.title}</div>
                  <div className="mt-1 text-[9px] text-muted">{r.subtitle}</div>
                </div>
              </button>
            ))}
          </div>
        </section>

        <Rail title="Naija charts" items={chart} />
        <Rail title="New & trending" items={fresh} />
        <Rail title="Made for Kilode" items={[...DIGITAL_TRACKS].sort((a, b) => (b.views ?? 0) - (a.views ?? 0)).slice(0, 10)} />

        <div className="mb-1.5 text-[11px] font-bold">Library split</div>
        <div className="grid grid-cols-2 gap-2">
          <section className="min-w-0">
            <h3 className="mb-1.5 text-[9px] font-bold tracking-wide text-lime-2 uppercase">On Kilode</h3>
            <div className="space-y-1">
              {mine.length === 0 ? <p className="text-[10px] text-muted">No match — Add a track.</p> : null}
              {mine.map((t) => (
                <Tile key={t.id} t={t} compact />
              ))}
            </div>
            {mineShown < mineAll.length ? (
              <button type="button" className="btn-join mt-2 w-full rounded-lg py-1.5 text-[10px] font-bold" onClick={() => setMineShown((n) => n + 8)}>
                Load more · {mineAll.length - mineShown}
              </button>
            ) : null}
          </section>
          <section className="min-w-0">
            <h3 className="mb-1.5 text-[9px] font-bold tracking-wide text-muted uppercase">Digital</h3>
            <div className="space-y-1">
              {digital.map((t) => (
                <Tile key={t.id} t={t} compact />
              ))}
            </div>
            {digShown < digAll.length ? (
              <button type="button" className="btn-join mt-2 w-full rounded-lg py-1.5 text-[10px] font-bold" onClick={() => setDigShown((n) => n + 8)}>
                Load more · {digAll.length - digShown}
              </button>
            ) : null}
          </section>
        </div>
      </div>
    </div>
  );
}

function VideoPane() {
  const [sec, setSec] = useState<(typeof VIDEO_SECTIONS)[number]>("Movies");
  const [play, setPlay] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [shown, setShown] = useState(12);
  const [views, setViews] = useState<Record<string, number>>({});
  const list = useMemo(() => {
    const raw = [...(VIDEO_CATALOG[sec] ?? [])];
    for (let i = raw.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [raw[i], raw[j]] = [raw[j], raw[i]];
    }
    return raw;
  }, [sec, tick]);
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-white/5 px-2 py-1">
        {VIDEO_SECTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => {
              setSec(s);
              setPlay(null);
              setShown(12);
            }}
            className={`shrink-0 rounded-full px-2 py-1 text-[10px] ${sec === s ? "btn-3d font-semibold" : "text-muted"}`}
          >
            {s}
          </button>
        ))}
        <button
          type="button"
          className="btn-3d ml-auto shrink-0 rounded-md px-2 py-1 text-[10px] font-semibold"
          onClick={() => {
            setPlay(null);
            setTick((n) => n + 1);
            setShown(12);
          }}
        >
          Refresh
        </button>
      </div>
      {play ? (
        <iframe title="video" src={`https://www.youtube.com/embed/${play}?rel=0`} className="h-40 w-full shrink-0 border-0 bg-black" allow="encrypted-media; fullscreen" loading="lazy" />
      ) : null}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2 pb-3">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-6">
          {list.slice(0, shown).map((v) => (
            <button
              key={v.id}
              type="button"
              className="raised overflow-hidden rounded-lg text-left"
              onClick={() => {
                setPlay(v.id);
                setViews((m) => ({ ...m, [v.id]: (m[v.id] ?? 0) + 1 }));
              }}
            >
              <img src={`https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`} alt="" className="h-24 w-full object-cover" />
              <div className="flex items-center gap-1 p-1.5">
                <Play className="size-3 shrink-0 text-lime-2" />
                <span className="line-clamp-2 text-[10px] font-semibold">{v.title}</span>
              </div>
              <div className="px-1.5 pb-1.5 text-[9px] text-muted">{fmtCount(views[v.id] ?? 0)} views</div>
            </button>
          ))}
        </div>
        {shown < list.length ? (
          <button type="button" className="btn-3d mx-auto mt-3 block rounded-md px-4 py-1.5 text-[11px] font-semibold" onClick={() => setShown((n) => n + 6)}>
            Load more
          </button>
        ) : null}
        <p className="mt-2 px-1 text-[10px] text-muted">YouTube CDN only. This site does not host or stream video files.</p>
      </div>
    </div>
  );
}

function HomeTab({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <button type="button" data-tab={label.toLowerCase()} onClick={onClick} className={`nav-pill ${on ? "on" : ""}`}>
      {label}
    </button>
  );
}

function ArticleRead({ post, store }: { post: import("@/lib/qonvo-data").Post; store: ReturnType<typeof useQonvo> }) {
  const session = useCurrentUserState();
  const [note, setNote] = useState("");
  const [reason, setReason] = useState("");
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    store.see("posts", post.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post.id]);
  const roots = post.comments.filter((c) => !c.parentTs);
  const kids = (ts: number) => post.comments.filter((c) => c.parentTs === ts);
  const mins = Math.max(1, Math.round(post.body.split(/\s+/).length / 180));
  const saved = store.savedPosts.includes(post.id);
  const likes = store.likes[post.id] ?? 0;
  const shares = store.shares[post.id] ?? 0;
  const url = typeof window !== "undefined" ? `${window.location.origin}/p/${encodeURIComponent(post.slug || post.id)}` : "";
  const shareText = `${post.title} — Kilode`;
  function share(kind: "wa" | "x" | "fb" | "tg" | "copy" | "native") {
    store.sharePost(post.id);
    const u = encodeURIComponent(url);
    const t = encodeURIComponent(shareText);
    if (kind === "wa") window.open(`https://wa.me/?text=${t}%20${u}`, "_blank", "noopener,noreferrer");
    if (kind === "x") window.open(`https://twitter.com/intent/tweet?text=${t}&url=${u}`, "_blank", "noopener,noreferrer");
    if (kind === "fb") window.open(`https://www.facebook.com/sharer/sharer.php?u=${u}`, "_blank", "noopener,noreferrer");
    if (kind === "tg") window.open(`https://t.me/share/url?url=${u}&text=${t}`, "_blank", "noopener,noreferrer");
    if (kind === "copy") {
      void navigator.clipboard?.writeText(url).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      });
    }
    if (kind === "native" && navigator.share) void navigator.share({ title: post.title, text: shareText, url });
  }
  return (
    <article className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-3xl px-4 py-4">
        <button type="button" className="text-[11px] text-muted" onClick={() => store.setOpenPost(null)}>
          ← Feeds
        </button>
        <div className="raised mt-3 overflow-hidden rounded-2xl">
          <div className="flex flex-col gap-4 p-4 sm:flex-row">
            {post.image ? <img src={post.image} alt="" className="h-44 w-full shrink-0 rounded-xl object-cover sm:h-48 sm:w-60" /> : null}
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-bold tracking-[0.16em] text-lime-2 uppercase">{post.category || "General"}</div>
              <h1 className="mt-1 text-2xl font-extrabold leading-tight">{post.title}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted">
                <HandleLink handle={post.author} className="text-[11px] font-semibold" />
                <span>· {timeLabel(post.ts)}</span>
                <span>· {mins} min read</span>
                {post.tags ? <span>· {post.tags}</span> : null}
              </div>
              {post.excerpt ? <p className="mt-3 text-sm italic text-muted">{post.excerpt}</p> : null}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-px border-t border-white/5 bg-black/30 sm:grid-cols-6">
            {[
              { icon: Eye, n: post.views ?? 0, label: "Views" },
              { icon: MessageSquare, n: post.comments.length, label: "Comments" },
              { icon: Heart, n: likes, label: "Likes" },
              { icon: Bookmark, n: saved ? 1 : 0, label: saved ? "Saved" : "Save" },
              { icon: Share2, n: shares, label: "Shares" },
              { icon: Hash, n: mins, label: "Min" },
            ].map((s) => (
              <div key={s.label} className="flex flex-col items-center gap-0.5 bg-panel py-2.5">
                <s.icon className="size-3.5 text-lime-2" />
                <span className="text-[11px] font-bold">{fmtCount(s.n)}</span>
                <span className="text-[9px] tracking-wide text-muted uppercase">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <button type="button" className="btn-3d inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-semibold" onClick={() => store.likePost(post.id)}>
            <Heart className="size-3 fill-lime-2 text-lime-2" /> Like
          </button>
          <button type="button" className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-[11px] font-semibold ${saved ? "btn-3d" : "border-line text-muted"}`} onClick={() => store.savePostMark(post.id)}>
            <Bookmark className="size-3" /> {saved ? "Saved" : "Save"}
          </button>
          <button type="button" className="inline-flex items-center gap-1 rounded-full border border-line px-3 py-1.5 text-[11px]" onClick={() => share("wa")}>
            WA
          </button>
          <button type="button" className="inline-flex items-center gap-1 rounded-full border border-line px-3 py-1.5 text-[11px]" onClick={() => share("x")}>
            X
          </button>
          <button type="button" className="inline-flex items-center gap-1 rounded-full border border-line px-3 py-1.5 text-[11px]" onClick={() => share("fb")}>
            Facebook
          </button>
          <button type="button" className="inline-flex items-center gap-1 rounded-full border border-line px-3 py-1.5 text-[11px]" onClick={() => share("tg")}>
            Telegram
          </button>
          <button type="button" className="inline-flex items-center gap-1 rounded-full border border-line px-3 py-1.5 text-[11px]" onClick={() => share("copy")}>
            <Copy className="size-3" /> {copied ? "Copied" : "Copy"}
          </button>
          <button type="button" className="inline-flex items-center gap-1 rounded-full border border-line px-3 py-1.5 text-[11px]" onClick={() => share("native")}>
            <Share2 className="size-3 text-lime-2" /> Share
          </button>
        </div>
        <div className="mt-5 space-y-3 text-[15px] leading-7 text-fg/90">
          {post.body.split(/\n+/).map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>
        <TranslateBtn text={post.body} />
        {post.link ? (
          <a href={post.link} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-1 text-xs text-lime-2">
            <Link2 className="size-3" /> Source
          </a>
        ) : null}
        <div className="mt-8 border-t border-line pt-4">
          <div className="flex items-center justify-between">
            <div className="text-[10px] font-bold tracking-wide text-muted uppercase">{post.comments.length} comments</div>
            <span className="text-[10px] text-muted">Reply to keep the convo going</span>
          </div>
          {roots.map((c) => (
            <div key={c.ts} className="mt-3 rounded-xl border border-white/5 bg-panel-3/60 p-3 text-sm">
              <div className="text-[11px]">
                <HandleLink handle={c.author} className="text-[11px] font-semibold" /> <span className="font-normal text-muted">{timeLabel(c.ts)}</span>
              </div>
              <p className="mt-1 leading-6">{c.body}</p>
              <TranslateBtn text={c.body} />
              <button type="button" className="mt-1 text-[10px] text-lime-2" onClick={() => setReplyTo(c.ts)}>
                Reply
              </button>
              {kids(c.ts).map((r) => (
                <div key={r.ts} className="mt-2 ml-4 border-l border-lime-2/40 pl-3">
                  <div className="text-[11px] font-semibold" style={{ color: handleColor(r.author) }}>
                    {r.author} <span className="font-normal text-muted">{timeLabel(r.ts)}</span>
                  </div>
                  <p className="mt-1 leading-6">{r.body}</p>
                </div>
              ))}
            </div>
          ))}
          <form
            className="mt-3 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              store.commentPost(post.id, note, replyTo ?? undefined);
              setNote("");
              setReplyTo(null);
            }}
          >
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={store.authed || session.user ? (replyTo ? "Reply to comment…" : "Write a comment") : "Sign in to comment"}
              className="min-h-10 flex-1 rounded-lg border border-line bg-panel px-3 text-sm"
            />
            <button type="submit" className="btn-3d rounded-lg px-3 text-xs font-semibold">
              {replyTo ? "Reply" : "Comment"}
            </button>
          </form>
          {replyTo ? (
            <button type="button" className="mt-1 text-[10px] text-muted" onClick={() => setReplyTo(null)}>
              Cancel reply
            </button>
          ) : null}
          <form
            className="mt-4 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!reason.trim()) return;
              store.flagPost(post.id, reason);
              setReason("");
            }}
          >
            <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Report this post" className="min-h-10 flex-1 rounded-lg border border-line bg-panel px-3 text-xs" />
            <button type="submit" className="text-xs text-danger">
              Report
            </button>
          </form>
        </div>
      </div>
    </article>
  );
}

function FeedPane({ store }: { store: ReturnType<typeof useQonvo> }) {
  const [cat, setCat] = useState("All");
  const [shown, setShown] = useState(16);
  const open = store.posts.find((p) => p.id === store.openPost);
  const live = store.posts.filter((p) => p.status !== "draft" && (cat === "All" || p.category === cat));
  if (open) {
    return <ArticleRead post={open} store={store} />;
  }
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 flex-nowrap gap-1.5 overflow-x-auto overscroll-x-contain border-b border-line px-2 py-1.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {["All", ...POST_CATS].map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => {
              setCat(c);
              setShown(16);
            }}
            className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-bold tracking-wide ${cat === c ? "btn-3d text-lime-2" : "border border-line bg-panel-2 text-fg/80"}`}
          >
            {c}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 pb-6">
        <div className="grid grid-cols-4 gap-2">
          {live.slice(0, shown).map((p) => (
            <button key={p.id} type="button" data-feed-card="1" className="raised overflow-hidden rounded-md text-left" onClick={() => store.setOpenPost(p.id)}>
              {p.image ? <img src={p.image} alt="" className="aspect-square w-full object-cover" /> : <div className="aspect-square bg-panel-3" />}
              <div className="px-1 py-1">
                <div className="text-[7px] font-bold tracking-wide text-lime-2 uppercase">{p.category || "General"}</div>
                <div className="mt-0.5 line-clamp-2 text-[10px] font-semibold leading-tight">{p.title}</div>
                <div className="mt-0.5 truncate text-[8px] text-muted">
                  <span style={{ color: handleColor(p.author) }}>{p.author}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
        {shown < live.length ? (
          <button
            type="button"
            className="btn-join mt-3 mb-2 w-full rounded-lg py-2.5 text-[12px] font-bold"
            onClick={() => setShown((n) => n + 16)}
          >
            Load more · {live.length - shown} left
          </button>
        ) : live.length > 0 ? (
          <p className="mt-3 mb-1 text-center text-[10px] text-muted">End of feeds · {live.length} posts</p>
        ) : null}
      </div>
    </div>
  );
}

function AdvertPane({ ads, onCreate, onView }: { ads: Campaign[]; onCreate: () => void; onView: (id: string) => void }) {
  const [shown, setShown] = useState(12);
  const live = ads.filter((a) => a.status === "approved");
  const mine = ads.filter((a) => a.status !== "approved");
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between border-b border-white/5 px-3 py-2">
        <span className="text-xs text-muted">Ads · 5 formats</span>
        <button type="button" className="btn-3d rounded-md px-3 py-1 text-[11px] font-semibold" onClick={onCreate}>
          Place ad
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2 pb-3">
        <div className="grid grid-cols-4 gap-1">
          {live.slice(0, shown).map((a) => {
            const yt = a.video ? youtubeId(a.video) || a.video : undefined;
            const inner = (
              <div className="raised overflow-hidden rounded-md text-left">
                {a.kind === "video" || a.kind === "video-text" ? (
                  yt ? (
                    <img src={`https://i.ytimg.com/vi/${yt}/hqdefault.jpg`} alt="" className="aspect-square w-full object-cover" />
                  ) : (
                    <div className="grid aspect-square place-items-center bg-panel-3 text-[9px] text-muted">Video</div>
                  )
                ) : a.image ? (
                  <img src={a.image} alt="" className="aspect-square w-full object-cover" />
                ) : (
                  <div className="grid aspect-square place-items-center bg-panel-3 px-1.5 text-center text-[10px] font-semibold">{a.name}</div>
                )}
                <div className="px-1.5 py-1">
                  <div className="text-[8px] font-bold tracking-wide text-lime-2 uppercase">{a.kind || "image-text"}</div>
                  <div className="mt-px line-clamp-2 text-[10px] font-semibold leading-tight">{a.name}</div>
                  {a.kind === "image-text" || a.kind === "video-text" || a.kind === "text" ? (
                    <p className="mt-px line-clamp-1 text-[8px] text-muted">{a.note}</p>
                  ) : null}
                  <div className="mt-px text-[8px] text-muted">{fmtCount(a.views ?? 0)}</div>
                </div>
              </div>
            );
            return a.link ? (
              <a
                key={a.id}
                href={a.link}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => onView(a.id)}
              >
                {inner}
              </a>
            ) : (
              <button key={a.id} type="button" onClick={() => onView(a.id)}>
                {inner}
              </button>
            );
          })}
        </div>
        {live.length === 0 ? <p className="p-2 text-xs text-muted">No live ads yet. Place one after crypto payment.</p> : null}
        {shown < live.length ? (
          <button type="button" className="btn-3d mx-auto mt-3 block rounded-md px-4 py-1.5 text-[11px] font-semibold" onClick={() => setShown((n) => n + 6)}>
            Load more
          </button>
        ) : null}
        {mine.length ? <div className="mt-3 text-[10px] font-bold tracking-wide text-muted uppercase">Your queue</div> : null}
        {mine.map((a) => (
          <div key={a.id} className="mt-1 rounded-md border border-line px-2 py-1.5 text-[11px] text-muted">
            {a.name} · {a.status} · {a.kind} · {(a.coin || "").toUpperCase()} {a.amount || ""}
          </div>
        ))}
      </div>
    </div>
  );
}

function ChatAdCard({ ad, pinned, onView }: { ad: Campaign; pinned?: boolean; onView: () => void }) {
  const href = ad.link || undefined;
  const inner = pinned ? (
    <div className="flex items-center gap-2.5 px-2.5 py-2">
      {ad.image ? <img src={ad.image} alt="" className="h-12 w-14 shrink-0 rounded-lg object-cover" /> : <div className="grid h-11 w-14 shrink-0 place-items-center rounded-md bg-panel-3 text-[9px] text-lime-2">AD</div>}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[8px] font-bold tracking-wide text-lime-2 uppercase">Pinned</span>
          <span className="text-[8px] text-muted">{fmtCount(ad.views ?? 0)}</span>
        </div>
        <div className="truncate text-[11px] font-semibold leading-tight">{ad.name}</div>
        {ad.note ? <p className="truncate text-[9px] text-muted">{ad.note}</p> : null}
      </div>
    </div>
  ) : (
    <>
      <div className="flex items-center justify-between px-2 py-1">
        <span className="text-[9px] font-bold tracking-wide text-lime-2 uppercase">Premium ad</span>
        <span className="text-[9px] text-muted">{fmtCount(ad.views ?? 0)} views</span>
      </div>
      {ad.image ? <img src={ad.image} alt="" className="h-16 w-full object-cover" /> : null}
      {ad.video ? (
        <div className="aspect-video bg-black">
          <iframe title={ad.name} src={`https://www.youtube.com/embed/${ad.video}`} className="h-full w-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
        </div>
      ) : null}
      <div className="px-2.5 pb-1.5">
        <div className="text-xs font-semibold">{ad.name}</div>
        {ad.note ? <p className="text-[10px] text-muted">{ad.note}</p> : null}
      </div>
    </>
  );
  const cls = pinned ? "mx-3 mt-2 overflow-hidden rounded-xl border border-lime-2/35 bg-panel" : "overflow-hidden rounded-xl border border-line bg-panel";
  if (href) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={`block ${cls}`} onClick={onView}>
        {inner}
      </a>
    );
  }
  return (
    <button type="button" className={`block w-full text-left ${cls}`} onClick={onView}>
      {inner}
    </button>
  );
}

function ChatLine({
  m,
  handle,
  onReact,
  onReply,
}: {
  m: ChatMsg;
  handle: string;
  onReact: (ts: number, kind: "up" | "fire") => void;
  onReply: (m: ChatMsg) => void;
}) {
  const mine = handle && m.n === handle;
  return (
    <div className={mine ? "rounded-lg bg-white/[0.03] px-1 py-0.5" : undefined}>
      {m.parentN && m.parentT ? (
        <button type="button" className="mb-1 block w-full truncate rounded-md border-l-2 border-lime-2/50 bg-white/[0.03] px-2 py-1 text-left text-[11px] text-muted" onClick={() => onReply(m)}>
          <span style={{ color: handleColor(m.parentN) }}>{m.parentN}</span> · {m.parentT}
        </button>
      ) : null}
      <div className="flex items-baseline gap-2">
        <HandleLink handle={m.n} />
        <span className="text-[10px] text-muted">{timeLabel(m.ts)}</span>
      </div>
      <div className="text-sm">
        {mentionParts(m.t, handle).map((p, i) =>
          p.on ? (
            <span key={i} className="rounded-sm bg-lime-2/15 px-0.5 font-semibold text-lime-2">
              {p.t}
            </span>
          ) : (
            <span key={i}>{p.t}</span>
          ),
        )}
      </div>
      <TranslateBtn text={m.t} />
      <div className="mt-1 flex gap-3">
        <button type="button" className="text-[11px] text-muted" onClick={() => onReact(m.ts, "up")}>
          + {m.rx?.up ?? 0}
        </button>
        <button type="button" className="text-[11px] text-muted" onClick={() => onReact(m.ts, "fire")}>
          🔥 {m.rx?.fire ?? 0}
        </button>
        <button type="button" className="text-[11px] text-lime-2" onClick={() => onReply(m)}>
          Reply
        </button>
      </div>
    </div>
  );
}

function DonateSheet({ onClose }: { onClose: () => void }) {
  const [wallets, setWallets] = useState<{ coin: string; address: string }[]>([]);
  const [copied, setCopied] = useState("");
  useEffect(() => {
    void listWallets()
      .then(setWallets)
      .catch(() => setWallets([]));
  }, []);
  return (
    <div className="fixed inset-0 z-40 grid place-items-end bg-black/50 p-3 sm:place-items-center">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-panel p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-bold">Keep Kilode up</h2>
          <button type="button" onClick={onClose} aria-label="Close">
            <X className="size-4" />
          </button>
        </div>
        <p className="mb-3 text-[11px] text-muted">Send crypto to a wallet below. No account. No processor.</p>
        <div className="space-y-2">
          {AD_COINS.map((c) => {
            const addr = wallets.find((w) => w.coin === c.id)?.address;
            return (
              <div key={c.id} className="rounded-lg border border-white/5 px-2 py-1.5">
                <div className="text-[10px] font-bold tracking-wide text-lime-2 uppercase">{c.ticker}</div>
                <div className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate font-mono text-[10px] text-muted">{addr || "Not set yet — add on /ops"}</span>
                  {addr ? (
                    <button
                      type="button"
                      className="shrink-0 text-[10px] text-lime-2"
                      onClick={() => {
                        void navigator.clipboard?.writeText(addr).then(() => {
                          setCopied(c.id);
                          setTimeout(() => setCopied(""), 1200);
                        });
                      }}
                    >
                      {copied === c.id ? "Copied" : "Copy"}
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
