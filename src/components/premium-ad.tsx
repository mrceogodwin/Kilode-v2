import { Link } from "@tanstack/react-router";
import { AdSlot, useAdSlots } from "@/components/ad-slot";
import { youtubeId } from "@/lib/qonvo-data";

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
        <div className={`grid ${compact ? "min-h-[160px]" : "min-h-[280px]"} place-items-center bg-black px-4 text-center`}>
          <div>
            <div className="text-[10px] font-medium tracking-[0.16em] text-lime-2">9:16 · INSTAGRAM STORY</div>
            <p className="mt-2 text-sm font-semibold">This portrait is for rent.</p>
            <p className="mt-1 text-[11px] text-muted">Super Admin drops an image or YouTube here from /ops. You pay crypto. Staff approve.</p>
          </div>
        </div>
      )}
      <div className="border-t border-line px-3 py-2 text-center">
        <div className="text-[9px] font-medium tracking-[0.14em] text-muted">FOR ADS PLACEMENT</div>
        <a href="mailto:kilodeafrica@gmail.com" className="text-[12px] font-bold text-lime-2">
          kilodeafrica@gmail.com
        </a>
      </div>
    </aside>
  );
}

export function PremiumSquareAd() {
  const slots = useAdSlots();
  const slot = slots.find((s) => s.id === "ads_square" && s.enabled);
  if (slot) return <AdSlot id="ads_square" />;
  return (
    <aside className="mb-3 overflow-hidden rounded-2xl border border-line bg-panel">
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-[11px] font-extrabold">Premium Ads: Kilode.ng</span>
        <Link to="/advertise" className="text-[10px] font-semibold text-lime-2">
          READ MORE
        </Link>
      </div>
      <div className="grid aspect-square max-h-[280px] place-items-center bg-black px-4 text-center">
        <div>
          <div className="text-[10px] font-medium tracking-[0.16em] text-lime-2">1:1 SQUARE</div>
          <p className="mt-2 text-sm font-semibold">Rent this tile on the Ads tab.</p>
        </div>
      </div>
      <a href="mailto:kilodeafrica@gmail.com" className="block py-2 text-center text-[12px] font-bold text-lime-2">
        kilodeafrica@gmail.com
      </a>
    </aside>
  );
}
