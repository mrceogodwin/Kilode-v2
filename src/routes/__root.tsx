import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { seoHead } from "@/lib/seo";
import appCss from "../styles.css?url";
import { OfficialLockup } from "@/components/brand-lockup";

const base = seoHead({ path: "/" });

function Boot({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="grid min-h-svh place-items-center bg-[#0a0a0a] p-6 text-[#f4f4f5]">
      <div className="max-w-sm text-center">
        <OfficialLockup className="mx-auto mb-3 h-8 w-[148px]" />
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
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=overlays-content" },
      ...base.meta,
    ],
    links: [
      { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon-32.png" },
      { rel: "icon", type: "image/png", sizes: "48x48", href: "/favicon-48.png" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" as const },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Nunito:wght@700;800&family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400&family=Syne:wght@700;800&display=swap",
      },
      { rel: "stylesheet", href: appCss },
      ...base.links,
    ],
    scripts: base.scripts,
    styles: [
      {
        children: "html,body{background:#050706;color:#f4f6f5;margin:0;height:100svh;max-height:100svh;overflow:hidden}",
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
    <html lang="en" data-skin="night" suppressHydrationWarning>
      <head>
        <HeadContent />
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var s=localStorage.getItem("kilode-skin-v2");document.documentElement.setAttribute("data-skin",s==="ivory"?"ivory":"night")}catch(e){document.documentElement.setAttribute("data-skin","night")}`,
          }}
        />
      </head>
      <body className="bg-bg font-sans text-fg antialiased" style={{ height: "100svh", overflow: "hidden" }}>
        <PreviewHostBridge />
        <AuthProvider>
          <Outlet />
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  ),
});
