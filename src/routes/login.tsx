import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { authEnabled } from "@/lib/auth/client";
import { AccountKindPicker, AvatarPicker } from "@/components/account-kind";
import { KIND_FACE, type AccountKind } from "@/lib/qonvo-data";
import { kilodeSignIn, kilodeSignUp } from "@/lib/register";

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
  const [err, setErr] = useState("");
  const [agree, setAgree] = useState(false);
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
    if (!agree) {
      setErr(staff ? "Confirm you are creating the owner account." : "Tick the box to accept the Terms.");
      return;
    }
    setBusy(true);
    const r = await kilodeSignUp(name, password, staff ? "member" : kind, staff ? "👑" : face);
    setBusy(false);
    if (!r.ok) setErr(r.reason);
    else go();
  }
  async function inn() {
    setErr("");
    setBusy(true);
    const r = await kilodeSignIn(name, password);
    setBusy(false);
    if (!r.ok) setErr(r.reason + (mode === "in" ? " New here? Create an account." : ""));
    else go();
  }

  return (
    <main className="grid min-h-dvh place-items-center overflow-y-auto bg-bg p-6 text-fg">
      <div className="raised w-full max-w-sm space-y-3 rounded-2xl p-5">
        <div className="flex flex-col items-center text-center">
          <img src="/kilode-lockup-lg.png" alt="Kilode" className="mx-auto h-16 w-auto max-w-[220px] object-contain" onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/kilode-logo-green.png"; }} />
          {staff ? <p className="mt-2 text-[11px] font-medium text-muted">Staff console</p> : null}
        </div>
        <p className="text-sm text-muted">
          {staff
            ? "Owner login. Username + password only. No account type."
            : mode === "in"
              ? "Sign in with username + password."
              : "Pick a username, password, and account type. No email."}
        </p>
        {authEnabled ? (
          <>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Username" autoComplete="username" className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm" />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password (8+ characters)" autoComplete={mode === "in" ? "current-password" : "new-password"} className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm" />
            {mode === "up" && !staff ? (
              <>
                <div>
                  <div className="mb-1 text-[11px] font-medium text-muted">I am joining as</div>
                  <AccountKindPicker
                    compact
                    value={kind}
                    onChange={(k) => {
                      setKind(k);
                      setFace(KIND_FACE[k]);
                    }}
                  />
                </div>
                <div>
                  <div className="mb-1 text-[11px] font-medium text-muted">Your avatar</div>
                  <AvatarPicker value={face} handle={name} onChange={setFace} />
                </div>
                <label className="flex items-start gap-2 rounded-lg border border-line p-2 text-[11px] text-muted">
                  <input type="checkbox" className="mt-0.5" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
                  <span>I agree to the Terms. I am responsible for what I submit.</span>
                </label>
              </>
            ) : null}
            {mode === "up" && staff ? (
              <label className="flex items-start gap-2 rounded-lg border border-line p-2 text-[11px] text-muted">
                <input type="checkbox" className="mt-0.5" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
                <span>I am creating the owner account for this site.</span>
              </label>
            ) : null}
            {err ? <p className="text-sm text-danger">{err}</p> : null}
            {mode === "up" ? (
              <button type="button" disabled={busy} className="btn-join w-full rounded-lg py-2 text-sm font-bold disabled:opacity-60" onClick={() => void up()}>
                {busy ? "Working…" : staff ? "Create owner account" : "Create account"}
              </button>
            ) : (
              <button type="button" disabled={busy} className="btn-join w-full rounded-lg py-2 text-sm font-bold disabled:opacity-60" onClick={() => void inn()}>
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
