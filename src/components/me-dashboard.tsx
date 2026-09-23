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
import { listCinema, type CinemaMovie } from "@/lib/cinema-server";
import { listListings, type Listing } from "@/lib/listings-server";

type Store = ReturnType<typeof useQonvo>;

function goto(detail: { screen?: string; tab?: string }) {
  window.dispatchEvent(new CustomEvent("kilode:goto", { detail }));
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
          <li>Writer — publish in Feeds.</li>
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

export function MeDashboard({ store, onForum }: { store: Store; onForum?: () => void }) {
  const signed = Boolean(store.handle);
  const [movies, setMovies] = useState<CinemaMovie[]>([]);
  const [jobs, setJobs] = useState<Listing[]>([]);
  const [market, setMarket] = useState<Listing[]>([]);
  const [rent, setRent] = useState<Listing[]>([]);

  useEffect(() => {
    if (!signed) return;
    void listCinema({ data: { section: "top" } })
      .then((rows) => setMovies(Array.isArray(rows) ? rows : []))
      .catch(() => setMovies([]));
    void listListings({ data: { kind: "job" } })
      .then((rows) => setJobs(Array.isArray(rows) ? rows : []))
      .catch(() => setJobs([]));
    void listListings({ data: { kind: "market" } })
      .then((rows) => setMarket(Array.isArray(rows) ? rows : []))
      .catch(() => setMarket([]));
    void listListings({ data: { kind: "rent" } })
      .then((rows) => setRent(Array.isArray(rows) ? rows : []))
      .catch(() => setRent([]));
  }, [signed, store.handle]);

  const kind = store.kind as AccountKind;
  const kindLabel = ACCOUNT_KINDS.find((k) => k.id === kind)?.label ?? "Member";
  const purpose = KIND_PURPOSE[kind] ?? KIND_PURPOSE.member;

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
  const myCinema = useMemo(
    () => (store.handle ? movies.filter((m) => m.submitter === store.handle) : []),
    [movies, store.handle],
  );
  const myJobs = useMemo(
    () => (store.handle ? jobs.filter((r) => r.submitter === store.handle) : []),
    [jobs, store.handle],
  );
  const myMarket = useMemo(
    () => (store.handle ? market.filter((r) => r.submitter === store.handle) : []),
    [market, store.handle],
  );
  const myRent = useMemo(
    () => (store.handle ? rent.filter((r) => r.submitter === store.handle) : []),
    [rent, store.handle],
  );
  const saved = useMemo(
    () => store.posts.filter((p) => !!p?.id && store.savedPosts.includes(p.id)),
    [store.posts, store.savedPosts],
  );
  const votes = useMemo(() => {
    let n = 0;
    for (const p of mine) n += store.likes[p.id] ?? 0;
    if (kind === "cinema") n += myCinema.reduce((a, m) => a + (m.votes || 0), 0);
    return n;
  }, [kind, mine, myCinema, store.likes]);

  if (!signed) return <GuestDash />;

  const quick: { icon: typeof Plus; label: string; hint: string; onClick: () => void }[] = [];
  if (canKind(kind, "feeds.post")) {
    quick.push({
      icon: Plus,
      label: "New post",
      hint: "Publish in Feeds",
      onClick: () => window.dispatchEvent(new Event("kilode:create")),
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
      hint: "URL embed only",
      onClick: () => {
        goto({ tab: "music" });
        window.setTimeout(() => window.dispatchEvent(new Event("kilode:create")), 80);
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
      onClick: () => goto({ screen: "jobs" }),
    });
  } else if (canKind(kind, "market.list")) {
    quick.push({
      icon: Store,
      label: "List product",
      hint: "Showcase · contact",
      onClick: () => goto({ screen: "market" }),
    });
  } else if (canKind(kind, "rent.list")) {
    quick.push({
      icon: Building2,
      label: "List space",
      hint: "Rent · contact link",
      onClick: () => goto({ screen: "rent" }),
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

  return (
    <div className="mx-auto max-w-2xl p-4 pb-24">
      <div className="mb-4">
        <div className="text-[10px] font-bold tracking-[0.2em] text-lime-2">ME · DASHBOARD</div>
        <h2 className="text-2xl font-extrabold tracking-tight">Your hub</h2>
        <p className="mt-1 text-sm text-muted">{purpose}</p>
      </div>

      {/* Hero */}
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
          {canKind(kind, "feeds.post") ? (
            <button
              type="button"
              className="btn-join inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[12px] font-bold"
              onClick={() => window.dispatchEvent(new Event("kilode:create"))}
            >
              <Plus className="size-3.5" />
              New post
            </button>
          ) : null}
        </div>
      </div>

      {/* Stats */}
      <div className="mb-5 grid grid-cols-4 gap-1.5">
        <Stat n={mine.length} l="Topics" />
        <Stat n={votes} l="Votes" />
        <Stat n={store.savedPosts.length} l="Saved" />
        <Stat n={store.pins.length} l="Rooms" />
      </div>

      {/* Quick actions */}
      <Section kicker="QUICK" title="Do something now">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{quick.map((q) => <ActionTile key={q.label} {...q} />)}</div>
      </Section>

      {/* Kind extras */}
      {kind === "artist" ? (
        <Section kicker="ARTIST" title="Your tracks" action="Music tab" onAction={() => goto({ tab: "music" })}>
          {songs.length === 0 ? (
            <EmptyBlock
              body="No tracks yet. Add a Spotify / SoundCloud / Audiomack URL — Kilode embeds their player, never hosts audio."
              cta="Add music"
              onClick={() => {
                goto({ tab: "music" });
                window.setTimeout(() => window.dispatchEvent(new Event("kilode:create")), 80);
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
        <Section
          kicker="WRITER"
          title="Your articles"
          action="New story"
          onAction={() => window.dispatchEvent(new Event("kilode:create"))}
        >
          {mine.length === 0 && drafts.length === 0 ? (
            <EmptyBlock body="Nothing published yet. Writers land stories in Feeds under your handle." cta="Write a story" onClick={() => window.dispatchEvent(new Event("kilode:create"))} />
          ) : (
            <div className="space-y-2">
              {drafts.length ? (
                <p className="text-[11px] text-muted">
                  {drafts.length} draft{drafts.length === 1 ? "" : "s"} on this device — finish and publish from Create.
                </p>
              ) : null}
              {mine.slice(0, 8).map((p) => (
                <PostRow key={p.id} p={p} onOpen={() => { store.setOpenPost(p.id); onForum?.(); }} />
              ))}
              <p className="text-[10px] text-muted">News Engine is staff-only in /ops — your public stories still go through Feeds.</p>
            </div>
          )}
        </Section>
      ) : null}

      {kind === "cinema" || kind === "advertiser" ? (
        <Section
          kicker={kind === "cinema" ? "CINEMA" : "ADS + CINEMA"}
          title={kind === "cinema" ? "Your cinema submissions" : "Your campaigns"}
          action={kind === "cinema" ? "Submit title" : "Place ad"}
          onAction={() => (kind === "cinema" ? goto({ tab: "cinema" }) : goto({ screen: "ads" }))}
        >
          {kind === "cinema" ? (
            myCinema.length === 0 ? (
              <EmptyBlock
                body="No approved titles under your handle yet. Submit a YouTube URL from Cinema — staff approve, then votes push it to Watching Now."
                cta="Open Cinema"
                onClick={() => goto({ tab: "cinema" })}
              />
            ) : (
              <div className="space-y-2">
                {myCinema.slice(0, 8).map((m) => (
                  <div key={m.id} className="flex items-center justify-between gap-2 rounded-xl border border-line bg-panel px-3 py-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">{m.title}</div>
                      <div className="text-[10px] text-muted">
                        {m.section}
                        {m.watching ? " · Watching Now" : ""} · {m.votes} votes
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-lime-2">
                      <Vote className="size-3.5" />
                      {m.votes}
                    </span>
                  </div>
                ))}
              </div>
            )
          ) : null}
          {canKind(kind, "ads.submit") ? (
            <div className={kind === "cinema" ? "mt-3" : ""}>
              {kind === "cinema" ? <div className="mb-2 text-[10px] font-bold tracking-[0.14em] text-muted">ADS CAMPAIGNS</div> : null}
              {myAds.length === 0 ? (
                <EmptyBlock body="No ad campaigns yet. Place an ad, copy the wallet, pay crypto — staff approve." cta="Place ad" onClick={() => goto({ screen: "ads" })} />
              ) : (
                <div className="space-y-2">
                  {myAds.slice(0, 6).map((c) => (
                    <div key={c.id} className="rounded-xl border border-line bg-panel px-3 py-2">
                      <div className="truncate text-sm font-semibold">{c.name}</div>
                      <div className="text-[10px] text-muted">
                        {c.status} · {c.placement} · {fmtCount(c.views ?? 0)} views
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </Section>
      ) : null}

      {kind === "brand" ? (
        <Section kicker="BRAND" title="Ads & showcase" action="Place ad" onAction={() => goto({ screen: "ads" })}>
          {myAds.length === 0 ? (
            <EmptyBlock body="Brand ads go live after crypto payment + staff approve. You can also showcase in Marketplace." cta="Place ad" onClick={() => goto({ screen: "ads" })} />
          ) : (
            <div className="mb-3 space-y-2">
              {myAds.slice(0, 6).map((c) => (
                <div key={c.id} className="rounded-xl border border-line bg-panel px-3 py-2">
                  <div className="truncate text-sm font-semibold">{c.name}</div>
                  <div className="text-[10px] text-muted">
                    {c.status} · {fmtCount(c.views ?? 0)} views
                  </div>
                </div>
              ))}
            </div>
          )}
          <button type="button" className="btn-3d w-full rounded-lg py-2 text-[12px] font-bold" onClick={() => goto({ screen: "market" })}>
            Open marketplace
          </button>
        </Section>
      ) : null}

      {kind === "job_poster" ? (
        <Section kicker="JOBS" title="Your jobs" action="Post a job" onAction={() => goto({ screen: "jobs" })}>
          {myJobs.length === 0 ? (
            <EmptyBlock body="No live jobs under your handle. Post a role — staff approve before seekers see it." cta="Post a job" onClick={() => goto({ screen: "jobs" })} />
          ) : (
            <div className="space-y-2">
              {myJobs.slice(0, 8).map((r) => (
                <div key={r.id} className="rounded-xl border border-line bg-panel px-3 py-2">
                  <div className="truncate text-sm font-semibold">{r.title}</div>
                  <div className="text-[10px] text-muted">
                    {r.city || "Remote"} · {r.status} · {timeAgo(r.ts)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>
      ) : null}

      {kind === "vendor" || kind === "renter" ? (
        <Section
          kicker={kind === "vendor" ? "MARKET" : "RENT"}
          title="Your listings"
          action={kind === "vendor" ? "Add product" : "Add space"}
          onAction={() => goto({ screen: kind === "vendor" ? "market" : "rent" })}
        >
          {(kind === "vendor" ? myMarket : myRent).length === 0 ? (
            <EmptyBlock
              body={
                kind === "vendor"
                  ? "No products live yet. Showcase with a contact link — no in-app checkout."
                  : "No spaces live yet. List with a contact link — no in-app renting."
              }
              cta={kind === "vendor" ? "List product" : "List space"}
              onClick={() => goto({ screen: kind === "vendor" ? "market" : "rent" })}
            />
          ) : (
            <div className="space-y-2">
              {(kind === "vendor" ? myMarket : myRent).slice(0, 8).map((r) => (
                <div key={r.id} className="rounded-xl border border-line bg-panel px-3 py-2">
                  <div className="truncate text-sm font-semibold">{r.title}</div>
                  <div className="text-[10px] text-muted">
                    {r.city || "Nigeria"} · {fmtCount(r.views)} views · {timeAgo(r.ts)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>
      ) : null}

      {kind === "member" || kind === "job_seeker" ? (
        <Section kicker="EXPLORE" title="Made for your account">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <ActionTile icon={Briefcase} label="Apply to jobs" hint="Open roles near you" onClick={() => goto({ screen: "jobs" })} />
            <ActionTile icon={Film} label="Vote cinema" hint="One vote / title / day" onClick={() => goto({ tab: "cinema" })} />
            <ActionTile icon={MessageSquare} label="Join rooms" hint="Pin rooms you use" onClick={() => goto({ tab: "chat" })} />
          </div>
        </Section>
      ) : null}

      {/* Activity / posts — for kinds that aren't writer (writer has dedicated section) */}
      {kind !== "writer" ? (
        <Section
          kicker="ACTIVITY"
          title={canKind(kind, "feeds.post") ? "Your posts" : "Your feed activity"}
          action={canKind(kind, "feeds.post") ? "New post" : undefined}
          onAction={canKind(kind, "feeds.post") ? () => window.dispatchEvent(new Event("kilode:create")) : undefined}
        >
          {mine.length === 0 ? (
            <EmptyBlock
              body={
                canKind(kind, "feeds.post")
                  ? "Nothing published yet. A new post puts you in Feeds for Nigeria."
                  : "This account type focuses elsewhere — explore Feeds anytime."
              }
              cta={canKind(kind, "feeds.post") ? "New post" : "Open Feeds"}
              onClick={() => (canKind(kind, "feeds.post") ? window.dispatchEvent(new Event("kilode:create")) : goto({ tab: "feeds" }))}
            />
          ) : (
            <div className="space-y-2">
              {mine.slice(0, 8).map((p) => (
                <PostRow key={p.id} p={p} onOpen={() => { store.setOpenPost(p.id); onForum?.(); }} />
              ))}
            </div>
          )}
        </Section>
      ) : null}

      {/* Rooms */}
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

      {/* Saved */}
      <Section kicker="SAVED" title="Bookmarks" action="All saved" onAction={() => goto({ screen: "bookmarks" })}>
        {saved.length === 0 ? (
          <EmptyBlock body="Save a feed post from the article view — it lands here." cta="Open Feeds" onClick={() => goto({ tab: "feeds" })} />
        ) : (
          <div className="space-y-2">
            {saved.slice(0, 5).map((p) => (
              <PostRow key={p.id} p={p} onOpen={() => { store.setOpenPost(p.id); onForum?.(); }} />
            ))}
          </div>
        )}
      </Section>

      {/* Slim ad */}
      <div className="mb-5">
        <AdSlot id="feeds_inline" className="mb-0" quiet />
      </div>

      {/* Shortcuts */}
      <Section kicker="SHORTCUTS" title="More on Kilode">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <ActionTile icon={Download} label="Downloads" hint="Kilode products" onClick={() => goto({ tab: "downloads" })} />
          <ActionTile icon={Tv} label="Kilode TV" hint="Socials in one place" onClick={() => goto({ screen: "tv" })} />
          <ActionTile icon={Bookmark} label="Install" hint="Add to home screen" onClick={() => { window.location.href = "/install"; }} />
          <ActionTile icon={HelpCircle} label="Rules" hint="Help · terms · FAQ" onClick={() => goto({ screen: "help" })} />
        </div>
      </Section>
    </div>
  );
}

function PostRow({ p, onOpen }: { p: { id: string; title: string; image?: string; category?: string; comments?: unknown[]; views?: number }; onOpen: () => void }) {
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
