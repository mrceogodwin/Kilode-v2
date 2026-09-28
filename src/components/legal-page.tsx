import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { LEGAL_PAGES, LEGAL_UPDATED } from "@/lib/legal";
import { OfficialLockup } from "@/components/brand-lockup";

function sectionsOf(raw: string) {
  const chunks = raw.replace(/\r/g, "").trim().split(/\n\n+/);
  const out: { n: string; title: string; lines: string[] }[] = [];
  for (const chunk of chunks) {
    const lines = chunk.split("\n").map((l) => l.trim()).filter(Boolean);
    if (!lines.length) continue;
    const head = lines[0];
    if (/^last updated/i.test(head)) continue;
    if (out.length === 0 && lines.length === 1 && head.length < 48 && !head.includes(".")) continue;
    const numbered = head.match(/^(\d+)\.\s+(.+)$/);
    if (numbered) {
      out.push({ n: numbered[1], title: numbered[2], lines: lines.slice(1) });
      continue;
    }
    if (head.startsWith("- ")) {
      out.push({ n: "", title: "", lines });
      continue;
    }
    out.push({ n: "", title: lines.length > 1 && head.length < 72 ? head : "", lines: lines.length > 1 && head.length < 72 ? lines.slice(1) : lines });
  }
  return out;
}

export function LegalPage({
  title,
  lede,
  body,
  children,
}: {
  title: string;
  lede: string;
  body?: string;
  children?: ReactNode;
}) {
  const sections = body ? sectionsOf(body) : [];
  return (
    <main className="min-h-dvh w-full max-w-[100vw] overflow-x-clip bg-bg text-fg">
      <header className="sticky top-0 z-20 border-b border-line bg-bg/95 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <Link to="/" className="min-w-0 shrink" aria-label="Kilode home">
            <OfficialLockup className="kilode-lockup" />
          </Link>
          <Link to="/" className="shrink-0 rounded-full border border-line px-3 py-1.5 text-[12px] font-bold">
            Open app
          </Link>
        </div>
      </header>
      <div className="mx-auto grid w-full min-w-0 max-w-5xl grid-cols-[minmax(0,1fr)] gap-6 px-4 py-6 md:grid-cols-[210px_minmax(0,1fr)] md:py-10">
        <nav className="min-w-0 md:sticky md:top-20 md:self-start" aria-label="Policies">
          <p className="mb-2 text-[10px] font-bold tracking-[0.18em] text-lime-2">POLICIES</p>
          <div className="flex max-w-full gap-1.5 overflow-x-auto pb-1 md:flex-col md:overflow-visible md:pb-0">
            {LEGAL_PAGES.map((p) => {
              const on = p.label === title;
              return (
                <Link
                  key={p.href}
                  to={p.href}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-[12px] font-semibold md:rounded-xl ${on ? "bg-[#FACC15] text-black" : "border border-line bg-panel text-fg"}`}
                >
                  {p.label}
                </Link>
              );
            })}
          </div>
        </nav>
        <article className="min-w-0">
          <p className="text-[10px] font-bold tracking-[0.18em] text-lime-2">KILODE</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight break-words">{title}</h1>
          <p className="mt-2 text-[12px] text-muted">Updated {LEGAL_UPDATED}. Nigeria. Not a staff manual.</p>
          <p className="mt-4 break-words text-[15px] leading-7">{lede}</p>
          <div className="mt-6 space-y-3">
            {sections.map((s) => (
              <section key={`${s.n}-${s.title}-${s.lines[0] ?? "x"}`} className="min-w-0 rounded-2xl border border-line bg-panel p-4">
                <div className="flex min-w-0 items-start gap-3">
                  {s.n ? (
                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#FACC15] text-[12px] font-extrabold text-black">{s.n}</span>
                  ) : null}
                  <div className="min-w-0 flex-1">
                    {s.title ? <h2 className="break-words text-[15px] font-extrabold leading-snug">{s.title}</h2> : null}
                    {s.lines.some((l) => l.startsWith("- ")) ? (
                      <ul className={`${s.title ? "mt-2" : ""} space-y-1.5 break-words text-[13px] leading-6 text-fg/90`}>
                        {s.lines.map((l) => (
                          <li key={l}>{l.replace(/^- /, "")}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className={`${s.title ? "mt-1" : ""} break-words whitespace-pre-wrap text-[13px] leading-6 text-fg/90`}>{s.lines.join("\n")}</p>
                    )}
                  </div>
                </div>
              </section>
            ))}
          </div>
          {children}
          <p className="mt-8 text-[12px] text-muted">
            <Link to="/company" className="font-semibold text-lime-2">
              Squadglobal Dynasty Ltd.
            </Link>
            {" · "}
            <Link to="/" className="font-semibold text-lime-2">
              Back to Kilode
            </Link>
          </p>
        </article>
      </div>
    </main>
  );
}
