import { ROOM_SECTION_ORDER, fmtCount, type Room } from "@/lib/qonvo-data";

export function RoomList({
  query,
  setQuery,
  listed,
  roomId,
  onOpen,
}: {
  query: string;
  setQuery: (v: string) => void;
  listed: Room[];
  roomId: string;
  onOpen: (id: string) => void;
}) {
  const sections = ROOM_SECTION_ORDER.map((sec) => ({
    sec,
    rows: listed.filter((r) => r.region === sec),
  })).filter((s) => s.rows.length);
  return (
    <>
      <div className="shrink-0 border-b border-white/5 p-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search rooms"
          className="w-full rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 text-base outline-none"
        />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {sections.map(({ sec, rows }) => (
          <section key={sec} className="border-b border-white/5 pb-1">
            <div className="sticky top-0 z-[1] bg-panel px-3 py-1.5 text-[9px] font-medium tracking-[0.16em] text-lime-2">{sec.toUpperCase()}</div>
            {rows.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => onOpen(r.id)}
                className={`flex w-full items-center justify-between border-l-2 px-3 py-2 text-left ${
                  r.id === roomId ? "border-lime-2 bg-panel-2" : "border-transparent hover:bg-panel-2"
                }`}
              >
                <span>
                  <span className="block text-xs font-semibold">{r.name}</span>
                  <span className="text-[10px] text-muted">{fmtCount(r.online)} · {r.region}</span>
                </span>
              </button>
            ))}
          </section>
        ))}
        {listed.length === 0 ? <p className="px-3 py-4 text-[11px] text-muted">No rooms match.</p> : null}
      </div>
    </>
  );
}
