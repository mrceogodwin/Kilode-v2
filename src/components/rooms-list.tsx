import { useState } from "react";
import { X } from "lucide-react";
import { fmtCount, type Room } from "@/lib/qonvo-data";

const BLURB: Record<string, string> = {
  lounge: "Music · Talks · People",
  hot: "Politics · Society · Trends",
  ng: "News · Culture · Everyday life",
  music: "Afrobeats · Chill · Good vibes",
  cinema: "Movies · Reviews · Talk",
  jobs: "Opportunities · Career · Skills",
  sport: "Football · Basketball · More",
  tech: "Innovation · Startups · Business",
  "st-lagos": "Lagos",
  "st-fct": "Abuja",
  "st-rivers": "South-South",
  north: "Northern Pulse",
};

const TONE: Record<string, string> = {
  lounge: "#FACC15",
  hot: "#fb923c",
  ng: "#22c55e",
  music: "#e879f9",
  cinema: "#38bdf8",
  jobs: "#FACC15",
  sport: "#4ade80",
  tech: "#60a5fa",
};

const FILTERS = ["All", "Live", "Featured", "Places", "Following"] as const;

export function RoomList({
  query,
  setQuery,
  listed,
  roomId,
  pins = [],
  onOpen,
  onClose,
}: {
  query: string;
  setQuery: (v: string) => void;
  listed: Room[];
  roomId: string;
  pins?: string[];
  onOpen: (id: string) => void;
  onClose?: () => void;
}) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const liveNow = listed.filter((r) => (r.online || 0) > 0);
  const featured = listed.filter((r) => r.region === "Featured");
  const places = listed.filter((r) => r.region === "Places");
  const following = listed.filter((r) => pins.includes(r.id));
  const rows =
    filter === "Live" ? liveNow : filter === "Featured" ? featured : filter === "Places" ? places : filter === "Following" ? following : listed;

  function Row({ r, join }: { r: Room; join?: boolean }) {
    const tone = TONE[r.id] || "#FACC15";
    return (
      <button
        type="button"
        onClick={() => onOpen(r.id)}
        className={`flex w-full items-center gap-2 rounded-2xl border px-2.5 py-2 text-left ${r.id === roomId ? "border-[#FACC15]/70 bg-white/5" : "border-white/10 bg-transparent"}`}
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-full text-[12px] font-extrabold text-black" style={{ background: tone }}>
          {r.name.slice(0, 1)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-semibold">{r.name}</span>
          <span className="block truncate text-[10px] text-muted">{BLURB[r.id] || r.region}</span>
          {(r.online || 0) > 0 ? (
            <span className="mt-0.5 flex items-center gap-1 text-[10px] text-muted">
              <span className="live-dot" /> {fmtCount(r.online)} online
            </span>
          ) : null}
        </span>
        {join ? (
          <span className="shrink-0 rounded-full border border-[#FACC15] px-2.5 py-1 text-[11px] font-bold text-[#FACC15]">Join</span>
        ) : (
          <span className="text-muted">›</span>
        )}
      </button>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center gap-2 px-3 pt-3">
        <strong className="text-lg">Rooms</strong>
        <div className="ml-auto flex items-center gap-2">
          {onClose ? (
            <button type="button" className="grid size-8 place-items-center rounded-full border border-white/20" aria-label="Close rooms" onClick={onClose}>
              <X className="size-4" />
            </button>
          ) : null}
        </div>
      </div>
      <div className="flex shrink-0 gap-1.5 overflow-x-auto px-3 py-2">
        {FILTERS.map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => setFilter(name)}
            className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${filter === name ? "bg-[#FACC15] text-black" : "border border-white/15 text-fg"}`}
          >
            {name === "Live" ? "● Live" : name}
          </button>
        ))}
      </div>
      <div className="shrink-0 px-3 pb-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search rooms..."
          className="w-full rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[13px] outline-none"
          style={{ fontSize: 16 }}
        />
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 pb-4">
        {filter === "All" ? (
          <>
            <section>
              <div className="mb-1.5 flex items-center justify-between text-[10px] font-bold tracking-[0.14em] text-[#86efac]">
                <span>LIVE NOW</span>
              </div>
              {liveNow.length === 0 ? <p className="text-[11px] text-muted">Nobody is in a room right now.</p> : (
                <div className="space-y-1.5">{liveNow.map((r) => <Row key={r.id} r={r} join />)}</div>
              )}
            </section>
            <section>
              <div className="mb-1.5 text-[10px] font-bold tracking-[0.14em] text-[#86efac]">FEATURED ROOMS</div>
              <div className="space-y-1.5">{featured.map((r) => <Row key={r.id} r={r} />)}</div>
            </section>
            <section>
              <div className="mb-1.5 text-[10px] font-bold tracking-[0.14em] text-[#86efac]">PLACES</div>
              <div className="space-y-1.5">{places.map((r) => <Row key={r.id} r={r} />)}</div>
            </section>
          </>
        ) : (
          <div className="space-y-1.5">
            {rows.length === 0 ? <p className="text-[11px] text-muted">No rooms in this list.</p> : rows.map((r) => <Row key={r.id} r={r} join={filter === "Live"} />)}
          </div>
        )}
      </div>
    </div>
  );
}
