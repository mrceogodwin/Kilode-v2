import { useAdSlots } from "@/components/ad-slot";

export function HowKilode() {
  const slots = useAdSlots();
  const yt = slots.find((s) => s.id === "howto_video" && s.enabled && s.video)?.video;
  if (yt) {
    return (
      <div className="overflow-hidden rounded-xl border border-line bg-black">
        <div className="px-2 py-1 text-[9px] font-medium tracking-[0.14em] text-lime-2">HOW KILODE WORKS</div>
        <iframe title="How Kilode works" src={`https://www.youtube.com/embed/${yt}?rel=0`} className="aspect-video w-full border-0" allow="encrypted-media; fullscreen" loading="lazy" />
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-black">
      <div className="px-2 py-1 text-[9px] font-medium tracking-[0.14em] text-lime-2">HOW KILODE WORKS</div>
      <video
        className="aspect-video w-full bg-black"
        src="/howto/how-kilode.mp4"
        poster="/howto/poster.jpg"
        controls
        playsInline
        preload="metadata"
      >
        Your browser cannot play this video.
      </video>
    </div>
  );
}
