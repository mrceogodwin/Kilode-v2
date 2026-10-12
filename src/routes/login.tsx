import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { authEnabled, signIn } from "@/lib/auth/client";
import { AccountKindPicker, AvatarPicker } from "@/components/account-kind";
import { KIND_FACE, type AccountKind } from "@/lib/qonvo-data";
import { kilodeSignIn, kilodeSignUp } from "@/lib/register";
import { OfficialLockup } from "@/components/brand-lockup";
import { STAFF_PATH } from "@/lib/staff-path";

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
  const staff = search.next === STAFF_PATH;
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
    if (staff) {
      window.location.href = STAFF_PATH;
      return;
    }
    const next = search.next && search.next.startsWith("/") && search.next !== "/" ? search.next : "/?tab=feeds";
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
      if (!r.ok) setErr(r.reason);
      else go();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Sign in failed. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login-stage">
      <div className="login-card">
        <OfficialLockup className="login-logo" />
        <p className="login-line">The interactive digital media, community & business app.</p>
        {!staff && authEnabled ? (
          <button
            type="button"
            className="google-go"
            onClick={() => {
              setErr("");
              void signIn("grok-google", { callbackURL: staff ? STAFF_PATH : search.next && search.next.startsWith("/") && search.next !== "/" ? search.next : "/?tab=feeds" }).catch((e: unknown) => {
                setErr(e instanceof Error ? e.message : "Google sign-in did not start.");
              });
            }}
          >
            <svg viewBox="0 0 18 18" className="size-4" aria-hidden>
              <path fill="#4285F4" d="M17.6 9.2c0-.6-.1-1.2-.2-1.8H9v3.4h4.8a4.1 4.1 0 0 1-1.8 2.7v2.2h2.9c1.7-1.6 2.7-3.9 2.7-6.5Z" />
              <path fill="#34A853" d="M9 18c2.4 0 4.5-.8 6-2.2l-2.9-2.2c-.8.6-1.9.9-3.1.9-2.4 0-4.4-1.6-5.1-3.8H.9v2.3A9 9 0 0 0 9 18Z" />
              <path fill="#FBBC05" d="M3.9 10.7a5.4 5.4 0 0 1 0-3.4V5H.9a9 9 0 0 0 0 8l3-2.3Z" />
              <path fill="#EA4335" d="M9 3.6c1.3 0 2.5.5 3.4 1.3l2.6-2.6A9 9 0 0 0 .9 5l3 2.3C4.6 5.2 6.6 3.6 9 3.6Z" />
            </svg>
            Continue with Google
          </button>
        ) : null}
        {staff ? <p className="mt-2 text-center text-[12px] text-muted">Owner console. Username and password only.</p> : null}
        {!staff ? (
          <div className="login-tabs" role="tablist">
            <button type="button" role="tab" aria-selected={mode === "in"} className={mode === "in" ? "on" : ""} onClick={() => { setErr(""); setMode("in"); }}>
              Sign in
            </button>
            <button type="button" role="tab" aria-selected={mode === "up"} className={mode === "up" ? "on" : ""} onClick={() => { setErr(""); setMode("up"); }}>
              Create account
            </button>
          </div>
        ) : (
          <p className="text-center text-[11px] font-medium text-muted">Staff console</p>
        )}
        {authEnabled ? (
          <>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Username" autoComplete="username" className="login-field" />
            <div className="relative">
              <input
                type={showPass ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password (8+ characters)"
                autoComplete={mode === "in" ? "current-password" : "new-password"}
                className="login-field pr-11"
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
                <div className="login-agree">
                  <label>
                    <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
                    <span>
                      I agree to the{" "}
                      <a href="/terms" target="_blank" rel="noreferrer">
                        Terms
                      </a>
                      .
                    </span>
                  </label>
                  <label>
                    <input type="checkbox" checked={agreeRules} onChange={(e) => setAgreeRules(e.target.checked)} />
                    <span>
                      I accept the{" "}
                      <a href="/rules" target="_blank" rel="noreferrer">
                        Rules
                      </a>
                      . I am 15 or older and responsible for what I submit.{" "}
                      <a href="/how-to" target="_blank" rel="noreferrer">
                        How to use
                      </a>
                      .
                    </span>
                  </label>
                </div>
              </>
            ) : null}
            {mode === "up" && staff ? (
              <label className="flex items-start gap-2 rounded-xl border border-white/10 px-2 py-2 text-[11px] text-muted">
                <input type="checkbox" className="mt-0.5" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
                <span>I am creating the owner account for this site.</span>
              </label>
            ) : null}
            {err ? <p className="text-sm text-danger">{err}</p> : null}
            {mode === "up" ? (
              <button type="button" disabled={busy} className="btn-yellow w-full rounded-full py-3 text-sm font-extrabold disabled:opacity-60" onClick={() => void up()}>
                {busy ? "Working…" : staff ? "Create owner account" : "Let's Go!"}
              </button>
            ) : (
              <button type="button" disabled={busy} className="btn-yellow w-full rounded-full py-3 text-sm font-extrabold disabled:opacity-60" onClick={() => void inn()}>
                {busy ? "Working…" : staff ? "Enter console" : "Sign in"}
              </button>
            )}
            {staff ? (
              <button
                type="button"
                className="w-full text-center text-[12px] font-semibold text-white/80 underline"
                onClick={() => {
                  setErr("");
                  setMode(mode === "in" ? "up" : "in");
                }}
              >
                {mode === "in" ? "First time? Create the owner account" : "Already claimed? Sign in"}
              </button>
            ) : (
              <p className="text-center text-[11px] text-muted">
                {mode === "in" ? "New here? Use Create account above. It does not replace Sign in." : "Already joined? Use Sign in above. It will not create a second account."}
              </p>
            )}
            <Link to="/" className="block text-center text-[11px] text-muted">
              Back to Kilode
            </Link>
          </>
        ) : (
          <p className="text-sm text-muted">Sign-in is disabled.</p>
        )}
      </div>
      <a className="login-id" href="https://t.me/Builtbystacks" target="_blank" rel="noreferrer">
        @BuiltbyStacks
      </a>
    </main>
  );
}
