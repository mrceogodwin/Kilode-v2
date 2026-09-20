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
          Promote your company or business on Kilode.ng. The portrait slot sits inside every story — that is the hybrid display: one creative, many pages. Super Admin can also pin a square on the Ads tab and a strip above Feeds. Duration is 1, 7, 14 or 30 days. When the window ends the creative drops off.
        </p>
        <ul className="mt-4 space-y-2 text-[13px] leading-snug">
          <li className="raised rounded-xl px-3 py-2">Portrait on every story — highest attention, 30-day package.</li>
          <li className="raised rounded-xl px-3 py-2">Square on the Ads tab, grouped by 30 / 7 / 1 day grids.</li>
          <li className="raised rounded-xl px-3 py-2">Chat stream and pinned chat — separate fees. Super places company banners before and after Top 10.</li>
          <li className="raised rounded-xl px-3 py-2">You pick type + duration. Pay crypto. Staff approve. Your profile shows days left and views.</li>
        </ul>
        <p className="mt-5 text-sm">
          <a
            href={`mailto:${MAIL}?subject=${encodeURIComponent("Kilode ads placement")}`}
            className="btn-join inline-flex rounded-lg px-4 py-2 text-[12px] font-bold"
          >
            CONTACT US
          </a>
        </p>
        <p className="mt-2 text-[12px] text-muted">{MAIL} · Pay the wallets Super lists in Place ad. Paste the tx. We do not auto-charge cards.</p>
        <Link to="/login" className="btn-join mt-6 block rounded-lg py-2.5 text-center text-sm font-bold">
          Join as Ads Poster
        </Link>
      </div>
    </main>
  );
}
