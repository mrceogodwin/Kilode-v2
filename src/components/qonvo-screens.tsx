import { Component, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { STAFF_PATH } from "@/lib/staff-path";
import { Eye, Mail, MessageSquare, Share2, Bookmark, Search as SearchIcon, Newspaper, Users, Zap, Image as ImageIcon, Music, Clapperboard, Briefcase, Store, Download, Building2, Inbox as InboxIcon } from "lucide-react";
import { AD_COINS, AD_DAYS, AD_KINDS, AD_PLACEMENTS, AD_SIZES, ACCOUNT_KINDS, CHAT_TTLS, COMMUNITIES, KIND_FACE, KIND_PURPOSE, POST_CATS, REGIONS, ROOMS, chatTtlLabel, fmtCount, handleColor, parseMusicUrl, roomName, safeHttpUrl, slugify, timeAgo, timeLabel, timeLeftLabel, youtubeId, type AccountKind, type AdKind, type AdPlacement, type MenuId, type Post } from "@/lib/qonvo-data";
import type { useQonvo } from "@/lib/use-qonvo";
import { approveTeamAsk, getProfile, leaveTeam, postTeamNote, reportPost, requestJoinTeam, teamDesk } from "@/lib/forum-server";
import { claimOps, clearModUser, deleteGist, deletePost, dismissReport, assignReport, getModSettings, hidePost, listAdsQueue, listMail, listMembers, listModHits, listModUsers, listReports, listSocialDesk, listStaff, listStaffPosts, listVerifyQueue, removeStaff, resetUserPassword, saveChatTtl, saveModSettings, saveWallet, deleteWallet, setAccountKind, setModHitStatus, setModUser, setStaffRole, setVerified, scoreMembers, staffMe, unhidePost } from "@/lib/staff-server";
import {
  approveNewsDraft,
  fetchNewsLatest,
  listNewsDrafts,
  listNewsSources,
  newsEngineInfo,
  publishNewsWeek,
  rejectNewsDraft,
  setNewsSourceEnabled,
  updateNewsDraft,
  type NewsDraft,
  type NewsSource,
} from "@/lib/news-engine-server";
import { listWallets, getChatTtl } from "@/lib/forum-server";
import { LEGAL_PAGES } from "@/lib/legal";
import { readBag, writeBag } from "@/components/socials-feed";
import { listAdCatalog } from "@/lib/ad-catalog-server";
import { listPayMethods } from "@/lib/pay-gateways";
import { GatewayPay, DeskPayBox } from "@/components/pay-checkout";
import type { PayProvider } from "@/lib/pay-money";
import { dbStatus } from "@/lib/register-server";
import { listInbox, listNotes, sendDm } from "@/lib/social-server";
import { uploadCvFile } from "@/lib/supabase";
import { creativeFits, runEnd, slotCharge } from "@/lib/board-rules";
import { searchPeople, searchTakes, suggestFollows } from "@/lib/takes-server";
import { authClient, signOut } from "@/lib/auth/client";
import { AvatarImg, AvatarPicker } from "@/components/account-kind";
import { canKind, createSheetTitle } from "@/lib/permissions";
import { CinemaAdminPanel } from "@/components/cinema-pane";
import { EventsAdminPanel } from "@/components/events-pane";
import { ListingsAdminPanel, ListingsPane } from "@/components/listings-pane";
import { ShopAdminPanel } from "@/components/downloads-pane";
import { SocialsAdminPanel, TvPane } from "@/components/tv-pane";
import { JoinCta } from "@/components/get-app";
import { usePublicSite } from "@/components/site-chrome";
import { getPublicSite, saveSiteFlags } from "@/lib/site-server";
import { MeDashboard } from "@/components/me-dashboard";
import { AdCatalogPanel, AdSlotsPanel, LivePausePanel, OpsKeysPanel, OpsSeoPanel, PaywaysPanel, RoomsAdminPanel } from "@/components/ops-tools";
import { SiteFlagsPanel } from "@/components/site-chrome";
import { matchAdPayments, matchOneAd } from "@/lib/pay-match-server";
import { applyListing, listExploreGrid, listListings, saveListing, type ExploreTile, type Listing } from "@/lib/listings-server";
import { submitMovie } from "@/lib/cinema-server";
import { DEFAULT_MOD, type ModSettings } from "@/lib/moderator";
import { SitePulsePanel } from "@/components/pulse-panel";
import { HowKilodePage } from "@/components/how-kilode";
import { TrendingPane } from "@/components/trending-pane";
import { SpacesPane } from "@/components/spaces-pane";
import { listPublicSpaces, listSpaceDesk, parkSpace, type SpaceCard } from "@/lib/spaces-server";
import { PostRichEditor } from "@/components/post-rich-editor";
import { postBodyPlain, sanitizePostHtml } from "@/lib/post-body";

type Store = ReturnType<typeof useQonvo>;

class PaneGuard extends Component<{ name: string; children: ReactNode }, { message: string }> {
  state = { message: "" };
  static getDerivedStateFromError(err: unknown) {
    return { message: err instanceof Error ? err.message : "This section failed." };
  }
  render() {
    if (!this.state.message) return this.props.children;
    return (
      <div className="m-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
        <p className="text-sm font-semibold">This section hit a snag</p>
        <p className="mt-1 text-xs text-muted">{this.state.message}</p>
        <button type="button" className="mt-3 rounded-full border border-white/20 px-3 py-1.5 text-xs" onClick={() => this.setState({ message: "" })}>
          Try again
        </button>
      </div>
    );
  }
}

export function QonvoScreen({
  id,
  store,
  onHome,
  onForum,
}: {
  id: MenuId;
  store: Store;
  onHome: (roomId?: string) => void;
  onForum?: () => void;
}) {
  let view: React.ReactNode = null;
  if (id === "forum") view = <Forum store={store} onHome={onHome} />;
  else if (id === "create") view = store.handle ? <Create store={store} onForum={onForum} /> : <JoinWall />;
  else if (id === "community") view = <Communities onHome={onHome} />;
  else if (id === "search") view = <Search store={store} onHome={onHome} />;
  else if (id === "profile") view = <Profile store={store} onHome={onHome} />;
  else if (id === "bookmarks") view = store.handle ? <Bookmarks store={store} onHome={onHome} /> : <JoinWall />;
  else if (id === "notifications") view = store.handle ? <Notes store={store} /> : <JoinWall />;
  else if (id === "inbox") view = store.handle ? <Inbox /> : <JoinWall />;
  else if (id === "settings") view = store.handle ? <Settings store={store} /> : <JoinWall />;
  else if (id === "teams") view = <Teams store={store} onHome={onHome} />;
  else if (id === "badges") view = <Badges store={store} />;
  else if (id === "leaderboard") view = <Board store={store} />;
  else if (id === "ads") view = <Ads store={store} />;
  else if (id === "jobs") view = <ListingsPane kind="job" />;
  else if (id === "market") view = <ListingsPane kind="market" />;
  else if (id === "rent") view = <ListingsPane kind="rent" />;
  else if (id === "help") view = <Help />;
  else if (id === "how") view = <HowKilodePage />;
  else if (id === "pricing") view = <PricingPage />;
  else if (id === "dashboard")
    view = (
      <MeDashboard
        store={store}
        onForum={onForum}
        onLogout={async () => {
          // 1) Clear Kilode UI immediately (handle + local flags) → Me Join / GuestDash.
          store.logout();
          // 2) Best-effort server clear with hard timeout inside signOut(); always finish UI.
          try {
            await signOut("/");
          } catch (err) {
            const msg =
              err instanceof Error
                ? err.message
                : "Sign-out timed out — you may still be signed in. Hard refresh and try again.";
            store.note(msg);
            // Stay on GuestDash; do not leave the button spinning.
          }
        }}
      />
    );
  else if (id === "trending") view = <TrendingPane store={store} onHome={onHome} />;
  else if (id === "spaces") view = <SpacesPane />;
  else if (id === "tv") view = <TvPane />;
  else if (id === "contact") view = <Contact store={store} />;
  else if (id === "admin") view = <Admin store={store} />;
  return (
    <PaneGuard key={id} name={id}>
      <div className={`h-full overflow-y-auto dock-pad md:pb-4${id === "dashboard" ? " space-page" : ""}`}>{view}</div>
    </PaneGuard>
  );
}

function PricingPage() {
  const [rates, setRates] = useState<{ verifyUsd: number; eventUsd: number } | null>(null);
  useEffect(() => {
    void listPayMethods()
      .then((r) => setRates({ verifyUsd: r.verifyUsd, eventUsd: r.eventUsd }))
      .catch(() => undefined);
  }, []);
  const plans = [
    { name: "Member", price: "Free", note: "Post, chat, apply, and browse. No card.", href: "/login?mode=up", cta: "Join" },
    { name: "Verified", price: rates ? `$${rates.verifyUsd}` : "Set in Super admin", note: "Paid badge. Staff still approve it. Change the number in Super admin → Verification fee.", href: "/?open=me", cta: "Get verified" },
    { name: "Event", price: rates ? `$${rates.eventUsd}` : "Set in Super admin", note: "A listed event. Pay, then it goes to the queue. Change it under Event listing fee.", href: "/?tab=cinema", cta: "List an event" },
    { name: "Ad placement", price: "You set it", note: "Pick a slot and days. Paystack, Flutterwave, or crypto. It goes live when the payment confirms.", href: "/advertise", cta: "Place an ad" },
  ];
  return (
    <div className="price-page mx-auto max-w-lg px-4 py-5">
      <p className="text-[10px] font-bold tracking-[0.2em] text-[#E4B53A]">KILODE</p>
      <h1 className="mt-1 font-[Syne,sans-serif] text-3xl font-extrabold tracking-tight">Pricing</h1>
      <p className="mt-2 text-[13px] leading-snug text-muted">Four ways in. Pay only when you want a badge, an event, or an ad. The buttons open the real desk, not a fake checkout.</p>
      <div className="mt-4 grid gap-2">
        {plans.map((p) => (
          <a key={p.name} href={p.href} className="price-card">
            <div className="flex items-baseline justify-between gap-2">
              <b>{p.name}</b>
              <span>{p.price}</span>
            </div>
            <p>{p.note}</p>
            <em>{p.cta}</em>
          </a>
        ))}
      </div>
    </div>
  );
}

function JoinWall() {
  return (
    <Screen kicker="KILODE" title="Join to continue" sub="Guests can browse Feeds, Chat, Music, Cinema and Ads. Sign in to post, message, save, or open Me.">
      <JoinCta />
    </Screen>
  );
}

function Card({ title, body, children }: { title: string; body?: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-panel p-3">
      <div className="font-semibold">{title}</div>
      {body ? <p className="mt-1 whitespace-pre-wrap text-sm text-muted">{body}</p> : null}
      {children}
    </div>
  );
}

function Screen({ kicker, title, sub, children, className = "" }: { kicker: string; title: string; sub?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`mx-auto max-w-2xl p-4 pb-20 ${className}`}>
      <div className="mb-4">
        <div className="text-[10px] font-bold tracking-[0.2em] text-lime-2">{kicker}</div>
        <h2 className="text-2xl font-extrabold tracking-tight">{title}</h2>
        {sub ? <p className="mt-1 text-sm text-muted">{sub}</p> : null}
      </div>
      {children}
    </div>
  );
}

function Forum({ store, onHome }: { store: Store; onHome: (roomId?: string) => void }) {
  const [shown, setShown] = useState(16);
  const live = store.posts.filter((p) => !!p?.id && p.status !== "draft");
  return (
    <div className="mx-auto max-w-5xl p-3 pb-8">
      <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
        {live.slice(0, shown).map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => {
              store.setOpenPost(p.id);
              onHome();
            }}
            className="raised overflow-hidden rounded-md text-left"
          >
            {p.image ? <img src={p.image} alt="" className="aspect-[5/4] w-full object-cover" /> : <div className="aspect-[5/4] bg-panel-3" />}
            <div className="px-1 py-1.5">
              <div className="text-[9px] font-medium text-lime-2/80">{p.category || "General"}</div>
              <div className="mt-0.5 line-clamp-4 text-[10px] font-normal leading-tight sm:text-[11px]">{p.title}</div>
              <div className="mt-0.5 flex items-center gap-1.5 text-[8px] tabular-nums text-muted">
                <span className="inline-flex items-center gap-0.5">
                  <Eye className="size-2.5" />
                  {fmtCount(p.views ?? 0)}
                </span>
                <span className="inline-flex items-center gap-0.5">
                  <MessageSquare className="size-2.5" />
                  {p.comments?.length ?? 0}
                </span>
                <Share2 className="ml-auto size-2.5" />
              </div>
            </div>
          </button>
        ))}
      </div>
      {shown < live.length ? (
        <button type="button" className="btn-join mx-auto mt-3 block rounded-lg px-4 py-2 text-[12px] font-bold" onClick={() => setShown((n) => n + 16)}>
          Load more
        </button>
      ) : null}
    </div>
  );
}

function PostDetail({ post, store }: { post: Post; store: Store }) {
  const [body, setBody] = useState("");
  const [reason, setReason] = useState("");
  return (
    <div className="mx-auto max-w-2xl space-y-3 p-5">
      <button type="button" className="text-xs text-muted" onClick={() => store.setOpenPost(null)}>
        Back to feeds
      </button>
      <Card title={post.title} body={post.body} />
      {post.image ? <img src={post.image} alt="" className="max-h-40 w-40 rounded-xl object-cover" /> : null}
      {post.link ? (
        <a href={post.link} target="_blank" rel="noopener noreferrer" className="text-xs text-lime-2">
          {post.link}
        </a>
      ) : null}
      <p className="text-xs text-muted">
        <span style={{ color: handleColor(post.author) }}>{post.author}</span> · {post.category} · {timeLabel(post.ts)}
        {post.tags ? ` · ${post.tags}` : ""}
      </p>
      {post.comments.map((c) => (
        <Card key={c.ts} title={c.author} body={c.body} />
      ))}
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        placeholder="Comment"
        className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-base"
      />
      <button
        type="button"
        className="rounded-lg border border-line bg-panel-3 px-3 py-2 text-sm"
        onClick={() => {
          store.commentPost(post.id, body);
          setBody("");
        }}
      >
        Comment
      </button>
      <div className="raised space-y-2 rounded-xl p-3">
        <div className="text-[11px] font-medium text-muted">Report</div>
        <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why this post should be reviewed" className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-base" />
        <button
          type="button"
          className="text-xs text-danger"
          onClick={() => {
            if (!reason.trim()) return;
            store.flagPost(post.id, reason);
            setReason("");
          }}
        >
          Send report
        </button>
      </div>
    </div>
  );
}

let queuedCreatePane: "post" | null = null;
/** Feed-bar + : general news post, not the account-type composer. */
export function queueNewsPost() {
  queuedCreatePane = "post";
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("kilode:create", { detail: { pane: "post" } }));
  }
}

export function openRoleCreate() {
  queuedCreatePane = null;
  if (typeof window !== "undefined") window.dispatchEvent(new Event("kilode:create-role"));
}

function Create({ store, onForum }: { store: Store; onForum?: () => void }) {
  const ak = store.kind;
  const canPost = canKind(ak, "feeds.post");
  const canMusic = canKind(ak, "music.submit");
  const canAds = canKind(ak, "ads.submit");
  const canCinema = canKind(ak, "cinema.submit");
  const canJobs = canKind(ak, "jobs.post");
  const canApply = canKind(ak, "jobs.apply");
  const canMarket = canKind(ak, "market.list");
  const canRent = canKind(ak, "rent.list");

  type Pane = "post" | "music" | "ads" | "cinema" | "job" | "apply" | "market" | "rent";
  const primary: Pane =
    ak === "artist" ? "music"
    : ak === "advertiser" || ak === "brand" ? "ads"
    : ak === "cinema" ? "cinema"
    : ak === "job_poster" ? "job"
    : ak === "job_seeker" ? "apply"
    : ak === "vendor" ? "market"
    : ak === "renter" ? "rent"
    : "post";

  const [pane, setPane] = useState<Pane>(primary);
  useEffect(() => {
    if (queuedCreatePane) {
      setPane(queuedCreatePane);
      queuedCreatePane = null;
      return;
    }
    setPane(primary);
  }, [primary]);
  useEffect(() => {
    const onCreate = (e: Event) => {
      const next = (e as CustomEvent<{ pane?: Pane }>).detail?.pane;
      if (next) setPane(next);
    };
    window.addEventListener("kilode:create", onCreate);
    const onRole = () => {
      queuedCreatePane = null;
      setPane(primary);
    };
    window.addEventListener("kilode:create-role", onRole);
    return () => {
      window.removeEventListener("kilode:create", onCreate);
      window.removeEventListener("kilode:create-role", onRole);
    };
  }, [primary]);
  useEffect(() => {
    if (pane !== "apply" && ak !== "job_seeker") return;
    void listListings({ data: { kind: "job" } })
      .then((rows) => setOpenJobs(Array.isArray(rows) ? rows : []))
      .catch(() => setOpenJobs([]));
  }, [pane, ak]);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [category, setCategory] = useState("General");
  const [tags, setTags] = useState("");
  const [link, setLink] = useState("");
  const [image, setImage] = useState("");
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [payFor, setPayFor] = useState<{ kind: "job" | "market" | "rent" | "cinema"; id: string; usd: number } | null>(null);
  const [agree, setAgree] = useState(false);
  const [artist, setArtist] = useState("");
  const [album, setAlbum] = useState("");
  const [genre, setGenre] = useState("Afrobeats");
  const [preview, setPreview] = useState("");
  const [altText, setAltText] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDesc, setSeoDesc] = useState("");
  const [slug, setSlug] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [commentsOn, setCommentsOn] = useState(true);
  const [company, setCompany] = useState("");
  const [contact, setContact] = useState("");
  const [city, setCity] = useState("");
  const [days, setDays] = useState(30);
  const [cinSec, setCinSec] = useState<"nigerian" | "global" | "coming">("nigerian");
  const [coverUrl, setCoverUrl] = useState("");
  const [applyNote, setApplyNote] = useState("");
  const [applyPhone, setApplyPhone] = useState("");
  const [applyCv, setApplyCv] = useState("");
  const [applyCvBusy, setApplyCvBusy] = useState(false);
  const [applySkills, setApplySkills] = useState("");
  const [applyId, setApplyId] = useState("");
  const [openJobs, setOpenJobs] = useState<Listing[]>([]);
  useEffect(() => {
    try {
      const card = JSON.parse(localStorage.getItem("kilode-seeker") || "{}") as { phone?: string; cv?: string; skills?: string };
      if (card.phone) setApplyPhone(card.phone);
      if (card.cv) setApplyCv(card.cv);
      if (card.skills) setApplySkills(card.skills);
    } catch { /* ignore */ }
  }, []);
  const [busy, setBusy] = useState(false);
  const [empType, setEmpType] = useState("Full-time");
  const [payBand, setPayBand] = useState("");
  const [listPrice, setListPrice] = useState("");
  const [marketCond, setMarketCond] = useState("Good");
  const [rentType, setRentType] = useState("Flat");
  const [listingImageUrl, setListingImageUrl] = useState("");

  function onUrl(v: string) {
    setLink(v);
    const parsed = parseMusicUrl(v);
    setPreview(parsed ? `${parsed.platform}${parsed.embed ? " · embed ready" : " · link only"}` : "");
  }

  async function onFile(file: File | undefined) {
    setErr("");
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setErr("Images only.");
      return;
    }
    if (file.size > 2_000_000) {
      setErr("Keep the image under 2MB.");
      return;
    }
    const data = await compressImage(file);
    setImage(data);
  }

  function goto(screen: string, tab?: string) {
    window.dispatchEvent(new CustomEvent("kilode:goto", { detail: { screen, tab } }));
  }

  function submit(status: "draft" | "publish") {
    setErr("");
    setMsg("");
    if (!agree) {
      setErr("Accept the Terms to publish.");
      return;
    }
    if (!canKind(store.kind, "feeds.post")) {
      setErr("This account type cannot publish to Feeds.");
      return;
    }
    if (!title.trim() || !postBodyPlain(body)) {
      setErr("Title and post content are required.");
      return;
    }
    const url = safeHttpUrl(link);
    if (link.trim() && !url) {
      setErr("Link must be http or https.");
      return;
    }
    const feature = image || (safeHttpUrl(imageUrl) ?? "");
    store.publishPost({
      title,
      body: sanitizePostHtml(body),
      excerpt,
      category,
      tags,
      link: url,
      image: feature,
      slug: (slug.trim() || slugify(title)),
      status,
      seoTitle,
      seoDesc,
      altText,
      sourceName,
      commentsOn,
    });
    setTitle("");
    setBody("");
    setExcerpt("");
    setTags("");
    setLink("");
    setImage("");
    setImageUrl("");
    setAltText("");
    setSourceName("");
    setSeoTitle("");
    setSeoDesc("");
    setSlug("");
    setMsg(status === "publish" ? "Published to Feeds." : "Draft saved on this device.");
    if (status === "publish") onForum?.();
  }

  function submitMusic() {
    setErr("");
    setMsg("");
    if (!agree) {
      setErr("Accept the Terms to list music.");
      return;
    }
    if (!canKind(store.kind, "music.submit")) {
      setErr("Only Artist accounts can list music URLs.");
      return;
    }
    if (!parseMusicUrl(link)) {
      setErr("Paste a Spotify, Apple Music, SoundCloud, Audiomack or Deezer track URL. YouTube video is for Cinema / Videos.");
      return;
    }
    if (!title.trim() || !artist.trim()) {
      setErr("Title and artist are required.");
      return;
    }
    const cover = image || (safeHttpUrl(coverUrl) ?? "");
    store.publishTrack({
      title,
      artist,
      url: link,
      cover,
      genre,
      album,
      note: body,
      tags,
    });
    setTitle("");
    setArtist("");
    setAlbum("");
    setBody("");
    setTags("");
    setLink("");
    setImage("");
    setCoverUrl("");
    setPreview("");
    setMsg("Listed on Music. Open the Music tab to play the embed.");
    onForum?.();
  }

  function submitListing(kind: "job" | "market" | "rent") {
    setErr("");
    setMsg("");
    if (!agree) {
      setErr("Accept the Terms to submit.");
      return;
    }
    if (!title.trim() || title.trim().length < 3) {
      setErr("Add a clear title (at least 3 characters).");
      return;
    }
    if (kind === "job" && !company.trim()) {
      setErr("Company / hiring org is required for jobs.");
      return;
    }
    if (!contact.trim()) {
      setErr("Add a public contact (phone, email, or @handle).");
      return;
    }
    if (link.trim() && !safeHttpUrl(link)) {
      setErr("Link must be http or https.");
      return;
    }
    const meta =
      kind === "job"
        ? [empType.trim() || null, payBand.trim() ? `Pay: ${payBand.trim()}` : null].filter(Boolean).join(" · ")
        : kind === "market"
          ? [marketCond.trim() || null, listPrice.trim() ? `Price: ${listPrice.trim()}` : null].filter(Boolean).join(" · ")
          : kind === "rent"
            ? [rentType.trim() || null, listPrice.trim() ? `Rent: ${listPrice.trim()}` : null].filter(Boolean).join(" · ")
            : "";
    const composedBody = meta ? `${meta}\n\n${body}`.trim() : body;
    const photo = image || (safeHttpUrl(listingImageUrl) ?? "");
    setBusy(true);
    void saveListing({
      data: {
        kind,
        title,
        body: composedBody,
        city,
        contact,
        link,
        company,
        days,
        image: photo || undefined,
      },
    }).then((r) => {
      setBusy(false);
      if (!r.ok) setErr(r.reason);
      else if (r.needsPay) {
        setPayFor({ kind, id: r.id, usd: r.priceUsd });
        setMsg("Saved. Pay to put it live. Staff do not approve a paid listing.");
      } else {
        setPayFor(null);
        setMsg(
          kind === "job"
            ? "Job submitted. Staff approve before seekers see it — check Me → Hiring desk."
            : kind === "market"
              ? "Product submitted for staff approval — check Me → Market desk."
              : "Space submitted for staff approval — check Me → Rent desk.",
        );
        setTitle("");
        setBody("");
        setCity("");
        setContact("");
        setLink("");
        setCompany("");
        setImage("");
        setListingImageUrl("");
        setListPrice("");
        if (kind === "job") {
          setEmpType("Full-time");
          setPayBand("");
        }
        if (kind === "market") setMarketCond("Good");
        if (kind === "rent") setRentType("Flat");
      }
    }).catch(() => {
      setBusy(false);
      setErr("Could not submit. Try again.");
    });
  }

  function submitCinema() {
    setErr("");
    setMsg("");
    if (!agree) {
      setErr("Accept the Terms to submit.");
      return;
    }
    if (!title.trim()) {
      setErr("Add the movie title.");
      return;
    }
    if (!youtubeId(link)) {
      setErr("Paste a YouTube watch / youtu.be / embed URL. Kilode never hosts the file.");
      return;
    }
    setBusy(true);
    void submitMovie({ data: { title, url: link, section: cinSec } }).then((r) => {
      setBusy(false);
      if (!r.ok) setErr(r.reason);
      else if (r.needsPay) {
        setPayFor({ kind: "cinema", id: r.id, usd: r.priceUsd });
        setMsg("Saved. Pay to put it in the vote pool.");
      } else {
        setPayFor(null);
        setMsg("Submitted. Staff will approve before it enters the vote pool — track it on Me → Cinema.");
        setTitle("");
        setLink("");
      }
    }).catch(() => {
      setBusy(false);
      setErr("Could not submit. Try again.");
    });
  }

  const tabs: { id: Pane; label: string; show: boolean }[] = [
    { id: "music", label: "Music", show: canMusic },
    { id: "ads", label: "Ads", show: canAds },
    { id: "cinema", label: "Cinema", show: canCinema },
    { id: "job", label: "Job", show: canJobs },
    { id: "apply", label: "Jobs", show: canApply && !canJobs && ak === "job_seeker" },
    { id: "market", label: "Market", show: canMarket },
    { id: "rent", label: "Rent", show: canRent },
    { id: "post", label: "Feeds", show: canPost && (canMusic || canJobs || canAds || canCinema || canMarket || canRent ? true : true) },
  ];
  // Secondary feeds only when primary is not post, and user can post
  const showTabBar = tabs.filter((t) => t.show).length > 1;
  const visibleTabs = tabs.filter((t) => {
    if (!t.show) return false;
    if (t.id === "post" && primary !== "post" && !canPost) return false;
    // job_seeker: Apply is primary; Feeds post is a secondary tab (canKind feeds.post).
    if (ak === "job_seeker" && t.id === "post") return canPost;
    if (ak === "artist" && t.id === "post") return canPost; // secondary
    if ((ak === "advertiser" || ak === "cinema") && t.id === "post") return false;
    if (ak === "job_poster" && t.id === "post") return canPost;
    if (ak === "brand" && t.id === "post") return false;
    if ((ak === "vendor" || ak === "renter") && t.id === "post") return false;
    return true;
  });

  const kindLabel = ACCOUNT_KINDS.find((k) => k.id === ak)?.label ?? ak;

  if (pane === "ads" && canAds) {
    return (
      <div className="pb-8">
        <div className="mx-auto max-w-2xl px-5 pt-5">
          <h2 className="text-xl font-bold tracking-tight">Create · Ads</h2>
          <p className="mt-1 text-sm text-muted">
            {ak === "brand" ? "Brand ad creative + crypto pay. Staff approve." : "Ads Poster — place a campaign. Staff approve after payment."}
          </p>
          <div className="mt-2 rounded-xl border border-line bg-panel/80 px-3 py-2 text-[11px] leading-snug text-muted">
            <span className="font-bold text-lime-2">Pay path:</span> copy the Kilode wallet below, send crypto, paste the tx hash.{" "}
            <span className="font-semibold text-white">NOWPayments</span> stays off until Kilode enables auto-pay — then it can auto-invoice. Manual wallets are live now.
          </div>
          {ak === "brand" && canMarket ? (
            <button type="button" className="btn-3d mt-2 rounded-lg px-3 py-1.5 text-[11px] font-semibold" onClick={() => setPane("market")}>
              Also list on Marketplace
            </button>
          ) : null}
          {showTabBar && visibleTabs.length > 1 ? (
            <div className="raised mt-3 flex gap-1.5 rounded-xl p-1.5">
              {visibleTabs.map((t) => (
                <button key={t.id} type="button" className={`flex-1 rounded-lg px-3 py-2 text-[13px] font-semibold ${pane === t.id ? "btn-join text-white" : "text-muted hover:bg-panel-2"}`} onClick={() => setPane(t.id)}>
                  {t.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <Ads store={store} />
      </div>
    );
  }

  const sheetTitle =
    pane === "music" ? "Create · Music"
    : pane === "cinema" ? "Create · Cinema"
    : pane === "job" ? "Create · Job"
    : pane === "apply" ? "Create · Apply"
    : pane === "market" ? "Create · Market"
    : pane === "rent" ? "Create · Rent"
    : pane === "ads" ? "Create · Ads"
    : pane === "post" && ak === "writer" ? "Create · Story"
    : pane === "post" ? "Create · Feeds"
    : createSheetTitle(ak);

  const sheetSub =
    pane === "music" ? "Lists live on Music — no staff approval, no payment. Kilode embeds the platform player — never hosts audio."
    : pane === "cinema" ? "Submit a YouTube trailer URL for staff approval."
    : pane === "job" ? "Post a role with type, pay band, company and contact. Applicants land on Me."
    : pane === "apply" ? "Browse and apply to jobs. You can also post in Feeds from the Feeds tab."
    : pane === "market" ? "Showcase a product with photo, price and condition. No in-app checkout."
    : pane === "rent" ? "List a space with photo, type and rent band. No in-app booking."
    : pane === "ads" ? "Place an ad after crypto payment."
    : pane === "post" && ak === "writer" ? "Write a story with the rich Feeds editor."
    : pane === "post" ? "Publish a topic to Feeds with the rich editor."
    : createSheetTitle(ak).replace("Create · ", "") + " — primary action for your account.";

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-5 pb-8">
      <div>
        <h2 className="text-xl font-bold tracking-tight">{sheetTitle}</h2>
        <p className="mt-1 text-sm text-muted">
          {kindLabel}: {sheetSub}
        </p>
      </div>
      {payFor ? (
        <DeskPayBox
          kind={payFor.kind}
          purpose={payFor.id}
          usd={payFor.usd}
          onLive={() => {
            setMsg("Paid. It is live.");
            setPayFor(null);
          }}
        />
      ) : null}

      {showTabBar && visibleTabs.length > 1 ? (
        <div className="raised flex flex-wrap gap-1.5 rounded-xl p-1.5">
          {visibleTabs.map((t) => (
            <button key={t.id} type="button" className={`min-w-[4.5rem] flex-1 rounded-lg px-3 py-2 text-[13px] font-semibold ${pane === t.id ? "btn-join text-white" : "text-muted hover:bg-panel-2"}`} onClick={() => setPane(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
      ) : null}

      {pane === "apply" ? (
        <div className="raised space-y-3 rounded-2xl border border-lime-2/30 p-4">
          <div className="text-[10px] font-bold tracking-[0.16em] text-lime-2">JOB SEEKER · APPLY</div>
          <p className="text-sm text-muted">Pick a live role. Phone and a short note are required. A CV link is optional and must be https.</p>
          {openJobs.length === 0 ? (
            <div className="rounded-xl border border-dashed border-line bg-panel/60 px-3 py-4 text-center text-[12px] text-muted">
              No approved jobs live right now. Polish your profile bio and city, then check again.
            </div>
          ) : (
            <div className="max-h-72 space-y-2 overflow-y-auto">
              {openJobs.slice(0, 12).map((j) => (
                <button
                  key={j.id}
                  type="button"
                  onClick={() => setApplyId(j.id)}
                  className={`w-full rounded-xl border px-3 py-2 text-left ${applyId === j.id ? "border-lime-2 bg-lime-2/10" : "border-line bg-panel"}`}
                >
                  <div className="truncate text-sm font-semibold">{j.title}</div>
                  <div className="text-[10px] text-muted">{j.company || "Hiring"} · {j.city || "Remote"}</div>
                </button>
              ))}
            </div>
          )}
          {applyId ? (
            <>
              <input value={applyPhone} onChange={(e) => setApplyPhone(e.target.value)} placeholder="Phone" className="w-full rounded-xl border border-line bg-panel px-3 py-2.5 text-base" inputMode="tel" />
              <input value={applyCv} onChange={(e) => setApplyCv(e.target.value)} placeholder="CV link, https:// (optional)" className="w-full rounded-xl border border-line bg-panel px-3 py-2.5 text-base" />
              <label className="block text-[12px] text-muted">
                {applyCvBusy ? "Uploading PDF…" : "Or upload a PDF, 4MB max"}
                <input type="file" accept="application/pdf,.pdf" disabled={applyCvBusy} className="mt-1 block w-full text-[12px]" onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setErr("");
                  setApplyCvBusy(true);
                  void uploadCvFile(file).then((url) => {
                    setApplyCv(url);
                    try { localStorage.setItem("kilode-seeker", JSON.stringify({ phone: applyPhone, cv: url, skills: applySkills })); } catch { /* ignore */ }
                  }).catch((err: unknown) => setErr(err instanceof Error ? err.message : "CV did not upload.")).finally(() => setApplyCvBusy(false));
                }} />
              </label>
              <input value={applySkills} onChange={(e) => setApplySkills(e.target.value)} placeholder="Skills, short" className="w-full rounded-xl border border-line bg-panel px-3 py-2.5 text-base" />
              <textarea value={applyNote} onChange={(e) => setApplyNote(e.target.value)} rows={3} placeholder="Why you fit" className="w-full rounded-xl border border-line bg-panel px-3 py-2.5 text-base" />
              {err ? <p className="text-sm text-danger">{err}</p> : null}
              {msg ? <p className="text-sm text-lime-2">{msg}</p> : null}
              <button
                type="button"
                className="btn-join w-full rounded-xl px-3 py-3 text-sm font-bold"
                disabled={busy}
                onClick={() => {
                  setErr("");
                  setMsg("");
                  setBusy(true);
                  void applyListing({ data: { id: applyId, note: applyNote, phone: applyPhone, cv: applyCv, skills: applySkills } }).then((r) => {
                    setBusy(false);
                    if (!r.ok) setErr(r.reason);
                    else {
                      try { localStorage.setItem("kilode-seeker", JSON.stringify({ phone: applyPhone, cv: applyCv, skills: applySkills })); } catch { /* ignore */ }
                      setMsg("Application sent. Track it on Jobs → Applications.");
                      setApplyNote("");
                      setApplyId("");
                    }
                  }).catch(() => {
                    setBusy(false);
                    setErr("Could not apply. Try again.");
                  });
                }}
              >
                {busy ? "Sending…" : "Apply to selected job"}
              </button>
            </>
          ) : null}
          <button type="button" className="btn-3d w-full rounded-xl px-3 py-2 text-sm font-semibold" onClick={() => goto("jobs")}>
            Open full Jobs board
          </button>
        </div>
      ) : null}

      {pane === "music" && canMusic ? (
        <div className="raised space-y-3 rounded-2xl border border-lime-2/30 p-4">
          <div className="text-[10px] font-bold tracking-[0.16em] text-lime-2">MUSIC · TRACK URL + COVER</div>
          <p className="text-sm text-muted">Paste a Spotify, Apple Music, SoundCloud, Audiomack or Deezer link. No audio files. Cover helps the Music tile — upload or paste a URL.</p>
          <label className="block text-[11px] font-medium text-muted">Track URL <span className="text-danger">*</span></label>
          <input value={link} onChange={(e) => onUrl(e.target.value)} placeholder="https://open.spotify.com/track/…" className="w-full rounded-xl border border-line bg-panel px-3 py-2.5 text-base" />
          {preview ? <p className="text-xs text-lime-2">{preview}</p> : link.trim() && !parseMusicUrl(link) ? <p className="text-xs text-danger">Not a supported music URL yet.</p> : null}
          <label className="block text-[11px] font-medium text-muted">Title <span className="text-danger">*</span></label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Track title" className="w-full rounded-xl border border-line bg-panel px-3 py-2.5 text-base" />
          <label className="block text-[11px] font-medium text-muted">Artist <span className="text-danger">*</span></label>
          <input value={artist} onChange={(e) => setArtist(e.target.value)} placeholder="Artist name" className="w-full rounded-xl border border-line bg-panel px-3 py-2.5 text-base" />
          <div className="grid gap-2 sm:grid-cols-2">
            <input value={album} onChange={(e) => setAlbum(e.target.value)} placeholder="Album / EP (optional)" className="w-full rounded-xl border border-line bg-panel px-3 py-2.5 text-base" />
            <input value={genre} onChange={(e) => setGenre(e.target.value)} placeholder="Genre" className="w-full rounded-xl border border-line bg-panel px-3 py-2.5 text-base" />
          </div>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={2} placeholder="Notes / credits (optional)" className="w-full rounded-xl border border-line bg-panel px-3 py-2.5 text-base" />
          <div className="inset-well rounded-xl p-3">
            <div className="mb-2 text-[11px] font-medium text-muted">Cover image (optional)</div>
            <input type="file" accept="image/*" onChange={(e) => void onFile(e.target.files?.[0])} className="text-xs" />
            <input value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} placeholder="Or cover URL https://…" className="mt-2 w-full rounded-lg border border-line bg-panel px-3 py-2 text-base" />
            {(image || coverUrl) ? <img src={image || coverUrl} alt="" className="mt-2 max-h-36 rounded-lg object-cover" /> : null}
          </div>
          {err ? <p className="text-sm text-danger">{err}</p> : null}
          {msg ? <p className="text-sm text-lime-2">{msg}</p> : null}
          <label className="flex items-start gap-2 text-[11px] text-muted">
            <input type="checkbox" className="mt-0.5" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
            <span>
              I agree to the{" "}
              <a href="/content" className="font-semibold text-lime-2 underline" target="_blank" rel="noreferrer">
                Terms
              </a>
              . This URL is mine to share. Audio is not hosted here.
            </span>
          </label>
          <button type="button" className="btn-join w-full rounded-xl px-3 py-3 text-sm font-bold" onClick={submitMusic}>
            List on Music
          </button>
          <button type="button" className="btn-3d w-full rounded-xl px-3 py-2 text-sm font-semibold" onClick={() => goto("home", "music")}>
            Open Music tab
          </button>
        </div>
      ) : null}

      {pane === "cinema" && canCinema ? (
        <div className="raised space-y-3 rounded-2xl border border-lime-2/30 p-4">
          <div className="text-[10px] font-bold tracking-[0.16em] text-lime-2">CINEMA · TITLE + TRAILER</div>
          <p className="text-sm text-muted">Trailer or official clip only. Staff approve → vote pool → Watching Now. Kilode never hosts the file.</p>
          <label className="block text-[11px] font-medium text-muted">Movie title <span className="text-danger">*</span></label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Movie title" className="w-full rounded-xl border border-line bg-panel px-3 py-2.5 text-base" />
          <label className="block text-[11px] font-medium text-muted">YouTube trailer URL <span className="text-danger">*</span></label>
          <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://youtube.com/watch?v=…" className="w-full rounded-xl border border-line bg-panel px-3 py-2.5 text-base" />
          {youtubeId(link) ? (
            <div className="overflow-hidden rounded-xl border border-line">
              <img src={`https://i.ytimg.com/vi/${youtubeId(link)}/hqdefault.jpg`} alt="" className="aspect-video w-full object-cover" />
              <div className="bg-panel px-3 py-1.5 text-[10px] text-muted">Trailer preview · id {youtubeId(link)}</div>
            </div>
          ) : link.trim() ? (
            <p className="text-xs text-danger">Need a valid YouTube URL to preview.</p>
          ) : null}
          <div className="flex flex-wrap gap-1">
            {(["nigerian", "global", "coming"] as const).map((s) => (
              <button key={s} type="button" onClick={() => setCinSec(s)} className={`rounded-full px-2.5 py-1 text-[11px] capitalize ${cinSec === s ? "btn-3d font-semibold" : "border border-line text-muted"}`}>
                {s}
              </button>
            ))}
          </div>
          {err ? <p className="text-sm text-danger">{err}</p> : null}
          {msg ? <p className="text-sm text-lime-2">{msg}</p> : null}
          <label className="flex items-start gap-2 text-[11px] text-muted">
            <input type="checkbox" className="mt-0.5" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
            <span>I agree to the Terms. This is an official / trailer YouTube link I may share.</span>
          </label>
          <button type="button" className="btn-join w-full rounded-xl px-3 py-3 text-sm font-bold" disabled={busy} onClick={submitCinema}>
            {busy ? "Submitting…" : "Submit for approval"}
          </button>
          <button type="button" className="btn-3d w-full rounded-xl px-3 py-2 text-sm font-semibold" onClick={() => goto("home", "cinema")}>
            Open Cinema
          </button>
        </div>
      ) : null}

      {(pane === "job" && canJobs) || (pane === "market" && canMarket) || (pane === "rent" && canRent) ? (
        <div className="raised space-y-3 rounded-2xl border border-lime-2/30 p-4">
          <div className="text-[10px] font-bold tracking-[0.16em] text-lime-2">
            {pane === "job" ? "JOB · POST A ROLE" : pane === "market" ? "MARKET · LIST PRODUCT" : "RENT · LIST SPACE"}
          </div>
          <p className="text-sm text-muted">
            {pane === "job"
              ? "Role, company, city, contact, optional apply link. Staff approve before seekers see it. Applicants land on your Me · Hiring desk."
              : pane === "market"
                ? "Showcase a product with contact. No in-app checkout. Staff approve first."
                : "List a space with contact. No in-app booking. Staff approve first."}
          </p>
          {pane === "job" ? (
            <div className="rounded-xl border border-lime-2/20 bg-lime-2/5 px-3 py-2.5 text-[11px] leading-snug text-muted">
              <div className="mb-1 text-[10px] font-bold tracking-[0.14em] text-lime-2">FLAGSHIP HIRING FLOW</div>
              <ol className="list-decimal space-y-0.5 pl-4">
                <li>Submit role → pending until staff approve.</li>
                <li>Seekers apply with @handle + note from Jobs / Create · Apply.</li>
                <li>Review applicants on Me · Hiring desk — contact them yourself.</li>
              </ol>
            </div>
          ) : pane === "market" ? (
            <div className="rounded-xl border border-lime-2/20 bg-lime-2/5 px-3 py-2.5 text-[11px] leading-snug text-muted">
              <div className="mb-1 text-[10px] font-bold tracking-[0.14em] text-lime-2">FLAGSHIP MARKET FLOW</div>
              <ol className="list-decimal space-y-0.5 pl-4">
                <li>Add a clear photo, price hint and condition — staff approve first.</li>
                <li>Buyers see it on Marketplace and contact you off-platform.</li>
                <li>Track live / pending / views on Me · Market desk. No in-app checkout.</li>
              </ol>
            </div>
          ) : pane === "rent" ? (
            <div className="rounded-xl border border-lime-2/20 bg-lime-2/5 px-3 py-2.5 text-[11px] leading-snug text-muted">
              <div className="mb-1 text-[10px] font-bold tracking-[0.14em] text-lime-2">FLAGSHIP RENT FLOW</div>
              <ol className="list-decimal space-y-0.5 pl-4">
                <li>Photo + property type + rent band — staff approve before it goes live.</li>
                <li>Seekers contact you via the public phone / email / @handle.</li>
                <li>Manage spaces on Me · Rent desk. No in-app booking or deposits.</li>
              </ol>
            </div>
          ) : null}
          <label className="block text-[11px] font-medium text-muted">
            {pane === "job" ? "Role title" : pane === "market" ? "Product name" : "Space title"} <span className="text-danger">*</span>
          </label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={pane === "job" ? "e.g. Frontend engineer" : pane === "market" ? "e.g. Ankara print dress" : "e.g. 2-bed Lekki flat"} className="w-full rounded-xl border border-line bg-panel px-3 py-2.5 text-base" />
          {pane === "job" ? (
            <>
              <label className="block text-[11px] font-medium text-muted">Company <span className="text-danger">*</span></label>
              <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Hiring company / org" className="w-full rounded-xl border border-line bg-panel px-3 py-2.5 text-base" />
              <div>
                <div className="mb-1 text-[11px] font-medium text-muted">Employment type</div>
                <div className="flex flex-wrap gap-1">
                  {["Full-time", "Part-time", "Contract", "Internship", "Remote"].map((t) => (
                    <button key={t} type="button" onClick={() => setEmpType(t)} className={`rounded-full px-2.5 py-1 text-[11px] ${empType === t ? "btn-3d font-semibold" : "border border-line text-muted"}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <label className="block text-[11px] font-medium text-muted">Pay band (optional)</label>
              <input value={payBand} onChange={(e) => setPayBand(e.target.value)} placeholder="e.g. ₦300k–500k / mo · Negotiable" className="w-full rounded-xl border border-line bg-panel px-3 py-2.5 text-base" />
            </>
          ) : pane === "market" ? (
            <>
              <label className="block text-[11px] font-medium text-muted">Brand / shop (optional)</label>
              <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Shop or brand name" className="w-full rounded-xl border border-line bg-panel px-3 py-2.5 text-base" />
            </>
          ) : (
            <>
              <label className="block text-[11px] font-medium text-muted">Landlord / agent (optional)</label>
              <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Name or agency" className="w-full rounded-xl border border-line bg-panel px-3 py-2.5 text-base" />
            </>
          )}
          {pane === "market" ? (
            <>
              <div>
                <div className="mb-1 text-[11px] font-medium text-muted">Condition</div>
                <div className="flex flex-wrap gap-1">
                  {["New", "Like new", "Good", "Fair"].map((t) => (
                    <button key={t} type="button" onClick={() => setMarketCond(t)} className={`rounded-full px-2.5 py-1 text-[11px] ${marketCond === t ? "btn-3d font-semibold" : "border border-line text-muted"}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <label className="block text-[11px] font-medium text-muted">Price (optional)</label>
              <input value={listPrice} onChange={(e) => setListPrice(e.target.value)} placeholder="e.g. ₦15,000 · ONO · Swap" className="w-full rounded-xl border border-line bg-panel px-3 py-2.5 text-base" />
            </>
          ) : null}
          {pane === "rent" ? (
            <>
              <div>
                <div className="mb-1 text-[11px] font-medium text-muted">Property type</div>
                <div className="flex flex-wrap gap-1">
                  {["Flat", "Room", "Shop", "Land", "Office"].map((t) => (
                    <button key={t} type="button" onClick={() => setRentType(t)} className={`rounded-full px-2.5 py-1 text-[11px] ${rentType === t ? "btn-3d font-semibold" : "border border-line text-muted"}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <label className="block text-[11px] font-medium text-muted">Rent band (optional)</label>
              <input value={listPrice} onChange={(e) => setListPrice(e.target.value)} placeholder="e.g. ₦1.2m / yr · ₦80k / mo" className="w-full rounded-xl border border-line bg-panel px-3 py-2.5 text-base" />
            </>
          ) : null}
          <label className="block text-[11px] font-medium text-muted">Description</label>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} placeholder={pane === "job" ? "Responsibilities, pay band, how to apply…" : pane === "market" ? "Size, delivery, extras…" : "Beds, area, viewing hours…"} className="w-full rounded-xl border border-line bg-panel px-3 py-2.5 text-base" />
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[11px] font-medium text-muted">City</label>
              <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Lagos, Abuja…" className="w-full rounded-xl border border-line bg-panel px-3 py-2.5 text-base" />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-muted">Contact <span className="text-danger">*</span></label>
              <input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Phone / email / @handle" className="w-full rounded-xl border border-line bg-panel px-3 py-2.5 text-base" />
            </div>
          </div>
          <label className="block text-[11px] font-medium text-muted">{pane === "job" ? "Apply link (optional)" : "External link (optional)"}</label>
          <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://…" className="w-full rounded-xl border border-line bg-panel px-3 py-2.5 text-base" />
          {pane === "market" || pane === "rent" ? (
            <div className="inset-well rounded-xl p-3">
              <div className="mb-1 text-[10px] font-bold tracking-[0.14em] text-lime-2">PHOTO</div>
              <p className="mb-2 text-[11px] text-muted">
                Same as Feeds / Writer — upload under 2MB (we compress) or paste https://…. Shows on Marketplace / Rent tiles after approval.
              </p>
              <input type="file" accept="image/*" onChange={(e) => void onFile(e.target.files?.[0])} className="text-xs" />
              <input
                value={listingImageUrl}
                onChange={(e) => {
                  setListingImageUrl(e.target.value);
                  if (e.target.value.trim()) setImage("");
                }}
                placeholder="Or paste image URL https://…"
                className="mt-2 w-full rounded-lg border border-line bg-panel px-3 py-2 text-base"
              />
              {image || listingImageUrl ? (
                <img src={image || listingImageUrl} alt="" className="mt-2 max-h-40 w-full rounded-lg object-cover" />
              ) : null}
            </div>
          ) : null}
          <div>
            <div className="mb-1 text-[11px] font-medium text-muted">Live for</div>
            <div className="flex flex-wrap gap-1">
              {[7, 14, 30].map((d) => (
                <button key={d} type="button" onClick={() => setDays(d)} className={`rounded-full px-2.5 py-1 text-[11px] ${days === d ? "btn-3d font-semibold" : "border border-line text-muted"}`}>
                  {d} days
                </button>
              ))}
            </div>
          </div>
          {err ? <p className="text-sm text-danger">{err}</p> : null}
          {msg ? <p className="text-sm text-lime-2">{msg}</p> : null}
          <label className="flex items-start gap-2 text-[11px] text-muted">
            <input type="checkbox" className="mt-0.5" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
            <span>I agree to the Terms. Contact details are public after approval.</span>
          </label>
          <button
            type="button"
            className="btn-join w-full rounded-xl px-3 py-3 text-sm font-bold"
            disabled={busy}
            onClick={() => submitListing(pane === "job" ? "job" : pane === "market" ? "market" : "rent")}
          >
            {busy ? "Submitting…" : pane === "job" ? "Submit job" : pane === "market" ? "List product" : "List space"}
          </button>
          <button type="button" className="btn-3d w-full rounded-xl px-3 py-2 text-sm font-semibold" onClick={() => goto(pane === "job" ? "jobs" : pane)}>
            Open {pane === "job" ? "Jobs" : pane === "market" ? "Marketplace" : "Rent"}
          </button>
        </div>
      ) : null}

      {pane === "post" && canPost ? (
        <div className="raised space-y-4 rounded-2xl border border-lime-2/30 p-4">
          <section>
            <div className="mb-2 text-[10px] font-bold tracking-[0.16em] text-lime-2">{ak === "writer" ? "WRITER · RICH STORY" : "FEEDS · RICH POST"}</div>
            <p className="mb-2 text-[12px] text-muted">Headline, toolbar body (bold / heads / image), featured image, SEO. Draft stays on this device until you publish.</p>
            <div className="mb-2 text-[10px] font-bold tracking-[0.16em] text-lime-2">CONTENT</div>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Headline" className="w-full rounded-xl border border-line bg-panel px-3 py-2.5 text-base" />
            <PostRichEditor
              value={body}
              onChange={setBody}
              featuredSrc={image || (safeHttpUrl(imageUrl) ?? "") || undefined}
              placeholder="Write the full post…"
            />
            <textarea value={excerpt} onChange={(e) => setExcerpt(e.target.value)} rows={2} placeholder="Excerpt — short summary for the tile (not the same as the title)" className="mt-2 w-full rounded-xl border border-line bg-panel px-3 py-2.5 text-base" />
          </section>
          <section>
            <div className="mb-2 text-[10px] font-bold tracking-[0.16em] text-lime-2">FEATURED IMAGE</div>
            <div className="inset-well rounded-xl p-3">
              <p className="mb-2 text-[11px] text-muted">Recommended 1200 × 675 (16:9). JPG, PNG or WebP. Max 2MB. This is the Feeds thumbnail.</p>
              <input type="file" accept="image/*" onChange={(e) => void onFile(e.target.files?.[0])} className="text-xs" />
              <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="Or paste image URL https://…" className="mt-2 w-full rounded-lg border border-line bg-panel px-3 py-2 text-base" />
              <input value={altText} onChange={(e) => setAltText(e.target.value)} placeholder="Image alt text (accessibility + search)" className="mt-2 w-full rounded-lg border border-line bg-panel px-3 py-2 text-base" />
              {image || imageUrl ? <img src={image || imageUrl} alt="" className="mt-2 max-h-40 rounded-lg object-cover" /> : null}
            </div>
          </section>
          <section>
            <div className="mb-2 text-[10px] font-bold tracking-[0.16em] text-lime-2">CATEGORY · TAGS · SOURCE</div>
            <div className="grid gap-2 sm:grid-cols-2">
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-xl border border-line bg-panel px-3 py-2.5 text-base">
                {POST_CATS.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
              <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Tags (comma separated)" className="rounded-xl border border-line bg-panel px-3 py-2.5 text-base" />
            </div>
            <input
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="Source / canonical URL — https://…"
              className="mt-2 w-full rounded-xl border border-line bg-panel px-3 py-2.5 text-base"
            />
            <input value={sourceName} onChange={(e) => setSourceName(e.target.value)} placeholder="Source name (Premium Times, original…)" className="mt-2 w-full rounded-xl border border-line bg-panel px-3 py-2.5 text-base" />
          </section>
          <section>
            <div className="mb-2 text-[10px] font-bold tracking-[0.16em] text-lime-2">SEO</div>
            <input value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} placeholder="SEO title (search engines, max ~70)" className="w-full rounded-xl border border-line bg-panel px-3 py-2.5 text-base" />
            <textarea value={seoDesc} onChange={(e) => setSeoDesc(e.target.value)} rows={2} placeholder="SEO description (max ~160 characters)" className="mt-2 w-full rounded-xl border border-line bg-panel px-3 py-2.5 text-base" />
            <input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder={`URL slug · ${title ? slugify(title) : "auto-from-title"}`} className="mt-2 w-full rounded-xl border border-line bg-panel px-3 py-2.5 text-base" />
          </section>
          <section>
            <div className="mb-2 text-[10px] font-bold tracking-[0.16em] text-lime-2">PUBLISH</div>
            <label className="flex items-center gap-2 text-[11px] text-muted">
              <input type="checkbox" checked={commentsOn} onChange={(e) => setCommentsOn(e.target.checked)} />
              Allow comments
            </label>
            <p className="mt-1 text-[11px] text-muted">Author is your @handle. Draft stays in your dashboard until you publish.</p>
          </section>
          {err ? <p className="text-sm text-danger">{err}</p> : null}
          {msg ? <p className="text-sm text-lime-2">{msg}</p> : null}
          <label className="flex items-start gap-2 text-[11px] text-muted">
            <input type="checkbox" className="mt-0.5" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
            <span>
              I agree to the{" "}
              <a href="/content" className="font-semibold text-lime-2 underline" target="_blank" rel="noreferrer">
                Terms
              </a>
              . I am responsible for this post. Kilode is not liable for what I publish.
            </span>
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button type="button" className="btn-join flex-1 rounded-xl px-3 py-3 text-sm font-bold" onClick={() => submit("publish")}>
              {ak === "writer" ? "Publish story" : "Publish to Feeds"}
            </button>
            <button type="button" className="btn-3d rounded-xl px-3 py-3 text-sm font-semibold sm:flex-none" onClick={() => submit("draft")}>
              Save draft
            </button>
          </div>
        </div>
      ) : null}

      {!canPost && !canMusic && !canAds && !canCinema && !canJobs && !canMarket && !canRent && ak !== "job_seeker" ? (
        <p className="rounded-xl border border-line p-3 text-sm text-muted">This account type cannot publish here.</p>
      ) : null}
    </div>
  );
}

function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, 900 / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("canvas"));
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.72));
    };
    img.onerror = () => reject(new Error("image"));
    img.src = url;
  });
}

function Communities({ onHome }: { onHome: (roomId?: string) => void }) {
  return (
    <Screen kicker="DISCOVER" title="Communities" sub="Hubs by region. Tap a room to chat.">
      {COMMUNITIES.map((c) => {
        const rooms = ROOMS.filter((r) => r.region === c.region);
        return (
          <div key={c.id} className="raised mb-3 rounded-2xl p-4">
            <div className="text-sm font-extrabold">{c.name}</div>
            <div className="text-[10px] text-muted">{rooms.length} rooms</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {rooms.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  className="rounded-full border border-line px-3 py-1 text-xs"
                  onClick={() => onHome(r.id)}
                >
                  {r.name}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </Screen>
  );
}

function Search({ store, onHome }: { store: Store; onHome: (roomId?: string) => void }) {
  const [q, setQ] = useState("");
  const [lane, setLane] = useState<"home" | "explore" | "all" | "discover" | "trending">("home");
  const [tiles, setTiles] = useState<ExploreTile[]>([]);
  const [jobs, setJobs] = useState<Listing[]>([]);
  const [people, setPeople] = useState<{ id: string; handle: string; role: string }[]>([]);
  const [foundPeople, setFoundPeople] = useState<{ handle: string; role: string; line: string }[]>([]);
  const [foundTakes, setFoundTakes] = useState<{ id: string; handle: string; body: string }[]>([]);
  const [foundSpaces, setFoundSpaces] = useState<SpaceCard[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const s = q.trim().toLowerCase();
  const rooms = useMemo(
    () =>
      ROOMS.filter(
        (r) => !s || r.name.toLowerCase().includes(s) || r.region.toLowerCase().includes(s),
      ),
    [s],
  );
  const posts = s ? store.posts.filter((p) => !!p?.id && `${p.title} ${p.body} ${p.author} ${p.category}`.toLowerCase().includes(s)) : [];
  const tracks = s ? store.tracks.filter((t) => !!t?.id && `${t.title} ${t.artist}`.toLowerCase().includes(s)) : [];
  const grid = useMemo(() => {
    const seen = new Set(tiles.map((t) => t.id));
    const extra: ExploreTile[] = [];
    for (const p of store.posts) {
      if (!p?.id || p.status === "draft" || seen.has(p.id) || !p.image || !/^https?:/i.test(p.image)) continue;
      extra.push({
        id: p.id,
        kind: "post",
        title: p.title,
        image: p.image,
        href: `/p/${p.slug || p.id}`,
        video: /youtu\.be|youtube\.com|vimeo\.com/i.test(p.link || ""),
      });
    }
    return [...extra, ...tiles].slice(0, 60);
  }, [store.posts, tiles]);
  useEffect(() => {
    if (!s) {
      setJobs([]);
      return;
    }
    void Promise.all([
      listListings({ data: { kind: "job" } }),
      listListings({ data: { kind: "market" } }),
      listListings({ data: { kind: "rent" } }),
    ])
      .then((packs) => {
        setJobs(packs.flat().filter((r) => `${r.title} ${r.body} ${r.city} ${r.company}`.toLowerCase().includes(s)));
      })
      .catch(() => setJobs([]));
  }, [s]);
  useEffect(() => {
    if (s.length < 2) {
      setFoundPeople([]);
      setFoundTakes([]);
      setFoundSpaces([]);
      return;
    }
    void searchPeople({ data: { q: s } })
      .then((rows) => setFoundPeople(rows.map((p) => ({ handle: p.handle, role: p.role, line: p.line }))))
      .catch(() => setFoundPeople([]));
    void searchTakes({ data: { q: s } })
      .then((rows) => setFoundTakes(rows.map((t) => ({ id: t.id, handle: t.handle, body: t.body }))))
      .catch(() => setFoundTakes([]));
    void listPublicSpaces({ data: { q: s } })
      .then((rows) => setFoundSpaces(Array.isArray(rows) ? rows : []))
      .catch(() => setFoundSpaces([]));
    try {
      const prev = JSON.parse(localStorage.getItem("kilode-recent-search") || "[]") as string[];
      const next = [s, ...prev.filter((x) => x !== s)].slice(0, 6);
      localStorage.setItem("kilode-recent-search", JSON.stringify(next));
      setRecent(next);
    } catch { /* ignore */ }
  }, [s]);
  useEffect(() => {
    if (lane !== "explore") return;
    void listExploreGrid()
      .then((rows) => setTiles(Array.isArray(rows) ? rows : []))
      .catch(() => setTiles([]));
  }, [lane]);
  useEffect(() => {
    if (s || lane === "trending" || lane === "explore") return;
    void suggestFollows()
      .then((rows) => setPeople(rows.map((p) => ({ id: p.id, handle: p.handle, role: p.role }))))
      .catch(() => setPeople([]));
    void listPublicSpaces({ data: {} })
      .then((rows) => setFoundSpaces(Array.isArray(rows) ? rows : []))
      .catch(() => setFoundSpaces([]));
  }, [s, lane]);
  useEffect(() => {
    try { setRecent(JSON.parse(localStorage.getItem("kilode-recent-search") || "[]") as string[]); } catch { setRecent([]); }
  }, []);
  return (
    <Screen kicker="KILODE" title="Activity" sub="Jump in, or search if you already know the name." className="paper-page">
      <label className="act-search">
        <SearchIcon className="size-4" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search people, spaces, posts, jobs"
        />
      </label>
      {!s && recent.length > 0 ? (
        <div className="flex gap-1.5 overflow-x-auto">
          {recent.map((word) => (
            <button key={word} type="button" className="soc-chip shrink-0 px-2.5 py-1 text-[12px]" onClick={() => setQ(word)}>{word}</button>
          ))}
        </div>
      ) : null}
      <div className="act-lanes" role="tablist">
        {(["home", "discover", "trending", "all", "explore"] as const).map((id) => (
          <button key={id} type="button" role="tab" aria-selected={lane === id} className={`act-lane ${lane === id ? "on" : ""}`} onClick={() => setLane(id)}>
            {id === "home" ? "Now" : id === "explore" ? "Photos" : id === "all" ? "Rooms" : id === "discover" ? "People" : "Buzz"}
          </button>
        ))}
      </div>
      {s ? (
        <>
          <div className="text-[11px] font-medium text-muted">People</div>
          {foundPeople.length === 0 ? <p className="text-sm text-muted">No people match.</p> : null}
          {foundPeople.map((p) => (
            <a key={p.handle} href={`/u/${encodeURIComponent(p.handle)}`} className="block rounded-xl border border-line bg-panel p-3 text-sm">
              <div className="font-semibold">@{p.handle}</div>
              <div className="text-xs text-muted">{p.role}{p.line ? ` · ${p.line}` : ""}</div>
            </a>
          ))}
          <div className="text-[11px] font-medium text-muted">Spaces</div>
          {foundSpaces.length === 0 ? <p className="text-sm text-muted">No spaces match.</p> : null}
          {foundSpaces.map((sp) => (
            <button key={sp.id} type="button" className="block w-full rounded-xl border border-line bg-panel p-3 text-left text-sm" onClick={() => {
              try { sessionStorage.setItem("kilode-space", sp.username); } catch { /* ignore */ }
              window.dispatchEvent(new CustomEvent("kilode:space", { detail: sp.username }));
              window.dispatchEvent(new CustomEvent("kilode:goto", { detail: { screen: "spaces" } }));
            }}>
              <div className="font-semibold">{sp.name}</div>
              <div className="text-xs text-muted">@{sp.username} · {sp.category}{sp.location ? ` · ${sp.location}` : ""}</div>
            </button>
          ))}
          <div className="text-[11px] font-medium text-muted">Takes</div>
          {foundTakes.length === 0 ? <p className="text-sm text-muted">No takes match.</p> : null}
          {foundTakes.map((t) => (
            <a key={t.id} href={`/?tab=socials&take=${encodeURIComponent(t.id)}`} className="block rounded-xl border border-line bg-panel p-3 text-left text-sm">
              <div className="font-semibold">@{t.handle}</div>
              <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-[13px]">{t.body}</p>
            </a>
          ))}
          <div className="text-[11px] font-medium text-muted">Feeds</div>
          {posts.length === 0 ? <p className="rounded-xl border border-line bg-panel p-6 text-center text-sm text-muted">No posts match. Try another word.</p> : null}
          {posts.map((p) => (
            <button key={p.id} type="button" className="block w-full rounded-xl border border-line bg-panel p-3 text-left" onClick={() => { store.setOpenPost(p.id); onHome(); }}>
              <div className="font-semibold">{p.title}</div>
              <div className="text-xs text-muted">{p.category}</div>
            </button>
          ))}
          <div className="text-[11px] font-medium text-muted">Music</div>
          {tracks.length === 0 ? <p className="rounded-xl border border-line bg-panel p-6 text-center text-sm text-muted">No tracks match.</p> : null}
          {tracks.filter((t) => !!t?.id).map((t) => (
            <div key={t.id} className="rounded-xl border border-line bg-panel p-3 text-sm">
              {t.title} <span className="text-muted">· {t.artist}</span>
            </div>
          ))}
          <div className="text-[11px] font-medium text-muted">Jobs · Market · Rent</div>
          {jobs.length === 0 ? <p className="text-sm text-muted">No listings match.</p> : null}
          {jobs.map((j) => (
            <div key={j.id} className="rounded-xl border border-line bg-panel p-3 text-sm">
              <div className="font-semibold">{j.title}</div>
              <div className="text-xs text-muted">{j.kind} · {j.city} · {j.company}</div>
            </div>
          ))}
          <div className="text-[11px] font-medium text-muted">Rooms</div>
          {rooms.map((r) => (
            <button key={r.id} type="button" onClick={() => onHome(r.id)} className="block w-full rounded-xl border border-line bg-panel p-3 text-left text-sm">
              {r.name}
              <span className="block text-xs text-muted">{r.region}</span>
            </button>
          ))}
        </>
      ) : lane === "home" ? (
        <div className="act-board">
          {(
            [
              ["Socials", "Takes and people", Users, true, () => window.dispatchEvent(new CustomEvent("kilode:goto", { detail: { tab: "socials" } }))],
              ["Media", "News and stories", Newspaper, true, () => window.dispatchEvent(new CustomEvent("kilode:goto", { detail: { tab: "feeds" } }))],
              ["Buzz", "What is hot", Zap, false, () => setLane("trending")],
              ["People", "Who to follow", Users, false, () => setLane("discover")],
              ["Rooms", "Live talk", MessageSquare, false, () => setLane("all")],
              ["Photos", "The picture grid", ImageIcon, false, () => setLane("explore")],
              ["Music", "Artists and links", Music, false, () => window.dispatchEvent(new CustomEvent("kilode:goto", { detail: { tab: "music" } }))],
              ["Cinema", "Films and votes", Clapperboard, false, () => window.dispatchEvent(new CustomEvent("kilode:goto", { detail: { tab: "watch" } }))],
              ["Jobs", "Roles and applications", Briefcase, false, () => window.dispatchEvent(new CustomEvent("kilode:goto", { detail: { screen: "jobs" } }))],
              ["Market", "Buy and sell", Store, false, () => window.dispatchEvent(new CustomEvent("kilode:goto", { detail: { screen: "market" } }))],
              ["Downloads", "Files from Kilode", Download, false, () => window.dispatchEvent(new CustomEvent("kilode:goto", { detail: { tab: "downloads" } }))],
              ["Spaces", "Business pages", Building2, false, () => window.dispatchEvent(new CustomEvent("kilode:goto", { detail: { screen: "spaces" } }))],
              ["Messages", "Your inbox", InboxIcon, false, () => window.dispatchEvent(new CustomEvent("kilode:goto", { detail: { screen: "inbox" } }))],
              ["Saved", "Posts you kept", Bookmark, false, () => window.dispatchEvent(new CustomEvent("kilode:goto", { detail: { screen: "bookmarks" } }))],
            ] as const
          ).map(([title, body, Icon, wide, go]) => (
            <button key={title} type="button" className={`act-tile ${wide ? "wide" : ""}`} onClick={go}>
              <Icon className="size-4" />
              <strong>{title}</strong>
              <span>{body}</span>
            </button>
          ))}
        </div>
      ) : lane === "explore" ? (
        tiles.length === 0 && grid.length === 0 ? (
          <p className="text-sm text-muted">No photos yet. Pictures, videos, products, and places show up in this grid as soon as they are posted.</p>
        ) : (
          <div className="explore-grid">
            {grid.map((t) => (
              <a key={`${t.kind}-${t.id}`} href={t.href} className="explore-cell" aria-label={t.title}>
                {t.clip ? <video src={t.clip} poster={t.image || undefined} muted playsInline preload="metadata" /> : <img src={t.image} alt="" referrerPolicy="no-referrer" />}
                {t.video ? <span>▶</span> : null}
              </a>
            ))}
          </div>
        )
      ) : lane === "trending" ? (
        <TrendingPane store={store} onHome={onHome} />
      ) : lane === "discover" ? (
        <div className="space-y-2">
          {people.length === 0 ? <p className="text-sm text-muted">No new people yet. Follow a few and this fills up.</p> : null}
          {people.map((p) => (
            <a key={p.id || p.handle} href={`/u/${encodeURIComponent(p.handle)}`} className="block rounded-xl border border-line bg-panel p-3 text-sm">
              <div className="font-semibold">@{p.handle}</div>
              <div className="text-xs text-muted">{p.role}</div>
            </a>
          ))}
          <div className="pt-2 text-[11px] font-medium text-muted">Spaces</div>
          {foundSpaces.length === 0 ? <p className="text-sm text-muted">No public spaces yet.</p> : null}
          {foundSpaces.map((sp) => (
            <button key={sp.id} type="button" className="block w-full rounded-xl border border-line bg-panel p-3 text-left text-sm" onClick={() => {
              try { sessionStorage.setItem("kilode-space", sp.username); } catch { /* ignore */ }
              window.dispatchEvent(new CustomEvent("kilode:space", { detail: sp.username }));
            }}>
              <div className="font-semibold">{sp.name}</div>
              <div className="text-xs text-muted">{sp.category}{sp.location ? ` · ${sp.location}` : ""}</div>
            </button>
          ))}
        </div>
      ) : (
        <>
          <div className="text-[11px] font-medium text-muted">People</div>
          {people.slice(0, 6).map((p) => (
            <a key={p.id || p.handle} href={`/u/${encodeURIComponent(p.handle)}`} className="block rounded-xl border border-line bg-panel p-3 text-sm">
              <span className="font-semibold">@{p.handle}</span>
              <span className="text-xs text-muted"> · {p.role}</span>
            </a>
          ))}
          <div className="text-[11px] font-medium text-muted">Rooms</div>
          {rooms.slice(0, 6).map((r) => (
            <button key={r.id} type="button" onClick={() => onHome(r.id)} className="block w-full rounded-xl border border-line bg-panel p-3 text-left text-sm">
              {r.name}
              <span className="block text-xs text-muted">{r.region}</span>
            </button>
          ))}
        </>
      )}
    </Screen>
  );
}

function Profile({ store, onHome }: { store: Store; onHome?: (id?: string) => void }) {
  const [name, setName] = useState(store.handle);
  const [bio, setBio] = useState(store.bio);
  const [city, setCity] = useState(store.city);
  const [kind, setKind] = useState<AccountKind>(store.kind);
  const [stage, setStage] = useState(store.stage);
  const [genre, setGenre] = useState(store.genre);
  const [website, setWebsite] = useState(store.website);
  const [brand, setBrand] = useState(store.brand);
  const [face, setFace] = useState(store.face || KIND_FACE[store.kind]);
  const [gender, setGender] = useState("");
  const [photo, setPhoto] = useState("");
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const dirty = useRef(false);
  useEffect(() => {
    if (dirty.current) return;
    setName(store.handle);
    setBio(store.bio);
    setCity(store.city);
    setKind(store.kind);
    setStage(store.stage);
    setGenre(store.genre);
    setWebsite(store.website);
    setBrand(store.brand);
    setFace(store.face || KIND_FACE[store.kind]);
  }, [store.bio, store.brand, store.city, store.face, store.genre, store.handle, store.kind, store.stage, store.website]);
  useEffect(() => {
    void getProfile()
      .then((p) => {
        setGender(p.gender || "");
        setPhoto(p.photo || "");
      })
      .catch(() => undefined);
  }, []);
  if (!store.handle) {
    return (
      <Screen kicker="YOU" title="Me" sub="Join to own a profile. Guests can browse Feeds, Chat, Music, Cinema and Ads.">
        <JoinCta />
      </Screen>
    );
  }
  const mine = store.posts.filter((p) => !!p?.id && p.author === store.handle);
  const myTracks = store.tracks.filter((t) => !!t?.id && (t.author === store.handle || t.artist === store.handle));
  const kindLabel = ACCOUNT_KINDS.find((k) => k.id === kind)?.label ?? "Member";
  const kindStat =
    kind === "artist" ? ` · ${myTracks.length} tracks`
    : kind === "writer" ? ` · ${mine.length} stories`
    : kind === "member" || kind === "job_seeker" ? ` · ${mine.length} posts`
    : kind === "advertiser" || kind === "brand" ? ` · ${store.campaigns.filter((c) => c.status !== "rejected").length} ads`
    : "";
  return (
    <Screen kicker="ME · EDIT" title="Edit profile" sub="Face, handle, city, bio. Account type stays locked from join.">
      <button
        type="button"
        className="mb-3 text-[12px] font-semibold text-lime-2"
        onClick={() => window.dispatchEvent(new CustomEvent("kilode:goto", { detail: { screen: "dashboard" } }))}
      >
        ← Back to dashboard
      </button>
      <div className="raised mb-3 flex items-center gap-3 rounded-2xl p-4">
        <AvatarImg handle={store.handle || "Guest"} face={face} size={56} />
        <div>
          <div className="text-lg font-extrabold">{store.handle || "Sign in"}</div>
          <div className="text-[11px] text-lime-2">{kindLabel}{kindStat}</div>
        </div>
      </div>
      <div className="mb-3">
        <div className="mb-1 text-[11px] font-medium text-muted">Your avatar</div>
        <AvatarPicker value={face} handle={name} onChange={setFace} />
      </div>
      <input value={name} onChange={(e) => { dirty.current = true; setName(e.target.value); }} placeholder="Public username" className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-base" />
      <div>
        <div className="mb-1 text-[11px] font-medium text-muted">Account type (locked)</div>
        <p className="rounded-lg border border-line bg-panel px-3 py-2 text-base">
          {kindLabel}
          <span className="mt-0.5 block text-[10px] text-muted">Chosen at register. It does not change later.</span>
        </p>
      </div>
      {kind === "artist" ? (
        <>
          <input value={stage} onChange={(e) => setStage(e.target.value)} placeholder="Stage name" className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-base" />
          <input value={genre} onChange={(e) => setGenre(e.target.value)} placeholder="Genre (Afrobeats, Highlife…)" className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-base" />
        </>
      ) : null}
      {kind === "writer" ? (
        <>
          <input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Outlet / publication" className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-base" />
          <input value={genre} onChange={(e) => setGenre(e.target.value)} placeholder="Beats (politics, music, sport…)" className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-base" />
        </>
      ) : null}
      {kind === "advertiser" || kind === "brand" ? (
        <>
          <input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder={kind === "brand" ? "Company name" : "Brand name"} className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-base" />
          <input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://your-site.com" className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-base" />
        </>
      ) : null}
      {kind === "artist" ? (
        <input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="Spotify / Apple / Audiomack URL" className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-base" />
      ) : null}
      <input value={city} onChange={(e) => { dirty.current = true; setCity(e.target.value); }} placeholder="City (optional)" className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-base" />
      <label className="block">
        <span className="mb-1 block text-[11px] font-medium text-muted">Gender</span>
        <select value={gender} onChange={(e) => setGender(e.target.value)} className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-base">
          <option value="">Choose</option>
          <option value="woman">Woman</option>
          <option value="man">Man</option>
        </select>
      </label>
      <label className="block">
        <span className="mb-1 block text-[11px] font-medium text-muted">Profile photo</span>
        <input
          type="file"
          accept="image/*"
          className="w-full text-base"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            if (!file.type.startsWith("image/")) {
              setMsg("Pick a photo.");
              return;
            }
            const reader = new FileReader();
            reader.onload = () => {
              const src = String(reader.result || "");
              const img = new Image();
              img.onload = () => {
                const max = 256;
                const scale = Math.min(1, max / Math.max(img.width, img.height));
                const w = Math.max(1, Math.round(img.width * scale));
                const h = Math.max(1, Math.round(img.height * scale));
                const canvas = document.createElement("canvas");
                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext("2d");
                if (!ctx) return;
                ctx.drawImage(img, 0, 0, w, h);
                let q = 0.72;
                let out = canvas.toDataURL("image/jpeg", q);
                while (out.length > 90_000 && q > 0.4) {
                  q -= 0.08;
                  out = canvas.toDataURL("image/jpeg", q);
                }
                if (out.length > 120_000) {
                  setMsg("That photo is still too heavy. Try a smaller one.");
                  return;
                }
                setPhoto(out);
                setMsg("Photo ready. Tap Save profile.");
              };
              img.onerror = () => setMsg("Could not read that photo.");
              img.src = src;
            };
            reader.readAsDataURL(file);
          }}
        />
        {photo ? (
          <div className="mt-2 flex items-center gap-2">
            <img src={photo} alt="" className="size-14 rounded-full object-cover" />
            <button type="button" className="text-[11px] text-muted" onClick={() => setPhoto("")}>
              Remove photo
            </button>
          </div>
        ) : (
          <p className="mt-1 text-[10px] text-muted">From your phone. Saved small on your profile. Super admin can pause public photos.</p>
        )}
      </label>
      <label className="block">
        <span className="mb-1 block text-[11px] font-medium text-muted">Or paste an https photo link</span>
        <input value={photo.startsWith("data:") ? "" : photo} onChange={(e) => setPhoto(e.target.value)} placeholder="https://…" className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-base" />
      </label>
      <textarea value={bio} onChange={(e) => { dirty.current = true; setBio(e.target.value); }} maxLength={280} rows={3} placeholder="Bio" className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-base" />
      <p className="text-[10px] text-muted">{bio.length}/280</p>
      <button
        type="button"
        disabled={saving}
        className="btn-3d rounded-lg px-3 py-2 text-sm disabled:opacity-60"
        onClick={() => {
          setSaving(true);
          setMsg("");
          void store.rename(name, { bio, city, kind, stage, genre, website, brand, face, gender, photo }).then((r) => {
            setMsg(r.ok ? "Saved. Your bio is stored." : r.reason);
          }).finally(() => setSaving(false));
        }}
      >
        {saving ? "Saving" : "Save profile"}
      </button>
      {msg ? <p className={`text-[12px] font-semibold ${msg.startsWith("Saved") ? "text-lime-2" : "text-danger"}`}>{msg}</p> : null}
      {kind === "artist" ? (
        <p className="text-[11px] text-muted">Artists list tracks from Music → Add. We never host audio files.</p>
      ) : null}
      {kind === "advertiser" || kind === "brand" ? (
        <p className="text-[11px] text-muted">Place ads from Advertise. Staff approve after your crypto payment.</p>
      ) : null}
      {kind === "cinema" ? (
        <p className="text-[11px] text-muted">Submit movie YouTube URLs from Cinema. Staff approve before votes.</p>
      ) : null}
      <p className="mt-2 text-[11px] text-muted">Your posts, tracks, jobs and listings live on the Me dashboard.</p>
    </Screen>
  );
}

function Bookmarks({ store, onHome }: { store: Store; onHome: (id?: string) => void }) {
  const saved = store.posts.filter((p) => !!p?.id && store.savedPosts.includes(p.id));
  return (
    <Screen kicker="YOU" title="Bookmarks" sub="Rooms and posts you pin.">
      <div className="text-[11px] font-medium text-muted">Saved posts</div>
      {saved.length === 0 ? <p className="text-sm text-muted">Save a feed post from the article view.</p> : null}
      {saved.map((p) => (
        <button key={p.id} type="button" className="raised flex w-full gap-3 overflow-hidden rounded-xl text-left" onClick={() => { store.setOpenPost(p.id); onHome(); }}>
          {p.image ? <img src={p.image} alt="" className="h-16 w-20 object-cover" /> : <div className="h-16 w-20 bg-panel-3" />}
          <div className="min-w-0 py-2 pr-2">
            <div className="truncate text-sm font-semibold">{p.title}</div>
            <div className="text-[10px] text-muted">{p.category} · {fmtCount(p.views ?? 0)}</div>
          </div>
        </button>
      ))}
      <div className="text-[11px] font-medium text-muted">Rooms</div>
      {store.pins.length === 0 ? (
        <div className="rounded-2xl border border-line bg-panel px-5 py-8 text-center">
          <span className="mx-auto mb-3 grid size-10 place-items-center rounded-xl border border-line bg-panel-2 text-fg">
            <Bookmark className="size-4" />
          </span>
          <p className="text-base font-semibold">No bookmarks yet</p>
          <p className="mt-1 text-sm text-muted">Pin a room from Chat to find it fast.</p>
          <button type="button" className="btn-join mt-4 rounded-lg px-4 py-2 text-sm font-bold" onClick={() => onHome()}>
            Open chat
          </button>
        </div>
      ) : null}
      {store.pins.map((id) => (
        <div key={id} className="flex items-center justify-between rounded-xl border border-line bg-panel p-3">
          <button type="button" className="text-left text-sm font-semibold" onClick={() => onHome(id)}>
            {roomName(id)}
          </button>
          <button type="button" className="text-xs text-muted" onClick={() => store.unpin(id)}>
            Remove
          </button>
        </div>
      ))}
    </Screen>
  );
}

function Notes({ store }: { store: Store }) {
  const [rows, setRows] = useState<{ id: string; text: string; href?: string; ts: number }[]>([]);
  useEffect(() => {
    void listNotes()
      .then(setRows)
      .catch(() => setRows([]));
  }, [store.notes]);
  const noise = /handle set to|register or sign in|tick the box|could not complete|sign in first|accept the terms/i;
  const list = rows.filter((n) => n.text && !noise.test(n.text));
  return (
    <Screen kicker="YOU" title="Notifications" sub="Replies, comments, and DMs. Sign in to receive them.">
      {list.length === 0 ? (
        <div className="raised rounded-2xl p-6 text-center">
          <div className="text-sm font-bold">Inbox is quiet</div>
          <p className="mt-1 text-[12px] text-muted">When someone replies to your topic or DMs you, it lands here.</p>
        </div>
      ) : null}
      <div className="space-y-2">
        {list.map((n) => (
          <a key={n.id} href={n.href || "#"} className="raised flex items-start gap-3 rounded-2xl p-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-lime-2/15 text-lime-2">
              <Mail className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-semibold leading-snug">{n.text}</span>
              <span className="text-[10px] text-muted">{timeAgo(n.ts)}</span>
            </span>
          </a>
        ))}
      </div>
    </Screen>
  );
}

function Inbox() {
  const [to, setTo] = useState("");
  const [body, setBody] = useState("");
  const [msg, setMsg] = useState("");
  const [rows, setRows] = useState<{ id: string; from: string; to: string; body: string; ts: number }[]>(() => readBag("inbox", []));
  const [ready, setReady] = useState(() => readBag<{ id: string }[]>("inbox", []).length > 0);
  const [me, setMe] = useState(() => readBag("me", ""));
  function reload() {
    void listInbox()
      .then((next) => {
        setRows(next);
        writeBag("inbox", next);
        setReady(true);
      })
      .catch(() => setReady(true));
    void getProfile()
      .then((p) => {
        const handle = (p.handle || "").toLowerCase();
        setMe(handle);
        writeBag("me", handle);
      })
      .catch(() => undefined);
  }
  useEffect(() => {
    reload();
  }, []);
  const people = new Map<string, { handle: string; last: string; ts: number }>();
  for (const r of rows) {
    const other = r.from.toLowerCase() === me || r.from.toLowerCase() === "kilode africa" ? r.to : r.from;
    const key = other.toLowerCase();
    const cur = people.get(key);
    if (!cur || r.ts > cur.ts) people.set(key, { handle: other, last: r.body, ts: r.ts });
  }
  const threads = [...people.values()].sort((a, b) => b.ts - a.ts);
  const open = to.trim();
  const thread = open
    ? rows
        .filter((r) => r.from.toLowerCase() === open.toLowerCase() || r.to.toLowerCase() === open.toLowerCase())
        .sort((a, b) => a.ts - b.ts)
    : [];
  return (
    <Screen kicker="YOU" title="Messages" sub="Tap a person. Write back. No username box.">
      {ready && threads.length === 0 ? <p className="text-sm text-muted">No messages yet. Message someone from Socials.</p> : null}
      <div className="space-y-2">
        {threads.map((p) => (
          <button
            key={p.handle}
            type="button"
            className={`flex w-full items-center gap-2 rounded-2xl border px-3 py-2 text-left ${open.toLowerCase() === p.handle.toLowerCase() ? "border-lime-2 bg-lime-2/10" : "border-line bg-panel"}`}
            onClick={() => {
              setTo(p.handle);
              setMsg("");
            }}
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-panel-3 text-[12px] font-bold">{p.handle.slice(0, 1).toUpperCase()}</span>
            <span className="min-w-0">
              <span className="block truncate text-[13px] font-bold">@{p.handle}</span>
              <span className="block truncate text-[11px] text-muted">{p.last}</span>
            </span>
          </button>
        ))}
      </div>
      {open ? (
        <div className="mt-3 rounded-2xl border border-line bg-panel p-3">
          <div className="text-[12px] font-bold">@{open}</div>
          <div className="mt-2 space-y-2">
            {thread.map((r) => (
              <div key={r.id} className={`rounded-xl px-2.5 py-1.5 text-[13px] ${r.from.toLowerCase() === me ? "bg-lime-2/10" : "bg-panel-2"}`}>
                <div className="text-[10px] text-muted">{r.from}</div>
                <p>{r.body}</p>
              </div>
            ))}
          </div>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={2} placeholder={`Reply to @${open}`} className="mt-2 w-full rounded-xl border border-line bg-bg px-3 py-2 text-base" />
          {msg ? <p className="mt-1 text-[12px] text-muted">{msg}</p> : null}
          <button
            type="button"
            className="btn-join mt-2 rounded-full px-4 py-2 text-[12px] font-bold"
            onClick={() => {
              void sendDm({ data: { to: open, body } }).then((r) => {
                if (r.ok) {
                  setBody("");
                  setMsg("Sent.");
                  reload();
                } else setMsg(r.reason);
              });
            }}
          >
            Send
          </button>
        </div>
      ) : null}
    </Screen>
  );
}

function Teams({ store }: { store: Store; onHome?: (id?: string) => void }) {
  const [name, setName] = useState("");
  const [find, setFind] = useState("");
  const [err, setErr] = useState("");
  const [note, setNote] = useState("");
  const [askFor, setAskFor] = useState("");
  const [askNote, setAskNote] = useState("");
  const [openId, setOpenId] = useState("");
  const [desk, setDesk] = useState<{ name: string; owner: boolean; inside: boolean; members: string[]; asks: { id: string; handle: string; note: string }[]; notes: { id: string; handle: string; body: string; ts: number }[] } | null>(null);
  const [line, setLine] = useState("");
  const mine = store.teams.filter((t) => (t.members ?? [])[0] === store.handle).length;
  function loadDesk(id: string) {
    setOpenId(id);
    void teamDesk({ data: id }).then((d) => setDesk(d)).catch(() => setDesk(null));
  }
  const list = store.teams.filter((t) => !!t?.id && t.name.toLowerCase().includes(find.trim().toLowerCase()));
  return (
    <Screen kicker="CREW" title="Groups" sub="Private. You ask, they approve, then you talk inside the group.">
      {!store.handle ? (
        <JoinCta />
      ) : (
        <>
          <p className="mb-2 text-[12px] text-lime-2">You made {mine}/3.</p>
          <input value={find} onChange={(e) => setFind(e.target.value)} placeholder="Search groups" className="mb-2 w-full rounded-xl border border-line bg-panel px-3 py-2 text-base" />
          <div className="flex gap-2">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Group name" className="flex-1 rounded-xl border border-line bg-panel px-3 py-2 text-base" />
            <button
              type="button"
              className="btn-join rounded-full px-4 text-sm font-bold"
              onClick={() => {
                setErr("");
                if (mine >= 3) {
                  setErr("Max 3 groups you create.");
                  return;
                }
                store.createTeam(name);
                setName("");
              }}
            >
              Create
            </button>
          </div>
          {err ? <p className="mt-2 text-sm text-danger">{err}</p> : null}
          {note ? <p className="mt-2 text-sm text-lime-2">{note}</p> : null}
          {list.length === 0 ? <p className="mt-3 text-sm text-muted">No groups yet.</p> : null}
          {list.map((t) => {
            const members = t.members ?? [];
            const owner = members[0] === store.handle;
            const inside = owner || members.some((m) => m.toLowerCase() === store.handle.toLowerCase());
            return (
              <div key={t.id} className="mt-3 rounded-2xl border border-line bg-panel p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-[15px] font-extrabold">{t.name}</div>
                    <div className="text-[11px] text-muted">{members.length}/40 · {owner ? "You made this" : inside ? "You're in" : "Ask to join"}</div>
                  </div>
                  <button type="button" className="text-[11px] text-muted" onClick={() => {
                    const reason = window.prompt("Why report this group?")?.trim();
                    if (!reason) return;
                    void reportPost({ data: { postId: `group:${t.id}`, reason: reason.slice(0, 280) } }).then(() => setNote("Report sent."));
                  }}>Report</button>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {inside ? (
                    <button type="button" className="btn-join rounded-full px-3 py-1.5 text-[12px] font-bold" onClick={() => loadDesk(t.id)}>Open</button>
                  ) : (
                    <button type="button" className="rounded-full border border-lime-2/50 px-3 py-1.5 text-[12px] font-bold text-lime-2" onClick={() => { setAskFor(t.id); setAskNote(""); }}>Ask to join</button>
                  )}
                  {inside && !owner ? (
                    <button type="button" className="rounded-full border border-line px-3 py-1.5 text-[12px]" onClick={() => void leaveTeam({ data: t.id }).then(() => setNote("You left."))}>Leave</button>
                  ) : null}
                </div>
                {askFor === t.id ? (
                  <div className="mt-2">
                    <textarea value={askNote} onChange={(e) => setAskNote(e.target.value)} rows={2} placeholder="Why should they let you in?" className="w-full rounded-xl border border-line bg-bg px-3 py-2 text-base" />
                    <button type="button" className="btn-join mt-1 rounded-full px-3 py-1.5 text-[12px] font-bold" onClick={() => {
                      void requestJoinTeam({ data: { id: t.id, note: askNote } }).then((r) => {
                        setNote(r.ok ? (r.status === "in" ? "You are already in." : "Asked. They have to approve.") : r.reason);
                        setAskFor("");
                      });
                    }}>Send ask</button>
                  </div>
                ) : null}
                {openId === t.id && desk ? (
                  <div className="mt-3 border-t border-line pt-2">
                    {desk.owner && desk.asks.length > 0 ? (
                      <div className="mb-2 space-y-2">
                        {desk.asks.map((a) => (
                          <div key={a.id} className="rounded-xl bg-panel-2 p-2">
                            <div className="text-[12px] font-bold">@{a.handle}</div>
                            <p className="text-[12px] text-muted">{a.note}</p>
                            <div className="mt-1 flex gap-2">
                              <button type="button" className="text-[11px] font-bold text-lime-2" onClick={() => void approveTeamAsk({ data: { id: a.id, accept: true } }).then(() => loadDesk(t.id))}>Approve</button>
                              <button type="button" className="text-[11px] text-muted" onClick={() => void approveTeamAsk({ data: { id: a.id, accept: false } }).then(() => loadDesk(t.id))}>No</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                    {desk.inside ? (
                      <>
                        {desk.notes.length === 0 ? <p className="text-[12px] text-muted">No notes in this group yet.</p> : null}
                        {desk.notes.map((n) => (
                          <div key={n.id} className="mt-1 text-[12px]"><b>@{n.handle}</b> <span className="text-muted">{n.body}</span></div>
                        ))}
                        <div className="mt-2 flex gap-2">
                          <input value={line} onChange={(e) => setLine(e.target.value)} placeholder="Say something in the group" className="flex-1 rounded-full border border-line bg-bg px-3 py-2 text-base" />
                          <button type="button" className="btn-join rounded-full px-3 text-[12px] font-bold" onClick={() => {
                            void postTeamNote({ data: { id: t.id, body: line } }).then((r) => {
                              if (!r.ok) setErr(r.reason);
                              else {
                                setLine("");
                                loadDesk(t.id);
                              }
                            });
                          }}>Send</button>
                        </div>
                      </>
                    ) : <p className="text-[12px] text-muted">Wait until they approve you.</p>}
                  </div>
                ) : null}
              </div>
            );
          })}
        </>
      )}
    </Screen>
  );
}

function Badges({ store }: { store: Store }) {
  return (
    <Screen kicker="YOU" title="Badges" sub="Earn them by using Kilode. No pay-to-win.">
      <div className="grid grid-cols-2 gap-2">
      {store.badges.map((b) => (
        <div key={b.id} className={`raised rounded-2xl p-4 ${b.on ? "" : "opacity-50"}`}>
          <div className="text-2xl">{b.on ? "🏅" : "🔒"}</div>
          <div className="mt-1 text-sm font-bold">{b.label}</div>
          <div className="text-[10px] text-muted">{b.on ? "Unlocked" : "Locked"}</div>
        </div>
      ))}
      </div>
    </Screen>
  );
}

function Board({ store }: { store: Store }) {
  const rows = Object.entries(store.scores).sort((a, b) => b[1] - a[1]);
  return (
    <Screen kicker="LIVE" title="Leaderboard" sub="Most chat messages this window.">
      {rows.length === 0 ? <p className="text-sm text-muted">Chat on the server to appear here.</p> : null}
      {rows.map(([name, n], i) => (
        <div key={name} className="raised mb-2 flex items-center gap-3 rounded-2xl p-3">
          <AvatarImg handle={name} size={28} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-bold">{i + 1}. @{name}</div>
            <div className="text-[10px] text-muted">{n} messages</div>
          </div>
        </div>
      ))}
    </Screen>
  );
}

const AD_STEPS = ["Choose", "Details", "Creative", "Duration", "Review", "Pay"] as const;

function Ads({ store }: { store: Store }) {
  const [step, setStep] = useState(0);
  const [picked, setPicked] = useState(false);
  const [showMine, setShowMine] = useState(false);
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [link, setLink] = useState("");
  const [image, setImage] = useState("");
  const [shotPx, setShotPx] = useState("");
  const [shotFit, setShotFit] = useState(true);
  const [forceSize, setForceSize] = useState(false);
  const [video, setVideo] = useState("");
  const [kind, setKind] = useState<AdKind>("image-text");
  const [place, setPlace] = useState<AdPlacement>("board");
  const [days, setDays] = useState<number>(7);
  const [coin, setCoin] = useState("usdt");
  const [payWith, setPayWith] = useState<PayProvider>("paystack");
  const [gate, setGate] = useState({ paystack: false, flutterwave: false, nowpayments: false, cryptoEnabled: true, ngnPerUsd: 1600 });
  const [txHash, setTxHash] = useState("");
  const adsPay = !usePublicSite().site.payOff.split(",").includes("ads");
  const [amount, setAmount] = useState("");
  const [agree, setAgree] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState<string | null>(null);
  const [reviewDone, setReviewDone] = useState(false);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [paidSlots, setPaidSlots] = useState<Record<string, boolean>>({});
  const draftReady = useRef(false);
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("kilode-ad-wizard");
      if (raw) {
        const d = JSON.parse(raw) as Partial<{ step: number; name: string; note: string; link: string; image: string; video: string; kind: AdKind; place: AdPlacement; days: number; payWith: PayProvider; agree: boolean; picked: boolean }>;
        if (typeof d.step === "number") setStep(Math.min(5, Math.max(0, d.step)));
        if (d.name) setName(d.name);
        if (d.note) setNote(d.note);
        if (d.link) setLink(d.link);
        if (d.image && d.image.startsWith("http")) setImage(d.image);
        if (d.video) setVideo(d.video);
        if (d.kind) setKind(d.kind);
        if (d.place) setPlace(d.place);
        if (d.days) setDays(d.days);
        if (d.payWith) setPayWith(d.payWith);
        if (d.agree) setAgree(true);
        if (d.picked) setPicked(true);
      }
    } catch { /* ignore */ }
    draftReady.current = true;
  }, []);
  useEffect(() => {
    if (!draftReady.current) return;
    try {
      sessionStorage.setItem("kilode-ad-wizard", JSON.stringify({
        step, name, note, link, image: image.startsWith("http") ? image : "", video, kind, place, days, payWith, agree, picked,
      }));
    } catch { /* ignore */ }
  }, [step, name, note, link, image, video, kind, place, days, payWith, agree, picked]);
  useEffect(() => {
    void listAdCatalog()
      .then((c) => {
        setPrices(c.prices);
        setPaidSlots(c.paidSlots || {});
      })
      .catch(() => undefined);
    void listPayMethods()
      .then((m) => setGate({ paystack: m.paystack, flutterwave: m.flutterwave, nowpayments: m.nowpayments, cryptoEnabled: m.cryptoEnabled, ngnPerUsd: m.ngnPerUsd }))
      .catch(() => undefined);
  }, []);
  const mine = store.campaigns.filter((c) => !!c?.id && (c.status !== "approved" || c.expiresAt));
  const size = AD_SIZES[place] ?? AD_SIZES.board;
  const slot = AD_PLACEMENTS.find((p) => p.id === place);
  const usd = slotCharge(prices[place] ?? slot?.usd ?? 40, days);
  const slotPaid = paidSlots[place] !== false;
  const mustPay = adsPay && slotPaid;
  const ngn = Math.round(usd * (gate.ngnPerUsd || 0));
  const needsImage = kind === "image" || kind === "image-text";
  const needsVideo = kind === "video" || kind === "video-text";
  const needsCopy = kind === "text" || kind === "image-text" || kind === "video-text";
  useEffect(() => {
    if (!needsImage || !image) {
      setShotPx("");
      setShotFit(true);
      return;
    }
    const pic = new Image();
    pic.onload = () => {
      setShotPx(`${pic.naturalWidth} × ${pic.naturalHeight}`);
      setShotFit(creativeFits(pic.naturalWidth, pic.naturalHeight, size.label));
    };
    pic.onerror = () => {
      setShotPx("");
      setShotFit(true);
    };
    pic.src = image;
  }, [image, needsImage, size.label]);

  async function onFile(file: File | undefined) {
    setErr("");
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setErr("That file is not an image. Use JPG or PNG.");
      setImage("");
      return;
    }
    if (file.size > 2_000_000) {
      setErr("Keep the image under 2MB.");
      setImage("");
      return;
    }
    const data = await compressImage(file);
    setForceSize(false);
    setImage(data);
  }

  function detailsProblem() {
    if (name.trim().length < 2) return "Add a campaign name.";
    if (link.trim() && !safeHttpUrl(link)) return "Destination must start with https://";
    return "";
  }
  function creativeProblem() {
    if (needsImage && !image) return `Add an image. This slot wants ${size.label}.`;
    if (needsImage && image && !shotFit && !forceSize) return `This image is ${shotPx || "a different size"}. This slot wants ${size.label}. Replace it, or tick use this size.`;
    if (needsVideo && !video.trim()) return "Add a YouTube link. Kilode does not host the video file.";
    if (needsVideo && video.trim() && !youtubeId(video) && !safeHttpUrl(video)) return "Use a YouTube link or an https URL.";
    if (needsCopy && note.trim().length < 2) return "Add the line of copy.";
    return "";
  }
  function goNext() {
    if (step === 0 && !picked) {
      setErr("Choose one placement.");
      return;
    }
    if (step === 1) {
      const problem = detailsProblem();
      if (problem) { setErr(problem); return; }
    }
    if (step === 2) {
      const problem = creativeProblem();
      if (problem) { setErr(problem); return; }
    }
    if (step === 4 && !agree) {
      setErr("Tick the ads terms before payment.");
      return;
    }
    setErr("");
    setStep((n) => Math.min(5, n + 1));
  }
  function clearDraft() {
    try { sessionStorage.removeItem("kilode-ad-wizard"); } catch { /* ignore */ }
  }
  function publish(paid?: { reference: string; provider: string; amountNgn: number }) {
    const img = needsImage ? (image.startsWith("data:") ? image : safeHttpUrl(image)) : undefined;
    void Promise.resolve(store.saveAd(name, note, {
      placement: place,
      txHash: paid?.reference || "",
      amount: paid ? String(paid.amountNgn || usd) : "0",
      coin: paid?.provider || "",
      link: safeHttpUrl(link),
      image: img,
      video: needsVideo ? youtubeId(video) || safeHttpUrl(video) : undefined,
      kind,
      days,
    })).then((ok) => {
      if (!ok) {
        setErr("Kilode did not accept this campaign. If you paid, do not start a second payment. Check Your ads, or try Go live with the same reference.");
        if (paid) {
          setTxHash(paid.reference);
          setCoin(paid.provider);
          setAmount(String(paid.amountNgn || usd));
        }
        return;
      }
      setReviewDone(!paid);
      setDone(name.trim());
      setName("");
      setNote("");
      setLink("");
      setImage("");
      setVideo("");
      setTxHash("");
      setErr("");
      setPicked(false);
      setStep(0);
      clearDraft();
    });
  }

  if (!store.handle) {
    return (
      <Screen kicker="ADS" title="Place an ad" sub="Join as an Ads Poster, then walk the steps. Payment is checked by Kilode, not by the success page.">
        <JoinCta />
      </Screen>
    );
  }
  if (!canKind(store.kind, "ads.submit")) {
    return (
      <Screen kicker="ADS" title="Ads Poster accounts only" sub="You registered as a different type. Ask Kilode support if you need a type change.">
        <p className="text-sm text-muted">Browse live ads on the Ads tab. To place one, you need an Ads Poster or Brand account.</p>
      </Screen>
    );
  }
  if (done) {
    return (
      <Screen kicker="ADS" title={reviewDone ? "With staff" : "Submitted"} sub={reviewDone ? "This slot is free. Staff approve it before it shows." : "Kilode accepted the payment reference. The creative is on the slot you bought."}>
        <div className="ad-card">
          <h3>{done}</h3>
          <p>{reviewDone ? "Status: pending review. It is not live yet." : "Status: live for the days you bought, unless staff take it down."}</p>
          <p>Slot: {slot?.label}. {days} days. {mustPay ? `$${usd}` : "Free slot"}.</p>
        </div>
        <button type="button" className="ad-next" onClick={() => setDone(null)}>Place another</button>
        <CampaignList rows={mine} />
      </Screen>
    );
  }

  return (
    <Screen kicker="ADS" title={showMine ? "Your ads" : "Place an ad"} sub={showMine ? "Only campaigns Kilode has stored on this account." : `${AD_STEPS[step]} · step ${step + 1} of ${AD_STEPS.length}`}>
      <div className="ad-top">
        <button type="button" className={showMine ? "" : "on"} onClick={() => setShowMine(false)}>Place</button>
        <button type="button" className={showMine ? "on" : ""} onClick={() => setShowMine(true)}>Your ads</button>
      </div>
      {showMine ? <CampaignList rows={mine} /> : (
        <>
          <div className="ad-rail" aria-label="Ad steps">
            {AD_STEPS.map((label, i) => (
              <button key={label} type="button" className={i === step ? "on" : i < step ? "done" : ""} disabled={i > step} onClick={() => { if (i <= step) { setErr(""); setStep(i); } }} title={label}>{i + 1}</button>
            ))}
          </div>
          <p className="ad-note">{AD_STEPS[step]}</p>
          {step === 0 ? (
            <div className="ad-list">
              {AD_PLACEMENTS.map((p) => {
                const on = picked && place === p.id;
                const spec = AD_SIZES[p.id];
                return (
                  <button key={p.id} type="button" className={`ad-card ${on ? "on" : ""}`} onClick={() => { setPlace(p.id); setPicked(true); setErr(""); }}>
                    <strong>{p.label}</strong>
                    <span>${prices[p.id] ?? p.usd} · {spec.label}</span>
                    <em>{p.hint}</em>
                  </button>
                );
              })}
            </div>
          ) : null}
          {step === 1 ? (
            <div className="ad-list">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Campaign name" className="ad-field" />
              <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="Destination URL, https:// (optional)" className="ad-field" />
              <p className="ad-note">Name is required. A link must be https. Copy comes on the next step if this creative type needs it.</p>
            </div>
          ) : null}
          {step === 2 ? (
            <div className="ad-list">
              <div className="ad-pills">
                {AD_KINDS.map((k) => (
                  <button key={k.id} type="button" className={kind === k.id ? "on" : ""} onClick={() => setKind(k.id)}>{k.label}</button>
                ))}
              </div>
              <p className="ad-note">{slot?.label} · {size.label}. {size.hint}</p>
              {needsImage ? (
                <div className="ad-card">
                  <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => void onFile(e.target.files?.[0])} />
                  <input value={image.startsWith("data:") ? "" : image} onChange={(e) => setImage(e.target.value)} placeholder="Or paste an https image" className="ad-field" />
                  {image ? <img src={image} alt="" className="ad-preview" /> : null}
                  {shotPx ? <p className="ad-note">Measured {shotPx}. Recommended {size.label}.</p> : null}
                  {image && !shotFit ? (
                    <label className="ad-note">
                      <input type="checkbox" checked={forceSize} onChange={(e) => setForceSize(e.target.checked)} /> Use this size anyway
                    </label>
                  ) : null}
                  {image ? <button type="button" className="ad-text" onClick={() => setImage("")}>Remove image</button> : null}
                </div>
              ) : null}
              {needsVideo ? <input value={video} onChange={(e) => setVideo(e.target.value)} placeholder="YouTube URL" className="ad-field" /> : null}
              {needsCopy ? <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="Headline / short copy" className="ad-field" /> : null}
            </div>
          ) : null}
          {step === 3 ? (
            <div className="ad-list">
              <div className="ad-pills">
                {AD_DAYS.map((d) => (
                  <button key={d} type="button" className={days === d ? "on" : ""} onClick={() => setDays(d)}>{d} days</button>
                ))}
              </div>
              <div className="ad-card">
                <strong>${usd}</strong>
                <em>This is the slot price from Kilode. Changing the days does not change what you pay. It only changes how long the ad stays up. If you pay today it runs until {new Date(runEnd(Date.now(), days)).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}. About ₦{ngn.toLocaleString("en-NG")} before the provider's own fee.</em>
              </div>
            </div>
          ) : null}
          {step === 4 ? (
            <div className="ad-card">
              <p><b>Campaign</b> {name.trim()}</p>
              <p><b>Slot</b> {slot?.label}</p>
              <p><b>Creative</b> {AD_KINDS.find((k) => k.id === kind)?.label} · {shotPx || size.label}</p>
              {note.trim() ? <p><b>Copy</b> {note.trim()}</p> : null}
              {link.trim() ? <p><b>Link</b> {link.trim()}</p> : null}
              {image ? <img src={image} alt="" className="ad-preview" /> : null}
              <p><b>Run</b> {days} days</p>
              <p><b>Total</b> {mustPay ? `$${usd}` : "Free, then staff review"}</p>
              <div className="ad-pills">
                <button type="button" onClick={() => setStep(0)}>Edit slot</button>
                <button type="button" onClick={() => setStep(1)}>Edit details</button>
                <button type="button" onClick={() => setStep(2)}>Edit creative</button>
                <button type="button" onClick={() => setStep(3)}>Edit days</button>
              </div>
              <label className="ad-note">
                <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} /> I agree to the <a href="/ads-policy" target="_blank" rel="noreferrer">Ads terms</a>. It goes live only after Kilode confirms payment.
              </label>
            </div>
          ) : null}
          {step === 5 ? (
            <div className="ad-list">
              <div className="ad-pills">
                {(["paystack", "flutterwave", "nowpayments"] as const).filter((id) => id !== "nowpayments" || gate.cryptoEnabled).map((id) => (
                  <button key={id} type="button" className={payWith === id ? "on" : ""} onClick={() => { setPayWith(id); setTxHash(""); }}>
                    {id === "nowpayments" ? "Crypto" : id === "paystack" ? "Paystack" : "Flutterwave"}
                  </button>
                ))}
              </div>
              {mustPay ? (
                <GatewayPay
                  provider={payWith}
                  kind="ad"
                  purpose={place}
                  usd={usd}
                  rate={gate.ngnPerUsd}
                  ready={payWith === "paystack" ? gate.paystack : payWith === "flutterwave" ? gate.flutterwave : gate.nowpayments}
                  onPaid={(paid) => {
                    if (!agree || name.trim().length < 2) {
                      setTxHash(paid.reference);
                      setCoin(paid.provider);
                      setAmount(String(paid.amountNgn || usd));
                      setErr("Payment came back, but the name or terms are missing. Fix them, then tap Go live. Do not pay again.");
                      return;
                    }
                    publish(paid);
                  }}
                />
              ) : !slotPaid ? (
                <button type="button" className="ad-next" onClick={() => publish()}>Submit for staff review</button>
              ) : <p className="ad-note">Payment is turned off for ads right now. This campaign cannot go live.</p>}
              {txHash.startsWith("kld_") ? (
                <button type="button" className="ad-next" onClick={() => publish({ reference: txHash, provider: coin, amountNgn: Number(amount) || 0 })}>Go live with this payment</button>
              ) : null}
              <p className="ad-note">Closing the payment window does not mark this ad as paid. Kilode only continues after the provider confirms the reference.</p>
            </div>
          ) : null}
          {err ? <p className="ad-err" role="alert">{err}</p> : null}
          {step < 5 ? (
            <div className="ad-nav">
              {step > 0 ? <button type="button" onClick={() => { setErr(""); setStep((n) => n - 1); }}>Back</button> : <span />}
              <button type="button" className="ad-next" onClick={goNext}>Continue</button>
            </div>
          ) : (
            <button type="button" className="ad-text" onClick={() => setStep(4)}>Back to review</button>
          )}
        </>
      )}
    </Screen>
  );
}

function CampaignList({ rows }: { rows: { id: string; name: string; status: string; placement: string; expiresAt?: number; days?: number; views?: number; image?: string }[] }) {
  if (!rows.length) return <p className="ad-note">No campaigns on this account yet. An unpaid draft is only in this browser until you pay or submit.</p>;
  return (
    <div className="ad-list">
      {rows.map((c) => (
        <div key={c.id} className="ad-card ad-row">
          {c.image ? <img src={c.image} alt="" /> : <b>AD</b>}
          <span>
            <strong>{c.name}</strong>
            <em className={`ad-status ${c.status}`}>{c.status === "approved" ? "Live" : c.status} · {c.placement}</em>
            <em>{c.expiresAt ? timeLeftLabel(c.expiresAt) : `${c.days ?? 7} days`} · {fmtCount(c.views ?? 0)} views</em>
          </span>
        </div>
      ))}
    </div>
  );
}

function AdsQueuePanel({ store }: { store: Store }) {
  const [status, setStatus] = useState("paid");
  const [q, setQ] = useState("");
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [rows, setRows] = useState<{ id: string; name: string; note: string; placement: string; status: string; amount: string; txHash: string; coin: string; kind: string; image: string; days: number; expiresAt: number; ts: number; matchNote?: string }[]>([]);
  const [matchMsg, setMatchMsg] = useState("");
  const [matching, setMatching] = useState(false);
  function load(next = offset, st = status, query = q) {
    void listAdsQueue({ data: { status: st === "all" ? "" : st, q: query, offset: next } })
      .then((r) => {
        setRows(r.rows);
        setTotal(r.total);
        setOffset(r.offset);
      })
      .catch(() => {
        setRows([]);
        setTotal(0);
      });
  }
  useEffect(() => {
    load(0, status, q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);
  return (
    <div className="md:col-span-2 space-y-2">
      <div className="flex flex-wrap items-end gap-2">
        <div>
          <div className="text-[10px] font-bold tracking-[0.16em] text-lime-2">ADS QUEUE</div>
          <p className="text-[11px] text-muted">{total} in this filter. 40 per page. 5,000 at once would freeze the console — page them.</p>
        </div>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setOffset(0);
          }}
          className="rounded-lg border border-line bg-panel px-2 py-1.5 text-xs"
        >
          <option value="paid">Paid (waiting)</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="all">All</option>
        </select>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name or tx"
          className="min-w-[140px] flex-1 rounded-lg border border-line bg-panel px-2 py-1.5 text-xs"
        />
        <button type="button" className="btn-3d rounded-lg px-2 py-1.5 text-xs" onClick={() => load(0, status, q)}>
          Search
        </button>
        <button
          type="button"
          disabled={matching}
          className="btn-join rounded-lg px-2 py-1.5 text-xs font-bold"
          onClick={() => {
            setMatching(true);
            void matchAdPayments()
              .then((r) => {
                setMatchMsg(r.ok ? `Checked ${r.n} pending · ${r.paid} confirmed on chain` : "Match failed");
                load(0, status, q);
              })
              .finally(() => setMatching(false));
          }}
        >
          {matching ? "Matching…" : "Match payments"}
        </button>
      </div>
      {matchMsg ? <p className="text-[11px] text-lime-2">{matchMsg}</p> : null}
      {rows.length === 0 ? <p className="text-sm text-muted">Nothing in this page.</p> : null}
      {rows.map((c) => (
        <div key={c.id} className="rounded-xl border border-line bg-panel p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="font-semibold">{c.name}</div>
              <div className="text-xs text-muted">
                {c.status} · {(c.coin || "").toUpperCase()} {c.amount || ""} · {c.placement} · {c.days} days
                {c.kind ? ` · ${c.kind}` : ""}
              </div>
              {c.note ? <p className="mt-1 text-sm">{c.note}</p> : null}
              {c.txHash ? <p className="mt-1 break-all text-[11px] text-muted">tx {c.txHash}</p> : null}
              {c.matchNote ? <p className="mt-1 text-[11px] text-lime-2">{c.matchNote}</p> : null}
              {c.expiresAt ? <p className="text-[10px] text-muted">ends {new Date(c.expiresAt).toLocaleDateString()}</p> : null}
            </div>
            {c.image ? <img src={c.image} alt="" className="h-14 w-16 rounded object-cover" /> : null}
            <div className="flex flex-wrap gap-1">
              <select
                className="rounded border border-line bg-bg px-1 py-1 text-[11px]"
                defaultValue={String(c.days || 7)}
                onChange={(e) => {
                  store.patchAd(c.id, { days: Number(e.target.value) });
                  load(offset, status, q);
                }}
              >
                {[1, 3, 7, 14, 30, 60].map((d) => (
                  <option key={d} value={d}>
                    {d}d from today
                  </option>
                ))}
              </select>
              <button type="button" className="rounded border border-line px-2 py-1 text-xs" onClick={() => { store.patchAd(c.id, { status: "paid" }); load(offset, status, q); }}>
                Mark paid
              </button>
              <button
                type="button"
                className="rounded border border-line px-2 py-1 text-xs"
                onClick={() => {
                  void matchOneAd({ data: { id: c.id } }).then((r) => {
                    setMatchMsg(r.ok ? r.match.reason : r.reason);
                    load(offset, status, q);
                  });
                }}
              >
                Match tx
              </button>
              <button type="button" className="rounded border border-line px-2 py-1 text-xs" onClick={() => { store.patchAd(c.id, { status: "approved" }); load(offset, status, q); }}>
                Approve
              </button>
              <button type="button" className="rounded border border-line px-2 py-1 text-xs" onClick={() => { store.patchAd(c.id, { placement: "chat" }); load(offset, status, q); }}>
                Chat stream
              </button>
              <button type="button" className="rounded border border-line px-2 py-1 text-xs" onClick={() => { store.patchAd(c.id, { placement: "chat-pin" }); load(offset, status, q); }}>
                Pin in chat
              </button>
              <button type="button" className="rounded border border-line px-2 py-1 text-xs" onClick={() => { store.patchAd(c.id, { placement: "board" }); load(offset, status, q); }}>
                Advert grid
              </button>
              <button type="button" className="rounded border border-line px-2 py-1 text-xs text-danger" onClick={() => { store.patchAd(c.id, { status: "rejected" }); load(offset, status, q); }}>
                Reject
              </button>
            </div>
          </div>
        </div>
      ))}
      <div className="flex gap-2">
        <button type="button" disabled={offset <= 0} className="rounded border border-line px-2 py-1 text-xs disabled:opacity-40" onClick={() => load(Math.max(0, offset - 40), status, q)}>
          Prev
        </button>
        <button type="button" disabled={offset + 40 >= total} className="rounded border border-line px-2 py-1 text-xs disabled:opacity-40" onClick={() => load(offset + 40, status, q)}>
          Next
        </button>
        <span className="pt-1 text-[10px] text-muted">
          {total ? offset + 1 : 0}–{Math.min(offset + rows.length, total)} of {total}
        </span>
      </div>
    </div>
  );
}

function SocialLimits() {
  const [secs, setSecs] = useState(15);
  const [sounds, setSoundsOn] = useState(true);
  const [note, setNote] = useState("");
  useEffect(() => {
    void getPublicSite().then((s) => {
      setSecs(s.takeVideoSeconds || 15);
      setSoundsOn(s.soundsOn !== false);
    }).catch(() => undefined);
  }, []);
  return (
    <div className="rounded-xl border border-line bg-panel p-3">
      <div className="text-[11px] font-medium text-muted">Social controls</div>
      <p className="mt-1 text-[12px] text-muted">Take videos longer than this are trimmed. Members can pick the part, or Kilode keeps the start.</p>
      <div className="mt-2 flex flex-wrap gap-1">
        {[5, 10, 15, 30, 45, 60].map((n) => (
          <button
            key={n}
            type="button"
            className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${secs === n ? "border-lime-2 bg-lime-2 text-black" : "border-line text-fg"}`}
            onClick={() => {
              setSecs(n);
              void saveSiteFlags({ data: { takeVideoSeconds: n } }).then((r) => setNote(r.ok ? `Videos trim at ${n}s` : "Could not save"));
            }}
          >
            {n}s
          </button>
        ))}
      </div>
      <button
        type="button"
        className={`mt-3 rounded-full border px-2.5 py-1 text-[11px] font-bold ${sounds ? "border-lime-2 bg-lime-2 text-black" : "border-line text-fg"}`}
        onClick={() => {
          const next = !sounds;
          setSoundsOn(next);
          void saveSiteFlags({ data: { soundsOn: next } }).then((r) => setNote(r.ok ? (next ? "Sounds on" : "Sounds off") : "Could not save"));
        }}
      >
        {sounds ? "Sounds on" : "Sounds off"}
      </button>
      {note ? <p className="mt-1 text-[11px] text-lime-2">{note}</p> : null}
    </div>
  );
}

function SpaceMod() {
  const [rows, setRows] = useState<{ id: string; name: string; username: string; status: string; handle: string }[]>([]);
  useEffect(() => {
    void listSpaceDesk().then(setRows).catch(() => setRows([]));
  }, []);
  if (rows.length === 0) return null;
  return (
    <div className="space-y-2">
      <div className="text-[11px] font-medium text-muted">Business spaces</div>
      {rows.map((s) => (
        <div key={s.id} className="flex items-center justify-between gap-2 rounded-xl border border-line bg-panel p-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">{s.name}</div>
            <div className="text-[10px] text-muted">@{s.username} · {s.handle} · {s.status}</div>
          </div>
          <button
            type="button"
            className="shrink-0 text-xs font-semibold text-lime-2"
            onClick={() => {
              const next = s.status === "Published" ? "Draft" : "Published";
              void parkSpace({ data: { id: s.id, status: next } }).then(() => setRows((list) => list.map((r) => r.id === s.id ? { ...r, status: next } : r)));
            }}
          >
            {s.status === "Published" ? "Unpublish" : "Publish"}
          </button>
        </div>
      ))}
    </div>
  );
}

function SocialDesk() {
  const [takes, setTakes] = useState<{ id: string; handle: string; body: string; ts: number; kind: string }[]>([]);
  const [flags, setFlags] = useState<{ id: string; post_id: string; author: string; reason: string; ts: number }[]>([]);
  const [msg, setMsg] = useState("");
  useEffect(() => {
    void listSocialDesk()
      .then((d) => {
        setTakes(d.takes);
        setFlags(d.reports);
      })
      .catch(() => setMsg("Could not load Socials."));
  }, []);
  return (
    <div className="md:col-span-2 space-y-3">
      <div>
        <div className="text-[10px] font-bold tracking-[0.16em] text-lime-2">SOCIALS DESK</div>
        <p className="text-[12px] text-muted">Flagged takes and accounts, plus the latest posts. Open one in the feed, or remove it.</p>
        {msg ? <p className="text-[12px] text-danger">{msg}</p> : null}
      </div>
      <SocialLimits />
      <SpaceMod />
      <div className="space-y-2">
        <div className="text-[11px] font-medium text-muted">Social reports</div>
        {flags.length === 0 ? <p className="text-sm text-muted">No take or account flags.</p> : null}
        {flags.map((r) => {
          const takeId = r.post_id.startsWith("take:") ? r.post_id.slice(5) : "";
          const handle = r.post_id.startsWith("user:") ? r.post_id.slice(5) : "";
          return (
            <div key={r.id} className="flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-panel p-3">
              <div className="min-w-0">
                <div className="text-xs font-semibold">{r.author}</div>
                <p className="text-sm">{r.reason}</p>
                <div className="text-[10px] text-muted">{takeId ? `take ${takeId}` : handle ? `@${handle}` : r.post_id}</div>
              </div>
              <div className="flex shrink-0 gap-2">
                <a className="text-xs font-semibold text-lime-2" href={takeId ? `/?tab=socials&take=${encodeURIComponent(takeId)}` : `/u/${encodeURIComponent(handle)}`}>Open</a>
                <button type="button" className="text-xs text-muted" onClick={() => void dismissReport({ data: { id: r.id } }).then(() => setFlags((rows) => rows.filter((x) => x.id !== r.id)))}>Dismiss</button>
                {takeId ? (
                  <button type="button" className="text-xs text-danger" onClick={() => void deleteGist({ data: { id: takeId } }).then(() => { setFlags((rows) => rows.filter((x) => x.post_id !== r.post_id)); setTakes((rows) => rows.filter((t) => t.id !== takeId)); })}>Delete</button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
      <div className="space-y-2">
        <div className="text-[11px] font-medium text-muted">Latest takes</div>
        {takes.length === 0 ? <p className="text-sm text-muted">No takes yet.</p> : null}
        {takes.map((t) => (
          <div key={t.id} className="flex min-w-0 items-start justify-between gap-2 rounded-xl border border-line bg-panel p-3">
            <div className="min-w-0">
              <div className="text-xs font-semibold">@{t.handle} · {t.kind}</div>
              <p className="line-clamp-2 text-sm">{t.body}</p>
            </div>
            <div className="flex shrink-0 gap-2">
              <a className="text-xs font-semibold text-lime-2" href={`/?tab=socials&take=${encodeURIComponent(t.id)}`}>Open</a>
              <button type="button" className="text-xs text-danger" onClick={() => void deleteGist({ data: { id: t.id } }).then(() => setTakes((rows) => rows.filter((x) => x.id !== t.id)))}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Admin({ store }: { store: Store }) {
  const [role, setRole] = useState<string | null>(null);
  const [empty, setEmpty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState("");
  const [staff, setStaff] = useState<{ user_id: string; role: string; handle: string | null; locked?: boolean | null }[]>([]);
  const [grantId, setGrantId] = useState("");
  const [grantRole, setGrantRole] = useState<"mod" | "admin">("mod");
  const [msg, setMsg] = useState("");
  const [mail, setMail] = useState<{ id: string; author: string; body: string; ts: number }[]>([]);
  const [reports, setReports] = useState<{ id: string; post_id: string; author: string; reason: string; ts: number; assignee?: string }[]>([]);
  const [wallets, setWallets] = useState<Record<string, string>>({});
  const [members, setMembers] = useState<{ id: string; handle: string; kind?: string; verified?: boolean }[]>([]);
  const [walletMsg, setWalletMsg] = useState("");
  const [extraCoin, setExtraCoin] = useState("");
  const [extraAddr, setExtraAddr] = useState("");
  const [desk, setDesk] = useState<"pulse" | "inbox" | "people" | "money" | "content" | "staff" | "socials">("pulse");

  useEffect(() => {
    void staffMe()
      .then((s) => {
        setRole(s.role);
        setEmpty(s.empty);
        setUserId(s.userId);
      })
      .catch(() => {
        setRole(null);
        setEmpty(false);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!role) return;
    void listStaff()
      .then((rows) => setStaff(rows))
      .catch(() => setStaff([]));
    void listMail()
      .then(setMail)
      .catch(() => setMail([]));
    void listReports()
      .then(setReports)
      .catch(() => setReports([]));
    void listWallets()
      .then((rows) => setWallets(Object.fromEntries(rows.map((w) => [w.coin, w.address]))))
      .catch(() => undefined);
    void listMembers()
      .then(setMembers)
      .catch(() => setMembers([]));
  }, [role]);

  if (loading) {
    return (
      <div className="mx-auto max-w-sm space-y-3 p-5">
        <h2 className="text-xl font-bold">Staff console</h2>
        <p className="text-sm text-muted">Checking access…</p>
      </div>
    );
  }

  if (empty) {
    return (
      <div className="mx-auto max-w-sm space-y-3 p-5">
        <h2 className="text-xl font-bold">Claim ops</h2>
        <p className="text-sm text-muted">No staff yet. The first signed-in owner becomes super admin. Do this once.</p>
        <button
          type="button"
          className="btn-join w-full rounded-lg py-2 text-sm font-semibold"
          onClick={() => {
            void claimOps().then((r) => {
              if (r.ok) {
                setRole("super");
                setEmpty(false);
              } else setMsg(r.reason);
            });
          }}
        >
          Claim super admin
        </button>
        {msg ? <p className="text-sm text-danger">{msg}</p> : null}
      </div>
    );
  }

  if (!role) {
    return (
      <div className="mx-auto max-w-sm space-y-3 p-5">
        <h2 className="text-xl font-bold">Staff console</h2>
        <p className="text-sm text-muted">This account is not staff. The console belongs to the username that claimed it first. If that is you and you made a new account with the same username, link it.</p>
        <button
          type="button"
          className="auth-cta w-full"
          onClick={() => {
            void claimOps().then((r) => {
              if (r.ok) {
                setRole(r.role === "admin" || r.role === "mod" ? r.role : "super");
                setEmpty(false);
              } else setMsg(r.reason);
            });
          }}
        >
          Link this username
        </button>
        {msg ? <p className="text-sm text-danger">{msg}</p> : null}
      </div>
    );
  }

  const deskTabs: { id: typeof desk; label: string }[] = [
    ...(role === "super" || role === "admin" ? [{ id: "pulse" as const, label: "Pulse" }] : []),
    { id: "inbox", label: reports.length ? `Inbox ${reports.length}` : "Inbox" },
    ...(role === "super" || role === "admin" ? [{ id: "socials" as const, label: "Socials" }] : []),
    { id: "people", label: "People" },
    ...(role === "super" || role === "admin" ? [{ id: "money" as const, label: "Money" }, { id: "content" as const, label: "Content" }] : []),
    ...(role === "super" || role === "admin" ? [{ id: "staff" as const, label: role === "super" ? "Staff" : "Account" }] : []),
  ];
  const onDesk = deskTabs.some((t) => t.id === desk) ? desk : deskTabs[0]?.id || "inbox";

  return (
    <div className="mx-auto grid w-full min-w-0 max-w-5xl grid-cols-1 gap-3 overflow-x-hidden overflow-y-auto p-4 md:grid-cols-2">
      <div className="md:col-span-2">
        <h2 className="text-xl font-bold">{role === "super" ? "Super admin" : role === "admin" ? "Admin" : "Sub-admin"}</h2>
        <p className="text-xs text-muted">
          Role {role} · id {userId}
        </p>
        {role === "mod" ? <p className="mt-1 text-[12px] text-muted">Your desk is reports, warnings, and hiding flagged posts. API keys, SEO, wallets, and news tools stay with the owner.</p> : null}
        <div className="sticky top-0 z-20 -mx-1 mt-2 flex gap-1 overflow-x-auto bg-bg py-2" role="tablist" aria-label="Staff sections">
          {deskTabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={onDesk === t.id}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-[12px] font-bold ${onDesk === t.id ? "border-lime-2 bg-lime-2 text-black" : "border-line text-fg"}`}
              onClick={() => setDesk(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      {onDesk === "pulse" && role === "super" ? <LivePausePanel /> : null}
      {onDesk === "people" && (role === "super" || role === "admin") ? (
        <div className="md:col-span-2">
          <div className="mb-1 text-[10px] font-bold tracking-[0.16em] text-lime-2">STAFF · ACCOUNT TYPE</div>
          <VerifyKindPanel members={members} canKind={role === "super"} onReload={() => void listMembers().then(setMembers).catch(() => undefined)} />
        </div>
      ) : null}
      {onDesk === "money" && role === "super" ? <PaywaysPanel /> : null}
      {onDesk === "money" && role === "super" ? <OpsKeysPanel /> : null}
      {onDesk === "content" && role === "super" ? <OpsSeoPanel /> : null}
      {onDesk === "pulse" && (role === "super" || role === "admin") ? <SitePulsePanel /> : null}
      {onDesk === "money" && (role === "super" || role === "admin") ? <AdsQueuePanel store={store} /> : null}
      {onDesk === "money" && role === "super" ? <SiteFlagsPanel /> : null}
      {onDesk === "money" && role === "super" ? <AdCatalogPanel /> : null}
      {onDesk === "money" && role === "super" ? <AdSlotsPanel /> : null}
      {onDesk === "content" && role === "super" ? <RoomsAdminPanel /> : null}
      {onDesk === "socials" && (role === "super" || role === "admin") ? <SocialDesk /> : null}
      {onDesk === "inbox" ? (
      <>
      <div className="md:col-span-2 space-y-2">
        <div className="text-[11px] font-medium text-muted">Inbox</div>
        {mail.length === 0 ? <p className="text-sm text-muted">No contact mail.</p> : null}
        {mail.map((m) => (
          <div key={m.id} className="rounded-xl border border-line bg-panel p-3">
            <div className="text-xs font-semibold">{m.author}</div>
            <p className="mt-1 text-sm">{m.body}</p>
          </div>
        ))}
      </div>
      <div className="md:col-span-2 space-y-2">
        <div className="text-[11px] font-medium text-muted">Reports</div>
        {reports.length === 0 ? <p className="text-sm text-muted">No flags.</p> : null}
        {reports.map((r) => {
          const gist = r.post_id.startsWith("take:");
          return (
          <div key={r.id} className="flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-panel p-3">
            <div className="min-w-0 break-words">
              <div className="text-xs font-semibold">{r.author}</div>
              <p className="break-words text-sm">{r.reason}</p>
              <div className="text-[10px] text-muted">{gist ? "gist" : r.post_id.startsWith("user:") ? "account" : r.post_id.startsWith("group:") ? "group" : "post"} {r.post_id.replace(/^(take:|user:|group:)/, "")}{r.assignee ? ` · assigned @${r.assignee}` : ""}</div>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {role === "super" ? (
                <select
                  className="rounded-lg border border-line bg-bg px-1 py-1 text-[11px]"
                  defaultValue=""
                  aria-label="Assign report"
                  onChange={(e) => {
                    const assignee = e.target.value;
                    if (!assignee) return;
                    void assignReport({ data: { id: r.id, assignee } }).then((res) => {
                      if (res.ok) setReports((rows) => rows.map((x) => (x.id === r.id ? { ...x, assignee } : x)));
                      else setMsg(res.reason);
                    });
                  }}
                >
                  <option value="">Assign</option>
                  {staff.filter((s) => s.role === "mod" || s.role === "admin").map((s) => (
                    <option key={s.user_id} value={s.handle || s.user_id}>{s.handle || "staff"}</option>
                  ))}
                </select>
              ) : null}
              <button type="button" className="text-xs text-muted" onClick={() => void dismissReport({ data: { id: r.id } }).then(() => setReports((rows) => rows.filter((x) => x.id !== r.id)))}>
                Dismiss
              </button>
              {r.post_id.startsWith("user:") ? (
                <button
                  type="button"
                  className="text-xs font-semibold text-lime-2"
                  onClick={() => {
                    const handle = r.post_id.replace(/^user:/, "");
                    void setModUser({ data: { handle, kind: "mute", hours: 24, reason: "Staff warning" } }).then(() => setMsg("Warning sent."));
                  }}
                >
                  Warn
                </button>
              ) : gist ? (
                <button type="button" className="text-xs text-danger" onClick={() => void deleteGist({ data: { id: r.post_id } }).then(() => setReports((rows) => rows.filter((x) => x.post_id !== r.post_id)))}>
                  Delete gist
                </button>
              ) : (
                <button type="button" className="text-xs text-danger" onClick={() => void hidePost({ data: r.post_id })}>
                  Hide post
                </button>
              )}
            </div>
          </div>
          );
        })}
      </div>
      </>
      ) : null}
      {onDesk === "content" && (role === "super" || role === "admin") ? <FeedsDeskPanel store={store} /> : null}
      {onDesk === "content" && role === "super" ? <ShopAdminPanel /> : null}
      {onDesk === "content" && role === "super" ? <SocialsAdminPanel /> : null}
      {onDesk === "content" && role === "super" ? <ChatTtlPanel /> : null}
      {onDesk === "content" && role === "super" ? <NewsEnginePanel store={store} /> : null}
      {onDesk === "content" && (role === "super" || role === "admin") ? <EventsAdminPanel /> : null}
      {onDesk === "content" && (role === "super" || role === "admin") ? <CinemaAdminPanel /> : null}
      {onDesk === "content" && (role === "super" || role === "admin") ? <ListingsAdminPanel /> : null}
      {onDesk === "pulse" && role === "super" ? <DbPanel /> : null}
      {onDesk === "people" && role ? <BanMutePanel members={members} /> : null}
      {onDesk === "people" && (role === "super" || role === "admin") ? <ModPanel /> : null}
      {onDesk === "staff" && (role === "super" || role === "admin") ? <AdminPassword /> : null}
      {onDesk === "staff" && (role === "super" || role === "admin") ? <AdminResetPassword members={members} /> : null}
      {onDesk === "money" && (role === "super" || role === "admin") ? (
        <div className="md:col-span-2 min-w-0 max-w-full raised space-y-2 rounded-xl p-3">
          <div className="text-[11px] font-medium text-muted">Pay-to wallets</div>
          <p className="break-words text-xs text-muted">Shown when users pay ads or donate. They copy from the app only. Add more coins below.</p>
          {walletMsg ? <p className="text-[11px] text-lime-2">{walletMsg}</p> : null}
          {Array.from(new Set([...AD_COINS.map((c) => c.id), ...Object.keys(wallets)])).map((id) => {
            const c = AD_COINS.find((x) => x.id === id);
            const ticker = c?.ticker ?? id.toUpperCase();
            return (
              <div key={id} className="flex min-w-0 flex-wrap gap-2">
                <span className="w-14 shrink-0 pt-2 text-[10px] font-bold text-muted">{ticker}</span>
                <input
                  value={wallets[id] ?? ""}
                  onChange={(e) => setWallets((w) => ({ ...w, [id]: e.target.value }))}
                  placeholder={`${c?.label ?? id} address`}
                  className="min-w-0 flex-1 rounded-lg border border-line bg-panel px-3 py-2 font-mono text-xs"
                />
                <button
                  type="button"
                  className="rounded border border-line px-2 text-xs"
                  onClick={() => {
                    void saveWallet({ data: { coin: id, address: wallets[id] ?? "" } }).then(() => {
                      setWalletMsg(`${ticker} saved`);
                      setTimeout(() => setWalletMsg(""), 1500);
                    });
                  }}
                >
                  Save
                </button>
                {!AD_COINS.some((x) => x.id === id) ? (
                  <button
                    type="button"
                    className="rounded border border-danger/40 px-2 text-xs text-danger"
                    onClick={() => {
                      void deleteWallet({ data: { coin: id } }).then(() => {
                        setWallets((w) => {
                          const n = { ...w };
                          delete n[id];
                          return n;
                        });
                        setWalletMsg(`${ticker} removed`);
                      });
                    }}
                  >
                    Del
                  </button>
                ) : null}
              </div>
            );
          })}
          <div className="flex gap-2 pt-1">
            <input value={extraCoin} onChange={(e) => setExtraCoin(e.target.value)} placeholder="coin id (e.g. doge)" className="w-28 rounded-lg border border-line bg-panel px-2 py-2 font-mono text-base" />
            <input value={extraAddr} onChange={(e) => setExtraAddr(e.target.value)} placeholder="address" className="flex-1 rounded-lg border border-line bg-panel px-3 py-2 font-mono text-base" />
            <button
              type="button"
              className="rounded border border-line px-2 text-xs"
              onClick={() => {
                const coin = extraCoin.trim().toLowerCase();
                if (!coin || !extraAddr.trim()) return;
                void saveWallet({ data: { coin, address: extraAddr.trim() } }).then(() => {
                  setWallets((w) => ({ ...w, [coin]: extraAddr.trim() }));
                  setExtraCoin("");
                  setExtraAddr("");
                  setWalletMsg(`${coin.toUpperCase()} added`);
                });
              }}
            >
              Add
            </button>
          </div>
        </div>
      ) : null}
      {onDesk === "staff" && role === "super" ? (
        <div className="md:col-span-2 min-w-0 max-w-full raised space-y-2 rounded-xl p-3">
          <div className="text-[11px] font-medium text-muted">Staff access</div>
          <p className="break-words text-xs text-muted">Only you are super. You grant sub-admin or admin. You can revoke. Nobody can take your seat.</p>
          <input value={grantId} onChange={(e) => setGrantId(e.target.value)} placeholder="Their username" className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-base" />
          <select value={grantRole} onChange={(e) => setGrantRole(e.target.value as typeof grantRole)} className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-base">
            <option value="mod">Sub-admin (mod) — hide, reports, ads</option>
            <option value="admin">Admin — wallets + moderator too</option>
          </select>
          <button
            type="button"
            className="btn-3d rounded-lg px-3 py-2 text-sm"
            onClick={() => {
              if (!grantId.trim()) return;
              void setStaffRole({ data: { userId: grantId.trim(), role: grantRole, handle: grantId.trim() } }).then((r) => {
                if (r && "ok" in r && r.ok === false) setMsg(r.reason);
                else setMsg(`${("handle" in r && r.handle) || grantId.trim()} is now ${grantRole === "admin" ? "Admin" : "Sub-admin"}. They reopen Me to see the staff desk.`);
                void listStaff().then(setStaff);
              }).catch(() => setMsg("Could not grant. Try the exact @handle."));
            }}
          >
            Grant access
          </button>
          {msg ? <p className="text-sm text-danger">{msg}</p> : null}
          {staff.map((s) => (
            <div key={s.user_id} className="flex min-w-0 flex-wrap items-center justify-between gap-2 text-xs">
              <span className="min-w-0 break-words text-muted">
                {s.handle || s.user_id} · {s.locked || s.role === "super" ? "owner (you)" : s.role === "mod" ? "sub-admin" : s.role}
              </span>
              {s.role !== "super" && !s.locked ? (
                <button
                  type="button"
                  className="text-danger"
                  onClick={() => {
                    void removeStaff({ data: s.user_id }).then(() => listStaff().then(setStaff));
                  }}
                >
                  Revoke
                </button>
              ) : null}
            </div>
          ))}
          {members.length ? <div className="pt-2 text-[11px] font-medium text-muted">Registered users</div> : null}
          {members.map((m) => (
            <button
              key={m.id}
              type="button"
              className="block w-full truncate text-left text-[11px] text-muted hover:text-fg"
              onClick={() => setGrantId(m.handle)}
            >
              {m.handle} {m.kind ? `· ${m.kind}` : ""}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function AdminResetPassword({ members }: { members: { id: string; handle: string }[] }) {
  const [handle, setHandle] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  return (
    <div className="md:col-span-2 min-w-0 max-w-full raised space-y-2 rounded-xl p-3">
      <div className="text-[11px] font-medium text-muted">Reset a user’s password</div>
      <p className="text-xs text-muted">No email. If they forget, you set a new one and tell them in chat. Cannot reset the owner.</p>
      <input value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="Username" className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-base" />
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="New password (8+)" className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-base" />
      {err ? <p className="text-sm text-danger">{err}</p> : null}
      {msg ? <p className="text-sm text-lime-2">{msg}</p> : null}
      <button
        type="button"
        className="btn-3d rounded-lg px-3 py-2 text-sm"
        onClick={() => {
          setErr("");
          setMsg("");
          void resetUserPassword({ data: { handle, password } }).then((r) => {
            if (r.ok) {
              setMsg(`Password reset for ${r.handle}. Tell them the new one privately.`);
              setPassword("");
            } else setErr(r.reason);
          });
        }}
      >
        Reset password
      </button>
      <div className="flex flex-wrap gap-1">
        {members.slice(0, 16).map((m) => (
          <button key={m.id} type="button" className="rounded-full border border-line px-2 py-0.5 text-[10px] text-muted" onClick={() => setHandle(m.handle)}>
            {m.handle}
          </button>
        ))}
      </div>
    </div>
  );
}

function DbPanel() {
  const [info, setInfo] = useState<{ ok: boolean; source: string; vercel: boolean; users?: number; reason?: string } | null>(null);
  useEffect(() => {
    void dbStatus()
      .then(setInfo)
      .catch(() => setInfo({ ok: false, source: "unknown", vercel: false, reason: "Could not read DB" }));
  }, []);
  return (
    <div className="md:col-span-2 min-w-0 max-w-full raised space-y-1 rounded-xl p-3">
      <div className="text-[11px] font-medium text-muted">Database</div>
      {!info ? <p className="text-xs text-muted">Checking…</p> : null}
      {info?.ok ? (
        <p className="text-xs text-lime-2">
          Connected ({info.source}). {info.users ?? 0} accounts. {info.vercel ? "Vercel" : "Local"}.
        </p>
      ) : info ? (
        <p className="text-xs text-danger">{info.reason || "Postgres is not connected. Add DATABASE_URL on Vercel."}</p>
      ) : null}
    </div>
  );
}

function AdminPassword() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  return (
    <div className="md:col-span-2 min-w-0 max-w-full raised space-y-2 rounded-xl p-3">
      <div className="text-[11px] font-medium text-muted">Your password</div>
      <p className="text-xs text-muted">Change it here. No email reset — we never stored a real mailbox.</p>
      <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} placeholder="Current password" className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-base" />
      <input type="password" value={next} onChange={(e) => setNext(e.target.value)} placeholder="New password (8+)" className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-base" />
      {err ? <p className="text-sm text-danger">{err}</p> : null}
      {msg ? <p className="text-sm text-lime-2">{msg}</p> : null}
      <button
        type="button"
        className="btn-3d rounded-lg px-3 py-2 text-sm"
        onClick={() => {
          setErr("");
          setMsg("");
          if (next.trim().length < 8) {
            setErr("New password needs 8+ characters.");
            return;
          }
          void authClient.changePassword({ currentPassword: current, newPassword: next }).then((r) => {
            if (r.error) setErr(r.error.message ?? "Could not change password.");
            else {
              setMsg("Password updated.");
              setCurrent("");
              setNext("");
            }
          });
        }}
      >
        Update password
      </button>
    </div>
  );
}

function VerifyKindPanel({
  members,
  canKind: canChangeKind,
  onReload,
}: {
  members: { id: string; handle: string; kind?: string; verified?: boolean }[];
  canKind: boolean;
  onReload: () => void;
}) {
  const [handle, setHandle] = useState("");
  const [kind, setKind] = useState<AccountKind>("member");
  const [msg, setMsg] = useState("");
  const [scores, setScores] = useState<{ handle: string; score: number; takes: number; chats: number }[]>([]);
  const [queue, setQueue] = useState<{ handle: string; reference: string; ts: number }[]>([]);
  const picked = members.find((m) => m.handle.toLowerCase() === handle.trim().toLowerCase());
  useEffect(() => {
    void listVerifyQueue().then(setQueue).catch(() => setQueue([]));
  }, []);
  return (
    <div className="md:col-span-2 min-w-0 max-w-full raised space-y-3 rounded-xl p-3">
      <div className="text-[11px] font-medium text-muted">Verified badge + override account type</div>
      <p className="break-words text-xs text-muted">A member pays, then you approve. Paying does not turn the badge on by itself.</p>
      {queue.length ? (
        <div className="space-y-1">
          {queue.map((q) => (
            <div key={q.reference} className="flex items-center justify-between gap-2 text-[12px]">
              <span>@{q.handle} paid · waiting</span>
              <button type="button" className="font-bold text-lime-2" onClick={() => void setVerified({ data: { handle: q.handle, on: true } }).then(() => { setMsg(`Verified @${q.handle}`); setQueue((rows) => rows.filter((r) => r.reference !== q.reference)); onReload(); })}>Approve</button>
            </div>
          ))}
        </div>
      ) : <p className="text-[11px] text-muted">No paid verification requests.</p>}
      <input value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="Username" className="w-full min-w-0 rounded-lg border border-line bg-panel px-3 py-2 text-base" />
      {picked ? <p className="break-words text-[11px] text-muted">{picked.handle} · {picked.kind} · {picked.verified ? "verified" : "not verified"}</p> : null}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn-join rounded-lg px-3 py-2 text-[11px] font-bold"
          onClick={() => {
            if (!handle.trim()) return;
            void setVerified({ data: { handle: handle.trim(), on: true } }).then((r) => {
              setMsg(r.ok ? `Verified @${handle.trim()}` : "Could not verify");
              onReload();
            });
          }}
        >
          Give Verified badge
        </button>
        <button
          type="button"
          className="rounded-lg border border-line px-3 py-2 text-[11px]"
          onClick={() => {
            if (!handle.trim()) return;
            void setVerified({ data: { handle: handle.trim(), on: false } }).then((r) => {
              setMsg(r.ok ? "Badge removed" : "Could not update");
              onReload();
            });
          }}
        >
          Remove badge
        </button>
        <button
          type="button"
          className="rounded-lg border border-line px-3 py-2 text-[11px]"
          onClick={() => {
            void scoreMembers().then(setScores).catch(() => setScores([]));
          }}
        >
          Who is active
        </button>
      </div>
      {scores.length > 0 ? (
        <div className="space-y-1">
          <p className="text-[11px] text-muted">Counted when you tap. Not a background job. Posts in Socials + chat lines.</p>
          {scores.map((s) => (
            <div key={s.handle} className="flex items-center justify-between gap-2 text-[12px]">
              <span>@{s.handle} · {s.score} ({s.takes} socials, {s.chats} chat)</span>
              <button type="button" className="font-bold text-lime-2" onClick={() => void setVerified({ data: { handle: s.handle, on: true } }).then(() => { setMsg(`Verified @${s.handle}`); onReload(); })}>Verify</button>
            </div>
          ))}
        </div>
      ) : null}
      {canChangeKind ? (
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-stretch">
          <select value={kind} onChange={(e) => setKind(e.target.value as AccountKind)} className="w-full max-w-full min-w-0 flex-1 rounded-lg border border-line bg-panel px-3 py-2 text-base">
            {ACCOUNT_KINDS.map((k) => (
              <option key={k.id} value={k.id}>
                {k.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn-3d w-full shrink-0 rounded-lg px-3 py-2 text-[11px] font-bold sm:w-auto"
            onClick={() => {
              if (!handle.trim()) return;
              void setAccountKind({ data: { handle: handle.trim(), kind } }).then((r) => {
                setMsg(r.ok ? `Type → ${kind}` : "Could not change type");
                onReload();
              });
            }}
          >
            Override type
          </button>
        </div>
      ) : null}
      {msg ? <p className="break-words text-[11px] text-lime-2">{msg}</p> : null}
      <div className="mt-1 max-h-40 min-w-0 overflow-y-auto">
        {members.slice(0, 40).map((m) => (
          <button
            key={m.id}
            type="button"
            className="flex w-full min-w-0 flex-col gap-0.5 border-b border-white/5 py-1.5 text-left text-[11px] sm:flex-row sm:items-center sm:justify-between sm:gap-2"
            onClick={() => {
              setHandle(m.handle);
              if (m.kind) setKind(m.kind as AccountKind);
            }}
          >
            <span className="min-w-0 break-all">@{m.handle}</span>
            <span className="shrink-0 text-muted">
              {m.kind}
              {m.verified ? " · ✓" : ""}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function BanMutePanel({ members }: { members: { id: string; handle: string; kind?: string }[] }) {
  const [handle, setHandle] = useState("");
  const [reason, setReason] = useState("");
  const [rows, setRows] = useState<{ userId: string; handle: string; kind: "ban" | "mute"; until: number; reason: string }[]>([]);
  const [msg, setMsg] = useState("");
  const refresh = () => {
    void listModUsers()
      .then(setRows)
      .catch(() => setRows([]));
  };
  useEffect(() => {
    refresh();
  }, []);
  const act = (kind: "ban" | "mute", hours: number) => {
    if (!handle.trim()) return;
    void setModUser({ data: { handle: handle.trim(), kind, hours, reason } }).then((r) => {
      if (r && "ok" in r && r.ok === false) setMsg(r.reason);
      else {
        setMsg("");
        setReason("");
        refresh();
      }
    });
  };
  return (
    <div className="md:col-span-2 min-w-0 max-w-full raised space-y-2 rounded-xl p-3">
      <div className="text-[10px] font-bold tracking-normal text-lime-2">Mute & ban</div>
      <p className="break-words text-xs text-muted">Mute stops chat. Ban stops chat, feeds, ads, and music. Owner cannot be restricted.</p>
      <input value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="Username" className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-base" />
      <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (optional)" className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-base" />
      <div className="flex flex-wrap gap-1">
        <button type="button" className="rounded border border-line px-2 py-1 text-[11px]" onClick={() => act("mute", 1)}>Mute 1h</button>
        <button type="button" className="rounded border border-line px-2 py-1 text-[11px]" onClick={() => act("mute", 24)}>Mute 24h</button>
        <button type="button" className="rounded border border-line px-2 py-1 text-[11px]" onClick={() => act("mute", 0)}>Mute forever</button>
        <button type="button" className="rounded border border-line px-2 py-1 text-[11px] text-danger" onClick={() => act("ban", 24)}>Ban 24h</button>
        <button type="button" className="rounded border border-line px-2 py-1 text-[11px] text-danger" onClick={() => act("ban", 0)}>Ban forever</button>
      </div>
      {msg ? <p className="text-sm text-danger">{msg}</p> : null}
      {rows.length === 0 ? <p className="text-[11px] text-muted">Nobody restricted.</p> : null}
      {rows.map((r) => (
        <div key={r.userId} className="flex items-center justify-between gap-2 text-xs">
          <span className="text-muted">
            {r.handle} · {r.kind} · {r.until ? `until ${new Date(r.until).toLocaleString()}` : "forever"}
            {r.reason ? ` · ${r.reason}` : ""}
          </span>
          <button type="button" className="text-lime-2" onClick={() => void clearModUser({ data: r.userId }).then(refresh)}>
            Lift
          </button>
        </div>
      ))}
      {members.slice(0, 12).map((m) => (
        <button key={m.id} type="button" className="mr-2 text-[11px] text-muted hover:text-fg" onClick={() => setHandle(m.handle)}>
          {m.handle}
        </button>
      ))}
    </div>
  );
}


function FeedsDeskPanel({ store }: { store: Store }) {
  const [rows, setRows] = useState<{ id: string; title: string; category: string | null; image: string | null; status: string; author: string; ts: number; link: string | null }[]>([]);
  const [q, setQ] = useState("");
  const [msg, setMsg] = useState("");
  const load = () => {
    void listStaffPosts()
      .then(setRows)
      .catch(() => setRows([]));
  };
  useEffect(() => {
    load();
  }, []);
  const shown = rows.filter((r) => !q || r.title.toLowerCase().includes(q.toLowerCase()) || (r.category || "").toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="md:col-span-2 min-w-0 max-w-full raised space-y-2 rounded-xl p-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <div className="text-[11px] font-medium text-muted">Feeds desk</div>
          <h3 className="text-base font-bold">Archive and delete stories</h3>
          <p className="mt-1 text-xs text-muted">Archive hides it from Feeds. Delete removes it. Restore brings an archive back.</p>
        </div>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search title" className="rounded-lg border border-line bg-panel px-2 py-1.5 text-base" />
      </div>
      {msg ? <p className="text-[11px] text-lime-2">{msg}</p> : null}
      <div className="max-h-[420px] space-y-2 overflow-y-auto">
        {shown.slice(0, 200).map((p) => (
          <div key={p.id} className="flex items-center gap-2 rounded-xl border border-line bg-panel p-2">
            {p.image ? <img src={p.image} alt="" className="size-12 shrink-0 rounded-md object-cover" /> : <div className="size-12 shrink-0 rounded-md bg-panel-3" />}
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-semibold">{p.title}</div>
              <div className="text-[10px] text-muted">
                {p.status} · {p.category || "News"} · {p.author}
              </div>
            </div>
            {p.status === "hidden" ? (
              <button
                type="button"
                className="shrink-0 text-[11px] text-lime-2"
                onClick={() => {
                  void unhidePost({ data: p.id }).then(() => {
                    store.pushPost({
                      id: p.id,
                      title: p.title,
                      body: "",
                      author: p.author,
                      ts: p.ts,
                      comments: [],
                      category: p.category || "News",
                      image: p.image || undefined,
                      link: p.link || undefined,
                      status: "publish",
                      views: 0,
                    });
                    setMsg("Restored");
                    load();
                  });
                }}
              >
                Restore
              </button>
            ) : (
              <button
                type="button"
                className="shrink-0 text-[11px] text-muted"
                onClick={() => {
                  store.hidePost(p.id);
                  void hidePost({ data: p.id }).then(() => {
                    setMsg("Archived");
                    load();
                  });
                }}
              >
                Archive
              </button>
            )}
            <button
              type="button"
              className="shrink-0 text-[11px] text-danger"
              onClick={() => {
                if (!window.confirm("Delete this story for good?")) return;
                void deletePost({ data: p.id }).then(() => {
                  store.hidePost(p.id);
                  setMsg("Deleted");
                  load();
                });
              }}
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function NewsEnginePanel({ store }: { store: Store }) {
  const [sources, setSources] = useState<NewsSource[]>([]);
  const [drafts, setDrafts] = useState<NewsDraft[]>([]);
  const [include, setInclude] = useState("");
  const [exclude, setExclude] = useState("");
  const [maxAgeHours, setMaxAgeHours] = useState(168);
  const [busy, setBusy] = useState(false);
  const [job, setJob] = useState<"" | "fetch" | "publish">("");
  const [msg, setMsg] = useState("");
  const [llm, setLlm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [edit, setEdit] = useState({ title: "", body: "", meta_description: "", tags: "", category: "", image: "" });

  const reload = () => {
    void listNewsSources()
      .then(setSources)
      .catch(() => setSources([]));
    void listNewsDrafts()
      .then(setDrafts)
      .catch(() => setDrafts([]));
    void newsEngineInfo()
      .then((i) => setLlm(!!i.llm))
      .catch(() => undefined);
  };

  useEffect(() => {
    reload();
  }, []);

  const startEdit = (d: NewsDraft) => {
    setEditId(d.id);
    setEdit({
      title: d.title,
      body: d.body,
      meta_description: d.meta_description,
      tags: d.tags,
      category: d.category,
      image: d.image,
    });
  };

  return (
    <div className="md:col-span-2 min-w-0 max-w-full raised space-y-3 rounded-xl p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="text-[11px] font-medium text-muted">News Engine</div>
          <h3 className="text-base font-bold">Fetch this week · put on Feeds</h3>
          <p className="mt-1 text-xs text-muted">
            Nigeria, Africa, world. Real RSS, real thumbnails only — no fake photos. {llm ? "LLM rewrite keyed." : "Kilode-voice rewrite."} Archive or delete any story in Feeds desk.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={job !== ""}
          className="btn-3d rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-50"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (job) return;
            setJob("fetch");
            setBusy(true);
            setMsg("");
            void fetchNewsLatest({
              data: {
                include: include.trim() || undefined,
                exclude: exclude.trim() || undefined,
                maxAgeHours,
                sourceIds: sources.filter((s) => s.enabled).map((s) => s.id),
              },
            })
              .then((r) => {
                setMsg(`Fetched ${r.fetched} · new drafts ${r.created}${r.errors.length ? ` · ${r.errors.slice(0, 2).join("; ")}` : ""} · store ${r.store}`);
                reload();
              })
              .catch((err) => setMsg(err instanceof Error ? err.message : "Fetch failed"))
              .finally(() => {
                setJob("");
                setBusy(false);
              });
          }}
        >
          {job === "fetch" ? "Fetching…" : "Fetch latest"}
        </button>
        <button
          type="button"
          disabled={job !== ""}
          className="btn-join rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-50"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (job) return;
            setJob("publish");
            setBusy(true);
            setMsg("");
            void publishNewsWeek()
              .then((r) => {
                setMsg(`This week on Feeds: ${r.published} with real photos (${r.withPhoto} ready · ${r.candidates} this week · ${r.feeds} feeds). ${r.errors.length ? r.errors[0] : ""}`);
                reload();
              })
              .catch((err) => setMsg(err instanceof Error ? err.message : "Publish failed"))
              .finally(() => {
                setJob("");
                setBusy(false);
              });
          }}
        >
          {job === "publish" ? "Publishing…" : "Put this week on Feeds"}
        </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1">
        {[
          ["Nollywood", "Nollywood movie"],
          ["Hollywood", "Hollywood movie"],
          ["Upcoming films", "upcoming movie"],
          ["Music", "album release Nigeria"],
          ["Breaking", "breaking news Nigeria"],
          ["War", "war news"],
          ["Sports", "sports Nigeria"],
          ["Mixed", ""],
        ].map(([label, words]) => (
          <button key={label} type="button" className="rounded-full border border-line px-2 py-1 text-[10px] font-bold" onClick={() => setInclude(words)}>
            {label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-1">
        {[1, 5, 10, 20].map((n) => (
          <button
            key={n}
            type="button"
            disabled={busy}
            className="rounded-full border border-lime-2/40 px-2 py-1 text-[10px] font-bold text-lime-2 disabled:opacity-50"
            onClick={() => {
              const batch = drafts.slice(0, n);
              if (!batch.length) {
                setMsg("Fetch first. Nothing is waiting.");
                return;
              }
              setBusy(true);
              void (async () => {
                let posted = 0;
                for (const d of batch) {
                  const r = await approveNewsDraft({ data: d.id });
                  if (r.ok && "post" in r && r.post) {
                    posted += 1;
                    store.pushPost({
                      id: r.post.id,
                      title: r.post.title,
                      body: r.post.body,
                      excerpt: r.post.excerpt,
                      author: r.post.author,
                      ts: r.post.ts,
                      comments: [],
                      category: r.post.category,
                      tags: r.post.tags,
                      link: r.post.link,
                      image: r.post.image,
                      slug: r.post.slug,
                      status: "publish",
                      views: 0,
                    });
                  }
                }
                setMsg(`Posted ${posted} real drafts. One by one, not a dump.`);
                reload();
                setBusy(false);
              })();
            }}
          >
            Post {n}
          </button>
        ))}
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        <label className="text-xs text-muted">
          Include keywords
          <input value={include} onChange={(e) => setInclude(e.target.value)} placeholder="lagos, fintech" className="mt-1 w-full rounded-lg border border-line bg-panel px-2 py-1.5 text-base text-fg" />
        </label>
        <label className="text-xs text-muted">
          Exclude keywords
          <input value={exclude} onChange={(e) => setExclude(e.target.value)} placeholder="rumour, unverified" className="mt-1 w-full rounded-lg border border-line bg-panel px-2 py-1.5 text-base text-fg" />
        </label>
        <label className="text-xs text-muted">
          Max age (hours)
          <input type="number" min={6} max={240} value={maxAgeHours} onChange={(e) => setMaxAgeHours(Number(e.target.value) || 72)} className="mt-1 w-full rounded-lg border border-line bg-panel px-2 py-1.5 text-base text-fg" />
        </label>
      </div>

      <div className="space-y-1">
        <div className="text-[11px] font-medium text-muted">Sources</div>
        <div className="flex flex-wrap gap-2">
          {sources.map((s) => (
            <label key={s.id} className="flex items-center gap-1.5 rounded-full border border-line bg-panel px-2.5 py-1 text-[11px]">
              <input
                type="checkbox"
                checked={s.enabled}
                onChange={(e) => {
                  const on = e.target.checked;
                  setSources((prev) => prev.map((x) => (x.id === s.id ? { ...x, enabled: on } : x)));
                  void setNewsSourceEnabled({ data: { id: s.id, enabled: on } }).catch(() => undefined);
                }}
              />
              <span>{s.name}</span>
              <span className="text-muted">{s.kind === "google-news" ? "GN" : "RSS"}</span>
            </label>
          ))}
        </div>
      </div>

      {msg ? <p className="text-[11px] text-lime-2">{msg}</p> : null}

      <div className="space-y-2">
        <div className="text-[11px] font-medium text-muted">Draft queue · {drafts.length}</div>
        {drafts.length === 0 ? <p className="text-sm text-muted">No drafts yet. Tap Fetch latest.</p> : null}
        {drafts.map((d) => (
          <div key={d.id} className="rounded-xl border border-line bg-panel p-3">
            <div className="flex flex-wrap gap-3">
              {d.image ? <img src={d.image} alt="" className="h-16 w-16 shrink-0 rounded-lg object-cover" /> : <div className="h-16 w-16 shrink-0 rounded-lg bg-panel-3" />}
              <div className="min-w-0 flex-1">
                <div className="text-[10px] text-muted">{d.source_name} · {d.category}</div>
                <div className="font-semibold leading-snug">{d.title}</div>
                <p className="mt-1 line-clamp-2 text-xs text-muted">{d.meta_description || d.original_snippet}</p>
                <div className="mt-1 truncate text-[10px] text-muted">{d.tags}</div>
                <a href={d.original_link} target="_blank" rel="noreferrer" className="mt-1 inline-block text-[10px] text-lime-2 underline">
                  Original
                </a>
              </div>
            </div>
            {editId === d.id ? (
              <div className="mt-3 space-y-2 border-t border-line pt-3">
                <input value={edit.title} onChange={(e) => setEdit((x) => ({ ...x, title: e.target.value }))} className="w-full rounded-lg border border-line bg-panel-2 px-2 py-1.5 text-base" placeholder="Title" />
                <textarea value={edit.body} onChange={(e) => setEdit((x) => ({ ...x, body: e.target.value }))} rows={5} className="w-full rounded-lg border border-line bg-panel-2 px-2 py-1.5 text-base" placeholder="Body" />
                <input value={edit.meta_description} onChange={(e) => setEdit((x) => ({ ...x, meta_description: e.target.value }))} className="w-full rounded-lg border border-line bg-panel-2 px-2 py-1.5 text-base" placeholder="Meta description" />
                <div className="grid gap-2 sm:grid-cols-2">
                  <input value={edit.tags} onChange={(e) => setEdit((x) => ({ ...x, tags: e.target.value }))} className="rounded-lg border border-line bg-panel-2 px-2 py-1.5 text-base" placeholder="Tags" />
                  <input value={edit.category} onChange={(e) => setEdit((x) => ({ ...x, category: e.target.value }))} className="rounded-lg border border-line bg-panel-2 px-2 py-1.5 text-base" placeholder="Category" />
                </div>
                <label className="block text-[11px] text-muted">
                  Cover URL
                  <input value={edit.image} onChange={(e) => setEdit((x) => ({ ...x, image: e.target.value }))} className="mt-1 w-full rounded-lg border border-line bg-panel-2 px-2 py-1.5 text-base text-fg" placeholder="https://… article cover image" />
                </label>
                {edit.image ? <img src={edit.image} alt="" className="max-h-28 rounded-lg object-cover" /> : null}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded border border-line px-2 py-1 text-xs"
                    onClick={() => {
                      void updateNewsDraft({ data: { id: d.id, ...edit } }).then(() => {
                        setEditId(null);
                        reload();
                      });
                    }}
                  >
                    Save edits
                  </button>
                  <button type="button" className="rounded border border-line px-2 py-1 text-xs" onClick={() => setEditId(null)}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" className="rounded border border-line px-2 py-1 text-xs" onClick={() => startEdit(d)}>
                Edit
              </button>
              <button
                type="button"
                className="rounded border border-line px-2 py-1 text-xs text-lime-2"
                onClick={() => {
                  void approveNewsDraft({ data: d.id }).then((r) => {
                    if (r.ok && "post" in r && r.post) {
                      store.pushPost({
                        id: r.post.id,
                        title: r.post.title,
                        body: r.post.body,
                        excerpt: r.post.excerpt,
                        author: r.post.author,
                        ts: r.post.ts,
                        comments: [],
                        category: r.post.category,
                        tags: r.post.tags,
                        link: r.post.link,
                        image: r.post.image,
                        slug: r.post.slug,
                        status: "publish",
                        views: 0,
                      });
                      setMsg(`Approved → Feeds: ${r.post.title}`);
                    } else if (!r.ok) setMsg(r.reason);
                    reload();
                  });
                }}
              >
                Approve → Feeds
              </button>
              <button
                type="button"
                className="rounded border border-line px-2 py-1 text-xs text-danger"
                onClick={() => {
                  void rejectNewsDraft({ data: d.id }).then(() => reload());
                }}
              >
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChatTtlPanel() {
  const [hours, setHours] = useState(24);
  const [saved, setSaved] = useState("");
  useEffect(() => {
    void getChatTtl()
      .then((r) => setHours(r.hours))
      .catch(() => undefined);
  }, []);
  return (
    <div className="md:col-span-2 min-w-0 max-w-full raised space-y-2 rounded-xl p-3">
      <div className="text-[10px] font-bold tracking-normal text-lime-2">Chat lifetime</div>
      <p className="text-xs text-muted">How long user messages stay in Chat before they disappear. Only you set this. Feeds and ads are not touched.</p>
      <div className="flex flex-wrap gap-1">
        {CHAT_TTLS.map((t) => (
          <button
            key={t.hours}
            type="button"
            onClick={() => setHours(t.hours)}
            className={`rounded-full px-2 py-1 text-[11px] ${hours === t.hours ? "btn-3d font-semibold" : "border border-line text-muted"}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <button
        type="button"
        className="btn-3d rounded-lg px-3 py-2 text-sm font-semibold"
        onClick={() => {
          void saveChatTtl({ data: hours })
            .then((r) => {
              setHours(r.hours);
              setSaved(`Saved · ${chatTtlLabel(r.hours)}`);
              setTimeout(() => setSaved(""), 2000);
            })
            .catch(() => setSaved("Could not save"));
        }}
      >
        Save lifetime
      </button>
      {saved ? <span className="ml-2 text-[11px] text-lime-2">{saved}</span> : null}
    </div>
  );
}

function Toggle({ on, label, set }: { on: boolean; label: string; set: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-[11px]">
      <input type="checkbox" checked={on} onChange={(e) => set(e.target.checked)} />
      {label}
    </label>
  );
}

function ModPanel() {
  const [cfg, setCfg] = useState<ModSettings>(DEFAULT_MOD);
  const [hits, setHits] = useState<{ id: string; surface: string; action: string; hits: string; excerpt: string; author: string; status: string; ts: number }[]>([]);
  const [saved, setSaved] = useState("");
  useEffect(() => {
    void getModSettings()
      .then(setCfg)
      .catch(() => undefined);
    void listModHits()
      .then(setHits)
      .catch(() => setHits([]));
  }, []);
  function patch(p: Partial<ModSettings>) {
    setCfg((c) => ({ ...c, ...p }));
  }
  return (
    <div className="md:col-span-2 min-w-0 max-w-full raised space-y-3 rounded-xl p-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-[10px] font-bold tracking-normal text-lime-2">AI moderator</div>
          <p className="text-[11px] text-muted">Runs on the write path in milliseconds. No extra API. Safe with heavy traffic.</p>
        </div>
        <button type="button" className={`rounded-full px-3 py-1 text-[11px] font-bold ${cfg.enabled ? "btn-3d" : "border border-line text-muted"}`} onClick={() => patch({ enabled: !cfg.enabled })}>
          {cfg.enabled ? "On" : "Off"}
        </button>
      </div>
      <div className="text-[11px] font-medium text-muted">When it hits</div>
      <div className="flex flex-wrap gap-1">
        {(["mask", "block", "hold"] as const).map((a) => (
          <button key={a} type="button" className={`rounded-full px-2 py-1 text-[11px] ${cfg.action === a ? "btn-3d font-semibold" : "border border-line text-muted"}`} onClick={() => patch({ action: a })}>
            {a === "mask" ? "Mask ***" : a === "block" ? "Block" : "Hold for review"}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Toggle on={cfg.chat} label="Chat" set={(v) => patch({ chat: v })} />
        <Toggle on={cfg.feeds} label="Feeds" set={(v) => patch({ feeds: v })} />
        <Toggle on={cfg.comments} label="Comments" set={(v) => patch({ comments: v })} />
        <Toggle on={cfg.ads} label="Ads" set={(v) => patch({ ads: v })} />
        <Toggle on={cfg.music} label="Music notes" set={(v) => patch({ music: v })} />
      </div>
      <div className="text-[11px] font-medium text-muted">Filters</div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Toggle on={cfg.sexual} label="Sexual / porn" set={(v) => patch({ sexual: v })} />
        <Toggle on={cfg.insults} label="Abuse / slurs" set={(v) => patch({ insults: v })} />
        <Toggle on={cfg.scam} label="Scam / giveaway" set={(v) => patch({ scam: v })} />
        <Toggle on={cfg.links} label="Too many links" set={(v) => patch({ links: v })} />
        <Toggle on={cfg.shout} label="ALL CAPS shout" set={(v) => patch({ shout: v })} />
      </div>
      <textarea value={cfg.custom} onChange={(e) => patch({ custom: e.target.value })} rows={3} placeholder="Extra block words, comma or new line" className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-base" />
      <textarea value={cfg.allow} onChange={(e) => patch({ allow: e.target.value })} rows={2} placeholder="Allow list (never block these)" className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-base" />
      <button
        type="button"
        className="btn-3d rounded-lg px-3 py-2 text-sm font-semibold"
        onClick={() => {
          void saveModSettings({ data: cfg })
            .then(() => {
              setSaved("Saved");
              setTimeout(() => setSaved(""), 2000);
            })
            .catch(() => {
              setSaved("Could not save");
              setTimeout(() => setSaved(""), 2500);
            });
        }}
      >
        Save moderator
      </button>
      {saved ? <span className="ml-2 text-[11px] text-lime-2">{saved}</span> : null}
      <div className="text-[11px] font-medium text-muted">Hit log</div>
      {hits.length === 0 ? <p className="text-xs text-muted">Nothing caught yet.</p> : null}
      {hits.map((h) => (
        <div key={h.id} className="rounded-lg border border-white/5 p-2 text-[11px]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-semibold text-lime-2">{h.surface}</span>
            <span className="text-muted">{h.action} · {h.status} · {h.author}</span>
          </div>
          <p className="mt-1 text-muted">{h.hits}</p>
          <p className="mt-1">{h.excerpt}</p>
          {h.status === "open" ? (
            <div className="mt-1 flex gap-2">
              <button type="button" className="text-[10px] text-lime-2" onClick={() => void setModHitStatus({ data: { id: h.id, status: "kept" } }).then(() => setHits((xs) => xs.map((x) => (x.id === h.id ? { ...x, status: "kept" } : x))))}>
                Keep log
              </button>
              <button type="button" className="text-[10px] text-danger" onClick={() => void setModHitStatus({ data: { id: h.id, status: "dropped" } }).then(() => setHits((xs) => xs.map((x) => (x.id === h.id ? { ...x, status: "dropped" } : x))))}>
                Drop
              </button>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function Settings({ store }: { store: Store }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [staffRole, setStaffRoleState] = useState<string | null>(null);

  useEffect(() => {
    void staffMe()
      .then((s) => setStaffRoleState(s.role))
      .catch(() => setStaffRoleState(null));
  }, []);

  async function change() {
    setErr("");
    setMsg("");
    if (next.trim().length < 8) {
      setErr("New password needs 8+ characters.");
      return;
    }
    const r = await authClient.changePassword({ currentPassword: current, newPassword: next });
    if (r.error) setErr(r.error.message ?? "Could not change password.");
    else {
      setMsg("Password updated.");
      setCurrent("");
      setNext("");
    }
  }

  const kindLabel = ACCOUNT_KINDS.find((k) => k.id === store.kind)?.label ?? "Member";

  return (
    <Screen kicker="YOU" title="Settings" sub="Username + password. No email reset.">
      <Card title="Public username" body={`${store.handle || "Sign in to set one"} · ${kindLabel}`} />
      <Card title="Change password" body="Do this while signed in. There is no reset email — this app does not collect your real email, so nobody can mail you a new password.">
        <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} placeholder="Current password" className="mt-2 w-full rounded-lg border border-line bg-panel px-3 py-2 text-base" />
        <input type="password" value={next} onChange={(e) => setNext(e.target.value)} placeholder="New password" className="mt-2 w-full rounded-lg border border-line bg-panel px-3 py-2 text-base" />
        {err ? <p className="mt-2 text-sm text-danger">{err}</p> : null}
        {msg ? <p className="mt-2 text-sm text-lime-2">{msg}</p> : null}
        <button type="button" className="btn-3d mt-2 rounded-lg px-3 py-2 text-sm" onClick={() => void change()}>
          Update password
        </button>
      </Card>
      {staffRole ? (
        <Card title="Staff console" body={`Your staff role: ${staffRole === "mod" ? "sub-admin" : staffRole}. This link is hidden from normal users.`}>
          <a href={STAFF_PATH} className="mt-2 inline-block rounded-lg border border-line px-3 py-2 text-sm">
            Open staff desk
          </a>
        </Card>
      ) : null}
      <Card title="This device" body="Signed-in pins and teams save on the server. Clear only wipes extras cached here.">
        <button type="button" className="mt-2 rounded-lg border border-danger/40 px-3 py-2 text-sm text-danger" onClick={store.reset}>
          Clear local extras
        </button>
      </Card>
    </Screen>
  );
}

function Help() {
  return (
    <Screen kicker="KILODE" title="Policies" sub="Each one is its own page. Read the one you need.">
      <div className="space-y-2">
        {LEGAL_PAGES.map((p) => (
          <a key={p.href} href={p.href} className="raised flex items-center justify-between rounded-2xl px-4 py-3">
            <span className="text-[14px] font-extrabold">{p.label}</span>
            <span className="text-[12px] font-bold text-lime-2">Open</span>
          </a>
        ))}
      </div>
    </Screen>
  );
}

function Contact({ store }: { store: Store }) {
  const [body, setBody] = useState("");
  const [sent, setSent] = useState(false);
  return (
    <div className="mx-auto max-w-2xl space-y-3 p-5">
      <h2 className="text-xl font-bold">Contact</h2>
      <p className="text-sm text-muted">Goes to staff inbox. Sign in first. Do not send passwords.</p>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={5}
        placeholder="Message"
        className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-base"
      />
      <button
        type="button"
        className="btn-3d rounded-lg px-3 py-2 text-sm"
        onClick={() => {
          if (!body.trim()) return;
          store.sendContact(body);
          setBody("");
          setSent(true);
        }}
      >
        Send to staff
      </button>
      {sent ? <p className="text-sm text-lime-2">Sent. We have it.</p> : null}
    </div>
  );
}
