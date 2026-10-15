import { PushDesk } from "@/components/artist-push";

/** Artist push + payouts desk for My Space. */
export function ArtistDesk({ onBack }: { onBack: () => void }) {
  return (
    <section className="mb-4">
      <button type="button" className="mb-3 text-[13px] font-semibold text-lime-2" onClick={onBack}>
        ← Back
      </button>
      <h2 className="text-lg font-extrabold">Artist push</h2>
      <p className="mt-1 mb-3 text-[12px] text-muted">Promote a track on Socials. Pay once — card goes live after confirm.</p>
      <PushDesk artist />
    </section>
  );
}
