import { useEffect, useRef, useState } from "react";
import {
  CINEMA_SECTIONS,
  fetchCinemaCatalog,
  getCinemaExtra,
  listCinema,
  listCinemaQueue,
  rateMovie,
  saveCinemaQuiz,
  setMovieStatus,
  submitMovie,
  voteMovie,
  type CinemaMovie,
  type CinemaQuiz,
  type CinemaSection,
} from "@/lib/cinema-server";
import { Check, Film, HelpCircle, Play, Send, Star, X } from "lucide-react";
import { kilodeSound } from "@/lib/sfx";
import { listMsgs, saveMsg, getProfile, pingPresence } from "@/lib/forum-server";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { timeLabel, type AccountKind, type ChatMsg } from "@/lib/qonvo-data";
import { canKind } from "@/lib/permissions";
import { HandleLink } from "@/components/handle-link";
import { ThreadTranslateBar, TranslatedLine } from "@/components/translate-btn";
import { AdSlot } from "@/components/ad-slot";
import { DeskPayBox } from "@/components/pay-checkout";
import {
  ACTIVITY_EVENTS,
  CINEMA_POLL_ACTIVE_MS,
  CINEMA_POLL_IDLE_MS,
  pollDelayMs,
} from "@/lib/adaptive-poll";

function thumb(id: string) {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

export function CinemaPane() {
  const session = useCurrentUserState();
  const [sec, setSec] = useState<CinemaSection>("watching");
  const [watching, setWatching] = useState<CinemaMovie | null>(null);
  const [movies, setMovies] = useState<CinemaMovie[]>([]);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [payFor, setPayFor] = useState<{ id: string; usd: number } | null>(null);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [submitSec, setSubmitSec] = useState<"nigerian" | "global" | "coming">("nigerian");
  const [shown, setShown] = useState(8);
  const [kind, setKind] = useState<AccountKind>("member");

  function load(section: CinemaSection = sec) {
    void listCinema({ data: { section } })
      .then((r) => {
        const real = (r.movies || []).filter((m) => !String(m.id).startsWith("seed-"));
        setMovies(real);
        const w = r.watching && !String(r.watching.id).startsWith("seed-") ? r.watching : real.find((m) => m.watching) || real[0] || null;
        setWatching(null);
        // keep discovery; player is separate
      })
      .catch((e) => setErr(e instanceof Error ? e.message : "Could not load Cinema"));
  }

  useEffect(() => {
    load(sec);
  }, [sec]);

  useEffect(() => {
    if (session.user) {
      void getProfile().then((p) => {
        if (p?.kind) setKind(p.kind as AccountKind);
      }).catch(() => undefined);
    }
  }, [session.user]);

  const list = movies.slice(0, shown);

  return (
    <div className="cinema-live-card min-h-[70vh] p-3 text-[#F4F6FB]">
      <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
        {CINEMA_SECTIONS.map((s) => (
          <button
            key={s}
            type="button"
            className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold capitalize transition ${sec === s ? "bg-white text-[#0B0D12]" : "bg-white/10 text-white/80"}`}
            onClick={() => {
              kilodeSound("tick");
              setSec(s);
            }}
          >
            {s}
          </button>
        ))}
      </div>

      {err ? <p className="mb-2 text-[12px] text-red-300">{err}</p> : null}
      {msg ? <p className="mb-2 text-[12px] text-emerald-300">{msg}</p> : null}

      {list.length > 0 && (
        <button
          type="button"
          className="group relative mb-4 block w-full overflow-hidden rounded-2xl text-left"
          onClick={() => {
            kilodeSound("tick");
            setWatching(list[0]);
          }}
        >
          <img src={thumb(list[0].youtube_id)} alt="" className="aspect-video w-full object-cover transition duration-220 group-active:scale-[1.02]" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <div className="absolute bottom-3 left-3 right-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-white/70">Featured</div>
            <div className="text-[15px] font-bold leading-tight text-white">{list[0].title}</div>
          </div>
        </button>
      )}

      <div className="grid grid-cols-2 gap-3">
        {list.map((m) => (
          <button
            key={m.id}
            type="button"
            className="group text-left"
            onClick={() => {
              kilodeSound("tick");
              setWatching(m);
            }}
          >
            <img src={thumb(m.youtube_id)} alt="" className="aspect-video w-full rounded-xl object-cover transition duration-220 group-active:scale-[1.03]" />
            <div className="mt-1.5 line-clamp-2 text-[12px] font-semibold leading-tight text-white/95">{m.title}</div>
            <div className="mt-0.5 text-[10px] text-white/50">{m.votes || 0} votes · {m.section}</div>
          </button>
        ))}
      </div>

      {movies.length > shown && (
        <button type="button" className="mt-3 w-full rounded-full bg-white/10 py-2 text-[12px] font-semibold" onClick={() => setShown((n) => n + 8)}>
          Show more
        </button>
      )}

      {list.length === 0 && !err && (
        <p className="py-12 text-center text-[13px] text-white/50">No titles in this section yet.</p>
      )}

      {watching && (
        <CinemaPlayer
          title={watching.title}
          youtubeId={watching.youtube_id}
          onClose={() => {
            kilodeSound("tick");
            setWatching(null);
          }}
        />
      )}
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
      <div className="relative flex-1 bg-black" onClick={() => kilodeSound("tick")}>
        {id ? (
          <iframe
            title={title}
            src={`https://www.youtube-nocookie.com/embed/${id}?rel=0&autoplay=1`}
            className="absolute inset-0 h-full w-full"
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <div className="flex h-full items-center justify-center text-white/60 text-sm">No trailer</div>
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
