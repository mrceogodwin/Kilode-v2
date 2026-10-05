import { createFileRoute, Link } from "@tanstack/react-router";
import { AD_PLACEMENTS, AD_SIZES } from "@/lib/qonvo-data";

export const Route = createFileRoute("/advertise")({ component: AdvertisePage });

export function AdvertisePage() {
  return (
    <main className="min-h-dvh overflow-y-auto bg-bg px-4 py-8 text-fg">
      <div className="mx-auto max-w-lg pb-16">
        <Link to="/" className="text-[12px] text-[#ffd45a]">← Kilode</Link>
        <p className="mt-6 text-[10px] font-bold tracking-[0.18em] text-[#ffd45a]">ADS</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight">Place an ad, one step at a time</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Join as an Ads Poster. Inside Kilode you choose a real slot, add the creative, review it, then pay. Kilode does not mark an ad paid because you opened a success page. These are the slots that exist.
        </p>
        <ul className="mt-4 space-y-2">
          {AD_PLACEMENTS.map((p) => (
            <li key={p.id} className="rounded-2xl border border-[#343434] bg-[#191919] px-3 py-2">
              <div className="flex items-center justify-between gap-2 text-sm font-bold">
                <span>{p.label}</span>
                <span className="text-[#ffd45a]">${p.usd}</span>
              </div>
              <p className="mt-1 text-[12px] text-muted">{AD_SIZES[p.id].label}. {p.hint}</p>
            </li>
          ))}
        </ul>
        <Link to="/login" className="mt-6 block rounded-full bg-[#ffd45a] py-3 text-center text-sm font-extrabold text-[#161616]">
          Join as Ads Poster
        </Link>
      </div>
    </main>
  );
}
