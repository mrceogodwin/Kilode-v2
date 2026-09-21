import { useEffect, useRef, useState } from "react";
import { AdReserve } from "@/components/ad-slot";
import { PremiumSquareAd } from "@/components/premium-ad";
import { listAdCatalog } from "@/lib/ad-catalog-server";
import { AD_VERTICALS, adDayBucket, adVertical, daysLeft, fmtCount, youtubeId, type Campaign } from "@/lib/qonvo-data";

function EmptyHero({ title, body, cta, onClick }: { title: string; body: string; cta: string; onClick?: () => void }) {
  return (
    <div className="mx-auto flex max-w-sm flex-col items-center px-6 py-10 text-center">
      <img src="/kilode-logo-green.png" alt="" className="mb-4 h-9 w-auto max-w-[160px] object-contain opacity-90" />
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted">{body}</p>
      {onClick ? (
        <button type="button" className="btn-3d mt-4 rounded-md px-3 py-1.5 text-[11px] font-semibold" onClick={onClick}>
          {cta}
        </button>
      ) : null}
    </div>
  );
}

function AdCard({ a, onView }: { a: Campaign; onView: (id: string) => void }) {
  const yt = a.video ? youtubeId(a.video) || a.video : undefined;
  const left = daysLeft(a.expiresAt, a.days);
  const inner = (
    <div className="overflow-hidden rounded-lg border border-line bg-panel text-left">
      {a.kind === "video" || a.kind === "video-text" ? (
        yt ? (
          <img src={`https://i.ytimg.com/vi/${yt}/hqdefault.jpg`} alt="" className="aspect-[16/9] w-full object-cover" />
        ) : (
          <div className="grid aspect-[16/9] place-items-center bg-panel-3 text-[9px] text-muted">Video</div>
        )
      ) : a.image ? (
        <img src={a.image} alt="" className="aspect-[16/9] w-full object-cover" />
      ) : (
        <div className="grid aspect-[16/9] place-items-center bg-panel-3 px-2 text-center text-[11px] font-normal">{a.name}</div>
      )}
      <div className="px-1.5 py-1">
        <div className="line-clamp-2 text-[11px] font-normal leading-snug">{a.name}</div>
        {a.note ? <p className="mt-0.5 line-clamp-2 text-[10px] text-muted">{a.note}</p> : null}
        <div className="mt-1 flex items-center justify-between text-[10px] tabular-nums text-muted">
          <span>{fmtCount(a.views ?? 0)} views</span>
          <span className="text-lime-2">{left ? `${left}d left` : `${a.days ?? 7}d`}</span>
        </div>
      </div>
    </div>
  );
  return a.link ? (
    <a href={a.link} target="_blank" rel="noopener noreferrer" onClick={() => onView(a.id)}>
      {inner}
    </a>
  ) : (
    <button type="button" onClick={() => onView(a.id)}>
      {inner}
    </button>
  );
}

function FeaturedRail({ ads, onView }: { ads: Campaign[]; onView: (id: string) => void }) {
  const track = useRef<HTMLDivElement>(null);
  const hover = useRef(false);
  useEffect(() => {
    if (ads.length < 2) return;
    const t = window.setInterval(() => {
      if (hover.current || !track.current) return;
      const el = track.current;
      const next = el.scrollLeft + el.clientWidth * 0.55;
      el.scrollTo({ left: next >= el.scrollWidth - 8 ? 0 : next, behavior: "smooth" });
    }, 3800);
    return () => window.clearInterval(t);
  }, [ads.length]);
  if (!ads.length) return null;
  return (
    <section className="mb-3">
      <div className="mb-1 text-[10px] font-medium tracking-[0.16em] text-lime-2">FEATURED ADS</div>
      <div
        ref={track}
        className="flex gap-1.5 overflow-x-auto overscroll-x-contain pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        onPointerEnter={() => {
          hover.current = true;
        }}
        onPointerLeave={() => {
          hover.current = false;
        }}
      >
        {ads.map((a) => {
          const yt = a.video ? youtubeId(a.video) || a.video : undefined;
          const left = daysLeft(a.expiresAt, a.days);
          const thumb = a.image ? a.image : yt ? `https://i.ytimg.com/vi/${yt}/hqdefault.jpg` : "";
          const card = (
            <div className="flex overflow-hidden rounded-md border border-line bg-panel">
              {thumb ? <img src={thumb} alt="" className="h-12 w-[72px] shrink-0 object-cover" /> : <div className="grid h-12 w-[72px] shrink-0 place-items-center bg-panel-3 text-[8px] text-muted">AD</div>}
              <div className="min-w-0 flex-1 px-1.5 py-1">
                <div className="truncate text-[11px] font-semibold leading-tight">{a.name}</div>
                <div className="mt-0.5 flex items-center justify-between text-[9px] text-muted">
                  <span>{fmtCount(a.views ?? 0)}</span>
                  <span className="text-lime-2">{left ? `${left}d` : `${a.days ?? 7}d`}</span>
                </div>
              </div>
            </div>
          );
          return (
            <div key={a.id} className="w-[168px] shrink-0">
              {a.link ? (
                <a href={a.link} target="_blank" rel="noopener noreferrer" onClick={() => onView(a.id)}>
                  {card}
                </a>
              ) : (
                <button type="button" className="block w-full text-left" onClick={() => onView(a.id)}>
                  {card}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function AdvertPane({ ads, onCreate, onView }: { ads: Campaign[]; onCreate: () => void; onView: (id: string) => void }) {
  const [shown, setShown] = useState<Record<number, number>>({ 30: 12, 14: 12, 7: 12, 1: 12 });
  const [pageSize, setPageSize] = useState(12);
  const [featuredN, setFeaturedN] = useState(8);
  const [vert, setVert] = useState<string>("All");
  const liveAll = ads.filter((a) => a.status === "approved");
  const live = vert === "All" ? liveAll : liveAll.filter((a) => adVertical(a.name, a.note) === vert);
  const mine = ads.filter((a) => a.status !== "approved");
  const buckets: { days: number; label: string }[] = [
    { days: 30, label: "30-day ads" },
    { days: 14, label: "14-day ads" },
    { days: 7, label: "7-day ads" },
    { days: 1, label: "1-day ads" },
  ];
  const featured = [
    ...live.filter((a) => a.placement === "featured" || a.placement === "square"),
    ...live.filter((a) => a.placement !== "featured" && a.placement !== "square"),
  ].slice(0, featuredN);
  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    void listAdCatalog()
      .then((c) => {
        setPageSize(c.pageSize);
        setFeaturedN(c.featuredN);
        setShown({ 30: c.pageSize, 14: c.pageSize, 7: c.pageSize, 1: c.pageSize });
      })
      .catch(() => undefined);
  }, []);
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      if (!entries[0]?.isIntersecting) return;
      setShown((s) => {
        let changed = false;
        const next = { ...s };
        for (const { days } of buckets) {
          const pack = live.filter((a) => adDayBucket(a.days) === days);
          const cur = next[days] ?? pageSize;
          if (cur < pack.length) {
            next[days] = cur + pageSize;
            changed = true;
          }
        }
        return changed ? next : s;
      });
    });
    io.observe(el);
    return () => io.disconnect();
  }, [live, pageSize]);
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between border-b border-white/5 px-3 py-2">
        <span className="text-xs text-muted">Ads · by duration</span>
        <button type="button" className="btn-3d rounded-md px-3 py-1 text-[11px] font-semibold" onClick={onCreate}>
          Place ad
        </button>
      </div>
      <div className="flex shrink-0 flex-nowrap gap-1 overflow-x-auto overscroll-x-contain border-b border-line px-2 py-1.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {AD_VERTICALS.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setVert(v)}
            className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] ${vert === v ? "btn-3d font-semibold text-lime-2" : "border border-line text-muted"}`}
          >
            {v}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2 pb-3">
        <PremiumSquareAd />
        <AdReserve id="ads_leader" className="mb-3" />
        <FeaturedRail ads={featured} onView={onView} />
        <div className="mb-3 grid grid-cols-2 gap-2">
          <AdReserve id="ads_split_a" minH="min-h-[90px]" />
          <AdReserve id="ads_g1" minH="min-h-[90px]" />
        </div>
        {buckets.map(({ days, label }) => {
          const pack = live.filter((a) => adDayBucket(a.days) === days);
          if (!pack.length) return null;
          const n = shown[days] ?? pageSize;
          return (
            <section key={days} className="mb-5">
              <div className="mb-1.5">
                <div className="text-[10px] font-medium tracking-[0.16em] text-lime-2">{label.toUpperCase()}</div>
                <div className="text-[10px] text-muted">{pack.length} live</div>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {pack.slice(0, n).map((a) => (
                  <AdCard key={a.id} a={a} onView={onView} />
                ))}
              </div>
              {n < pack.length ? (
                <button
                  type="button"
                  className="btn-3d mx-auto mt-2 block rounded-md px-4 py-1.5 text-[11px] font-semibold"
                  onClick={() => setShown((s) => ({ ...s, [days]: n + pageSize }))}
                >
                  Load more · {pack.length - n} left
                </button>
              ) : null}
            </section>
          );
        })}
        <div ref={sentinel} className="h-2" />
        <AdReserve id="ads_g2" className="mb-3" />
        {vert === "All"
          ? AD_VERTICALS.filter((v) => v !== "All")
              .map((v) => {
                const pack = liveAll.filter((a) => adVertical(a.name, a.note) === v);
                if (!pack.length) return null;
                return (
                  <section key={v} className="mb-5">
                    <div className="mb-1.5 text-[10px] font-medium tracking-[0.16em] text-lime-2">{v.toUpperCase()}</div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {pack.slice(0, 6).map((a) => (
                        <AdCard key={a.id} a={a} onView={onView} />
                      ))}
                    </div>
                  </section>
                );
              })
              .filter(Boolean)
              .flatMap((node, i) => (i === 3 ? [node, <AdReserve key="g3" id="ads_g3" className="mb-3" />] : [node]))
          : null}
        {live.length === 0 ? <EmptyHero title="No ads live" body="Place an ad after crypto payment — Nigeria is watching." cta="Place an ad" onClick={onCreate} /> : null}
        <AdReserve id="ads_footer" className="mt-3" />
        {mine.length ? <div className="mt-3 text-[10px] font-medium tracking-normal text-muted">Your queue</div> : null}
        {mine.map((a) => (
          <div key={a.id} className="mt-1 rounded-md border border-line px-2 py-1.5 text-[11px] text-muted">
            {a.name} · {a.status} · {a.kind} · {a.days ?? 7}d · {(a.coin || "").toUpperCase()} {a.amount || ""} · {fmtCount(a.views ?? 0)} views
          </div>
        ))}
      </div>
    </div>
  );
}
