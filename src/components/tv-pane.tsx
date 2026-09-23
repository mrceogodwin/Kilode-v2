import { useEffect, useState } from "react";
import { ExternalLink, Play, Tv } from "lucide-react";
import { BangMark } from "@/components/brand-lockup";
import {
  deleteSocial,
  getTvLive,
  listSocials,
  saveSocial,
  saveTvLive,
  type SocialRow,
  type TvLive,
} from "@/lib/socials-server";

const TINT: Record<string, string> = {
  youtube: "#7a1f1f",
  tiktok: "#1a1a22",
  instagram: "#5a2140",
  x: "#1c1c1c",
  facebook: "#1a2744",
  telegram: "#16344a",
  whatsapp: "#14351f",
};

const EMPTY_TV: TvLive = {
  title: "Kilode TV Live",
  blurb: "Live from the Kilode desk.",
  youtubeId: "",
  live: false,
  url: "",
};

function ytThumb(id: string) {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

function KilodeTvLiveBox({ live }: { live: TvLive }) {
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);
  const id = (live.youtubeId || "").trim();

  useEffect(() => {
    setPlaying(false);
    setFailed(false);
  }, [id]);

  const showEmbed = Boolean(id) && !failed && playing;
  const onAir = live.live && Boolean(id);

  return (
    <section className="raised mb-3 overflow-hidden rounded-2xl border border-line">
      <div className="flex items-start justify-between gap-2 border-b border-line/60 px-3 py-2.5 sm:px-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-medium tracking-[0.2em] text-lime-2">KILODE TV</span>
            {onAir ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#c62828]/18 px-1.5 py-0.5 text-[9px] font-extrabold tracking-[0.14em] text-[#ff6b6b] ring-1 ring-[#c62828]/35">
                <span className="relative flex size-1.5">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#ff5252] opacity-70" />
                  <span className="relative inline-flex size-1.5 rounded-full bg-[#ff5252]" />
                </span>
                LIVE
              </span>
            ) : null}
          </div>
          <h2 className="mt-0.5 truncate text-[15px] font-bold leading-snug sm:text-[17px]">{live.title}</h2>
          {live.blurb ? <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-muted sm:text-[12px]">{live.blurb}</p> : null}
        </div>
        {live.url ? (
          <a
            href={live.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex shrink-0 items-center gap-1 rounded-md border border-line px-2 py-1 text-[9px] font-bold tracking-[0.08em] text-lime-2 hover:bg-panel"
          >
            YouTube
            <ExternalLink className="size-3" />
          </a>
        ) : null}
      </div>

      {/* TV bezel */}
      <div className="bg-gradient-to-b from-[#1a2a20] via-[#0e1612] to-[#08100c] p-2 sm:p-2.5">
        <div className="relative overflow-hidden rounded-lg border border-[#3d6a48]/55 bg-black shadow-[inset_0_0_0_1px_rgba(107,158,120,0.12)]">
          <div className="relative aspect-video w-full min-h-[10.5rem] sm:min-h-[13rem]">
            {showEmbed ? (
              <iframe
                key={id}
                title={live.title}
                src={`https://www.youtube-nocookie.com/embed/${id}?rel=0&autoplay=1`}
                className="absolute inset-0 h-full w-full border-0 bg-black"
                allow="encrypted-media; fullscreen; picture-in-picture"
                referrerPolicy="strict-origin-when-cross-origin"
                onError={() => setFailed(true)}
              />
            ) : (
              <button
                type="button"
                className="absolute inset-0 flex w-full flex-col items-center justify-center gap-2 bg-gradient-to-b from-[#0c1210] via-black to-[#061008] px-4 text-center"
                disabled={!id || failed}
                aria-label={id && !failed ? "Tap to play Kilode TV" : undefined}
                onClick={() => {
                  if (!id || failed) return;
                  setPlaying(true);
                }}
              >
                {id ? (
                  <img
                    src={ytThumb(id)}
                    alt=""
                    className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-45"
                    onError={() => setFailed(true)}
                  />
                ) : null}
                <div className="pointer-events-none absolute inset-0 bg-black/40" aria-hidden />
                <div className="relative z-[1] flex flex-col items-center gap-1.5">
                  {id && !failed ? (
                    <>
                      <span className="inline-flex size-14 items-center justify-center rounded-full border border-lime-2/50 bg-black/60 text-lime-2 shadow-[0_0_24px_rgba(107,158,120,0.35)]">
                        <Play className="size-7 fill-lime-2 text-lime-2" />
                      </span>
                      <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-lime-2">Tap to play</div>
                      {onAir ? (
                        <div className="text-[10px] font-semibold tracking-[0.12em] text-[#ff6b6b]">On air now</div>
                      ) : null}
                    </>
                  ) : (
                    <>
                      <BangMark className="size-12 rounded-[14px] sm:size-14 sm:rounded-[16px]" />
                      <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-lime-2">Live soon</div>
                      <p className="max-w-[16rem] text-[11px] leading-snug text-white/70">
                        Super sets the stream in ops
                      </p>
                    </>
                  )}
                </div>
              </button>
            )}
          </div>
        </div>
        {/* stand / chin */}
        <div className="mx-auto mt-1.5 h-1 w-16 rounded-full bg-[#2a4a32]/80" aria-hidden />
        <div className="mx-auto mt-0.5 h-0.5 w-24 rounded-full bg-[#1a2e20]/70" aria-hidden />
      </div>
    </section>
  );
}

export function TvPane() {
  const [rows, setRows] = useState<SocialRow[]>([]);
  const [tv, setTv] = useState<TvLive>(EMPTY_TV);
  useEffect(() => {
    void listSocials()
      .then(setRows)
      .catch(() => setRows([]));
    void getTvLive()
      .then(setTv)
      .catch(() => setTv(EMPTY_TV));
  }, []);
  return (
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 dock-pad">
      <section className="shop-hero mb-3 overflow-hidden rounded-2xl border border-line px-3 py-4 sm:px-4 sm:py-6">
        <div className="flex items-center gap-2 text-lime-2">
          <Tv className="size-4 sm:size-5" />
          <span className="text-[10px] font-medium tracking-[0.2em]">KILODE TV & SOCIALS</span>
        </div>
        <h1 className="mt-1.5 text-[22px] font-bold leading-tight sm:text-[32px]">Watch. Follow. Share.</h1>
        <p className="mt-1.5 max-w-md text-[12px] leading-relaxed text-muted sm:text-[13px]">
          One tap to every Kilode channel. Super pastes the real URLs and thumbs from ops.
        </p>
      </section>

      <KilodeTvLiveBox live={tv} />

      {rows.length === 0 ? (
        <p className="text-sm text-muted">No channels yet. Super adds them in ops.</p>
      ) : (
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
          {rows.map((s) => (
            <article key={s.id} className="raised flex min-w-0 flex-col overflow-hidden rounded-lg">
              {s.thumb ? (
                <img src={s.thumb} alt="" className="aspect-[4/3] w-full object-cover" />
              ) : (
                <div
                  className="grid aspect-[4/3] place-items-center border-b border-white/5"
                  style={{ background: TINT[s.id] || "#1a2420" }}
                >
                  <span className="text-[15px] font-black tracking-tight text-white/90 sm:text-[20px]">
                    {s.name.slice(0, 2).toUpperCase()}
                  </span>
                </div>
              )}
              <div className="flex min-h-0 flex-1 flex-col px-1.5 py-1.5 sm:px-2 sm:py-2">
                <div className="truncate text-[9px] font-medium tracking-[0.14em] text-lime-2">
                  {s.followers || s.name.toUpperCase()}
                </div>
                <h2 className="mt-0.5 truncate text-[11px] font-bold leading-snug sm:text-[13px]">{s.name}</h2>
                {s.handle ? <p className="truncate text-[10px] leading-snug text-muted">{s.handle}</p> : null}
                {s.blurb ? (
                  <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-muted sm:text-[11px]">{s.blurb}</p>
                ) : null}
                <div className="mt-auto pt-1.5">
                  {s.url ? (
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-join inline-flex w-full items-center justify-center rounded-md px-1.5 py-1 text-[9px] font-extrabold tracking-[0.1em] sm:text-[10px]"
                    >
                      FOLLOW
                    </a>
                  ) : (
                    <p className="text-[9px] leading-snug text-muted sm:text-[10px]">Super pastes the live URL in ops.</p>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

export function SocialsAdminPanel() {
  const [rows, setRows] = useState<SocialRow[]>([]);
  const [msg, setMsg] = useState("");
  const [id, setId] = useState("");
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [url, setUrl] = useState("");
  const [blurb, setBlurb] = useState("");
  const [thumb, setThumb] = useState("");
  const [followers, setFollowers] = useState("");

  const [tvTitle, setTvTitle] = useState(EMPTY_TV.title);
  const [tvBlurb, setTvBlurb] = useState(EMPTY_TV.blurb);
  const [tvUrl, setTvUrl] = useState("");
  const [tvLive, setTvLive] = useState(false);
  const [tvMsg, setTvMsg] = useState("");
  const [tvStatus, setTvStatus] = useState<TvLive>(EMPTY_TV);

  const load = () => {
    void listSocials()
      .then(setRows)
      .catch(() => undefined);
  };

  const loadTv = () => {
    void getTvLive()
      .then((t) => {
        setTvStatus(t);
        setTvTitle(t.title);
        setTvBlurb(t.blurb);
        setTvUrl(t.url || (t.youtubeId ? `https://www.youtube.com/watch?v=${t.youtubeId}` : ""));
        setTvLive(t.live);
      })
      .catch(() => undefined);
  };

  useEffect(load, []);
  useEffect(loadTv, []);

  const statusLabel = tvStatus.live && tvStatus.youtubeId
    ? "LIVE · video set"
    : tvStatus.youtubeId
      ? "Off · video set"
      : "Off · empty";

  return (
    <div className="md:col-span-2 raised space-y-3 rounded-xl p-3">
      <div>
        <div className="text-[11px] font-medium text-muted">Kilode TV</div>
        <h3 className="text-base font-bold">Socials on the TV page</h3>
        <p className="mt-1 text-xs text-muted">YouTube, TikTok, IG, X, Facebook, Telegram. FOLLOW opens the real URL.</p>
      </div>

      <div className="space-y-2 rounded-xl border border-lime-2/25 bg-panel/60 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-[13px] font-bold">Kilode TV · Live stream</h4>
          <span className="rounded-full border border-line px-2 py-0.5 text-[10px] font-semibold tracking-[0.06em] text-muted">
            {statusLabel}
          </span>
        </div>
        <p className="text-[11px] text-muted">
          Flagship box above the social grid. Leave the URL blank to show the offline placeholder. LIVE badge needs a video.
        </p>
        <form
          className="grid gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setTvMsg("");
            void saveTvLive({
              data: { title: tvTitle, blurb: tvBlurb, youtubeUrl: tvUrl, live: tvLive },
            }).then((r) => {
              if (!r.ok) setTvMsg(r.reason);
              else {
                setTvMsg("Stream saved");
                if (r.live) {
                  setTvStatus(r.live);
                  setTvLive(r.live.live);
                  setTvUrl(r.live.url || "");
                }
                loadTv();
              }
            });
          }}
        >
          <input
            value={tvTitle}
            onChange={(e) => setTvTitle(e.target.value)}
            placeholder="Title · Kilode TV Live"
            className="rounded-lg border border-line bg-bg px-2 py-2 text-base"
          />
          <input
            value={tvBlurb}
            onChange={(e) => setTvBlurb(e.target.value)}
            placeholder="Blurb · Live from the Kilode desk."
            className="rounded-lg border border-line bg-bg px-2 py-2 text-base"
          />
          <input
            value={tvUrl}
            onChange={(e) => setTvUrl(e.target.value)}
            placeholder="YouTube URL or 11-char id (blank = offline)"
            className="rounded-lg border border-line bg-bg px-2 py-2 text-base"
          />
          <label className="flex items-center gap-2 text-[12px] font-medium">
            <input
              type="checkbox"
              checked={tvLive}
              onChange={(e) => setTvLive(e.target.checked)}
              className="size-4 accent-[var(--color-lime-2)]"
            />
            On air (LIVE badge)
          </label>
          <button type="submit" className="btn-join rounded-lg py-2 text-[12px] font-bold">
            Save live stream
          </button>
        </form>
        {tvMsg ? <p className="text-[11px] text-lime-2">{tvMsg}</p> : null}
      </div>

      <form
        className="grid gap-2 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          void saveSocial({ data: { id: id || name.toLowerCase(), name, handle, url, blurb, thumb, followers, sort: rows.length + 1 } }).then((r) => {
            if (!r.ok) setMsg(r.reason);
            else {
              setMsg("Saved");
              setId("");
              setName("");
              setHandle("");
              setUrl("");
              setBlurb("");
              setThumb("");
              load();
            }
          });
        }}
      >
        <input value={id} onChange={(e) => setId(e.target.value)} placeholder="id · youtube" className="rounded-lg border border-line bg-bg px-2 py-2 text-base" />
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name · YouTube" className="rounded-lg border border-line bg-bg px-2 py-2 text-base" required />
        <input value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="@handle" className="rounded-lg border border-line bg-bg px-2 py-2 text-base" />
        <input value={followers} onChange={(e) => setFollowers(e.target.value)} placeholder="Badge · 12K" className="rounded-lg border border-line bg-bg px-2 py-2 text-base" />
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" className="rounded-lg border border-line bg-bg px-2 py-2 text-base sm:col-span-2" />
        <input value={thumb} onChange={(e) => setThumb(e.target.value)} placeholder="Preview image URL" className="rounded-lg border border-line bg-bg px-2 py-2 text-base sm:col-span-2" />
        <input value={blurb} onChange={(e) => setBlurb(e.target.value)} placeholder="One-line blurb" className="rounded-lg border border-line bg-bg px-2 py-2 text-base sm:col-span-2" />
        <button type="submit" className="btn-join rounded-lg py-2 text-[12px] font-bold sm:col-span-2">
          + Add / update
        </button>
      </form>
      {msg ? <p className="text-[11px] text-lime-2">{msg}</p> : null}
      <div className="space-y-2">
        {rows.map((s) => (
          <div key={s.id} className="flex items-center gap-2 rounded-xl border border-line bg-panel p-2">
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-semibold">{s.name}</div>
              <div className="truncate text-[10px] text-muted">{s.handle} · {s.url}</div>
            </div>
            <button
              type="button"
              className="text-[11px] text-danger"
              onClick={() => {
                if (!window.confirm("Remove this social?")) return;
                void deleteSocial({ data: { id: s.id } }).then(load);
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
