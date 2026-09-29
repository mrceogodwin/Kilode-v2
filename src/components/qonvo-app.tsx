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
  Flame,
  Globe,
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
  Music,
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
  Moon,
  Sun,
  Tv,
} from "lucide-react";
import { ACCOUNT_KINDS, MENU, POST_CATS, ROOMS, AD_COINS, KIND_FACE, avatarUrl, chatTtlLabel, fmtCount, handleColor, parseMusicUrl, roomName, timeLabel, youtubeId, type AccountKind, type Campaign, type ChatMsg, type MenuId, type Room } from "@/lib/qonvo-data";
import { canKind, canCreateMenu, createLabelFor } from "@/lib/permissions";
import { disconnectFellow, listConnects, listLive, listTakes, replyConnect, type ConnectRow } from "@/lib/takes-server";
import { listInbox, sendDm } from "@/lib/social-server";
import { SplashScreen } from "@/components/splash-screen";
import { unlockSound, pingMessage } from "@/lib/ping";
import { useRealtimeInbox } from "@/lib/use-realtime";
import { MUSIC_GENRES, MUSIC_RAILS, VIDEO_CATALOG, VIDEO_SECTIONS } from "@/lib/qonvo-seed";
import { useQonvo } from "@/lib/use-qonvo";
import { QonvoScreen, openRoleCreate, queueNewsPost } from "@/components/qonvo-screens";
import { EventsPane } from "@/components/events-pane";
import { CinemaPane } from "@/components/cinema-pane";
import { ChatTermsBar, ForumClock, ForumWhy } from "@/components/forum-why";
import { PremiumSquareAd, PremiumStoryAd, MenuPremiumAd, PortraitAd } from "@/components/premium-ad";
import { AdvertPane } from "@/components/advert-pane";
import { RoomList } from "@/components/rooms-list";
import { listRoomOverlay } from "@/lib/rooms-server";
import { Link } from "@tanstack/react-router";
import { SignedIn, SignedOut } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { getPublicPost, listPostSeen, listWallets, notePostSeen, deleteOwnPost, pingPresence } from "@/lib/forum-server";
import { kilodeSignIn, kilodeSignUp } from "@/lib/register";
import { AccountKindPicker, AvatarImg, AvatarPicker } from "@/components/account-kind";
import { ThreadTranslateBar, TranslatedLine } from "@/components/translate-btn";
import { HandleLink } from "@/components/handle-link";
import { ReportMenu } from "@/components/report-menu";
import { NotifyBell } from "@/components/notify-bell";
import { MenuLegal, MenuPin } from "@/components/get-app";
import { AdSlotOrEmpty, AdReserve } from "@/components/ad-slot";
import { RelatedGrid, TopTen, TrendingRail, LandscapeGrid, CategoryArchive, TagArchive, DontMissGrid, isDupExcerpt } from "@/components/engage-rail";
import { LinkText } from "@/components/link-text";
import { PostBody } from "@/components/post-body";
import { postBodyPlain } from "@/lib/post-body";
import { InstallToast, PublicSiteProvider, SiteFooter, TrendingTicker, usePublicSite } from "@/components/site-chrome";
import type { PublicSite } from "@/lib/site-server";
import { OnboardSheet } from "@/components/onboard-sheet";
import { FeedsHero } from "@/components/feeds-hero";
import { BrandLockup } from "@/components/brand-lockup";
import { DownloadsPane } from "@/components/downloads-pane";
import { TvPane } from "@/components/tv-pane";
import { DESKS, MarketsDesk, type MarketDesk } from "@/components/markets-desk";
import { SocialsFeed, openSocialFellows, shareNewsToSocials } from "@/components/socials-feed";

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
  spaces: Store,
  rent: Building2,
  contact: Mail,
  admin: Shield,
  settings: Settings,
  help: HelpCircle,
  how: Play,
};

const MENU_GROUPS: { label: string; ids: MenuId[] }[] = [
  { label: "Me", ids: ["dashboard", "profile", "bookmarks", "inbox", "notifications", "teams"] },
  { label: "Discover", ids: ["trending", "tv", "community", "search", "leaderboard", "badges"] },
  { label: "Create", ids: ["create", "ads"] },
];

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


export function QonvoApp({ initialSite }: { initialSite?: PublicSite } = {}) {
  return (
    <>
      <SplashScreen />
      <PublicSiteProvider initial={initialSite}>
        <QonvoAppInner />
      </PublicSiteProvider>
    </>
  );
}

function QonvoAppInner() {
  const store = useQonvo();
  const { site } = usePublicSite();
  const videosMenuVisible = site.videosMenuVisible !== false;
  const session = useCurrentUserState();
  const signedIn = Boolean(session.user);
  const [dmCount, setDmCount] = useState(0);
  const dmSeen = useRef(0);
  useEffect(() => {
    const arm = () => unlockSound();
    window.addEventListener("pointerdown", arm, { once: true });
    return () => window.removeEventListener("pointerdown", arm);
  }, []);
  useEffect(() => {
    if (!signedIn) return;
    try {
      setForceOnboard(sessionStorage.getItem("kilode-force-onboard") === "1");
    } catch {
      /* ignore */
    }
  }, [signedIn]);
  useRealtimeInbox(signedIn ? session.user?.id ?? null : null, () => {
    setDmCount((n) => n + 1);
  });
  const [query, setQuery] = useState("");
  const region = "All";
  const [draft, setDraft] = useState("");
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [joinName, setJoinName] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [friendsOpen, setFriendsOpen] = useState(false);
  const [forceOnboard, setForceOnboard] = useState(false);
  const [screen, setScreen] = useState<MenuId>("home");
  useEffect(() => {
    if (!signedIn) {
      setDmCount(0);
      return;
    }
    let stop = false;
    void listInbox()
      .then((rows) => {
        if (stop) return;
        const me = (store.handle || "").toLowerCase();
        const n = rows.filter((r) => r.from && r.from.toLowerCase() !== me && r.from.toLowerCase() !== "kilode africa").length;
        if (dmSeen.current && n > dmSeen.current) pingMessage();
        dmSeen.current = n;
        setDmCount(n);
      })
      .catch(() => {
        if (!stop) setDmCount(0);
      });
    return () => {
      stop = true;
    };
  }, [signedIn, store.handle, screen]);
  useEffect(() => {
    if (!signedIn) return;
    const beat = () => {
      void pingPresence({ data: { roomId: store.roomId || "lounge", typing: false } }).catch(() => undefined);
    };
    beat();
    const id = window.setInterval(beat, 45000);
    return () => window.clearInterval(id);
  }, [signedIn, store.roomId]);
  const [roomsOpen, setRoomsOpen] = useState(false);
  const [homeTab, setHomeTab] = useState<"chat" | "feeds" | "advert" | "music" | "videos" | "cinema" | "watch" | "downloads" | "socials">("feeds");
  useEffect(() => {
    if (session.isPending || signedIn) return;
    if (screen === "home" && homeTab === "feeds") return;
    window.location.href = "/login?mode=up";
  }, [session.isPending, signedIn, screen, homeTab]);
  const [marketDesk, setMarketDesk] = useState<MarketDesk | null>(null);
  const [feedQ, setFeedQ] = useState("");
  const [feedSearchOn, setFeedSearchOn] = useState(false);
  const [joinPass, setJoinPass] = useState("");
  const [joinShowPass, setJoinShowPass] = useState(false);
  const [joinAgree, setJoinAgree] = useState(false);
  const [joinAgreeRules, setJoinAgreeRules] = useState(false);
  const [joinKind, setJoinKind] = useState<AccountKind>("member");
  const [joinFace, setJoinFace] = useState(KIND_FACE.member);
  const [joinErr, setJoinErr] = useState("");
  const [joinBusy, setJoinBusy] = useState(false);
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
  const [chatXlate, setChatXlate] = useState<Record<string, string>>({});
  const [forumWhy, setForumWhy] = useState(false);
  const [chatOk, setChatOk] = useState(false);
  const [roomOverlay, setRoomOverlay] = useState<{
    extra: Room[];
    paused: string[];
    overrides: Record<string, { name: string; region: string }>;
  }>({ extra: [], paused: [], overrides: {} });

  const liveRooms = useMemo(() => {
    const paused = new Set(roomOverlay.paused);
    const built = ROOMS.filter((r) => !paused.has(r.id)).map((r) => {
      const o = roomOverlay.overrides[r.id];
      return o ? { ...r, name: o.name, region: o.region } : r;
    });
    return [...built, ...roomOverlay.extra];
  }, [roomOverlay]);

  const room =
    liveRooms.find((r) => r.id === store.roomId) ??
    ROOMS.find((r) => r.id === store.roomId) ??
    ({ id: store.roomId, name: roomName(store.roomId), region: "More rooms", online: 0 } as Room);
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
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("tab") === "socials") setHomeTab("socials");
    if (params.get("open") === "inbox") setScreen("inbox");
    if (params.get("open") === "me") setScreen("dashboard");
    if (params.get("open") !== "inbox" && params.get("open") !== "me") return;
    params.delete("open");
    const next = params.toString();
    window.history.replaceState({}, "", `${window.location.pathname}${next ? `?${next}` : ""}${window.location.hash}`);
  }, []);

  useEffect(() => {
    void listRoomOverlay()
      .then(setRoomOverlay)
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const el = document.querySelector(".kilode-chrome");
    if (!el) return;
    const apply = () => {
      document.documentElement.style.setProperty("--chrome-bottom", `${Math.round(el.getBoundingClientRect().bottom)}px`);
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    window.addEventListener("resize", apply);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", apply);
    };
  }, []);


  useEffect(() => {
    try {
      setChatOk(localStorage.getItem("kilode-chat-ok") === "1");
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const open = (e: Event) => {
      const raw = String((e as CustomEvent).detail || "");
      const slug = decodeURIComponent(raw.replace(/^\/p\//, "")).trim();
      if (!slug) return;
      const hit = store.posts.find((p) => p.slug === slug || p.id === slug);
      const show = (id: string) => {
        store.setOpenPost(id);
        setScreen("home");
        setHomeTab("feeds");
      };
      if (hit) {
        show(hit.id);
        return;
      }
      void getPublicPost({ data: slug }).then((p) => {
        if (!p) return;
        store.pushPost({
          id: p.id,
          title: p.title,
          body: p.body,
          excerpt: p.excerpt || "",
          author: p.author,
          ts: Number(p.ts),
          comments: p.comments || [],
          category: p.category || "News",
          tags: p.tags || "",
          link: p.link || "",
          image: p.image || "",
          slug: p.slug || p.id,
          status: "publish",
          views: Number(p.views || 0),
        });
        show(p.id);
      });
    };
    window.addEventListener("kilode:read", open);
    return () => window.removeEventListener("kilode:read", open);
  }, [store]);

  useEffect(() => {
    const go = () => {
      if (store.authed || session.user) setScreen("create");
      else window.location.href = "/login";
    };
    window.addEventListener("kilode:create", go);
    const goto = (e: Event) => {
      const d = (e as CustomEvent<{ screen?: string; tab?: string }>).detail || {};
      if (d.tab) {
        const tab = d.tab as "chat" | "feeds" | "advert" | "music" | "videos" | "cinema" | "watch" | "downloads" | "socials";
        setHomeTab(tab === "videos" && site.videosMenuVisible === false ? "feeds" : tab);
      }
      if (d.screen === "home" || d.tab) setScreen("home");
      else if (d.screen) setScreen(d.screen as MenuId);
    };
    window.addEventListener("kilode:goto", goto);
    const openSocials = () => {
      setScreen("home");
      setHomeTab("socials");
      setMarketDesk(null);
    };
    window.addEventListener("kilode:socials", openSocials);
    return () => {
      window.removeEventListener("kilode:create", go);
      window.removeEventListener("kilode:goto", goto);
      window.removeEventListener("kilode:socials", openSocials);
    };
  }, [store.authed, session.user, site.videosMenuVisible]);


  useEffect(() => {
    stickBottom.current = true;
    lastMsgCount.current = store.msgs.length;
    setNewCount(0);
    setOpenFolds({});
    setReplyTo(null);
    setChatXlate({});
    requestAnimationFrame(() => scroller.current?.scrollTo({ top: scroller.current.scrollHeight }));
  }, [store.roomId]);

  useEffect(() => {
    if (homeTab !== "chat") return;
    store.bumpPresence(false);
  }, [homeTab, store.roomId]);

  useEffect(() => {
    const onChat = homeTab === "chat" && screen === "home";
    store.setChatLive(onChat);
    if (onChat) store.loadChatClock();
    if (homeTab === "music" && screen === "home") store.loadTracks();
  }, [homeTab, screen, store.setChatLive, store.loadChatClock, store.loadTracks]);

  useEffect(() => {
    if (screen === "leaderboard") store.loadScores();
  }, [screen, store.loadScores]);

  useEffect(() => {
    if (!videosMenuVisible && homeTab === "videos") setHomeTab("feeds");
  }, [videosMenuVisible, homeTab]);

  useEffect(() => {
    if (homeTab !== "feeds" || screen !== "home") setMarketDesk(null);
  }, [homeTab, screen]);

  useEffect(() => {
    const added = store.msgs.length - lastMsgCount.current;
    lastMsgCount.current = store.msgs.length;
    if (added <= 0) return;
    if (stickBottom.current) {
      requestAnimationFrame(() => {
        const el = scroller.current;
        if (el) el.scrollTop = el.scrollHeight;
      });
      setNewCount(0);
    } else setNewCount((n) => n + added);
  }, [store.msgs]);

  const purged = useRef(false);
  useEffect(() => {
    if (homeTab !== "chat" || screen !== "home") return;
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
  }, [store.chatHours, store.msgs, store.roomId, homeTab, screen]);

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
    <div className="kilode-shell relative flex min-h-0 flex-col overflow-hidden bg-bg text-fg">
      <header className="kilode-chrome z-20 shrink-0">
        <div className="kilode-header-capsule">
          <div className="flex min-h-12 flex-nowrap items-center gap-1.5 px-1.5">
            <button type="button" className="hdr-ico" aria-label="Menu" onClick={() => setMenuOpen((v) => !v)}>
              <Menu className="size-4" />
            </button>
            <button
              type="button"
              className="flex min-w-0 shrink items-center"
              aria-label="Kilode home"
              onClick={() => goHome()}
            >
              <BrandLockup size="sm" />
            </button>
            <div className="ml-auto flex items-center gap-1">
              <button
                type="button"
                className="hdr-ico"
                aria-label="Friends"
                onClick={() => {
                  setMenuOpen(false);
                  if (session.isPending) return;
                  if (!signedIn) {
                    window.location.href = "/login";
                    return;
                  }
                  setFriendsOpen(true);
                }}
              >
                <FriendsIcon />
              </button>
              <NotifyBell
                signedIn={signedIn}
                posts={store.posts}
                unread={store.notes.filter((n) => n.seen === 0).length}
                onOpenNotes={() => {
                  setScreen("notifications");
                  setMenuOpen(false);
                }}
                onOpenInbox={() => {
                  setScreen("inbox");
                  setMenuOpen(false);
                }}
                onOpenFriends={() => {
                  setMenuOpen(false);
                  setFriendsOpen(true);
                }}
                onOpenPost={(id) => {
                  store.setOpenPost(id);
                  setHomeTab("feeds");
                  setScreen("home");
                }}
              />
              <button
                type="button"
                className="hdr-ico"
                aria-label="Trending"
                onClick={() => {
                  setMenuOpen(false);
                  setMarketDesk(null);
                  store.setOpenPost(null);
                  setScreen("trending");
                }}
              >
                <FlameIcon />
              </button>
              <button
                type="button"
                className="hdr-ico relative"
                aria-label={dmCount > 0 ? `Messages, ${dmCount} new` : "Messages"}
                onClick={() => {
                  setMenuOpen(false);
                  if (session.isPending) return;
                  if (signedIn) setScreen("inbox");
                  else window.location.href = "/login";
                }}
              >
                <MessageIcon />
                {dmCount > 0 ? <span className="msg-badge">{dmCount > 9 ? "9+" : dmCount}</span> : null}
              </button>
            </div>
          </div>
        </div>
        {/* Rooms/Live/Videos folded into Chat & Me — keep tab bar clear on mobile */}
        <div className="kilode-chrome-ticker flex items-center gap-1.5 pr-1.5">
          <div className="ticker-track min-w-0 flex-1 px-3 text-[10px] leading-5 text-muted">
            {[...liveRooms.filter((r) => r.region === "Featured" || r.region === "More rooms").slice(0, 10), ...liveRooms.filter((r) => r.region === "Featured" || r.region === "More rooms").slice(0, 10)].map((r, i) => (
              <button key={r.id + i} type="button" aria-label={`Open room ${r.name}`} className="shrink-0 hover:text-fg" onClick={() => goHome(r.id)}>
                {r.name}
              </button>
            ))}
            {store.campaigns
              .filter((c) => c.status === "approved")
              .flatMap((c) => [c, c])
              .map((c, i) => (
                <button
                  key={c.id + "ad" + i}
                  type="button"
                  className="ad-chip"
                  onClick={() => {
                    if (c.link) window.location.href = c.link;
                    else setHomeTab("advert");
                  }}
                >
                  {c.image ? <img src={c.image} alt="" /> : <i>{(c.name || "A").slice(0, 1)}</i>}
                  {c.name}
                </button>
              ))}
          </div>
          <button type="button" className="ads-mini" onClick={() => { setScreen("home"); setHomeTab("advert"); }}>
            Ads
          </button>
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
                  onKeyDown={(e) => {
                    if (e.key !== "Enter") return;
                    const n = feedQ.trim().toLowerCase();
                    if (n.length < 2) return;
                    const hit = store.posts.find((p) => {
                      if (!p?.id || p.status === "draft") return false;
                      const blob = `${p.title} ${p.excerpt || ""} ${p.category || ""} ${p.tags || ""} ${postBodyPlain(p.body || "")}`.toLowerCase();
                      return blob.includes(n);
                    });
                    if (hit) store.setOpenPost(hit.id);
                  }}
                  placeholder="Search feeds"
                  className="min-h-11 flex-1 rounded-md border border-line bg-panel px-2 text-base"
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
                aria-label="Post news"
                title="Post news"
                className="news-plus"
                onClick={() => {
                  if (session.isPending) return;
                  if (!signedIn) {
                    window.location.href = "/login?mode=up";
                    return;
                  }
                  queueNewsPost();
                  setScreen("create");
                }}
              >
                <Plus className="size-4" strokeWidth={2.75} />
              </button>
            </div>
          ) : homeTab === "music" && canKind(store.kind, "music.submit") && signedIn ? (
            <div className="flex shrink-0 justify-end gap-1 border-b border-line px-2 py-0.5">
              <button type="button" className="btn-3d rounded-md px-2.5 py-0.5 text-[10px] font-semibold" onClick={() => setScreen("create")}>
                Add track
              </button>
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
                <FeedPane
                  store={store}
                  q={feedQ}
                  onDesk={setMarketDesk}
                  onLeave={(where) => {
                    if (where === "trending") setScreen("trending");
                    else if (where === "music") setHomeTab("music");
                    else if (where === "cinema") setHomeTab("cinema");
                    else if (where === "jobs") setScreen("jobs");
                    else if (where === "sports") setMarketDesk("sports");
                    else if (where === "tech") setMarketDesk("tech");
                  }}
                />
              ) : homeTab === "socials" ? (
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 dock-pad">
                  <SocialsFeed authed={store.authed || !!session.user} account={store.kind} me={store.handle} />
                </div>
              ) : homeTab === "music" ? (
                <MusicPane store={store} onAdd={() => (store.authed || session.user ? setScreen("create") : (window.location.href = "/login"))} />
              ) : homeTab === "cinema" ? (
                <EventsPane />
              ) : homeTab === "watch" ? (
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
              <div className="flex shrink-0 items-center gap-1.5 border-b border-white/5 bg-panel px-2 py-1">
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-1.5">
                    <span className="truncate text-[12px] font-extrabold leading-none text-fg">{room.name}</span>
                    <span className="shrink-0 text-[9px] font-bold leading-none text-lime-2">{store.online.length} online</span>
                    <span className="hidden min-w-0 truncate text-[9px] leading-none text-muted sm:inline">· {store.handle || "guest"}</span>
                  </div>
                </div>
                <ThreadTranslateBar
                  items={store.msgs.map((m) => ({ key: String(m.ts), text: m.t }))}
                  onTranslated={setChatXlate}
                />
                <ForumClock label={purge === "kept" ? "kept" : purge} onOpen={() => setForumWhy(true)} />
                <button
                  type="button"
                  aria-label="Older messages"
                  disabled={!store.hasOlder}
                  onClick={() => store.olderChat()}
                  className={`grid size-6 place-items-center rounded-md border text-sm ${store.hasOlder ? "border-line text-fg" : "border-white/5 text-muted/40"}`}
                >
                  <ChevronLeft className="size-3" />
                </button>
                <button
                  type="button"
                  aria-label="Newer messages"
                  disabled={!store.hasNewer}
                  onClick={() => store.newerChat()}
                  className={`grid size-6 place-items-center rounded-md border text-sm ${store.hasNewer ? "border-line text-fg" : "border-white/5 text-muted/40"}`}
                >
                  <ChevronRight className="size-3" />
                </button>
                <button type="button" onClick={() => setRoomsOpen(true)} className="btn-3d rounded-full px-2 py-0.5 text-[9px] md:hidden">
                  Rooms
                </button>
                <button type="button" onClick={store.pinRoom} className="btn-3d rounded-full px-2 py-0.5 text-[9px]">
                  Pin
                </button>
              </div>
              <div className="flex shrink-0 items-center gap-1.5 overflow-x-auto border-b border-white/5 px-2 py-1">
                <span className="size-1.5 shrink-0 animate-pulse rounded-full bg-lime-2" aria-hidden />
                {store.online.slice(0, 12).map((u) => (
                  <span key={u.handle} className="inline-flex shrink-0 items-center gap-1 rounded-full border border-line bg-panel-2 py-0.5 pr-1.5 pl-0.5" title={u.handle}>
                    <AvatarImg handle={u.handle} size={14} />
                    <span className="max-w-[64px] truncate text-[9px]" style={{ color: handleColor(u.handle) }}>{u.handle}</span>
                  </span>
                ))}
                {store.online.length === 0 ? <span className="text-[9px] text-muted">Be first in this room</span> : null}
                {store.typing.filter((n) => n !== store.handle).length ? (
                  <span className="ml-1 shrink-0 text-[9px] text-lime-2">
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
              <div className="relative flex min-h-0 flex-1 flex-col">
              <div
                ref={scroller}
                className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain pb-3"
                onScroll={() => {
                  const el = scroller.current;
                  if (!el) return;
                  const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 64;
                  stickBottom.current = atBottom;
                  if (atBottom) setNewCount(0);
                }}
              >
                <div className="mt-auto flex flex-col gap-1.5 px-2 py-2 sm:px-3">
                {store.msgsLoading && store.msgs.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-line/80 bg-panel/40 px-3 py-4 text-center text-[11px] text-muted">
                    Loading this room…
                  </p>
                ) : store.msgs.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-line/80 bg-panel/40 px-3 py-4 text-center text-[11px] text-muted">
                    No messages in this room yet.
                    <br />
                    <span className="text-[10px]">Each room keeps its own chat.</span>
                    {!signedIn ? (
                      <>
                        <br />
                        <Link to="/login" search={{}} className="mt-1.5 inline-block text-[11px] font-semibold text-lime-2 underline">
                          Sign in to start the thread
                        </Link>
                      </>
                    ) : (
                      <>
                        <br />
                        <span className="text-[10px]">Say something to start the thread.</span>
                      </>
                    )}
                  </p>
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
                      <div key={row.key} className="flex flex-col gap-1.5">
                        <button
                          type="button"
                          className="text-[11px] font-semibold text-fg"
                          onClick={() => setOpenFolds((m) => ({ ...m, [row.key]: !open }))}
                        >
                          {open ? "Hide" : `${row.n} more from ${row.author}`}
                        </button>
                        {open
                          ? row.hidden.map((m) => (
                          <ChatLine key={m.ts + m.n} m={m} handle={store.handle} live={store.online.some((u) => u.handle.toLowerCase() === m.n.toLowerCase())} xlate={chatXlate[String(m.ts)]} onReact={store.react} onReply={(msg) => { setReplyTo(msg); inputRef.current?.focus(); }} onDelete={store.dropMsg} />
                            ))
                          : null}
                      </div>
                    );
                  }
                  return <ChatLine key={row.key} m={row.m} handle={store.handle} live={store.online.some((u) => u.handle.toLowerCase() === row.m.n.toLowerCase())} xlate={chatXlate[String(row.m.ts)]} onReact={store.react} onReply={(msg) => { setReplyTo(msg); inputRef.current?.focus(); }} onDelete={store.dropMsg} />;
                })}
                </div>
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
              {store.livePausedUntil > Date.now() ? (
                <div className="shrink-0 border-t border-line bg-panel px-3 py-2 text-center text-[12px] font-semibold text-muted">
                  {store.livePausedReason || "Chat is on a short break — back soon."}
                </div>
              ) : null}
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
                className="chat-compose relative z-30 flex shrink-0 flex-wrap gap-2 border-t border-white/10 bg-[#101010] p-2 backdrop-blur-md mb-[calc(4.85rem+env(safe-area-inset-bottom))]"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (store.livePausedUntil > Date.now()) return;
                  if (!session.user) {
                    window.location.href = "/login";
                    return;
                  }
                  if (!chatOk) {
                    setForumWhy(true);
                    return;
                  }
                  const text = draft;
                  if (!text.trim()) return;
                  const parentTs = replyTo?.ts;
                  // Clear immediately on optimistic send so typed text does not linger.
                  setDraft("");
                  setReplyTo(null);
                  setEmojiOpen(false);
                  stickBottom.current = true;
                  setNewCount(0);
                  store.bumpPresence(false);
                  inputRef.current?.focus();
                  requestAnimationFrame(() => {
                    const el = scroller.current;
                    if (el) el.scrollTop = el.scrollHeight;
                  });
                  void store.send(text, parentTs).then((ok) => {
                    if (!ok) {
                      // Restore draft if server rejected / failed.
                      setDraft(text);
                      return;
                    }
                  });
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
                  <div className="flex w-full gap-1 overflow-x-auto pb-1">
                    {EMOJIS.map((e) => (
                      <button key={e} type="button" className="grid size-9 shrink-0 place-items-center text-lg" onClick={() => setDraft((d) => d + e)}>
                        {e}
                      </button>
                    ))}
                  </div>
                ) : null}
                {signedIn ? (
                  <button type="button" className="btn-3d grid size-11 place-items-center rounded-full" onClick={() => setEmojiOpen((o) => !o)} aria-label="Emoji">
                    <Smile className="size-4 text-lime-2" />
                  </button>
                ) : null}
                <input
                  ref={inputRef}
                  value={draft}
                  onChange={(e) => {
                    if (!signedIn) return;
                    setDraft(e.target.value);
                    store.clearChatErr();
                    store.bumpPresence(true);
                  }}
                  readOnly={!signedIn || store.livePausedUntil > Date.now()}
                  disabled={store.livePausedUntil > Date.now()}
                  placeholder={
                    store.livePausedUntil > Date.now()
                      ? "Chat is on a short break"
                      : signedIn
                        ? "Message + emoji"
                        : "Sign in to chat"
                  }
                  data-chat-input="1"
                  className="min-h-11 flex-1 rounded-full border border-line bg-panel-3 px-4 text-base outline-none"
                />
                {store.livePausedUntil > Date.now() ? (
                  <span className="inline-flex min-h-11 shrink-0 items-center rounded-full border border-line px-3.5 text-xs font-bold text-muted">
                    On a break
                  </span>
                ) : signedIn ? (
                  <button type="submit" className="btn-yellow inline-flex min-h-11 shrink-0 items-center justify-center gap-1 rounded-full px-3.5 text-xs font-bold text-black">
                    <Send className="size-3.5" />
                    Send
                  </button>
                ) : session.isPending ? (
                  <span className="inline-flex min-h-11 shrink-0 items-center rounded-full border border-line px-3.5 text-xs font-bold text-muted">
                    Opening
                  </span>
                ) : (
                  <Link to="/login" search={{}} className="btn-yellow inline-flex min-h-11 shrink-0 items-center justify-center gap-1 rounded-full px-3.5 text-xs font-bold text-black">
                    Sign in
                  </Link>
                )}
              </form>
              {store.chatErr ? (
                <p className="shrink-0 px-3 pb-2 text-[11px] text-danger">
                  {store.chatErr}{" "}
                  {/sign in/i.test(store.chatErr) ? (
                    <Link to="/login" search={{}} className="font-semibold underline">
                      Sign in
                    </Link>
                  ) : null}
                </p>
              ) : null}
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
                    ? "Kilode set chat to never expire."
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
      {signedIn && !session.user?.isDevFallback && (store.onboarded === 0 || (forceOnboard && store.onboarded !== 1)) ? (
        <OnboardSheet
          kind={store.kind}
          onDone={async (d) => {
            const r = await store.finishOnboard(d);
            if (r.ok) {
              try {
                sessionStorage.removeItem("kilode-force-onboard");
              } catch {
                /* ignore */
              }
              setForceOnboard(false);
            }
            return r;
          }}
        />
      ) : null}
      <nav className="dock pointer-events-auto z-40">
        <Tab icon={<Home className="size-5" />} label="Home" on={screen === "home" && homeTab === "feeds" && !marketDesk} onClick={() => { setMenuOpen(false); setScreen("home"); setHomeTab("feeds"); setMarketDesk(null); store.setOpenPost(null); }} />
        <Tab icon={<Search className="size-5" />} label="Explore" on={screen === "home" && homeTab === "socials"} onClick={() => { setMenuOpen(false); openSocialFellows(); setScreen("home"); setHomeTab("socials"); setMarketDesk(null); store.setOpenPost(null); }} />
        <button
          type="button"
          className="dock-plus"
          aria-label={signedIn ? createLabelFor(store.kind) : "Create"}
          title={signedIn ? createLabelFor(store.kind) : "Create"}
          onClick={() => {
            setMenuOpen(false);
            if (session.isPending) return;
            if (!signedIn) {
              window.location.href = "/login?mode=up";
              return;
            }
            openRoleCreate();
            setScreen("create");
          }}
        >
          <Plus className="size-6" strokeWidth={2.75} />
        </button>
        <Tab icon={<MessageSquare className="size-5" />} label="Chat" on={screen === "home" && homeTab === "chat"} onClick={() => { setMenuOpen(false); setScreen("home"); setHomeTab("chat"); }} />
        <Tab
          icon={
            signedIn ? (
              <AvatarImg handle={store.handle || "me"} face={store.face} size={22} className="ring-1 ring-white" />
            ) : (
              <User className="size-5" />
            )
          }
          label="Profile"
          on={screen === "dashboard" || screen === "profile"}
          onClick={() => {
            setMenuOpen(false);
            if (session.isPending) return;
            if (signedIn) setScreen("dashboard");
            else window.location.href = "/login";
          }}
        />
      </nav>

      {roomsOpen ? (
        <div className="app-drawer rooms-drawer">
          <aside className="menu-sheet flex h-full min-h-0 w-[min(360px,92vw)] flex-col overflow-hidden">
            <RoomList query={query} setQuery={setQuery} listed={listed} roomId={store.roomId} pins={store.pins} onOpen={goHome} onClose={() => setRoomsOpen(false)} />
          </aside>
          <button type="button" className="min-h-0 flex-1 bg-black/50" aria-label="Close rooms" onClick={() => setRoomsOpen(false)} />
        </div>
      ) : null}

      {liveOpen ? (
        <div className="app-drawer md:hidden">
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

      {friendsOpen ? <FriendsSheet onClose={() => setFriendsOpen(false)} /> : null}

      {menuOpen ? (
        <div className="app-drawer menu-drawer">
          <aside className="menu-sheet flex h-full w-[min(320px,92vw)] flex-col">
            <div className="menu-head flex items-center gap-3">
              <AvatarImg handle={store.handle || "Guest"} face={store.face} size={48} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-extrabold tracking-tight">{session.user ? store.handle || "Member" : "Guest"}</div>
                <div className="text-[10px] tracking-normal text-lime-2">
                  {session.user ? ACCOUNT_KINDS.find((k) => k.id === store.kind)?.label ?? "Member" : "Browse free · join to post"}
                </div>
              </div>
              <button type="button" onClick={() => setMenuOpen(false)} aria-label="Close">
                <X className="size-4" />
              </button>
              <SkinToggle />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-3 pb-5">
              <div className="menu-hero-card mb-4">
                <div className="grid grid-cols-3 gap-2">
                {(signedIn
                  ? [
                      store.kind === "artist"
                        ? { n: store.tracks.filter((t) => !!t?.id && (t.author === store.handle || t.artist === store.handle)).length, l: "Tracks" }
                        : store.kind === "advertiser" || store.kind === "brand"
                          ? { n: store.campaigns.filter((c) => c.status !== "rejected").length, l: "Ads" }
                          : store.kind === "writer"
                            ? { n: store.posts.filter((p) => !!p?.id && p.author === store.handle && p.status !== "draft").length, l: "Stories" }
                            : { n: store.posts.filter((p) => !!p?.id && p.author === store.handle).length, l: store.kind === "member" ? "Posts" : "Yours" },
                      { n: store.pins.length, l: "Rooms" },
                      { n: store.savedPosts.length, l: "Saved" },
                    ]
                  : [
                      { n: 0, l: "Posts" },
                      { n: 0, l: "Rooms" },
                      { n: 0, l: "Saved" },
                    ]
                ).map((s) => (
                  <div key={s.l} className="menu-press rounded-xl px-2 py-2.5 text-center">
                    <div className="text-sm font-bold text-fg">{s.n}</div>
                    <div className="text-[9px] text-muted">{s.l}</div>
                  </div>
                ))}
                </div>

              <div className="mt-3">
                <div className="mb-2 text-[10px] font-medium tracking-normal text-muted">Quick</div>
                <div className="grid grid-cols-2 gap-2">
                  {(signedIn
                    ? [
                        ...(canCreateMenu(store.kind)
                          ? [{ id: "create" as MenuId, label: createLabelFor(store.kind), tab: null as null | "chat" }]
                          : []),
                        ...(canKind(store.kind, "ads.submit") ? [{ id: "ads" as MenuId, label: "Place ad", tab: null as null | "chat" }] : []),
                        { id: "inbox" as MenuId, label: "Messages", tab: null as null | "chat" },
                        { id: "home" as MenuId, label: "Chat rooms", tab: "chat" as const },
                      ]
                    : [
                        { id: "create" as MenuId, label: "New post", tab: null as null | "chat" },
                        { id: "inbox" as MenuId, label: "Messages", tab: null as null | "chat" },
                        { id: "home" as MenuId, label: "Chat rooms", tab: "chat" as const },
                      ]
                  ).map((q) => {
                    const Icon = ICONS[q.id === "home" ? "forum" : q.id] ?? MessageSquare;
                    return (
                      <button
                        key={q.label}
                        type="button"
                        className="menu-press flex items-center gap-2 rounded-xl px-2.5 py-2.5 text-left"
                        onClick={() => {
                          if (!signedIn && q.id !== "home") {
                            window.location.href = q.id === "inbox" ? "/login" : "/login?mode=up";
                            return;
                          }
                          if (q.tab) {
                            setScreen("home");
                            setHomeTab(q.tab);
                          } else if (q.id === "home") goHome();
                          else setScreen(q.id);
                          setMenuOpen(false);
                        }}
                      >
                        <Icon className="size-4 shrink-0 text-fg" />
                        <span className="text-[12px] font-semibold">{q.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              </div>

              <DrawerGroup label="Kilode">
                <DrawerRow icon={Briefcase} label="Jobs" hint="Roles and applications" onClick={() => { setScreen("jobs"); setMenuOpen(false); }} on={screen === "jobs"} />
                <DrawerRow icon={Home} label="Feeds" hint="News for Nigeria" onClick={() => { store.setOpenPost(null); setMarketDesk(null); setScreen("home"); setHomeTab("feeds"); setMenuOpen(false); }} on={homeTab === "feeds" && screen === "home" && !marketDesk} />
                <DrawerRow icon={MessageSquare} label="Chat" hint="Live rooms · topics & places" onClick={() => { setScreen("home"); setHomeTab("chat"); setMenuOpen(false); }} on={homeTab === "chat" && screen === "home"} />
                <DrawerRow icon={Radio} label="Music" hint="Opens the artist's platform" onClick={() => { setScreen("home"); setHomeTab("music"); setMenuOpen(false); }} on={homeTab === "music" && screen === "home"} />
                <DrawerRow icon={Globe} label="Socials" hint="Takes, fellows, gists" onClick={() => { setScreen("home"); setHomeTab("socials"); setMarketDesk(null); setMenuOpen(false); }} on={homeTab === "socials" && screen === "home"} />
                <DrawerRow icon={Film} label="Events" hint="What's on, RSVP" onClick={() => { setScreen("home"); setHomeTab("cinema"); setMenuOpen(false); }} on={homeTab === "cinema" && screen === "home"} />
                <DrawerRow icon={Play} label="Cinema" hint="Watch and vote. Not on the bottom bar." onClick={() => { setScreen("home"); setHomeTab("watch"); setMenuOpen(false); }} on={homeTab === "watch" && screen === "home"} />
                <DrawerRow icon={Tv} label="Kilode TV" hint="Socials · follow in one place" onClick={() => { setScreen("tv"); setMenuOpen(false); }} on={screen === "tv"} />
                {videosMenuVisible ? (
                  <DrawerRow icon={Play} label="Videos" hint="Clips on Kilode" onClick={() => { setScreen("home"); setHomeTab("videos"); setMenuOpen(false); }} on={homeTab === "videos" && screen === "home"} />
                ) : null}
                <DrawerRow icon={Megaphone} label="Ads" hint="Live brand campaigns" onClick={() => { setScreen("home"); setHomeTab("advert"); setMenuOpen(false); }} on={homeTab === "advert" && screen === "home"} />
                <DrawerRow icon={Download} label="Downloads" hint="Kilode products · buy with email" onClick={() => { setScreen("home"); setHomeTab("downloads"); setMenuOpen(false); }} on={homeTab === "downloads" && screen === "home"} />
              </DrawerGroup>

              {!signedIn ? (
                <div className="mb-4">
                  <MenuPremiumAd />
                </div>
              ) : null}

              <DrawerGroup label="Desks">
                <DrawerRow icon={LineChart} label="Stocks" hint="Indices, movers, charts" onClick={() => { setScreen("home"); setHomeTab("feeds"); setMarketDesk("stocks"); setMenuOpen(false); }} on={marketDesk === "stocks"} />
                <DrawerRow icon={Coins} label="Crypto" hint="Coins, dominance, heat" onClick={() => { setScreen("home"); setHomeTab("feeds"); setMarketDesk("crypto"); setMenuOpen(false); }} on={marketDesk === "crypto"} />
                <DrawerRow icon={Banknote} label="Forex" hint="Naira and crosses" onClick={() => { setScreen("home"); setHomeTab("feeds"); setMarketDesk("forex"); setMenuOpen(false); }} on={marketDesk === "forex"} />
                <DrawerRow icon={Trophy} label="Sports" hint="Live scores and upcoming" onClick={() => { setScreen("home"); setHomeTab("feeds"); setMarketDesk("sports"); setMenuOpen(false); }} on={marketDesk === "sports"} />
                <DrawerRow icon={CloudSun} label="Weather" hint="World sky, Lagos first" onClick={() => { setScreen("home"); setHomeTab("feeds"); setMarketDesk("weather"); setMenuOpen(false); }} on={marketDesk === "weather"} />
                <DrawerRow icon={Cpu} label="Tech" hint="Front page and engineering" onClick={() => { setScreen("home"); setHomeTab("feeds"); setMarketDesk("tech"); setMenuOpen(false); }} on={marketDesk === "tech"} />
              </DrawerGroup>

              <DrawerGroup label="Listings">
                <DrawerRow icon={Store} label="My Spaces" hint="Your business page" onClick={() => { setScreen("spaces"); setMenuOpen(false); }} on={screen === "spaces"} />
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
                        if (id === "create") return canCreateMenu(store.kind);
                        if (id === "ads") return canKind(store.kind, "ads.submit");
                        return true;
                      })
                      .map((id) => {
                      const Icon = ICONS[id];
                      const label =
                        id === "create"
                          ? createLabelFor(store.kind)
                          : (MENU.find((m) => m[0] === id)?.[1] ?? id);
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
                <DrawerRow icon={Play} label="How Kilode works" hint="The page, not a popup" onClick={() => { setScreen("how"); setMenuOpen(false); }} on={screen === "how"} />
                <DrawerRow icon={HelpCircle} label="Help & FAQ" hint="Terms, safety, how to use" onClick={() => { setScreen("help"); setMenuOpen(false); }} on={screen === "help"} />
                <DrawerRow icon={Mail} label="Contact" hint="Talk to Kilode" onClick={() => { setScreen("contact"); setMenuOpen(false); }} on={screen === "contact"} />
                {signedIn ? <DrawerRow icon={Settings} label="Settings" onClick={() => { setScreen("settings"); setMenuOpen(false); }} on={screen === "settings"} /> : null}
              </DrawerGroup>
            </div>
            <MenuPin />
            <MemberTicker />
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
              autoComplete="username"
              className="mb-1.5 w-full rounded-lg border border-line bg-black/40 px-3 py-2 text-base outline-none"
            />
            <div className="relative mb-1.5">
              <input
                type={joinShowPass ? "text" : "password"}
                value={joinPass}
                onChange={(e) => setJoinPass(e.target.value)}
                placeholder="Password (8+ characters)"
                autoComplete="current-password"
                className="w-full rounded-lg border border-line bg-black/40 py-2 pl-3 pr-11 text-base outline-none"
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-1.5 py-0.5 text-[18px] leading-none text-muted"
                aria-label={joinShowPass ? "Hide password" : "Show password"}
                onClick={() => setJoinShowPass((v) => !v)}
              >
                {joinShowPass ? "🙈" : "👁️"}
              </button>
            </div>
            {joinErr ? <p className="mb-1.5 text-sm text-danger">{joinErr}</p> : null}
            {store.authErr ? <p className="mb-1.5 text-sm text-danger">{store.authErr}</p> : null}
            <div className="mb-1.5">
              {/* One picker per Join open — kinds from uniqueAccountKinds(). */}
              <AccountKindPicker
                key="join-account-kind"
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
            <div className="mb-2 space-y-1.5 rounded-lg border border-line px-2 py-1.5">
              <label className="flex items-start gap-2 text-[10px] leading-snug text-muted">
                <input type="checkbox" className="mt-0.5" checked={joinAgree} onChange={(e) => setJoinAgree(e.target.checked)} />
                <span>
                  I agree to the{" "}
                  <a href="/terms" className="font-semibold text-lime-2 underline" target="_blank" rel="noreferrer">
                    Terms
                  </a>
                  .
                </span>
              </label>
              <label className="flex items-start gap-2 text-[10px] leading-snug text-muted">
                <input type="checkbox" className="mt-0.5" checked={joinAgreeRules} onChange={(e) => setJoinAgreeRules(e.target.checked)} />
                <span>
                  I accept the{" "}
                  <a href="/rules" className="font-semibold text-lime-2 underline" target="_blank" rel="noreferrer">
                    Rules
                  </a>
                  . I am 15 or older and responsible for what I submit.
                </span>
              </label>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={joinBusy}
                className="btn-join flex-1 rounded-lg py-2 text-sm font-bold disabled:opacity-60"
                onClick={() => {
                  void (async () => {
                    setJoinErr("");
                    if (!joinAgree || !joinAgreeRules) {
                      setJoinErr("Tick both boxes. Read the Terms and the Rules first.");
                      return;
                    }
                    setJoinBusy(true);
                    try {
                      const r = await kilodeSignUp(joinName, joinPass, joinKind, joinFace);
                      if (!r.ok) setJoinErr(r.reason);
                      else window.location.reload();
                    } catch (e: unknown) {
                      setJoinErr(e instanceof Error ? e.message : "Sign up failed. Try again.");
                    } finally {
                      setJoinBusy(false);
                    }
                  })();
                }}
              >
                {joinBusy ? "Working…" : "Register"}
              </button>
              <button
                type="button"
                disabled={joinBusy}
                className="flex-1 rounded-lg border border-line py-2 text-sm disabled:opacity-60"
                onClick={() => {
                  void (async () => {
                    setJoinErr("");
                    setJoinBusy(true);
                    try {
                      const r = await kilodeSignIn(joinName, joinPass);
                      if (!r.ok) setJoinErr(r.reason);
                      else window.location.reload();
                    } catch (e: unknown) {
                      setJoinErr(e instanceof Error ? e.message : "Sign in failed. Try again.");
                    } finally {
                      setJoinBusy(false);
                    }
                  })();
                }}
              >
                {joinBusy ? "Working…" : "Sign in"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function FriendsSheet({ onClose }: { onClose: () => void }) {
  const [rows, setRows] = useState<ConnectRow[]>([]);
  const [live, setLive] = useState<string[]>([]);
  const [err, setErr] = useState("");
  const [note, setNote] = useState("");
  const [chat, setChat] = useState("");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  useEffect(() => {
    void listConnects()
      .then(setRows)
      .catch(() => setErr("Could not load friends."));
    void listLive().then(setLive).catch(() => setLive([]));
  }, []);
  const incoming = rows.filter((r) => r.dir === "in");
  const outgoing = rows.filter((r) => r.dir === "out");
  const friends = rows.filter((r) => r.dir === "friend");
  function act(id: string, accept: boolean) {
    setErr("");
    void replyConnect({ data: { id, accept } })
      .then((r) => {
        if (!r.ok) {
          setErr(r.reason || "Could not update.");
          return;
        }
        setNote(accept ? "Accepted. They are in Friends." : "Request removed.");
        return listConnects();
      })
      .then((next) => {
        if (next) setRows(next);
      })
      .catch(() => setErr("Could not update that request."));
  }
  function drop(id: string) {
    void disconnectFellow({ data: { id } }).then((r) => {
      if (!r.ok) {
        setErr(r.reason || "Could not update.");
        return;
      }
      setRows((list) => list.filter((row) => row.id !== id));
    });
  }
  function message(handle: string) {
    setChat(handle);
    setDraft("");
    setNote("");
  }
  function send() {
    const text = draft.trim();
    if (!chat || !text || sending) return;
    setSending(true);
    void sendDm({ data: { to: chat, body: text } })
      .then((r) => {
        if (r.ok) {
          setDraft("");
          setNote(`Sent to @${chat}.`);
          setChat("");
        } else setNote(r.reason);
      })
      .catch(() => setNote("Could not send. Try once more."))
      .finally(() => setSending(false));
  }
  return (
    <div className="app-drawer friends-drawer">
      <aside className="menu-sheet flex h-full w-[min(340px,92vw)] flex-col">
        <div className="menu-head flex items-center justify-between">
          <strong>Friends</strong>
          <button type="button" className="grid size-8 place-items-center rounded-full border border-white/25" aria-label="Close friends" onClick={onClose}>
            <X className="size-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3">
          {err ? <p className="text-[12px] text-danger">{err}</p> : null}
          {note ? <p className="text-[12px] text-muted">{note}</p> : null}
          <FriendBlock title="Requests" empty="No requests." rows={incoming} live={live} onAccept={(id) => act(id, true)} onDecline={(id) => act(id, false)} />
          <FriendBlock title="Friends" empty="Connect with someone on Socials." rows={friends} live={live} onMessage={message} onDisconnect={drop} active={chat} />
          <FriendBlock title="Sent" empty="No pending asks." rows={outgoing} live={live} onDisconnect={drop} onWait={() => setNote("They have to accept before you can message.")} />
        </div>
        {chat ? (
          <form
            className="shrink-0 border-t border-white/15 p-3"
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
          >
            <div className="mb-1 flex items-center justify-between text-[11px]">
              <span>Message @{chat}</span>
              <button type="button" className="text-muted" onClick={() => setChat("")}>Close</button>
            </div>
            <div className="flex gap-1.5">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                maxLength={500}
                placeholder="Write a message"
                className="min-w-0 flex-1 rounded-[10px] border border-white/20 bg-black px-2 py-1.5 text-[13px] text-white outline-none"
                style={{ fontSize: 16 }}
              />
              <button type="submit" disabled={sending} className="rounded-full border border-white/30 px-3 text-[11px] font-bold text-white disabled:opacity-50">
                {sending ? "…" : "Send"}
              </button>
            </div>
          </form>
        ) : null}
      </aside>
      <button type="button" className="flex-1 bg-black/60" aria-label="Close friends" onClick={onClose} />
    </div>
  );
}

function FriendBlock({
  title,
  empty,
  rows,
  live,
  onAccept,
  onDecline,
  onMessage,
  onDisconnect,
  onWait,
  active,
}: {
  title: string;
  empty: string;
  rows: ConnectRow[];
  live: string[];
  onAccept?: (id: string) => void;
  onDecline?: (id: string) => void;
  onMessage?: (handle: string) => void;
  onDisconnect?: (id: string) => void;
  onWait?: () => void;
  active?: string;
}) {
  return (
    <section>
      <div className="mb-1.5 text-[10px] font-semibold tracking-[0.14em] text-white/50 uppercase">{title}</div>
      {rows.length === 0 ? <p className="text-[12px] text-muted">{empty}</p> : null}
      <div className="space-y-1.5">
        {rows.map((r) => {
          const on = live.includes(r.handle.toLowerCase());
          return (
          <div key={r.dir + r.id} className={`rounded-xl ${active === r.handle ? "bg-white/5" : ""}`}>
          <div className="menu-row flex items-center gap-2 rounded-xl px-2.5 py-2">
            <button
              type="button"
              className="flex min-w-0 flex-1 items-center gap-2 text-left"
              onClick={() => (onMessage ? onMessage(r.handle) : onWait?.())}
            >
              <span className="relative shrink-0">
                <AvatarImg handle={r.handle} size={32} />
                {on ? <span className="live-dot absolute -top-0.5 -right-0.5 ring-2 ring-[#121412]" title="Online" /> : null}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-semibold">@{r.handle}</span>
                <span className="block truncate text-[10px] text-muted">{r.role}{on ? " · online" : ""}</span>
              </span>
            </button>
            {onMessage ? (
              <button type="button" className="shrink-0 rounded-full border border-white/30 px-2 py-1 text-[10px] font-bold text-white" onClick={() => onMessage(r.handle)}>
                Message
              </button>
            ) : null}
            {onDisconnect ? (
              <button type="button" className="rounded-full border border-white/25 px-2 py-1 text-[10px] font-semibold text-white" onClick={() => onDisconnect(r.id)}>
                {onMessage ? "Disconnect" : "Cancel"}
              </button>
            ) : null}
            <ReportMenu handle={r.handle} signedIn />
            {onAccept ? (
              <button type="button" className="menu-press rounded-full px-2.5 py-1 text-[10px] font-bold" onClick={() => onAccept(r.id)}>
                Accept
              </button>
            ) : null}
            {onDecline ? (
              <button type="button" className="rounded-full border border-white/25 px-2 py-1 text-[10px] font-semibold text-white" onClick={() => onDecline(r.id)}>
                No
              </button>
            ) : null}
          </div>
          {active === r.handle && onMessage ? (
            <form
              className="flex gap-1 px-2 pb-2"
              onSubmit={(e) => {
                e.preventDefault();
                const input = e.currentTarget.elements.namedItem("body") as HTMLInputElement;
                const text = input.value.trim();
                if (!text) return;
                void sendDm({ data: { to: r.handle, body: text } }).then(() => {
                  input.value = "";
                });
              }}
            >
              <input name="body" maxLength={500} placeholder={`Message @${r.handle}`} className="min-w-0 flex-1 rounded-[10px] border border-white/20 bg-black px-2 py-1.5 text-[13px] text-white outline-none" style={{ fontSize: 16 }} />
              <button type="submit" className="rounded-full bg-white px-3 text-[11px] font-bold text-black">Send</button>
            </form>
          ) : null}
          </div>
          );
        })}
      </div>
    </section>
  );
}

function FlameIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-[18px]" aria-hidden>
      <path
        fill="currentColor"
        d="M12.1 1.4c.35 2.15-.85 3.55-1.9 5.15-1.15 1.75-2.15 3.15-2.15 5.7 0 3.35 2.45 5.85 5.7 5.85 3.15 0 5.7-2.4 5.7-5.75 0-2.05-.75-3.35-1.85-4.85-.55 1.55-1.7 2.25-2.7 2.05.55-1.7.15-3.4-.4-5.05C13.7 3.35 12.7 2.15 12.1 1.4z"
      />
      <path
        fill="#0a0c0b"
        d="M12.35 9.05c.85 1.35 1.05 2.45.45 3.55-.45.85-1.25.95-1.55.15-.45-1.15.15-2.45.95-3.85.05.05.1.1.15.15z"
      />
    </svg>
  );
}

function FriendsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-[18px]" aria-hidden>
      <circle cx="8.6" cy="8.2" r="2.15" fill="currentColor" />
      <circle cx="15.3" cy="8.7" r="1.75" fill="currentColor" />
      <path d="M4.4 17.4c.45-2.45 2.25-3.7 4.25-3.7s3.8 1.25 4.25 3.7" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M13.1 14.15c1.15-.45 2.45-.3 3.4.45 1 .8 1.45 2.05 1.55 2.85" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function MessageIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-[18px]" aria-hidden>
      <path
        d="M5 6.2h14a1.6 1.6 0 0 1 1.6 1.6v6.6a1.6 1.6 0 0 1-1.6 1.6H9.2L5.6 19.2v-3.2H5A1.6 1.6 0 0 1 3.4 14.4V7.8A1.6 1.6 0 0 1 5 6.2z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
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
      setSkin("night");
      document.documentElement.setAttribute("data-skin", "night");
    }
  }, []);
  const light = skin === "ivory";
  return (
    <button
      type="button"
      className="skin-pill"
      aria-pressed={light}
      aria-label={light ? "Use dark skin" : "Use light skin"}
      onClick={() => {
        const next = light ? "night" : "ivory";
        setSkin(next);
        document.documentElement.setAttribute("data-skin", next);
        try {
          localStorage.setItem("kilode-skin-v2", next);
        } catch {
          /* ignore */
        }
      }}
    >
      {light ? <Moon className="size-3.5" /> : <Sun className="size-3.5" />}
      {light ? "Dark" : "Light"}
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
    <button type="button" onClick={onClick} className={`app-tab pointer-events-auto flex h-full min-h-12 w-full flex-col items-center justify-center gap-0.5 px-0.5 text-[8px] font-semibold leading-none ${on ? "on" : ""}`}>
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
  post: { id: string; title: string; slug?: string; excerpt?: string; author?: string; category?: string };
  handle: string;
  cap: string;
  onCap: (v: string) => void;
  onSend: () => void;
  onClose: () => void;
}) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/50 p-3 sm:place-items-center" onClick={onClose}>
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-line bg-panel p-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 text-lime-2">
          <Repeat2 className="size-4" />
          <span className="text-[11px] font-bold tracking-[0.14em]">REPOST</span>
        </div>
        <p className="mt-2 line-clamp-3 text-[14px] font-semibold leading-snug">{post.title}</p>
        <p className="mt-1 text-[11px] text-muted">Chat shows “{handle || "You"} reposted” in the room you are in. Socials posts it on your profile.</p>
        <textarea value={cap} onChange={(e) => onCap(e.target.value)} placeholder="Add a caption (optional)" className="mt-3 min-h-20 w-full rounded-lg border border-line bg-bg px-3 py-2 text-base" />
        {note ? <p className="mt-2 text-[12px] font-semibold text-danger">{note}</p> : null}
        <div className="mt-3 flex gap-2">
          <button type="button" className="btn-join flex-1 rounded-lg py-2 text-[12px] font-bold" onClick={onSend}>
            Send to chat
          </button>
          <button
            type="button"
            disabled={busy}
            className="flex-1 rounded-lg border border-lime-2/50 py-2 text-[12px] font-bold text-lime-2 disabled:opacity-60"
            onClick={() => {
              setBusy(true);
              setNote("");
              void shareNewsToSocials({ title: post.title, excerpt: post.excerpt, author: post.author, category: post.category, caption: cap, href: `/p/${encodeURIComponent(post.slug || post.id)}` })
                .then((r) => {
                  if (!r.ok) setNote(r.reason);
                  else {
                    onClose();
                    window.dispatchEvent(new Event("kilode:socials"));
                  }
                })
                .catch((e) => {
                  const m = e instanceof Error ? e.message : "";
                  if (/unauthor|sign in|forbidden/i.test(m)) window.location.href = "/login?mode=up";
                  else setNote("Could not post to Socials.");
                })
                .finally(() => setBusy(false));
            }}
          >
            {busy ? "Sending" : "Post to Socials"}
          </button>
        </div>
        <button type="button" className="mt-2 w-full rounded-lg border border-line py-2 text-[12px]" onClick={onClose}>
          Cancel
        </button>
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
      <span className="menu-ico grid size-8 shrink-0 place-items-center rounded-lg">
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className="block truncate font-semibold">{label}</span>
        {hint ? <span className="block truncate text-[10px] font-normal text-muted">{hint}</span> : null}
      </span>
      <ChevronRight className="size-3.5 shrink-0 text-muted" />
    </>
  );
  const cls = `menu-row flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left text-sm ${on ? "on" : ""}`;
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

type ArtistCard = {
  name: string;
  cover?: string;
  genre?: string;
  role: string;
  tracks: { title: string; url: string; cover?: string }[];
};

const ARTIST_ROLES = ["Lead", "Feature", "Chart", "New"];

function collectArtists(tracks: { id?: string; artist?: string; title?: string; url?: string; cover?: string; genre?: string }[]): ArtistCard[] {
  const map = new Map<string, ArtistCard>();
  for (const t of tracks) {
    if (!t?.id || !t.artist) continue;
    let row = map.get(t.artist);
    if (!row) {
      row = { name: t.artist, cover: t.cover, genre: t.genre, role: "Artist", tracks: [] };
      map.set(t.artist, row);
    }
    if (!row.cover && t.cover) row.cover = t.cover;
    if (!row.genre && t.genre) row.genre = t.genre;
    if (t.title && t.url && !row.tracks.some((x) => x.title === t.title)) row.tracks.push({ title: t.title, url: t.url, cover: t.cover });
  }
  return [...map.values()].map((a, i) => ({ ...a, role: ARTIST_ROLES[i % ARTIST_ROLES.length] || "Artist" }));
}

function ArtistStage({ artist, onClose }: { artist: ArtistCard; onClose: () => void }) {
  let host = "their platform";
  try {
    host = new URL(artist.tracks[0]?.url || "https://music.apple.com").hostname.replace(/^www\./, "");
  } catch {
    /* keep fallback */
  }
  return (
    <div className="artist-stage" role="dialog" aria-label={`${artist.name} profile`}>
      <button type="button" className="mb-3 inline-flex items-center gap-1 text-[13px] font-semibold" onClick={onClose}>
        <ChevronLeft className="size-4" />
        Back
      </button>
      <div className="artist-hero">
        <span className="artist-hero-face">{artist.cover ? <img src={artist.cover} alt="" /> : artist.name.slice(0, 1)}</span>
        <div className="min-w-0">
          <div className="text-[10px] font-bold tracking-[0.16em] text-[#FACC15]">{artist.role.toUpperCase()}</div>
          <h2 className="truncate text-2xl font-extrabold tracking-tight">{artist.name}</h2>
          <p className="mt-1 text-[12px] font-semibold text-fg">Kilode Artist · verified</p>
          <p className="text-[11px] text-muted">{artist.genre || "Music"} · {host}</p>
        </div>
      </div>
      <p className="mt-4 text-[13px] leading-relaxed text-fg/80">
        {artist.name} has a Kilode artist profile. Songs do not play inside the app. Each release opens their own platform so the artist keeps the stream, the link, and the audience.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {artist.tracks[0]?.url ? (
          <a className="btn-yellow rounded-full px-3 py-2 text-[12px] font-extrabold text-black" href={artist.tracks[0].url} target="_blank" rel="noreferrer">
            Open platform
          </a>
        ) : null}
        <span className="rounded-full border border-white/15 px-3 py-2 text-[12px] text-fg/80">{artist.tracks.length} linked releases</span>
      </div>
      <h3 className="mt-5 text-[11px] font-bold tracking-[0.14em] text-muted">RELEASES</h3>
      <ul className="mt-2 space-y-2">
        {artist.tracks.map((t) => (
          <li key={t.title}>
            <a href={t.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 p-2">
              {t.cover ? <img src={t.cover} alt="" className="size-12 rounded-full object-cover" /> : <span className="grid size-12 place-items-center rounded-full bg-black text-xs">!</span>}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{t.title}</span>
                <span className="text-[11px] text-muted">Listen on their platform</span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

function MusicPane({ store, onAdd }: { store: ReturnType<typeof useQonvo>; onAdd: () => void }) {
  const [q, setQ] = useState("");
  const [genre, setGenre] = useState<(typeof MUSIC_GENRES)[number]>("All");
  const [page, setPage] = useState(0);
  const [artist, setArtist] = useState<ArtistCard | null>(null);

  const artists = useMemo(() => {
    const s = q.trim().toLowerCase();
    const pool = store.tracks.filter((t) => {
      if (!t?.id) return false;
      if (genre !== "All" && (t.genre || "Afrobeats") !== genre) return false;
      if (!s) return true;
      return `${t.artist} ${t.title} ${t.genre ?? ""}`.toLowerCase().includes(s);
    });
    return collectArtists(pool);
  }, [store.tracks, q, genre]);

  const pages = Math.max(1, Math.ceil(artists.length / 4));
  const safePage = Math.min(page, pages - 1);
  const shown = artists.slice(safePage * 4, safePage * 4 + 4);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center gap-2 border-b border-white/5 px-2 py-1.5">
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(0);
          }}
          placeholder="Search songs, artists, genres"
          className="min-h-11 flex-1 rounded-lg border border-line bg-panel px-3 text-base outline-none"
          aria-label="Search songs, artists, genres"
        />
      </div>

      <div className="flex shrink-0 flex-nowrap gap-1.5 overflow-x-auto overscroll-x-contain border-b border-line px-3 py-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {MUSIC_GENRES.map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => {
              setGenre(g);
              setPage(0);
            }}
            className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-bold tracking-wide ${genre === g ? "btn-yellow text-black" : "border border-line bg-panel-2 text-fg/80"}`}
          >
            {g}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 dock-pad">
        {artist ? (
          <ArtistStage artist={artist} onClose={() => setArtist(null)} />
        ) : (
        <>
        <section className="mb-3">
          <div className="mb-1.5 flex items-center justify-between">
            <div className="text-[11px] font-bold">Browse</div>
            <button type="button" className="text-[11px] font-semibold text-fg" onClick={onAdd}>
              Add a link
            </button>
          </div>
          <div className="flex gap-2 overflow-x-auto overscroll-x-contain pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {MUSIC_RAILS.map((r) => (
              <button
                key={r.id}
                type="button"
                className="music-rail w-[132px] shrink-0 overflow-hidden rounded-xl text-left"
                style={{ ["--rail" as string]: r.color }}
                onClick={() => {
                  const genreFor: Record<string, (typeof MUSIC_GENRES)[number]> = {
                    made: "Afrobeats",
                    charts: "All",
                    new: "All",
                    mood: "R&B",
                    party: "Afrobeats",
                    focus: "Jazz",
                    gospel: "Gospel",
                    throwback: "Highlife",
                  };
                  setGenre(genreFor[r.id] ?? "All");
                  setPage(0);
                }}
              >
                <div className="p-2.5">
                  <div className="text-[11px] font-bold leading-tight text-fg">{r.title}</div>
                  <div className="mt-1 text-[9px] text-muted">{r.subtitle}</div>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-[11px] font-bold tracking-wide">Artists</h3>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-muted">{artists.length ? safePage + 1 : 0}/{pages}</span>
              <button type="button" className="round-arrow" aria-label="Previous artists" onClick={() => setPage((n) => (n - 1 + pages) % pages)}>
                <ChevronLeft className="size-3.5" />
              </button>
              <button type="button" className="round-arrow" aria-label="Next artists" onClick={() => setPage((n) => (n + 1) % pages)}>
                <ChevronRight className="size-3.5" />
              </button>
            </div>
          </div>
          {shown.length === 0 ? <EmptyHero title="No artists match" body="Try another name, or add a track link from Create." cta="Add a link" onClick={onAdd} /> : null}
          <div className="artist-grid">
            {shown.map((a) => (
              <button key={a.name} type="button" className="artist-orb" onClick={() => setArtist(a)}>
                <span className="artist-orb-face">{a.cover ? <img src={a.cover} alt="" /> : a.name.slice(0, 1)}</span>
                <strong>{a.name}</strong>
                <em>{a.role}</em>
              </button>
            ))}
          </div>
        </section>
        </>
        )}
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
  const [seen, setSeen] = useState<{ handle: string; ts: number }[]>([]);
  const [seenOpen, setSeenOpen] = useState(false);
  const [dropping, setDropping] = useState(false);
  const [fullBody, setFullBody] = useState(post.body || "");
  useEffect(() => {
    setFullBody(post.body || "");
    void getPublicPost({ data: post.slug || post.id })
      .then((row) => {
        if (row?.body) setFullBody(row.body);
      })
      .catch(() => undefined);
  }, [post.id, post.slug, post.body]);
  const mine = Boolean(store.handle && post.author && store.handle.toLowerCase() === post.author.toLowerCase());
  const comments = post.comments ?? [];
  const roots = comments.filter((c) => !c.parentTs);
  const kids = (ts: number) => comments.filter((c) => c.parentTs === ts);
  useEffect(() => {
    store.see("posts", post.id);
    if (session.user) void notePostSeen({ data: post.id }).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post.id, session.user?.id]);
  const mins = Math.max(1, Math.round(postBodyPlain(fullBody || "").split(/\s+/).filter(Boolean).length / 180));
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
    <article className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto dock-pad">
      <div className="mx-auto min-w-0 max-w-3xl overflow-x-hidden break-words px-4 py-4 [overflow-wrap:anywhere]">
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
              <AvatarImg handle={post.author} size={28} />
              <span className="font-semibold tracking-wide text-muted">POSTED BY</span>
              <HandleLink handle={post.author} className="text-[13px] font-bold" />
              <span>· {timeLabel(post.ts)}</span>
              <span>· {mins} min read</span>
              {mine ? (
                <button
                  type="button"
                  disabled={dropping}
                  className="font-bold text-danger disabled:opacity-50"
                  onClick={() => {
                    if (!window.confirm("Delete this story from Feeds?")) return;
                    setDropping(true);
                    void deleteOwnPost({ data: post.id })
                      .then((r) => {
                        if (r.ok) store.setOpenPost(null);
                        else setNote(r.reason);
                      })
                      .catch(() => setNote("Could not delete."))
                      .finally(() => setDropping(false));
                  }}
                >
                  Delete
                </button>
              ) : null}
              {mine ? (
                <button
                  type="button"
                  className="font-bold text-lime-2"
                  onClick={() => {
                    setSeenOpen((v) => !v);
                    if (!seenOpen) void listPostSeen({ data: post.id }).then(setSeen).catch(() => setSeen([]));
                  }}
                >
                  Who saw this
                </button>
              ) : null}
            </div>
            {seenOpen && mine ? (
              <p className="mt-1 text-[11px] text-muted">
                {seen.length === 0 ? "No signed-in readers yet. Only you can see this list." : seen.map((s) => `@${s.handle}`).join(" · ")}
              </p>
            ) : null}
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
        <PostBody body={fullBody || ""} />
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
              className="min-h-10 flex-1 rounded-lg border border-line bg-panel px-3 text-base"
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
            <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Report this post" className="min-h-10 flex-1 rounded-lg border border-line bg-panel px-3 text-base" />
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
      <BrandLockup />
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


const FEED_LANES: [string, string][] = [
  ["foryou", "For you"],
  ["latest", "Latest"],
  ["following", "Following"],
  ["entertainment", "Entertainment"],
  ["music", "Music"],
  ["nollywood", "Nollywood"],
  ["trending", "Trending"],
  ["sports", "Sports"],
  ["politics", "Politics"],
  ["tech", "Tech & Biz"],
  ["lifestyle", "Lifestyle"],
  ["comedy", "Comedy"],
  ["gossip", "Gossip"],
  ["events", "Events"],
  ["community", "Community"],
  ["naija", "Naija Pulse"],
  ["afrobeats", "Afrobeats"],
  ["jobs", "Jobs"],
];

const LANE_MATCH: Record<string, string[]> = {
  entertainment: ["Culture", "Comedy", "Music", "Fashion"],
  music: ["Music"],
  afrobeats: ["Music"],
  nollywood: ["Culture"],
  trending: ["News", "Naija", "Politics"],
  sports: ["Sports"],
  politics: ["Politics"],
  tech: ["Tech", "Business"],
  lifestyle: ["Lifestyle", "Fashion", "Food", "Travel", "Health"],
  comedy: ["Comedy"],
  gossip: ["Culture", "Opinion"],
  events: ["General"],
  community: ["Opinion", "General"],
  naija: ["Naija", "News"],
  jobs: ["Jobs"],
};

function DeskLine({
  onLane,
  onLeave,
  onDesk,
}: {
  onLane: (lane: string) => void;
  onLeave: (where: "trending" | "music" | "cinema" | "jobs" | "sports" | "tech") => void;
  onDesk: (d: MarketDesk) => void;
}) {
  const items = [
    { id: "trending", label: "Trending", Icon: Flame, go: () => onLeave("trending") },
    { id: "naija", label: "Naija", Icon: Globe, go: () => onLane("naija") },
    { id: "music", label: "Music", Icon: Music, go: () => onLeave("music") },
    { id: "cinema", label: "Cinema", Icon: Film, go: () => onLeave("cinema") },
    { id: "jobs", label: "Jobs", Icon: Briefcase, go: () => onLeave("jobs") },
    { id: "techbiz", label: "Tech & Biz", Icon: Cpu, go: () => onLeave("tech") },
    ...DESKS.filter((d) => d.id !== "sports" && d.id !== "tech").map((d) => ({
      id: d.id,
      label: d.label,
      Icon: d.Icon,
      go: () => onDesk(d.id),
    })),
  ];
  return (
    <div className="desk-line mb-3">
      {items.map((item) => (
        <button key={item.id} type="button" className="svc-ico" onClick={item.go}>
          <item.Icon className="size-[18px]" strokeWidth={1.75} />
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  );
}

function MembersRail({ onOpen }: { onOpen: (handle: string) => void }) {
  const [rows, setRows] = useState<{ id: string; handle: string; title: string; image: string }[]>([]);
  useEffect(() => {
    let dead = false;
    void listTakes()
      .then((pack) => {
        if (dead) return;
        const takes = [...(pack.takes || [])];
        for (let i = takes.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          const a = takes[i];
          takes[i] = takes[j];
          takes[j] = a;
        }
        const seen = new Set<string>();
        const next: { id: string; handle: string; title: string; image: string }[] = [];
        for (const t of takes) {
          const handle = (t.handle || "").trim();
          const key = handle.toLowerCase();
          if (!handle || !t.body || seen.has(key)) continue;
          seen.add(key);
          next.push({
            id: t.id,
            handle,
            title: t.body.replace(/\s+/g, " ").slice(0, 72),
            image: pack.faces?.[key] || avatarUrl(handle),
          });
          if (next.length >= 12) break;
        }
        if (!next.length) {
          for (const f of pack.fellows || []) {
            if (!f.handle) continue;
            next.push({ id: f.id, handle: f.handle, title: f.line || f.role || "Member", image: f.photo || avatarUrl(f.handle) });
          }
        }
        setRows(next);
      })
      .catch(() => {
        if (!dead) setRows([]);
      });
    return () => {
      dead = true;
    };
  }, []);
  if (!rows.length) return null;
  const loop = [...rows, ...rows];
  return (
    <div className="member-tick">
      <span>Members</span>
      <div>
        {loop.map((p, i) => (
          <button key={p.id + i} type="button" onClick={() => onOpen(p.handle)}>
            <img src={p.image} alt="" />
            <em>@{p.handle}</em>
            <strong>{p.title}</strong>
          </button>
        ))}
      </div>
    </div>
  );
}

function MemberTicker() {
  return <MembersRail onOpen={(handle) => { window.location.href = `/u/${encodeURIComponent(handle)}`; }} />;
}

function PulseStrip({ posts }: { posts: { category?: string; views?: number }[] }) {
  const counts = new Map<string, number>();
  for (const p of posts) {
    const c = p.category || "General";
    counts.set(c, (counts.get(c) ?? 0) + (p.views ?? 0) + 1);
  }
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  if (!top.length) return null;
  const max = top[0][1] || 1;
  return (
    <section className="pulse-card mb-3">
      <div className="mb-2 flex items-center gap-1.5">
        <svg viewBox="0 0 16 16" className="size-3.5 text-lime-2" aria-hidden>
          <path d="M2 12 6.1 7.6 8.5 9.8 14 3.4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          <path d="M10.2 3.4H14v3.6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
        <div className="pulse-kicker text-[10px] font-semibold tracking-[0.14em]">TRENDING IN YOUR FEED</div>
      </div>
      {top.map(([name, n], i) => (
        <div key={name} className="pulse-row">
          <span>{name}</span>
          <b><i className={i === 0 ? "lead" : ""} style={{ width: `${Math.max(18, Math.round((n / max) * 100))}%` }} /></b>
          <em>{n} posts</em>
        </div>
      ))}
    </section>
  );
}

function FeedPane({ store, q = "", onDesk, onLeave }: { store: ReturnType<typeof useQonvo>; q?: string; onDesk: (d: MarketDesk) => void; onLeave: (where: "trending" | "music" | "cinema" | "jobs" | "sports" | "tech") => void }) {
  const [cat, setCat] = useState("All");
  const [shown, setShown] = useState(48);
  const [catsOpen, setCatsOpen] = useState(false);
  const [repost, setRepost] = useState<(typeof store.posts)[number] | null>(null);
  const [cap, setCap] = useState("");
  const [lane, setLane] = useState("latest");
  const [follows, setFollows] = useState<string[] | null>(null);
  useEffect(() => {
    if (lane !== "following" || follows) return;
    void listConnects()
      .then((rows) => setFollows(rows.filter((r) => r.dir === "friend").map((r) => r.handle.toLowerCase())))
      .catch(() => setFollows([]));
  }, [lane, follows]);
  const open = store.posts.find((p) => p.id === store.openPost);
  const needle = q.trim().toLowerCase();
  const live = store.posts
    .filter(
      (p) =>
        !!p?.id &&
        p.status !== "draft" &&
        (cat === "All" || p.category === cat) &&
        (lane === "foryou" || lane === "latest" || lane === "following" || (LANE_MATCH[lane] || []).includes(p.category || "General")) &&
        (!needle ||
          `${p.title} ${p.excerpt || ""} ${p.category || ""} ${p.tags || ""} ${postBodyPlain(p.body || "")}`.toLowerCase().includes(needle)),
    )
    .sort((a, b) => {
      if (lane === "latest") return b.ts - a.ts;
      const words = (store.interests || "").toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2);
      const score = (p: (typeof store.posts)[number]) => {
        const blob = `${p.category || ""} ${p.tags || ""} ${p.title || ""}`.toLowerCase();
        const hit = words.reduce((n, w) => n + (blob.includes(w) ? 4 : 0), 0);
        return hit + Math.log10((p.views ?? 0) + 1) + (p.comments?.length ?? 0);
      };
      return score(b) - score(a);
    })
    .filter((p) => lane !== "following" || (follows ? follows.includes((p.author || "").toLowerCase()) : false));
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
              const extra = cap.trim();
              const path = `/p/${encodeURIComponent(repost.slug || repost.id)}`;
              store.send(`reposted: ${repost.title}${extra ? `\n${extra}` : ""}\n${path}`);
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
        {needle ? (
          <p className="mb-2 text-[12px] text-muted">{live.length} stories for “{q.trim()}”. Press enter to open the first.</p>
        ) : (
          <>
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
            <DeskLine onLane={setLane} onLeave={onLeave} onDesk={onDesk} />
            <PulseStrip posts={store.posts.filter((p) => p.status !== "draft")} />
          </>
        )}
        <div className="mb-2">
          <div className="lane-rail" role="tablist" aria-label="Feeds">
            {FEED_LANES.map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={lane === id}
                className={`lane-chip ${lane === id ? "on" : ""}`}
                onClick={() => {
                  setLane(id);
                  setShown(48);
                }}
              >
                {label}
              </button>
            ))}
          </div>
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
          {lane === "following" && follows && live.length === 0 ? (
            <p className="col-span-4 py-6 text-center text-[12px] text-muted">Connect with people on Socials. Their posts show here. Nothing is invented.</p>
          ) : null}
          {live.filter((p) => !!p?.id).slice(0, shown).map((p) => {
            const hot = (p.views ?? 0) >= 350 || (p.comments?.length ?? 0) >= 6;
            return (
            <div key={p.id} role="button" tabIndex={0} data-feed-card="1" className="glass-3d overflow-hidden text-left" onClick={() => store.setOpenPost(p.id)} onKeyDown={(e) => { if (e.key === "Enter") store.setOpenPost(p.id); }}>
              <div className="relative">
                {p.image ? <img src={p.image} alt="" referrerPolicy="no-referrer" className="aspect-[4/3] w-full object-cover" /> : <div className="aspect-[4/3] bg-panel-3" />}
                {hot ? (
                  <span className="absolute top-1 left-1 grid size-5 place-items-center rounded-full bg-black/55 text-lime-2" title="Trending">
                    <svg viewBox="0 0 16 16" className="size-3" aria-hidden>
                      <path d="M2 12 6.1 7.6 8.5 9.8 14 3.4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M10.2 3.4H14v3.6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                ) : null}
                <button
                  type="button"
                  aria-label="Repost"
                  className="absolute top-1 right-1 grid size-5 place-items-center rounded-full bg-black/55 text-fg"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!store.authed) {
                      window.location.href = "/login?mode=up";
                      return;
                    }
                    setRepost(p);
                    setCap("");
                  }}
                >
                  <Repeat2 className="size-3" />
                </button>
              </div>
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
            </div>
            );
          })}
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
        ) : null}
        {repost ? (
          <RepostModal
            post={repost}
            handle={store.handle}
            cap={cap}
            onCap={setCap}
            onClose={() => setRepost(null)}
            onSend={() => {
              const extra = cap.trim();
              const path = `/p/${encodeURIComponent(repost.slug || repost.id)}`;
              store.send(`reposted: ${repost.title}${extra ? `\n${extra}` : ""}\n${path}`);
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

function parseRepost(text: string): { title: string; lines: string[] } | null {
  const raw = text || "";
  const lines = raw.split("\n");
  const head = lines[0] || "";
  const m = head.match(/^(?:(.+?)\s+)?reposted:\s*(.*)$/i);
  if (!m) return null;
  const title = (m[2] || "").trim();
  return { title, lines: lines.slice(1) };
}

function ChatLine({
  m,
  handle,
  live,
  xlate,
  onReact,
  onReply,
  onDelete,
}: {
  m: ChatMsg;
  handle: string;
  live?: boolean;
  xlate?: string;
  onReact: (ts: number, kind: "up" | "fire") => void;
  onReply: (m: ChatMsg) => void;
  onDelete?: (ts: number) => void;
}) {
  const mine = Boolean(handle && m.n === handle);
  const repost = parseRepost(m.t || "");
  return (
    <div
      className={`chat-bubble rounded-xl border px-2.5 py-1.5 ${
        mine
          ? "chat-bubble-mine border-lime-2/35 bg-lime-2/[0.07]"
          : "border-line bg-panel"
      }`}
    >
      {m.parentN && m.parentT ? (
        <button type="button" className="mb-1 block w-full truncate rounded-md border border-line border-l-2 border-l-lime-2/50 bg-panel-2 px-2 py-1 text-left text-[11px] text-fg" onClick={() => onReply(m)}>
          <span style={{ color: handleColor(m.parentN) }}>{m.parentN}</span> · {m.parentT}
        </button>
      ) : null}
      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
        <AvatarImg handle={m.n} size={18} />
        <HandleLink handle={m.n} live={live} className="text-[11px] font-semibold" />
        {repost ? (
          <>
            <span className="text-[11px] text-muted">·</span>
            <span className="inline-flex items-center gap-1 text-[11px] text-muted">
              <Repeat2 className="size-3 text-lime-2/80" aria-hidden />
              reposted
            </span>
          </>
        ) : null}
        <span className="text-[11px] text-muted">{timeLabel(m.ts)}</span>
        {mine ? <span className="text-[11px] font-semibold text-lime-2">you</span> : null}
        {mine && onDelete ? (
          <button type="button" className="ml-auto text-[11px] font-bold text-muted" onClick={() => onDelete(m.ts)}>
            Delete
          </button>
        ) : null}
      </div>
      <div className="mt-0.5 text-[12px] leading-snug text-fg">
        {repost ? (
          <span>
            {repost.title ? <span className="font-medium text-fg/90">{repost.title}</span> : null}
            {repost.lines.map((line, i) =>
              line.trim() ? (
                <span key={i} className="mt-1 block text-[12px] text-fg/80">
                  <LinkText text={line} />
                </span>
              ) : null,
            )}
          </span>
        ) : (
          mentionParts(m.t, handle).map((p, i) =>
            p.on ? (
              <span key={i} className="rounded-sm bg-lime-2/15 px-0.5 font-semibold text-lime-2">
                {p.t}
              </span>
            ) : (
              <span key={i}>
                <LinkText text={p.t} />
              </span>
            ),
          )
        )}
      </div>
      <TranslatedLine text={xlate} />
      <div className="mt-1 flex gap-3">
        <button
          type="button"
          className="text-[11px] text-muted"
          onClick={(e) => {
            e.preventDefault();
            onReact(m.ts, "up");
          }}
        >
          + {m.rx?.up ?? 0}
        </button>
        <button
          type="button"
          className="text-[11px] text-muted"
          onClick={(e) => {
            e.preventDefault();
            onReact(m.ts, "fire");
          }}
        >
          🔥 {m.rx?.fire ?? 0}
        </button>
        <button type="button" className="text-[11px] font-semibold text-fg" onClick={() => onReply(m)}>
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
