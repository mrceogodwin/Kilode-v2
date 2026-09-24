import { createFileRoute, Link } from "@tanstack/react-router";
import { ABOUT_LONG, ADS_LONG, CONTACT_LONG, CONTENT_LONG, COOKIES_LONG, LEGAL_NAV, LEGAL_UPDATED, PRIVACY_LONG, RULES_LONG, TERMS_LONG } from "@/lib/legal";
import { HowToGuide } from "@/components/legal-shots";
import { TelegramLink } from "@/components/get-app";
import { BrandLockup } from "@/components/brand-lockup";

export const Route = createFileRoute("/terms")({ component: TermsPage });

const BLOCKS = [
  { id: "about", title: "About Kilode", body: ABOUT_LONG },
  { id: "terms", title: "Terms of Use", body: TERMS_LONG },
  { id: "rules", title: "Community Rules", body: RULES_LONG },
  { id: "content", title: "Content & liability", body: CONTENT_LONG },
  { id: "ads", title: "Ads & crypto", body: ADS_LONG },
  { id: "privacy", title: "Privacy", body: PRIVACY_LONG },
  { id: "cookies", title: "Cookies", body: COOKIES_LONG },
  { id: "contact", title: "Contact", body: CONTACT_LONG },
];

function TermsPage() {
  return (
    <main className="min-h-dvh overflow-y-auto bg-bg text-fg">
      <header className="sticky top-0 z-10 border-b border-line bg-panel/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <Link to="/" className="shrink-0">
            <BrandLockup />
          </Link>
          <Link to="/login" search={{ mode: "up" }} className="btn-join rounded-lg px-3 py-1.5 text-[11px] font-bold">
            Join
          </Link>
        </div>
      </header>
      <div className="mx-auto max-w-3xl px-4 py-8 pb-24">
        <p className="text-[10px] font-bold tracking-[0.18em] text-lime-2">LEGAL</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight">Terms, rules, and how to use Kilode</h1>
        <p className="mt-2 text-sm text-muted">Updated {LEGAL_UPDATED}. Read this before you Join. Staff tools are not described here — they are not a public account type.</p>
        <nav className="mt-5 flex flex-wrap gap-2">
          {LEGAL_NAV.map((n) => (
            <a key={n.id} href={`#${n.id}`} className="rounded-full border border-line px-3 py-1 text-[11px] font-semibold">
              {n.label}
            </a>
          ))}
        </nav>

        <section id="howto" className="mt-10 scroll-mt-20">
          <h2 className="text-xl font-extrabold">How to use Kilode</h2>
          <p className="mt-1 text-sm text-muted">Pick the type that matches what you came to do. You cannot switch it later. Staff tools are not a public type.</p>
          <HowToGuide />
        </section>

        {BLOCKS.map((b) => (
          <section key={b.id} id={b.id} className="mt-10 scroll-mt-20">
            <h2 className="text-xl font-extrabold">{b.title}</h2>
            <div className="raised mt-3 whitespace-pre-wrap rounded-2xl p-4 text-[13px] leading-6 text-fg/90">{b.body}</div>
          </section>
        ))}

        <p className="mt-10 text-center text-[11px] text-muted">
          <Link to="/" className="text-lime-2">
            Back to Kilode
          </Link>
          {" · "}
          <TelegramLink />
        </p>
      </div>
    </main>
  );
}
