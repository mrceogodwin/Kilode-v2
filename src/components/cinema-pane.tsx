import { useEffect, useState } from "react";
import {
  CINEMA_SECTIONS,
  listCinema,
  type CinemaMovie,
  type CinemaSection,
} from "@/lib/cinema-server";
import { kilodeSound } from "@/lib/sfx";

function thumb(id: string) {
  if (!id) return "";
  return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
}

export function CinemaPane() {
  const [sec, setSec] = useState<CinemaSection>("trending");
  const [items, setItems] = useState<CinemaMovie[]>([]);
  const [watching, setWatching] = useState<CinemaMovie | null>(null);
  const [hero, setHero] = useState<CinemaMovie | null>(null);

  useEffect(() => {
    listCinema({ data: { section: sec } })
      .then((r: any) => {
        const movies = r?.movies || r?.items || [];
        setItems(Array.isArray(movies) ? movies : []);
        setHero(r?.watching || movies[0] || null);
      })
      .catch(() => {
        setItems([]);
        setHero(null);
      });
  }, [sec]);

  if (watching) {
    return (
      <CinemaPlayer
        title={watching.title}
        youtubeId={watching.youtube_id}
        onClose={() => {
          kilodeSound("tick");
          setWatching(null);
        }}
      />
    );
  }

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

      {hero && (
        <button
          type="button"
          className="group relative mb-4 block w-full overflow-hidden rounded-2xl text-left"
          onClick={() => {
            kilodeSound("tick");
            setWatching(hero);
          }}
        >
          <img
            src={thumb(hero.youtube_id)}
            alt=""
            className="aspect-video w-full object-cover transition duration-220 group-active:scale-[1.02]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <div className="absolute bottom-3 left-3 right-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-white/70">Now watching</div>
            <div className="text-[15px] font-bold leading-tight text-white">{hero.title}</div>
          </div>
        </button>
      )}

      <div className="grid grid-cols-2 gap-3">
        {items.map((m) => (
          <button
            key={m.id}
            type="button"
            className="group text-left"
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
            <div className="mt-0.5 text-[10px] text-white/50">{m.votes || 0} votes · {m.section}</div>
          </button>
        ))}
      </div>

      {items.length === 0 && (
        <p className="py-12 text-center text-[13px] text-white/50">No titles in this section yet.</p>
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
  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-[#0B0D12]">
      <div className="flex items-center gap-3 px-3 py-2.5">
        <button
          type="button"
          className="rounded-full bg-white/10 px-3 py-1.5 text-[12px] font-semibold text-white"
          onClick={onClose}
        >
          Close
        </button>
        <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-white">{title}</span>
      </div>
      <div className="relative flex-1 bg-black" onClick={() => kilodeSound("tick")}>
        {youtubeId ? (
          <iframe
            title={title}
            src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0`}
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
