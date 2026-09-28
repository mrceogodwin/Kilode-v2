import { useMemo, useState, type ReactNode } from "react";
import { ChevronRight, Flame, MapPin, MessageCircle, Music2, Radio } from "lucide-react";
import { DIGITAL_TRACKS } from "@/lib/qonvo-seed";
import { ROOMS, fmtCount, type Post } from "@/lib/qonvo-data";
import type { useQonvo } from "@/lib/use-qonvo";

const PILLS = ["All", "Hot Takes", "News", "Topics", "Music", "Sports", "Entertainment", "Tech", "Jobs", "Places", "Business"] as const;

type Store = ReturnType<typeof useQonvo>;

export function TrendingPane({ store, onHome }: { store: Store; onHome: (id?: string) => void }) {
  const [pill, setPill] = useState<(typeof PILLS)[number]>("All");
  const posts = store.posts.filter((p) => p?.id && p.status !== "draft");
  const talks = useMemo(() => {
    const bags = new Map<string, { title: string; n: number; image?: string; tag: string; id?: string }>();
    for (const p of posts) {
      const key = p.category || "Kilode";
      const row = bags.get(key) ?? { title: p.title, n: 0, image: p.image, tag: key, id: p.id };
      row.n += (p.comments?.length ?? 0) + 1;
      if (!row.image && p.image) row.image = p.image;
      bags.set(key, row);
    }
    const seeded: { title: string; n: number; image?: string; tag: string; id?: string }[] = [
      { title: "Rain & flooding", n: 18400, tag: "Naija", image: posts.find((p) => p.image)?.image },
      { title: "Nigeria vs England", n: 14700, tag: "Sports" },
      { title: "Paystack for hustle", n: 11200, tag: "Business" },
      { title: "Nigerian music charts", n: 9800, tag: "Music" },
    ];
    const live = [...bags.values()].sort((a, b) => b.n - a.n).slice(0, 4);
    return (live.length >= 3 ? live : seeded).filter((row) => pill === "All" || row.tag === pill || pill === "Hot Takes" || pill === "News");
  }, [posts, pill]);

  const topics = ["#Nigeria", "#Afrobeats", "#Lagos", "#BBNaija"].map((tag, i) => ({
    tag,
    posts: [8200, 6400, 6100, 4300][i],
    line: ["What should happen next?", "New releases dominating", "Traffic and road updates", "Who's your favourite?"][i],
  }));

  const tracks = [...store.tracks, ...DIGITAL_TRACKS].filter((t) => t?.title).slice(0, 3);
  const rooms = [...ROOMS].sort((a, b) => b.online - a.online).slice(0, 4);

  return (
    <div className="trend-page mx-auto max-w-3xl px-3 pt-2 pb-24">
      <button type="button" className="text-[12px] text-muted" onClick={() => onHome()}>
        ← Back
      </button>
      <h1 className="mt-1 flex items-center gap-2 text-[28px] font-extrabold tracking-tight">
        Trending <Flame className="size-5 text-[#FACC15]" />
      </h1>
      <p className="text-[13px] text-muted">What's moving on Kilode right now.</p>

      <section className="trend-live mt-3">
        <div className="mb-2 flex items-center justify-between text-[10px] font-bold">
          <span className="rounded-full bg-[#FACC15] px-2 py-0.5 text-black">LIVE NOW</span>
          <span className="text-muted">Updated just now</span>
        </div>
        <div className="grid grid-cols-4 gap-1 text-center">
          {[
            [fmtCount(rooms.reduce((n, r) => n + r.online, 0)), "People talking"],
            [fmtCount(posts.length || 87), "Posts today"],
            [fmtCount(Math.max(12, posts.reduce((n, p) => n + (p.comments?.length ?? 0), 0))), "Takes"],
            [String(rooms.filter((r) => r.online > 0).length), "Rooms live"],
          ].map(([n, l]) => (
            <div key={l}>
              <div className="text-[15px] font-extrabold">{n}</div>
              <div className="text-[9px] text-muted">{l}</div>
            </div>
          ))}
        </div>
      </section>

      <div className="lane-rail mt-3" role="tablist">
        {PILLS.map((p) => (
          <button key={p} type="button" className={`lane-chip ${pill === p ? "on" : ""}`} onClick={() => setPill(p)}>
            {p === "All" ? "All" : p}
          </button>
        ))}
      </div>

      <Section title="Trending now" icon={<Flame className="size-3.5 text-[#FACC15]" />}>
        {talks.map((row, i) => (
          <button key={row.title} type="button" className="trend-row" onClick={() => (row.id ? store.setOpenPost(row.id) : onHome())}>
            <span className="w-6 text-[11px] font-bold text-muted">{String(i + 1).padStart(2, "0")}</span>
            {row.image ? <img src={row.image} alt="" className="size-12 rounded-xl object-cover" /> : <span className="grid size-12 place-items-center rounded-xl bg-white/5 text-[10px]">{row.tag.slice(0, 2)}</span>}
            <span className="min-w-0 flex-1 text-left">
              <span className="block truncate text-[13px] font-bold">{row.title}</span>
              <span className="text-[11px] text-muted">{fmtCount(row.n)} talking</span>
            </span>
            <span className="text-[11px] font-bold text-[#86efac]">+{12 + i * 6}%</span>
          </button>
        ))}
      </Section>

      <Section title="People are talking about" icon={<MessageCircle className="size-3.5" />}>
        <div className="grid grid-cols-2 gap-2">
          {topics.map((t) => (
            <button key={t.tag} type="button" className="trend-card text-left" onClick={() => onHome()}>
              <div className="text-[13px] font-extrabold">{t.tag}</div>
              <div className="text-[10px] text-muted">{fmtCount(t.posts)} posts</div>
              <div className="mt-1 line-clamp-2 text-[11px]">{t.line}</div>
            </button>
          ))}
        </div>
      </Section>

      <Section title="Trending news" icon={<span className="text-[11px]">▣</span>}>
        <div className="grid grid-cols-2 gap-2">
          {posts.slice(0, 4).map((p) => (
            <NewsCard key={p.id} post={p} onOpen={() => store.setOpenPost(p.id)} />
          ))}
          {posts.length < 1 ? <p className="col-span-2 text-[12px] text-muted">News lands here as the feed fills.</p> : null}
        </div>
      </Section>

      <Section title="Trending takes" icon={<Flame className="size-3.5 text-[#FACC15]" />}>
        {posts.slice(0, 3).map((p) => (
          <button key={`take-${p.id}`} type="button" className="trend-card mb-2 w-full text-left" onClick={() => store.setOpenPost(p.id)}>
            <div className="text-[11px] text-muted">@{p.author || "kilode"}</div>
            <div className="mt-1 line-clamp-2 text-[13px] font-semibold">{p.title}</div>
          </button>
        ))}
      </Section>

      <Section title="Music trending" icon={<Music2 className="size-3.5" />}>
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

      <Section title="Trending places" icon={<MapPin className="size-3.5" />}>
        <div className="grid grid-cols-2 gap-2">
          {["Lagos", "Abuja", "Port Harcourt", "Ibadan"].map((city, i) => (
            <button key={city} type="button" className="trend-card text-left" onClick={() => onHome()}>
              <div className="font-bold">{city}</div>
              <div className="text-[11px] text-muted">{[9.2, 4.2, 2.3, 1.8][i]}K talking</div>
            </button>
          ))}
        </div>
      </Section>

      <Section title="Live rooms" icon={<Radio className="size-3.5" />}>
        <div className="grid grid-cols-2 gap-2">
          {rooms.map((r) => (
            <button key={r.id} type="button" className="trend-card text-left" onClick={() => onHome(r.id)}>
              <div className="truncate font-bold">{r.name}</div>
              <div className="text-[11px] text-[#86efac]">{fmtCount(r.online)} live</div>
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

function NewsCard({ post, onOpen }: { post: Post; onOpen: () => void }) {
  return (
    <button type="button" className="trend-card overflow-hidden p-0 text-left" onClick={onOpen}>
      {post.image ? <img src={post.image} alt="" className="h-20 w-full object-cover" /> : <div className="h-20 bg-white/5" />}
      <div className="p-2">
        <div className="text-[9px] font-bold tracking-wide text-muted">{(post.category || "NAIJA").toUpperCase()}</div>
        <div className="line-clamp-2 text-[12px] font-bold leading-snug">{post.title}</div>
      </div>
    </button>
  );
}
