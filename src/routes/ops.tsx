import { createFileRoute } from "@tanstack/react-router";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { QonvoScreen } from "@/components/qonvo-screens";
import { useQonvo } from "@/lib/use-qonvo";

export const Route = createFileRoute("/ops")({ component: Ops });

function Ops() {
  const { user, isPending } = useCurrentUserState();
  const store = useQonvo();
  if (isPending) return <div className="grid h-dvh place-items-center bg-bg text-sm text-muted">Checking session…</div>;
  if (!user) {
    if (typeof window !== "undefined") window.location.replace("/login?next=/ops");
    return <div className="grid h-dvh place-items-center bg-bg text-sm text-muted">Opening staff login…</div>;
  }
  return (
    <div className="h-dvh overflow-auto bg-bg text-fg">
      <div className="border-b border-line px-4 py-2 text-xs text-muted">Kilode staff · {user.displayName || "owner"}</div>
      <QonvoScreen id="admin" store={store} onHome={() => { window.location.href = "/"; }} />
    </div>
  );
}
