import { useEffect, useState } from "react";
import { useAdSlots } from "@/components/ad-slot";

const SCENES = [
  { img: "/howto/feeds.jpg", t: "Feeds", d: "News tiles. Tap a card for the full story, comments, and share." },
  { img: "/howto/chat.jpg", t: "Chat is the forum", d: "Live rooms. No links. No phone numbers. Lines expire on Super’s clock." },
  { img: "/howto/feeds.jpg", t: "Music", d: "Artists paste Spotify or SoundCloud. We embed. We never host the file." },
  { img: "/howto/cinema.jpg", t: "Cinema", d: "Watch a YouTube title together. Vote, rate, take the A–E quiz." },
  { img: "/howto/ads.jpg", t: "Ads", d: "Ads Poster pays crypto. Staff approve. Then it goes live." },
  { img: "/howto/join.jpg", t: "Join", d: "Username + password. One account type. Tick Terms. No email." },
];

export function HowKilode() {
  const slots = useAdSlots();
  const yt = slots.find((s) => s.id === "howto_video" && s.enabled && s.video)?.video;
  const [i, setI] = useState(0);
  useEffect(() => {
    if (yt) return;
    const t = window.setInterval(() => setI((n) => (n + 1) % SCENES.length), 4200);
    return () => window.clearInterval(t);
  }, [yt]);
  if (yt) {
    return (
      <div className="overflow-hidden rounded-xl border border-line bg-black">
        <div className="px-2 py-1 text-[9px] font-medium tracking-[0.14em] text-lime-2">HOW KILODE WORKS</div>
        <iframe title="How Kilode works" src={`https://www.youtube.com/embed/${yt}?rel=0`} className="aspect-video w-full border-0" allow="encrypted-media; fullscreen" loading="lazy" />
      </div>
    );
  }
  const s = SCENES[i];
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-white text-black">
      <div className="flex items-center justify-between px-2 py-1">
        <div className="text-[9px] font-medium tracking-[0.14em] text-[#1f7a40]">HOW KILODE WORKS</div>
        <div className="flex gap-0.5">
          {SCENES.map((_, n) => (
            <button key={n} type="button" className={`h-1 w-3 rounded-full ${n === i ? "bg-[#1f7a40]" : "bg-black/15"}`} onClick={() => setI(n)} aria-label={SCENES[n].t} />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-5 items-stretch gap-0">
        <div className="relative col-span-3 bg-[#f3f6f4]">
          <img src={s.img} alt="" className="how-zoom h-full max-h-[168px] w-full object-cover object-top" />
          <span className="how-arrow" />
        </div>
        <div className="col-span-2 flex flex-col justify-center px-2 py-2">
          <div className="text-[15px] font-extrabold leading-tight tracking-tight">{s.t}</div>
          <p className="mt-1 text-[10px] leading-snug text-black/65">{s.d}</p>
        </div>
      </div>
      <video className="sr-only" src="/howto/how-kilode.mp4" preload="none" />
    </div>
  );
}
