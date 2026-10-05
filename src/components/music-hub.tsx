import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Play } from "lucide-react";
import { ArtFace, PushDesk } from "@/components/artist-push";
import { artistFollowCount, followArtist, listLivePushes, type PushCard } from "@/lib/artist-server";
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
  const [lane, setLane] = useState<"home" | "charts" | "artists" | "push">("home");
  const [genre, setGenre] = useState("All");
  const [spot, setSpot] = useState(0);
  const [artist, setArtist] = useState<RankArtist | null>(null);
  const [follows, setFollows] = useState(0);
  const [following, setFollowing] = useState(false);
  const [pushes, setPushes] = useState<PushCard[]>([]);
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
  }, [lane]);

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

  return (
    <div className="mh-scroll dock-pad">
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search artists, songs, genres" className="mh-search" aria-label="Search artists, songs, genres" />
      <div className="mh-chips">
        {(["home", "charts", "artists", "push"] as const).map((id) => (
          <button key={id} type="button" className={lane === id ? "on" : ""} onClick={() => setLane(id)}>{id === "home" ? "Discover" : id === "charts" ? "Charts" : id === "artists" ? "Artists" : "Push link"}</button>
        ))}
        {genres.map((g) => (
          <button key={g} type="button" className={genre === g ? "on" : ""} onClick={() => setGenre(g)}>{g}</button>
        ))}
      </div>

      {lane === "push" ? (
        <>
          <h3 className="mh-h">Push a link</h3>
          <p className="mh-note">A paid card on Socials. It goes live only after Kilode confirms the payment. One live push at a time.</p>
          <PushDesk artist={store.kind === "artist" && store.authed} />
        </>
      ) : null}

      {lane !== "push" && hero ? (
        <section className="mh-hero">
          <Cover src={hero.cover} name={hero.name} className="mh-hero-photo" />
          <div>
            <div className="mh-kicker">Featured · {spot + 1}/{featured.length}</div>
            <strong>{hero.name}</strong>
            <em>{hero.tracks[0]?.title || "Latest link"} · {hero.plays ? `${fmtCount(hero.plays)} opens` : "No opens yet"}</em>
            <button type="button" className="mh-play" onClick={() => hero.tracks[0] && listen(hero.tracks[0])}><Play className="size-3.5" /> Listen</button>
          </div>
          <div className="mh-nav">
            <button type="button" aria-label="Previous artist" onClick={() => setSpot((n) => (n - 1 + featured.length) % featured.length)}><ChevronLeft className="size-3.5" /></button>
            <button type="button" aria-label="Next artist" onClick={() => setSpot((n) => (n + 1) % featured.length)}><ChevronRight className="size-3.5" /></button>
          </div>
        </section>
      ) : null}

      {lane === "home" || lane === "artists" ? (
        <section>
          <h3 className="mh-h">Artists</h3>
          {artists.length === 0 ? <p className="mh-note">No artists in this cut. Add a platform link from Create.</p> : null}
          <div className="mh-faces">
            {artists.slice(0, lane === "artists" ? 24 : 8).map((a) => (
              <button key={a.slug} type="button" className="mh-face" onClick={() => setArtist(a)}>
                <ArtFace name={a.name} cover={a.cover} url={a.url} />
                <strong>{a.name}</strong>
                <em>{a.genre || "Music"}</em>
                <em>{a.plays ? fmtCount(a.plays) : "New"}</em>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {lane === "home" ? (
        <section>
          <div className="mh-head"><h3 className="mh-h">New releases</h3><button type="button" onClick={onAdd}>Add a link</button></div>
          <div className="mh-releases">
            {fresh.map((t) => (
              <button key={t.id} type="button" className="mh-release" onClick={() => listen(t)}>
                <Cover src={t.cover} name={t.title} className="mh-release-photo" />
                <strong>{t.title}</strong>
                <em>{t.artist}</em>
                <em>{t.views ? `${fmtCount(t.views)} opens` : t.platform || "Link"}</em>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {lane === "home" || lane === "charts" ? (
        <section>
          <h3 className="mh-h">{lane === "charts" ? "Top songs" : "Top songs"}</h3>
          <div className="mh-list">
            {songs.slice(0, 10).map((t, i) => (
              <button key={t.id} type="button" className="mh-song" onClick={() => listen(t)}>
                <b>{i + 1}</b>
                <Cover src={t.cover} name={t.title} className="mh-thumb" />
                <span><strong>{t.title}</strong><em>{t.artist} · {t.views ? `${fmtCount(t.views)} opens` : "No opens yet"}</em></span>
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

      {lane === "home" || lane === "charts" ? (
        <section>
          <h3 className="mh-h">Live pushes</h3>
          {pushes.length === 0 ? <p className="mh-note">No paid push is live. An artist card appears here only after payment confirms.</p> : null}
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
                    <em>@{p.handle} · {fmtCount(p.views)} seen · {fmtCount(p.clicks)} opens{rate == null ? "" : ` · ${rate}%`}</em>
                  </span>
                </a>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}
