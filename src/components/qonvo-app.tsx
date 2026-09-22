import { useEffect, useMemo, useRef, useState } from "react";
import {
  Award,
  Bookmark,
  Briefcase,
  Building2,
  Copy,
  Download,
  Eye,
  Film,
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
  Plus,
  PlusSquare,
  Radio,
  Repeat2,
  Play,
  Search,
  Send,
  Share2,
  Smile,
  Store,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Settings,
  Trophy,
  LineChart,
  Coins,
  Banknote,
  CloudSun,
  Cpu,
  User,
  Users,
  UsersRound,
  Shield,
  X,
  Sun,
  Moon,
  Tv,
} from "lucide-react";
import { ACCOUNT_KINDS, MENU, POST_CATS, REGIONS, ROOMS, AD_COINS, KIND_FACE, chatTtlLabel, fmtCount, handleColor, parseMusicUrl, roomName, timeLabel, youtubeId, type AccountKind, type Campaign, type ChatMsg, type MenuId, type Room } from "@/lib/qonvo-data";
import { canKind } from "@/lib/permissions";
import { DIGITAL_TRACKS, MUSIC_GENRES, MUSIC_RAILS, VIDEO_CATALOG, VIDEO_SECTIONS, DEMO_CHAT } from "@/lib/qonvo-seed";
import { useQonvo } from "@/lib/use-qonvo";
import { QonvoScreen } from "@/components/qonvo-screens";
import { CinemaPane } from "@/components/cinema-pane";
import { ChatTermsBar, ForumClock, ForumWhy } from "@/components/forum-why";
import { PremiumSquareAd, PremiumStoryAd, MenuPremiumAd, PortraitAd } from "@/components/premium-ad";
import { AdvertPane } from "@/components/advert-pane";
import { RoomList } from "@/components/rooms-list";
import { listRoomOverlay } from "@/lib/rooms-server";
import { Link } from "@tanstack/react-router";
import { SignedIn, SignedOut, UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { listWallets } from "@/lib/forum-server";
import { kilodeSignIn, kilodeSignUp } from "@/lib/register";
import { AccountKindPicker, AvatarImg, AvatarPicker, YearBornSelect } from "@/components/account-kind";
import { TranslateBtn } from "@/components/translate-btn";
import { HandleLink } from "@/components/handle-link";
import { NotifyBell } from "@/components/notify-bell";
import { HowKilode } from "@/components/how-kilode";
import { MenuLegal, MenuPin } from "@/components/get-app";
import { AdSlotOrEmpty, AdReserve } from "@/components/ad-slot";
import { RelatedGrid, TopTen, TrendingRail, LandscapeGrid, CategoryArchive, TagArchive, DontMissGrid, isDupExcerpt } from "@/components/engage-rail";
import { InstallToast, SiteFooter, TrendingTicker } from "@/components/site-chrome";
import { FeedsHero } from "@/components/feeds-hero";
import { BrandLockup } from "@/components/brand-lockup";
import { DownloadsPane } from "@/components/downloads-pane";
import { TvPane } from "@/components/tv-pane";
import { MarketRail, MarketsDesk, type MarketDesk } from "@/components/markets-desk";

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
  tv: Tv,
  ads: Megaphone,
  jobs: Briefcase,
  market: Store,
  rent: Building2,
  contact: Mail,
  admin: Shield,
  settings: Settings,
  help: HelpCircle,
};

const MENU_GROUPS: { label: string; ids: MenuId[] }[] = [
  { label: "Me", ids: ["profile", "dashboard", "bookmarks", "inbox", "notifications", "teams"] },
  { label: "Discover", ids: ["trending", "tv", "community", "search", "leaderboard", "badges"] },
  { label: "Create", ids: ["create", "ads"] },
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
  const signedIn = Boolean(session.user);
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState("All");
  const [draft, setDraft] = useState("");
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [joinName, setJoinName] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [screen, setScreen] = useState<MenuId>("home");
  const [roomsOpen, setRoomsOpen] = useState(false);
  const [homeTab, setHomeTab] = useState<"chat" | "feeds" | "advert" | "music" | "videos" | "cinema" | "downloads">("feeds");
  const [marketDesk, setMarketDesk] = useState<MarketDesk | null>(null);
  const [feedQ, setFeedQ] = useState("");
  const [feedSearchOn, setFeedSearchOn] = useState(false);
  const [joinPass, setJoinPass] = useState("");
  const [joinAgree, setJoinAgree] = useState(false);
  const [joinAgreeRules, setJoinAgreeRules] = useState(false);
  const [joinKind, setJoinKind] = useState<AccountKind>("member");
  const [joinFace, setJoinFace] = useState(KIND_FACE.member);
  const [joinYear, setJoinYear] = useState<number | "">("");
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
  const [forumWhy, setForumWhy] = useState(false);
  const [chatOk, setChatOk] = useState(false);
  const [roomOverlay, setRoomOverlay] = useState<{ extra: Room[]; paused: string[] }>({ extra: [], paused: [] });

  const liveRooms = useMemo(() => {
    const paused = new Set(roomOverlay.paused);
    return [...ROOMS.filter((r) => !paused.has(r.id)), ...roomOverlay.extra];
  }, [roomOverlay]);

  const room = liveRooms.find((r) => r.id === store.roomId) ?? liveRooms[0] ?? ROOMS[0];
  const listed = useMemo(
    () =>
      liveRooms.filter(
        (r) =>
          (region === "All" || r.region === region) &&
          r.name.toLowerCase().includes(query.toLowerCase()),
      ),
    [query, region, liveRooms],
  );

  useEffect(() => {
    void listRoomOverlay()
      .then(setRoomOverlay)
      .catch(() => undefined);
  }, []);


  useEffect(() => {
    try {
      setChatOk(localStorage.getItem("kilode-chat-ok") === "1");
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const go = () => {
      if (store.authed || session.user) setScreen("create");
      else window.location.href = "/login";
    };
    window.addEventListener("kilode:create", go);
    return () => window.removeEventListener("kilode:create", go);
  }, [store.authed, session.user]);


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
    store.setChatLive(homeTab === "chat" && screen === "home");
  }, [homeTab, screen]);

  useEffect(() => {
    if (homeTab !== "feeds" || screen !== "home") setMarketDesk(null);
  }, [homeTab, screen]);

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
    setMarketDesk(null);
    setScreen("home");
    setMenuOpen(false);
    setRoomsOpen(false);
  }

  return (
    <div className="kilode-shell relative flex h-full min-h-dvh flex-col bg-bg text-fg md:h-dvh md:max-h-dvh md:overflow-hidden">
      <header className="z-20 shrink-0 border-b border-line/80 bg-panel/90 backdrop-blur-md">
        <div className="flex h-10 min-w-0 items-center gap-1 px-2 sm:h-12 sm:gap-3 sm:px-3">
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
            <BrandLockup />
          </button>
          <nav className="mx-auto hidden min-w-0 items-center justify-center gap-1 md:flex">
            <HomeTab label="Feeds" on={homeTab === "feeds" && screen === "home" && !marketDesk} onClick={() => { store.setOpenPost(null); setMarketDesk(null); setHomeTab("feeds"); setScreen("home"); setMenuOpen(false); }} />
            <HomeTab label="Chat" on={homeTab === "chat" && screen === "home"} onClick={() => { store.setOpenPost(null); setHomeTab("chat"); setScreen("home"); setMenuOpen(false); }} />
            <HomeTab label="Music" on={homeTab === "music" && screen === "home"} onClick={() => { store.setOpenPost(null); setHomeTab("music"); setScreen("home"); setMenuOpen(false); }} />
            <HomeTab label="Cinema" on={homeTab === "cinema" && screen === "home"} onClick={() => { store.setOpenPost(null); setHomeTab("cinema"); setScreen("home"); setMenuOpen(false); }} />
            <HomeTab label="Ads" on={homeTab === "advert" && screen === "home"} onClick={() => { store.setOpenPost(null); setHomeTab("advert"); setScreen("home"); setMenuOpen(false); }} />
            <HomeTab label="Downloads" on={homeTab === "downloads" && screen === "home"} onClick={() => { store.setOpenPost(null); setHomeTab("downloads"); setScreen("home"); setMenuOpen(false); }} />
            {signedIn ? (
              <HomeTab label="Me" on={screen === "profile"} onClick={() => { setScreen("profile"); setMenuOpen(false); }} />
            ) : (
              <HomeTab label="Me" on={false} onClick={() => { window.location.href = "/login?mode=up"; }} />
            )}
          </nav>
          <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
            <NotifyBell
              signedIn={signedIn}
              posts={store.posts}
              onOpenNotes={() => {
                setScreen("notifications");
                setMenuOpen(false);
              }}
              onOpenPost={(id) => {
                store.setOpenPost(id);
                setHomeTab("feeds");
                setScreen("home");
              }}
            />
            <SkinToggle />
            <button
              type="button"
              className="grid size-8 place-items-center rounded-lg border border-line bg-panel-2"
              aria-label="Kilode TV and socials"
              title="Kilode TV"
              onClick={() => {
                setScreen("tv");
                setMenuOpen(false);
              }}
            >
              <Tv className="size-3.5 text-lime-2" />
            </button>
            <button
              type="button"
              className="grid size-8 place-items-center rounded-lg border border-line bg-panel-2"
              aria-label="Menu"
              onClick={() => setMenuOpen((v) => !v)}
            >
              <Menu className="size-3.5" />
            </button>
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
                  <Link to="/login" search={{ mode: "up" }} className="btn-join rounded-lg px-2 py-1 text-[10px] font-bold sm:px-3 sm:text-xs">
                    Join
                  </Link>
                </SignedOut>
              </>
            )}

          </div>
        </div>
        {/* Rooms/Live/Videos folded into Chat & Me — keep tab bar clear on mobile */}
        <div className="h-5 overflow-hidden border-t border-line/60 bg-panel-2">
          <div className="ticker-track px-8 text-[10px] leading-5 text-muted">
            {[...liveRooms.filter((r) => r.region === "Featured" || r.region === "More rooms").slice(0, 10), ...liveRooms.filter((r) => r.region === "Featured" || r.region === "More rooms").slice(0, 10)].map((r, i) => (
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
          {homeTab === "feeds" && !marketDesk ? (
            <div className="flex shrink-0 items-center gap-1.5 border-b border-line px-2 py-1">
              {feedSearchOn ? (
                <input
                  value={feedQ}
                  onChange={(e) => setFeedQ(e.target.value)}
                  placeholder="Search feeds"
                  className="min-h-8 flex-1 rounded-md border border-line bg-panel px-2 text-[11px]"
                  autoFocus
                />
              ) : (
                <TrendingTicker posts={store.posts} onOpen={(id) => store.setOpenPost(id)} />
              )}
              <button
                type="button"
                aria-label="Search feeds"
                className="btn-3d grid size-8 place-items-center rounded-md"
                onClick={() => {
                  setFeedSearchOn((v) => !v);
                  if (feedSearchOn) setFeedQ("");
                }}
              >
                <Search className="size-3.5" />
              </button>
              <button
                type="button"
                aria-label="New post"
                className="btn-3d grid size-8 place-items-center rounded-md text-[14px] font-semibold"
                onClick={() => (signedIn ? setScreen("create") : (window.location.href = "/login?mode=up"))}
              >
                <Plus className="size-3.5" />
              </button>
            </div>
          ) : homeTab === "music" ? (
            <div className="flex shrink-0 justify-end gap-1 border-b border-line px-2 py-0.5">
              {canKind(store.kind, "music.submit") && signedIn ? (
                <button type="button" className="btn-3d rounded-md px-2.5 py-0.5 text-[10px] font-semibold" onClick={() => setScreen("create")}>
                  Add track
                </button>
              ) : null}
            </div>
          ) : null}

          <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden md:grid-cols-[210px_minmax(0,1fr)_180px]">
            <aside className="hidden min-h-0 overflow-hidden border-r border-white/5 bg-panel md:flex md:flex-col">
              <RoomList query={query} setQuery={setQuery} listed={listed} roomId={store.roomId} onOpen={goHome} />
            </aside>

            <section className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-bg">
              {homeTab === "feeds" && marketDesk ? (
                <MarketsDesk desk={marketDesk} onDesk={setMarketDesk} onBack={() => setMarketDesk(null)} />
              ) : homeTab === "feeds" ? (
                <FeedPane store={store} q={feedQ} onDesk={setMarketDesk} />
              ) : homeTab === "music" ? (
                <MusicPane store={store} onAdd={() => (store.authed || session.user ? setScreen("create") : (window.location.href = "/login"))} />
              ) : homeTab === "cinema" ? (
                <CinemaPane />
              ) : homeTab === "videos" ? (
                <VideoPane />
              ) : homeTab === "advert" ? (
                <AdvertPane
                  ads={store.campaigns}
                  onCreate={() => (store.authed || session.user ? setScreen("ads") : setJoinOpen(true))}
                  onView={(id) => store.see("ads", id)}
                />
              ) : homeTab === "downloads" ? (
                <DownloadsPane />
              ) : (
                <>
              <div className="border-b border-white/5 bg-panel px-3 py-1.5">
                <div className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-[9px] font-medium tracking-[0.16em] text-lime-2">KILODE FORUM</div>
                    <div className="truncate text-sm font-bold leading-tight">{room.name}</div>
                  </div>
                  <ForumClock label={purge === "kept" ? "kept" : purge} onOpen={() => setForumWhy(true)} />
                </div>
                <div className="mt-1.5 flex items-center gap-1">
                  <span className="shrink-0 text-[10px] font-bold text-lime-2">{store.online.length} online</span>
                  <span className="min-w-0 truncate text-[10px] text-muted">· {store.handle || "guest"}</span>
                  <div className="ml-auto flex shrink-0 items-center gap-1">
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
                    <button type="button" onClick={() => setRoomsOpen(true)} className="btn-3d rounded-full px-2.5 py-1 text-[10px] md:hidden">
                      Rooms
                    </button>
                    <button type="button" onClick={store.pinRoom} className="btn-3d rounded-full px-2.5 py-1 text-[10px]">
                      Bookmark
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 overflow-x-auto border-b border-white/5 px-3 py-1.5">
                <span className="size-1.5 shrink-0 animate-pulse rounded-full bg-lime-2" />
                <span className="shrink-0 text-[10px] font-bold text-lime-2">{store.online.length} online</span>
                {store.online.slice(0, 12).map((u) => (
                  <span key={u.handle} className="inline-flex shrink-0 items-center gap-1 rounded-full border border-line bg-panel-2 py-0.5 pr-1.5 pl-0.5" title={u.handle}>
                    <AvatarImg handle={u.handle} size={16} />
                    <span className="max-w-[72px] truncate text-[10px]" style={{ color: handleColor(u.handle) }}>{u.handle}</span>
                  </span>
                ))}
                {store.online.length === 0 ? <span className="text-[10px] text-muted">Be first in this room</span> : null}
                {store.typing.filter((n) => n !== store.handle).length ? (
                  <span className="ml-1 shrink-0 text-[10px] text-lime-2">
                    {store.typing.filter((n) => n !== store.handle).slice(0, 2).join(", ")} typing
                    <span className="typing-dots" />
                  </span>
                ) : null}
              </div>
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
                  <p className="text-center text-[10px] font-medium tracking-[0.16em] text-lime-2">SAMPLE CONVERSATION</p>
                ) : null}
                {mixChatAds(
                  chatRows(store.msgs.length ? store.msgs : DEMO_CHAT),
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
              <ChatTermsBar
                accepted={chatOk}
                onAccept={() => {
                  setChatOk(true);
                  try {
                    localStorage.setItem("kilode-chat-ok", "1");
                  } catch {
                    /* ignore */
                  }
                }}
              />
              <form
                className="relative flex shrink-0 gap-2 border-t border-line bg-panel/90 p-2 pb-2 mb-[calc(3.35rem+env(safe-area-inset-bottom))] backdrop-blur md:mb-0"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!(store.authed || session.user)) {
                    window.location.href = "/login";
                    return;
                  }
                  if (!chatOk) {
                    setForumWhy(true);
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
                  <div className="text-[10px] tracking-normal text-muted">Ad</div>
                  <div className="text-sm font-semibold">{c.name}</div>
                </div>
              ))}
              {homeTab === "chat" ? (
              <div className="raised m-2 rounded-xl p-3">
                <div className="text-[10px] tracking-normal text-muted">Chat lifetime</div>
                <div className="text-base font-extrabold text-danger">{purge === "kept" ? "Kept" : purge}</div>
                <p className="mt-1 text-[10px] text-muted">
                  {store.chatHours === 0
                    ? "Super admin set chat to never expire."
                    : `Messages older than ${chatTtlLabel(store.chatHours)} disappear. Feeds, music, videos, and ads stay.`}
                </p>
              </div>
              ) : null}
              <div className="raised m-2 rounded-xl p-3">
                <div className="mb-2 text-[10px] font-medium tracking-normal text-muted">Who just joined</div>
                {store.joins.length === 0 ? <p className="text-[11px] text-muted">Waiting for joins</p> : null}
                {store.joins.slice(0, 6).map((j) => (
                  <div key={j.name + j.ts} className="flex items-center justify-between py-1 text-xs">
                    <span className="truncate text-fg">{j.name}</span>
                    <span className="max-w-[72px] truncate text-[10px] text-lime-2">{j.room ? roomName(j.room) : "live"}</span>
                  </div>
                ))}
              </div>
              <div className="raised m-2 rounded-xl p-3">
                <div className="mb-2 text-[10px] font-medium tracking-normal text-muted">Activity</div>
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

      <InstallToast />
      <nav className="dock pointer-events-none absolute inset-x-0 bottom-0 z-30 grid grid-cols-7 px-1 pt-3 pb-[max(2px,env(safe-area-inset-bottom))] md:hidden">
        <Tab icon={<Home className="size-3.5" />} label="Feeds" on={screen === "home" && homeTab === "feeds" && !marketDesk} onClick={() => { setMenuOpen(false); setScreen("home"); setHomeTab("feeds"); setMarketDesk(null); store.setOpenPost(null); }} />
        <Tab icon={<MessageSquare className="size-3.5" />} label="Chat" on={screen === "home" && homeTab === "chat"} onClick={() => { setMenuOpen(false); setScreen("home"); setHomeTab("chat"); }} />
        <Tab icon={<Radio className="size-3.5" />} label="Music" on={screen === "home" && homeTab === "music"} onClick={() => { setMenuOpen(false); setScreen("home"); setHomeTab("music"); }} />
        <Tab icon={<Film className="size-3.5" />} label="Cinema" on={screen === "home" && homeTab === "cinema"} onClick={() => { setMenuOpen(false); setScreen("home"); setHomeTab("cinema"); }} />
        <Tab icon={<Megaphone className="size-3.5" />} label="Ads" on={screen === "home" && homeTab === "advert"} onClick={() => { setMenuOpen(false); setScreen("home"); setHomeTab("advert"); }} />
        <Tab icon={<Download className="size-3.5" />} label="Downloads" on={screen === "home" && homeTab === "downloads"} onClick={() => { setMenuOpen(false); setScreen("home"); setHomeTab("downloads"); }} />
        <Tab icon={<User className="size-3.5" />} label="Me" on={screen === "profile"} onClick={() => { setMenuOpen(false); if (signedIn) setScreen("profile"); else window.location.href = "/login?mode=up"; }} />
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
              {REGIONS.map((r) => (
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
              <div className="mb-2 text-[10px] font-medium tracking-normal text-muted">Who just joined</div>
              {store.joins.length === 0 ? <p className="text-[11px] text-muted">Waiting for joins</p> : null}
              {store.joins.slice(0, 8).map((j) => (
                <div key={j.name + j.ts} className="flex items-center justify-between py-1 text-xs">
                  <span className="truncate text-fg">{j.name}</span>
                  <span className="max-w-[72px] truncate text-[10px] text-lime-2">{j.room ? roomName(j.room) : "live"}</span>
                </div>
              ))}
            </div>
            <div className="raised m-2 rounded-xl p-3">
              <div className="mb-2 text-[10px] font-medium tracking-normal text-muted">Activity</div>
              {store.notes.length === 0 ? <p className="text-[11px] text-muted">Quiet right now</p> : null}
              {store.notes.slice(0, 10).map((n) => (
                <div key={n.id} className="border-t border-white/5 py-1.5 text-[11px] text-muted">
                  {n.text}
                </div>
              ))}
            </div>
            {homeTab === "chat" ? (
              <div className="raised m-2 rounded-xl p-3">
                <div className="text-[10px] tracking-normal text-muted">Chat lifetime</div>
                <div className="text-base font-extrabold text-danger">{purge === "kept" ? "Kept" : purge}</div>
              </div>
            ) : null}
          </aside>
        </div>
      ) : null}

      {menuOpen ? (
        <div className="fixed inset-0 z-30 flex">
          <aside className="flex h-full w-[min(320px,90vw)] flex-col border-r border-line bg-panel">
            <div className="flex items-center gap-3 border-b border-line bg-gradient-to-b from-lime-2/10 to-transparent p-4">
              <AvatarImg handle={store.handle || "Guest"} face={store.face} size={48} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-extrabold tracking-tight">{store.handle || "Guest"}</div>
                <div className="text-[10px] tracking-normal text-lime-2">
                  {session.user ? ACCOUNT_KINDS.find((k) => k.id === store.kind)?.label ?? "Member" : "Browse free · join to post"}
                </div>
              </div>
              <button type="button" onClick={() => setMenuOpen(false)} aria-label="Close">
                <X className="size-4" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-3 pb-5">
              {!(signedIn) ? (
                <div className="mb-4">
                  <MenuPremiumAd />
                </div>
              ) : (
              <div className="mb-4 grid grid-cols-3 gap-2 px-0.5">
                {[
                  { n: store.posts.filter((p) => !!p?.id && p.author === store.handle).length, l: "Yours" },
                  { n: store.pins.length, l: "Rooms" },
                  { n: store.savedPosts.length, l: "Saved" },
                ].map((s) => (
                  <div key={s.l} className="raised rounded-xl px-2 py-2.5 text-center">
                    <div className="text-sm font-bold text-lime-2">{s.n}</div>
                    <div className="text-[9px] text-muted">{s.l}</div>
                  </div>
                ))}
              </div>
              )}

              {signedIn ? (
              <div className="mb-4 px-0.5">
                <div className="mb-2 text-[10px] font-medium tracking-normal text-muted">Quick</div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    ...(canKind(store.kind, "feeds.post") || canKind(store.kind, "music.submit")
                      ? [{ id: "create" as MenuId, label: "Create", tab: null as null | "feeds" | "music" | "chat" | "videos" }]
                      : []),
                    ...(canKind(store.kind, "ads.submit") ? [{ id: "ads" as MenuId, label: "Place ad", tab: null as null }] : []),
                    { id: "inbox" as MenuId, label: "Messages", tab: null as null },
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
              ) : null}

              <DrawerGroup label="Kilode">
                <DrawerRow icon={Home} label="Feeds" hint="News for Nigeria" onClick={() => { store.setOpenPost(null); setMarketDesk(null); setScreen("home"); setHomeTab("feeds"); setMenuOpen(false); }} on={homeTab === "feeds" && screen === "home" && !marketDesk} />
                <DrawerRow icon={MessageSquare} label="Chat" hint="Live rooms · 36 states" onClick={() => { setScreen("home"); setHomeTab("chat"); setMenuOpen(false); }} on={homeTab === "chat" && screen === "home"} />
                <DrawerRow icon={Radio} label="Music" hint="Artist links. We embed." onClick={() => { setScreen("home"); setHomeTab("music"); setMenuOpen(false); }} on={homeTab === "music" && screen === "home"} />
                <DrawerRow icon={Film} label="Cinema" hint="Vote and watch together" onClick={() => { setScreen("home"); setHomeTab("cinema"); setMenuOpen(false); }} on={homeTab === "cinema" && screen === "home"} />
                <DrawerRow icon={Tv} label="Kilode TV" hint="Socials · follow in one place" onClick={() => { setScreen("tv"); setMenuOpen(false); }} on={screen === "tv"} />
                <DrawerRow icon={Play} label="Videos" hint="Clips on Kilode" onClick={() => { setScreen("home"); setHomeTab("videos"); setMenuOpen(false); }} on={homeTab === "videos" && screen === "home"} />
                <DrawerRow icon={Megaphone} label="Ads" hint="Live brand campaigns" onClick={() => { setScreen("home"); setHomeTab("advert"); setMenuOpen(false); }} on={homeTab === "advert" && screen === "home"} />
                <DrawerRow icon={Download} label="Downloads" hint="Kilode products · buy with email" onClick={() => { setScreen("home"); setHomeTab("downloads"); setMenuOpen(false); }} on={homeTab === "downloads" && screen === "home"} />
              </DrawerGroup>

              <DrawerGroup label="Desks">
                <DrawerRow icon={LineChart} label="Stocks" hint="Indices, movers, charts" onClick={() => { setScreen("home"); setHomeTab("feeds"); setMarketDesk("stocks"); setMenuOpen(false); }} on={marketDesk === "stocks"} />
                <DrawerRow icon={Coins} label="Crypto" hint="Coins, dominance, heat" onClick={() => { setScreen("home"); setHomeTab("feeds"); setMarketDesk("crypto"); setMenuOpen(false); }} on={marketDesk === "crypto"} />
                <DrawerRow icon={Banknote} label="Forex" hint="Naira and crosses" onClick={() => { setScreen("home"); setHomeTab("feeds"); setMarketDesk("forex"); setMenuOpen(false); }} on={marketDesk === "forex"} />
                <DrawerRow icon={Trophy} label="Sports" hint="Live scores and upcoming" onClick={() => { setScreen("home"); setHomeTab("feeds"); setMarketDesk("sports"); setMenuOpen(false); }} on={marketDesk === "sports"} />
                <DrawerRow icon={CloudSun} label="Weather" hint="World sky, Lagos first" onClick={() => { setScreen("home"); setHomeTab("feeds"); setMarketDesk("weather"); setMenuOpen(false); }} on={marketDesk === "weather"} />
                <DrawerRow icon={Cpu} label="Tech" hint="Front page and engineering" onClick={() => { setScreen("home"); setHomeTab("feeds"); setMarketDesk("tech"); setMenuOpen(false); }} on={marketDesk === "tech"} />
              </DrawerGroup>

              <DrawerGroup label="Listings">
                <DrawerRow icon={Briefcase} label="Jobs" hint="Roles and applications" onClick={() => { setScreen("jobs"); setMenuOpen(false); }} on={screen === "jobs"} />
                <DrawerRow icon={Store} label="Marketplace" hint="Showcase. No checkout" onClick={() => { setScreen("market"); setMenuOpen(false); }} on={screen === "market"} />
                <DrawerRow icon={Building2} label="Rent" hint="Spaces and contact" onClick={() => { setScreen("rent"); setMenuOpen(false); }} on={screen === "rent"} />
                <DrawerRow icon={Megaphone} label="Advertise" hint="Rent a 16:9 or a tile" href="/advertise" />
              </DrawerGroup>

              {store.campaigns.filter((c) => c.status === "approved").slice(0, 2).length ? (
                <div className="mb-4 px-0.5">
                  <div className="mb-2 text-[10px] font-medium tracking-normal text-muted">Sponsored</div>
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
                          {c.image ? <img src={c.image} alt="" className="h-10 w-12 shrink-0 rounded-md object-cover" /> : <div className="grid h-10 w-12 place-items-center rounded-md bg-panel-3 text-[11px] text-lime-2">AD</div>}
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
                <div className="mb-2 text-[10px] font-medium tracking-normal text-muted">Hot rooms</div>
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

              {(signedIn ? MENU_GROUPS : []).map((group) => (
                <div key={group.label} className="mb-4">
                  <div className="px-1 py-1.5 text-[10px] font-medium tracking-normal text-muted">{group.label}</div>
                  <div className="space-y-0.5">
                    {group.ids
                      .filter((id) => {
                        if (id === "create") return canKind(store.kind, "feeds.post") || canKind(store.kind, "music.submit");
                        if (id === "ads") return canKind(store.kind, "ads.submit");
                        return true;
                      })
                      .map((id) => {
                      const Icon = ICONS[id];
                      const label = MENU.find((m) => m[0] === id)?.[1] ?? id;
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => {
                            if (id === "home" || id === "forum") {
                              store.setOpenPost(null);
                              setHomeTab("feeds");
                              setScreen("home");
                            } else setScreen(id);
                            setMenuOpen(false);
                          }}
                          className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm ${
                            screen === id ? "bg-panel-2 text-lime-2" : "hover:bg-panel-2"
                          }`}
                        >
                          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-lime-2/10">
                            <Icon className="size-4 text-lime-2" />
                          </span>
                          <span className="min-w-0 flex-1 truncate font-semibold">{label}</span>
                          <ChevronRight className="size-3.5 shrink-0 text-muted" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              <DrawerGroup label="Help">
                <HowKilode className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-panel-2">
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-lime-2/10">
                    <Play className="size-4 text-lime-2" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">How Kilode works</span>
                    <span className="block text-[10px] font-normal text-muted">Walkthrough · one minute</span>
                  </span>
                  <ChevronRight className="size-3.5 shrink-0 text-muted" />
                </HowKilode>
                <DrawerRow icon={HelpCircle} label="Help & FAQ" hint="Terms, rules, how to use" onClick={() => { setScreen("help"); setMenuOpen(false); }} on={screen === "help"} />
                <DrawerRow icon={Mail} label="Contact" hint="Talk to Kilode" onClick={() => { setScreen("contact"); setMenuOpen(false); }} on={screen === "contact"} />
                {signedIn ? <DrawerRow icon={Settings} label="Settings" onClick={() => { setScreen("settings"); setMenuOpen(false); }} on={screen === "settings"} /> : null}
              </DrawerGroup>
            </div>
            <MenuPin />
            <MenuLegal onDonate={() => { setDonateOpen(true); setMenuOpen(false); }} />
          </aside>
          <button type="button" className="flex-1 bg-black/60" aria-label="Close menu" onClick={() => setMenuOpen(false)} />
        </div>
      ) : null}

      {donateOpen ? <DonateSheet onClose={() => setDonateOpen(false)} /> : null}
      {forumWhy ? <ForumWhy hoursLabel={store.chatHours === 0 ? "kept forever" : chatTtlLabel(store.chatHours)} onClose={() => setForumWhy(false)} /> : null}

      {joinOpen ? (
        <div className="fixed inset-0 z-40 grid place-items-end bg-black/70 p-3 sm:place-items-center">
          <div className="w-full max-w-sm overflow-y-auto rounded-2xl border border-line bg-panel p-3">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-base font-bold">Join Kilode</h2>
              <button type="button" onClick={() => setJoinOpen(false)} aria-label="Close">
                <X className="size-4" />
              </button>
            </div>
            <input
              value={joinName}
              onChange={(e) => setJoinName(e.target.value)}
              placeholder="Username"
              className="mb-1.5 w-full rounded-lg border border-line bg-black/40 px-3 py-1.5 text-sm outline-none"
            />
            <input
              type="password"
              value={joinPass}
              onChange={(e) => setJoinPass(e.target.value)}
              placeholder="Password (8+ characters)"
              className="mb-1.5 w-full rounded-lg border border-line bg-black/40 px-3 py-1.5 text-sm outline-none"
            />
            {joinErr ? <p className="mb-1.5 text-sm text-danger">{joinErr}</p> : null}
            {store.authErr ? <p className="mb-1.5 text-sm text-danger">{store.authErr}</p> : null}
            <div className="mb-1.5">
              <AccountKindPicker
                compact
                value={joinKind}
                onChange={(k) => {
                  setJoinKind(k);
                  setJoinFace(KIND_FACE[k]);
                }}
              />
            </div>
            <div className="mb-1.5">
              <AvatarPicker compact value={joinFace} handle={joinName} onChange={setJoinFace} />
            </div>
            <div className="mb-1.5">
              <YearBornSelect value={joinYear} onChange={setJoinYear} />
            </div>
            <div className="mb-2 space-y-1.5 rounded-lg border border-line px-2 py-1.5">
              <label className="flex items-start gap-2 text-[10px] leading-snug text-muted">
                <input type="checkbox" className="mt-0.5" checked={joinAgree} onChange={(e) => setJoinAgree(e.target.checked)} />
                <span>
                  I agree to the{" "}
                  <a href="/terms#terms" className="font-semibold text-lime-2 underline" target="_blank" rel="noreferrer">
                    Terms
                  </a>
                  .
                </span>
              </label>
              <label className="flex items-start gap-2 text-[10px] leading-snug text-muted">
                <input type="checkbox" className="mt-0.5" checked={joinAgreeRules} onChange={(e) => setJoinAgreeRules(e.target.checked)} />
                <span>
                  I accept the{" "}
                  <a href="/terms#rules" className="font-semibold text-lime-2 underline" target="_blank" rel="noreferrer">
                    Rules
                  </a>
                  . I am responsible for what I submit.
                </span>
              </label>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className="btn-join flex-1 rounded-lg py-2 text-sm font-bold"
                onClick={() => {
                  void (async () => {
                    setJoinErr("");
                    if (!joinAgree || !joinAgreeRules) {
                      setJoinErr("Tick both boxes. Read the Terms and the Rules first.");
                      return;
                    }
                    const r = await kilodeSignUp(joinName, joinPass, joinKind, joinFace, typeof joinYear === "number" ? joinYear : undefined);
                    if (!r.ok) setJoinErr(r.reason);
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
                    const r = await kilodeSignIn(joinName, joinPass);
                    if (!r.ok) setJoinErr(r.reason);
                    else window.location.reload();
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

function SkinToggle() {
  const [skin, setSkin] = useState<"night" | "ivory">("night");
  useEffect(() => {
    try {
      const raw = localStorage.getItem("kilode-skin-v2");
      const s = raw === "ivory" ? "ivory" : "night";
      setSkin(s);
      document.documentElement.setAttribute("data-skin", s);
    } catch {
      document.documentElement.setAttribute("data-skin", "night");
    }
  }, []);
  return (
    <button
      type="button"
      className="grid size-8 place-items-center rounded-lg border border-line bg-panel-2"
      aria-label={skin === "night" ? "Switch to light skin" : "Switch to night skin"}
      title={skin === "night" ? "Light" : "Night"}
      onClick={() => {
        const next = skin === "night" ? "ivory" : "night";
        setSkin(next);
        document.documentElement.setAttribute("data-skin", next);
        try {
          localStorage.setItem("kilode-skin-v2", next);
        } catch {
          /* ignore */
        }
      }}
    >
      {skin === "night" ? <Sun className="size-3.5 text-lime-2" /> : <Moon className="size-3.5" />}
    </button>
  );
}

function ShareIco({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-label={label} title={label} className="share-ico" onClick={onClick}>
      {children}
    </button>
  );
}

function IconWa() {
  return (
    <svg viewBox="0 0 24 24" className="size-4 fill-current" aria-hidden>
      <path d="M12.04 2C6.58 2 2.15 6.4 2.15 11.83c0 1.74.46 3.44 1.34 4.94L2 22l5.4-1.41a10.1 10.1 0 0 0 4.64 1.12h.01c5.46 0 9.89-4.4 9.89-9.84C21.94 6.4 17.5 2 12.04 2Zm5.72 13.99c-.24.68-1.4 1.25-1.93 1.33-.49.07-1.1.1-1.78-.11-.41-.13-.94-.3-1.61-.59-2.84-1.23-4.7-4.1-4.84-4.29-.14-.19-1.15-1.53-1.15-2.92 0-1.39.73-2.07.99-2.36.26-.29.57-.36.76-.36h.55c.18 0 .41-.07.64.49.24.58.82 2 .89 2.14.07.15.12.32.02.51-.1.2-.15.32-.3.5-.14.17-.3.38-.43.51-.14.14-.29.29-.12.56.16.27.73 1.2 1.57 1.95 1.08.96 1.99 1.26 2.26 1.4.27.14.43.12.59-.07.16-.19.68-.79.86-1.06.18-.27.36-.22.61-.13.24.1 1.54.73 1.8.86.27.13.44.2.51.31.07.11.07.64-.17 1.32Z" />
    </svg>
  );
}
function IconX() {
  return (
    <svg viewBox="0 0 24 24" className="size-3.5 fill-current" aria-hidden>
      <path d="M18.9 2H22l-6.8 7.8L23 22h-6.5l-5.1-6.7L5.8 22H2.7l7.3-8.3L1 2h6.6l4.6 6.1L18.9 2Zm-1.1 18h1.8L6.3 3.9H4.4L17.8 20Z" />
    </svg>
  );
}
function IconFb() {
  return (
    <svg viewBox="0 0 24 24" className="size-4 fill-current" aria-hidden>
      <path d="M14 9h3V6h-3c-2.2 0-4 1.8-4 4v2H8v3h2v7h3v-7h2.6l.4-3H13v-2c0-.6.4-1 1-1Z" />
    </svg>
  );
}
function IconTg() {
  return (
    <svg viewBox="0 0 24 24" className="size-4 fill-current" aria-hidden>
      <path d="M21.5 3.5 2.8 10.7c-1.3.5-1.3 1.2-.2 1.5l4.8 1.5 1.9 5.8c.2.7.4 1 1.1.6l2.7-2.5 5.3 3.9c1 .6 1.7.3 2-1l3.4-16c.4-1.5-.5-2.2-1.6-1.7Z" />
    </svg>
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
    <button type="button" onClick={onClick} className={`app-tab pointer-events-auto flex min-h-12 flex-col items-center justify-center gap-0.5 px-0.5 text-[9px] font-semibold leading-tight ${on ? "on" : ""}`}>
      {icon}
      {label}
    </button>
  );
}

function RepostFab({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label="Repost to chat"
      className="absolute top-2 right-2 z-20 grid size-9 place-items-center rounded-full border border-white/25 bg-black/55 text-white shadow-[0_6px_16px_rgba(0,0,0,0.45)] backdrop-blur-sm"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
    >
      <Repeat2 className="size-4" strokeWidth={2.5} />
    </button>
  );
}

function RepostModal({
  post,
  handle,
  cap,
  onCap,
  onSend,
  onClose,
}: {
  post: { id: string; title: string; slug?: string };
  handle: string;
  cap: string;
  onCap: (v: string) => void;
  onSend: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/50 p-3 sm:place-items-center" onClick={onClose}>
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-line bg-panel p-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 text-lime-2">
          <Repeat2 className="size-4" />
          <span className="text-[11px] font-bold tracking-[0.14em]">REPOST TO CHAT</span>
        </div>
        <p className="mt-2 line-clamp-3 text-[14px] font-semibold leading-snug">{post.title}</p>
        <p className="mt-1 text-[11px] text-muted">Goes to the chat you are in. People see “{handle || "You"} reposted”.</p>
        <textarea value={cap} onChange={(e) => onCap(e.target.value)} placeholder="Add a caption (optional)" className="mt-3 min-h-20 w-full rounded-lg border border-line bg-bg px-3 py-2 text-[13px]" />
        <div className="mt-3 flex gap-2">
          <button type="button" className="btn-join flex-1 rounded-lg py-2 text-[12px] font-bold" onClick={onSend}>
            Send to chat
          </button>
          <button type="button" className="rounded-lg border border-line px-3 text-[12px]" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function DrawerGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <div className="px-1 py-1.5 text-[10px] font-medium tracking-normal text-muted">{label}</div>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function DrawerRow({
  icon: Icon,
  label,
  hint,
  onClick,
  href,
  on,
}: {
  icon: typeof Home;
  label: string;
  hint?: string;
  onClick?: () => void;
  href?: string;
  on?: boolean;
}) {
  const inner = (
    <>
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-lime-2/10">
        <Icon className="size-4 text-lime-2" />
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className="block truncate font-semibold">{label}</span>
        {hint ? <span className="block truncate text-[10px] font-normal text-muted">{hint}</span> : null}
      </span>
      <ChevronRight className="size-3.5 shrink-0 text-muted" />
    </>
  );
  const cls = `flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm ${on ? "bg-panel-2 text-lime-2" : "hover:bg-panel-2"}`;
  if (href) {
    return (
      <a href={href} className={cls}>
        {inner}
      </a>
    );
  }
  return (
    <button type="button" className={cls} onClick={onClick}>
      {inner}
    </button>
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
      if (!t?.id) return false;
      if (genre !== "All" && (t.genre || "Afrobeats") !== genre) return false;
      if (!s) return true;
      return `${t.artist} ${t.title} ${t.author} ${t.genre ?? ""}`.toLowerCase().includes(s);
    });
  }, [store.tracks, q, genre]);

  const digAll = useMemo(() => {
    const s = q.trim().toLowerCase();
    return DIGITAL_TRACKS.filter((t) => {
      if (!t?.id) return false;
      if (genre !== "All" && (t.genre || "Afrobeats") !== genre) return false;
      if (!s) return true;
      return `${t.artist} ${t.title} ${t.genre ?? ""}`.toLowerCase().includes(s);
    });
  }, [q, genre]);

  const mine = mineAll.filter((t) => !!t?.id).slice(0, mineShown);
  const digital = digAll.filter((t) => !!t?.id).slice(0, digShown);
  const chart = DIGITAL_TRACKS.filter((t) => !!t?.id).slice(0, 10);
  const fresh = [...DIGITAL_TRACKS].filter((t) => !!t?.id).reverse().slice(0, 10);

  function Tile({ t, compact }: { t: (typeof store.tracks)[number]; compact?: boolean }) {
    if (!t?.id) return null;
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
            <img
              src={t.cover}
              alt=""
              className={`${compact ? "size-8" : "size-9"} shrink-0 rounded object-cover`}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <span className="btn-3d grid size-8 shrink-0 place-items-center rounded-full">
              <Play className="size-3 fill-lime-2 text-lime-2" />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <div className="truncate text-[12px] font-semibold leading-tight">{t.title}</div>
            <div className="truncate text-[11px] text-muted">
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
          {items.filter((t) => !!t?.id).map((t) => (
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
              <div className="mt-1 truncate text-[12px] font-semibold leading-tight">{t.title}</div>
              <div className="truncate text-[11px] text-muted">{t.artist}</div>
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

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 dock-pad">
        <section className="mb-3">
          <div className="mb-1.5 text-[11px] font-bold">Browse</div>
          <div className="flex gap-2 overflow-x-auto overscroll-x-contain pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {MUSIC_RAILS.map((r) => (
              <button
                key={r.id}
                type="button"
                className="music-rail w-[132px] shrink-0 overflow-hidden rounded-xl text-left"
                style={{ ["--rail" as string]: r.color }}
                onClick={onAdd}
              >
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
        <Rail title="Made for Kilode" items={[...DIGITAL_TRACKS].filter((t) => !!t?.id).sort((a, b) => (b.views ?? 0) - (a.views ?? 0)).slice(0, 10)} />

        <div className="mb-1.5 text-[11px] font-bold">Library split</div>
        <div className="grid grid-cols-2 gap-2">
          <section className="min-w-0">
            <h3 className="mb-1.5 text-[9px] font-medium tracking-normal text-lime-2">On Kilode</h3>
            <div className="space-y-1">
              {mine.length === 0 ? <EmptyHero title="No tracks match" body="Try another search or add a track from Create." cta="Add a track" onClick={onAdd} /> : null}
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
            <h3 className="mb-1.5 text-[9px] font-medium tracking-normal text-muted">Digital</h3>
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
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2 dock-pad">
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

function ArticleRead({ post, store, onRepost }: { post: import("@/lib/qonvo-data").Post; store: ReturnType<typeof useQonvo>; onRepost?: () => void }) {
  const session = useCurrentUserState();
  const [note, setNote] = useState("");
  const [reason, setReason] = useState("");
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    store.see("posts", post.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post.id]);
  const comments = post.comments ?? [];
  const roots = comments.filter((c) => !c.parentTs);
  const kids = (ts: number) => comments.filter((c) => c.parentTs === ts);
  const mins = Math.max(1, Math.round((post.body || "").split(/\s+/).length / 180));
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
    <article className="min-h-0 flex-1 overflow-y-auto dock-pad">
      <div className="mx-auto max-w-3xl px-4 py-4">
        <button type="button" className="text-[11px] text-muted" onClick={() => store.setOpenPost(null)}>
          ← Feeds
        </button>
        <div className="raised mt-3 overflow-hidden rounded-2xl">
          {post.image ? (
            <div className="relative">
              <img src={post.image} alt="" className="aspect-[16/9] w-full object-cover" />
              {onRepost ? <RepostFab onClick={onRepost} /> : null}
            </div>
          ) : null}
          <div className="p-4">
            <div className="text-[10px] font-medium tracking-[0.16em] text-lime-2">{post.category || "General"}</div>
            <h1 className="mt-1 text-2xl font-extrabold leading-tight">{post.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted">
              <AvatarImg handle={post.author} size={22} />
              <span className="font-semibold tracking-wide text-muted">POSTED BY:</span>
              <HandleLink handle={post.author} className="text-[11px] font-semibold" />
              <span>· {timeLabel(post.ts)}</span>
              <span>· {mins} min read</span>
              {post.tags ? <span>· {post.tags}</span> : null}
            </div>
            {post.excerpt && !isDupExcerpt(post.title, post.excerpt) ? <p className="mt-2 text-[13px] leading-5 text-muted">{post.excerpt}</p> : null}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-white/5 px-3 py-2 text-[11px]">
            {[
              { icon: Eye, n: post.views ?? 0, label: "Views" },
              { icon: MessageSquare, n: post.comments.length, label: "Comments" },
              { icon: Heart, n: likes, label: "Likes" },
              { icon: Bookmark, n: saved ? 1 : 0, label: saved ? "Saved" : "Save" },
              { icon: Share2, n: shares, label: "Shares" },
              { icon: Hash, n: mins, label: "Min" },
            ].map((s) => (
              <span key={s.label} className="inline-flex items-center gap-1 text-muted">
                <s.icon className="size-3.5 text-lime-2" />
                <span className="font-bold text-fg">{fmtCount(s.n)}</span>
                <span className="hidden text-[10px] sm:inline">{s.label}</span>
              </span>
            ))}
          </div>
        </div>
        <div className="share-row mt-3">
          <ShareIco label="Like" onClick={() => store.likePost(post.id)}>
            <Heart className={`size-3.5 ${likes ? "fill-lime-2 text-lime-2" : ""}`} />
          </ShareIco>
          <ShareIco label={saved ? "Saved" : "Save"} onClick={() => store.savePostMark(post.id)}>
            <Bookmark className={`size-3.5 ${saved ? "fill-lime-2 text-lime-2" : ""}`} />
          </ShareIco>
          <ShareIco label="WhatsApp" onClick={() => share("wa")}>
            <IconWa />
          </ShareIco>
          <ShareIco label="X" onClick={() => share("x")}>
            <IconX />
          </ShareIco>
          <ShareIco label="Facebook" onClick={() => share("fb")}>
            <IconFb />
          </ShareIco>
          <ShareIco label="Telegram" onClick={() => share("tg")}>
            <IconTg />
          </ShareIco>
          <ShareIco label={copied ? "Copied" : "Copy link"} onClick={() => share("copy")}>
            <Copy className="size-3.5" />
          </ShareIco>
          <ShareIco label="Share" onClick={() => share("native")}>
            <Share2 className="size-3.5 text-lime-2" />
          </ShareIco>
        </div>
        <TrendingRail posts={store.posts} ads={store.campaigns} exclude={post.id} onOpen={(id) => store.setOpenPost(id)} />
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
        <div className="mt-6">
          <AdSlotOrEmpty id="article_mid" label="" />
        </div>
        <div className="mt-8 border-t border-line pt-4">
          <div className="flex items-end justify-between gap-2">
            <div>
              <div className="text-[10px] font-bold tracking-[0.16em] text-lime-2">COMMENTS</div>
              <div className="text-lg font-extrabold">{post.comments.length} on this story</div>
            </div>
            <span className="text-[10px] text-muted">{post.commentsOn === false ? "Comments are off" : "Keep it civil. You own what you type."}</span>
          </div>
          {roots.map((c) => (
            <div key={c.ts} className="raised mt-3 rounded-2xl p-3 text-sm">
              <div className="flex items-center gap-2 text-[11px]">
                <AvatarImg handle={c.author} size={22} />
                <HandleLink handle={c.author} className="text-[11px] font-semibold" />
                <span className="font-normal text-muted">{timeLabel(c.ts)}</span>
              </div>
              <p className="mt-1.5 leading-6">{c.body}</p>
              <TranslateBtn text={c.body} />
              <button type="button" className="mt-1 text-[10px] font-semibold text-lime-2" onClick={() => setReplyTo(c.ts)}>
                Reply
              </button>
              {kids(c.ts).map((r) => (
                <div key={r.ts} className="mt-2 ml-3 border-l-2 border-lime-2/40 pl-3">
                  <div className="flex items-center gap-2 text-[11px]">
                    <AvatarImg handle={r.author} size={18} />
                    <HandleLink handle={r.author} className="text-[11px] font-semibold" />
                    <span className="text-muted">{timeLabel(r.ts)}</span>
                  </div>
                  <p className="mt-1 leading-6">{r.body}</p>
                </div>
              ))}
            </div>
          ))}
          {post.commentsOn === false ? (
            <p className="mt-3 text-[12px] text-muted">The author turned comments off for this post.</p>
          ) : (
          <form
            className="raised mt-3 flex gap-2 rounded-2xl p-2"
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
              placeholder={session.user ? (replyTo ? "Reply to comment…" : "Write a comment") : "Sign in to comment"}
              className="min-h-10 flex-1 rounded-lg border border-line bg-panel px-3 text-sm"
            />
            <button type="submit" className="btn-join rounded-lg px-3 text-xs font-bold">
              {replyTo ? "Reply" : "Comment"}
            </button>
          </form>
          )}
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
        <div className="mt-6">
          <PremiumStoryAd />
        </div>
        <AdReserve id="article_leader" className="mt-8 mb-8" />
        <RelatedGrid posts={store.posts} exclude={post.id} category={post.category} onOpen={(id) => store.setOpenPost(id)} />
        <PortraitAd id="feeds_portrait_before" />
        <AdReserve id="article_before_top10" className="mt-8 mb-8" />
        <TopTen posts={store.posts} exclude={post.id} onOpen={(id) => store.setOpenPost(id)} />
        <PortraitAd id="feeds_portrait_after" />
        <AdReserve id="article_after_top10" className="mt-8 mb-8" />
        <LandscapeGrid title="MORE HIGHLIGHTS" posts={[...store.posts].sort((a, b) => (b.views ?? 0) - (a.views ?? 0))} exclude={post.id} onOpen={(id) => store.setOpenPost(id)} />
        <div className="mt-10 mb-8">
          <PremiumStoryAd compact />
        </div>
        <AdReserve id="feeds_highlights_ad" className="mt-8 mb-8" />
        <LandscapeGrid title="MORE NEWS" posts={store.posts.filter((p) => p.category === "News" || p.category === "Naija" || p.category === "Politics")} exclude={post.id} onOpen={(id) => store.setOpenPost(id)} />
        <AdReserve id="feeds_news_ad" className="mt-8 mb-8" />
        <DontMissGrid posts={[...store.posts].sort((a, b) => b.ts - a.ts)} exclude={post.id} onOpen={(id) => store.setOpenPost(id)} />
        <PortraitAd id="feeds_portrait_miss" />
        <div className="mt-8 grid grid-cols-2 gap-2">
          <AdReserve id="article_box" minH="min-h-[120px]" />
          <AdReserve id="article_video" minH="min-h-[120px]" />
        </div>
      </div>
    </article>
  );
}


function EmptyHero({ title, body, cta, onClick }: { title: string; body: string; cta: string; onClick?: () => void }) {
  return (
    <div className="mx-auto flex max-w-sm flex-col items-center px-6 py-10 text-center">
      <img src="/kilode-logo-green.png" alt="" className="mb-4 h-9 w-auto max-w-[160px] object-contain opacity-90" />
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted">{body}</p>
      {onClick ? (
        <button type="button" className="btn-join mt-4 rounded-lg px-4 py-2 text-sm font-bold" onClick={onClick}>
          {cta}
        </button>
      ) : null}
    </div>
  );
}


function FeedPane({ store, q = "", onDesk }: { store: ReturnType<typeof useQonvo>; q?: string; onDesk: (d: MarketDesk) => void }) {
  const [cat, setCat] = useState("All");
  const [shown, setShown] = useState(48);
  const [catsOpen, setCatsOpen] = useState(false);
  const [repost, setRepost] = useState<(typeof store.posts)[number] | null>(null);
  const [cap, setCap] = useState("");
  const open = store.posts.find((p) => p.id === store.openPost);
  const needle = q.trim().toLowerCase();
  const live = store.posts
    .filter(
      (p) =>
        !!p?.id &&
        p.status !== "draft" &&
        (cat === "All" || p.category === cat) &&
        (!needle || p.title.toLowerCase().includes(needle) || (p.excerpt || "").toLowerCase().includes(needle)),
    )
    .sort((a, b) => b.ts - a.ts);
  const catCounts = useMemo(() => {
    const m = new Map<string, number>();
    store.posts.forEach((p) => {
      if (p.status === "draft") return;
      const c = p.category || "General";
      m.set(c, (m.get(c) ?? 0) + 1);
    });
    return m;
  }, [store.posts]);
  if (open) {
    return (
      <>
        <ArticleRead
          post={open}
          store={store}
          onRepost={() => {
            if (!store.authed) {
              window.location.href = "/login?mode=up";
              return;
            }
            setRepost(open);
            setCap("");
          }}
        />
        {repost ? (
          <RepostModal
            post={repost}
            handle={store.handle}
            cap={cap}
            onCap={setCap}
            onClose={() => setRepost(null)}
            onSend={() => {
              const who = store.handle || "Someone";
              const extra = cap.trim();
              const path = `/p/${encodeURIComponent(repost.slug || repost.id)}`;
              store.send(`${who} reposted: ${repost.title}${extra ? `\n${extra}` : ""}\n${path}`);
              store.sharePost(repost.id);
              setRepost(null);
              setCap("");
            }}
          />
        ) : null}
      </>
    );
  }
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 dock-pad">
        <FeedsHero
          posts={store.posts}
          ads={store.campaigns}
          onOpen={(id) => store.setOpenPost(id)}
          onViewAd={(id) => store.see("ads", id)}
          onRepost={(p) => {
            if (!store.authed) {
              window.location.href = "/login?mode=up";
              return;
            }
            setRepost(p);
            setCap("");
          }}
        />
        <MarketRail onPick={onDesk} />
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="text-[10px] font-medium tracking-[0.16em] text-lime-2">LATEST POST{cat !== "All" ? ` · ${cat.toUpperCase()}` : ""}</div>
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-md border border-line px-2 py-1 text-[10px] font-semibold uppercase tracking-wide"
            onClick={() => setCatsOpen((v) => !v)}
          >
            Categories
            <ChevronDown className={`size-3 transition ${catsOpen ? "rotate-180" : ""}`} />
          </button>
        </div>
        {catsOpen ? (
          <ul className="mb-3 overflow-hidden rounded-xl border border-line">
            <li>
              <button
                type="button"
                className={`flex w-full items-center justify-between px-3 py-2.5 text-left ${cat === "All" ? "text-lime-2" : ""}`}
                onClick={() => {
                  setCat("All");
                  setShown(48);
                  setCatsOpen(false);
                }}
              >
                <span className="text-[13px] font-semibold">All</span>
                <span className="tabular-nums text-[11px] text-muted">{store.posts.filter((p) => p.status !== "draft").length} posts</span>
              </button>
            </li>
            {POST_CATS.map((c) => (
              <li key={c} className="border-t border-line">
                <button
                  type="button"
                  className={`flex w-full items-center justify-between px-3 py-2.5 text-left ${cat === c ? "text-lime-2" : ""}`}
                  onClick={() => {
                    setCat(c);
                    setShown(48);
                    setCatsOpen(false);
                  }}
                >
                  <span className="text-[13px] font-semibold">{c}</span>
                  <span className="tabular-nums text-[11px] text-muted">{catCounts.get(c) ?? 0}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
          {live.filter((p) => !!p?.id).slice(0, shown).map((p) => (
            <button key={p.id} type="button" data-feed-card="1" className="raised overflow-hidden rounded-md text-left" onClick={() => store.setOpenPost(p.id)}>
              {p.image ? <img src={p.image} alt="" className="aspect-[4/3] w-full object-cover" /> : <div className="aspect-[4/3] bg-panel-3" />}
              <div className="px-1 py-1 sm:px-1.5">
                <div className="text-[9px] font-medium tracking-normal text-lime-2/80">{p.category || "General"}</div>
                <div className="mt-0.5 line-clamp-4 text-[10px] font-normal leading-tight text-fg sm:text-[11px] md:text-[12px]">{p.title}</div>
                <div className="mt-0.5 flex items-center gap-1.5 text-[8px] tabular-nums text-muted">
                  <span className="inline-flex items-center gap-0.5">
                    <Eye className="size-2.5" />
                    {fmtCount(p.views ?? 0)}
                  </span>
                  <span className="inline-flex items-center gap-0.5">
                    <MessageSquare className="size-2.5" />
                    {p.comments?.length ?? 0}
                  </span>
                  <span
                    role="button"
                    aria-label="Share"
                    className="ml-auto inline-flex items-center"
                    onClick={(e) => {
                      e.stopPropagation();
                      store.sharePost(p.id);
                      const url = `${window.location.origin}/p/${encodeURIComponent(p.slug || p.id)}`;
                      if (navigator.share) void navigator.share({ title: p.title, url });
                      else void navigator.clipboard?.writeText(url);
                    }}
                  >
                    <Share2 className="size-2.5" />
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
        {shown < live.length ? (
          <button
            type="button"
            className="btn-3d mt-6 mb-8 w-full rounded-md py-2.5 text-[12px] font-extrabold tracking-[0.18em]"
            onClick={() => setShown((n) => n + 24)}
          >
            NEXT
          </button>
        ) : live.length > 0 ? (
          <p className="mt-6 mb-6 text-center text-[11px] text-muted">End of feeds · {live.length} posts</p>
        ) : (
          <EmptyHero title="No posts yet" body="Be first — share a take for Nigeria." cta="Create a post" onClick={() => { window.dispatchEvent(new CustomEvent("kilode:create")); }} />
        )}
        {repost ? (
          <RepostModal
            post={repost}
            handle={store.handle}
            cap={cap}
            onCap={setCap}
            onClose={() => setRepost(null)}
            onSend={() => {
              const who = store.handle || "Someone";
              const extra = cap.trim();
              const path = `/p/${encodeURIComponent(repost.slug || repost.id)}`;
              store.send(`${who} reposted: ${repost.title}${extra ? `\n${extra}` : ""}\n${path}`);
              store.sharePost(repost.id);
              setRepost(null);
              setCap("");
            }}
          />
        ) : null}
        <PortraitAd id="feeds_portrait_before" />
        <AdReserve id="feeds_before_top10" className="mt-8 mb-8" />
        <TopTen posts={store.posts} exclude="" onOpen={(id) => store.setOpenPost(id)} />
        <PortraitAd id="feeds_portrait_after" />
        <AdReserve id="feeds_after_top10" className="mt-8 mb-8" />
        <LandscapeGrid title="MORE HIGHLIGHTS" posts={[...store.posts].sort((a, b) => (b.views ?? 0) - (a.views ?? 0))} onOpen={(id) => store.setOpenPost(id)} />
        <div className="mt-10 mb-8">
          <PremiumStoryAd compact />
        </div>
        <AdReserve id="feeds_highlights_ad" className="mt-8 mb-8" />
        <LandscapeGrid title="MORE NEWS" posts={store.posts.filter((p) => p.category === "News" || p.category === "Naija" || p.category === "Politics")} onOpen={(id) => store.setOpenPost(id)} />
        <AdReserve id="feeds_news_ad" className="mt-8 mb-8" />
        <DontMissGrid posts={[...store.posts].sort((a, b) => b.ts - a.ts)} onOpen={(id) => store.setOpenPost(id)} />
        <PortraitAd id="feeds_portrait_miss" />
        <AdReserve id="feeds_after_miss" className="mt-8 mb-8" />
        <CategoryArchive
          posts={store.posts}
          onPick={(c) => {
            setCat(c);
            setShown(48);
          }}
        />
        <TagArchive posts={store.posts} onOpen={(id) => store.setOpenPost(id)} />
        <AdReserve id="feeds_after_tags" className="mt-3" />
        <SiteFooter />
      </div>
    </div>
  );
}

function ChatAdCard({ ad, pinned, onView }: { ad: Campaign; pinned?: boolean; onView: () => void }) {
  const [gone, setGone] = useState(false);
  const href = ad.link || undefined;
  if (gone) return null;
  const inner = pinned ? (
    <div className="flex items-center gap-2.5 px-2.5 py-2 pr-9">
      {ad.image ? <img src={ad.image} alt="" className="h-12 w-14 shrink-0 rounded-lg object-cover" /> : <div className="grid h-11 w-14 shrink-0 place-items-center rounded-md bg-panel-3 text-[9px] text-lime-2">AD</div>}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-medium tracking-normal text-lime-2">Pinned</span>
          <span className="text-[11px] text-muted">{fmtCount(ad.views ?? 0)}</span>
        </div>
        <div className="truncate text-[13px] font-semibold leading-tight">{ad.name}</div>
        {ad.note ? <p className="truncate text-[11px] text-muted">{ad.note}</p> : null}
      </div>
    </div>
  ) : (
    <>
      <div className="flex items-center justify-between px-2 py-1">
        <span className="text-[9px] font-medium tracking-normal text-lime-2">Premium ad</span>
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
  const cls = pinned ? "relative mx-3 mt-2 overflow-hidden rounded-xl border border-lime-2/35 bg-panel" : "overflow-hidden rounded-xl border border-line bg-panel";
  const close = pinned ? (
    <button
      type="button"
      aria-label="Close ad"
      className="absolute top-1.5 right-1.5 z-10 grid size-7 place-items-center rounded-md border border-line bg-panel text-fg"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setGone(true);
      }}
    >
      <X className="size-3.5" />
    </button>
  ) : null;
  if (href) {
    return (
      <div className={cls}>
        {close}
        <a href={href} target="_blank" rel="noreferrer" className="block" onClick={onView}>
          {inner}
        </a>
      </div>
    );
  }
  return (
    <div className={cls}>
      {close}
      <button type="button" className="block w-full text-left" onClick={onView}>
        {inner}
      </button>
    </div>
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
        {/^(.+?\s)?reposted:\s/i.test(m.t || "") ? (
          <span>
            <span className="inline-flex items-center gap-1 font-semibold text-lime-2">
              <Repeat2 className="size-3.5" />
              {m.t.split("\n")[0]}
            </span>
            {m.t.split("\n").slice(1).map((line, i) =>
              line.startsWith("/p/") ? (
                <a key={i} href={line} className="mt-1 block text-[12px] text-lime-2 underline">
                  Open story
                </a>
              ) : (
                <span key={i} className="mt-1 block text-[13px]">
                  {line}
                </span>
              ),
            )}
          </span>
        ) : (
          mentionParts(m.t, handle).map((p, i) =>
            p.on ? (
              <span key={i} className="rounded-sm bg-lime-2/15 px-0.5 font-semibold text-lime-2">
                {p.t}
              </span>
            ) : (
              <span key={i}>{p.t}</span>
            ),
          )
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
        <p className="mb-3 text-[11px] text-muted">Send crypto to a wallet below. Copy from this screen only. Verify first and last 6 characters. Wrong network = lost funds. Kilode never DMs a wallet.</p>
        <div className="space-y-2">
          {Array.from(new Set([...AD_COINS.map((c) => c.id), ...wallets.map((w) => w.coin)])).map((id) => {
            const c = AD_COINS.find((x) => x.id === id);
            const addr = wallets.find((w) => w.coin === id)?.address;
            const ticker = c?.ticker ?? id.toUpperCase();
            return (
              <div key={id} className="rounded-lg border border-white/5 px-2 py-1.5">
                <div className="text-[10px] font-medium tracking-normal text-lime-2">{ticker}</div>
                <div className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate font-mono text-[10px] text-muted">{addr || "Not set yet"}</span>
                  {addr ? (
                    <button
                      type="button"
                      className="shrink-0 text-[10px] text-lime-2"
                      onClick={() => {
                        void navigator.clipboard?.writeText(addr).then(() => {
                          setCopied(id);
                          setTimeout(() => setCopied(""), 1200);
                        });
                      }}
                    >
                      {copied === id ? "Copied" : "Copy"}
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
