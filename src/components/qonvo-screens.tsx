import { useEffect, useMemo, useState } from "react";
import { Eye, Mail, MessageSquare, Share2 } from "lucide-react";
import { AD_COINS, AD_DAYS, AD_KINDS, AD_PLACEMENTS, AD_SIZES, ACCOUNT_KINDS, CHAT_TTLS, COMMUNITIES, KIND_FACE, KIND_PURPOSE, POST_CATS, REGIONS, ROOMS, chatTtlLabel, daysLeft, fmtCount, handleColor, parseMusicUrl, roomName, safeHttpUrl, slugify, timeAgo, timeLabel, youtubeId, type AccountKind, type AdKind, type AdPlacement, type MenuId, type Post } from "@/lib/qonvo-data";
import type { useQonvo } from "@/lib/use-qonvo";
import { claimOps, clearModUser, deletePost, getModSettings, hidePost, listAdsQueue, listMail, listMembers, listModHits, listModUsers, listReports, listStaff, listStaffPosts, removeStaff, resetUserPassword, saveChatTtl, saveModSettings, saveWallet, deleteWallet, setAccountKind, setModHitStatus, setModUser, setStaffRole, setVerified, staffMe, unhidePost } from "@/lib/staff-server";
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
import { listAdCatalog } from "@/lib/ad-catalog-server";
import { dbStatus } from "@/lib/register-server";
import { listInbox, listNotes, sendDm } from "@/lib/social-server";
import { authClient, signOut } from "@/lib/auth/client";
import { AvatarImg, AvatarPicker } from "@/components/account-kind";
import { canKind, createSheetTitle } from "@/lib/permissions";
import { CinemaAdminPanel } from "@/components/cinema-pane";
import { ListingsAdminPanel, ListingsPane } from "@/components/listings-pane";
import { ShopAdminPanel } from "@/components/downloads-pane";
import { SocialsAdminPanel, TvPane } from "@/components/tv-pane";
import { JoinCta, TelegramLink } from "@/components/get-app";
import { BrandLockup } from "@/components/brand-lockup";
import { MeDashboard } from "@/components/me-dashboard";
import { AdCatalogPanel, AdSlotsPanel, OpsKeysPanel, OpsSeoPanel, RoomsAdminPanel } from "@/components/ops-tools";
import { SiteFlagsPanel } from "@/components/site-chrome";
import { matchAdPayments, matchOneAd } from "@/lib/pay-match-server";
import { applyListing, listListings, saveListing, type Listing } from "@/lib/listings-server";
import { submitMovie } from "@/lib/cinema-server";
import { DEFAULT_MOD, type ModSettings } from "@/lib/moderator";
import { PostRichEditor } from "@/components/post-rich-editor";
import { postBodyPlain, sanitizePostHtml } from "@/lib/post-body";

type Store = ReturnType<typeof useQonvo>;

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
  else if (id === "trending") view = <Trending onHome={onHome} />;
  else if (id === "tv") view = <TvPane />;
  else if (id === "contact") view = <Contact store={store} />;
  else if (id === "admin") view = <Admin store={store} />;
  return <div className="h-full overflow-y-auto dock-pad md:pb-4">{view}</div>;
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

function Screen({ kicker, title, sub, children }: { kicker: string; title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-2xl p-4 pb-20">
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
  useEffect(() => setPane(primary), [primary]);
  useEffect(() => {
    const onCreate = (e: Event) => {
      const next = (e as CustomEvent<{ pane?: Pane }>).detail?.pane;
      if (next) setPane(next);
    };
    window.addEventListener("kilode:create", onCreate);
    return () => window.removeEventListener("kilode:create", onCreate);
  }, []);
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
  const [applyId, setApplyId] = useState("");
  const [openJobs, setOpenJobs] = useState<Listing[]>([]);
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
      else {
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
      else {
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
    // job_seeker: no post music — only apply. Hide feeds for seeker unless they want browse.
    if (ak === "job_seeker" && t.id === "post") return false;
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
            <span className="font-semibold text-white">NOWPayments</span> stays off until Super Admin pastes an API key in /ops — then it can auto-invoice. Manual wallets are live now.
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
    : pane === "apply" ? "Browse and apply to jobs. You cannot post jobs or music."
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
          <p className="text-sm text-muted">Pick a live role, leave a short note. The poster sees your @handle. You cannot post jobs or list music.</p>
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
              <textarea value={applyNote} onChange={(e) => setApplyNote(e.target.value)} rows={3} placeholder="Short note / WhatsApp / why you fit (optional)" className="w-full rounded-xl border border-line bg-panel px-3 py-2.5 text-base" />
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
                  void applyListing({ data: { id: applyId, note: applyNote } }).then((r) => {
                    setBusy(false);
                    if (!r.ok) setErr(r.reason);
                    else {
                      setMsg("Application sent. Track it on Me → Applications.");
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
              <a href="/terms#content" className="font-semibold text-lime-2 underline" target="_blank" rel="noreferrer">
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
              <a href="/terms#content" className="font-semibold text-lime-2 underline" target="_blank" rel="noreferrer">
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
  const [jobs, setJobs] = useState<Listing[]>([]);
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
  return (
    <Screen kicker="DISCOVER" title="Search" sub="Feeds, rooms, artists, jobs.">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Feeds, rooms, artists, jobs"
        className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-base"
      />
      {s ? (
        <>
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
        </>
      ) : null}
      <div className="text-[11px] font-medium text-muted">Rooms</div>
      {rooms.map((r) => (
        <button
          key={r.id}
          type="button"
          onClick={() => onHome(r.id)}
          className="block w-full rounded-xl border border-line bg-panel p-3 text-left text-sm"
        >
          {r.name}
          <span className="block text-xs text-muted">{r.region}</span>
        </button>
      ))}
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
  useEffect(() => {
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
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Public username" className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-base" />
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
      <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City (optional)" className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-base" />
      <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} placeholder="Bio" className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-base" />
      <button
        type="button"
        className="btn-3d rounded-lg px-3 py-2 text-sm"
        onClick={() => store.rename(name, { bio, city, kind, stage, genre, website, brand, face })}
      >
        Save profile
      </button>
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
          <div className="mx-auto mb-3 inline-flex justify-center"><BrandLockup size="sm" /></div>
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
  const [rows, setRows] = useState<{ id: string; from: string; to: string; body: string; ts: number }[]>([]);
  function reload() {
    void listInbox()
      .then(setRows)
      .catch(() => setRows([]));
  }
  useEffect(() => {
    reload();
  }, []);
  return (
    <Screen kicker="YOU" title="Messages" sub="Private DMs. Username only. Staff cannot read these.">
      <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="Their username" className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-base" />
      <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} placeholder="Message" className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-base" />
      {msg ? <p className="text-sm text-muted">{msg}</p> : null}
      <button
        type="button"
        className="btn-3d rounded-lg px-3 py-2 text-sm"
        onClick={() => {
          void sendDm({ data: { to, body } }).then((r) => {
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
      {rows.map((r) => (
        <div key={r.id} className="rounded-xl border border-line bg-panel p-3">
          <div className="text-xs text-lime-2">
            {r.from} → {r.to}
          </div>
          <p className="mt-1 text-sm">{r.body}</p>
          <div className="text-[10px] text-muted">{new Date(r.ts).toLocaleString()}</div>
        </div>
      ))}
    </Screen>
  );
}

function Teams({ store, onHome }: { store: Store; onHome: (id?: string) => void }) {
  const [name, setName] = useState("");
  const [err, setErr] = useState("");
  const mine = store.teams.filter((t) => (t.members ?? [])[0] === store.handle).length;
  return (
    <Screen kicker="CREW" title="Teams" sub="Small named groups on Kilode. Not WhatsApp. Chat still lives on our servers.">
      {!store.handle ? (
        <JoinCta />
      ) : (
        <>
          <div className="raised mb-3 rounded-2xl p-4 text-[13px] leading-6 text-muted">
            <p>Any signed-in member can create up to 3 teams. Anyone signed in can join until it hits 40 people. Open chat uses the same live room engine as Global Chat — room id <span className="font-mono text-fg">tm-…</span>.</p>
            <p className="mt-2">Use a team for a crew, a campaign, or a music collab. Do not run scams. Staff can still hide abuse.</p>
            <p className="mt-2 text-lime-2">You have created {mine}/3 teams.</p>
          </div>
          <div className="flex gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Team name"
              className="flex-1 rounded-lg border border-line bg-panel px-3 py-2 text-base"
            />
            <button
              type="button"
              className="btn-3d rounded-lg px-3 py-2 text-sm"
              onClick={() => {
                setErr("");
                if (mine >= 3) {
                  setErr("Max 3 teams you create.");
                  return;
                }
                store.createTeam(name);
                setName("");
              }}
            >
              Create
            </button>
          </div>
          {err ? <p className="text-sm text-danger">{err}</p> : null}
          {store.teams.length === 0 ? <p className="mt-3 text-sm text-muted">No teams yet. Create the first.</p> : null}
          {store.teams.filter((t) => !!t?.id).map((t) => (
            <div key={t.id} className="raised mt-3 rounded-2xl p-4">
              <div className="text-sm font-extrabold">{t.name}</div>
              <div className="text-[11px] text-muted">{(t.members ?? []).length}/40 · {(t.members ?? []).slice(0, 8).join(", ")}</div>
              <div className="mt-2 flex gap-3">
                <button type="button" className="text-xs font-semibold text-lime-2" onClick={() => store.joinTeam(t.id)}>
                  Join
                </button>
                <button type="button" className="text-xs font-semibold text-lime-2" onClick={() => onHome(`tm-${t.id}`)}>
                  Open chat
                </button>
              </div>
            </div>
          ))}
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

function Ads({ store }: { store: Store }) {
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [link, setLink] = useState("");
  const [image, setImage] = useState("");
  const [video, setVideo] = useState("");
  const [kind, setKind] = useState<AdKind>("image-text");
  const [place, setPlace] = useState<AdPlacement>("board");
  const [days, setDays] = useState<number>(7);
  const [coin, setCoin] = useState("usdt");
  const [txHash, setTxHash] = useState("");
  const [amount, setAmount] = useState("");
  const [agree, setAgree] = useState(false);
  const [err, setErr] = useState("");
  const [copied, setCopied] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [wallets, setWallets] = useState<{ coin: string; address: string }[]>([]);
  const [prices, setPrices] = useState<Record<string, number>>({});
  useEffect(() => {
    void listWallets()
      .then(setWallets)
      .catch(() => setWallets([]));
    void listAdCatalog()
      .then((c) => setPrices(c.prices))
      .catch(() => undefined);
  }, []);
  const payTo = wallets.find((w) => w.coin === coin)?.address;
  const mine = store.campaigns.filter((c) => !!c?.id && (c.status !== "approved" || c.expiresAt));
  const size = AD_SIZES[place] ?? AD_SIZES.board;
  const slot = AD_PLACEMENTS.find((p) => p.id === place);
  const usd = prices[place] ?? slot?.usd ?? 40;
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
  if (!store.handle) {
    return (
      <Screen kicker="ADS" title="Place an ad" sub="Ads Poster and Brand accounts pay crypto. Staff approve. Guests can browse live ads on the Ads tab.">
        <JoinCta />
      </Screen>
    );
  }
  if (!canKind(store.kind, "ads.submit")) {
    return (
      <Screen kicker="ADS" title="Ads Poster accounts only" sub="You registered as a different type. Super admin can switch the type from the staff console.">
        <p className="text-sm text-muted">Browse live ads on the Ads tab. To place one, you need an Ads Poster or Brand account.</p>
      </Screen>
    );
  }
  if (done) {
    return (
      <Screen kicker="ADS" title="Submitted" sub="Staff have your creative and the tx hash.">
        <div className="raised rounded-2xl p-4">
          <h3 className="text-lg font-extrabold">{done}</h3>
          <ol className="mt-3 list-decimal space-y-2 pl-4 text-[13px] leading-6 text-muted">
            <li>We match the transaction on the chain (first and last 6 of the address you copied).</li>
            <li>Staff approve, reject, or ask for a correction. You will see status here — not by email.</li>
            <li>If approved, the ad goes live on the slot you paid for until the {days}-day window ends.</li>
            <li>If rejected before it runs, Contact us. Chain fees are never refunded.</li>
          </ol>
        </div>
        <button type="button" className="btn-3d mt-3 rounded-xl px-3 py-2 text-sm" onClick={() => setDone(null)}>
          Place another
        </button>
        <div className="mt-4 mb-2 text-[10px] font-bold tracking-[0.16em] text-muted">YOUR CAMPAIGNS</div>
        {mine.map((c) => (
          <div key={c.id} className="raised mb-2 flex gap-2 overflow-hidden rounded-2xl">
            {c.image ? <img src={c.image} alt="" className="h-16 w-20 object-cover" /> : <div className="grid h-16 w-20 place-items-center bg-panel-3 text-[10px] text-lime-2">AD</div>}
            <div className="min-w-0 py-2 pr-2">
              <div className="truncate text-sm font-bold">{c.name}</div>
              <div className="text-[10px] text-lime-2">{c.status} · {c.days ?? 7} days · {c.placement}</div>
            </div>
          </div>
        ))}
      </Screen>
    );
  }
  return (
    <Screen kicker="ADS" title="Place an ad" sub="Pick a slot, creative type, and duration. Pay crypto. Staff approve. Then it appears on that slot.">
      <div className="mb-3 rounded-xl border border-lime-2/30 bg-lime-2/5 px-3 py-2 text-[11px] leading-snug text-muted">
        <span className="font-bold text-lime-2">1 · Slot</span> → <span className="font-bold text-lime-2">2 · Creative</span> → <span className="font-bold text-lime-2">3 · Copy wallet</span> → pay → paste tx → submit.{" "}
        NOWPayments needs a Super Admin API key (not set) — use manual crypto wallets.
      </div>
      <div className="mb-3 grid gap-1.5" role="group" aria-label="Ad slot">
        {AD_PLACEMENTS.map((p) => {
          const on = place === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setPlace(p.id)}
              aria-pressed={on}
              className={`raised rounded-2xl px-3 py-3 text-left transition ${
                on
                  ? "border-lime-2 bg-lime-2/[0.12] shadow-[0_0_0_2px_var(--color-lime-2),0_6px_16px_rgba(31,122,64,0.18)] -translate-y-px"
                  : ""
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className={`text-sm font-bold ${on ? "text-lime-2" : ""}`}>{p.label}</span>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-[12px] font-extrabold text-lime-2">${prices[p.id] ?? p.usd}</span>
                  <span
                    aria-hidden
                    className={`grid size-5 place-items-center rounded-full text-[11px] font-bold leading-none ${
                      on ? "bg-lime-2 text-[#f4f7f5]" : "border border-line bg-transparent text-transparent"
                    }`}
                  >
                    ✓
                  </span>
                </div>
              </div>
              <div className="mt-0.5 text-[11px] text-muted">{p.hint}</div>
            </button>
          );
        })}
      </div>
      <div className="mb-1 text-[11px] font-medium text-muted">Duration</div>
      <div className="mb-3 flex flex-wrap gap-1">
        {AD_DAYS.map((d) => (
          <button key={d} type="button" onClick={() => setDays(d)} className={`rounded-full px-2.5 py-1 text-[11px] ${days === d ? "btn-3d font-semibold" : "border border-line text-muted"}`}>
            {d} days
          </button>
        ))}
      </div>
      <div className="mb-1 text-[11px] font-medium text-muted">Creative type</div>
      <div className="mb-3 flex flex-wrap gap-1">
        {AD_KINDS.map((k) => (
          <button key={k.id} type="button" onClick={() => setKind(k.id)} className={`rounded-full px-2.5 py-1 text-[11px] ${kind === k.id ? "btn-3d font-semibold" : "border border-line text-muted"}`}>
            {k.label}
          </button>
        ))}
      </div>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Brand / campaign name" className="mb-2 w-full rounded-lg border border-line bg-panel px-3 py-2 text-base" />
      <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="Destination URL (https://…)" className="mb-2 w-full rounded-lg border border-line bg-panel px-3 py-2 text-base" />
      {kind === "image" || kind === "image-text" ? (
        <div className="inset-well mb-2 rounded-xl p-3">
          <div className="text-[11px] font-medium text-muted">Image · {size.label}</div>
          <p className="mb-2 text-[11px] text-muted">{size.hint}</p>
          <input type="file" accept="image/*" onChange={(e) => void onFile(e.target.files?.[0])} className="text-xs" />
          <input value={image.startsWith("data:") ? "" : image} onChange={(e) => setImage(e.target.value)} placeholder="Or paste image URL https://…" className="mt-2 w-full rounded-lg border border-line bg-panel px-3 py-2 text-base" />
          {image ? <img src={image} alt="" className="mt-2 max-h-36 rounded-lg object-cover" /> : null}
        </div>
      ) : null}
      {kind === "video" || kind === "video-text" ? (
        <input value={video} onChange={(e) => setVideo(e.target.value)} placeholder="YouTube URL (not hosted here)" className="mb-2 w-full rounded-lg border border-line bg-panel px-3 py-2 text-base" />
      ) : null}
      {kind !== "image" && kind !== "video" ? (
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Short copy" className="mb-2 w-full rounded-lg border border-line bg-panel px-3 py-2 text-base" />
      ) : null}
      <div className="mb-1 text-[11px] font-medium text-muted">Pay with</div>
      <div className="mb-2 flex flex-wrap gap-1">
        {AD_COINS.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCoin(c.id)}
            className={`rounded-full px-2 py-1 text-[11px] ${coin === c.id ? "btn-3d font-semibold" : "border border-line text-muted"}`}
          >
            {c.ticker}
          </button>
        ))}
      </div>
      <div className="raised mb-3 rounded-2xl p-3 text-xs">
        <div className="text-muted">Send {AD_COINS.find((c) => c.id === coin)?.label} to this Kilode wallet only</div>
        <div className="mt-1 break-all font-mono text-[11px]">{payTo || "Wallet not set yet."}</div>
        {payTo ? (
          <button
            type="button"
            className="mt-2 rounded border border-line px-2 py-1 text-[11px] font-semibold"
            onClick={() => {
              void navigator.clipboard?.writeText(payTo).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1400);
              });
            }}
          >
            {copied ? "Copied" : "Copy address"}
          </button>
        ) : null}
        <p className="mt-2 text-[10px] leading-snug text-danger">
          Verify the first and last 6 characters. Wrong network = lost funds. Kilode never DMs a wallet. We match your tx on the public chain.
        </p>
      </div>
      <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={`Amount sent (about $${usd} USD in crypto)`} className="mb-2 w-full rounded-lg border border-line bg-panel px-3 py-2 text-base" />
      <input value={txHash} onChange={(e) => setTxHash(e.target.value)} placeholder="Transaction hash / payment ID after you pay" className="mb-2 w-full rounded-lg border border-line bg-panel px-3 py-2 text-base" />
      {err ? <p className="mb-2 text-sm text-danger">{err}</p> : null}
      <label className="mb-3 flex items-start gap-2 text-[11px] text-muted">
        <input type="checkbox" className="mt-0.5" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
        <span>
          I agree to the{" "}
          <a href="/terms#ads" className="font-semibold text-lime-2 underline" target="_blank" rel="noreferrer">
            Ads & crypto terms
          </a>
          . I paid from my own wallet. Staff may reject a bad or missing hash.
        </span>
      </label>
      <button
        type="button"
        className="btn-join mb-4 w-full rounded-xl py-3 text-sm font-bold"
        onClick={() => {
          if (!agree) {
            setErr("Accept the Terms.");
            return;
          }
          if (!name.trim() || !txHash.trim()) {
            setErr("Name and payment tx are required.");
            return;
          }
          const img = kind.includes("image") ? (image.startsWith("data:") ? image : safeHttpUrl(image)) : undefined;
          store.saveAd(name, note, {
            placement: place,
            txHash,
            amount,
            coin,
            link: safeHttpUrl(link),
            image: img,
            video: kind.includes("video") ? youtubeId(video) || safeHttpUrl(video) : undefined,
            kind,
            days,
          });
          setDone(name.trim());
          setName("");
          setNote("");
          setLink("");
          setImage("");
          setVideo("");
          setTxHash("");
          setAmount("");
          setErr("");
        }}
      >
        Submit for approval
      </button>
      <div className="mb-2 text-[10px] font-bold tracking-[0.16em] text-muted">YOUR CAMPAIGNS</div>
      {mine.length === 0 ? <p className="text-sm text-muted">None yet. After you submit, status shows here: paid → approved or rejected.</p> : null}
      {mine.map((c) => (
        <div key={c.id} className="raised mb-2 flex gap-2 overflow-hidden rounded-2xl">
          {c.image ? <img src={c.image} alt="" className="h-16 w-20 object-cover" /> : <div className="grid h-16 w-20 place-items-center bg-panel-3 text-[10px] text-lime-2">AD</div>}
          <div className="min-w-0 py-2 pr-2">
            <div className="truncate text-sm font-bold">{c.name}</div>
            <div className="text-[10px] text-lime-2">{c.status} · {c.days ?? 7} days · {c.placement}</div>
            <div className="truncate text-[10px] text-muted">
              {(c.coin || "").toUpperCase()} {c.amount || ""}
              {c.expiresAt ? ` · ${daysLeft(c.expiresAt, c.days)}d left` : ""}
              {" · "}
              {fmtCount(c.views ?? 0)} views
            </div>
          </div>
        </div>
      ))}
    </Screen>
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
  const [reports, setReports] = useState<{ id: string; post_id: string; author: string; reason: string; ts: number }[]>([]);
  const [wallets, setWallets] = useState<Record<string, string>>({});
  const [members, setMembers] = useState<{ id: string; handle: string; kind?: string; verified?: boolean }[]>([]);
  const [walletMsg, setWalletMsg] = useState("");
  const [extraCoin, setExtraCoin] = useState("");
  const [extraAddr, setExtraAddr] = useState("");

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
        <p className="text-sm text-muted">This account is not staff. Sign in on the staff door (tap the mark 5 times) with the owner account.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-3 overflow-y-auto p-4 md:grid-cols-2">
      <div className="md:col-span-2">
        <h2 className="text-xl font-bold">Super admin</h2>
        <p className="text-xs text-muted">
          Role {role} · id {userId}
        </p>
      </div>
      {role === "super" || role === "admin" ? (
        <div className="md:col-span-2">
          <div className="mb-1 text-[10px] font-bold tracking-[0.16em] text-lime-2">STAFF · ACCOUNT TYPE</div>
          <VerifyKindPanel members={members} canKind={role === "super"} onReload={() => void listMembers().then(setMembers).catch(() => undefined)} />
        </div>
      ) : null}
      <OpsKeysPanel />
      <OpsSeoPanel />
      <AdsQueuePanel store={store} />
      {role === "super" ? <SiteFlagsPanel /> : null}
      {role === "super" ? <AdCatalogPanel /> : null}
      {role === "super" ? <AdSlotsPanel /> : null}
      {role === "super" ? <RoomsAdminPanel /> : null}
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
        {reports.map((r) => (
          <div key={r.id} className="flex items-center justify-between gap-2 rounded-xl border border-line bg-panel p-3">
            <div className="min-w-0">
              <div className="text-xs font-semibold">{r.author}</div>
              <p className="text-sm">{r.reason}</p>
              <div className="text-[10px] text-muted">post {r.post_id}</div>
            </div>
            <button type="button" className="shrink-0 text-xs text-danger" onClick={() => void hidePost({ data: r.post_id })}>
              Hide post
            </button>
          </div>
        ))}
      </div>
      <FeedsDeskPanel store={store} />
      {role === "super" ? <ShopAdminPanel /> : null}
      {role === "super" ? <SocialsAdminPanel /> : null}
      {role === "super" ? <ChatTtlPanel /> : null}
      {role === "super" ? <NewsEnginePanel store={store} /> : null}
      {role === "super" || role === "admin" ? <CinemaAdminPanel /> : null}
      {role === "super" || role === "admin" ? <ListingsAdminPanel /> : null}
      {role === "super" ? <DbPanel /> : null}
      {role ? <BanMutePanel members={members} /> : null}
      {role === "super" || role === "admin" ? <ModPanel /> : null}
      {role === "super" || role === "admin" ? <AdminPassword /> : null}
      {role === "super" || role === "admin" ? <AdminResetPassword members={members} /> : null}
      {role === "super" || role === "admin" ? (
        <div className="md:col-span-2 raised space-y-2 rounded-xl p-3">
          <div className="text-[11px] font-medium text-muted">Pay-to wallets</div>
          <p className="text-xs text-muted">Shown when users pay ads or donate. They copy from the app only. Add more coins below.</p>
          {walletMsg ? <p className="text-[11px] text-lime-2">{walletMsg}</p> : null}
          {Array.from(new Set([...AD_COINS.map((c) => c.id), ...Object.keys(wallets)])).map((id) => {
            const c = AD_COINS.find((x) => x.id === id);
            const ticker = c?.ticker ?? id.toUpperCase();
            return (
              <div key={id} className="flex gap-2">
                <span className="w-14 shrink-0 pt-2 text-[10px] font-bold text-muted">{ticker}</span>
                <input
                  value={wallets[id] ?? ""}
                  onChange={(e) => setWallets((w) => ({ ...w, [id]: e.target.value }))}
                  placeholder={`${c?.label ?? id} address`}
                  className="flex-1 rounded-lg border border-line bg-panel px-3 py-2 font-mono text-xs"
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
      {role === "super" ? (
        <div className="md:col-span-2 raised space-y-2 rounded-xl p-3">
          <div className="text-[11px] font-medium text-muted">Staff access</div>
          <p className="text-xs text-muted">Only you are super. You grant sub-admin or admin. You can revoke. Nobody can take your seat.</p>
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
                else setMsg("");
                void listStaff().then(setStaff);
              });
            }}
          >
            Grant access
          </button>
          {msg ? <p className="text-sm text-danger">{msg}</p> : null}
          {staff.map((s) => (
            <div key={s.user_id} className="flex items-center justify-between gap-2 text-xs">
              <span className="text-muted">
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
    <div className="md:col-span-2 raised space-y-2 rounded-xl p-3">
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
    <div className="md:col-span-2 raised space-y-1 rounded-xl p-3">
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
    <div className="md:col-span-2 raised space-y-2 rounded-xl p-3">
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
  const picked = members.find((m) => m.handle.toLowerCase() === handle.trim().toLowerCase());
  return (
    <div className="md:col-span-2 raised space-y-2 rounded-xl p-3">
      <div className="text-[11px] font-medium text-muted">Verified badge + override account type</div>
      <p className="text-xs text-muted">Pick a member below or type their username. Admin can verify. Only Super can change account type (immutable for users).</p>
      <input value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="Username" className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-base" />
      {picked ? <p className="text-[11px] text-muted">{picked.handle} · {picked.kind} · {picked.verified ? "verified" : "not verified"}</p> : null}
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
      </div>
      {canChangeKind ? (
        <div className="flex flex-wrap gap-2">
          <select value={kind} onChange={(e) => setKind(e.target.value as AccountKind)} className="flex-1 rounded-lg border border-line bg-panel px-3 py-2 text-base">
            {ACCOUNT_KINDS.map((k) => (
              <option key={k.id} value={k.id}>
                {k.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn-3d rounded-lg px-3 py-2 text-[11px] font-bold"
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
      {msg ? <p className="text-[11px] text-lime-2">{msg}</p> : null}
      <div className="max-h-40 overflow-y-auto">
        {members.slice(0, 40).map((m) => (
          <button
            key={m.id}
            type="button"
            className="flex w-full items-center justify-between gap-2 border-b border-white/5 py-1 text-left text-[11px]"
            onClick={() => {
              setHandle(m.handle);
              if (m.kind) setKind(m.kind as AccountKind);
            }}
          >
            <span>@{m.handle}</span>
            <span className="text-muted">
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
    <div className="md:col-span-2 raised space-y-2 rounded-xl p-3">
      <div className="text-[10px] font-bold tracking-normal text-lime-2">Mute & ban</div>
      <p className="text-xs text-muted">Mute stops chat. Ban stops chat, feeds, ads, and music. Owner cannot be restricted.</p>
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
    <div className="md:col-span-2 raised space-y-2 rounded-xl p-3">
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
    <div className="md:col-span-2 raised space-y-3 rounded-xl p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="text-[11px] font-medium text-muted">News Engine</div>
          <h3 className="text-base font-bold">Fetch this week · put on Feeds</h3>
          <p className="mt-1 text-xs text-muted">
            Nigeria, Africa, world. Real RSS, real thumbnails only — no fake photos. {llm ? "LLM rewrite keyed." : "Kilode-voice rewrite."} Archive or delete any story in Feeds desk.
          </p>
        </div>
        <button
          type="button"
          disabled={busy}
          className="btn-3d rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-50"
          onClick={() => {
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
              .catch((e) => setMsg(e instanceof Error ? e.message : "Fetch failed"))
              .finally(() => setBusy(false));
          }}
        >
          {busy ? "Fetching…" : "Fetch latest"}
        </button>
        <button
          type="button"
          disabled={busy}
          className="btn-join rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-50"
          onClick={() => {
            setBusy(true);
            setMsg("");
            void publishNewsWeek()
              .then((r) => {
                setMsg(`This week on Feeds: ${r.published} with real photos (${r.withPhoto} ready · ${r.candidates} this week · ${r.feeds} feeds). ${r.errors.length ? r.errors[0] : ""}`);
                reload();
              })
              .catch((e) => setMsg(e instanceof Error ? e.message : "Publish failed"))
              .finally(() => setBusy(false));
          }}
        >
          {busy ? "Publishing…" : "Put this week on Feeds"}
        </button>
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
                <div className="grid gap-2 sm:grid-cols-3">
                  <input value={edit.tags} onChange={(e) => setEdit((x) => ({ ...x, tags: e.target.value }))} className="rounded-lg border border-line bg-panel-2 px-2 py-1.5 text-base" placeholder="Tags" />
                  <input value={edit.category} onChange={(e) => setEdit((x) => ({ ...x, category: e.target.value }))} className="rounded-lg border border-line bg-panel-2 px-2 py-1.5 text-base" placeholder="Category" />
                  <input value={edit.image} onChange={(e) => setEdit((x) => ({ ...x, image: e.target.value }))} className="rounded-lg border border-line bg-panel-2 px-2 py-1.5 text-base" placeholder="Image URL" />
                </div>
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
    <div className="md:col-span-2 raised space-y-2 rounded-xl p-3">
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
    <div className="md:col-span-2 raised space-y-3 rounded-xl p-3">
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
          <a href="/ops" className="mt-2 inline-block rounded-lg border border-line px-3 py-2 text-sm">
            Open /ops
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
    <Screen kicker="KILODE" title="Help & terms" sub="How accounts, ads, cinema, and listings work.">
      <Card title="Accounts" body="Username + password. Tick Terms and Rules. One account type at register — you cannot switch it. The operator may correct a wrong type. No public email. Full legal: /terms" />
      <Card title="What each type can do" body="Normal user: chat, feeds, vote, apply to jobs. Artist: music URLs only. Writer: feeds. Ads Poster: business ads. Cinema Poster: movie YouTube URLs. Job Poster / Seeker, Marketplace seller, Rent lister: their module only." />
      <Card title="Chat" body="Signed-in messages save on the server and expire. Use ‹ › to page older/newer chat. Use Show in … at the top right of a room to translate the thread into Yoruba, Igbo, Hausa, French, or Spanish." />
      <Card title="Feeds & music" body="Create post after you sign in. Only Artist lists music. Paste a Spotify / SoundCloud / Audiomack / Apple / Boomplay / Deezer URL. We embed their player — nothing streams from Kilode. Spotify iframe is a 30-second preview unless the visitor is logged into Spotify. SoundCloud and Audiomack play the full track if the artist allowed streaming. Artwork is fetched once via oEmbed when you submit." />
      <Card title="Teams" body="Signed-in members create up to 3 teams. Anyone signed in can join (max 40). Open chat is a Kilode room, same engine as Global Chat. Not a second WhatsApp. Abuse can be hidden." />
      <Card title="Ads" body="Pick a slot, creative type, and 1 / 7 / 14 / 30 days. Copy the wallet from this app, pay crypto, paste the tx hash. Ads go live after review. Never send funds to an address from a DM." />
      <Card title="Cinema" body="Anyone can watch Watching Now — it is a YouTube embed, not a file on Kilode. Signed-in users vote once per title per day. Cinema Poster submits a YouTube URL. Chat under the player uses the same engine as rooms." />
      <Card title="Jobs, Marketplace, Rent" body="Job Poster lists jobs. Job Seekers apply. Marketplace and Rent are showcase + contact only — no selling or renting inside the app. Listings are reviewed before they go public." />
      <Card title="Verification" body="Public handles may show a Kilode Verified mark. The operator can correct an account type if you registered as the wrong one. There is no public staff directory." />
      <Card title="Scale" body="Chat refreshes while the tab is open. Video and music play from YouTube / Spotify / SoundCloud — not from Kilode servers." />
      <Card title="Privacy" body="No public email. Login uses a private username. Do not put real addresses or ID numbers in chat. Cookies keep you signed in. We do not sell your handle list." />
      <p className="px-1 text-[11px] text-muted">
        <a href="/terms" className="text-lime-2 underline">
          Full Terms, Rules, Privacy and How to use
        </a>
      </p>
      <p className="px-1 text-[10px] text-muted">
        Developer <TelegramLink className="text-[10px]" />
      </p>
    </Screen>
  );
}

function Trending({ onHome }: { onHome: (id?: string) => void }) {
  const top = [...ROOMS].sort((a, b) => b.online - a.online).slice(0, 12);
  const max = top[0]?.online || 1;
  return (
    <Screen kicker="LIVE" title="Trending" sub="Hottest rooms right now.">
      {top.map((r, i) => (
        <button
          key={r.id}
          type="button"
          onClick={() => onHome(r.id)}
          className="raised mb-2 w-full overflow-hidden rounded-2xl p-3 text-left"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold">
              <span className="mr-2 text-lime-2">{String(i + 1).padStart(2, "0")}</span>
              {r.name}
            </span>
            <span className="text-[11px] text-muted">{r.online.toLocaleString()}</span>
          </div>
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/5">
            <div className="h-full rounded-full bg-lime-2" style={{ width: `${Math.max(8, (r.online / max) * 100)}%` }} />
          </div>
        </button>
      ))}
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
