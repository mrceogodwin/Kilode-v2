import { useState } from "react";
import { AdSlot, AdSlotOrEmpty } from "@/components/ad-slot";
import { PremiumSquareAd } from "@/components/premium-ad";
import { adDayBucket, daysLeft, fmtCount, youtubeId, type Campaign } from "@/lib/qonvo-data";

function EmptyHero({ title, body, cta, onClick }: { title: string; body: string; cta: string; onClick?: () => void }) {
  return (
    <div className="mx-auto flex max-w-sm flex-col items-center px-6 py-10 text-center">
      <img src="/kilode-logo-green.png" alt="" className="mb-4 h-9 w-auto max-w-[160px] object-contain opacity-90" />
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted">{body}</p>
      {onClick ? (
        <button type="button" className="btn-join mt-4 rounded-lg px-4 py-2 text-sm font-bold" onClick={onClick}>
          {cta}
        </button>
      ) : null}
    </div>
  );
}

export function AdvertPane({ ads, onCreate, onView }: { ads: Campaign[]; onCreate: () => void; onView: (id: string) => void }) {
  const [shown, setShown] = useState<Record<number, number>>({ 30: 6, 14: 6, 7: 6, 1: 6 });
  const live = ads.filter((a) => a.status === "approved");
  const mine = ads.filter((a) => a.status !== "approved");
  const buckets: { days: number; label: string }[] = [
    { days: 30, label: "30-day ads" },
    { days: 14, label: "14-day ads" },
    { days: 7, label: "7-day ads" },
    { days: 1, label: "1-day ads" },
  ];
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between border-b border-white/5 px-3 py-2">
        <span className="text-xs text-muted">Ads · by duration</span>
        <button type="button" className="btn-3d rounded-md px-3 py-1 text-[11px] font-semibold" onClick={onCreate}>
          Place ad
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2 pb-3">
        <PremiumSquareAd />
        <AdSlot id="ads_leader" className="mb-3" />
        {buckets.map(({ days, label }) => {
          const pack = live.filter((a) => adDayBucket(a.days) === days);
          if (!pack.length) return null;
          const n = shown[days] ?? 6;
          return (
            <section key={days} className="mb-5">
              <div className="mb-1.5">
                <div className="text-[10px] font-medium tracking-[0.16em] text-lime-2">{label.toUpperCase()}</div>
                <div className="text-[10px] text-muted">{pack.length} live · paid window</div>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {pack.slice(0, n).map((a) => {
                  const yt = a.video ? youtubeId(a.video) || a.video : undefined;
                  const left = daysLeft(a.expiresAt, a.days);
                  const inner = (
                    <div className="overflow-hidden rounded-xl border border-line bg-panel text-left">
                      {a.kind === "video" || a.kind === "video-text" ? (
                        yt ? (
                          <img src={`https://i.ytimg.com/vi/${yt}/hqdefault.jpg`} alt="" className="aspect-[16/10] w-full object-cover" />
                        ) : (
                          <div className="grid aspect-[16/10] place-items-center bg-panel-3 text-[9px] text-muted">Video</div>
                        )
                      ) : a.image ? (
                        <img src={a.image} alt="" className="aspect-[16/10] w-full object-cover" />
                      ) : (
                        <div className="grid aspect-[16/10] place-items-center bg-panel-3 px-2 text-center text-[11px] font-semibold">{a.name}</div>
                      )}
                      <div className="px-2 py-1.5">
                        <div className="line-clamp-2 text-[12px] font-normal leading-snug">{a.name}</div>
                        {a.note ? <p className="mt-0.5 line-clamp-2 text-[10px] text-muted">{a.note}</p> : null}
                        <div className="mt-1 flex items-center justify-between text-[10px] tabular-nums text-muted">
                          <span>{fmtCount(a.views ?? 0)} views</span>
                          <span className="text-lime-2">{left ? `${left}d left` : `${a.days ?? 7}d`}</span>
                        </div>
                      </div>
                    </div>
                  );
                  return a.link ? (
                    <a key={a.id} href={a.link} target="_blank" rel="noopener noreferrer" onClick={() => onView(a.id)}>
                      {inner}
                    </a>
                  ) : (
                    <button key={a.id} type="button" onClick={() => onView(a.id)}>
                      {inner}
                    </button>
                  );
                })}
              </div>
              {n < pack.length ? (
                <button
                  type="button"
                  className="btn-3d mx-auto mt-2 block rounded-md px-4 py-1.5 text-[11px] font-semibold"
                  onClick={() => setShown((s) => ({ ...s, [days]: n + 6 }))}
                >
                  Load more · {pack.length - n} left
                </button>
              ) : null}
            </section>
          );
        })}
        {live.length === 0 ? <EmptyHero title="No ads live" body="Place an ad after crypto payment — Nigeria is watching." cta="Place an ad" onClick={onCreate} /> : null}
        <AdSlotOrEmpty id="ads_footer" label="Footer long banner · /ops" className="mt-3" />
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
