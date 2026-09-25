import { createFileRoute, Link } from "@tanstack/react-router";
import { BrandLockup } from "@/components/brand-lockup";

export const Route = createFileRoute("/company")({ component: CompanyPage });

function CompanyPage() {
  return (
    <main className="min-h-dvh bg-bg text-fg">
      <header className="border-b border-line bg-panel px-4 py-3">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link to="/">
            <BrandLockup />
          </Link>
          <Link to="/terms" className="text-[12px] font-semibold text-lime-2">
            Legal
          </Link>
        </div>
      </header>
      <div className="mx-auto max-w-3xl px-4 py-8">
        <p className="text-[10px] font-bold tracking-[0.16em] text-lime-2">COMPANY</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight">Squadglobal Dynasty Ltd.</h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          Squadglobal Dynasty Ltd. operates Kilode. This page is the company record. A fuller profile — address, directors, and contact — will be added here.
        </p>
        <div className="raised mt-6 rounded-2xl p-4 text-[13px] leading-6">
          <p>Product: Kilode, the news and community hub.</p>
          <p className="mt-2">Site: kilode.ng</p>
          <p className="mt-2">Developer credit stays separate: @Builtbystacks.</p>
        </div>
        <p className="mt-8">
          <Link to="/" className="text-sm font-semibold text-lime-2">
            Back to Kilode
          </Link>
        </p>
      </div>
    </main>
  );
}
