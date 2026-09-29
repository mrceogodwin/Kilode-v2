import { useEffect, useState } from "react";
import { ChevronRight, Clock, Eye, Search } from "lucide-react";
import { AdReserve } from "@/components/ad-slot";
import { listAdCatalog } from "@/lib/ad-catalog-server";
import { AD_VERTICALS, adDayBucket, adVertical, daysLeft, fmtCount, youtubeId, type Campaign } from "@/lib/qonvo-data";

function thumbOf(a: Campaign) {
  const yt = a.video ? youtubeId(a.video) || a.video : "";
  if (a.image) return a.image;
  if (yt && /^[\w-]{11}$/.test(yt)) return `https://i.ytimg.com/vi/${yt}/hqdefault.jpg`;
  return "";
}

function openAd(a: Campaign, onView: (id: string) => void) {
  onView(a.id);
  if (a.link) window.open(a.link, "_blank", "noopener,noreferrer");
}

function Meta({ a }: { a: Campaign }) {
  const left = daysLeft(a.expiresAt, a.days);
  return (
    <div className="mt-1 flex items-center gap-2 text-[10px] text-muted">
      <span className="inline-flex items-center gap-0.5">
        <Eye className="size-3" /> {fmtCount(a.views ?? 0)} views
      </span>
      <span className="inline-flex items-center gap-0.5">
        <Clock className="size-3" /> {left ? `${left}d left` : `${a.days ?? 7}d`}
      </span>
    </div>
  );
}

function HeroAd({ a, onView }: { a: Campaign; onView: (id: string) => void }) {
  const thumb = thumbOf(a);
  return (
    <button type="button" className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-2.5 text-left" onClick={() => openAd(a, onView)}>
      {thumb ? (
        <img src={thumb} alt="" className="h-[72px] w-[104px] shrink-0 rounded-xl object-cover" />
      ) : (
        <span className="grid h-[72px] w-[104px] shrink-0 place-items-center rounded-xl bg-panel-3 text-[10px] text-muted">AD</span>
      )}
      <span className="min-w-0 flex-1">
        <span className="inline-block rounded-full border border-[#86efac]/50 px-1.5 py-px text-[8px] font-bold tracking-wide text-[#86efac]">PREMIUM</span>
        <span className="mt-1 block truncate text-[15px] font-extrabold leading-tight">{a.name}</span>
        {a.note ? <span className="mt-0.5 block truncate text-[12px] text-muted">{a.note}</span> : null}
        <Meta a={a} />
      </span>
      <ChevronRight className="size-4 shrink-0 text-muted" />
    </button>
  );
}

function GridAd({ a, onView }: { a: Campaign; onView: (id: string) => void }) {
  const thumb = thumbOf(a);
  return (
    <button type="button" className="flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-1.5 text-left" onClick={() => openAd(a, onView)}>
      {thumb ? (
        <img src={thumb} alt="" className="aspect-[16/10] w-full rounded-xl object-cover" />
      ) : (
        <span className="grid aspect-[16/10] w-full place-items-center rounded-xl bg-panel-3 text-[10px] text-muted">AD</span>
      )}
      <span className="flex items-start gap-1 px-0.5 pt-1.5">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[12px] font-extrabold leading-tight">{a.name}</span>
          {a.note ? <span className="mt-0.5 block truncate text-[10px] text-muted">{a.note}</span> : null}
        </span>
        <ChevronRight className="mt-0.5 size-3.5 shrink-0 text-muted" />
      </span>
      <span className="px-0.5 pb-1">
        <Meta a={a} />
      </span>
    </button>
  );
}

function YourSlot({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex min-h-[168px] flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] px-2 py-3 text-center">
      <div className="text-[13px] font-bold">Your ad here</div>
      <p className="mt-1 text-[11px] text-muted">Reach thousands on Kilode.</p>
      <button type="button" className="mt-3 rounded-full border border-[#FACC15] px-3 py-1 text-[12px] font-extrabold text-[#FACC15]" onClick={onCreate}>
        Place ad
      </button>
    </div>
  );
}

function matches(a: Campaign, q: string) {
  if (!q) return true;
  const blob = `${a.name} ${a.note || ""} ${a.status} ${a.placement} ${a.coin || ""}`.toLowerCase();
  return blob.includes(q);
}

export function AdvertPane({ ads, onCreate, onView }: { ads: Campaign[]; onCreate: () => void; onView: (id: string) => void }) {
  const [shown, setShown] = useState<Record<number, number>>({ 30: 8, 14: 6, 7: 6, 1: 6 });
  const [pageSize, setPageSize] = useState(8);
  const [vert, setVert] = useState<string>("All");
  const [q, setQ] = useState("");
  const [seeFeatured, setSeeFeatured] = useState(false);
  const needle = q.trim().toLowerCase();
  const liveAll = ads.filter((a) => a.status === "approved");
  const live = (vert === "All" ? liveAll : liveAll.filter((a) => adVertical(a.name, a.note) === vert)).filter((a) => matches(a, needle));
  const mine = ads.filter((a) => a.status !== "approved").filter((a) => matches(a, needle));
  const buckets: { days: number; label: string }[] = [
    { days: 30, label: "30-day ads" },
    { days: 14, label: "14-day ads" },
    { days: 7, label: "7-day ads" },
    { days: 1, label: "1-day ads" },
  ];
  const featuredPool = [
    ...live.filter((a) => a.placement === "featured" || a.placement === "square"),
    ...live.filter((a) => a.placement !== "featured" && a.placement !== "square"),
  ];
  const hero = featuredPool[0];
  const featured = featuredPool.slice(1);
  const featuredShown = seeFeatured ? featured : featured.slice(0, 3);

  useEffect(() => {
    void listAdCatalog()
      .then((c) => {
        setPageSize(c.pageSize);
        setShown({ 30: c.pageSize, 14: c.pageSize, 7: c.pageSize, 1: c.pageSize });
      })
      .catch(() => undefined);
  }, []);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pt-3 dock-pad">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-[22px] font-extrabold tracking-tight">Ads · by duration</h1>
          <button type="button" className="btn-yellow shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-extrabold text-black" onClick={onCreate}>
            Place ad
          </button>
        </div>

        <label className="mt-3 flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-2">
          <Search className="size-4 shrink-0 text-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search ads — brand, yours, pending..."
            className="min-w-0 flex-1 bg-transparent text-[13px] outline-none"
            aria-label="Search ads"
          />
        </label>

        <div className="lane-rail mt-3">
          {AD_VERTICALS.map((v) => (
            <button key={v} type="button" className={`lane-chip ${vert === v ? "on" : ""}`} onClick={() => setVert(v)}>
              {v}
            </button>
          ))}
        </div>

        <div className="mt-4 mb-2 flex items-center justify-between">
          <div className="text-[11px] font-extrabold tracking-[0.14em] text-[#86efac]">PREMIUM ADS</div>
          <a href="/advertise" className="shrink-0 text-[13px] font-semibold text-fg">
            Rent
          </a>
        </div>
        {hero ? <HeroAd a={hero} onView={onView} /> : <YourSlot onCreate={onCreate} />}

        <AdReserve id="ads_leader" className="mt-3" minH="min-h-[64px]" />

        {featured.length ? (
          <section className="mt-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-[11px] font-extrabold tracking-[0.14em] text-[#86efac]">FEATURED ADS</div>
              {featured.length > 3 ? (
                <button type="button" className="text-[12px] font-semibold text-muted" onClick={() => setSeeFeatured((v) => !v)}>
                  {seeFeatured ? "Show less" : "See all →"}
                </button>
              ) : null}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {featuredShown.map((a) => (
                <GridAd key={a.id} a={a} onView={onView} />
              ))}
            </div>
          </section>
        ) : null}

        {buckets.map(({ days, label }) => {
          const pack = live.filter((a) => adDayBucket(a.days) === days);
          if (!pack.length && days !== 30) return null;
          const n = shown[days] ?? pageSize;
          const slice = pack.slice(0, n);
          return (
            <section key={days} className="mt-4">
              <div className="mb-2 text-[11px] font-extrabold tracking-[0.14em] text-[#86efac]">{label.toUpperCase()}</div>
              <div className="grid grid-cols-3 gap-2">
                {slice.map((a) => (
                  <GridAd key={a.id} a={a} onView={onView} />
                ))}
                {days === 30 ? <YourSlot onCreate={onCreate} /> : null}
              </div>
              {n < pack.length ? (
                <button
                  type="button"
                  className="mx-auto mt-3 block rounded-full border border-white/15 px-4 py-1.5 text-[11px] font-bold"
                  onClick={() => setShown((s) => ({ ...s, [days]: n + pageSize }))}
                >
                  More
                </button>
              ) : null}
            </section>
          );
        })}

        {mine.length ? (
          <section className="mt-5">
            <div className="mb-2 text-[11px] font-extrabold tracking-[0.14em] text-muted">YOUR QUEUE</div>
            {mine.map((a) => (
              <div key={a.id} className="mb-1.5 rounded-xl border border-white/10 px-3 py-2 text-[12px]">
                <span className="font-bold">{a.name}</span>
                <span className="text-muted"> · {a.status} · {a.days ?? 7}d</span>
              </div>
            ))}
          </section>
        ) : null}
      </div>
    </div>
  );
}
