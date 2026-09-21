import { useState, type ReactNode } from "react";
import { X } from "lucide-react";

const SCENES = [
  { src: "/howto/feeds.jpg", title: "Feeds", body: "News in a 4-column grid. Open a story for comments, related posts, and Top 10." },
  { src: "/howto/chat.jpg", title: "Forum", body: "Live rooms. Messages expire on a clock Super sets. No links or phone numbers." },
  { src: "/howto/cinema.jpg", title: "Cinema", body: "Watch a YouTube title together. Vote, rate 1–5, take the A–E quiz." },
  { src: "/howto/ads.jpg", title: "Ads", body: "Ten paid slots. Pay crypto. After approval the creative goes live for the days you bought." },
  { src: "/howto/join.jpg", title: "Join", body: "Username + password. Pick a type at register. That type stays unless Super changes it." },
];

export function HowKilode({ className = "", children }: { className?: string; children?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className || "btn-3d rounded-md py-1.5 text-center text-[10px] font-semibold tracking-wide"}>
        {children ?? "How Kilode works"}
      </button>
      {open ? (
        <div className="fixed inset-0 z-[60] grid place-items-end bg-black/70 p-3 sm:place-items-center" onClick={() => setOpen(false)}>
          <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-line bg-panel" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-3 py-2">
              <div>
                <div className="text-[10px] font-medium tracking-[0.16em] text-lime-2">WALKTHROUGH</div>
                <div className="text-sm font-bold">How Kilode works</div>
              </div>
              <button type="button" className="grid size-8 place-items-center rounded-lg border border-line" onClick={() => setOpen(false)} aria-label="Close">
                <X className="size-4" />
              </button>
            </div>
            {failed ? (
              <div className="max-h-[70vh] space-y-3 overflow-y-auto bg-white p-3">
                {SCENES.map((s) => (
                  <div key={s.title} className="grid grid-cols-2 gap-2">
                    <img src={s.src} alt="" className="h-full w-full rounded-md object-cover object-top" />
                    <div className="flex flex-col justify-center px-2">
                      <div className="text-[10px] font-medium tracking-[0.16em] text-lime-2">HOW KILODE WORKS</div>
                      <div className="mt-1 text-lg font-bold text-black">{s.title}</div>
                      <p className="mt-1 text-[12px] leading-snug text-neutral-700">{s.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <video
                className="aspect-video w-full bg-white"
                src="/howto/how-kilode.mp4"
                poster="/howto/poster.jpg"
                controls
                playsInline
                autoPlay
                onError={() => setFailed(true)}
              />
            )}
            <p className="px-3 py-2 text-[11px] leading-snug text-muted">Feeds, Chat, Cinema, Ads, Join — from the live app.</p>
          </div>
        </div>
      ) : null}
    </>
  );
}
