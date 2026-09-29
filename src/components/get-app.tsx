import { useState } from "react";
import { saveDigest } from "@/lib/ad-slots-server";
import { BangMark } from "@/components/brand-lockup";

export function JoinCta({ className = "" }: { className?: string }) {
  return (
    <a href="/login?mode=up" className={`btn-yellow block rounded-lg px-3 py-1.5 text-center text-[10px] font-extrabold tracking-[0.14em] text-black ${className}`}>
      JOIN NOW
    </a>
  );
}

export function GetAppRow() {
  return (
    <a href="/install" className="flex min-w-0 flex-1 items-center gap-2.5 px-2.5 py-2 transition hover:bg-white/[0.04] active:bg-white/[0.06]">
      <BangMark className="size-9 shrink-0 rounded-[10px]" />
      <span className="min-w-0 flex-1 text-left">
        <span className="block text-[12px] font-bold leading-tight tracking-tight">Install Kilode</span>
        <span className="mt-0.5 block text-[10px] leading-snug text-muted">Add to home screen</span>
      </span>
      <span aria-hidden className="grid size-6 shrink-0 place-items-center rounded-full border border-lime-2/30 bg-lime-2/10 text-[11px] font-bold text-lime-2">
        ›
      </span>
    </a>
  );
}

export function TelegramLink({ className = "" }: { className?: string }) {
  return (
    <a href="https://t.me/Builtbystacks" target="_blank" rel="noreferrer" className={`inline-flex items-center gap-1 font-semibold text-lime-2 ${className}`}>
      <svg viewBox="0 0 24 24" className="size-3.5 fill-current" aria-hidden>
        <path d="M21.5 4.3 3.7 11.1c-1.2.5-1.2 1.1-.2 1.4l4.6 1.4 10.6-6.7c.5-.3 1-.1.6.2l-8.6 7.8-.3 4.6c.4 0 .6-.2.9-.4l2.1-2 4.4 3.2c.8.5 1.4.2 1.6-.7l2.9-13.8c.3-1.2-.4-1.8-1.8-1.4Z" />
      </svg>
      @Builtbystacks
    </a>
  );
}

export function DigestBox({ quiet = false, defaultOpen = true }: { quiet?: boolean; defaultOpen?: boolean }) {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={quiet ? "" : "mt-2"}>
      {quiet && !open ? (
        <button
          type="button"
          className="mx-auto flex w-full items-center justify-center gap-1 py-1 text-[11px] text-muted hover:text-fg"
          onClick={() => setOpen(true)}
        >
          Get updates by email
          <span aria-hidden className="text-[10px]">▾</span>
        </button>
      ) : null}
      {open ? (
        <form
          className={quiet ? "mt-0.5" : ""}
          onSubmit={(e) => {
            e.preventDefault();
            void saveDigest({ data: { email } }).then((r) => {
              if (!r.ok) {
                setMsg(r.reason);
                return;
              }
              setMsg("You’re on the list.");
              setEmail("");
            });
          }}
        >
          <p className="mb-1.5 text-center text-[11px] leading-snug text-muted">
            Get new Kilode posts by email · one at a time · no spam.
          </p>
          <div className="flex items-center gap-1.5">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              autoComplete="email"
              required
              aria-label="Email for post updates"
              className="digest-field min-h-9 flex-1 rounded-lg border border-line px-2.5 text-[13px]"
            />
            <button
              type="submit"
              className={
                quiet
                  ? "digest-go rounded-lg px-3 py-2 text-[12px] font-bold"
                  : "btn-join rounded-lg px-3 py-2 text-[11px] font-bold"
              }
            >
              Subscribe
            </button>
          </div>
          {msg ? <p className="mt-1.5 text-center text-[11px] font-medium text-lime-2">{msg}</p> : null}
        </form>
      ) : null}
    </div>
  );
}

export function MenuPin() {
  return (
    <div className="menu-dock shrink-0 border-t border-white/10 px-3 py-2.5">
      <DigestBox quiet defaultOpen={false} />
    </div>
  );
}

export function MenuLegal({ onDonate }: { onDonate?: () => void }) {
  return (
    <div className="shrink-0 border-t border-white/5 px-3 py-1.5">
      <p className="text-center text-[10px] leading-snug text-muted">
        <a href="/terms" className="underline">
          Terms
        </a>
        {" · "}
        <a href="/privacy" className="underline">
          Privacy
        </a>
        {" · "}
        <a href="/rules" className="underline">
          Rules
        </a>
        {onDonate ? (
          <>
            {" · "}
            <button type="button" className="underline" onClick={onDonate}>
              Donate
            </button>
          </>
        ) : null}
        <span className="mt-1.5 flex items-center justify-center gap-1">
          <TelegramLink />
        </span>
      </p>
    </div>
  );
}
