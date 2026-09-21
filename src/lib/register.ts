import { authClient } from "@/lib/auth/client";
import { accountEmails, publicUsername } from "@/lib/account-email";
import { asAccountKind, type AccountKind } from "@/lib/qonvo-data";
import { saveProfile } from "@/lib/forum-server";
import { registerAccount } from "@/lib/register-server";

function niceAuthError(raw: string) {
  const m = raw.toLowerCase();
  if (m.includes("exist") || m.includes("already") || m.includes("taken") || m.includes("unique")) {
    return "That username is taken. Sign in instead.";
  }
  if (m.includes("invalid origin") || m.includes("forbidden")) {
    return "Sign-up was blocked by the host. Open kilode.ng and try again.";
  }
  if (m.includes("password") && m.includes("invalid")) return "Wrong username or password.";
  if (m.includes("password")) return "Password needs 8+ characters.";
  if (m.includes("enoent") || m.includes("pglite") || m.includes("/var/task") || m.includes("econnrefused") || m.includes("127.0.0.1:1")) {
    return "Postgres is not connected on this deploy. Owner: Vercel → Settings → Environment Variables → DATABASE_URL (Neon), then Redeploy. Sign-in cannot work until that is set.";
  }
  if (m.includes("database") || m.includes("postgres") || m.includes("neon")) return "Database is not ready. Owner must set DATABASE_URL on Vercel and redeploy.";
  return raw || "Could not complete that.";
}

export function birthYearList() {
  const y = new Date().getUTCFullYear();
  const out: number[] = [];
  for (let n = y - 15; n >= y - 100; n--) out.push(n);
  return out;
}

export async function kilodeSignUp(name: string, password: string, kind: AccountKind, face?: string, yearBorn?: number) {
  const handle = publicUsername(name);
  if (handle.length < 3) return { ok: false as const, reason: "Username needs 3+ letters or numbers." };
  if (password.length < 8) return { ok: false as const, reason: "Password needs 8+ characters." };
  const year = Number(yearBorn);
  if (!Number.isInteger(year) || new Date().getUTCFullYear() - year < 15) {
    return { ok: false as const, reason: "You must be 15 or older. Pick the year you were born." };
  }
  const created = await registerAccount({
    data: { name: handle, password, kind: asAccountKind(kind), agree: true, face: face ?? "", yearBorn: year },
  }).catch((e: unknown) => ({ ok: false as const, reason: e instanceof Error ? e.message : "Sign up failed" }));
  if (!created || !("ok" in created) || !created.ok) {
    return { ok: false as const, reason: niceAuthError(("reason" in created && created.reason) || "Sign up failed") };
  }
  const inn = await kilodeSignIn(handle, password);
  if (!inn.ok) return { ok: false as const, reason: `Account created. Sign in now. (${inn.reason})` };
  try {
    sessionStorage.setItem("nf_account", JSON.stringify({ kind: asAccountKind(kind), face: face ?? "" }));
  } catch {
    /* ignore */
  }
  await saveProfile({ data: { handle, kind: asAccountKind(kind), face: face ?? "" } }).catch(() => undefined);
  return { ok: true as const, handle };
}

export async function kilodeSignIn(name: string, password: string) {
  const handle = publicUsername(name);
  if (handle.length < 3 || !password) return { ok: false as const, reason: "Enter username and password." };
  let last = "Wrong username or password.";
  for (const email of accountEmails(handle)) {
    const r = await authClient.signIn.email({ email, password });
    if (!r.error) return { ok: true as const, handle };
    const extra = [r.error.message, (r.error as { statusText?: string }).statusText].filter(Boolean).join(" — ");
    last = niceAuthError(extra || last);
  }
  return { ok: false as const, reason: last };
}
