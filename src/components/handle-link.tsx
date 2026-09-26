import { useEffect, useState } from "react";
import { handleColor, handleLabel, isOfficialHandle } from "@/lib/qonvo-data";
import { listVerified } from "@/lib/staff-server";

let cached = new Set<string>();
let asked = false;

export function HandleLink({ handle, className = "text-xs font-bold", verified, live }: { handle: string; className?: string; verified?: boolean; live?: boolean }) {
  const [, bump] = useState(0);
  useEffect(() => {
    if (asked) return;
    asked = true;
    void listVerified()
      .then((rows) => {
        cached = new Set(rows.map((h) => h.toLowerCase()));
        bump((n) => n + 1);
      })
      .catch(() => undefined);
  }, []);
  const raw = handle ?? "";
  const label = handleLabel(raw || "user");
  const on = verified || isOfficialHandle(raw) || cached.has(raw.replace(/^@/, "").toLowerCase()) || cached.has(label.toLowerCase());
  const href = `/u/${encodeURIComponent(isOfficialHandle(raw) ? "Kilode.ng" : raw.replace(/^@/, "") || "user")}`;
  return (
    <a href={href} className={`inline-flex items-center gap-0.5 ${className}`} style={{ color: handleColor(raw || "user") }}>
      <span>@{label}</span>
      {live ? <span className="live-dot" title="Active now" aria-label="Active now" /> : null}
      {on ? (
        <span className="verified-mark" title="Kilode Verified" aria-label="Kilode Verified">
          ✓
        </span>
      ) : null}
    </a>
  );
}
