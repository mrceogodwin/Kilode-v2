import { authClient } from "@/lib/auth/client";
import { accountEmail, accountEmails, publicUsername } from "@/lib/account-email";
import { asAccountKind, type AccountKind } from "@/lib/qonvo-data";
import { saveProfile } from "@/lib/forum-server";

function niceAuthError(raw: string) {
  const m = raw.toLowerCase();
  if (m.includes("exist") || m.includes("already") || m.includes("taken") || m.includes("unique")) {
    return "That username is taken. Sign in instead.";
  }
  if (m.includes("invalid origin") || m.includes("forbidden")) {
    return "Sign-up was blocked by the host. Open kilode.ng or kilode.vercel.app and try again.";
  }
  if (m.includes("password")) return "Password needs 8+ characters.";
  if (m.includes("invalid email") || m.includes("email")) return "Use a simple username (letters and numbers).";
  if (m.includes("invalid") && m.includes("password")) return "Wrong username or password.";
  return raw || "Could not complete that.";
}

export async function kilodeSignUp(name: string, password: string, kind: AccountKind) {
  const handle = publicUsername(name);
  if (handle.length < 3) return { ok: false as const, reason: "Username needs 3+ letters or numbers." };
  if (password.length < 8) return { ok: false as const, reason: "Password needs 8+ characters." };
  const email = accountEmail(handle);
  const r = await authClient.signUp.email({ email, password, name: handle });
  if (r.error) return { ok: false as const, reason: niceAuthError(r.error.message ?? "Sign up failed") };
  const ses = await authClient.getSession().catch(() => null);
  if (!ses?.data?.user) {
    const inn = await authClient.signIn.email({ email, password });
    if (inn.error) return { ok: false as const, reason: niceAuthError(inn.error.message ?? "Created, but sign-in failed. Try Sign in.") };
  }
  try {
    sessionStorage.setItem("nf_account", JSON.stringify({ kind: asAccountKind(kind) }));
  } catch {
    /* ignore */
  }
  await saveProfile({ data: { handle, kind: asAccountKind(kind) } }).catch(() => undefined);
  return { ok: true as const, handle };
}

export async function kilodeSignIn(name: string, password: string) {
  const handle = publicUsername(name);
  if (handle.length < 3 || !password) return { ok: false as const, reason: "Enter username and password." };
  let last = "Wrong username or password.";
  for (const email of accountEmails(handle)) {
    const r = await authClient.signIn.email({ email, password });
    if (!r.error) return { ok: true as const, handle };
    last = niceAuthError(r.error.message ?? last);
  }
  return { ok: false as const, reason: last };
}
