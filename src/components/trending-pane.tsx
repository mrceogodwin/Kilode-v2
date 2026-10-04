import { useMemo, useState } from "react";
import { ChevronRight, Music2, Zap } from "lucide-react";
import { ROOMS, fmtCount, type Post } from "@/lib/qonvo-data";
import type { useQonvo } from "@/lib/use-qonvo";

const PILLS = ["All", "News", "Naija", "Music", "Sports", "Jobs", "Tech", "Cinema", "Places"] as const;

type Store = ReturnType<typeof useQonvo>;

function heat(p: Post) {
  return (p.views ?? 0) + (p.comments?.length ?? 0) * 3;
}

function matches(pill: (typeof PILLS)[number], p: Post) {
  if (pill === "All") return true;
  const blob = `${p.category || ""} ${p.tags || ""} ${p.title || ""}`.toLowerCase();
  if (pill === "News") return /news|politics|world/.test(blob);
  if (pill === "Naija") return /naija|nigeria|lagos|abuja/.test(blob);
  if (pill === "Music") return /music|afrobeats/.test(blob);
  if (pill === "Sports") return /sport/.test(blob);
  if (pill === "Jobs") return /job|career|hire/.test(blob);
  if (pill === "Tech") return /tech|business|biz/.test(blob);
  if (pill === "Cinema") return /cinema|film|nollywood|movie/.test(blob);
  if (pill === "Places") return /lagos|abuja|port harcourt|ibadan|enugu|kano/.test(blob);
  return true;
}

export function TrendingPane({ store, onHome }: { store: Store; onHome: (id?: string) => void }) {
  const [pill, setPill] = useState<(typeof PILLS)[number]>("All");
  const posts = store.posts.filter((p) => p?.id && p.status !== "draft");
  const ranked = useMemo(
    () => posts.filter((p) => matches(pill, p)).sort((a, b) => heat(b) - heat(a) || b.ts - a.ts),
    [posts, pill],
  );
  const lead = ranked[0];
  const rest = ranked.slice(1, 12);
  const tracks = store.tracks.filter((t) => t?.title).slice(0, 4);
  const rooms = ROOMS.filter((r) => {
    if (pill === "Places") return r.region === "Places";
    if (pill === "All") return r.region === "Featured";
    return r.name.toLowerCase().includes(pill.toLowerCase());
  }).slice(0, 6);

  return (
    <div className="buzz-page mx-auto max-w-3xl px-3 pt-3 pb-24">
      <div className="buzz-mast">
        <div className="buzz-bolt" aria-hidden>
          <Zap className="size-5" />
        </div>
        <div>
          <h1>BUZZ</h1>
          <p>What Kilode is on right now. One lead story, then the line.</p>
        </div>
      </div>

      <div className="lane-rail mt-3" role="tablist">
        {PILLS.map((p) => (
          <button key={p} type="button" className={`lane-chip ${pill === p ? "on" : ""}`} onClick={() => setPill(p)}>
            {p}
          </button>
        ))}
      </div>

      {lead ? (
        <button type="button" className="buzz-hero" onClick={() => store.setOpenPost(lead.id)}>
          {lead.image ? <img src={lead.image} alt="" /> : <span className="buzz-hero-fallback">{(lead.category || "K").slice(0, 1)}</span>}
          <span className="buzz-hero-copy">
            <span className="buzz-kicker">01 · {lead.category || "Kilode"} · {fmtCount(lead.views ?? 0)} views</span>
            <strong>{lead.title}</strong>
            <span className="buzz-open">Open</span>
          </span>
        </button>
      ) : (
        <p className="mt-4 text-[13px] text-muted">Nothing in this lane yet.</p>
      )}

      {rest.length > 0 ? (
        <ol className="buzz-list">
          {rest.map((p, i) => (
            <li key={p.id}>
              <button type="button" onClick={() => store.setOpenPost(p.id)}>
                <span>{String(i + 2).padStart(2, "0")}</span>
                <span>
                  <strong>{p.title}</strong>
                  <em>{p.category || "Kilode"} · {fmtCount(p.views ?? 0)}</em>
                </span>
                <ChevronRight className="size-4" />
              </button>
            </li>
          ))}
        </ol>
      ) : null}

      {pill === "All" || pill === "Music" ? (
        <div className="buzz-side">
          <div className="buzz-side-kicker"><Music2 className="size-3.5" /> Tracks</div>
          {tracks.length === 0 ? <p className="text-[12px] text-muted">No tracks yet.</p> : null}
          {tracks.map((t) => (
            <a key={t.id || t.title} href={t.url || "#"} target="_blank" rel="noreferrer">
              {t.title}
              <em>{t.artist}</em>
            </a>
          ))}
        </div>
      ) : null}

      {rooms.length > 0 ? (
        <div className="buzz-rooms">
          {rooms.map((r) => (
            <button key={r.id} type="button" onClick={() => onHome(r.id)}>
              {r.name}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
