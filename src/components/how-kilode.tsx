import { useEffect, useState } from "react";
import { Pause, Play } from "lucide-react";
import { useAdSlots } from "@/components/ad-slot";

const SCENES = [
  { t: "Feeds", d: "News tiles. Tap a card. Full story, comments, share." },
  { t: "Chat", d: "Live rooms. Sign in to send. Messages expire on the timer Super sets." },
  { t: "Music", d: "Artists paste a Spotify / SoundCloud URL. We embed their player." },
  { t: "Cinema", d: "Watch a YouTube title together. Vote once a day." },
  { t: "Ads", d: "Ads Poster pays crypto. Staff approve. Then it goes live." },
  { t: "Join", d: "Username + password. Pick a type once. No email." },
];

function MiniShot({ i }: { i: number }) {
  if (i === 0) {
    return (
      <div className="grid h-full grid-cols-3 gap-1 p-2">
        {Array.from({ length: 6 }).map((_, n) => (
          <div key={n} className="overflow-hidden rounded-md bg-black/40">
            <div className="h-8 bg-lime-2/25" />
            <div className="m-1 h-1.5 w-4/5 rounded bg-white/25" />
            <div className="m-1 h-1 w-2/3 rounded bg-white/15" />
          </div>
        ))}
      </div>
    );
  }
  if (i === 1) {
    return (
      <div className="flex h-full flex-col justify-end gap-1.5 p-3">
        <div className="max-w-[80%] rounded-2xl bg-white/10 px-2 py-1.5 text-[9px]">Who dey here?</div>
        <div className="ml-auto max-w-[80%] rounded-2xl bg-lime-2/30 px-2 py-1.5 text-[9px]">We live · Sports</div>
        <div className="h-6 rounded-full bg-white/10" />
      </div>
    );
  }
  if (i === 2) {
    return (
      <div className="flex h-full items-center gap-2 p-3">
        <div className="grid size-12 place-items-center rounded-full bg-lime-2/40 text-[10px] font-bold">▶</div>
        <div className="min-w-0 flex-1">
          <div className="h-2 w-3/4 rounded bg-white/40" />
          <div className="mt-1 h-1.5 w-1/2 rounded bg-white/20" />
        </div>
      </div>
    );
  }
  if (i === 3) {
    return (
      <div className="flex h-full flex-col p-2">
        <div className="flex-1 rounded-lg bg-black/50" />
        <div className="mt-1 flex gap-1">
          {["Vote", "Watch"].map((x) => (
            <div key={x} className="flex-1 rounded-md bg-lime-2/30 py-1 text-center text-[8px] font-bold">
              {x}
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (i === 4) {
    return (
      <div className="grid h-full grid-cols-2 gap-1 p-2">
        {["Image", "Video", "Pin", "Chat"].map((x) => (
          <div key={x} className="grid place-items-center rounded-md bg-white/10 text-[8px] font-semibold">
            {x}
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="flex h-full flex-col justify-center gap-1.5 p-4">
      <div className="h-6 rounded-md bg-white/10" />
      <div className="h-6 rounded-md bg-white/10" />
      <div className="h-7 rounded-md bg-lime-2/50" />
    </div>
  );
}

export function HowKilode() {
  const slots = useAdSlots();
  const yt = slots.find((s) => s.id === "howto_video" && s.enabled && s.video)?.video;
  const [i, setI] = useState(0);
  const [play, setPlay] = useState(true);
  useEffect(() => {
    if (!play || yt) return;
    const t = window.setInterval(() => setI((n) => (n + 1) % SCENES.length), 3200);
    return () => window.clearInterval(t);
  }, [play, yt]);
  if (yt) {
    return (
      <div className="mb-3 overflow-hidden rounded-2xl border border-line bg-black">
        <div className="px-2 py-1 text-[9px] font-bold tracking-[0.14em] text-lime-2">HOW KILODE WORKS</div>
        <iframe title="How Kilode works" src={`https://www.youtube.com/embed/${yt}?rel=0`} className="aspect-video w-full border-0" allow="encrypted-media; fullscreen" loading="lazy" />
      </div>
    );
  }
  const s = SCENES[i];
  return (
    <div className="mb-3 overflow-hidden rounded-2xl border border-line bg-panel">
      <div className="flex items-center justify-between px-2 py-1">
        <div className="text-[9px] font-bold tracking-[0.14em] text-lime-2">HOW KILODE WORKS</div>
        <button type="button" className="grid size-6 place-items-center rounded-md border border-line" aria-label={play ? "Pause" : "Play"} onClick={() => setPlay((v) => !v)}>
          {play ? <Pause className="size-3" /> : <Play className="size-3" />}
        </button>
      </div>
      <div className="relative mx-2 mb-2 aspect-video overflow-hidden rounded-xl bg-gradient-to-br from-[#1a2a1c] to-[#0c0c0c]">
        <MiniShot i={i} />
        <div className="how-cursor" />
      </div>
      <div className="px-2 pb-2">
        <div className="text-[12px] font-extrabold">{s.t}</div>
        <p className="text-[10px] leading-snug text-muted">{s.d}</p>
        <div className="mt-1.5 flex gap-1">
          {SCENES.map((_, n) => (
            <button key={n} type="button" className={`h-1 flex-1 rounded-full ${n === i ? "bg-lime-2" : "bg-white/10"}`} onClick={() => { setI(n); setPlay(false); }} aria-label={SCENES[n].t} />
          ))}
        </div>
      </div>
    </div>
  );
}
