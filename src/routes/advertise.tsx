import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/advertise")({ component: AdvertisePage });

const MAIL = "kilodeafrica@gmail.com";

export function AdvertisePage() {
  return (
    <main className="min-h-dvh overflow-y-auto bg-bg px-4 py-8 text-fg">
      <div className="mx-auto max-w-lg pb-16">
        <Link to="/" className="text-[12px] text-lime-2">
          ← Kilode
        </Link>
        <p className="mt-6 text-[10px] font-medium tracking-[0.18em] text-lime-2">PREMIUM ADS</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight">Place ads here for 30 days</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Promote your company or business on Kilode. Ten slots, each with its own price and size. You pick type + duration. Pay crypto. After approval the creative goes live for the days you bought, then it drops off.
        </p>
        <ul className="mt-4 space-y-2 text-[13px] leading-snug">
          <li className="raised rounded-xl px-3 py-2">Ads tab — grid tile, featured slider, or square. Featured stays at the top so it is not buried.</li>
          <li className="raised rounded-xl px-3 py-2">Chat stream and pinned chat — highest attention while people talk.</li>
          <li className="raised rounded-xl px-3 py-2">Feeds strip, story portrait, article banners, cinema banner.</li>
          <li className="raised rounded-xl px-3 py-2">Your profile shows days left and views. We never DM a wallet.</li>
        </ul>
        <p className="mt-5 text-sm">
          <a
            href={`mailto:${MAIL}?subject=${encodeURIComponent("Kilode ads placement")}`}
            className="btn-3d inline-flex rounded-md px-3 py-1.5 text-[11px] font-semibold"
          >
            Contact
          </a>
        </p>
        <p className="mt-2 text-[12px] text-muted">{MAIL} · Pay the wallets listed in Place ad. Paste the tx. We do not auto-charge cards.</p>
        <Link to="/login" className="btn-3d mt-6 block rounded-md py-2 text-center text-[12px] font-semibold">
          Join as Ads Poster
        </Link>
      </div>
    </main>
  );
}
