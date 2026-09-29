import { useMemo, useState, type ReactNode } from "react";
import { ChevronRight, Flame, Music2, Radio } from "lucide-react";
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
  const tracks = store.tracks.filter((t) => t?.title).slice(0, 6);
  const rooms = ROOMS.filter((r) => {
    if (pill === "Places") return r.region === "Places";
    if (pill === "All") return r.region === "Featured";
    return r.name.toLowerCase().includes(pill.toLowerCase());
  }).slice(0, 8);

  return (
    <div className="trend-page mx-auto max-w-3xl px-3 pt-2 pb-24">
      <button type="button" className="text-[12px] text-muted" onClick={() => onHome()}>
        ← Back
      </button>
      <h1 className="mt-1 flex items-center gap-2 text-[28px] font-extrabold tracking-tight">
        Trending <Flame className="size-5 text-[#c4a35a]" />
      </h1>
      <p className="text-[13px] text-muted">Highest views and the most opened stories, music, and rooms. Tap one to open it.</p>

      <div className="lane-rail mt-3" role="tablist">
        {PILLS.map((p) => (
          <button key={p} type="button" className={`lane-chip ${pill === p ? "on" : ""}`} onClick={() => setPill(p)}>
            {p}
          </button>
        ))}
      </div>

      <Section title="Most seen" icon={<Flame className="size-3.5 text-[#c4a35a]" />}>
        {ranked.length === 0 ? <p className="text-[12px] text-muted">Nothing in this lane yet.</p> : null}
        {ranked.slice(0, 12).map((p, i) => (
          <button key={p.id} type="button" className="trend-row" onClick={() => store.setOpenPost(p.id)}>
            <span className="w-6 text-[11px] font-bold text-muted">{String(i + 1).padStart(2, "0")}</span>
            {p.image ? <img src={p.image} alt="" className="size-12 rounded-xl object-cover" /> : <span className="grid size-12 place-items-center rounded-xl bg-white/5 text-[10px]">{(p.category || "K").slice(0, 2)}</span>}
            <span className="min-w-0 flex-1 text-left">
              <span className="block truncate text-[13px] font-bold">{p.title}</span>
              <span className="text-[11px] text-muted">{p.category || "Kilode"} · {fmtCount(p.views ?? 0)} views</span>
            </span>
          </button>
        ))}
      </Section>

      {pill === "All" || pill === "Music" ? (
        <Section title="Music" icon={<Music2 className="size-3.5" />}>
          {tracks.length === 0 ? <p className="text-[12px] text-muted">No tracks yet.</p> : null}
          {tracks.map((t, i) => (
            <a key={t.id || t.title} href={t.url || "#"} target="_blank" rel="noreferrer" className="trend-row">
              <span className="w-6 text-[11px] font-bold text-muted">{String(i + 1).padStart(2, "0")}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-bold">{t.title}</span>
                <span className="text-[11px] text-muted">{t.artist}</span>
              </span>
              <ChevronRight className="size-4 text-muted" />
            </a>
          ))}
        </Section>
      ) : null}

      <Section title="Rooms" icon={<Radio className="size-3.5" />}>
        <div className="grid grid-cols-2 gap-2">
          {rooms.map((r) => (
            <button key={r.id} type="button" className="trend-card text-left" onClick={() => onHome(r.id)}>
              <div className="truncate font-bold">{r.name}</div>
              <div className="text-[11px] text-muted">{r.region}</div>
            </button>
          ))}
        </div>
      </Section>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section className="mt-4">
      <div className="mb-2 flex items-center gap-1.5 text-[11px] font-extrabold tracking-[0.12em] uppercase">
        {icon}
        {title}
      </div>
      {children}
    </section>
  );
}
