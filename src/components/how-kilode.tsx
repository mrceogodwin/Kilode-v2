import { useState } from "react";
import { X } from "lucide-react";

export function HowKilode() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-join w-full rounded-xl py-2.5 text-center text-[12px] font-bold tracking-wide"
      >
        HOW KILODE WORKS
      </button>
      {open ? (
        <div className="fixed inset-0 z-[60] grid place-items-end bg-black/70 p-3 sm:place-items-center" onClick={() => setOpen(false)}>
          <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-line bg-panel" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-3 py-2">
              <div>
                <div className="text-[10px] font-medium tracking-[0.16em] text-lime-2">WALKTHROUGH</div>
                <div className="text-sm font-extrabold">How Kilode works</div>
              </div>
              <button type="button" className="grid size-8 place-items-center rounded-lg border border-line" onClick={() => setOpen(false)} aria-label="Close">
                <X className="size-4" />
              </button>
            </div>
            <video
              className="aspect-video w-full bg-black"
              src="/howto/how-kilode.mp4"
              poster="/howto/poster.jpg"
              controls
              playsInline
              autoPlay
            />
            <p className="px-3 py-2 text-[11px] leading-snug text-muted">
              Full walkthrough of Feeds, Chat, Music, Cinema, Ads, and Join. No screenshot slider — this is the video.
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}
