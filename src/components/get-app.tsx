import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { saveDigest } from "@/lib/ad-slots-server";

export function JoinCta({ className = "" }: { className?: string }) {
  return (
    <a href="/login?mode=up" className={`btn-join block rounded-lg px-3 py-1.5 text-center text-[10px] font-extrabold tracking-[0.14em] ${className}`}>
      JOIN NOW
    </a>
  );
}

export function GetAppRow() {
  return (
    <a href="/install" className="menu-install flex items-center gap-3 rounded-xl px-3 py-2.5">
      <img src="/kilode-bang-icon.png" alt="" className="size-8 shrink-0 rounded-[9px] object-contain" />
      <span className="min-w-0 flex-1 text-left">
        <span className="block text-[13px] font-bold leading-tight">Install Kilode</span>
        <span className="block text-[10px] text-muted">Home screen · iPhone and Android</span>
      </span>
      <ChevronRight className="size-3.5 shrink-0 text-muted" />
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

export function DigestBox() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  return (
    <form
      className="mt-2"
      onSubmit={(e) => {
        e.preventDefault();
        void saveDigest({ data: { email } }).then((r) => {
          setMsg(r.ok ? "Saved. We send when mail is live." : r.reason);
          if (r.ok) setEmail("");
        });
      }}
    >
      <div className="flex items-center gap-1.5">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email digest · optional"
          className="min-h-9 flex-1 rounded-lg border border-line bg-bg px-2.5 text-[12px]"
        />
        <button type="submit" className="btn-join rounded-lg px-3 py-2 text-[11px] font-bold">
          Add
        </button>
      </div>
      {msg ? <p className="mt-1 text-[10px] text-lime-2">{msg}</p> : null}
    </form>
  );
}

export function MenuPin() {
  return (
    <div className="menu-dock shrink-0 border-t border-line px-3 py-2.5">
      <GetAppRow />
      <DigestBox />
    </div>
  );
}

export function MenuLegal({ onDonate }: { onDonate?: () => void }) {
  return (
    <div className="shrink-0 border-t border-white/5 px-4 py-3">
      <p className="text-center text-[10px] leading-snug text-muted">
        <a href="/terms" className="underline">
          Terms
        </a>
        {" · "}
        <a href="/terms#privacy" className="underline">
          Privacy
        </a>
        {" · "}
        <a href="/terms#rules" className="underline">
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
