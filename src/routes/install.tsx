import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/install")({ component: InstallPage });

function Phone({ src, caption }: { src: string; caption: string }) {
  return (
    <figure className="raised overflow-hidden rounded-2xl">
      <img src={src} alt={caption} className="w-full object-cover object-top" />
      <figcaption className="px-3 py-2 text-[11px] text-muted">{caption}</figcaption>
    </figure>
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
        <p className="mt-2 text-sm text-muted">
          There is no App Store listing yet. This saves the live site as an icon. Same account. Same data. These photos are the real Kilode app on a phone.
        </p>

        <Phone src="/howto/feeds.jpg" caption="This is Kilode on your phone — Feeds." />

        <section className="mt-8">
          <h2 className="text-sm font-extrabold">iPhone / iPad · Safari</h2>
          <ol className="mt-3 space-y-3">
            <li className="space-y-2">
              <div className="flex gap-2 text-[13px] leading-5">
                <span className="grid size-6 shrink-0 place-items-center rounded-md bg-lime-2/15 text-[11px] font-extrabold text-lime-2">1</span>
                Open kilode.ng in Safari. Not Chrome inside Instagram or X.
              </div>
              <Phone src="/install/ios-share.png" caption="Tap Share (the square with the arrow), then Add to Home Screen." />
            </li>
            <li className="flex gap-2 text-[13px] leading-5">
              <span className="grid size-6 shrink-0 place-items-center rounded-md bg-lime-2/15 text-[11px] font-extrabold text-lime-2">2</span>
              Scroll the sheet. Tap Add to Home Screen. Tap Add.
            </li>
            <li className="space-y-2">
              <div className="flex gap-2 text-[13px] leading-5">
                <span className="grid size-6 shrink-0 place-items-center rounded-md bg-lime-2/15 text-[11px] font-extrabold text-lime-2">3</span>
                Kilode sits on your home screen. Open it full-screen.
              </div>
              <Phone src="/install/homescreen.png" caption="Home screen — the Kilode icon." />
            </li>
          </ol>
        </section>

        <section className="mt-8">
          <h2 className="text-sm font-extrabold">Android · Chrome</h2>
          <ol className="mt-3 space-y-3">
            <li className="space-y-2">
              <div className="flex gap-2 text-[13px] leading-5">
                <span className="grid size-6 shrink-0 place-items-center rounded-md bg-lime-2/15 text-[11px] font-extrabold text-lime-2">1</span>
                Open kilode.ng in Chrome.
              </div>
              <Phone src="/install/android-menu.png" caption="Tap the three dots, then Add to Home screen." />
            </li>
            <li className="flex gap-2 text-[13px] leading-5">
              <span className="grid size-6 shrink-0 place-items-center rounded-md bg-lime-2/15 text-[11px] font-extrabold text-lime-2">2</span>
              Tap Add. Open Kilode from your app drawer like any other app.
            </li>
          </ol>
        </section>

        <Link to="/" className="btn-join mt-8 block rounded-lg py-2.5 text-center text-sm font-bold">
          Back to Kilode
        </Link>
      </div>
    </main>
  );
}
