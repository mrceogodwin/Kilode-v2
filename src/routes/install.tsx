import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/install")({ component: InstallPage });

const IOS = [
  "Open kilode.ng (or this page) in Safari — not Chrome inside Instagram.",
  "Tap the Share icon (square with an arrow up) at the bottom.",
  "Scroll and tap Add to Home Screen.",
  "Tap Add. Kilode sits on your home screen like an app.",
];

const AND = [
  "Open kilode.ng in Chrome.",
  "Tap the three dots at the top right.",
  "Tap Add to Home screen or Install app.",
  "Tap Add. Open it from your app drawer.",
];

function InstallPage() {
  return (
    <main className="min-h-dvh overflow-y-auto bg-bg px-4 py-8 text-fg">
      <div className="mx-auto max-w-md">
        <Link to="/" className="inline-block">
          <img src="/kilode-logo-green.png" alt="Kilode" className="h-9 w-auto max-w-[160px] object-contain" />
        </Link>
        <p className="mt-6 text-[10px] font-bold tracking-[0.18em] text-lime-2">GET THE APP</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight">Add Kilode to your home screen</h1>
        <p className="mt-2 text-sm text-muted">
          There is no App Store listing yet. This is a real install: your phone saves Kilode as an icon and opens it full-screen. Same account. Same data.
        </p>

        <section className="raised mt-6 overflow-hidden rounded-2xl">
          <div className="install-stage relative aspect-[9/16] max-h-[360px] bg-gradient-to-b from-[#1a2a1c] to-[#0a0a0a]">
            <div className="install-phone">
              <div className="install-status" />
              <div className="install-share" />
              <div className="install-menu">Add to Home Screen</div>
              <div className="install-icon" />
            </div>
            <div className="how-cursor install-cursor" />
          </div>
          <p className="px-3 py-2 text-[11px] text-muted">Cursor walks Share → Add to Home Screen → the Kilode icon.</p>
        </section>

        <section className="mt-6">
          <h2 className="text-sm font-extrabold">iPhone / iPad</h2>
          <ol className="mt-2 space-y-2">
            {IOS.map((s, i) => (
              <li key={s} className="raised flex gap-2 rounded-xl p-3 text-[13px] leading-5">
                <span className="grid size-6 shrink-0 place-items-center rounded-md bg-lime-2/15 text-[11px] font-extrabold text-lime-2">{i + 1}</span>
                {s}
              </li>
            ))}
          </ol>
        </section>
        <section className="mt-6">
          <h2 className="text-sm font-extrabold">Android</h2>
          <ol className="mt-2 space-y-2">
            {AND.map((s, i) => (
              <li key={s} className="raised flex gap-2 rounded-xl p-3 text-[13px] leading-5">
                <span className="grid size-6 shrink-0 place-items-center rounded-md bg-lime-2/15 text-[11px] font-extrabold text-lime-2">{i + 1}</span>
                {s}
              </li>
            ))}
          </ol>
        </section>
        <Link to="/" className="btn-join mt-8 mb-10 block rounded-lg py-2.5 text-center text-sm font-bold">
          Back to Kilode
        </Link>
      </div>
    </main>
  );
}
