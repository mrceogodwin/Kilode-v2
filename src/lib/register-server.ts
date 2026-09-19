import { createServerFn } from "@tanstack/react-start";
import { hashPassword } from "better-auth/crypto";
import { randomUUID } from "node:crypto";
import { dbSource, getSql } from "@/lib/db";
import { asAccountKind, type AccountKind } from "@/lib/qonvo-data";
import { accountEmail, publicUsername } from "@/lib/account-email";
import { allowWrite, RATE_BLOCKED } from "@/lib/rate-limit";

function fail(reason: string) {
  return { ok: false as const, reason };
}

export const registerAccount = createServerFn({ method: "POST" })
  .validator((d: { name: string; password: string; kind: string; agree: boolean; face?: string }) => d)
  .handler(async ({ data }) => {
    if (!allowWrite(`reg:${(data.name || "").toLowerCase()}`, 5, 10 * 60_000)) return fail(RATE_BLOCKED);
    if (!data.agree) return fail("Tick the box to accept the Terms.");
    const handle = publicUsername(data.name);
    if (handle.length < 3) return fail("Username needs 3+ letters or numbers.");
    if ((data.password ?? "").length < 8) return fail("Password needs 8+ characters.");
    const kind = asAccountKind(data.kind);
    const email = accountEmail(handle);

    if (process.env.VERCEL && dbSource !== "neon") {
      return fail("Postgres is not connected on this deploy. Vercel → Settings → Environment Variables → add DATABASE_URL (Neon), then Redeploy.");
    }

    try {
      await getSql();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return fail(`Database is not ready (${msg.slice(0, 120)}). Set DATABASE_URL on Vercel and redeploy.`);
    }

    const made = await insertCredentialUser(handle, email, data.password);
    if (!made.ok) return made;
    await saveKind(handle, email, kind, data.face).catch(() => undefined);
    return { ok: true as const, handle };
  });

async function insertCredentialUser(handle: string, email: string, password: string) {
  const sql = await getSql();
  try {
    const exists = await sql<{ id: string }>`select id from "user" where email = ${email} limit 1`;
    if (exists[0]) return fail("That username is taken. Sign in instead.");
  } catch (e) {
    return fail(explainDb(e instanceof Error ? e.message : String(e)));
  }
  const id = randomUUID();
  const hashed = await hashPassword(password);
  const now = new Date().toISOString();
  try {
    await sql`insert into "user" (id, name, email, "emailVerified", "createdAt", "updatedAt") values (${id}, ${handle}, ${email}, ${true}, ${now}::timestamptz, ${now}::timestamptz)`;
  } catch {
    await sql.query(
      `insert into "user" (id, name, email, "emailVerified", "createdAt", "updatedAt") values ($1, $2, $3, true, now(), now())`,
      [id, handle, email],
    );
  }
  try {
    await sql`insert into "account" (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt") values (${randomUUID()}, ${id}, ${"credential"}, ${id}, ${hashed}, ${now}::timestamptz, ${now}::timestamptz)`;
  } catch {
    await sql.query(
      `insert into "account" (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt") values ($1, $2, 'credential', $3, $4, now(), now())`,
      [randomUUID(), id, id, hashed],
    );
  }
  return { ok: true as const };
}

async function saveKind(handle: string, email: string, kind: AccountKind, face?: string) {
  const sql = await getSql();
  const u = await sql<{ id: string }>`select id from "user" where email = ${email} limit 1`;
  const userId = u[0]?.id;
  if (!userId) return;
  const existing = await sql<{ user_id: string }>`select user_id from nf_profiles where user_id = ${userId} limit 1`;
  const f = (face ?? "").slice(0, 32);
  if (existing[0]) {
    try {
      await sql`update nf_profiles set handle = ${handle}, face = ${f}, ts = ${Date.now()} where user_id = ${userId}`;
    } catch {
      await sql`update nf_profiles set handle = ${handle}, ts = ${Date.now()} where user_id = ${userId}`;
    }
  } else {
    try {
      await sql`insert into nf_profiles (user_id, handle, bio, city, kind, face, ts) values (${userId}, ${handle}, ${""}, ${""}, ${kind}, ${f}, ${Date.now()})`;
    } catch {
      await sql`insert into nf_profiles (user_id, handle, bio, city, ts) values (${userId}, ${handle}, ${""}, ${""}, ${Date.now()})`;
    }
  }
}

function explainDb(msg: string) {
  const m = msg.toLowerCase();
  if (m.includes("does not exist") || m.includes("relation")) {
    return "Database tables were missing. Reload once — they are created on first request. If it still fails, DATABASE_URL is wrong.";
  }
  if (m.includes("connect") || m.includes("timeout") || m.includes("enotfound")) {
    return "Cannot reach Postgres. Check DATABASE_URL (Neon) in Vercel env.";
  }
  return msg.slice(0, 180) || "Sign up failed.";
}

export const dbStatus = createServerFn({ method: "GET" }).handler(async () => {
  const vercel = Boolean(process.env.VERCEL);
  try {
    const sql = await getSql();
    const users = await sql<{ n: string | number }>`select count(*) as n from "user"`;
    return { ok: true as const, source: dbSource, vercel, users: Number(users[0]?.n ?? 0) };
  } catch (e) {
    return { ok: false as const, source: dbSource, vercel, reason: e instanceof Error ? e.message : String(e) };
  }
});
