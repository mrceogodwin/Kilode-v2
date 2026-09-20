import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/install")({ component: InstallPage });

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <li className="flex gap-3">
      <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-lime-2/15 text-[12px] font-extrabold text-lime-2">{n}</span>
      <div>
        <div className="text-[13px] font-bold">{title}</div>
        <p className="mt-0.5 text-[12px] leading-5 text-muted">{body}</p>
      </div>
    </li>
  );
}

function InstallPage() {
  return (
    <main className="min-h-dvh overflow-y-auto bg-bg px-4 py-8 text-fg">
      <div className="mx-auto max-w-md pb-12">
        <Link to="/" className="inline-block">
          <img src="/kilode-logo-green.png" alt="Kilode" className="h-9 w-auto max-w-[160px] object-contain" />
        </Link>
        <p className="mt-6 text-[10px] font-medium tracking-[0.18em] text-lime-2">GET THE APP</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight">Add Kilode to your home screen</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          There is no App Store listing yet. This saves kilode.ng as an icon. Same account. Same data. It opens full-screen like an app.
        </p>

        <section className="raised mt-6 rounded-2xl p-4">
          <h2 className="text-sm font-extrabold">iPhone / iPad · Safari only</h2>
          <ol className="mt-3 space-y-3">
            <Step n="1" title="Open Safari" body="Type kilode.ng. Do not use Chrome inside Instagram, X, or WhatsApp — those browsers cannot add to Home Screen." />
            <Step n="2" title="Tap Share" body="The square with the up-arrow at the bottom of Safari." />
            <Step n="3" title="Add to Home Screen" body="Scroll the sheet. Tap Add to Home Screen. Tap Add. Kilode sits next to your other apps." />
          </ol>
          <img src="/install/ios-share.png" alt="Safari share sheet — Add to Home Screen" className="mt-3 max-h-44 w-full rounded-xl object-cover object-top" />
        </section>

        <section className="raised mt-4 rounded-2xl p-4">
          <h2 className="text-sm font-extrabold">Android · Chrome</h2>
          <ol className="mt-3 space-y-3">
            <Step n="1" title="Open Chrome" body="Go to kilode.ng." />
            <Step n="2" title="Menu" body="Tap the three dots at the top right." />
            <Step n="3" title="Add to Home screen" body="Tap Add. Open Kilode from your app drawer like any other app." />
          </ol>
          <img src="/install/android-menu.png" alt="Chrome menu — Add to Home screen" className="mt-3 max-h-44 w-full rounded-xl object-cover object-top" />
        </section>

        <p className="mt-5 text-[12px] leading-relaxed text-muted">
          Notifications on the device still need you to tap Allow on the bell. Password reset is not by email — staff can reset a handle from /ops if you prove it is yours.
        </p>

        <Link to="/" className="btn-join mt-6 block rounded-lg py-2.5 text-center text-sm font-bold">
          Back to Kilode
        </Link>
      </div>
    </main>
  );
}
