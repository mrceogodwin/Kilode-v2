import type { ReactNode } from "react";
import { AdSlot, useAdSlots } from "@/components/ad-slot";
import { youtubeId } from "@/lib/qonvo-data";

const ADS_MAIL = "kilodeafrica@gmail.com";

export function ContactCta({ className = "" }: { className?: string }) {
  return (
    <a
      href={`mailto:${ADS_MAIL}?subject=${encodeURIComponent("Kilode ads placement")}`}
      className={`inline-flex items-center justify-center rounded-md border border-line bg-transparent px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.16em] ${className}`}
    >
      CONTACT
    </a>
  );
}

function PremiumShell({ children, compact }: { children: ReactNode; compact?: boolean }) {
  return (
    <aside className="overflow-hidden rounded-2xl border border-line bg-panel">
      <div className="flex items-center justify-between gap-2 px-3 py-1.5">
        <span className="text-[10px] font-medium tracking-[0.16em] text-lime-2">PREMIUM ADS</span>
        {compact ? null : <ContactCta />}
      </div>
      {children}
    </aside>
  );
}

export function PremiumStoryAd({ compact }: { compact?: boolean }) {
  const slots = useAdSlots();
  const slot = slots.find((s) => s.id === "premium_story" && s.enabled);
  const yt = slot?.video ? youtubeId(slot.video) : "";
  const body = slot && yt ? (
    <div className="w-full bg-black">
      <iframe title="Premium ad" src={`https://www.youtube.com/embed/${yt}?rel=0`} className="mx-auto aspect-[9/16] max-h-[280px] w-auto border-0 bg-black" allow="encrypted-media; fullscreen" loading="lazy" />
    </div>
  ) : slot?.image ? (
    <a href={slot.link || "/advertise"} target={slot.link ? "_blank" : undefined} rel="noreferrer" className="block w-full bg-black">
      <img src={slot.image} alt="" className="mx-auto max-h-[280px] w-full object-contain" />
    </a>
  ) : (
    <div className={`grid w-full place-items-center bg-black px-4 text-center ${compact ? "h-[120px]" : "h-[160px]"}`}>
      <div className="text-[10px] font-medium tracking-[0.16em] text-lime-2">PLACE ADS HERE · AT YOUR DURATION</div>
    </div>
  );
  return <PremiumShell compact={compact}>{body}</PremiumShell>;
}

export function PremiumSquareAd() {
  const slots = useAdSlots();
  const slot = slots.find((s) => s.id === "ads_square" && s.enabled);
  if (slot && (slot.image || slot.video || slot.html || slot.pubId)) {
    return (
      <PremiumShell>
        <AdSlot id="ads_square" />
      </PremiumShell>
    );
  }
  return (
    <PremiumShell>
      <div className="grid h-[148px] w-full place-items-center bg-black px-4 text-center">
        <div className="text-[10px] font-medium tracking-[0.16em] text-lime-2">PLACE ADS HERE · AT YOUR DURATION</div>
      </div>
    </PremiumShell>
  );
}

export function MenuPremiumAd() {
  return (
    <aside className="overflow-hidden rounded-2xl border border-line bg-panel">
      <div className="flex items-center justify-between gap-2 px-2.5 py-1.5">
        <span className="text-[10px] font-medium tracking-[0.16em] text-lime-2">PREMIUM ADS</span>
        <ContactCta />
      </div>
      <div className="grid h-[88px] w-full place-items-center bg-black px-3 text-center">
        <p className="text-[10px] font-medium tracking-[0.16em] text-lime-2">PLACE ADS HERE · AT YOUR DURATION</p>
      </div>
    </aside>
  );
}

export function PortraitAd({ id }: { id: string }) {
  const slots = useAdSlots();
  const slot = slots.find((s) => s.id === id && s.enabled);
  const frame = (child: ReactNode) => (
    <aside className="my-3 overflow-hidden rounded-2xl border border-line bg-panel">
      <div className="flex items-center justify-between px-3 py-1.5">
        <span className="text-[10px] font-medium tracking-[0.16em] text-lime-2">PORTRAIT ADS</span>
        <ContactCta />
      </div>
      <div className="flex w-full justify-center bg-black">{child}</div>
    </aside>
  );
  if (slot && slot.image) {
    const img = <img src={slot.image} alt="" className="max-h-64 w-full object-contain" />;
    return frame(
      slot.link ? (
        <a href={slot.link} target="_blank" rel="noreferrer" className="block w-full">
          {img}
        </a>
      ) : (
        img
      ),
    );
  }
  if (slot && slot.video) {
    return frame(
      <iframe title="Ad" src={`https://www.youtube.com/embed/${slot.video}?rel=0`} className="aspect-[9/16] max-h-64 w-auto border-0" allow="encrypted-media" loading="lazy" />,
    );
  }
  return frame(
    <div className="grid h-52 w-full place-items-center px-4 text-center">
      <div>
        <div className="text-[10px] font-medium tracking-[0.16em] text-lime-2">PLACE ADS HERE · 9:16</div>
        <div className="mt-1 text-[9px] text-muted">Company portrait</div>
      </div>
    </div>,
  );
}
