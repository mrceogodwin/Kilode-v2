import { useEffect, useState } from "react";
import { listAdSlots } from "@/lib/ad-slots-server";
import { isAdUnit, isPubId, type AdSlotRow } from "@/lib/ad-slots";

let cached: AdSlotRow[] | null = null;
let inflight: Promise<AdSlotRow[]> | null = null;

function loadSlots() {
  if (cached) return Promise.resolve(cached);
  if (inflight) return inflight;
  inflight = listAdSlots()
    .then((rows) => {
      cached = rows;
      return rows;
    })
    .catch(() => [] as AdSlotRow[])
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export function useAdSlots() {
  const [rows, setRows] = useState<AdSlotRow[]>(cached ?? []);
  useEffect(() => {
    void loadSlots().then(setRows);
  }, []);
  return rows;
}

function GoogleIns({ client, slot }: { client: string; slot: string }) {
  useEffect(() => {
    const id = "kilode-adsbygoogle";
    if (!document.getElementById(id)) {
      const s = document.createElement("script");
      s.id = id;
      s.async = true;
      s.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=" + encodeURIComponent(client);
      s.crossOrigin = "anonymous";
      document.head.appendChild(s);
    }
    try {
      ((window as unknown as { adsbygoogle?: unknown[] }).adsbygoogle ||= []).push({});
    } catch {
      /* ignore */
    }
  }, [client, slot]);
  return (
    <ins
      className="adsbygoogle"
      style={{ display: "block", minHeight: 90 }}
      data-ad-client={client}
      data-ad-slot={slot}
      data-ad-format="auto"
      data-full-width-responsive="true"
    />
  );
}

export function AdSlot({ id, className = "", quiet }: { id: string; className?: string; quiet?: boolean }) {
  const rows = useAdSlots();
  const slot = rows.find((r) => r.id === id && r.enabled);
  if (!slot) return null;
  if (slot.kind === "google" && isPubId(slot.pubId) && isAdUnit(slot.adUnit)) {
    return (
      <div className={`ad-box overflow-hidden rounded-xl border border-line bg-panel ${className}`}>
        {quiet ? null : <div className="px-2 pt-1 text-[9px] font-medium tracking-[0.14em] text-muted">AD</div>}
        <GoogleIns client={slot.pubId} slot={slot.adUnit} />
      </div>
    );
  }
  if (slot.kind === "video" && slot.video) {
    return (
      <div className={`ad-box overflow-hidden rounded-xl border border-line bg-black ${className}`}>
        {quiet ? null : <div className="px-2 py-1 text-[9px] font-medium tracking-[0.14em] text-muted">AD</div>}
        <iframe title={slot.label || "Ad"} src={`https://www.youtube.com/embed/${slot.video}?rel=0`} className="aspect-video w-full border-0" allow="encrypted-media; fullscreen" loading="lazy" />
      </div>
    );
  }
  if (slot.kind === "html" && slot.html) {
    return (
      <div className={`ad-box overflow-hidden rounded-xl border border-line bg-panel ${className}`}>
        {quiet ? null : <div className="px-2 pt-1 text-[9px] font-medium tracking-[0.14em] text-muted">AD</div>}
        <iframe title="Ad" sandbox="allow-popups allow-popups-to-escape-sandbox allow-scripts" srcDoc={slot.html} className="h-24 w-full border-0 bg-transparent" />
      </div>
    );
  }
  if (slot.image) {
    const inner = <img src={slot.image} alt="" className={quiet ? "max-h-10 w-full object-cover" : "max-h-28 w-full object-cover"} />;
    return (
      <div className={`ad-box overflow-hidden rounded-xl border border-line bg-panel ${className}`}>
        {quiet ? null : <div className="px-2 pt-1 text-[9px] font-medium tracking-[0.14em] text-muted">AD</div>}
        {slot.link ? (
          <a href={slot.link} target="_blank" rel="noopener noreferrer">
            {inner}
          </a>
        ) : (
          inner
        )}
      </div>
    );
  }
  return null;
}

export function AdSlotOrEmpty({ id, label, className = "" }: { id: string; label: string; className?: string }) {
  const rows = useAdSlots();
  const slot = rows.find((r) => r.id === id && r.enabled);
  if (slot && (slot.image || slot.video || (slot.pubId && slot.adUnit) || slot.html)) {
    return <AdSlot id={id} className={className} />;
  }
  return null;
}

/** Reserved flat strip. No label. Super fills it from the console. */
export function FlatAdBox({ id, className = "" }: { id: string; className?: string }) {
  const rows = useAdSlots();
  const slot = rows.find((r) => r.id === id && r.enabled);
  if (slot && (slot.image || slot.video || slot.html || (slot.pubId && slot.adUnit))) {
    return <AdSlot id={id} quiet className={className} />;
  }
  return <div className={`min-h-[40px] rounded-md bg-panel-2 ${className}`} aria-hidden />;
}

/** Always-visible reserved Google / banner box. Fills when a unit is pasted. */
export function AdReserve({ id, className = "", minH = "min-h-[72px]" }: { id: string; className?: string; minH?: string }) {
  const rows = useAdSlots();
  const slot = rows.find((r) => r.id === id && r.enabled);
  if (slot && (slot.image || slot.video || slot.html || (slot.pubId && slot.adUnit))) {
    return <AdSlot id={id} className={className} />;
  }
  return (
    <div className={`grid ${minH} place-items-center rounded-lg border border-dashed border-line bg-panel-2 ${className}`}>
      <div className="px-2 py-2 text-center">
        <div className="text-[8px] font-medium tracking-[0.18em] text-muted">ADVERTISEMENT</div>
        <div className="mt-0.5 text-[9px] text-muted/70">Google AdSense</div>
      </div>
    </div>
  );
}
