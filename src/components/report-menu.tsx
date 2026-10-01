import { useState } from "react";
import { reportPost } from "@/lib/forum-server";
import { toggleBlock, toggleMute } from "@/lib/takes-server";

export const REPORT_REASONS = ["Spam", "Scam or fraud", "Harassment", "Fake account", "Nudity", "Other"] as const;

/** Six-reason report on a person. Lands in the staff reports desk. */
export function ReportMenu({ handle, signedIn }: { handle: string; signedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  return (
    <div className="relative shrink-0">
      <button
        type="button"
        aria-label={`Report @${handle}`}
        aria-expanded={open}
        className="grid size-6 place-items-center rounded-full text-[16px] leading-none text-muted"
        onClick={() => {
          if (!signedIn) {
            window.location.href = "/login";
            return;
          }
          setOpen((v) => !v);
        }}
      >
        ···
      </button>
      {open ? (
        <div className="absolute right-0 z-30 mt-1 w-40 rounded-xl border border-line bg-[#121412] p-1 shadow-lg">
          <div className="px-2 py-1 text-[9px] font-bold tracking-[0.14em] text-muted">REPORT</div>
          {REPORT_REASONS.map((reason) => (
            <button
              key={reason}
              type="button"
              className="block w-full rounded-lg px-2 py-1.5 text-left text-[12px] text-fg hover:bg-white/5"
              onClick={() => {
                void reportPost({ data: { postId: `user:${handle}`, reason } })
                  .then(() => setNote("Sent to staff."))
                  .catch(() => setNote("Sign in to report."));
                setOpen(false);
              }}
            >
              {reason}
            </button>
          ))}
          <button
            type="button"
            className="mt-1 block w-full rounded-lg px-2 py-1.5 text-left text-[12px] font-semibold text-fg hover:bg-white/5"
            onClick={() => {
              void toggleBlock({ data: { handle } })
                .then((r) => {
                  if (!r.ok) {
                    setNote(r.reason);
                    return;
                  }
                  setNote(r.on ? "Blocked." : "Unblocked.");
                  if (r.on) window.dispatchEvent(new CustomEvent("kilode:block", { detail: handle.toLowerCase() }));
                  else window.dispatchEvent(new CustomEvent("kilode:unblock", { detail: handle.toLowerCase() }));
                })
                .catch(() => setNote("Sign in to block."));
              setOpen(false);
            }}
          >
            Block
          </button>
          <button
            type="button"
            className="block w-full rounded-lg px-2 py-1.5 text-left text-[12px] font-semibold text-fg hover:bg-white/5"
            onClick={() => {
              void toggleMute({ data: { handle } })
                .then((r) => {
                  if (!r.ok) {
                    setNote(r.reason);
                    return;
                  }
                  setNote(r.on ? "Muted." : "Unmuted.");
                  window.dispatchEvent(new CustomEvent(r.on ? "kilode:mute" : "kilode:unmute", { detail: handle.toLowerCase() }));
                })
                .catch(() => setNote("Sign in to mute."));
              setOpen(false);
            }}
          >
            Mute
          </button>
        </div>
      ) : null}
      {note ? <p className="absolute right-0 top-7 z-30 w-28 text-right text-[9px] text-muted">{note}</p> : null}
    </div>
  );
}
