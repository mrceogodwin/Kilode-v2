import { Link } from "@tanstack/react-router";
import { AdSlot, useAdSlots } from "@/components/ad-slot";
import { youtubeId } from "@/lib/qonvo-data";

const ADS_MAIL = "kilodeafrica@gmail.com";

function QuietBtn({ href, children }: { href: string; children: string }) {
  const cls = "btn-3d inline-flex items-center justify-center rounded-md px-2.5 py-1 text-[10px] font-semibold";
  if (href.startsWith("mailto:") || href.startsWith("http")) {
    return (
      <a href={href} className={cls}>
        {children}
      </a>
    );
  }
  return (
    <Link to={href} className={cls}>
      {children}
    </Link>
  );
}

function PremiumHead() {
  return (
    <div className="flex items-center justify-between gap-2 px-3 py-1.5">
      <span className="text-[10px] font-medium tracking-[0.16em] text-lime-2">PREMIUM ADS</span>
      <QuietBtn href="/advertise">Read more</QuietBtn>
    </div>
  );
}

function PremiumActions() {
  return (
    <div className="flex items-center justify-center gap-1.5 px-3 py-1.5">
      <QuietBtn href={`mailto:${ADS_MAIL}?subject=${encodeURIComponent("Kilode ads placement")}`}>Contact</QuietBtn>
      <QuietBtn href="/advertise">Read more</QuietBtn>
    </div>
  );
}

export function PremiumStoryAd({ compact }: { compact?: boolean }) {
  const slots = useAdSlots();
  const slot = slots.find((s) => s.id === "premium_story" && s.enabled);
  const yt = slot?.video ? youtubeId(slot.video) : "";
  return (
    <aside className="overflow-hidden rounded-2xl border border-line bg-panel">
      <PremiumHead />
      {slot && yt ? (
        <div className="mx-auto max-w-[280px]">
          <iframe title="Premium ad" src={`https://www.youtube.com/embed/${yt}?rel=0`} className="aspect-[9/16] w-full border-0 bg-black" allow="encrypted-media; fullscreen" loading="lazy" />
        </div>
      ) : slot?.image ? (
        <a href={slot.link || "/advertise"} target={slot.link ? "_blank" : undefined} rel="noreferrer">
          <img src={slot.image} alt="" className="mx-auto aspect-[9/16] max-h-[420px] w-full max-w-[280px] object-cover" />
        </a>
      ) : (
        <div className={`grid ${compact ? "min-h-[120px]" : "min-h-[180px]"} place-items-center bg-black px-4 text-center`}>
          <div>
            <div className="text-[10px] font-medium tracking-[0.16em] text-lime-2">PLACE ADS HERE · AT YOUR DURATION</div>
            <p className="mt-2 text-[12px] font-normal text-fg/90">Promote your company or business.</p>
          </div>
        </div>
      )}
      <PremiumActions />
    </aside>
  );
}

export function PremiumSquareAd() {
  const slots = useAdSlots();
  const slot = slots.find((s) => s.id === "ads_square" && s.enabled);
  if (slot && (slot.image || slot.video || slot.html || slot.pubId)) return <AdSlot id="ads_square" />;
  return (
    <aside className="mb-3 overflow-hidden rounded-2xl border border-line bg-panel">
      <PremiumHead />
      <div className="grid aspect-[16/9] max-h-[160px] place-items-center bg-black px-4 text-center">
        <div className="text-[10px] font-medium tracking-[0.16em] text-lime-2">PLACE ADS HERE · AT YOUR DURATION</div>
      </div>
      <PremiumActions />
    </aside>
  );
}

export function MenuPremiumAd() {
  return (
    <aside className="overflow-hidden rounded-2xl border border-line bg-panel">
      <PremiumHead />
      <div className="grid min-h-[72px] place-items-center bg-black px-3 py-3 text-center">
        <p className="text-[10px] font-medium tracking-[0.16em] text-lime-2">PLACE ADS HERE · AT YOUR DURATION</p>
      </div>
      <PremiumActions />
    </aside>
  );
}
