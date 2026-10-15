import { useState } from "react";
import { Bookmark, Store, User, Users, UsersRound, MessageSquare } from "lucide-react";
import { SafetyBlock } from "@/components/me-safety";

function goto(detail: { screen?: string; tab?: string }) {
  window.dispatchEvent(new CustomEvent("kilode:goto", { detail }));
}

/** Temporary slim My Space shell — full desk restored next. Keeps app building. */
export function MeDashboard({ store, onForum, onLogout }: { store: any; onForum?: () => void; onLogout?: () => void | Promise<void> }) {
  const [mePane, setMePane] = useState<null | "blocked" | "muted">(null);
  const authed = !!store?.session?.user;
  const handle = store?.profile?.handle || store?.session?.user?.name || "you";

  if (!authed) {
    return (
      <div className="space-page p-4 pb-24">
        <h2 className="text-xl font-extrabold">My Space</h2>
        <p className="mt-2 text-sm text-muted">Join Kilode to open your desk.</p>
      </div>
    );
  }

  if (mePane === "blocked") {
    return (
      <div className="space-page p-4 pb-24">
        <SafetyBlock mode="blocked" onBack={() => setMePane(null)} />
      </div>
    );
  }
  if (mePane === "muted") {
    return (
      <div className="space-page p-4 pb-24">
        <SafetyBlock mode="muted" onBack={() => setMePane(null)} />
      </div>
    );
  }

  return (
    <div className="space-page p-4 pb-24">
      <div className="me-hero rounded-2xl p-4 mb-4">
        <div className="text-[10px] font-bold tracking-widest opacity-70">MY SPACE</div>
        <h2 className="text-xl font-extrabold mt-1">@{handle}</h2>
        <p className="text-sm opacity-80 mt-1">Full desk is being restored. Safety lists work below.</p>
      </div>
      <div className="me-shortcuts mb-3">
        {(
          [
            ["Blocked", User, () => setMePane("blocked")],
            ["Muted", User, () => setMePane("muted")],
            ["Spaces", Store, () => goto({ screen: "spaces" })],
            ["Messages", MessageSquare, () => goto({ screen: "inbox" })],
            ["Groups", UsersRound, () => goto({ screen: "teams" })],
            ["Friends", Users, () => goto({ tab: "feeds" })],
            ["Saved", Bookmark, () => goto({ tab: "feeds" })],
          ] as const
        ).map(([label, Icon, go]) => (
          <button key={label} type="button" onClick={go} className="me-chip">
            <Icon className="size-3.5 shrink-0" />
            <span>{label}</span>
          </button>
        ))}
      </div>
      <p className="text-[12px] text-muted">
        Staff desk, listings, ads, and artist tools return in the next full me-dashboard restore.
      </p>
      {onLogout ? (
        <button type="button" className="mt-4 text-[13px] font-semibold text-danger" onClick={() => void onLogout()}>
          Log out
        </button>
      ) : null}
    </div>
  );
}
