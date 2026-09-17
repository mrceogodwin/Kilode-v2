import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { authClient, authEnabled } from "@/lib/auth/client";
import { accountEmail, accountEmails, publicUsername } from "@/lib/account-email";
import { AccountKindPicker } from "@/components/account-kind";
import { type AccountKind } from "@/lib/qonvo-data";
import { KilodeWord, QonvoMark } from "@/components/qonvo-mark";

export const Route = createFileRoute("/login")({
  validateSearch: (s: Record<string, unknown>): { next?: string } => {
    const next = typeof s.next === "string" && s.next.startsWith("/") ? s.next : undefined;
    return next ? { next } : {};
  },
  component: Login,
});

function Login() {
  const { next } = Route.useSearch();
  const staff = next === "/ops" || (next ?? "").startsWith("/ops");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [agree, setAgree] = useState(false);
  const [kind, setKind] = useState<AccountKind>("member");
  const [mode, setMode] = useState<"in" | "up">("in");
  const [busy, setBusy] = useState(false);

  async function up() {
    setErr("");
    const handle = publicUsername(name);
    if (handle.length < 3) {
      setErr("Username needs 3+ characters.");
      return;
    }
    if (password.length < 8) {
      setErr("Password needs 8+ characters.");
      return;
    }
    if (!agree) {
      setErr(staff ? "Confirm you are creating the owner account." : "Accept the Terms to create an account.");
      return;
    }
    if (!staff) {
      try {
        sessionStorage.setItem("nf_account", JSON.stringify({ kind }));
      } catch {
        /* ignore */
      }
    }
    setBusy(true);
    const r = await authClient.signUp.email({ email: accountEmail(handle), password, name: handle });
    setBusy(false);
    if (r.error) setErr(r.error.message ?? "Sign up failed");
    else window.location.href = next && next.startsWith("/") ? next : "/";
  }
  async function inn() {
    setErr("");
    const handle = publicUsername(name);
    if (handle.length < 3 || !password) {
      setErr("Enter username and password.");
      return;
    }
    setBusy(true);
    let last = "Sign in failed";
    for (const email of accountEmails(handle)) {
      const r = await authClient.signIn.email({ email, password });
      if (!r.error) {
        window.location.href = next && next.startsWith("/") ? next : "/";
        return;
      }
      last = r.error.message ?? last;
    }
    setBusy(false);
    setErr(last);
  }

  return (
    <main className="grid min-h-svh place-items-center bg-bg p-6 text-fg">
      <div className="raised w-full max-w-sm space-y-3 rounded-2xl p-5">
        <div className="flex items-center gap-2">
          <QonvoMark className="size-10" />
          <div>
            <KilodeWord className="text-xl" />
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted">{staff ? "Staff console" : "kilode.ng"}</p>
          </div>
        </div>
        <p className="text-sm text-muted">
          {staff
            ? "Owner login. Username + password only. No account type. After sign-in, claim super admin once."
            : mode === "in"
              ? "Sign in with username + password."
              : "Create a member account. Staff uses a different door."}
        </p>
        {authEnabled ? (
          <>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Username" autoComplete="username" className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm" />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" autoComplete={mode === "in" ? "current-password" : "new-password"} className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm" />
            {mode === "up" && !staff ? (
              <>
                <div>
                  <div className="mb-1 text-[10px] font-bold tracking-wide text-muted uppercase">I am joining as</div>
                  <AccountKindPicker value={kind} onChange={setKind} />
                </div>
                <label className="flex items-start gap-2 rounded-lg border border-line p-2 text-[11px] text-muted">
                  <input type="checkbox" className="mt-0.5" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
                  <span>I agree to the Terms. I am responsible for posts, music URLs, and ads I submit.</span>
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
              className="w-full text-center text-[12px] text-muted underline"
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
