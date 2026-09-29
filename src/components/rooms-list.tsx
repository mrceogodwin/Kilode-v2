import { useState } from "react";
import { Briefcase, Clapperboard, Cpu, Flame, MapPin, MessageCircle, Music, Trophy, X, type LucideIcon } from "lucide-react";
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

const ICON: Record<string, LucideIcon> = {
  lounge: MessageCircle,
  hot: Flame,
  ng: MapPin,
  music: Music,
  cinema: Clapperboard,
  jobs: Briefcase,
  sport: Trophy,
  tech: Cpu,
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
    const Icon = ICON[r.id] || MapPin;
    return (
      <button type="button" onClick={() => onOpen(r.id)} className={`room-row ${r.id === roomId ? "on" : ""}`}>
        <span className="room-ico" aria-hidden>
          <Icon className="size-3.5" strokeWidth={1.75} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-semibold leading-tight">{r.name}</span>
          <span className="block truncate text-[10px] text-muted">{BLURB[r.id] || r.region}</span>
          {(r.online || 0) > 0 ? (
            <span className="mt-0.5 flex items-center gap-1 text-[10px] text-muted">
              <span className="live-dot" /> {fmtCount(r.online)} online
            </span>
          ) : null}
        </span>
        {join ? <span className="room-join">Join</span> : <span className="text-[12px] text-muted">›</span>}
      </button>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center gap-2 px-3 pt-2.5">
        <strong className="text-[15px]">Rooms</strong>
        {onClose ? (
          <button type="button" className="ml-auto grid size-7 place-items-center rounded-full border border-white/10" aria-label="Close rooms" onClick={onClose}>
            <X className="size-3.5" />
          </button>
        ) : null}
      </div>
      <div className="flex shrink-0 gap-1 overflow-x-auto px-3 py-2">
        {FILTERS.map((name) => (
          <button key={name} type="button" onClick={() => setFilter(name)} className={`soc-chip shrink-0 px-2.5 py-0.5 text-[11px] ${filter === name ? "on" : ""}`}>
            {name === "Live" ? "Live" : name}
          </button>
        ))}
      </div>
      <div className="shrink-0 px-3 pb-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search rooms..."
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[13px] outline-none"
          style={{ fontSize: 16 }}
        />
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 pb-4">
        {filter === "All" ? (
          <>
            <section>
              <div className="mb-1 text-[10px] font-bold tracking-[0.14em] text-muted">LIVE NOW</div>
              {liveNow.length === 0 ? <p className="text-[11px] text-muted">Nobody is in a room right now.</p> : (
                <div className="space-y-1">{liveNow.map((r) => <Row key={r.id} r={r} join />)}</div>
              )}
            </section>
            <section>
              <div className="mb-1 text-[10px] font-bold tracking-[0.14em] text-muted">FEATURED ROOMS</div>
              <div className="space-y-1">{featured.map((r) => <Row key={r.id} r={r} />)}</div>
            </section>
            <section>
              <div className="mb-1 text-[10px] font-bold tracking-[0.14em] text-muted">PLACES</div>
              <div className="space-y-1">{places.map((r) => <Row key={r.id} r={r} />)}</div>
            </section>
          </>
        ) : (
          <div className="space-y-1">
            {rows.length === 0 ? <p className="text-[11px] text-muted">No rooms in this list.</p> : rows.map((r) => <Row key={r.id} r={r} join={filter === "Live"} />)}
          </div>
        )}
      </div>
    </div>
  );
}
