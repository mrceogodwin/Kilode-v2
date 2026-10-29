import type { ReactNode } from "react";
import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { seoHead } from "@/lib/seo";
import appCss from "../styles.css?url";
import quoraRefreshCss from "../styles-quora-refresh.css?url";
import { OfflineToast } from "@/components/offline-toast";

const base = seoHead({ path: "/" });

function Boot({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="grid min-h-svh place-items-center bg-[#202124] p-6 text-[#F0F0F1]">
      <div className="max-w-sm text-center">
        <p className="mt-1 text-sm font-semibold">{title}</p>
        <p className="mt-2 text-sm text-[#B8B8BA]">{body}</p>
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
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
      { name: "apple-mobile-web-app-title", content: "Kilode" },
      { name: "theme-color", content: "#202124" },
      ...base.meta,
    ],
    links: [
      { rel: "manifest", href: "/site.webmanifest" },
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
      { rel: "stylesheet", href: quoraRefreshCss },
      ...base.links,
    ],
    scripts: base.scripts,
    styles: [
      {
        children: "html,body{background:#202124;color:#f0f0f1;margin:0;min-height:100%;min-height:-webkit-fill-available}",
      },
    ],
  }),
  pendingComponent: () => <Boot title="Opening Kilode" body="One second…" />,
  errorComponent: ({ error, reset }) => (
    <Boot
      title="Kilode hit a snag"
      body={(error as { message?: string })?.message || "Reload and try again."}
      action={
        <div className="mt-4 flex justify-center gap-2">
          <button type="button" className="rounded-lg border border-[#414247] px-3 py-2 text-sm text-[#F0F0F1]" onClick={() => reset()}>
            Try again
          </button>
          <a href="/" className="rounded-lg border border-[#414247] px-3 py-2 text-sm text-[#F0F0F1]">
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
            __html: `try{var s=localStorage.getItem("kilode-skin-v2");document.documentElement.setAttribute("data-skin","night")}catch(e){document.documentElement.setAttribute("data-skin","night")}`,
          }}
        />
      </head>
      <body className="bg-bg font-sans text-fg antialiased" style={{ minHeight: "100dvh", background: "#202124", color: "#f0f0f1" }}>
        <PreviewHostBridge />
        <OfflineToast />
        <AuthProvider>
          <Outlet />
        </AuthProvider>
        {import.meta.env.PROD ? (
          <script
            dangerouslySetInnerHTML={{
              __html: `if("serviceWorker"in navigator){window.addEventListener("load",function(){navigator.serviceWorker.register("/sw.js").catch(function(){})})}`,
            }}
          />
        ) : null}
        <Scripts />
      </body>
    </html>
  ),
});
