import { PublicSiteProvider } from "@/components/site-chrome";
import type { PublicSite } from "@/lib/site-server";
import { SocialFirst } from "@/components/social-first";
import { useQonvo } from "@/lib/use-qonvo";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { useState } from "react";

export function QonvoApp({ initialSite }: { initialSite?: PublicSite } = {}) {
  return (
    <PublicSiteProvider initial={initialSite}>
      <Shell />
    </PublicSiteProvider>
  );
}

function Shell() {
  const store = useQonvo();
  const session = useCurrentUserState();
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className="flex h-svh flex-col bg-bg text-fg">
      <SocialFirst
        me={store.handle || ""}
        face={store.face}
        authed={store.authed || !!session.user}
        news={store.posts}
        onLikes={() => {
          if (!session.user) { window.location.href = "/login?mode=up"; return; }
        }}
        onSend={() => {
          if (!session.user) { window.location.href = "/login"; return; }
        }}
        onCreate={() => {
          if (!session.user) { window.location.href = "/login?mode=up"; return; }
          window.location.href = "/?open=create";
        }}
        onMe={() => {
          if (!session.user) { window.location.href = "/login?mode=up"; return; }
          window.location.href = "/?open=me";
        }}
        onMenu={() => setMenuOpen((v) => !v)}
        onOpenNews={() => {}}
        onNeedAuth={() => { window.location.href = "/login?mode=up"; }}
      />
    </div>
  );
}
