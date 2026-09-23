import { useEffect, useMemo, useState } from "react";
import {
  Bookmark,
  Briefcase,
  Building2,
  Download,
  Film,
  HelpCircle,
  Megaphone,
  MessageSquare,
  Pencil,
  Plus,
  Radio,
  Store,
  Tv,
  Vote,
} from "lucide-react";
import {
  ACCOUNT_KINDS,
  KIND_PURPOSE,
  fmtCount,
  roomName,
  timeAgo,
  type AccountKind,
} from "@/lib/qonvo-data";
import type { useQonvo } from "@/lib/use-qonvo";
import { canKind } from "@/lib/permissions";
import { AvatarImg } from "@/components/account-kind";
import { AdSlot } from "@/components/ad-slot";
import { listMyCinema, type CinemaMovie } from "@/lib/cinema-server";
import { listListings, listMyApps, listMyListings, type Listing, type MyApp } from "@/lib/listings-server";

type Store = ReturnType<typeof useQonvo>;

function goto(detail: { screen?: string; tab?: string }) {
  window.dispatchEvent(new CustomEvent("kilode:goto", { detail }));
}

function openCreate() {
  window.dispatchEvent(new Event("kilode:create"));
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
          <li>Cinema advertiser — submit YouTube URLs to Watching Now.</li>
          <li>Jobs / Market / Rent — showcase listings with contact.</li>
        </ul>
      </div>
      <a href="/login?mode=up" className="btn-join block rounded-lg py-2.5 text-center text-[13px] font-bold">
        Join Kilode
      </a>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          ["Feeds", "News and posts", () => goto({ tab: "feeds" })],
          ["Chat", "Live rooms", () => goto({ tab: "chat" })],
          ["Cinema", "Watch + vote", () => goto({ tab: "cinema" })],
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

function primaryCta(kind: AccountKind): { label: string; icon: typeof Plus; onClick: () => void } {
  if (kind === "artist") {
    return {
      label: "Add first track",
      icon: Radio,
      onClick: () => {
        goto({ tab: "music" });
        window.setTimeout(openCreate, 80);
      },
    };
  }
  if (kind === "writer") return { label: "Write a story", icon: Plus, onClick: openCreate };
  if (kind === "advertiser" || kind === "brand") {
    return { label: "Place ad", icon: Megaphone, onClick: () => goto({ screen: "ads" }) };
  }
  if (kind === "cinema") {
    return {
      label: "Submit cinema",
      icon: Film,
      onClick: () => {
        goto({ tab: "cinema" });
        window.setTimeout(openCreate, 80);
      },
    };
  }
  if (kind === "job_poster") return { label: "Post first job", icon: Briefcase, onClick: openCreate };
  if (kind === "vendor") return { label: "List product", icon: Store, onClick: openCreate };
  if (kind === "renter") return { label: "List space", icon: Building2, onClick: openCreate };
  if (kind === "job_seeker") return { label: "Browse jobs", icon: Briefcase, onClick: () => goto({ screen: "jobs" }) };
  return { label: "New post", icon: Plus, onClick: openCreate };
}

export function MeDashboard({ store, onForum }: { store: Store; onForum?: () => void }) {
  const signed = Boolean(store.handle);
  const [myCinema, setMyCinema] = useState<CinemaMovie[]>([]);
  const [myJobs, setMyJobs] = useState<Listing[]>([]);
  const [myMarket, setMyMarket] = useState<Listing[]>([]);
  const [myRent, setMyRent] = useState<Listing[]>([]);
  const [openJobs, setOpenJobs] = useState<Listing[]>([]);
  const [myApps, setMyApps] = useState<MyApp[]>([]);

  useEffect(() => {
    if (!signed) return;
    void listMyCinema()
      .then((rows) => setMyCinema(Array.isArray(rows) ? rows : []))
      .catch(() => setMyCinema([]));
    void listMyListings({ data: { kind: "job" } })
      .then((rows) => setMyJobs(Array.isArray(rows) ? rows : []))
      .catch(() => setMyJobs([]));
    void listMyListings({ data: { kind: "market" } })
      .then((rows) => setMyMarket(Array.isArray(rows) ? rows : []))
      .catch(() => setMyMarket([]));
    void listMyListings({ data: { kind: "rent" } })
      .then((rows) => setMyRent(Array.isArray(rows) ? rows : []))
      .catch(() => setMyRent([]));
    void listMyApps()
      .then((rows) => setMyApps(Array.isArray(rows) ? rows : []))
      .catch(() => setMyApps([]));
    void listListings({ data: { kind: "job" } })
      .then((rows) => setOpenJobs(Array.isArray(rows) ? rows : []))
      .catch(() => setOpenJobs([]));
  }, [signed, store.handle]);

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
  const postVotes = useMemo(() => {
    let n = 0;
    for (const p of mine) n += store.likes[p.id] ?? 0;
    return n;
  }, [mine, store.likes]);

  if (!signed) return <GuestDash />;

  const quick: { icon: typeof Plus; label: string; hint: string; onClick: () => void }[] = [];
  if (canKind(kind, "feeds.post") && kind !== "job_seeker") {
    quick.push({
      icon: Plus,
      label: kind === "writer" ? "Write story" : "New post",
      hint: "Publish in Feeds",
      onClick: openCreate,
    });
  }
  quick.push({
    icon: MessageSquare,
    label: "Chat rooms",
    hint: "36 states + global",
    onClick: () => goto({ tab: "chat" }),
  });
  quick.push({
    icon: Film,
    label: "Cinema",
    hint: kind === "cinema" ? "Submit + vote" : "Watch + vote",
    onClick: () => goto({ tab: "cinema" }),
  });
  if (canKind(kind, "music.submit")) {
    quick.push({
      icon: Radio,
      label: "Add music",
      hint: "URL + cover",
      onClick: () => {
        goto({ tab: "music" });
        window.setTimeout(openCreate, 80);
      },
    });
  } else if (canKind(kind, "ads.submit")) {
    quick.push({
      icon: Megaphone,
      label: "Place ad",
      hint: "Crypto · staff approve",
      onClick: () => goto({ screen: "ads" }),
    });
  } else if (canKind(kind, "jobs.post")) {
    quick.push({
      icon: Briefcase,
      label: "Post a job",
      hint: "Staff approve first",
      onClick: openCreate,
    });
  } else if (canKind(kind, "market.list")) {
    quick.push({
      icon: Store,
      label: "List product",
      hint: "Showcase · contact",
      onClick: openCreate,
    });
  } else if (canKind(kind, "rent.list")) {
    quick.push({
      icon: Building2,
      label: "List space",
      hint: "Rent · contact link",
      onClick: openCreate,
    });
  } else {
    quick.push({
      icon: Briefcase,
      label: "Jobs",
      hint: "Browse + apply",
      onClick: () => goto({ screen: "jobs" }),
    });
  }

  const rooms = store.pins.length ? store.pins : ["global"];
  const CtaIcon = cta.icon;

  const stats: { n: number; l: string }[] =
    kind === "artist"
      ? [
          { n: songs.length, l: "Tracks" },
          { n: trackViews, l: "Views" },
          { n: mine.length, l: "Posts" },
          { n: store.pins.length, l: "Rooms" },
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
                { n: kind === "brand" ? myMarket.length : mine.length, l: kind === "brand" ? "Products" : "Posts" },
                { n: store.pins.length, l: "Rooms" },
              ]
            : kind === "job_poster"
              ? [
                  { n: myJobs.length, l: "Jobs" },
                  { n: pendingJobs, l: "Pending" },
                  { n: listingViews, l: "Views" },
                  { n: mine.length, l: "Posts" },
                ]
              : kind === "vendor"
                ? [
                    { n: myMarket.length, l: "Products" },
                    { n: listingViews, l: "Views" },
                    { n: mine.length, l: "Posts" },
                    { n: store.pins.length, l: "Rooms" },
                  ]
                : kind === "renter"
                  ? [
                      { n: myRent.length, l: "Spaces" },
                      { n: listingViews, l: "Views" },
                      { n: mine.length, l: "Posts" },
                      { n: store.pins.length, l: "Rooms" },
                    ]
                  : kind === "job_seeker"
                    ? [
                        { n: myApps.length, l: "Apps" },
                        { n: openJobs.length, l: "Open" },
                        { n: store.savedPosts.length, l: "Saved" },
                        { n: store.pins.length, l: "Rooms" },
                      ]
                    : [
                        { n: mine.length, l: "Topics" },
                        { n: postVotes, l: "Votes" },
                        { n: store.savedPosts.length, l: "Saved" },
                        { n: store.pins.length, l: "Rooms" },
                      ];

  return (
    <div className="mx-auto max-w-2xl p-4 pb-24">
      <div className="mb-4">
        <div className="text-[10px] font-bold tracking-[0.2em] text-lime-2">ME · DASHBOARD</div>
        <h2 className="text-2xl font-extrabold tracking-tight">Your hub</h2>
        <p className="mt-1 text-sm text-muted">{purpose}</p>
      </div>

      <div className="raised mb-4 overflow-hidden rounded-2xl">
        <div className="flex items-start gap-3 p-4">
          <AvatarImg handle={store.handle} face={store.face} size={64} className="ring-2 ring-lime-2/40" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-lg font-extrabold">@{store.handle}</div>
            <div className="mt-1 inline-flex items-center gap-1.5">
              <span className="rounded-full bg-lime-2/15 px-2 py-0.5 text-[10px] font-bold text-lime-2">{kindLabel}</span>
              <span className="text-[10px] text-muted">locked</span>
            </div>
            {store.city ? <div className="mt-1 text-[11px] text-muted">{store.city}</div> : null}
            <p className="mt-2 line-clamp-3 text-[12px] leading-snug text-muted">
              {store.bio?.trim() || "No bio yet — tap Edit profile to add one."}
            </p>
          </div>
        </div>
        <div className="flex gap-2 border-t border-line/70 bg-black/20 px-3 py-2.5">
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
              body="No tracks yet. Add a Spotify / SoundCloud / Audiomack / Apple / Deezer URL and optional cover — Kilode embeds their player, never hosts audio."
              cta="Add first track"
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
              <p className="text-[10px] text-muted">News Engine is staff-only in /ops — your public stories still go through Feeds.</p>
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
            goto({ tab: "cinema" });
            window.setTimeout(openCreate, 80);
          }}
        >
          {myCinema.length === 0 ? (
            <EmptyBlock
              body="No submissions yet. Submit a YouTube trailer URL from Create or Cinema — staff approve, then votes push it to Watching Now."
              cta="Submit cinema"
              onClick={() => {
                goto({ tab: "cinema" });
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
                  onClick={() => goto({ tab: "cinema" })}
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
              body="No campaigns yet. Pick a slot, upload creative, copy the Kilode wallet, pay crypto, paste the tx hash. Staff approve. NOWPayments needs a Super Admin API key — manual wallets are the live path."
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
              body="Brand ads go live after crypto payment + staff approve. NOWPayments needs a Super Admin API key — use the wallet Copy path today. You can also showcase products in Marketplace."
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
                <ListingRow key={r.id} r={r} />
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
        <Section kicker="JOBS" title="Your jobs" action="Post a job" onAction={openCreate}>
          {myJobs.length === 0 ? (
            <EmptyBlock
              body="No jobs under your handle yet. Post a role with company, city, contact and optional apply link — staff approve before seekers see it."
              cta="Post first job"
              onClick={openCreate}
            />
          ) : (
            <div className="space-y-2">
              {myJobs.slice(0, 10).map((r) => (
                <ListingRow key={r.id} r={r} />
              ))}
              <button type="button" className="btn-3d w-full rounded-lg py-2 text-[12px] font-bold" onClick={() => goto({ screen: "jobs" })}>
                Open Jobs board
              </button>
            </div>
          )}
        </Section>
      ) : null}

      {kind === "vendor" ? (
        <Section kicker="MARKET" title="Your products" action="Add product" onAction={openCreate}>
          {myMarket.length === 0 ? (
            <EmptyBlock
              body="No products live yet. Showcase with title, city, contact link — no in-app checkout. Staff approve first."
              cta="List product"
              onClick={openCreate}
            />
          ) : (
            <div className="space-y-2">
              {myMarket.slice(0, 10).map((r) => (
                <ListingRow key={r.id} r={r} />
              ))}
              <button type="button" className="btn-3d w-full rounded-lg py-2 text-[12px] font-bold" onClick={() => goto({ screen: "market" })}>
                Open Marketplace
              </button>
            </div>
          )}
        </Section>
      ) : null}

      {kind === "renter" ? (
        <Section kicker="RENT" title="Your spaces" action="Add space" onAction={openCreate}>
          {myRent.length === 0 ? (
            <EmptyBlock
              body="No spaces live yet. List with title, city, contact — no in-app booking. Staff approve first."
              cta="List space"
              onClick={openCreate}
            />
          ) : (
            <div className="space-y-2">
              {myRent.slice(0, 10).map((r) => (
                <ListingRow key={r.id} r={r} />
              ))}
              <button type="button" className="btn-3d w-full rounded-lg py-2 text-[12px] font-bold" onClick={() => goto({ screen: "rent" })}>
                Open Rent
              </button>
            </div>
          )}
        </Section>
      ) : null}

      {kind === "job_seeker" ? (
        <Section kicker="JOB SEEKER" title="Applications & open roles" action="Browse jobs" onAction={() => goto({ screen: "jobs" })}>
          {myApps.length === 0 ? (
            <EmptyBlock
              body="You have not applied yet. Open a live job, leave a short note, and the poster sees your @handle. Keep your profile bio + city sharp."
              cta="Browse jobs"
              onClick={() => goto({ screen: "jobs" })}
            />
          ) : (
            <div className="mb-3 space-y-2">
              {myApps.slice(0, 8).map((a) => (
                <div key={a.id} className="rounded-xl border border-line bg-panel px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="truncate text-sm font-semibold">{a.title}</div>
                    <StatusPill status={a.status} />
                  </div>
                  <div className="text-[10px] text-muted">
                    {a.company || "Company"} · {a.city || "Nigeria"} · {timeAgo(a.ts)}
                  </div>
                  {a.note ? <div className="mt-1 line-clamp-2 text-[11px] text-muted">{a.note}</div> : null}
                </div>
              ))}
            </div>
          )}
          <div className="mb-2 text-[10px] font-bold tracking-[0.14em] text-muted">OPEN ROLES</div>
          {openJobs.length === 0 ? (
            <EmptyBlock body="No approved jobs live right now. Check back soon or polish your profile." cta="Edit profile" onClick={() => goto({ screen: "profile" })} />
          ) : (
            <div className="space-y-2">
              {openJobs.slice(0, 5).map((r) => (
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
      ) : null}

      {kind === "member" ? (
        <Section kicker="MEMBER" title="Made for your account">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <ActionTile icon={Plus} label="Post in Feeds" hint="Rich editor · publish" onClick={openCreate} />
            <ActionTile icon={Briefcase} label="Apply to jobs" hint="Open roles near you" onClick={() => goto({ screen: "jobs" })} />
            <ActionTile icon={Film} label="Vote cinema" hint="One vote / title / day" onClick={() => goto({ tab: "cinema" })} />
          </div>
          {drafts.length ? (
            <p className="mt-3 text-[11px] text-muted">
              {drafts.length} draft{drafts.length === 1 ? "" : "s"} waiting — open Create to finish.
            </p>
          ) : null}
        </Section>
      ) : null}

      {kind !== "writer" ? (
        <Section
          kicker="ACTIVITY"
          title={canKind(kind, "feeds.post") ? "Your posts" : "Your feed activity"}
          action={canKind(kind, "feeds.post") && kind !== "job_seeker" ? "New post" : undefined}
          onAction={canKind(kind, "feeds.post") && kind !== "job_seeker" ? openCreate : undefined}
        >
          {mine.length === 0 ? (
            <EmptyBlock
              body={
                canKind(kind, "feeds.post") && kind !== "job_seeker"
                  ? "Nothing published yet. A new post puts you in Feeds for Nigeria."
                  : kind === "job_seeker"
                    ? "Job Seeker focus is applications — explore Feeds anytime."
                    : "This account type focuses elsewhere — explore Feeds anytime."
              }
              cta={canKind(kind, "feeds.post") && kind !== "job_seeker" ? "New post" : "Open Feeds"}
              onClick={() => (canKind(kind, "feeds.post") && kind !== "job_seeker" ? openCreate() : goto({ tab: "feeds" }))}
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
              className="rounded-full border border-line bg-panel px-3 py-1.5 text-[11px] font-semibold"
              onClick={() => {
                store.openRoom?.(id);
                goto({ tab: "chat" });
              }}
            >
              {roomName(id)}
            </button>
          ))}
        </div>
        {store.pins.length === 0 ? <p className="mt-2 text-[11px] text-muted">Pin rooms from Chat to pin them here. Showing Global for now.</p> : null}
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
    </div>
  );
}

function ListingRow({ r }: { r: Listing }) {
  return (
    <div className="rounded-xl border border-line bg-panel px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <div className="truncate text-sm font-semibold">{r.title}</div>
        <StatusPill status={r.status} />
      </div>
      <div className="text-[10px] text-muted">
        {r.company ? `${r.company} · ` : ""}
        {r.city || "Nigeria"} · {fmtCount(r.views)} views · {timeAgo(r.ts)}
      </div>
    </div>
  );
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
