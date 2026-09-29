import { useEffect, useState } from "react";
import { handleColor, handleLabel, isOfficialHandle } from "@/lib/qonvo-data";
import { listVerified } from "@/lib/staff-server";

export function VerifiedMark() {
  return (
    <svg className="verified-mark" viewBox="0 0 22 22" width="15" height="15" aria-label="Verified" role="img">
      <path
        fill="#e6c56a"
        d="M11 1.2 13.1 3l2.6-.5 1.2 2.4 2.5.8-.2 2.6 1.8 1.9-1.6 2.1.6 2.6-2.3 1.3-1 2.5-2.6-.2L11 20.8 8.5 18.5l-2.6.2-1-2.5-2.3-1.3.6-2.6L1.6 10.2 3.4 8.3 3.2 5.7l2.5-.8L6.9 2.5 9.5 3 11 1.2z"
      />
      <path d="M7.4 11.1 9.7 13.4 14.7 8.4" fill="none" stroke="#111" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
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
      {on ? <VerifiedMark /> : null}
    </a>
  );
}
