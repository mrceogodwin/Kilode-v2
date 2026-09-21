import { AdSlot, useAdSlots } from "@/components/ad-slot";
import { youtubeId } from "@/lib/qonvo-data";

const ADS_MAIL = "kilodeafrica@gmail.com";

export function ContactCta({ className = "" }: { className?: string }) {
  return (
    <a
      href={`mailto:${ADS_MAIL}?subject=${encodeURIComponent("Kilode ads placement")}`}
      className={`btn-3d inline-flex items-center justify-center rounded-md px-2.5 py-1.5 text-[10px] font-semibold ${className}`}
    >
      Contact
    </a>
  );
}

function PremiumShell({ children, compact }: { children: React.ReactNode; compact?: boolean }) {
  return (
    <aside className="overflow-hidden rounded-2xl border border-line bg-panel">
      <div className="px-3 py-1.5">
        <span className="text-[10px] font-medium tracking-[0.16em] text-lime-2">PREMIUM ADS</span>
      </div>
      {children}
      {compact ? null : (
        <div className="flex justify-center px-3 py-1.5">
          <ContactCta />
        </div>
      )}
    </aside>
  );
}

export function PremiumStoryAd({ compact }: { compact?: boolean }) {
  const slots = useAdSlots();
  const slot = slots.find((s) => s.id === "premium_story" && s.enabled);
  const yt = slot?.video ? youtubeId(slot.video) : "";
  const body = slot && yt ? (
    <div className="mx-auto max-w-[280px]">
      <iframe title="Premium ad" src={`https://www.youtube.com/embed/${yt}?rel=0`} className="aspect-[9/16] w-full border-0 bg-black" allow="encrypted-media; fullscreen" loading="lazy" />
    </div>
  ) : slot?.image ? (
    <a href={slot.link || "/advertise"} target={slot.link ? "_blank" : undefined} rel="noreferrer">
      <img src={slot.image} alt="" className="mx-auto aspect-[9/16] max-h-[420px] w-full max-w-[280px] object-cover" />
    </a>
  ) : (
    <div className={`grid ${compact ? "min-h-[120px]" : "min-h-[180px]"} place-items-center bg-black px-4 text-center`}>
      <div className="text-[10px] font-medium tracking-[0.16em] text-lime-2">PLACE ADS HERE · AT YOUR DURATION</div>
    </div>
  );
  return <PremiumShell compact={compact}>{body}</PremiumShell>;
}

export function PremiumSquareAd() {
  const slots = useAdSlots();
  const slot = slots.find((s) => s.id === "ads_square" && s.enabled);
  if (slot && (slot.image || slot.video || slot.html || slot.pubId)) return <AdSlot id="ads_square" />;
  return (
    <PremiumShell>
      <div className="grid aspect-[16/9] max-h-[160px] place-items-center bg-black px-4 text-center">
        <div className="text-[10px] font-medium tracking-[0.16em] text-lime-2">PLACE ADS HERE · AT YOUR DURATION</div>
      </div>
    </PremiumShell>
  );
}

export function MenuPremiumAd() {
  return (
    <aside className="overflow-hidden rounded-2xl border border-line bg-panel">
      <div className="px-2.5 py-1.5">
        <span className="text-[10px] font-medium tracking-[0.16em] text-lime-2">PREMIUM ADS</span>
      </div>
      <div className="grid min-h-[72px] place-items-center bg-black px-3 py-3 text-center">
        <p className="text-[10px] font-medium tracking-[0.16em] text-lime-2">PLACE ADS HERE · AT YOUR DURATION</p>
      </div>
    </aside>
  );
}

export function PortraitAd({ id }: { id: string }) {
  const slots = useAdSlots();
  const slot = slots.find((s) => s.id === id && s.enabled);
  if (slot && slot.image) {
    const img = <img src={slot.image} alt="" className="mx-auto max-h-52 w-full max-w-[180px] object-cover" />;
    return (
      <div className="my-3 flex justify-center">
        {slot.link ? (
          <a href={slot.link} target="_blank" rel="noreferrer">
            {img}
          </a>
        ) : (
          img
        )}
      </div>
    );
  }
  if (slot && slot.video) {
    return (
      <div className="mx-auto my-3 w-full max-w-[180px] overflow-hidden rounded-lg bg-black">
        <iframe title="Ad" src={`https://www.youtube.com/embed/${slot.video}?rel=0`} className="aspect-[9/16] w-full border-0" allow="encrypted-media" loading="lazy" />
      </div>
    );
  }
  return (
    <div className="mx-auto my-3 grid aspect-[9/16] w-28 place-items-center rounded-lg border border-dashed border-line bg-panel-2 sm:w-32">
      <div className="text-center">
        <div className="text-[8px] font-medium tracking-[0.18em] text-muted">AD</div>
        <div className="mt-0.5 text-[8px] text-muted/70">9:16</div>
      </div>
    </div>
  );
}
