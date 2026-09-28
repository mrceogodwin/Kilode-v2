import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/ops")({ component: ClosedOps });

function ClosedOps() {
  useEffect(() => {
    window.location.replace("/");
  }, []);
  return <div className="grid h-dvh place-items-center bg-bg text-sm text-muted">Going home…</div>;
}
