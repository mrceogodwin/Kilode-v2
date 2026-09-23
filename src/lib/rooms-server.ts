import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { assertStaff } from "@/lib/staff-server";
import { ROOMS, type Room } from "@/lib/qonvo-data";

async function ensure() {
  const sql = await getSql();
  await sql.query(`CREATE TABLE IF NOT EXISTS nf_rooms (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    region TEXT NOT NULL DEFAULT 'More rooms',
    paused INTEGER NOT NULL DEFAULT 0,
    custom INTEGER NOT NULL DEFAULT 0,
    online INTEGER NOT NULL DEFAULT 0,
    ts BIGINT NOT NULL DEFAULT 0)`);
  return sql;
}

function truthy(v: number | string | boolean | null | undefined) {
  return v === true || v === 1 || v === "1";
}

export type RoomOverride = { name: string; region: string };
export type RoomOverlay = {
  extra: Room[];
  paused: string[];
  /** Built-in room name/region overrides from nf_rooms (rename). */
  overrides: Record<string, RoomOverride>;
};

export const listRoomOverlay = createServerFn({ method: "GET" }).handler(async (): Promise<RoomOverlay> => {
  try {
    const sql = await ensure();
    const rows = await sql<{
      id: string;
      name: string;
      region: string;
      paused: number | string | boolean | null;
      custom: number | string | boolean | null;
      online: number | string | null;
    }>`select id, name, region, paused, custom, online from nf_rooms`;
    const paused = rows.filter((r) => truthy(r.paused)).map((r) => r.id);
    const overrides: Record<string, RoomOverride> = {};
    for (const r of rows) {
      if (truthy(r.custom)) continue;
      const base = ROOMS.find((x) => x.id === r.id);
      if (!base) continue;
      const name = String(r.name || base.name);
      const region = String(r.region || base.region);
      if (name !== base.name || region !== base.region) {
        overrides[r.id] = { name, region };
      }
    }
    const extra: Room[] = rows
      .filter((r) => truthy(r.custom))
      .filter((r) => !truthy(r.paused))
      .map((r) => ({
        id: r.id,
        name: r.name,
        region: r.region || "More rooms",
        online: Number(r.online ?? 0),
      }));
    return { extra, paused, overrides };
  } catch {
    return { extra: [], paused: [], overrides: {} };
  }
});

export const listRoomsAdmin = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await assertStaff(context.userId);
    const sql = await ensure();
    const rows = await sql<{
      id: string;
      name: string;
      region: string;
      paused: number | string | boolean | null;
      custom: number | string | boolean | null;
    }>`select id, name, region, paused, custom from nf_rooms`;
    const map = Object.fromEntries(rows.map((r) => [r.id, r]));
    const built = ROOMS.map((r) => {
      const o = map[r.id];
      return {
        id: r.id,
        name: (o?.name && String(o.name)) || r.name,
        region: (o?.region && String(o.region)) || r.region,
        paused: Boolean(o && truthy(o.paused)),
        custom: false,
      };
    });
    const extra = rows
      .filter((r) => truthy(r.custom))
      .map((r) => ({
        id: r.id,
        name: r.name,
        region: r.region,
        paused: truthy(r.paused),
        custom: true,
      }));
    return [...built, ...extra];
  });

export const setRoomPaused = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { id: string; paused: boolean; name?: string; region?: string }) => d)
  .handler(async ({ context, data }) => {
    await assertStaff(context.userId, "super");
    const sql = await ensure();
    const base = ROOMS.find((r) => r.id === data.id);
    const name = (data.name || base?.name || data.id).slice(0, 40);
    const region = (data.region || base?.region || "More rooms").slice(0, 40);
    const paused = data.paused ? 1 : 0;
    const custom = base ? 0 : 1;
    await sql`insert into nf_rooms (id, name, region, paused, custom, online, ts)
      values (${data.id}, ${name}, ${region}, ${paused}, ${custom}, ${base?.online ?? 0}, ${Date.now()})
      on conflict (id) do update set paused = ${paused}, name = ${name}, region = ${region}`;
    return { ok: true as const };
  });

export const renameRoom = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { id: string; name: string; region?: string }) => d)
  .handler(async ({ context, data }) => {
    await assertStaff(context.userId, "super");
    const name = data.name.trim().slice(0, 40);
    if (name.length < 2) return { ok: false as const, reason: "Name is too short." };
    const sql = await ensure();
    const base = ROOMS.find((r) => r.id === data.id);
    const existing = await sql<{
      custom: number | string | boolean | null;
      region: string;
      paused: number | string | boolean | null;
      online: number | string | null;
    }>`select custom, region, paused, online from nf_rooms where id = ${data.id} limit 1`;
    const row = existing[0];
    if (!base && !row) return { ok: false as const, reason: "Room not found." };
    const region = (data.region || row?.region || base?.region || "More rooms").slice(0, 40);
    const custom = base ? 0 : 1;
    const paused = row ? (truthy(row.paused) ? 1 : 0) : 0;
    const online = Number(row?.online ?? base?.online ?? 0);
    await sql`insert into nf_rooms (id, name, region, paused, custom, online, ts)
      values (${data.id}, ${name}, ${region}, ${paused}, ${custom}, ${online}, ${Date.now()})
      on conflict (id) do update set name = ${name}, region = ${region}`;
    return { ok: true as const };
  });

export const saveCustomRoom = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { name: string; region?: string }) => d)
  .handler(async ({ context, data }) => {
    await assertStaff(context.userId, "super");
    const name = data.name.trim().slice(0, 40);
    if (name.length < 2) return { ok: false as const, reason: "Name is too short." };
    const id = `x-${name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 24)}`;
    if (!id || id === "x-") return { ok: false as const, reason: "Need a name." };
    if (ROOMS.some((r) => r.id === id)) return { ok: false as const, reason: "That id clashes with a built-in room." };
    const region = (data.region || "More rooms").slice(0, 40);
    const sql = await ensure();
    await sql`insert into nf_rooms (id, name, region, paused, custom, online, ts)
      values (${id}, ${name}, ${region}, ${0}, ${1}, ${0}, ${Date.now()})
      on conflict (id) do update set name = ${name}, region = ${region}, paused = ${0}, custom = ${1}`;
    return { ok: true as const, id };
  });

/** Delete a custom room, or archive (pause) a built-in. */
export const deleteRoom = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { id: string }) => d)
  .handler(async ({ context, data }) => {
    await assertStaff(context.userId, "super");
    const sql = await ensure();
    const base = ROOMS.find((r) => r.id === data.id);
    if (base) {
      await sql`insert into nf_rooms (id, name, region, paused, custom, online, ts)
        values (${base.id}, ${base.name}, ${base.region}, ${1}, ${0}, ${base.online}, ${Date.now()})
        on conflict (id) do update set paused = ${1}`;
      return { ok: true as const, mode: "archived" as const };
    }
    await sql`delete from nf_rooms where id = ${data.id} and custom = ${1}`;
    return { ok: true as const, mode: "deleted" as const };
  });
