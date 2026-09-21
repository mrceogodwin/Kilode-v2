import { Clock, X } from "lucide-react";

export const FORUM_RULES = [
  "No links. No phone numbers. No WhatsApp. No @handles that point off-site.",
  "Chat is live talk, not a court record. Lines expire after a clock the operator sets (hours or days). Then they are gone.",
  "Feeds, Music, Cinema, Ads, Jobs stay. Only Chat expires.",
  "This is the old forum: rooms (Nigeria, Tech, Sports…). Feeds is news. Chat is the conversation.",
];

export function ForumWhy({ hoursLabel, onClose }: { hoursLabel: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-3 sm:items-center" onClick={onClose}>
      <div className="max-h-[86dvh] w-full max-w-md overflow-y-auto rounded-2xl border border-line bg-panel p-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-[10px] font-medium tracking-[0.16em] text-lime-2">KILODE FORUM</div>
            <h2 className="mt-1 text-lg font-extrabold tracking-tight">Why Chat expires</h2>
          </div>
          <button type="button" className="grid size-8 place-items-center rounded-lg border border-line" onClick={onClose} aria-label="Close">
            <X className="size-4" />
          </button>
        </div>
        <p className="mt-2 text-[13px] leading-relaxed text-muted">
          Kilode brought the forum back as live rooms, not endless threads. A line that never dies becomes a place to dump numbers, scams, and screenshots of people who already left. So chat expires. Right now: <strong className="text-fg">{hoursLabel}</strong>.
        </p>
        <ul className="mt-3 space-y-2">
          {FORUM_RULES.map((r) => (
            <li key={r} className="rounded-xl border border-line bg-panel-2 px-3 py-2 text-[12px] leading-snug">
              {r}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[11px] text-muted">
          You still tick Terms at Join. Before you send in Chat you also Accept the Chat ticker. Abuse can be banned.
        </p>
        <a href="/terms#rules" className="btn-join mt-4 block rounded-lg py-2 text-center text-[12px] font-bold">
          Full rules
        </a>
      </div>
    </div>
  );
}

export function ChatTermsBar({ accepted, onAccept }: { accepted: boolean; onAccept: () => void }) {
  if (accepted) return null;
  return (
    <div className="flex items-center gap-2 border-b border-lime-2/30 bg-lime-2/10 px-3 py-2">
      <p className="min-w-0 flex-1 text-[10px] leading-snug text-fg">
        Chat: no links, no phone numbers. Lines expire.{" "}
        <a href="/terms#rules" className="underline">
          Terms
        </a>
      </p>
      <button type="button" className="btn-join shrink-0 rounded-md px-2.5 py-1 text-[10px] font-bold" onClick={onAccept}>
        Accept
      </button>
    </div>
  );
}

export function ForumClock({ label, onOpen }: { label: string; onOpen: () => void }) {
  return (
    <button type="button" onClick={onOpen} className="inline-flex items-center gap-1 rounded-full border border-line bg-panel-2 px-2 py-0.5 text-[10px] font-semibold" aria-label="Chat lifetime">
      <Clock className="size-3 text-lime-2" />
      <span className="tabular-nums text-lime-2">{label}</span>
    </button>
  );
}
