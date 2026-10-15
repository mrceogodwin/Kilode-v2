import { useState } from "react";
import { Bookmark, Store, User, Users, UsersRound, MessageSquare, Briefcase, Megaphone, Radio, Film, Building2, LogOut } from "lucide-react";
import { SafetyBlock } from "@/components/me-safety";
import { STAFF_PATH } from "@/lib/staff-path";

function goto(detail: { screen?: string; tab?: string }) {
  window.dispatchEvent(new CustomEvent("kilode:goto", { detail }));
}

export function MeDashboard({ store, onForum, onLogout }: { store: any; onForum?: () => void; onLogout?: () => void | Promise<void> }) {
  const [mePane, setMePane] = useState<null | "blocked" | "muted">(null);
  const user = store?.session?.user;
  const profile = store?.profile;
  const authed = !!user;
  const handle = profile?.handle || user?.name || "you";
  const kind = profile?.kind || "member";
  const isStaff = !!store?.staff || !!profile?.staff;

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
        <div className="mt-2 flex flex-wrap gap-2">
          <span className="kind-pill rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase">{String(kind).replace(/_/g, " ")}</span>
          {isStaff ? <span className="staff-pill">SUPER ADMIN</span> : null}
        </div>
        <div className="mt-3 flex gap-2">
          <button type="button" className="btn-join rounded-full px-3 py-1.5 text-[12px] font-bold" onClick={() => window.dispatchEvent(new Event("kilode:create"))}>
            New post
          </button>
          <button type="button" className="rounded-full border px-3 py-1.5 text-[12px] font-semibold" onClick={() => goto({ screen: "settings" })}>
            Edit profile
          </button>
        </div>
      </div>

      {isStaff ? (
        <section className="staff-power mb-4 rounded-2xl border p-4">
          <div className="text-[10px] font-bold tracking-widest text-muted">YOUR POWER</div>
          <p className="mt-1 text-[13px]">Staff tools for ops, ads, news, and payouts.</p>
          <a href={STAFF_PATH} className="staff-go">Staff desk</a>
        </section>
      ) : null}

      <div className="me-shortcuts mb-4">
        {(
          [
            ["Friends", Users, () => goto({ tab: "feeds" })],
            ["Follows", Users, () => goto({ tab: "feeds" })],
            ["Saved", Bookmark, () => goto({ tab: "feeds" })],
            ["Blocked", User, () => setMePane("blocked")],
            ["Muted", User, () => setMePane("muted")],
            ["Spaces", Store, () => goto({ screen: "spaces" })],
            ["Groups", UsersRound, () => goto({ screen: "teams" })],
            ["Marketplace", Store, () => goto({ screen: "market" })],
            ["Messages", MessageSquare, () => goto({ screen: "inbox" })],
          ] as const
        ).map(([label, Icon, go]) => (
          <button key={label} type="button" onClick={go} className="me-chip">
            <Icon className="size-3.5 shrink-0" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2">
        {(
          [
            ["Jobs", Briefcase, () => goto({ screen: "jobs" })],
            ["Ads", Megaphone, () => goto({ screen: "ads" })],
            ["Music", Radio, () => goto({ tab: "music" })],
            ["Cinema", Film, () => goto({ tab: "watch" })],
            ["Rent", Building2, () => goto({ screen: "rent" })],
            ["Market", Store, () => goto({ screen: "market" })],
          ] as const
        ).map(([label, Icon, go]) => (
          <button key={label} type="button" onClick={go} className="me-action raised flex items-center gap-2 rounded-2xl p-3 text-left">
            <span className="grid size-8 place-items-center rounded-xl bg-lime-2/15 text-lime-2"><Icon className="size-4" /></span>
            <span className="text-[13px] font-bold">{label}</span>
          </button>
        ))}
      </div>

      {onLogout ? (
        <button type="button" className="mt-2 flex items-center gap-2 text-[13px] font-semibold text-danger" onClick={() => void onLogout()}>
          <LogOut className="size-4" /> Log out
        </button>
      ) : null}
    </div>
  );
}
