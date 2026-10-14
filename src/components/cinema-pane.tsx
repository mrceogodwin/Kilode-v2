import { useEffect, useState } from "react";
import {
  CINEMA_SECTIONS,
  listCinema,
  voteMovie,
  type CinemaMovie,
  type CinemaSection,
} from "@/lib/cinema-server";
import { Film, Play } from "lucide-react";
import { kilodeSound } from "@/lib/sfx";
import { getProfile } from "@/lib/forum-server";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import type { AccountKind } from "@/lib/qonvo-data";

function thumb(id: string) {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

export function CinemaPane() {
  const session = useCurrentUserState();
  const [sec, setSec] = useState<CinemaSection>("watching");
  const [watching, setWatching] = useState<CinemaMovie | null>(null);
  const [movies, setMovies] = useState<CinemaMovie[]>([]);
  const [err, setErr] = useState("");
  const [shown, setShown] = useState(10);
  const [kind, setKind] = useState<AccountKind>("member");
  const [voted, setVoted] = useState<Record<string, boolean>>({});

  function load(section: CinemaSection = sec) {
    void listCinema({ data: { section } })
      .then((r) => {
        const real = (r.movies || []).filter((m) => !String(m.id).startsWith("seed-"));
        setMovies(real);
      })
      .catch((e) => setErr(e instanceof Error ? e.message : "Could not load Cinema"));
  }

  useEffect(() => {
    load(sec);
  }, [sec]);

  useEffect(() => {
    if (session.user) {
      void getProfile()
        .then((p) => {
          if (p?.kind) setKind(p.kind as AccountKind);
        })
        .catch(() => undefined);
    }
  }, [session.user]);

  const list = movies.slice(0, shown);

  const onVote = async (m: CinemaMovie) => {
    if (!session.user) {
      window.location.href = "/login?mode=up";
      return;
    }
    setVoted((v) => ({ ...v, [m.id]: true }));
    try {
      await voteMovie({ data: { id: m.id } } as any);
      kilodeSound("tick");
      load(sec);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="cinema-live-card min-h-[70vh] p-3 text-[#F4F6FB]" style={{ background: "#0B0D12" }}>
      <div className="mb-1 flex items-center gap-2">
        <Film size={16} className="text-white/70" />
        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/50">Kilode Cinema</span>
      </div>
      <p className="mb-3 text-[12px] leading-snug text-white/55">Watch trailers. Vote what plays next. Nollywood + global.</p>

      <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
        {CINEMA_SECTIONS.map((s) => (
          <button
            key={s}
            type="button"
            className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold capitalize transition ${
              sec === s ? "bg-white text-[#0B0D12]" : "bg-white/10 text-white/80"
            }`}
            onClick={() => {
              kilodeSound("tick");
              setSec(s);
              setShown(10);
            }}
          >
            {s}
          </button>
        ))}
      </div>

      {err ? <p className="mb-2 text-[12px] text-red-300">{err}</p> : null}

      {list.length > 0 ? (
        <button
          type="button"
          className="group relative mb-4 block w-full overflow-hidden rounded-2xl text-left"
          onClick={() => {
            kilodeSound("tick");
            setWatching(list[0]);
          }}
        >
          <img
            src={thumb(list[0].youtube_id)}
            alt=""
            className="aspect-video w-full object-cover transition duration-220 group-active:scale-[1.02]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
          <div className="absolute bottom-3 left-3 right-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-white/70">Now featured</div>
            <div className="text-[16px] font-bold leading-tight text-white">{list[0].title}</div>
            <div className="mt-1 text-[11px] text-white/60">{list[0].votes || 0} votes · Tap to play</div>
          </div>
          <span className="absolute left-1/2 top-1/2 flex size-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/20 backdrop-blur">
            <Play className="size-7 fill-white text-white" />
          </span>
        </button>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        {list.map((m) => (
          <div key={m.id} className="text-left">
            <button
              type="button"
              className="group w-full text-left"
              onClick={() => {
                kilodeSound("tick");
                setWatching(m);
              }}
            >
              <img
                src={thumb(m.youtube_id)}
                alt=""
                className="aspect-video w-full rounded-xl object-cover transition duration-220 group-active:scale-[1.03]"
              />
              <div className="mt-1.5 line-clamp-2 text-[12px] font-semibold leading-tight text-white/95">{m.title}</div>
            </button>
            <div className="mt-1 flex items-center justify-between gap-2">
              <span className="text-[10px] text-white/45">{m.votes || 0} votes</span>
              <button
                type="button"
                onClick={() => onVote(m)}
                disabled={voted[m.id]}
                className="rounded-full px-2.5 py-1 text-[10px] font-bold"
                style={{
                  background: voted[m.id] ? "rgba(24,119,242,0.35)" : "rgba(255,255,255,0.12)",
                  color: "#fff",
                  border: 0,
                }}
              >
                {voted[m.id] ? "Voted" : "Vote"}
              </button>
            </div>
          </div>
        ))}
      </div>

      {movies.length > shown ? (
        <button
          type="button"
          className="mt-3 w-full rounded-full bg-white/10 py-2 text-[12px] font-semibold"
          onClick={() => setShown((n) => n + 8)}
        >
          Show more
        </button>
      ) : null}

      {list.length === 0 && !err ? (
        <div className="py-16 text-center">
          <Film className="mx-auto mb-3 size-10 text-white/25" />
          <p className="text-[14px] font-semibold text-white/80">No titles in {sec} yet</p>
          <p className="mt-1 text-[12px] text-white/45">Cinema posters submit YouTube trailers. Staff approve.</p>
        </div>
      ) : null}

      {watching ? (
        <CinemaPlayer
          title={watching.title}
          youtubeId={watching.youtube_id}
          onClose={() => {
            kilodeSound("tick");
            setWatching(null);
          }}
        />
      ) : null}
    </div>
  );
}

function CinemaPlayer({
  title,
  youtubeId,
  onClose,
}: {
  title: string;
  youtubeId: string;
  onClose: () => void;
}) {
  const id = (youtubeId || "").trim();
  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-[#0B0D12]">
      <div className="flex items-center gap-3 px-3 py-2.5">
        <button type="button" className="rounded-full bg-white/10 px-3 py-1.5 text-[12px] font-semibold text-white" onClick={onClose}>
          Close
        </button>
        <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-white">{title}</span>
      </div>
      <div className="relative flex-1 bg-black">
        {id ? (
          <iframe
            title={title}
            src={`https://www.youtube-nocookie.com/embed/${id}?rel=0&autoplay=1`}
            className="absolute inset-0 h-full w-full"
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-white/60">No trailer</div>
        )}
      </div>
    </div>
  );
}

export function CinemaAdminPanel() {
  return (
    <div className="rounded-xl border border-white/10 bg-[#12151C] p-4 text-[13px] text-white/80">
      Cinema admin tools live in /ops.
    </div>
  );
}
