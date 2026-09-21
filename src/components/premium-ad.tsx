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

export function RentCta({ className = "" }: { className?: string }) {
  return (
    <a href="/advertise" className={`btn-join inline-flex items-center justify-center rounded-md px-2.5 py-1 text-[9px] font-extrabold tracking-[0.16em] ${className}`}>
      RENT
    </a>
  );
}

function PremiumShell({ children, compact, rent }: { children: ReactNode; compact?: boolean; rent?: boolean }) {
  return (
    <aside className="overflow-hidden rounded-2xl border border-line bg-panel">
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <span className="text-[10px] font-medium tracking-[0.16em] text-lime-2">PREMIUM ADS</span>
        {compact ? null : rent ? <RentCta /> : <ContactCta />}
      </div>
      <div className="px-2 pb-2">{children}</div>
    </aside>
  );
}

export function PremiumStoryAd({ compact }: { compact?: boolean }) {
  const slots = useAdSlots();
  const slot = slots.find((s) => s.id === "premium_story" && s.enabled);
  const yt = slot?.video ? youtubeId(slot.video) : "";
  const body = slot && yt ? (
    <div className="w-full overflow-hidden rounded-xl bg-black">
      <iframe title="Premium ad" src={`https://www.youtube.com/embed/${yt}?rel=0`} className="mx-auto aspect-[9/16] max-h-[280px] w-auto border-0 bg-black" allow="encrypted-media; fullscreen" loading="lazy" />
    </div>
  ) : slot?.image ? (
    <a href={slot.link || "/advertise"} target={slot.link ? "_blank" : undefined} rel="noreferrer" className="block w-full overflow-hidden rounded-xl bg-black">
      <img src={slot.image} alt="" className="mx-auto max-h-[280px] w-full object-contain" />
    </a>
  ) : (
    <div className={`grid w-full place-items-center rounded-xl bg-black px-4 text-center ${compact ? "h-[132px]" : "h-[176px]"}`}>
      <div>
        <div className="text-[10px] font-medium tracking-[0.16em] text-lime-2">PLACE ADS HERE · AT YOUR DURATION</div>
        <p className="mt-1 text-[10px] font-normal text-white/55">Image or YouTube. Super fills this slot.</p>
      </div>
    </div>
  );
  return <PremiumShell compact={compact}>{body}</PremiumShell>;
}

export function PremiumSquareAd() {
  const slots = useAdSlots();
  const slot = slots.find((s) => s.id === "ads_square" && s.enabled);
  if (slot && (slot.image || slot.video || slot.html || slot.pubId)) {
    return (
      <PremiumShell rent>
        <AdSlot id="ads_square" />
      </PremiumShell>
    );
  }
  return (
    <PremiumShell rent>
      <a href="/advertise" className="grid h-[188px] w-full place-items-center rounded-xl bg-black px-4 text-center">
        <div>
          <div className="text-[11px] font-medium tracking-[0.16em] text-lime-2">PLACE ADS HERE · AT YOUR DURATION</div>
          <p className="mt-2 text-[11px] font-normal text-white/60">Rent this square for your brand. Crypto + staff approve.</p>
        </div>
      </a>
    </PremiumShell>
  );
}

export function MenuPremiumAd() {
  return (
    <aside className="overflow-hidden rounded-2xl border border-line bg-panel">
      <div className="flex items-center justify-between gap-2 px-2.5 py-2">
        <span className="text-[10px] font-medium tracking-[0.16em] text-lime-2">PREMIUM ADS</span>
        <span className="flex items-center gap-3">
          <a href="/login?mode=up" className="news-flash">
            JOIN
          </a>
          <a href="/advertise" className="news-flash">
            RENT
          </a>
        </span>
      </div>
      <div className="px-2 pb-2">
        <a href="/advertise" className="grid h-[96px] w-full place-items-center rounded-xl bg-black px-3 text-center">
          <p className="text-[10px] font-medium tracking-[0.16em] text-lime-2">PLACE ADS HERE · AT YOUR DURATION</p>
        </a>
      </div>
    </aside>
  );
}

export function PortraitAd({ id }: { id: string }) {
  const slots = useAdSlots();
  const slot = slots.find((s) => s.id === id && s.enabled);
  const frame = (child: ReactNode) => (
    <aside className="my-6 overflow-hidden rounded-2xl border border-line bg-panel">
      <div className="flex items-center justify-between px-3 py-2">
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
