import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { seoHead } from "@/lib/seo";
import appCss from "../styles.css?url";

const base = seoHead({ path: "/" });

function Boot({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="grid min-h-svh place-items-center bg-[#0a0a0a] p-6 text-[#f4f4f5]">
      <div className="max-w-sm text-center">
        <div className="mx-auto mb-3 grid size-10 place-items-center rounded-xl border border-white/10 bg-[#141414] text-xl font-black text-[#8fbc8f]">
          !
        </div>
        <div className="text-xl font-extrabold tracking-tight">Kilode</div>
        <p className="mt-1 text-sm font-semibold">{title}</p>
        <p className="mt-2 text-sm text-white/50">{body}</p>
        {action}
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      ...base.meta,
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: appCss },
      ...base.links,
    ],
    scripts: base.scripts,
    styles: [
      {
        children: "html,body{background:#0a0908;color:#f3efe6;margin:0;min-height:100%;min-height:-webkit-fill-available}",
      },
    ],
  }),
  pendingComponent: () => <Boot title="Opening the room" body="One second…" />,
  errorComponent: ({ error, reset }) => (
    <Boot
      title="Kilode hit a snag"
      body={(error as { message?: string })?.message || "Reload and try again."}
      action={
        <div className="mt-4 flex justify-center gap-2">
          <button type="button" className="rounded-lg border border-white/15 px-3 py-2 text-sm" onClick={() => reset()}>
            Try again
          </button>
          <a href="/" className="rounded-lg border border-white/15 px-3 py-2 text-sm">
            Home
          </a>
        </div>
      }
    />
  ),
  component: () => (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="bg-bg font-sans text-fg antialiased" style={{ background: "#0a0908", color: "#f3efe6", minHeight: "100dvh" }}>
        <PreviewHostBridge />
        <AuthProvider>
          <Outlet />
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  ),
});
