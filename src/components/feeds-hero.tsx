import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, Play, Repeat2 } from "lucide-react";
import { SampleBanner } from "@/components/sample-banner";
import { listAdCatalog, type AdCatalog } from "@/lib/ad-catalog-server";
import { isAdUnit, isPubId } from "@/lib/ad-slots";
import { AdSlot, useAdSlots } from "@/components/ad-slot";
import { fmtCount, timeAgo, youtubeId, type Campaign, type Post } from "@/lib/qonvo-data";

type Slide =
  | { k: "post"; post: Post }
  | { k: "paid"; ad: Campaign }
  | { k: "slot"; id: string; image: string; video: string; link: string; label: string }
  | { k: "google"; id: string }
  | { k: "company"; n: number; id: string; image: string; video: string; link: string };

const COMPANY_IDS = ["feeds_hero_c1", "feeds_hero_c2", "feeds_hero_c3", "feeds_hero_c4", "feeds_hero_c5"] as const;

const FALLBACK: AdCatalog = {
  dailyCap: 40,
  pageSize: 12,
  featuredN: 8,
  prices: {},
  paidSlots: {},
  heroPosts: true,
  heroPaid: true,
  heroGoogle: true,
  heroVideo: true,
  heroMs: 7000,
};

function isVideoAd(ad: Campaign) {
  return Boolean(ad.video) || ad.kind === "video" || ad.kind === "video-text";
}

function interleave(posts: Slide[], ads: Slide[]) {
  const out: Slide[] = [];
  let p = 0;
  let a = 0;
  while (p < posts.length || a < ads.length) {
    if (p < posts.length) out.push(posts[p++]);
    if (p < posts.length) out.push(posts[p++]);
    if (a < ads.length) out.push(ads[a++]);
  }
  return out;
}

export function FeedsHero({
  posts,
  ads,
  onOpen,
  onViewAd,
  onRepost,
}: {
  posts: Post[];
  ads: Campaign[];
  onOpen: (id: string) => void;
  onViewAd?: (id: string) => void;
  onRepost?: (post: Post) => void;
}) {
  const slots = useAdSlots();
  const [cat, setCat] = useState<AdCatalog>(FALLBACK);
  const [i, setI] = useState(0);
  const [hover, setHover] = useState(false);
  const [play, setPlay] = useState<string | null>(null);
  const drag = useRef(0);

  useEffect(() => {
    void listAdCatalog()
      .then(setCat)
      .catch(() => undefined);
  }, []);

  const slides = useMemo(() => {
    const story: Slide[] = [];
    const banners: Slide[] = [];

    if (cat.heroPosts) {
      const live = posts.filter((p) => p.status !== "draft" && p.title && p.image);
      const newest = [...live].sort((a, b) => b.ts - a.ts).slice(0, 16);
      for (let n = newest.length - 1; n > 0; n -= 1) {
        const j = Math.floor(Math.random() * (n + 1));
        const swap = newest[n];
        newest[n] = newest[j]!;
        newest[j] = swap!;
      }
      for (const p of newest.slice(0, 10)) story.push({ k: "post", post: p });
    }

    if (cat.heroGoogle) {
      banners.push({ k: "google", id: "feeds_hero_google" });
    }

    COMPANY_IDS.forEach((id, idx) => {
      const s = slots.find((r) => r.id === id);
      if (!s?.image && !s?.video) return;
      banners.push({
        k: "company",
        n: idx + 1,
        id,
        image: s?.image || "",
        video: s?.video || "",
        link: s?.link || "",
      });
    });

    if (cat.heroPaid) {
      for (const ad of ads) {
        if (ad.status !== "approved") continue;
        if (ad.placement !== "feeds-hero" && ad.placement !== "hero") continue;
        if (!cat.heroVideo && isVideoAd(ad)) continue;
        banners.push({ k: "paid", ad });
      }
    }

    const superSlot = slots.find((s) => s.id === "feeds_hero" && s.enabled);
    if (superSlot && (superSlot.image || superSlot.video) && (!superSlot.video || cat.heroVideo)) {
      banners.push({
        k: "slot",
        id: superSlot.id,
        image: superSlot.image || "",
        video: superSlot.video || "",
        link: superSlot.link || "",
        label: superSlot.label || "Premium",
      });
    }

    return interleave(story, banners);
  }, [ads, cat.heroGoogle, cat.heroPaid, cat.heroPosts, cat.heroVideo, posts, slots]);

  useEffect(() => {
    setI(0);
    setPlay(null);
  }, [slides.length]);

  useEffect(() => {
    if (hover || play || slides.length < 2) return;
    const t = window.setInterval(() => setI((n) => (n + 1) % slides.length), cat.heroMs);
    return () => window.clearInterval(t);
  }, [cat.heroMs, hover, play, slides.length]);

  const slide = slides[i] ?? slides[0];
  if (!slide) return null;

  function go(n: number) {
    setPlay(null);
    setI((n + slides.length) % slides.length);
  }

  return (
    <section
      className="hero-flag glass-3d mb-3 overflow-hidden"
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
      onPointerDown={(e) => { drag.current = e.clientX; setHover(true); }}
      onPointerUp={(e) => {
        const dx = e.clientX - drag.current;
        if (dx > 48) go(i - 1);
        else if (dx < -48) go(i + 1);
      }}
    >
      <div className="hero-stage relative aspect-[16/9] w-full overflow-hidden">
        <HeroSlide slide={slide} play={play} onPlay={setPlay} onOpen={onOpen} onViewAd={onViewAd} onRepost={onRepost} />
        {slides.length > 1 ? (
          <>
            <button
              type="button"
              aria-label="Previous"
              className="absolute top-1/2 left-2 z-10 grid size-8 -translate-y-1/2 place-items-center rounded-full bg-black/45 text-white"
              onClick={() => go(i - 1)}
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              aria-label="Next"
              className="hero-more"
              onClick={() => go(i + 1)}
            >
              MORE
              <span aria-hidden>››</span>
            </button>
            <div className="absolute top-2 right-12 z-10">
              <span className="rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-white/90">
                {i + 1}/{slides.length}
              </span>
            </div>
            {slides.length <= 8 ? (
            <div className="absolute bottom-2 left-0 right-0 z-10 flex justify-center gap-1">
              {slides.map((_, n) => (
                <button
                  key={n}
                  type="button"
                  aria-label={`Slide ${n + 1}`}
                  className={`h-1.5 rounded-full ${n === i ? "w-4 bg-lime-2" : "w-1.5 bg-white/40"}`}
                  onClick={() => go(n)}
                />
              ))}
            </div>
            ) : null}
          </>
        ) : null}
      </div>
    </section>
  );
}

function HeroTitle({ title }: { title: string }) {
  const parts = title.trim().split(/\s+/);
  if (parts.length < 3) return title;
  const tail = parts.slice(-2).join(" ");
  const head = parts.slice(0, -2).join(" ");
  return (
    <>
      {head} <span className="text-white">{tail}</span>
    </>
  );
}

function HeroSlide({
  slide,
  play,
  onPlay,
  onOpen,
  onViewAd,
  onRepost,
}: {
  slide: Slide;
  play: string | null;
  onPlay: (id: string | null) => void;
  onOpen: (id: string) => void;
  onViewAd?: (id: string) => void;
  onRepost?: (post: Post) => void;
}) {
  const slots = useAdSlots();
  if (slide.k === "google") {
    const g = slots.find((s) => s.id === slide.id && s.enabled);
    const live = g && isPubId(g.pubId) && isAdUnit(g.adUnit);
    if (live) {
      return (
        <div className="grid h-full w-full place-items-center bg-panel-2">
          <AdSlot id={slide.id} className="w-full border-0 bg-transparent" />
        </div>
      );
    }
    return (
      <div className="ad-google grid h-full w-full place-items-center">
        <span>Advertisement</span>
        <em>Google AdSense</em>
      </div>
    );
  }
  if (slide.k === "company") {
    const yt = slide.video ? youtubeId(slide.video) || slide.video : "";
    const key = `co:${slide.id}`;
    if (slide.image || yt) {
      return (
        <HeroMedia
          title={`Company ${slide.n}`}
          note=""
          badge="AD"
          thumb={slide.image || (yt ? `https://i.ytimg.com/vi/${yt}/hqdefault.jpg` : "")}
          yt={yt}
          playing={play === key}
          onPlay={() => onPlay(key)}
          href={slide.link || "/advertise"}
        />
      );
    }
    return (
      <SampleBanner id={slide.id} tall />
    );
  }
  if (slide.k === "post") {
    const p = slide.post;
    return (
      <div
        role="button"
        tabIndex={0}
        className="relative block h-full w-full cursor-pointer text-left"
        onClick={() => onOpen(p.id)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") onOpen(p.id);
        }}
      >
        {p.image ? <img src={p.image} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" /> : <div className="h-full w-full bg-panel-3" />}
        {onRepost ? (
          <button
            type="button"
            aria-label="Repost to chat"
            className="hero-repost absolute top-2.5 right-2.5 z-20"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onRepost(p);
            }}
          >
            <Repeat2 className="size-[18px]" strokeWidth={2.25} />
          </button>
        ) : null}
        <div className="hero-caption absolute inset-x-0 bottom-0 px-3 pt-8 pb-3">
          <span className="inline-flex rounded-full bg-black/50 px-2 py-0.5 text-[9px] font-bold tracking-[0.14em] text-[#b7f0c8] ring-1 ring-white/15">
            {(p.category || "NEWS").toUpperCase()}
          </span>
          <div className="mt-2 line-clamp-3 text-[18px] font-extrabold leading-tight text-white sm:text-[22px]">
            <HeroTitle title={p.title} />
          </div>
          {p.excerpt ? <div className="mt-1 line-clamp-2 text-[12px] font-medium leading-snug text-white/80">{p.excerpt}</div> : null}
          <div className="mt-1.5 flex items-center gap-2 text-[11px] text-white/80">
            <span>{timeAgo(p.ts)}</span>
            <span>{fmtCount(p.views ?? 0)} views</span>
            <span>{p.comments?.length ?? 0} comments</span>
          </div>
          <span className="hero-read">Read more</span>
        </div>
      </div>
    );
  }
  if (slide.k === "paid") {
    const ad = slide.ad;
    const yt = ad.video ? youtubeId(ad.video) || ad.video : "";
    const key = `paid:${ad.id}`;
    const thumb = ad.image || (yt ? `https://i.ytimg.com/vi/${yt}/hqdefault.jpg` : "");
    return (
      <HeroMedia
        title={ad.name}
        note={ad.note}
        badge="AD"
        thumb={thumb}
        yt={yt}
        playing={play === key}
        onPlay={() => onPlay(key)}
        href={ad.link}
        onClick={() => onViewAd?.(ad.id)}
      />
    );
  }
  const yt = slide.video ? youtubeId(slide.video) || slide.video : "";
  const key = `slot:${slide.id}`;
  return (
    <HeroMedia
      title={slide.label}
      note=""
      badge="AD"
      thumb={slide.image || (yt ? `https://i.ytimg.com/vi/${yt}/hqdefault.jpg` : "")}
      yt={yt}
      playing={play === key}
      onPlay={() => onPlay(key)}
      href={slide.link || "/advertise"}
    />
  );
}

function HeroMedia({
  title,
  note,
  badge,
  thumb,
  yt,
  playing,
  onPlay,
  href,
  onClick,
}: {
  title: string;
  note: string;
  badge: string;
  thumb: string;
  yt: string;
  playing: boolean;
  onPlay: () => void;
  href?: string;
  onClick?: () => void;
}) {
  if (playing && yt) {
    return (
      <iframe
        title={title}
        src={`https://www.youtube.com/embed/${yt}?rel=0&autoplay=1`}
        className="h-full w-full border-0"
        allow="encrypted-media; fullscreen; autoplay"
      />
    );
  }
  const body = (
    <>
      {thumb ? <img src={thumb} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" /> : <div className="h-full w-full bg-panel-3" />}
      {yt ? (
        <span className="absolute inset-0 grid place-items-center">
          <span className="grid size-12 place-items-center rounded-full bg-white/90 text-black shadow-lg">
            <Play className="ml-0.5 size-5 fill-current" />
          </span>
        </span>
      ) : null}
      <span className="hero-caption absolute inset-x-0 bottom-0 px-3 pt-6 pb-4 text-left">
        <span className="text-[9px] font-medium tracking-[0.16em] text-lime-2">{badge}</span>
        <span className="mt-0.5 block line-clamp-2 text-[13px] font-medium leading-snug text-white">{title}</span>
        {note ? <span className="mt-0.5 block line-clamp-1 text-[11px] font-normal text-white/70">{note}</span> : null}
      </span>
    </>
  );
  if (yt) {
    return (
      <button
        type="button"
        className="relative block h-full w-full"
        onClick={() => {
          onClick?.();
          onPlay();
        }}
      >
        {body}
      </button>
    );
  }
  if (href) {
    return (
      <a href={href} target={href.startsWith("/") ? undefined : "_blank"} rel="noreferrer" className="relative block h-full w-full" onClick={onClick}>
        {body}
      </a>
    );
  }
  return (
    <button type="button" className="relative block h-full w-full" onClick={onClick}>
      {body}
    </button>
  );
}
