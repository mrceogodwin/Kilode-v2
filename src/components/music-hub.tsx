import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, LayoutGrid, Link2, Music, Play, Plus, TrendingUp, User } from "lucide-react";
import { ArtFace, PushDesk } from "@/components/artist-push";
import { artistFollowCount, followArtist, listLivePushes, listMyPayouts, listPresaves, releasePresave, requestPayout, savePresave, wantPresave, type PreSaveCard, type PushCard } from "@/lib/artist-server";
import { clickRate, groupArtists, rankArtists, rankSongs, risingSongs, type RankArtist } from "@/lib/artist-rank";
import { seeTrack } from "@/lib/forum-server";
import { fmtCount, type MusicTrack } from "@/lib/qonvo-data";

type HubStore = {
  tracks: MusicTrack[];
  kind: string;
  authed: boolean;
  handle: string;
};

function Cover({ src, name, className }: { src?: string; name: string; className: string }) {
  const [on, setOn] = useState(Boolean(src));
  useEffect(() => setOn(Boolean(src)), [src]);
  if (!src || !on) return <span className={`${className} mh-fallback`}>{name.slice(0, 1).toUpperCase()}</span>;
  return <img src={src} alt="" referrerPolicy="no-referrer" className={className} onError={() => setOn(false)} />;
}

function openSong(track: { id: string; url: string }) {
  void seeTrack({ data: { id: track.id } });
  window.open(track.url, "_blank", "noopener,noreferrer");
}

export function MusicHub({ store, onAdd }: { store: HubStore; onAdd: () => void }) {
  const [q, setQ] = useState("");
  const [lane, setLane] = useState<"home" | "charts" | "artists" | "push" | "new" | "genres">("home");
  const [genre, setGenre] = useState("All");
  const [spot, setSpot] = useState(0);
  const [artist, setArtist] = useState<RankArtist | null>(null);
  const [follows, setFollows] = useState(0);
  const [following, setFollowing] = useState(false);
  const [pushes, setPushes] = useState<PushCard[]>([]);
  const [drops, setDrops] = useState<PreSaveCard[]>([]);
  const [dropTitle, setDropTitle] = useState("");
  const [dropWhen, setDropWhen] = useState("");
  const [dropUrl, setDropUrl] = useState("");
  const [payNote, setPayNote] = useState("");
  const [payouts, setPayouts] = useState<{ id: string; note: string; status: string }[]>([]);
  const [err, setErr] = useState("");

  const pool = useMemo(() => {
    const s = q.trim().toLowerCase();
    return store.tracks.filter((t) => {
      if (!t?.id || !t.artist) return false;
      if (genre !== "All" && (t.genre || "Afrobeats") !== genre) return false;
      if (!s) return true;
      return `${t.artist} ${t.title} ${t.genre || ""}`.toLowerCase().includes(s);
    });
  }, [store.tracks, q, genre]);

  const artists = useMemo(() => rankArtists(groupArtists(pool)), [pool]);
  const songs = useMemo(() => rankSongs(pool), [pool]);
  const fresh = useMemo(() => [...pool].sort((a, b) => b.ts - a.ts).slice(0, 8), [pool]);
  const rising = useMemo(() => risingSongs(pool, Date.now()).slice(0, 6), [pool]);
  const genres = useMemo(() => ["All", ...new Set(store.tracks.map((t) => t.genre || "Afrobeats"))].slice(0, 8), [store.tracks]);
  const featured = artists.slice(0, 5);
  const hero = featured[Math.min(spot, Math.max(featured.length - 1, 0))];

  useEffect(() => {
    void listLivePushes().then((rows) => setPushes(Array.isArray(rows) ? rows : [])).catch(() => setPushes([]));
    void listPresaves().then((rows) => setDrops(Array.isArray(rows) ? rows : [])).catch(() => setDrops([]));
    if (store.authed && store.kind === "artist") void listMyPayouts().then((rows) => setPayouts(Array.isArray(rows) ? rows : [])).catch(() => setPayouts([]));
  }, [lane, store.authed, store.kind]);

  useEffect(() => {
    if (!artist) return;
    void artistFollowCount({ data: { slug: artist.slug } }).then((r) => setFollows(r.count)).catch(() => setFollows(0));
    setFollowing(false);
  }, [artist]);

  function listen(track: { id: string; url: string }) {
    openSong(track);
  }

  async function onFollow() {
    if (!artist) return;
    if (!store.authed) {
      window.location.href = "/login";
      return;
    }
    const r = await followArtist({ data: { slug: artist.slug, name: artist.name } });
    if (!r.ok) {
      setErr("reason" in r ? r.reason : "Could not follow.");
      return;
    }
    setFollowing(r.following);
    setFollows(r.count);
  }

  if (artist) {
    const latest = artist.tracks[0];
    return (
      <div className="mh-scroll dock-pad">
        <button type="button" className="mh-back" onClick={() => setArtist(null)}><ChevronLeft className="size-4" /> Music</button>
        <div className="mh-profile">
          <ArtFace name={artist.name} cover={artist.cover} url={artist.url} big />
          <div>
            <div className="mh-kicker">{artist.genre || "Music"}</div>
            <h2>{artist.name}</h2>
            <p>{fmtCount(artist.plays)} Kilode opens · {artist.tracks.length} release{artist.tracks.length === 1 ? "" : "s"} · {fmtCount(follows)} followers</p>
          </div>
        </div>
        <div className="mh-row">
          {latest ? <button type="button" className="mh-play" onClick={() => listen(latest)}><Play className="size-3.5" /> Listen</button> : null}
          <button type="button" className="mh-ghost" onClick={() => void onFollow()}>{following ? "Following" : "Follow"}</button>
          <button type="button" className="mh-ghost" onClick={() => void navigator.clipboard?.writeText(`${window.location.origin}/artist/${artist.slug}`)}>Copy link</button>
        </div>
        <p className="mh-note">Songs open on the artist’s platform. Kilode does not play the file and does not invent a listener count.</p>
        {err ? <p className="ad-err">{err}</p> : null}
        <h3 className="mh-h">Releases</h3>
        <div className="mh-list">
          {artist.tracks.map((t) => (
            <button key={t.id} type="button" className="mh-song" onClick={() => listen(t)}>
              <Cover src={t.cover} name={t.title} className="mh-thumb" />
              <span><strong>{t.title}</strong><em>{t.platform || "Link"} · {t.views ? `${fmtCount(t.views)} opens` : "No opens yet"}</em></span>
              <Play className="size-3.5" />
            </button>
          ))}
        </div>
      </div>
    );
  }

  const showHome = lane === "home";
  const quick = [
    { id: "charts" as const, icon: TrendingUp, title: "Top 50", sub: "Kilode charts" },
    { id: "new" as const, icon: Music, title: "New releases", sub: "Fresh drops" },
    { id: "genres" as const, icon: LayoutGrid, title: "Genres", sub: "Explore" },
    { id: "artists" as const, icon: User, title: "Artists", sub: "Discover" },
    { id: "push" as const, icon: Link2, title: "Push link", sub: "Promote" },
  ];

  return (
    <div className="mh-scroll dock-pad">
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search artists, songs, genres..." className="mh-search" aria-label="Search artists, songs, genres" />

      {showHome && hero ? (
        <section className="mh-banner" style={hero.cover ? { backgroundImage: `linear-gradient(90deg, rgba(13,13,13,.92) 0%, rgba(13,13,13,.55) 58%, rgba(13,13,13,.2) 100%), url(${hero.cover})` } : undefined}>
          <div>
            <div className="mh-kicker">Featured artist</div>
            <strong>{hero.name}</strong>
            <em>{hero.tracks[0]?.title ? `New · ${hero.tracks[0].title}` : "Latest link"}</em>
            <button type="button" className="mh-play" onClick={() => hero.tracks[0] && listen(hero.tracks[0])}><Play className="size-3.5" /> Listen now</button>
          </div>
          <button type="button" className="mh-album" aria-label="Next featured artist" onClick={() => setSpot((n) => (n + 1) % featured.length)}>
            <Cover src={hero.tracks[0]?.cover || hero.cover} name={hero.tracks[0]?.title || hero.name} className="mh-album-photo" />
            <b>{hero.tracks[0]?.title || hero.name}</b>
            <i>{spot + 1}/{featured.length}</i>
            <ChevronRight className="size-3.5" />
          </button>
        </section>
      ) : null}

      {showHome ? (
        <div className="mh-chips">
          <button type="button" className="on" onClick={() => setLane("charts")}><TrendingUp className="size-3.5" /> Trending now</button>
          {artists.slice(0, 6).map((a) => (
            <button key={a.slug} type="button" onClick={() => setArtist(a)}>{a.name}</button>
          ))}
        </div>
      ) : (
        <div className="mh-chips">
          <button type="button" onClick={() => setLane("home")}>Discover</button>
          <button type="button" className={lane === "charts" ? "on" : ""} onClick={() => setLane("charts")}>Top 50</button>
          <button type="button" className={lane === "new" ? "on" : ""} onClick={() => setLane("new")}>New</button>
          <button type="button" className={lane === "artists" ? "on" : ""} onClick={() => setLane("artists")}>Artists</button>
          <button type="button" className={lane === "push" ? "on" : ""} onClick={() => setLane("push")}>Push</button>
        </div>
      )}

      {showHome ? (
        <section>
          <div className="mh-head"><h3 className="mh-h">Quick access</h3></div>
          <div className="mh-quick">
            {quick.map((item) => (
              <button key={item.id} type="button" onClick={() => setLane(item.id)}>
                <item.icon className="size-4" />
                <strong>{item.title}</strong>
                <em>{item.sub}</em>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {lane === "genres" ? (
        <div className="mh-chips">
          {genres.map((g) => (
            <button key={g} type="button" className={genre === g ? "on" : ""} onClick={() => { setGenre(g); setLane("home"); }}>{g}</button>
          ))}
        </div>
      ) : null}

      {lane === "push" ? (
        <section className="mh-tools">
          <h3 className="mh-h">Push a link</h3>
          <p className="mh-note">Paid card on Socials. It goes live only after Kilode confirms the payment. City and age are what you asked for, not a measured audience.</p>
          <PushDesk artist={store.kind === "artist" && store.authed} />
          <h3 className="mh-h">Pre-save</h3>
          <p className="mh-note">People tap Notify me. When you release it, Kilode sends that note to the people who asked. No invented interest count.</p>
          {store.kind === "artist" && store.authed ? (
            <div className="mh-form">
              <input value={dropTitle} onChange={(e) => setDropTitle(e.target.value)} placeholder="Drop title" />
              <input value={dropWhen} onChange={(e) => setDropWhen(e.target.value)} placeholder="18 Oct 2026" />
              <input value={dropUrl} onChange={(e) => setDropUrl(e.target.value)} placeholder="https:// music or social link" />
              <button type="button" className="mh-play" onClick={() => void savePresave({ data: { title: dropTitle, whenLabel: dropWhen, url: dropUrl } }).then((r) => {
                if (!r.ok) setErr("reason" in r ? r.reason : "Could not save the drop.");
                else { setDropTitle(""); setDropWhen(""); setDropUrl(""); setErr(""); void listPresaves().then((rows) => setDrops(Array.isArray(rows) ? rows : [])); }
              })}>Save drop</button>
            </div>
          ) : <p className="mh-note">An Artist account creates the drop.</p>}
          <h3 className="mh-h">Payout request</h3>
          <p className="mh-note">This stores a request. Kilode does not send the money from here.</p>
          {store.kind === "artist" && store.authed ? (
            <div className="mh-form">
              <input value={payNote} onChange={(e) => setPayNote(e.target.value)} placeholder="Account name and bank" />
              <button type="button" className="mh-ghost" onClick={() => void requestPayout({ data: { note: payNote } }).then((r) => {
                if (!r.ok) setErr("reason" in r ? r.reason : "Could not store the request.");
                else { setPayNote(""); setErr(""); void listMyPayouts().then((rows) => setPayouts(Array.isArray(rows) ? rows : [])); }
              })}>Request</button>
            </div>
          ) : null}
          {payouts.map((row) => <p key={row.id} className="mh-note">{row.status} · {row.note}</p>)}
          {err ? <p className="ad-err">{err}</p> : null}
        </section>
      ) : null}

      {(showHome || lane === "artists") && artists.length ? (
        <section>
          <div className="mh-head"><h3 className="mh-h">Trending artists</h3><button type="button" onClick={() => setLane("artists")}>See all</button></div>
          <div className="mh-faces">
            {artists.slice(0, lane === "artists" ? 24 : 8).map((a) => (
              <div key={a.slug} className="mh-face">
                <button type="button" onClick={() => setArtist(a)}>
                  <ArtFace name={a.name} cover={a.cover} url={a.url} />
                  <strong>{a.name}</strong>
                  <em>{a.genre || "Music"}</em>
                  <em>{a.plays ? fmtCount(a.plays) : "New"}</em>
                </button>
                <button type="button" className="mh-plus" aria-label={`Follow ${a.name}`} onClick={() => {
                  if (!store.authed) { window.location.href = "/login"; return; }
                  void followArtist({ data: { slug: a.slug, name: a.name } });
                }}><Plus className="size-3" /></button>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {(showHome || lane === "new") ? (
        <section>
          <div className="mh-head"><h3 className="mh-h">New releases</h3><button type="button" onClick={onAdd}>See all</button></div>
          {fresh.length === 0 ? <p className="mh-note">No releases in this cut.</p> : null}
          <div className="mh-releases">
            {fresh.map((t) => (
              <button key={t.id} type="button" className="mh-release" onClick={() => listen(t)}>
                <span className="mh-shot">
                  <Cover src={t.cover} name={t.title} className="mh-release-photo" />
                  <i><Play className="size-3" /></i>
                </span>
                <strong>{t.title}</strong>
                <em>{t.artist}</em>
                <em>{t.views ? `${fmtCount(t.views)} opens` : "No opens yet"}</em>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {(showHome || lane === "charts") ? (
        <section>
          <div className="mh-head"><h3 className="mh-h">Top songs</h3><button type="button" onClick={() => setLane("charts")}>See all</button></div>
          <div className="mh-grid">
            {songs.slice(0, lane === "charts" ? 20 : 6).map((t, i) => (
              <button key={t.id} type="button" className="mh-song" onClick={() => listen(t)}>
                <b>{i + 1}</b>
                <Cover src={t.cover} name={t.title} className="mh-thumb" />
                <span><strong>{t.title}</strong><em>{t.artist}</em><em>{t.views ? `${fmtCount(t.views)} opens` : "No opens yet"}</em></span>
                <Play className="size-3.5" />
              </button>
            ))}
          </div>
          {lane === "charts" ? (
            <>
              <h3 className="mh-h">Rising · last 14 days</h3>
              {rising.length === 0 ? <p className="mh-note">Nothing new in the last 14 days.</p> : null}
              <div className="mh-list">
                {rising.map((t) => (
                  <button key={t.id} type="button" className="mh-song" onClick={() => listen(t)}>
                    <Cover src={t.cover} name={t.title} className="mh-thumb" />
                    <span><strong>{t.title}</strong><em>{t.artist}</em></span>
                  </button>
                ))}
              </div>
            </>
          ) : null}
        </section>
      ) : null}

      {(showHome || lane === "charts") ? (
        <section>
          <div className="mh-head"><h3 className="mh-h">Featured campaigns</h3><button type="button" onClick={() => setLane("push")}>See all</button></div>
          {pushes.length === 0 && drops.length === 0 ? <p className="mh-note">No paid push or pre-save is live.</p> : null}
          <div className="mh-campaigns">
            {pushes.map((p) => {
              const rate = clickRate(p.views, p.clicks);
              const social = /instagram|tiktok|^x$|youtube/i.test(p.network);
              return (
                <a key={p.id} className="mh-campaign" href={p.url} target="_blank" rel="noreferrer">
                  <Cover src={p.cover} name={p.title} className="mh-thumb" />
                  <span>
                    <b>{social ? "Social push" : "Paid push"}</b>
                    <strong>{p.title}</strong>
                    <em>{fmtCount(p.views)} seen · {fmtCount(p.clicks)} opens{rate == null ? "" : ` · ${rate}%`}</em>
                    {p.targetCity || p.targetAge ? <em>Asked for {p.targetCity}{p.targetAge ? ` · ${p.targetAge}` : ""}</em> : null}
                  </span>
                </a>
              );
            })}
            {drops.map((d) => (
              <div key={d.id} className="mh-campaign">
                <Cover src={d.cover} name={d.title} className="mh-thumb" />
                <span>
                  <b>Pre-save</b>
                  <strong>{d.title}</strong>
                  <em>{d.artist} · {d.whenLabel} · {fmtCount(d.interests)} asked</em>
                  <button type="button" className="mh-play" onClick={() => {
                    if (!store.authed) { window.location.href = "/login"; return; }
                    void wantPresave({ data: { id: d.id } }).then((r) => { if (r.ok) setDrops((list) => list.map((x) => x.id === d.id ? { ...x, interests: r.interests } : x)); });
                  }}>Notify me</button>
                  {store.kind === "artist" ? <button type="button" className="mh-ghost" onClick={() => void releasePresave({ data: { id: d.id } }).then((r) => setErr(r.ok ? `Told ${r.told} people.` : ("reason" in r ? r.reason : "Could not release.")))}>Release</button> : null}
                </span>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
