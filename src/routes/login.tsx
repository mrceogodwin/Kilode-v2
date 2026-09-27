import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { authEnabled } from "@/lib/auth/client";
import { AccountKindPicker, AvatarPicker } from "@/components/account-kind";
import { KIND_FACE, type AccountKind } from "@/lib/qonvo-data";
import { kilodeSignIn, kilodeSignUp } from "@/lib/register";
import { BrandLockup } from "@/components/brand-lockup";

export const Route = createFileRoute("/login")({
  validateSearch: (s: Record<string, unknown>): { next?: string; mode?: "in" | "up" } => {
    const next = typeof s.next === "string" && s.next.startsWith("/") ? s.next : undefined;
    const mode = s.mode === "up" || s.mode === "in" ? s.mode : undefined;
    return { ...(next ? { next } : {}), ...(mode ? { mode } : {}) };
  },
  component: Login,
});

function Login() {
  const search = Route.useSearch();
  const staff = search.next === "/ops" || (search.next ?? "").startsWith("/ops");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [err, setErr] = useState("");
  const [agree, setAgree] = useState(false);
  const [agreeRules, setAgreeRules] = useState(false);
  const [kind, setKind] = useState<AccountKind>("member");
  const [face, setFace] = useState(KIND_FACE.member);
  const [mode, setMode] = useState<"in" | "up">(staff ? "in" : search.mode === "up" ? "up" : "in");
  const [busy, setBusy] = useState(false);

  function go() {
    const next = search.next && search.next.startsWith("/") ? search.next : "/";
    window.location.href = next;
  }

  async function up() {
    setErr("");
    if (!agree || (!staff && !agreeRules)) {
      setErr(staff ? "Confirm you are creating the owner account." : "Tick both boxes. Read the Terms and the Rules first.");
      return;
    }
    setBusy(true);
    try {
      const r = await kilodeSignUp(name, password, staff ? "member" : kind, staff ? "👑" : face);
      if (!r.ok) setErr(r.reason);
      else go();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Sign up failed. Try again.");
    } finally {
      setBusy(false);
    }
  }
  async function inn() {
    setErr("");
    setBusy(true);
    try {
      const r = await kilodeSignIn(name, password);
      if (!r.ok) setErr(r.reason + (mode === "in" ? " New here? Create an account." : ""));
      else go();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Sign in failed. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-dvh overflow-y-auto bg-bg px-4 py-4 text-fg">
      <div className="raised mx-auto w-full max-w-sm space-y-2 rounded-2xl p-3">
        <div className="flex flex-col items-center text-center">
          <BrandLockup size="lg" />
          {staff ? <p className="mt-1 text-[11px] font-medium text-muted">Staff console</p> : null}
        </div>
        <p className="text-[12px] text-muted">
          {staff
            ? "Owner login. Username + password only."
            : mode === "in"
              ? "Sign in with username + password."
              : "Username + password. No email. Type locks after you join."}
        </p>
        {authEnabled ? (
          <>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Username" autoComplete="username" className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-base" />
            <div className="relative">
              <input
                type={showPass ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password (8+ characters)"
                autoComplete={mode === "in" ? "current-password" : "new-password"}
                className="w-full rounded-lg border border-line bg-panel py-2 pl-3 pr-11 text-base"
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-1.5 py-0.5 text-[18px] leading-none text-muted"
                aria-label={showPass ? "Hide password" : "Show password"}
                onClick={() => setShowPass((v) => !v)}
              >
                {showPass ? "🙈" : "👁️"}
              </button>
            </div>
            {mode === "up" && !staff ? (
              <>
                <AccountKindPicker
                  key="login-account-kind"
                  compact
                  value={kind}
                  onChange={(k) => {
                    setKind(k);
                    setFace(KIND_FACE[k]);
                  }}
                />
                <AvatarPicker compact value={face} handle={name} onChange={setFace} />
                <div className="space-y-1.5 rounded-lg border border-line px-2 py-1.5">
                  <label className="flex items-start gap-2 text-[10px] leading-snug text-muted">
                    <input type="checkbox" className="mt-0.5" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
                    <span>
                      I agree to the{" "}
                      <a href="/terms#terms" className="font-semibold text-lime-2 underline" target="_blank" rel="noreferrer">
                        Terms
                      </a>
                      .
                    </span>
                  </label>
                  <label className="flex items-start gap-2 text-[10px] leading-snug text-muted">
                    <input type="checkbox" className="mt-0.5" checked={agreeRules} onChange={(e) => setAgreeRules(e.target.checked)} />
                    <span>
                      I accept the{" "}
                      <a href="/terms#rules" className="font-semibold text-lime-2 underline" target="_blank" rel="noreferrer">
                        Rules
                      </a>
                      . I am 15 or older and responsible for what I submit.{" "}
                      <a href="/terms#howto" className="font-semibold text-lime-2 underline" target="_blank" rel="noreferrer">
                        How to use
                      </a>
                      .
                    </span>
                  </label>
                </div>
              </>
            ) : null}
            {mode === "up" && staff ? (
              <label className="flex items-start gap-2 rounded-lg border border-line px-2 py-1.5 text-[11px] text-muted">
                <input type="checkbox" className="mt-0.5" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
                <span>I am creating the owner account for this site.</span>
              </label>
            ) : null}
            {err ? <p className="text-sm text-danger">{err}</p> : null}
            {mode === "up" ? (
              <button type="button" disabled={busy} className="auth-cta w-full disabled:opacity-60" onClick={() => void up()}>
                {busy ? "Working…" : staff ? "Create owner account" : "Create account"}
              </button>
            ) : (
              <button type="button" disabled={busy} className="auth-cta w-full disabled:opacity-60" onClick={() => void inn()}>
                {busy ? "Working…" : staff ? "Enter console" : "Sign in"}
              </button>
            )}
            <button
              type="button"
              className="w-full text-center text-[12px] font-semibold text-lime-2 underline"
              onClick={() => {
                setErr("");
                setMode(mode === "in" ? "up" : "in");
              }}
            >
              {mode === "in" ? (staff ? "First time? Create the owner account" : "New here? Create a user account") : "Already have an account? Sign in"}
            </button>
            <Link to="/" className="block text-center text-[11px] text-muted">
              Back to Kilode
            </Link>
          </>
        ) : (
          <p className="text-sm text-muted">Sign-in is disabled.</p>
        )}
      </div>
    </main>
  );
}
