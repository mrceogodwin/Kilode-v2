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
import { kilodeSound } from "@/lib/sfx";

function thumb(id: string) {
  return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
}

export function CinemaPane() {
  const [sec, setSec] = useState<CinemaSection>("trending");
  const [items, setItems] = useState<CinemaMovie[]>([]);
  const [watching, setWatching] = useState<CinemaMovie | null>(null);
  const [signed, setSigned] = useState(false);
  const [msg, setMsg] = useState("");

  function load(section: CinemaSection = sec) {
    listCinema(section).then((r) => {
      if (r?.ok) setItems(r.items || []);
    }).catch(() => setItems([]));
  }

  useEffect(() => {
    load();
    // check auth lightly
  }, [sec]);

  return (
    <div className="cinema-live-card min-h-[70vh] p-3 text-[#F4F6FB]">
      <div className="flex gap-2 overflow-x-auto pb-2">
        {CINEMA_SECTIONS.map((s) => (
          <button
            key={s}
            type="button"
            className={`rounded-full px-3 py-1 text-[11px] font-semibold ${sec === s ? "bg-white text-[#0B0D12]" : "bg-white/10"}`}
            onClick={() => {
              kilodeSound("tick");
              setSec(s);
            }}
          >
            {s}
          </button>
        ))}
      </div>
      {watching ? (
        <CinemaPlayer title={watching.title} youtubeId={watching.youtubeId || watching.yt || ""} onClose={() => setWatching(null)} />
      ) : (
        <div className="grid grid-cols-2 gap-3 pt-2">
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
              <img src={thumb(m.youtubeId || m.yt || "")} alt="" className="aspect-video w-full rounded-xl object-cover transition group-active:scale-[1.03]" />
              <div className="mt-1 text-[12px] font-semibold leading-tight">{m.title}</div>
            </button>
          ))}
        </div>
      )}
      {msg && <p className="mt-2 text-[11px] opacity-70">{msg}</p>}
    </div>
  );
}

function CinemaPlayer({ title, youtubeId, onClose }: { title: string; youtubeId: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black" onClick={() => kilodeSound("tick")}>
      <div className="flex items-center justify-between p-3">
        <button type="button" className="text-white text-sm" onClick={onClose}>Close</button>
        <span className="text-white text-sm font-semibold truncate max-w-[70%]">{title}</span>
        <span />
      </div>
      <div className="flex-1">
        <iframe
          title={title}
          src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1`}
          className="h-full w-full"
          allow="autoplay; encrypted-media"
          allowFullScreen
        />
      </div>
    </div>
  );
}

export function CinemaAdminPanel() {
  return <div className="p-4 text-sm">Cinema admin</div>;
}
