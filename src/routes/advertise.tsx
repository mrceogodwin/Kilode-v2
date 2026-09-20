import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/advertise")({ component: AdvertisePage });

export function AdvertisePage() {
  return (
    <main className="min-h-dvh overflow-y-auto bg-bg px-4 py-8 text-fg">
      <div className="mx-auto max-w-lg pb-16">
        <Link to="/" className="text-[12px] text-lime-2">
          ← Kilode
        </Link>
        <p className="mt-6 text-[10px] font-medium tracking-[0.18em] text-lime-2">PREMIUM ADS</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight">Rent the 9:16 story on Kilode.ng</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          The portrait slot sits inside a story after comments — same shape as Instagram. Super Admin can also pin a square on the Ads tab and a short strip above the article grid. You do not upload a file to our server for video. You send a YouTube URL or an image. Staff switch it on in /ops.
        </p>
        <ul className="mt-4 space-y-2 text-[13px] leading-snug">
          <li className="raised rounded-xl px-3 py-2">Portrait 9:16 — story inside articles. Highest attention, highest fee.</li>
          <li className="raised rounded-xl px-3 py-2">Square 1:1 — first tile on the Ads tab, before member ads.</li>
          <li className="raised rounded-xl px-3 py-2">Short leader — above Feeds grids. Image or video.</li>
          <li className="raised rounded-xl px-3 py-2">Member ads — 5 formats after crypto. Super Admin approves.</li>
        </ul>
        <p className="mt-5 text-sm">
          Contact:{" "}
          <a href="mailto:kilodeafrica@gmail.com" className="font-bold text-lime-2">
            kilodeafrica@gmail.com
          </a>
        </p>
        <p className="mt-2 text-[12px] text-muted">Pay the wallets Super lists in Place ad. Paste the tx. We do not auto-charge cards.</p>
        <Link to="/login" className="btn-join mt-6 block rounded-lg py-2.5 text-center text-sm font-bold">
          Join as Ads Poster
        </Link>
      </div>
    </main>
  );
}
