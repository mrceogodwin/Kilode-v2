import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { AdSlot, useAdSlots } from "@/components/ad-slot";
import { youtubeId } from "@/lib/qonvo-data";

const ADS_MAIL = "kilodeafrica@gmail.com";
const HYBRID = [
  "Place ads here for 30 days. Promote your company or business.",
  "Hybrid slot: image, YouTube, or Google — it sits on every story, not only the Ads tab.",
  "Same portrait on Feeds stories, plus a square on the Ads tab. Staff set duration in /ops.",
  "Pay crypto. Staff approve. When the window ends, the creative drops off by itself.",
];

function ContactUs() {
  return (
    <a
      href={`mailto:${ADS_MAIL}?subject=${encodeURIComponent("Kilode ads placement")}`}
      className="btn-join mt-1 inline-flex items-center justify-center rounded-md px-3 py-1.5 text-[11px] font-bold"
    >
      CONTACT US
    </a>
  );
}

function HybridCopy() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => setI((n) => (n + 1) % HYBRID.length), 4200);
    return () => window.clearInterval(t);
  }, []);
  return (
    <div className="px-3 py-2 text-center">
      <p className="text-[12px] font-semibold leading-snug">{HYBRID[i]}</p>
      <div className="mt-1.5 flex justify-center gap-1">
        {HYBRID.map((_, n) => (
          <button
            key={n}
            type="button"
            aria-label={`Ad info ${n + 1}`}
            className={`h-1 w-3 rounded-full ${n === i ? "bg-lime-2" : "bg-white/20"}`}
            onClick={() => setI(n)}
          />
        ))}
      </div>
    </div>
  );
}

export function PremiumStoryAd({ compact }: { compact?: boolean }) {
  const slots = useAdSlots();
  const slot = slots.find((s) => s.id === "premium_story" && s.enabled);
  const yt = slot?.video ? youtubeId(slot.video) : "";
  return (
    <aside className="overflow-hidden rounded-2xl border border-line bg-panel">
      <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-2">
        <span className="text-[11px] font-extrabold tracking-tight">Premium Ads: Kilode.ng</span>
        <Link to="/advertise" className="text-[10px] font-semibold text-lime-2">
          READ MORE
        </Link>
      </div>
      {slot && yt ? (
        <div className="mx-auto max-w-[280px]">
          <iframe title="Premium ad" src={`https://www.youtube.com/embed/${yt}?rel=0`} className="aspect-[9/16] w-full border-0 bg-black" allow="encrypted-media; fullscreen" loading="lazy" />
        </div>
      ) : slot?.image ? (
        <a href={slot.link || "/advertise"} target={slot.link ? "_blank" : undefined} rel="noreferrer">
          <img src={slot.image} alt="" className="mx-auto aspect-[9/16] max-h-[420px] w-full max-w-[280px] object-cover" />
        </a>
      ) : (
        <div className={`grid ${compact ? "min-h-[140px]" : "min-h-[220px]"} place-items-center bg-black px-4 text-center`}>
          <div>
            <div className="text-[10px] font-medium tracking-[0.16em] text-lime-2">PREMIUM · 30 DAYS</div>
            <p className="mt-2 text-sm font-semibold">Place ads here for 30 days.</p>
            <p className="mt-1 text-[11px] text-muted">Promote your company or business. Image or YouTube. Staff set the window in /ops.</p>
          </div>
        </div>
      )}
      <HybridCopy />
      <div className="border-t border-line px-3 py-2 text-center">
        <div className="text-[9px] font-medium tracking-[0.14em] text-muted">FOR ADS PLACEMENT</div>
        <ContactUs />
      </div>
    </aside>
  );
}

export function PremiumSquareAd() {
  const slots = useAdSlots();
  const slot = slots.find((s) => s.id === "ads_square" && s.enabled);
  if (slot && (slot.image || slot.video || slot.html || slot.pubId)) return <AdSlot id="ads_square" />;
  return (
    <aside className="mb-3 overflow-hidden rounded-2xl border border-line bg-panel">
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-[11px] font-extrabold">Premium Ads: Kilode.ng</span>
        <Link to="/advertise" className="text-[10px] font-semibold text-lime-2">
          READ MORE
        </Link>
      </div>
      <div className="grid aspect-[16/9] max-h-[180px] place-items-center bg-black px-4 text-center">
        <div>
          <div className="text-[10px] font-medium tracking-[0.16em] text-lime-2">ADS TAB · 30 DAYS</div>
          <p className="mt-2 text-sm font-semibold">Place ads here for 30 days, promote your company or business.</p>
        </div>
      </div>
      <HybridCopy />
      <div className="border-t border-line px-3 py-2 text-center">
        <ContactUs />
      </div>
    </aside>
  );
}

export function MenuPremiumAd() {
  return (
    <aside className="overflow-hidden rounded-2xl border border-line bg-panel">
      <div className="flex items-center justify-between px-2.5 py-1.5">
        <span className="text-[10px] font-extrabold">Premium Ads: Kilode.ng</span>
        <Link to="/advertise" className="text-[9px] font-semibold text-lime-2">
          READ MORE
        </Link>
      </div>
      <div className="grid min-h-[88px] place-items-center bg-black px-3 py-3 text-center">
        <p className="text-[12px] font-semibold leading-snug">Place ads here for 30 days. Promote your company or business.</p>
      </div>
      <div className="px-2 py-1.5 text-center">
        <ContactUs />
      </div>
    </aside>
  );
}
