import { useState } from "react";
import { saveDigest } from "@/lib/ad-slots-server";

export function JoinCta({ className = "" }: { className?: string }) {
  return (
    <a href="/login?mode=up" className={`btn-3d block rounded-md py-1.5 text-center text-[10px] font-semibold ${className}`}>
      Join Kilode
    </a>
  );
}

function StoreMark({ kind }: { kind: "ios" | "android" }) {
  return (
    <span className="store-3d grid size-9 place-items-center rounded-xl">
      {kind === "ios" ? (
        <svg viewBox="0 0 24 24" className="size-4 fill-current" aria-hidden>
          <path d="M16.4 12.6c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.2-2.8.9-3.5.9s-1.8-.8-3-.8c-1.5 0-3 .9-3.8 2.3-1.6 2.8-.4 7 1.2 9.3.8 1.1 1.7 2.3 2.9 2.3 1.2 0 1.6-.7 3-.7s1.8.7 3 .7 2-.1 2.9-2.2c1.1-1.1 1.5-2.1 1.5-2.2-.1 0-2.8-1.1-2.8-4.3ZM14.6 5.8c.6-.8 1.1-1.9.9-3-.9 0-2 .6-2.6 1.4-.6.7-1.1 1.9-.9 2.9 1 .1 2-.5 2.6-1.3Z" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="size-4 fill-current" aria-hidden>
          <path d="M4.5 3.6v16.8c0 .6.6 1 1.2.8l13.3-8.2c.6-.4.6-1.3 0-1.7L5.7 2.9c-.6-.4-1.2 0-1.2.7Zm9.3 6.2 1.9-1.1-7.4-4.5v6.7l5.5-1.1Zm-5.5 2.3v6.8l7.4-4.6-1.9-1.1-5.5-1.1Z" />
        </svg>
      )}
    </span>
  );
}

export function GetAppRow() {
  return (
    <a href="/install" className="raised flex items-center gap-2.5 rounded-xl px-2.5 py-2">
      <StoreMark kind="ios" />
      <StoreMark kind="android" />
      <span className="min-w-0 flex-1">
        <span className="block text-[12px] font-bold">Get the app</span>
        <span className="block text-[10px] text-muted">Add Kilode to your home screen</span>
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

export function DigestBox() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  return (
    <form
      className="mt-2 rounded-xl border border-line bg-panel-2 p-2"
      onSubmit={(e) => {
        e.preventDefault();
        void saveDigest({ data: { email } }).then((r) => {
          setMsg(r.ok ? "Saved. Digest mail starts when mail is ready." : r.reason);
          if (r.ok) setEmail("");
        });
      }}
    >
      <div className="text-[10px] font-bold tracking-[0.12em] text-muted">OPTIONAL DIGEST</div>
      <p className="mt-0.5 text-[10px] leading-snug text-muted">Not used for login or password reset. Browser alerts work without this.</p>
      <div className="mt-1.5 flex gap-1">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email for later digest"
          className="min-h-8 flex-1 rounded-md border border-line bg-bg px-2 text-[11px]"
        />
        <button type="submit" className="btn-3d rounded-md px-2 text-[10px] font-semibold">
          Save
        </button>
      </div>
      {msg ? <p className="mt-1 text-[10px] text-lime-2">{msg}</p> : null}
    </form>
  );
}

export function MenuPin() {
  return (
    <div className="shrink-0 space-y-2 border-b border-line bg-panel px-3 py-2">
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
