import { createServerFn } from "@tanstack/react-start";
import { hashPassword } from "better-auth/crypto";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { DEFAULT_MOD, type ModSettings } from "@/lib/moderator";
import { invalidateMod, loadMod } from "@/lib/mod-cache";
import { invalidateChatTtl } from "@/lib/forum-server";

type StaffRole = "mod" | "admin" | "super";
type GrantRole = "mod" | "admin";

async function staffOf(userId: string) {
  const sql = await getSql();
  try {
    const rows = await sql<{ user_id: string; role: string; handle: string | null; locked: boolean | null }>`select user_id, role, handle, locked from nf_staff where user_id = ${userId} limit 1`;
    return rows[0] ?? null;
  } catch {
    const rows = await sql<{ user_id: string; role: string; handle: string | null }>`select user_id, role, handle from nf_staff where user_id = ${userId} limit 1`;
    return rows[0] ? { ...rows[0], locked: rows[0].role === "super" } : null;
  }
}

export const staffMe = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const count = await sql<{ n: string | number }>`select count(*) as n from nf_staff`;
    const mine = await staffOf(context.userId);
    return { role: mine?.role ?? null, empty: Number(count[0]?.n ?? 0) === 0, userId: context.userId };
  });

export const claimOps = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const count = await sql<{ n: string | number }>`select count(*) as n from nf_staff`;
    if (Number(count[0]?.n ?? 0) > 0) return { ok: false as const, reason: "Staff already claimed" };
    const who = await sql<{ name: string }>`select name from "user" where id = ${context.userId} limit 1`;
    const handle = (who[0]?.name || context.userId).slice(0, 24);
    try {
      await sql`insert into nf_staff (user_id, role, handle, ts, locked) values (${context.userId}, ${"super"}, ${handle}, ${Date.now()}, ${true})`;
    } catch {
      await sql`insert into nf_staff (user_id, role, handle, ts) values (${context.userId}, ${"super"}, ${handle}, ${Date.now()})`;
    }
    return { ok: true as const, role: "super" as const };
  });

export const listStaff = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const me = await staffOf(context.userId);
    if (!me) return [];
    const sql = await getSql();
    try {
      return sql<{ user_id: string; role: string; handle: string | null; ts: number | string; locked: boolean | null }>`select user_id, role, handle, ts, locked from nf_staff order by ts asc`;
    } catch {
      const rows = await sql<{ user_id: string; role: string; handle: string | null; ts: number | string }>`select user_id, role, handle, ts from nf_staff order by ts asc`;
      return rows.map((r, i) => ({ ...r, locked: i === 0 && r.role === "super" }));
    }
  });

export const setStaffRole = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { userId: string; role: GrantRole; handle?: string }) => d)
  .handler(async ({ context, data }) => {
    const me = await staffOf(context.userId);
    if (me?.role !== "super") throw new Error("Forbidden");
    const sql = await getSql();
    let uid = data.userId.trim();
    const handleIn = (data.handle ?? uid).slice(0, 24);
    const named = await sql<{ id: string; name: string }>`select id, name from "user" where lower(name) = ${uid.toLowerCase()} or id = ${uid} limit 1`;
    if (named[0]) uid = named[0].id;
    if (uid === context.userId) return { ok: false as const, reason: "You already own this console." };
    const existing = await staffOf(uid);
    if (existing?.role === "super" || existing?.locked) return { ok: false as const, reason: "Cannot change the owner." };
    const role: GrantRole = data.role === "admin" ? "admin" : "mod";
    const handle = named[0]?.name ?? existing?.handle ?? handleIn;
    if (existing) {
      await sql`update nf_staff set role = ${role}, handle = ${handle} where user_id = ${uid}`;
    } else {
      try {
        await sql`insert into nf_staff (user_id, role, handle, ts, locked) values (${uid}, ${role}, ${handle}, ${Date.now()}, ${false})`;
      } catch {
        await sql`insert into nf_staff (user_id, role, handle, ts) values (${uid}, ${role}, ${handle}, ${Date.now()})`;
      }
    }
    return { ok: true as const };
  });

export const removeStaff = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((userId: string) => userId)
  .handler(async ({ context, data: raw }) => {
    const me = await staffOf(context.userId);
    if (me?.role !== "super") throw new Error("Forbidden");
    const sql = await getSql();
    let uid = raw.trim();
    const named = await sql<{ id: string }>`select id from "user" where lower(name) = ${uid.toLowerCase()} or id = ${uid} limit 1`;
    if (named[0]) uid = named[0].id;
    if (uid === context.userId) return { ok: false as const, reason: "You cannot remove yourself." };
    const existing = await staffOf(uid);
    if (!existing) return { ok: false as const, reason: "Not staff." };
    if (existing.role === "super" || existing.locked) return { ok: false as const, reason: "Cannot remove the owner." };
    await sql`delete from nf_staff where user_id = ${uid}`;
    return { ok: true as const };
  });

export const resetUserPassword = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { handle: string; password: string }) => d)
  .handler(async ({ context, data }) => {
    const me = await staffOf(context.userId);
    if (me?.role !== "super" && me?.role !== "admin") return { ok: false as const, reason: "Only owner or admin can reset passwords." };
    const password = data.password.trim();
    if (password.length < 8) return { ok: false as const, reason: "New password needs 8+ characters." };
    const sql = await getSql();
    let uid = data.handle.trim();
    const named = await sql<{ id: string; name: string }>`select id, name from "user" where lower(name) = ${uid.toLowerCase()} or id = ${uid} limit 1`;
    if (!named[0]) return { ok: false as const, reason: "No user with that handle." };
    uid = named[0].id;
    const target = await staffOf(uid);
    if ((target?.role === "super" || target?.locked) && uid !== context.userId) {
      return { ok: false as const, reason: "Cannot reset the owner password." };
    }
    const hashed = await hashPassword(password);
    const acc = await sql<{ id: string }>`select id from account where "userId" = ${uid} and "providerId" = ${"credential"} limit 1`;
    if (!acc[0]) return { ok: false as const, reason: "That user has no password login." };
    await sql`update account set password = ${hashed}, "updatedAt" = CURRENT_TIMESTAMP where id = ${acc[0].id}`;
    return { ok: true as const, handle: named[0].name };
  });

export const setAdPlacement = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { id: string; placement: "board" | "chat" | "chat-pin" }) => d)
  .handler(async ({ context, data }) => {
    const me = await staffOf(context.userId);
    if (!me) throw new Error("Forbidden");
    const sql = await getSql();
    await sql`update nf_ads set placement = ${data.placement} where id = ${data.id}`;
    return { ok: true };
  });

export const listMembers = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const me = await staffOf(context.userId);
    if (!me) return [];
    const sql = await getSql();
    try {
      const rows = await sql<{ id: string; name: string; kind: string | null }>`
        select u.id, u.name, p.kind from "user" u
        left join nf_profiles p on p.user_id = u.id
        order by u."createdAt" desc limit 80`;
      return rows.map((r) => ({ id: r.id, handle: r.name, kind: r.kind || "member" }));
    } catch {
      return [];
    }
  });

export const setAdStatus = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { id: string; status: "pending" | "paid" | "approved" | "rejected" }) => d)
  .handler(async ({ context, data }) => {
    const me = await staffOf(context.userId);
    if (!me) throw new Error("Forbidden");
    const sql = await getSql();
    await sql`update nf_ads set status = ${data.status} where id = ${data.id}`;
    return { ok: true };
  });

export const hidePost = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: string) => id)
  .handler(async ({ context, data: id }) => {
    const me = await staffOf(context.userId);
    if (!me) throw new Error("Forbidden");
    const sql = await getSql();
    await sql`update nf_posts set status = ${"hidden"} where id = ${id}`;
    return { ok: true };
  });

export const listMail = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const me = await staffOf(context.userId);
    if (!me) return [];
    const sql = await getSql();
    const rows = await sql<{ id: string; author: string; body: string; ts: number | string }>`select id, author, body, ts from nf_mail order by ts desc limit 50`;
    return rows.map((r) => ({ ...r, ts: Number(r.ts) }));
  });

export const listReports = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const me = await staffOf(context.userId);
    if (!me) return [];
    const sql = await getSql();
    const rows = await sql<{ id: string; post_id: string; author: string; reason: string; ts: number | string }>`select id, post_id, author, reason, ts from nf_reports order by ts desc limit 50`;
    return rows.map((r) => ({ ...r, ts: Number(r.ts) }));
  });

export const saveWallet = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { coin: string; address: string }) => d)
  .handler(async ({ context, data }) => {
    const me = await staffOf(context.userId);
    if (me?.role !== "super" && me?.role !== "admin") throw new Error("Forbidden");
    const address = data.address.trim();
    const coin = data.coin.trim().toLowerCase();
    if (!coin) return null;
    const sql = await getSql();
    const existing = await sql<{ coin: string }>`select coin from nf_wallets where coin = ${coin} limit 1`;
    if (existing[0]) await sql`update nf_wallets set address = ${address}, ts = ${Date.now()} where coin = ${coin}`;
    else await sql`insert into nf_wallets (coin, address, ts) values (${coin}, ${address}, ${Date.now()})`;
    return { ok: true };
  });

export const getModSettings = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const me = await staffOf(context.userId);
    if (!me) return DEFAULT_MOD;
    return loadMod();
  });

export const saveModSettings = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: ModSettings) => d)
  .handler(async ({ context, data }) => {
    const me = await staffOf(context.userId);
    if (me?.role !== "super" && me?.role !== "admin") throw new Error("Forbidden");
    const sql = await getSql();
    const action = data.action === "block" || data.action === "hold" ? data.action : "mask";
    try {
      const existing = await sql<{ id: number }>`select id from nf_mod_settings where id = 1 limit 1`;
      if (existing[0]) {
        await sql`update nf_mod_settings set enabled = ${data.enabled}, action = ${action}, chat = ${data.chat}, feeds = ${data.feeds}, comments = ${data.comments}, ads = ${data.ads}, music = ${data.music}, sexual = ${data.sexual}, insults = ${data.insults}, scam = ${data.scam}, links = ${data.links}, shout = ${data.shout}, custom = ${data.custom}, allow_list = ${data.allow}, ts = ${Date.now()} where id = 1`;
      } else {
        await sql`insert into nf_mod_settings (id, enabled, action, chat, feeds, comments, ads, music, sexual, insults, scam, links, shout, custom, allow_list, ts)
          values (1, ${data.enabled}, ${action}, ${data.chat}, ${data.feeds}, ${data.comments}, ${data.ads}, ${data.music}, ${data.sexual}, ${data.insults}, ${data.scam}, ${data.links}, ${data.shout}, ${data.custom}, ${data.allow}, ${Date.now()})`;
      }
    } catch {
      await sql.query(`CREATE TABLE IF NOT EXISTS nf_mod_settings (
        id INT PRIMARY KEY, enabled BOOLEAN NOT NULL DEFAULT TRUE, action TEXT NOT NULL DEFAULT 'mask',
        chat BOOLEAN NOT NULL DEFAULT TRUE, feeds BOOLEAN NOT NULL DEFAULT TRUE, comments BOOLEAN NOT NULL DEFAULT TRUE,
        ads BOOLEAN NOT NULL DEFAULT TRUE, music BOOLEAN NOT NULL DEFAULT TRUE, sexual BOOLEAN NOT NULL DEFAULT TRUE,
        insults BOOLEAN NOT NULL DEFAULT TRUE, scam BOOLEAN NOT NULL DEFAULT TRUE, links BOOLEAN NOT NULL DEFAULT FALSE,
        shout BOOLEAN NOT NULL DEFAULT FALSE, custom TEXT, allow_list TEXT, ts BIGINT NOT NULL)`);
      await sql`insert into nf_mod_settings (id, enabled, action, chat, feeds, comments, ads, music, sexual, insults, scam, links, shout, custom, allow_list, ts)
        values (1, ${data.enabled}, ${action}, ${data.chat}, ${data.feeds}, ${data.comments}, ${data.ads}, ${data.music}, ${data.sexual}, ${data.insults}, ${data.scam}, ${data.links}, ${data.shout}, ${data.custom}, ${data.allow}, ${Date.now()})`;
    }
    invalidateMod();
    return { ok: true };
  });

export const listModHits = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const me = await staffOf(context.userId);
    if (!me) return [];
    const sql = await getSql();
    try {
      const rows = await sql<{
        id: string;
        surface: string;
        action: string;
        hits: string;
        excerpt: string;
        author: string | null;
        status: string;
        ts: number | string;
      }>`select id, surface, action, hits, excerpt, author, status, ts from nf_mod_hits order by ts desc limit 60`;
      return rows.map((r) => ({ ...r, ts: Number(r.ts), author: r.author ?? "" }));
    } catch {
      return [];
    }
  });

export const setModHitStatus = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { id: string; status: "dropped" | "kept" }) => d)
  .handler(async ({ context, data }) => {
    const me = await staffOf(context.userId);
    if (!me) throw new Error("Forbidden");
    const sql = await getSql();
    await sql`update nf_mod_hits set status = ${data.status} where id = ${data.id}`;
    return { ok: true };
  });

export const saveChatTtl = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((hours: number) => hours)
  .handler(async ({ context, data: raw }) => {
    const me = await staffOf(context.userId);
    if (me?.role !== "super") throw new Error("Forbidden");
    const allowed = [0, 1, 6, 12, 24, 48, 72, 168, 336, 720];
    const hours = allowed.includes(raw) ? raw : 24;
    const sql = await getSql();
    try {
      const existing = await sql<{ id: number }>`select id from nf_site where id = 1 limit 1`;
      if (existing[0]) await sql`update nf_site set chat_ttl_hours = ${hours}, ts = ${Date.now()} where id = 1`;
      else await sql`insert into nf_site (id, chat_ttl_hours, ts) values (1, ${hours}, ${Date.now()})`;
    } catch {
      await sql.query(`CREATE TABLE IF NOT EXISTS nf_site (id INT PRIMARY KEY, chat_ttl_hours INT NOT NULL DEFAULT 24, ts BIGINT NOT NULL)`);
      await sql`insert into nf_site (id, chat_ttl_hours, ts) values (1, ${hours}, ${Date.now()})`;
    }
    invalidateChatTtl();
    return { ok: true as const, hours };
  });

export const listModUsers = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const me = await staffOf(context.userId);
    if (!me) return [];
    const sql = await getSql();
    try {
      const rows = await sql<{
        user_id: string;
        handle: string;
        kind: string;
        reason: string | null;
        ts: number | string;
        until_ts: number | string;
      }>`select user_id, handle, kind, reason, ts, until_ts from nf_mod_users order by ts desc limit 80`;
      const now = Date.now();
      return rows
        .filter((r) => Number(r.until_ts) === 0 || Number(r.until_ts) > now)
        .map((r) => ({
          userId: r.user_id,
          handle: r.handle,
          kind: r.kind as "ban" | "mute",
          reason: r.reason ?? "",
          ts: Number(r.ts),
          until: Number(r.until_ts),
        }));
    } catch {
      return [];
    }
  });

export const setModUser = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { handle: string; kind: "ban" | "mute"; hours: number; reason?: string }) => d)
  .handler(async ({ context, data }) => {
    const me = await staffOf(context.userId);
    if (!me) throw new Error("Forbidden");
    const handle = data.handle.trim().slice(0, 24);
    if (!handle) return { ok: false as const, reason: "Need a username." };
    const kind = data.kind === "ban" ? "ban" : "mute";
    const hours = data.hours < 0 ? 0 : data.hours;
    const until = hours === 0 ? 0 : Date.now() + hours * 3600_000;
    const sql = await getSql();
    const named = await sql<{ id: string; name: string }>`select id, name from "user" where lower(name) = ${handle.toLowerCase()} limit 1`;
    const uid = named[0]?.id ?? handle;
    if (uid === context.userId) return { ok: false as const, reason: "You cannot mute or ban yourself." };
    const targetStaff = await staffOf(uid);
    if (targetStaff?.role === "super" || targetStaff?.locked) return { ok: false as const, reason: "Cannot restrict the owner." };
    try {
      const existing = await sql<{ user_id: string }>`select user_id from nf_mod_users where user_id = ${uid} limit 1`;
      if (existing[0]) {
        await sql`update nf_mod_users set handle = ${named[0]?.name ?? handle}, kind = ${kind}, reason = ${data.reason ?? ""}, by_id = ${context.userId}, ts = ${Date.now()}, until_ts = ${until} where user_id = ${uid}`;
      } else {
        await sql`insert into nf_mod_users (user_id, handle, kind, reason, by_id, ts, until_ts)
          values (${uid}, ${named[0]?.name ?? handle}, ${kind}, ${data.reason ?? ""}, ${context.userId}, ${Date.now()}, ${until})`;
      }
    } catch {
      await sql.query(`CREATE TABLE IF NOT EXISTS nf_mod_users (
        user_id TEXT PRIMARY KEY, handle TEXT NOT NULL, kind TEXT NOT NULL, reason TEXT, by_id TEXT, ts BIGINT NOT NULL, until_ts BIGINT NOT NULL DEFAULT 0)`);
      await sql`insert into nf_mod_users (user_id, handle, kind, reason, by_id, ts, until_ts)
        values (${uid}, ${named[0]?.name ?? handle}, ${kind}, ${data.reason ?? ""}, ${context.userId}, ${Date.now()}, ${until})`;
    }
    return { ok: true as const };
  });

export const clearModUser = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((userId: string) => userId)
  .handler(async ({ context, data: raw }) => {
    const me = await staffOf(context.userId);
    if (!me) throw new Error("Forbidden");
    const sql = await getSql();
    const uid = raw.trim();
    await sql`delete from nf_mod_users where user_id = ${uid} or lower(handle) = ${uid.toLowerCase()}`;
    return { ok: true as const };
  });

