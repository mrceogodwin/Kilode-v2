import { useEffect, useState } from "react";
import { AvatarImg } from "@/components/account-kind";
import { listMyBlocks, listMyMutes, toggleBlock, toggleMute } from "@/lib/takes-server";

export function SafetyBlock({ mode, onBack }: { mode: "blocked" | "muted"; onBack: () => void }) {
  const [rows, setRows] = useState<{ id: string; handle: string }[]>([]);
  const load = () => {
    const fn = mode === "blocked" ? listMyBlocks : listMyMutes;
    void fn()
      .then((r) => setRows(Array.isArray(r) ? r : []))
      .catch(() => setRows([]));
  };
  useEffect(() => {
    load();
  }, [mode]);
  return (
    <section className="mb-4">
      <button type="button" className="mb-3 text-[13px] font-semibold text-lime-2" onClick={onBack}>
        ← Back
      </button>
      <h2 className="text-lg font-extrabold">{mode === "blocked" ? "Blocked" : "Muted"}</h2>
      <p className="mt-1 text-[12px] text-muted">
        {mode === "blocked"
          ? "They cannot follow or DM you. Their posts stay out of your feed."
          : "Their posts stay out of your feed. You can unmute anytime."}
      </p>
      {rows.length === 0 ? <p className="mt-3 text-[13px] text-muted">None yet.</p> : null}
      {rows.map((p) => (
        <div key={p.id} className="mt-2 flex items-center gap-2 border-b border-line py-2">
          <a href={`/u/${encodeURIComponent(p.handle)}`} className="flex min-w-0 flex-1 items-center gap-2">
            <AvatarImg handle={p.handle} size={36} />
            <span className="truncate text-[14px] font-semibold">@{p.handle}</span>
          </a>
          <button
            type="button"
            className="rounded-full border border-line px-2.5 py-1 text-[12px] font-semibold"
            onClick={() => {
              const act = mode === "blocked" ? toggleBlock : toggleMute;
              void act({ data: { id: p.id, handle: p.handle } }).then(() => load());
            }}
          >
            {mode === "blocked" ? "Unblock" : "Unmute"}
          </button>
        </div>
      ))}
    </section>
  );
}
