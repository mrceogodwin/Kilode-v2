import { useEffect, useMemo, useState } from "react";
import {
  Bookmark,
  Briefcase,
  Building2,
  Download,
  Film,
  HelpCircle,
  LogOut,
  Megaphone,
  MessageSquare,
  Pencil,
  Plus,
  Radio,
  Store,
  Trash2,
  Tv,
  Users,
  Vote,
} from "lucide-react";
import {
  ACCOUNT_KINDS,
  KIND_PURPOSE,
  fmtCount,
  roomName,
  safeHttpUrl,
  timeAgo,
  type AccountKind,
} from "@/lib/qonvo-data";
import type { useQonvo } from "@/lib/use-qonvo";
import { canKind } from "@/lib/permissions";
import { AvatarImg } from "@/components/account-kind";
import { VerifiedMark } from "@/components/handle-link";
import { AdSlot } from "@/components/ad-slot";
import { DigestBox } from "@/components/get-app";
import { SiteFooter } from "@/components/site-chrome";
import { listMyCinema, type CinemaMovie } from "@/lib/cinema-server";
import { deleteListing, listListings, listMyApps, listMyApplicants, listMyListings, updateListing, type Listing, type MyApp, type MyApplicant } from "@/lib/listings-server";
import { disconnectFellow, listConnects, replyConnect, type ConnectRow } from "@/lib/takes-server";
import { getProfile } from "@/lib/forum-server";
import { staffMe } from "@/lib/staff-server";
import { usePublicSite } from "@/components/site-chrome";

type Store = ReturnType<typeof useQonvo>;

function goto(detail: { screen?: string; tab?: string }) {
  window.dispatchEvent(new CustomEvent("kilode:goto", { detail }));
}

function openCreate() {
  window.dispatchEvent(new Event("kilode:create"));
}

function openCreatePost() {
  window.dispatchEvent(new CustomEvent("kilode:create", { detail: { pane: "post" } }));
}

function Section({
  kicker,
  title,
  action,
  onAction,
  children,
}: {
  kicker: string;
  title: string;
  action?: string;
  onAction?: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-5">
      <div className="mb-2 flex items-end justify-between gap-2">
        <div>
          <div className="text-[10px] font-bold tracking-[0.16em] text-lime-2">{kicker}</div>
          <h3 className="text-[15px] font-extrabold leading-tight">{title}</h3>
        </div>
        {action && onAction ? (
          <button type="button" onClick={onAction} className="shrink-0 text-[11px] font-semibold text-lime-2">
            {action}
          </button>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function EmptyBlock({ body, cta, onClick }: { body: string; cta?: string; onClick?: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-panel/60 px-4 py-5 text-center">
      <p className="text-[12px] text-muted">{body}</p>
      {cta && onClick ? (
        <button type="button" className="btn-join mt-3 rounded-lg px-3 py-1.5 text-[11px] font-bold" onClick={onClick}>
          {cta}
        </button>
      ) : null}
    </div>
  );
}

function FriendsBlock({ rows, onChange }: { rows: ConnectRow[]; onChange: () => void }) {
  const incoming = rows.filter((r) => r.dir === "in");
  const friends = rows.filter((r) => r.dir === "friend");
  const sent = rows.filter((r) => r.dir === "out");
  return (
    <section id="me-friends" className="mb-4 rounded-2xl border border-line bg-panel p-3">
      <h3 className="text-[13px] font-extrabold">Friends</h3>
      <p className="mt-0.5 text-[11px] text-muted">Accepted people. Incoming asks sit here too.</p>
      {incoming.length === 0 && friends.length === 0 && sent.length === 0 ? (
        <p className="mt-2 text-[12px] text-muted">No requests yet. Connect from Socials.</p>
      ) : null}
      {incoming.map((r) => (
        <div key={`in-${r.id}`} className="mt-2 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate text-[13px] font-semibold">@{r.handle}</div>
            <div className="text-[10px] text-muted">{r.role} · wants to connect</div>
          </div>
          <div className="flex shrink-0 gap-1">
            <button
              type="button"
              className="rounded-lg bg-lime-2 px-2 py-1 text-[11px] font-bold text-[#102016]"
              onClick={() => {
                void replyConnect({ data: { id: r.id, accept: true } }).then((res) => {
                  if (res && "ok" in res && res.ok === false) return;
                  onChange();
                });
              }}
            >
              Accept
            </button>
            <button
              type="button"
              className="rounded-lg border border-line px-2 py-1 text-[11px]"
              onClick={() => {
                void replyConnect({ data: { id: r.id, accept: false } }).then(() => onChange());
              }}
            >
              Decline
            </button>
          </div>
        </div>
      ))}
      {sent.map((r) => (
        <div key={`out-${r.id}`} className="mt-2 text-[12px] text-muted">
          Asked @{r.handle}
        </div>
      ))}
      {friends.map((r) => (
        <a key={`ok-${r.id}`} href={`/u/${encodeURIComponent(r.handle)}`} className="mt-2 flex items-center justify-between text-[13px] font-semibold">
          <span>@{r.handle} <span className="text-[10px] font-normal text-muted">· Connected</span></span>
          <button
            type="button"
            className="text-[11px] font-semibold text-muted"
            onClick={(e) => {
              e.preventDefault();
              void disconnectFellow({ data: { id: r.id } }).then(() => onChange());
            }}
          >
            Disconnect
          </button>
        </a>
      ))}
    </section>
  );
}

function Stat({ n, l }: { n: number; l: string }) {
  return (
    <div className="raised rounded-2xl px-1.5 py-2.5 text-center">
      <div className="text-lg font-extrabold tabular-nums text-lime-2">{fmtCount(n)}</div>
      <div className="text-[10px] text-muted">{l}</div>
      {n === 0 ? <div className="mt-0.5 text-[9px] text-muted/80">none yet</div> : null}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const tone =
    status === "approved"
      ? "bg-lime-2/15 text-lime-2"
      : status === "rejected"
        ? "bg-danger/15 text-danger"
        : "bg-panel-3 text-muted";
  return <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${tone}`}>{status}</span>;
}

function ActionTile({
  icon: Icon,
  label,
  hint,
  onClick,
}: {
  icon: typeof Plus;
  label: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="raised flex flex-col items-start gap-1.5 rounded-2xl p-2.5 text-left transition hover:border-lime-2/40"
    >
      <span className="grid size-8 place-items-center rounded-xl bg-lime-2/15 text-lime-2">
        <Icon className="size-4" />
      </span>
      <span className="text-[12px] font-bold leading-tight">{label}</span>
      <span className="text-[9px] leading-snug text-muted">{hint}</span>
    </button>
  );
}

function GuestDash() {
  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 pb-24">
      <div>
        <div className="text-[10px] font-bold tracking-[0.2em] text-lime-2">ME · DASHBOARD</div>
        <h2 className="text-2xl font-extrabold tracking-tight">Your place on Kilode</h2>
        <p className="mt-1 text-sm text-muted">
          Browse Feeds, Chat, Music, Cinema and Ads as a guest. Join once — pick an account type — and this dashboard fills with your work.
        </p>
      </div>
      <div className="raised rounded-2xl p-4">
        <div className="text-[10px] font-bold tracking-[0.16em] text-lime-2">WHY JOIN</div>
        <ul className="mt-2 space-y-1.5 text-[12px] text-muted">
          <li>Normal user — chat, feeds, cinema votes, apply to jobs.</li>
          <li>Artist — list music URLs. We embed the player.</li>
          <li>Writer — publish in Feeds with the rich editor.</li>
          <li>Ads / Brand — pay crypto, staff approve.</li>
          <li>Cinema Poster — submit YouTube URLs to Watching Now.</li>
          <li>Jobs / Market / Rent — showcase listings with contact.</li>
        </ul>
      </div>
      <SiteFooter />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          ["Feeds", "News and posts", () => goto({ tab: "feeds" })],
          ["Chat", "Live rooms", () => goto({ tab: "chat" })],
          ["Cinema", "Watch + vote", () => goto({ tab: "watch" })],
          ["Music", "Artist links", () => goto({ tab: "music" })],
        ].map(([t, s, fn]) => (
          <button key={String(t)} type="button" onClick={fn as () => void} className="raised rounded-2xl px-3 py-3 text-left">
            <div className="text-sm font-extrabold">{t as string}</div>
            <div className="text-[10px] text-muted">{s as string}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

/** Hero primary CTA — kind-specific. Never show generic "New post" for specialist kinds. */
function primaryCta(kind: AccountKind): { label: string; icon: typeof Plus; onClick: () => void } {
  if (kind === "artist") {
    return {
      label: "Add music",
      icon: Radio,
      onClick: () => {
        goto({ tab: "music" });
        window.setTimeout(openCreate, 80);
      },
    };
  }
  if (kind === "writer") return { label: "Write story", icon: Plus, onClick: openCreate };
  if (kind === "advertiser" || kind === "brand") {
    return { label: "Place ad", icon: Megaphone, onClick: () => goto({ screen: "ads" }) };
  }
  if (kind === "cinema") {
    return {
      label: "Submit title",
      icon: Film,
      onClick: () => {
        goto({ tab: "watch" });
        window.setTimeout(openCreate, 80);
      },
    };
  }
  if (kind === "job_poster") return { label: "Post a job", icon: Briefcase, onClick: openCreate };
  if (kind === "vendor") return { label: "List product", icon: Store, onClick: openCreate };
  if (kind === "renter") return { label: "List space", icon: Building2, onClick: openCreate };
  if (kind === "job_seeker") return { label: "Apply jobs", icon: Briefcase, onClick: () => goto({ screen: "jobs" }) };
  return { label: "New post", icon: Plus, onClick: openCreate };
}

type QuickTile = { icon: typeof Plus; label: string; hint: string; onClick: () => void };

/** Quick-action grid — matches account kind. Never offer Apply without jobs.apply. */
function quickActionsFor(kind: AccountKind): QuickTile[] {
  const chat: QuickTile = {
    icon: MessageSquare,
    label: "Chat rooms",
    hint: "Live rooms · topics & places",
    onClick: () => goto({ tab: "chat" }),
  };
  const voteCinema: QuickTile = {
    icon: Film,
    label: "Vote cinema",
    hint: "Watch + vote",
    onClick: () => goto({ tab: "watch" }),
  };
  const applyJobs: QuickTile | null = canKind(kind, "jobs.apply")
    ? {
        icon: Briefcase,
        label: "Apply jobs",
        hint: "Browse + apply",
        onClick: () => goto({ screen: "jobs" }),
      }
    : null;
  const newPost: QuickTile = {
    icon: Plus,
    label: "New post",
    hint: "Publish in Feeds",
    onClick: openCreate,
  };
  const withApply = (...tiles: QuickTile[]) => (applyJobs ? [...tiles, applyJobs] : tiles);

  if (kind === "writer") {
    return withApply(
      { icon: Plus, label: "Write story", hint: "New article in Feeds", onClick: openCreate },
      chat,
      voteCinema,
    );
  }
  if (kind === "artist") {
    return withApply(
      {
        icon: Radio,
        label: "Add music",
        hint: "New track · URL embed · live, no pay",
        onClick: () => {
          goto({ tab: "music" });
          window.setTimeout(openCreate, 80);
        },
      },
      chat,
      voteCinema,
    );
  }
  if (kind === "advertiser") {
    return withApply(
      { icon: Megaphone, label: "Place ad", hint: "Crypto · staff approve", onClick: () => goto({ screen: "ads" }) },
      chat,
      voteCinema,
    );
  }
  if (kind === "brand") {
    return [
      { icon: Megaphone, label: "Place ad", hint: "Crypto · staff approve", onClick: () => goto({ screen: "ads" }) },
      { icon: Store, label: "List product", hint: "Showcase · contact", onClick: openCreate },
      chat,
      voteCinema,
    ];
  }
  if (kind === "cinema") {
    return withApply(
      {
        icon: Film,
        label: "Submit title",
        hint: "YouTube · staff approve",
        onClick: () => {
          goto({ tab: "watch" });
          window.setTimeout(openCreate, 80);
        },
      },
      { icon: Vote, label: "Vote cinema", hint: "One vote / title / day", onClick: () => goto({ tab: "watch" }) },
      chat,
    );
  }
  if (kind === "job_poster") {
    // job_poster has jobs.post only — never "Apply jobs"
    return [
      { icon: Briefcase, label: "Post a job", hint: "Staff approve first", onClick: openCreate },
      { icon: Users, label: "Applicants", hint: "Inbox on this desk", onClick: () => {
        document.getElementById("me-applicants")?.scrollIntoView({ behavior: "smooth", block: "start" });
      } },
      chat,
      { icon: Pencil, label: "Edit profile", hint: "Bio · city · face", onClick: () => goto({ screen: "profile" }) },
    ];
  }
  if (kind === "vendor") {
    return [
      { icon: Store, label: "List product", hint: "Photo · price · contact", onClick: openCreate },
      {
        icon: Store,
        label: "My listings",
        hint: "Scroll to products",
        onClick: () => document.getElementById("me-market")?.scrollIntoView({ behavior: "smooth", block: "start" }),
      },
      chat,
      { icon: Pencil, label: "Edit profile", hint: "Bio · city · face", onClick: () => goto({ screen: "profile" }) },
    ];
  }
  if (kind === "renter") {
    return [
      { icon: Building2, label: "List space", hint: "Photo · type · rent", onClick: openCreate },
      {
        icon: Building2,
        label: "My spaces",
        hint: "Scroll to rent desk",
        onClick: () => document.getElementById("me-rent")?.scrollIntoView({ behavior: "smooth", block: "start" }),
      },
      chat,
      { icon: Pencil, label: "Edit profile", hint: "Bio · city · face", onClick: () => goto({ screen: "profile" }) },
    ];
  }
  if (kind === "job_seeker") {
    return [
      applyJobs ?? {
        icon: Briefcase,
        label: "Browse jobs",
        hint: "Open roles",
        onClick: () => goto({ screen: "jobs" }),
      },
      { icon: Plus, label: "New post", hint: "Feeds rich editor", onClick: openCreatePost },
      chat,
      { icon: Pencil, label: "Edit profile", hint: "Bio · city · face", onClick: () => goto({ screen: "profile" }) },
    ];
  }
  // member — Normal user flagship quick grid
  return [
    newPost,
    { icon: Pencil, label: "Edit profile", hint: "Bio · city · face", onClick: () => goto({ screen: "profile" }) },
    chat,
    applyJobs
      ?? { icon: Film, label: "Vote cinema", hint: "Watch + vote", onClick: () => goto({ tab: "watch" }) },
  ];
}


/** Me page H2 — kind-aware, without repeating the kind badge (e.g. not "Artist hub" + "Artist"). */
function hubTitleFor(kind: AccountKind): string {
  switch (kind) {
    case "artist":
      return "Music desk";
    case "writer":
      return "Stories desk";
    case "advertiser":
      return "Ads desk";
    case "cinema":
      return "Cinema desk";
    case "job_poster":
      return "Hiring desk";
    case "job_seeker":
      return "Careers desk";
    case "vendor":
      return "Market desk";
    case "renter":
      return "Rent desk";
    case "brand":
      return "Brand desk";
    case "member":
      return "Member desk";
    default:
      return "Your desk";
  }
}

export function MeDashboard({ store, onForum, onLogout }: { store: Store; onForum?: () => void; onLogout?: () => void | Promise<void> }) {
  const signed = Boolean(store.handle);
  const [myCinema, setMyCinema] = useState<CinemaMovie[]>([]);
  const [myJobs, setMyJobs] = useState<Listing[]>([]);
  const [myMarket, setMyMarket] = useState<Listing[]>([]);
  const [myRent, setMyRent] = useState<Listing[]>([]);
  const [openJobs, setOpenJobs] = useState<Listing[]>([]);
  const [myApps, setMyApps] = useState<MyApp[]>([]);
  const [myApplicants, setMyApplicants] = useState<MyApplicant[]>([]);
  const [signingOut, setSigningOut] = useState(false);
  const [connects, setConnects] = useState<ConnectRow[]>([]);
  const [staffRole, setStaffRole] = useState<string | null>(null);
  const [photo, setPhoto] = useState("");
  const [mePane, setMePane] = useState<null | "friends">(null);
  const { site } = usePublicSite();

  function loadConnects() {
    void listConnects()
      .then((rows) => setConnects(Array.isArray(rows) ? rows : []))
      .catch(() => setConnects([]));
  }

  useEffect(() => {
    if (!signed) return;
    let cancel = false;
    void listConnects()
      .then((rows) => { if (!cancel) setConnects(Array.isArray(rows) ? rows : []); })
      .catch(() => { if (!cancel) setConnects([]); });
    void staffMe()
      .then((s) => { if (!cancel) setStaffRole(s.role); })
      .catch(() => { if (!cancel) setStaffRole(null); });
    void getProfile()
      .then((p) => { if (!cancel) setPhoto(p.photo || ""); })
      .catch(() => { if (!cancel) setPhoto(""); });
    const later = window.setTimeout(() => {
      if (cancel) return;
      void listMyCinema().then((rows) => setMyCinema(Array.isArray(rows) ? rows : [])).catch(() => setMyCinema([]));
      void listMyListings({ data: { kind: "job" } }).then((rows) => setMyJobs(Array.isArray(rows) ? rows : [])).catch(() => setMyJobs([]));
      void listMyListings({ data: { kind: "market" } }).then((rows) => setMyMarket(Array.isArray(rows) ? rows : [])).catch(() => setMyMarket([]));
      void listMyListings({ data: { kind: "rent" } }).then((rows) => setMyRent(Array.isArray(rows) ? rows : [])).catch(() => setMyRent([]));
      void listMyApps().then((rows) => setMyApps(Array.isArray(rows) ? rows : [])).catch(() => setMyApps([]));
      void listListings({ data: { kind: "job" } }).then((rows) => setOpenJobs(Array.isArray(rows) ? rows : [])).catch(() => setOpenJobs([]));
      void listMyApplicants().then((rows) => setMyApplicants(Array.isArray(rows) ? rows : [])).catch(() => setMyApplicants([]));
    }, 700);
    return () => {
      cancel = true;
      window.clearTimeout(later);
    };
  }, [signed, store.handle]);

  function refreshMyMarket() {
    void listMyListings({ data: { kind: "market" } })
      .then((rows) => setMyMarket(Array.isArray(rows) ? rows : []))
      .catch(() => setMyMarket([]));
  }
  function refreshMyRent() {
    void listMyListings({ data: { kind: "rent" } })
      .then((rows) => setMyRent(Array.isArray(rows) ? rows : []))
      .catch(() => setMyRent([]));
  }
  function refreshMyJobs() {
    void listMyListings({ data: { kind: "job" } })
      .then((rows) => setMyJobs(Array.isArray(rows) ? rows : []))
      .catch(() => setMyJobs([]));
    void listMyApplicants()
      .then((rows) => setMyApplicants(Array.isArray(rows) ? rows : []))
      .catch(() => setMyApplicants([]));
  }

  const kind = store.kind as AccountKind;
  const kindLabel = ACCOUNT_KINDS.find((k) => k.id === kind)?.label ?? "Member";
  const purpose = KIND_PURPOSE[kind] ?? KIND_PURPOSE.member;
  const cta = primaryCta(kind);

  const mine = useMemo(
    () => (store.handle ? store.posts.filter((p) => !!p?.id && p.author === store.handle && p.status !== "draft") : []),
    [store.handle, store.posts],
  );
  const drafts = useMemo(
    () => (store.handle ? store.posts.filter((p) => !!p?.id && p.author === store.handle && p.status === "draft") : []),
    [store.handle, store.posts],
  );
  const songs = useMemo(
    () =>
      store.handle
        ? store.tracks.filter((t) => !!t?.id && (t.author === store.handle || t.artist === store.handle))
        : [],
    [store.handle, store.tracks],
  );
  const myAds = useMemo(
    () => (store.handle ? store.campaigns.filter((c) => c.status !== "rejected") : []),
    [store.campaigns, store.handle],
  );
  const saved = useMemo(
    () => store.posts.filter((p) => !!p?.id && store.savedPosts.includes(p.id)),
    [store.posts, store.savedPosts],
  );
  const trackViews = useMemo(() => songs.reduce((a, t) => a + (t.views ?? 0), 0), [songs]);
  const adViews = useMemo(() => myAds.reduce((a, c) => a + (c.views ?? 0), 0), [myAds]);
  const listingViews = useMemo(() => {
    const pack = kind === "vendor" ? myMarket : kind === "renter" ? myRent : myJobs;
    return pack.reduce((a, r) => a + (r.views || 0), 0);
  }, [kind, myJobs, myMarket, myRent]);
  const cinemaVotes = useMemo(() => myCinema.reduce((a, m) => a + (m.votes || 0), 0), [myCinema]);
  const pendingCinema = useMemo(() => myCinema.filter((m) => m.status === "pending").length, [myCinema]);
  const pendingJobs = useMemo(() => myJobs.filter((r) => r.status === "pending").length, [myJobs]);
  const pendingMarket = useMemo(() => myMarket.filter((r) => r.status === "pending").length, [myMarket]);
  const pendingRent = useMemo(() => myRent.filter((r) => r.status === "pending").length, [myRent]);
  const liveMarket = useMemo(() => myMarket.filter((r) => r.status === "approved").length, [myMarket]);
  const liveRent = useMemo(() => myRent.filter((r) => r.status === "approved").length, [myRent]);
  const withPhotoMarket = useMemo(() => myMarket.filter((r) => !!r.image).length, [myMarket]);
  const withPhotoRent = useMemo(() => myRent.filter((r) => !!r.image).length, [myRent]);
  const postVotes = useMemo(() => {
    let n = 0;
    for (const p of mine) n += store.likes[p.id] ?? 0;
    return n;
  }, [mine, store.likes]);
  const myComments = useMemo(
    () => mine.reduce((a, p) => a + (p.comments?.length ?? 0), 0),
    [mine],
  );
  const myPostViews = useMemo(
    () => mine.reduce((a, p) => a + (p.views ?? 0), 0),
    [mine],
  );
  const profileGaps = useMemo(() => {
    const gaps: string[] = [];
    if (!store.bio?.trim()) gaps.push("bio");
    if (!store.city?.trim()) gaps.push("city");
    return gaps;
  }, [store.bio, store.city]);

  if (!signed) return <GuestDash />;

  const quick = quickActionsFor(kind);
  /** Member keeps Feeds "New post" as a primary activity CTA (seeker has its own Feeds desk). */
  const feedsPostPrimary = kind === "member";

  const rooms = store.pins.length ? store.pins : ["lounge"];
  const CtaIcon = cta.icon;

  const stats: { n: number; l: string }[] =
    kind === "artist"
      ? [
          { n: songs.length, l: "Tracks" },
          { n: trackViews, l: "Views" },
          { n: store.pins.length, l: "Rooms" },
          { n: store.savedPosts.length, l: "Saved" },
        ]
      : kind === "writer"
        ? [
            { n: mine.length, l: "Stories" },
            { n: drafts.length, l: "Drafts" },
            { n: postVotes, l: "Votes" },
            { n: store.savedPosts.length, l: "Saved" },
          ]
        : kind === "cinema"
          ? [
              { n: myCinema.length, l: "Titles" },
              { n: cinemaVotes, l: "Votes" },
              { n: pendingCinema, l: "Pending" },
              { n: store.pins.length, l: "Rooms" },
            ]
          : kind === "advertiser" || kind === "brand"
            ? [
                { n: myAds.length, l: "Ads" },
                { n: adViews, l: "Ad views" },
                { n: kind === "brand" ? myMarket.length : store.pins.length, l: kind === "brand" ? "Products" : "Rooms" },
                { n: kind === "brand" ? store.pins.length : store.savedPosts.length, l: kind === "brand" ? "Rooms" : "Saved" },
              ]
            : kind === "job_poster"
              ? [
                  { n: myJobs.length, l: "Jobs" },
                  { n: myApplicants.length, l: "Apps" },
                  { n: pendingJobs, l: "Pending" },
                  { n: listingViews, l: "Views" },
                ]
              : kind === "vendor"
                ? [
                    { n: myMarket.length, l: "Products" },
                    { n: liveMarket, l: "Live" },
                    { n: pendingMarket, l: "Pending" },
                    { n: listingViews, l: "Views" },
                  ]
                : kind === "renter"
                  ? [
                      { n: myRent.length, l: "Spaces" },
                      { n: liveRent, l: "Live" },
                      { n: pendingRent, l: "Pending" },
                      { n: listingViews, l: "Views" },
                    ]
                  : kind === "job_seeker"
                    ? [
                        { n: myApps.length, l: "Apps" },
                        { n: openJobs.length, l: "Open" },
                        { n: mine.length, l: "Posts" },
                        { n: store.savedPosts.length, l: "Saved" },
                      ]
                    : [
                        { n: mine.length, l: "Posts" },
                        { n: drafts.length, l: "Drafts" },
                        { n: myComments, l: "Comments" },
                        { n: postVotes, l: "Votes" },
                      ];

  const staffLabel = staffRole === "super" ? "Super admin" : staffRole === "admin" ? "Admin" : staffRole === "mod" ? "Sub-admin" : "";
  const staffPowers =
    staffRole === "super"
      ? "Full desk: news publish, staff grants, wallets, site flags, ads, reports, cinema, events, listings."
      : staffRole === "admin"
        ? "Admin desk: reports, ads queue, wallets, moderator, events, cinema, listings, password reset. Super still owns grants and news publish."
        : staffRole === "mod"
          ? "Sub-admin desk: reports, hide posts, delete gists, ads queue, inbox, ban or mute. Super can raise you to Admin — reopen Me to see the new desk."
          : "";
  const faceSrc = photo && site.photosOn !== false ? photo : store.face;

  return (
    <div className="mx-auto max-w-2xl p-4 pb-28">
      <div className="relative mb-4 overflow-hidden rounded-2xl border border-line bg-panel">
        <div className="h-20 bg-gradient-to-br from-lime-2/35 via-lime-2/10 to-transparent" />
        <div className="-mt-8 flex items-end gap-3 px-4">
          <AvatarImg handle={store.handle} face={faceSrc} size={76} className="rounded-full ring-2 ring-bg" />
          <div className="min-w-0 pb-1">
            <div className="flex items-center gap-1 truncate text-xl font-extrabold tracking-tight">
              @{store.handle}
              {store.verified ? <VerifiedMark /> : null}
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
              {staffLabel ? <span className="rounded-full bg-lime-2 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-[#102016]">{staffLabel}</span> : null}
              <span className="rounded-full bg-lime-2/15 px-2 py-0.5 text-[10px] font-bold text-lime-2">{kindLabel}</span>
              {store.city ? <span className="truncate text-[11px] text-muted">{store.city}</span> : null}
            </div>
          </div>
        </div>
        <p className="px-4 pt-3 text-[10px] font-bold tracking-[0.16em] text-lime-2">{staffLabel ? `${staffLabel} desk` : hubTitleFor(kind)}</p>
        <p className="px-4 pt-1 text-[13px] leading-snug text-fg/90">{store.bio?.trim() || "No bio yet. Edit profile to add one."}</p>
        {store.interests ? <p className="px-4 pt-1 text-[11px] text-muted">{store.interests.split(",").join(" · ")}</p> : null}
        {store.website ? (
          <a href={store.website} target="_blank" rel="noreferrer" className="mt-1 block truncate px-4 text-[11px] font-semibold text-lime-2">
            {store.website.replace(/^https?:\/\//, "")}
          </a>
        ) : null}
        <div className="mt-3 flex gap-4 px-4 text-[11px]">
          <span><b className="text-fg">{connects.filter((c) => c.dir === "friend").length}</b> <span className="text-muted">connected</span></span>
          <span><b className="text-fg">{connects.filter((c) => c.dir === "in").length}</b> <span className="text-muted">requests</span></span>
        </div>
        <div className="mt-3 flex gap-2 px-3 pb-3">
          <button
            type="button"
            className="btn-3d inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[12px] font-bold"
            onClick={() => goto({ screen: "profile" })}
          >
            <Pencil className="size-3.5" />
            Edit profile
          </button>
          <button
            type="button"
            className="btn-join inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[12px] font-bold"
            onClick={cta.onClick}
          >
            <CtaIcon className="size-3.5" />
            {cta.label}
          </button>
        </div>
      </div>
      <p className="mb-3 text-sm text-muted">{purpose}</p>
      {staffRole ? (
        <section className="mb-3 rounded-2xl border border-lime-2/40 bg-panel p-3">
          <div className="text-[10px] font-bold tracking-[0.16em] text-lime-2">YOUR POWER</div>
          <p className="mt-1 text-[12px] leading-snug text-muted">{staffPowers}</p>
          <a href="/ops" className="btn-join mt-2 inline-flex rounded-lg px-3 py-2 text-[13px] font-bold">
            Staff desk
          </a>
        </section>
      ) : null}
      <div className="mb-3 grid grid-cols-2 gap-2">
        {(
          [
            ["Friends", () => setMePane("friends")],
            ["Groups", () => goto({ screen: "teams" })],
            ["Marketplace", () => goto({ screen: "market" })],
            ["Messages", () => goto({ screen: "inbox" })],
          ] as const
        ).map(([label, go]) => (
          <button key={label} type="button" onClick={go} className="btn-join rounded-xl px-2 py-2.5 text-[13px] font-bold">
            {label}
          </button>
        ))}
      </div>
      {mePane === "friends" ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-bg px-3 pt-4 pb-[max(16px,env(safe-area-inset-bottom))]">
          <button type="button" className="mb-3 text-[14px] font-semibold text-lime-2" onClick={() => setMePane(null)}>
            ← Back to Me
          </button>
          <h2 className="mb-2 text-lg font-extrabold">Friends</h2>
          <FriendsBlock rows={connects} onChange={loadConnects} />
        </div>
      ) : null}

      <div className="mb-5 grid grid-cols-4 gap-1.5">
        {stats.map((s) => (
          <Stat key={s.l} n={s.n} l={s.l} />
        ))}
      </div>

      <Section kicker="QUICK" title="Do something now">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{quick.map((q) => <ActionTile key={q.label} {...q} />)}</div>
      </Section>

      {kind === "artist" ? (
        <Section
          kicker="ARTIST"
          title="Your tracks"
          action="Add track"
          onAction={() => {
            goto({ tab: "music" });
            window.setTimeout(openCreate, 80);
          }}
        >
          {songs.length === 0 ? (
            <EmptyBlock
              body="No tracks yet. Add a Spotify / SoundCloud / Audiomack / Apple / Deezer URL — lists live on Music with no staff approval and no payment. Kilode embeds their player, never hosts audio."
              cta="Add music"
              onClick={() => {
                goto({ tab: "music" });
                window.setTimeout(openCreate, 80);
              }}
            />
          ) : (
            <div className="space-y-2">
              {songs.slice(0, 8).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className="flex w-full items-center gap-2 rounded-xl border border-line bg-panel p-2 text-left"
                  onClick={() => {
                    store.setOpenTrack?.(t.id);
                    goto({ tab: "music" });
                  }}
                >
                  {t.cover ? <img src={t.cover} alt="" className="size-11 rounded-lg object-cover" /> : <div className="size-11 rounded-lg bg-panel-3" />}
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{t.title}</div>
                    <div className="text-[10px] text-muted">
                      {t.platform} · {fmtCount(t.views ?? 0)} views
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </Section>
      ) : null}

      {kind === "writer" ? (
        <Section kicker="WRITER" title="Your articles" action="New story" onAction={openCreate}>
          {mine.length === 0 && drafts.length === 0 ? (
            <EmptyBlock
              body="Nothing published yet. Writers use the Feeds rich editor — headline, body toolbar, featured image, SEO — then publish under your handle."
              cta="Write a story"
              onClick={openCreate}
            />
          ) : (
            <div className="space-y-2">
              {drafts.length ? (
                <p className="text-[11px] text-muted">
                  {drafts.length} draft{drafts.length === 1 ? "" : "s"} on this device — finish and publish from Create.
                </p>
              ) : null}
              {mine.slice(0, 8).map((p) => (
                <PostRow
                  key={p.id}
                  p={p}
                  onOpen={() => {
                    store.setOpenPost(p.id);
                    onForum?.();
                  }}
                />
              ))}
              <p className="text-[10px] text-muted">News Engine is Kilode staff-only — your public stories still go through Feeds.</p>
            </div>
          )}
        </Section>
      ) : null}

      {kind === "cinema" ? (
        <Section
          kicker="CINEMA"
          title="Your cinema submissions"
          action="Submit title"
          onAction={() => {
            goto({ tab: "watch" });
            window.setTimeout(openCreate, 80);
          }}
        >
          {myCinema.length === 0 ? (
            <EmptyBlock
              body="No submissions yet. Submit a YouTube trailer URL from Create or Cinema — staff approve, then votes push it to Watching Now."
              cta="Submit title"
              onClick={() => {
                goto({ tab: "watch" });
                window.setTimeout(openCreate, 80);
              }}
            />
          ) : (
            <div className="space-y-2">
              {myCinema.slice(0, 10).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className="flex w-full items-center justify-between gap-2 rounded-xl border border-line bg-panel px-3 py-2 text-left"
                  onClick={() => goto({ tab: "watch" })}
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{m.title}</div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px] text-muted">
                      <StatusPill status={m.status} />
                      <span>{m.section}</span>
                      {m.watching ? <span className="text-lime-2">· Watching Now</span> : null}
                      <span>· {m.votes} votes</span>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-lime-2">
                    <Vote className="size-3.5" />
                    {m.votes}
                  </span>
                </button>
              ))}
            </div>
          )}
        </Section>
      ) : null}

      {kind === "advertiser" ? (
        <Section kicker="ADS" title="Your campaigns" action="Place ad" onAction={() => goto({ screen: "ads" })}>
          {myAds.length === 0 ? (
            <EmptyBlock
              body="No campaigns yet. Pick a slot, upload creative, copy the Kilode wallet, pay crypto, paste the tx hash. Staff approve. Auto-pay needs a Kilode setup key — manual wallets are the live path."
              cta="Place ad"
              onClick={() => goto({ screen: "ads" })}
            />
          ) : (
            <div className="space-y-2">
              {myAds.slice(0, 8).map((c) => (
                <div key={c.id} className="rounded-xl border border-line bg-panel px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="truncate text-sm font-semibold">{c.name}</div>
                    <StatusPill status={c.status} />
                  </div>
                  <div className="text-[10px] text-muted">
                    {c.placement} · {c.days ?? 7}d · {fmtCount(c.views ?? 0)} views
                  </div>
                </div>
              ))}
              <button type="button" className="btn-join w-full rounded-lg py-2 text-[12px] font-bold" onClick={() => goto({ screen: "ads" })}>
                Place another ad
              </button>
            </div>
          )}
        </Section>
      ) : null}

      {kind === "brand" ? (
        <Section kicker="BRAND" title="Ads & showcase" action="Place ad" onAction={() => goto({ screen: "ads" })}>
          {myAds.length === 0 ? (
            <EmptyBlock
              body="Brand ads go live after crypto payment + staff approve. Auto-pay needs a Kilode setup key — use the wallet Copy path today. You can also showcase products in Marketplace."
              cta="Place ad"
              onClick={() => goto({ screen: "ads" })}
            />
          ) : (
            <div className="mb-3 space-y-2">
              {myAds.slice(0, 6).map((c) => (
                <div key={c.id} className="rounded-xl border border-line bg-panel px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="truncate text-sm font-semibold">{c.name}</div>
                    <StatusPill status={c.status} />
                  </div>
                  <div className="text-[10px] text-muted">
                    {c.placement} · {fmtCount(c.views ?? 0)} views
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="mb-2 text-[10px] font-bold tracking-[0.14em] text-muted">MARKETPLACE SHOWCASE</div>
          {myMarket.length === 0 ? (
            <EmptyBlock body="No products live yet. Showcase with a contact link — no in-app checkout." cta="List product"
              onClick={() => window.dispatchEvent(new CustomEvent("kilode:create", { detail: { pane: "market" } }))} />
          ) : (
            <div className="mb-3 space-y-2">
              {myMarket.slice(0, 6).map((r) => (
                <ListingRow key={r.id} r={r} manage onChanged={refreshMyMarket} />
              ))}
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <button type="button" className="btn-join rounded-lg py-2 text-[12px] font-bold" onClick={() => goto({ screen: "ads" })}>
              Place ad
            </button>
            <button type="button" className="btn-3d rounded-lg py-2 text-[12px] font-bold" onClick={() => goto({ screen: "market" })}>
              Open market
            </button>
          </div>
        </Section>
      ) : null}

      {kind === "job_poster" ? (
        <>
          <Section kicker="HIRING" title="How Job Poster works">
            <div className="raised space-y-2 rounded-2xl border border-lime-2/25 p-3 text-[12px] leading-snug text-muted">
              <p>
                <span className="font-bold text-lime-2">1.</span> Post a role from Create — company, city, contact, optional apply link.
              </p>
              <p>
                <span className="font-bold text-lime-2">2.</span> Staff approve → it goes live on Jobs. Seekers apply with their @handle + note.
              </p>
              <p>
                <span className="font-bold text-lime-2">3.</span> Edit or delete your roles below anytime — a live edit goes back to pending. Applicants land in your inbox; contact them off-platform.
              </p>
            </div>
          </Section>

          <Section kicker="JOBS" title="Your jobs" action="Post a job" onAction={openCreate}>
            {myJobs.length === 0 ? (
              <EmptyBlock
                body="No jobs under your handle yet. Post a role with company, city, contact and optional apply link — staff approve before seekers see it."
                cta="Post first job"
                onClick={openCreate}
              />
            ) : (
              <div className="space-y-2">
                <p className="text-[11px] text-muted">
                  Edit fields anytime. A live job returns to pending for staff. Delete removes the role and its applications.
                </p>
                {myJobs.slice(0, 12).map((r) => {
                  const apps = myApplicants.filter((a) => a.listingId === r.id).length;
                  return (
                    <ListingRow
                      key={r.id}
                      r={r}
                      manage
                      onChanged={refreshMyJobs}
                      badge={
                        <span className="inline-flex items-center gap-1 rounded-full bg-lime-2/15 px-2 py-0.5 text-[10px] font-bold text-lime-2">
                          <Users className="size-3" />
                          {apps} applicant{apps === 1 ? "" : "s"}
                        </span>
                      }
                    />
                  );
                })}
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" className="btn-join rounded-lg py-2 text-[12px] font-bold" onClick={openCreate}>
                    Post another job
                  </button>
                  <button type="button" className="btn-3d rounded-lg py-2 text-[12px] font-bold" onClick={() => goto({ screen: "jobs" })}>
                    Open Jobs board
                  </button>
                </div>
              </div>
            )}
          </Section>

          <Section
            kicker="APPLICANTS"
            title="Inbox"
            action={myApplicants.length ? `${myApplicants.length}` : undefined}
            onAction={myApplicants.length ? () => goto({ screen: "jobs" }) : undefined}
          >
            <div id="me-applicants" />
            {myApplicants.length === 0 ? (
              <EmptyBlock
                body="No applications yet. Once a job is approved, seekers apply from Jobs or Create · Apply — their @handle and note show up here."
                cta={myJobs.length ? "Open Jobs board" : "Post a job"}
                onClick={myJobs.length ? () => goto({ screen: "jobs" }) : openCreate}
              />
            ) : (
              <div className="space-y-2">
                {myApplicants.slice(0, 12).map((a) => (
                  <div key={a.id} className="rounded-xl border border-line bg-panel px-3 py-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold">@{a.handle}</div>
                        <div className="text-[10px] text-muted">
                          Applied to <span className="font-semibold text-ink">{a.jobTitle}</span> · {timeAgo(a.ts)}
                        </div>
                      </div>
                      <span className="shrink-0 rounded-full bg-lime-2/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-lime-2">
                        New
                      </span>
                    </div>
                    {a.note ? <p className="mt-1.5 line-clamp-3 text-[11px] leading-snug text-muted">{a.note}</p> : (
                      <p className="mt-1.5 text-[11px] italic text-muted">No note — reach out via their profile or your posted contact.</p>
                    )}
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        className="btn-3d flex-1 rounded-lg py-1.5 text-[11px] font-bold"
                        onClick={() => {
                          window.location.href = `/u/${encodeURIComponent(a.handle)}`;
                        }}
                      >
                        View @{a.handle}
                      </button>
                      <button type="button" className="btn-join flex-1 rounded-lg py-1.5 text-[11px] font-bold" onClick={() => goto({ screen: "jobs" })}>
                        Open Jobs
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </>
      ) : null}

      {kind === "vendor" ? (
        <>
          <Section kicker="SELLING" title="How Marketplace works">
            <div className="raised space-y-2 rounded-2xl border border-lime-2/25 p-3 text-[12px] leading-snug text-muted">
              <p>
                <span className="font-bold text-lime-2">1.</span> List a product from Create — photo, price hint, condition, city, contact.
              </p>
              <p>
                <span className="font-bold text-lime-2">2.</span> Staff approve → it goes live on Marketplace. Buyers message you off-platform.
              </p>
              <p>
                <span className="font-bold text-lime-2">3.</span> Track pending / live / views here. Kilode never takes payment or escrow.
              </p>
            </div>
          </Section>

          <Section kicker="MARKET" title="Your products" action="List product" onAction={openCreate}>
            <div id="me-market" />
            {myMarket.length === 0 ? (
              <EmptyBlock
                body="No products yet. Add a photo + price + contact from Create — staff approve before buyers see it."
                cta="List product"
                onClick={openCreate}
              />
            ) : (
              <div className="space-y-2">
                <p className="text-[11px] text-muted">
                  {liveMarket} live · {pendingMarket} pending · {withPhotoMarket}/{myMarket.length} with photo · {fmtCount(listingViews)} total views
                </p>
                {myMarket.slice(0, 12).map((r) => (
                  <ListingRow key={r.id} r={r} manage onChanged={refreshMyMarket} />
                ))}
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" className="btn-join rounded-lg py-2 text-[12px] font-bold" onClick={openCreate}>
                    List another
                  </button>
                  <button type="button" className="btn-3d rounded-lg py-2 text-[12px] font-bold" onClick={() => goto({ screen: "market" })}>
                    Open Marketplace
                  </button>
                </div>
              </div>
            )}
          </Section>
        </>
      ) : null}

      {kind === "renter" ? (
        <>
          <Section kicker="LETTING" title="How Rent works">
            <div className="raised space-y-2 rounded-2xl border border-lime-2/25 p-3 text-[12px] leading-snug text-muted">
              <p>
                <span className="font-bold text-lime-2">1.</span> List a space from Create — photo, property type, rent band, city, contact.
              </p>
              <p>
                <span className="font-bold text-lime-2">2.</span> Staff approve → seekers see it on Rent and reach you directly.
              </p>
              <p>
                <span className="font-bold text-lime-2">3.</span> Manage live / pending / views here. No in-app booking or deposits.
              </p>
            </div>
          </Section>

          <Section kicker="RENT" title="Your spaces" action="List space" onAction={openCreate}>
            <div id="me-rent" />
            {myRent.length === 0 ? (
              <EmptyBlock
                body="No spaces yet. Add a photo + type + rent band from Create — staff approve before it goes live."
                cta="List space"
                onClick={openCreate}
              />
            ) : (
              <div className="space-y-2">
                <p className="text-[11px] text-muted">
                  {liveRent} live · {pendingRent} pending · {withPhotoRent}/{myRent.length} with photo · {fmtCount(listingViews)} total views
                </p>
                {myRent.slice(0, 12).map((r) => (
                  <ListingRow key={r.id} r={r} manage onChanged={refreshMyRent} />
                ))}
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" className="btn-join rounded-lg py-2 text-[12px] font-bold" onClick={openCreate}>
                    List another
                  </button>
                  <button type="button" className="btn-3d rounded-lg py-2 text-[12px] font-bold" onClick={() => goto({ screen: "rent" })}>
                    Open Rent
                  </button>
                </div>
              </div>
            )}
          </Section>
        </>
      ) : null}

      {kind === "job_seeker" ? (
        <>
          <Section kicker="CAREERS" title="How Job Seeker works">
            <div className="raised space-y-2 rounded-2xl border border-lime-2/25 p-3 text-[12px] leading-snug text-muted">
              <p>
                <span className="font-bold text-lime-2">1.</span> Browse live roles on Jobs or Create · Apply — leave a short note with your @handle.
              </p>
              <p>
                <span className="font-bold text-lime-2">2.</span> Track every application here. Posters see you; keep bio + city sharp.
              </p>
              <p>
                <span className="font-bold text-lime-2">3.</span> You can still post in Feeds, chat rooms, and vote Cinema — same rich editor as Normal.
              </p>
            </div>
          </Section>

          <Section kicker="APPLICATIONS" title="Your applications" action="Browse jobs" onAction={() => goto({ screen: "jobs" })}>
            <div id="me-apps" />
            {myApps.length === 0 ? (
              <EmptyBlock
                body="You have not applied yet. Open a live job, leave a short note, and the poster sees your @handle."
                cta="Browse jobs"
                onClick={() => goto({ screen: "jobs" })}
              />
            ) : (
              <div className="space-y-2">
                <p className="text-[11px] text-muted">
                  {myApps.length} application{myApps.length === 1 ? "" : "s"} · {openJobs.length} open role{openJobs.length === 1 ? "" : "s"} live
                </p>
                {myApps.slice(0, 12).map((a) => (
                  <div key={a.id} className="rounded-xl border border-line bg-panel px-3 py-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold">{a.title}</div>
                        <div className="text-[10px] text-muted">
                          {a.company || "Company"} · {a.city || "Nigeria"} · applied {timeAgo(a.ts)}
                        </div>
                      </div>
                      <StatusPill status={a.status} />
                    </div>
                    {a.note ? <p className="mt-1.5 line-clamp-3 text-[11px] leading-snug text-muted">{a.note}</p> : (
                      <p className="mt-1.5 text-[11px] italic text-muted">No note sent with this application.</p>
                    )}
                    <button type="button" className="btn-3d mt-2 w-full rounded-lg py-1.5 text-[11px] font-bold" onClick={() => goto({ screen: "jobs" })}>
                      Open Jobs board
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section kicker="OPEN ROLES" title="Hiring now" action="All jobs" onAction={() => goto({ screen: "jobs" })}>
            {openJobs.length === 0 ? (
              <EmptyBlock body="No approved jobs live right now. Polish your profile and check back." cta="Edit profile" onClick={() => goto({ screen: "profile" })} />
            ) : (
              <div className="space-y-2">
                {openJobs.slice(0, 6).map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    className="w-full rounded-xl border border-line bg-panel px-3 py-2 text-left"
                    onClick={() => goto({ screen: "jobs" })}
                  >
                    <div className="truncate text-sm font-semibold">{r.title}</div>
                    <div className="text-[10px] text-muted">
                      {r.company || "Hiring"} · {r.city || "Remote"} · {timeAgo(r.ts)}
                    </div>
                  </button>
                ))}
                <button type="button" className="btn-join w-full rounded-lg py-2 text-[12px] font-bold" onClick={() => goto({ screen: "jobs" })}>
                  Apply from Jobs
                </button>
              </div>
            )}
          </Section>

          <Section kicker="FEEDS" title="Your posts" action="New post" onAction={openCreatePost}>
            {mine.length === 0 && drafts.length === 0 ? (
              <EmptyBlock
                body="Job Seeker focus is applications — you can still publish in Feeds with the rich editor when you have something to share."
                cta="New post"
                onClick={openCreatePost}
              />
            ) : (
              <div className="space-y-2">
                {drafts.length ? (
                  <p className="text-[11px] text-muted">
                    {drafts.length} draft{drafts.length === 1 ? "" : "s"} on this device — finish from Create · Feeds.
                  </p>
                ) : null}
                {mine.slice(0, 8).map((p) => (
                  <PostRow
                    key={p.id}
                    p={p}
                    onOpen={() => {
                      store.setOpenPost(p.id);
                      onForum?.();
                    }}
                  />
                ))}
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" className="btn-join rounded-lg py-2 text-[12px] font-bold" onClick={openCreatePost}>
                    New post
                  </button>
                  <button type="button" className="btn-3d rounded-lg py-2 text-[12px] font-bold" onClick={() => goto({ tab: "feeds" })}>
                    Open Feeds
                  </button>
                </div>
              </div>
            )}
          </Section>

          <Section kicker="DO MORE" title="Alongside job hunt">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <ActionTile icon={Briefcase} label="Browse jobs" hint="Apply with note" onClick={() => goto({ screen: "jobs" })} />
              <ActionTile icon={Plus} label="New post" hint="Feeds editor" onClick={openCreatePost} />
              <ActionTile icon={Film} label="Vote cinema" hint="One vote / day" onClick={() => goto({ tab: "watch" })} />
              <ActionTile icon={MessageSquare} label="Chat" hint="Live rooms · topics & places" onClick={() => goto({ tab: "chat" })} />
            </div>
            {profileGaps.length ? (
              <div className="mt-3 rounded-xl border border-dashed border-line bg-panel/60 px-3 py-2.5 text-[11px] text-muted">
                Profile tip: add your {profileGaps.join(" and ")} so posters recognise you.{" "}
                <button type="button" className="font-bold text-lime-2" onClick={() => goto({ screen: "profile" })}>
                  Edit profile
                </button>
              </div>
            ) : null}
          </Section>
        </>
      ) : null}

      {kind === "member" ? (
        <>
          <Section kicker="NORMAL" title="How Member works">
            <div className="raised space-y-2 rounded-2xl border border-lime-2/25 p-3 text-[12px] leading-snug text-muted">
              <p>
                <span className="font-bold text-lime-2">1.</span> Post in Feeds with the rich editor — headline, toolbar body, featured image.
              </p>
              <p>
                <span className="font-bold text-lime-2">2.</span> Chat in 36-state rooms, vote Cinema once per title per day, apply to live jobs.
              </p>
              <p>
                <span className="font-bold text-lime-2">3.</span> Keep bio + city sharp so posters and rooms recognise you. Sign out only from this Me desk.
              </p>
            </div>
          </Section>

          <Section kicker="MEMBER" title="Your posts" action="New post" onAction={openCreate}>
            <div id="me-posts" />
            {mine.length === 0 && drafts.length === 0 ? (
              <EmptyBlock
                body="Nothing published yet. A Normal account uses the same Feeds rich editor as Writers — draft on this device, then publish under your @handle."
                cta="New post"
                onClick={openCreate}
              />
            ) : (
              <div className="space-y-2">
                <p className="text-[11px] text-muted">
                  {mine.length} published · {drafts.length} draft{drafts.length === 1 ? "" : "s"} · {fmtCount(myComments)} comments · {fmtCount(myPostViews)} views · {fmtCount(postVotes)} votes
                </p>
                {drafts.length ? (
                  <p className="text-[11px] text-muted">
                    {drafts.length} draft{drafts.length === 1 ? "" : "s"} on this device — finish and publish from Create.
                  </p>
                ) : null}
                {mine.slice(0, 10).map((p) => (
                  <PostRow
                    key={p.id}
                    p={p}
                    onOpen={() => {
                      store.setOpenPost(p.id);
                      onForum?.();
                    }}
                  />
                ))}
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" className="btn-join rounded-lg py-2 text-[12px] font-bold" onClick={openCreate}>
                    New post
                  </button>
                  <button type="button" className="btn-3d rounded-lg py-2 text-[12px] font-bold" onClick={() => goto({ tab: "feeds" })}>
                    Open Feeds
                  </button>
                </div>
              </div>
            )}
          </Section>

          <Section kicker="DO MORE" title="Built into Normal">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <ActionTile icon={Plus} label="New post" hint="Rich Feeds editor" onClick={openCreate} />
              <ActionTile icon={Briefcase} label="Apply jobs" hint="Open roles" onClick={() => goto({ screen: "jobs" })} />
              <ActionTile icon={Film} label="Vote cinema" hint="One vote / day" onClick={() => goto({ tab: "watch" })} />
              <ActionTile icon={MessageSquare} label="Chat" hint="Live rooms · topics & places" onClick={() => goto({ tab: "chat" })} />
            </div>
            {profileGaps.length ? (
              <div className="mt-3 rounded-xl border border-dashed border-line bg-panel/60 px-3 py-2.5 text-[11px] text-muted">
                Profile tip: add your {profileGaps.join(" and ")} so jobs and chat recognise you.{" "}
                <button type="button" className="font-bold text-lime-2" onClick={() => goto({ screen: "profile" })}>
                  Edit profile
                </button>
              </div>
            ) : null}
          </Section>
        </>
      ) : null}

      {/* Feeds activity for job_seeker (and other kinds with leftover posts). Member has its own posts desk above. */}
      {kind !== "writer" && kind !== "member" && kind !== "job_seeker" && (feedsPostPrimary || mine.length > 0) ? (
        <Section
          kicker="ACTIVITY"
          title={feedsPostPrimary ? "Your posts" : "Your feed posts"}
          action={undefined}
          onAction={undefined}
        >
          {mine.length === 0 ? (
            <EmptyBlock
              body="Job Seeker focus is applications. You can still post in Feeds from Create."
              cta="Open Feeds"
              onClick={() => goto({ tab: "feeds" })}
            />
          ) : (
            <div className="space-y-2">
              {mine.slice(0, 8).map((p) => (
                <PostRow
                  key={p.id}
                  p={p}
                  onOpen={() => {
                    store.setOpenPost(p.id);
                    onForum?.();
                  }}
                />
              ))}
            </div>
          )}
        </Section>
      ) : null}

      <Section kicker="CHAT" title="Rooms you use" action="All rooms" onAction={() => goto({ tab: "chat" })}>
        <div className="flex flex-wrap gap-2">
          {rooms.map((id) => (
            <button
              key={id}
              type="button"
              className="rounded-full border border-lime-2/30 bg-panel px-3 py-1.5 text-[11px] font-bold"
              onClick={() => {
                store.openRoom?.(id);
                goto({ tab: "chat" });
              }}
            >
              {roomName(id)}
            </button>
          ))}
        </div>
      </Section>

      <Section kicker="SAVED" title="Bookmarks" action="All saved" onAction={() => goto({ screen: "bookmarks" })}>
        {saved.length === 0 ? (
          <EmptyBlock body="Save a feed post from the article view — it lands here." cta="Open Feeds" onClick={() => goto({ tab: "feeds" })} />
        ) : (
          <div className="space-y-2">
            {saved.slice(0, 5).map((p) => (
              <PostRow
                key={p.id}
                p={p}
                onOpen={() => {
                  store.setOpenPost(p.id);
                  onForum?.();
                }}
              />
            ))}
          </div>
        )}
      </Section>

      <div className="mb-5">
        <AdSlot id="feeds_inline" className="mb-0" quiet />
      </div>

      <Section kicker="SHORTCUTS" title="More on Kilode">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <ActionTile icon={Download} label="Downloads" hint="Kilode products" onClick={() => goto({ tab: "downloads" })} />
          <ActionTile icon={Tv} label="Kilode TV" hint="Socials in one place" onClick={() => goto({ screen: "tv" })} />
          <ActionTile
            icon={Bookmark}
            label="Install"
            hint="Add to home screen"
            onClick={() => {
              window.location.href = "/install";
            }}
          />
          <ActionTile icon={HelpCircle} label="Rules" hint="Help · terms · FAQ" onClick={() => goto({ screen: "help" })} />
        </div>
      </Section>

      <Section kicker="UPDATES" title="Email digest">
        <div className="raised rounded-2xl border border-line p-3">
          <p className="mb-2 text-[12px] text-muted">Get new public posts by email, one at a time. No spam.</p>
          <DigestBox quiet defaultOpen />
        </div>
      </Section>

      {onLogout ? (
        <div className="mb-6 rounded-2xl border border-line bg-panel px-3 py-2.5">
          <button
            type="button"
            disabled={signingOut}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-line bg-panel px-3 py-2 text-[12px] font-semibold text-muted hover:border-danger/40 hover:text-ink disabled:cursor-wait"
            onClick={() => {
              setSigningOut(true);
              void Promise.resolve(onLogout())
                .catch(() => undefined)
                .finally(() => setSigningOut(false));
            }}
          >
            <LogOut className="size-3.5" />
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function ListingRow({ r, manage, onChanged, badge }: { r: Listing; manage?: boolean; onChanged?: () => void; badge?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [title, setTitle] = useState(r.title);
  const [body, setBody] = useState(r.body);
  const [city, setCity] = useState(r.city);
  const [contact, setContact] = useState(r.contact);
  const [link, setLink] = useState(r.link);
  const [company, setCompany] = useState(r.company);
  const [imageUrl, setImageUrl] = useState(r.image?.startsWith("http") ? r.image : "");
  const [imageData, setImageData] = useState(r.image?.startsWith("data:") ? r.image : "");
  const [clearPhoto, setClearPhoto] = useState(false);

  function syncFrom(row: Listing) {
    setTitle(row.title);
    setBody(row.body);
    setCity(row.city);
    setContact(row.contact);
    setLink(row.link);
    setCompany(row.company);
    setImageUrl(row.image?.startsWith("http") ? row.image : "");
    setImageData(row.image?.startsWith("data:") ? row.image : "");
    setClearPhoto(false);
    setErr("");
    setMsg("");
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
    const data = await compressListingImage(file);
    setImageData(data);
    setImageUrl("");
    setClearPhoto(false);
  }

  function save() {
    setErr("");
    setMsg("");
    if (!title.trim() || title.trim().length < 3) {
      setErr("Add a clear title.");
      return;
    }
    if (!contact.trim()) {
      setErr("Contact is required.");
      return;
    }
    if (r.kind === "job" && !company.trim()) {
      setErr("Company / hiring org is required.");
      return;
    }
    if (link.trim() && !safeHttpUrl(link)) {
      setErr("Link must be http or https.");
      return;
    }
    let image: string | undefined;
    if (r.kind === "job") {
      image = r.image; // jobs skip photo editor
    } else if (clearPhoto) image = "";
    else if (imageData) image = imageData;
    else if (imageUrl.trim()) image = imageUrl.trim();
    else image = r.image; // keep
    setBusy(true);
    void updateListing({
      data: {
        id: r.id,
        title,
        body,
        city,
        contact,
        link,
        company,
        days: r.days,
        image,
      },
    })
      .then((res) => {
        setBusy(false);
        if (!res.ok) {
          setErr(res.reason);
          return;
        }
        setMsg(res.status === "pending" ? "Saved — back in staff queue if it was live." : "Saved.");
        setOpen(false);
        onChanged?.();
      })
      .catch(() => {
        setBusy(false);
        setErr("Could not save. Try again.");
      });
  }

  function remove() {
    if (!window.confirm(`Delete “${r.title}”? This cannot be undone.`)) return;
    setBusy(true);
    setErr("");
    void deleteListing({ data: { id: r.id } })
      .then((res) => {
        setBusy(false);
        if (!res.ok) {
          setErr(res.reason);
          return;
        }
        onChanged?.();
      })
      .catch(() => {
        setBusy(false);
        setErr("Could not delete. Try again.");
      });
  }

  const preview = clearPhoto ? "" : imageData || imageUrl || r.image || "";

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-panel">
      <div className="flex gap-2 p-2">
        {r.image && !clearPhoto ? (
          <img src={r.image} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
        ) : (
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-lg bg-panel-3 text-[8px] font-bold uppercase tracking-wide text-lime-2">
            {r.kind}
          </div>
        )}
        <div className="min-w-0 flex-1 py-0.5">
          <div className="flex items-center justify-between gap-2">
            <div className="truncate text-sm font-semibold">{r.title}</div>
            <StatusPill status={r.status} />
          </div>
          <div className="text-[10px] text-muted">
            {r.company ? `${r.company} · ` : ""}
            {r.city || "Nigeria"} · {fmtCount(r.views)} views · {timeAgo(r.ts)}
          </div>
          {r.body ? <div className="mt-0.5 line-clamp-1 text-[10px] text-muted">{r.body.split("\n")[0]}</div> : null}
          {badge ? <div className="mt-1">{badge}</div> : null}
          {manage ? (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-md border border-line px-2 py-0.5 text-[10px] font-semibold"
                onClick={() => {
                  syncFrom(r);
                  setOpen((v) => !v);
                }}
              >
                <Pencil className="size-3" />
                {open ? "Close" : "Edit"}
              </button>
              <button
                type="button"
                disabled={busy}
                className="inline-flex items-center gap-1 rounded-md border border-danger/30 px-2 py-0.5 text-[10px] font-semibold text-danger disabled:cursor-wait"
                onClick={remove}
              >
                <Trash2 className="size-3" />
                Delete
              </button>
            </div>
          ) : null}
          {err && !open ? <p className="mt-1 text-[10px] text-danger">{err}</p> : null}
          {msg && !open ? <p className="mt-1 text-[10px] text-lime-2">{msg}</p> : null}
        </div>
      </div>
      {manage && open ? (
        <div className="space-y-2 border-t border-line bg-black/10 p-3">
          <p className="text-[10px] text-muted">Editing a live listing sends it back to pending for staff. New drafts stay pending.</p>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="w-full rounded-lg border border-line bg-panel px-2.5 py-2 text-base" />
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} placeholder="Description" className="w-full rounded-lg border border-line bg-panel px-2.5 py-2 text-base" />
          <div className="grid gap-2 sm:grid-cols-2">
            <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" className="w-full rounded-lg border border-line bg-panel px-2.5 py-2 text-base" />
            <input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Contact *" className="w-full rounded-lg border border-line bg-panel px-2.5 py-2 text-base" />
          </div>
          <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder={r.kind === "job" ? "Hiring company *" : r.kind === "rent" ? "Landlord / agent" : "Brand / shop"} className="w-full rounded-lg border border-line bg-panel px-2.5 py-2 text-base" />
          <input value={link} onChange={(e) => setLink(e.target.value)} placeholder={r.kind === "job" ? "Apply link https://… (optional)" : "https://… (optional)"} className="w-full rounded-lg border border-line bg-panel px-2.5 py-2 text-base" />
          {r.kind !== "job" ? (
          <div className="inset-well rounded-lg p-2">
            <div className="mb-1 text-[10px] font-bold tracking-[0.12em] text-lime-2">PHOTO</div>
            <input type="file" accept="image/*" onChange={(e) => void onFile(e.target.files?.[0])} className="text-xs" />
            <input
              value={imageUrl}
              onChange={(e) => {
                setImageUrl(e.target.value);
                if (e.target.value.trim()) {
                  setImageData("");
                  setClearPhoto(false);
                }
              }}
              placeholder="Or paste image URL https://…"
              className="mt-1.5 w-full rounded-lg border border-line bg-panel px-2.5 py-1.5 text-base"
            />
            <label className="mt-1.5 flex items-center gap-1.5 text-[10px] text-muted">
              <input type="checkbox" checked={clearPhoto} onChange={(e) => setClearPhoto(e.target.checked)} />
              Remove photo
            </label>
            {preview ? <img src={preview} alt="" className="mt-2 max-h-32 w-full rounded-lg object-cover" /> : null}
          </div>
          ) : null}
          {err ? <p className="text-[11px] text-danger">{err}</p> : null}
          <button type="button" disabled={busy} className="btn-join w-full rounded-lg py-2 text-[12px] font-bold disabled:cursor-wait" onClick={save}>
            {busy ? "Saving…" : "Save changes"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function compressListingImage(file: File): Promise<string> {
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

function PostRow({
  p,
  onOpen,
}: {
  p: { id: string; title: string; image?: string; category?: string; comments?: unknown[]; views?: number };
  onOpen: () => void;
}) {
  return (
    <button type="button" className="flex w-full gap-2 overflow-hidden rounded-xl border border-line bg-panel text-left" onClick={onOpen}>
      {p.image ? <img src={p.image} alt="" className="h-14 w-14 shrink-0 object-cover" /> : <div className="h-14 w-14 shrink-0 bg-panel-3" />}
      <div className="min-w-0 py-2 pr-2">
        <div className="truncate text-sm font-semibold">{p.title}</div>
        <div className="text-[10px] text-muted">
          {p.category || "General"} · {p.comments?.length ?? 0} comments · {fmtCount(p.views ?? 0)} views
        </div>
      </div>
    </button>
  );
}
