import { useEffect, useRef, useState } from "react";
import { Eye, MessageSquare } from "lucide-react";
import { fmtCount, type Campaign, type Post } from "@/lib/qonvo-data";

function isDupExcerpt(title: string, excerpt?: string) {
  if (!excerpt) return true;
  const a = title.trim().toLowerCase();
  const b = excerpt.trim().toLowerCase().replace(/[.…]+$/g, "").trim();
  if (!b) return true;
  if (a === b) return true;
  if (a.startsWith(b) || b.startsWith(a.slice(0, Math.min(40, a.length)))) return true;
  return false;
}

export { isDupExcerpt };

type RailItem =
  | { k: "post"; post: Post }
  | { k: "ad"; ad: Campaign };

function scrollTrack(el: HTMLDivElement | null, index: number) {
  if (!el) return;
  const card = el.children[index] as HTMLElement | undefined;
  if (!card) return;
  el.scrollTo({ left: card.offsetLeft, behavior: "smooth" });
}

export function TrendingRail({
  posts,
  ads,
  exclude,
  onOpen,
}: {
  posts: Post[];
  ads: Campaign[];
  exclude: string;
  onOpen: (id: string) => void;
}) {
  const track = useRef<HTMLDivElement>(null);
  const hover = useRef(false);
  const [i, setI] = useState(0);
  const ranked = [...posts]
    .filter((p) => p.id !== exclude && p.status !== "draft")
    .sort((a, b) => (b.views ?? 0) - (a.views ?? 0))
    .slice(0, 16);
  const liveAds = ads.filter((a) => a.status === "approved").slice(0, 8);
  const items: RailItem[] = [];
  ranked.forEach((p, n) => {
    items.push({ k: "post", post: p });
    if ((n + 1) % 2 === 0 && liveAds.length) items.push({ k: "ad", ad: liveAds[Math.floor(n / 2) % liveAds.length] });
  });
  const list = items.slice(0, 20);
  useEffect(() => {
    if (list.length < 2) return;
    const t = window.setInterval(() => {
      if (hover.current) return;
      setI((n) => {
        const next = (n + 1) % list.length;
        scrollTrack(track.current, next);
        return next;
      });
    }, 3800);
    return () => window.clearInterval(t);
  }, [list.length]);
  if (!list.length) return null;
  return (
    <div className="mt-3">
      <div className="mb-1 flex items-center justify-between px-0.5">
        <div className="text-[9px] font-medium tracking-[0.16em] text-lime-2">TRENDING · ADS</div>
        <div className="flex gap-1">
          <button type="button" className="grid size-5 place-items-center rounded border border-line text-[10px]" onClick={() => {
            const next = (i - 1 + list.length) % list.length;
            setI(next);
            scrollTrack(track.current, next);
          }}>‹</button>
          <button type="button" className="grid size-5 place-items-center rounded border border-line text-[10px]" onClick={() => {
            const next = (i + 1) % list.length;
            setI(next);
            scrollTrack(track.current, next);
          }}>›</button>
        </div>
      </div>
      <div
        ref={track}
        className="rail-track rail-flat"
        onPointerEnter={() => { hover.current = true; }}
        onPointerLeave={() => { hover.current = false; }}
        onTouchStart={() => { hover.current = true; }}
      >
        {list.map((it, n) =>
          it.k === "post" ? (
            <button key={it.post.id} type="button" className="rail-card overflow-hidden rounded-lg border border-line bg-panel text-left" onClick={() => onOpen(it.post.id)}>
              {it.post.image ? <img src={it.post.image} alt="" className="h-14 w-full object-cover" /> : <div className="h-14 bg-panel-3" />}
              <div className="px-1.5 py-1">
                <div className="text-[8px] font-medium text-lime-2">{it.post.category || "General"}</div>
                <div className="mt-px line-clamp-2 text-[11px] font-normal leading-snug">{it.post.title}</div>
              </div>
            </button>
          ) : (
            <a
              key={it.ad.id + n}
              href={it.ad.link || "#"}
              target={it.ad.link ? "_blank" : undefined}
              rel="noreferrer"
              className="rail-card overflow-hidden rounded-lg border border-line bg-panel"
            >
              {it.ad.image ? <img src={it.ad.image} alt="" className="h-14 w-full object-cover" /> : <div className="grid h-14 place-items-center bg-panel-3 text-[9px] text-lime-2">AD</div>}
              <div className="px-1.5 py-1">
                <div className="text-[8px] font-medium tracking-[0.14em] text-muted">AD</div>
                <div className="mt-px line-clamp-2 text-[11px] font-normal leading-snug">{it.ad.name}</div>
              </div>
            </a>
          ),
        )}
      </div>
    </div>
  );
}

export function RelatedGrid({ posts, exclude, category, onOpen }: { posts: Post[]; exclude: string; category?: string; onOpen: (id: string) => void }) {
  const related = posts.filter((p) => p.id !== exclude && p.status !== "draft" && (!category || p.category === category)).slice(0, 8);
  const extra = related.length < 8 ? posts.filter((p) => p.id !== exclude && !related.includes(p)).slice(0, 8 - related.length) : [];
  const list = [...related, ...extra].slice(0, 8);
  if (!list.length) return null;
  return (
    <div className="mt-8">
      <div className="mb-2 text-[10px] font-medium tracking-[0.16em] text-lime-2">RELATED</div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {list.map((p) => (
          <button key={p.id} type="button" className="raised overflow-hidden rounded-xl text-left" onClick={() => onOpen(p.id)}>
            {p.image ? <img src={p.image} alt="" className="aspect-[16/10] w-full object-cover" /> : <div className="aspect-[16/10] bg-panel-3" />}
            <div className="p-1.5">
              <div className="text-[9px] text-lime-2">{p.category || "General"}</div>
              <div className="mt-0.5 line-clamp-3 text-[11px] font-normal leading-snug">{p.title}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

export function TopTen({ posts, exclude, onOpen }: { posts: Post[]; exclude: string; onOpen: (id: string) => void }) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const day = posts.filter((p) => p.id !== exclude && p.ts >= start.getTime());
  const pool = (day.length >= 4 ? day : posts.filter((p) => p.id !== exclude)).sort((a, b) => (b.views ?? 0) - (a.views ?? 0)).slice(0, 10);
  if (!pool.length) return null;
  return (
    <div className="mt-8">
      <div className="mb-2 text-[10px] font-medium tracking-[0.16em] text-lime-2">TOP 10 TODAY</div>
      <ol className="space-y-1.5">
        {pool.map((p, i) => (
          <li key={p.id}>
            <button type="button" className="raised flex w-full items-center gap-2 rounded-xl p-1.5 text-left" onClick={() => onOpen(p.id)}>
              <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-lime-2/15 text-[11px] font-extrabold text-lime-2">{i + 1}</span>
              {p.image ? <img src={p.image} alt="" className="h-10 w-12 shrink-0 rounded-md object-cover" /> : <div className="h-10 w-12 shrink-0 rounded-md bg-panel-3" />}
              <span className="min-w-0 flex-1">
                <span className="line-clamp-2 text-[12px] font-normal leading-snug">{p.title}</span>
                <span className="mt-0.5 flex items-center gap-2 text-[9px] text-muted">
                  <span className="inline-flex items-center gap-0.5"><Eye className="size-2.5" />{fmtCount(p.views ?? 0)}</span>
                  <span className="inline-flex items-center gap-0.5"><MessageSquare className="size-2.5" />{p.comments?.length ?? 0}</span>
                </span>
              </span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
