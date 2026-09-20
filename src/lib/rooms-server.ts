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

export type RoomOverlay = { extra: Room[]; paused: string[] };

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
    const paused = rows.filter((r) => r.paused === true || r.paused === 1 || r.paused === "1").map((r) => r.id);
    const extra: Room[] = rows
      .filter((r) => r.custom === true || r.custom === 1 || r.custom === "1")
      .filter((r) => !(r.paused === true || r.paused === 1 || r.paused === "1"))
      .map((r) => ({ id: r.id, name: r.name, region: r.region || "More rooms", online: Number(r.online ?? 0) }));
    return { extra, paused };
  } catch {
    return { extra: [], paused: [] };
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
        name: r.name,
        region: r.region,
        paused: Boolean(o && (o.paused === true || o.paused === 1 || o.paused === "1")),
        custom: false,
      };
    });
    const extra = rows
      .filter((r) => r.custom === true || r.custom === 1 || r.custom === "1")
      .map((r) => ({
        id: r.id,
        name: r.name,
        region: r.region,
        paused: r.paused === true || r.paused === 1 || r.paused === "1",
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
    await sql`insert into nf_rooms (id, name, region, paused, custom, online, ts)
      values (${data.id}, ${name}, ${region}, ${paused}, ${0}, ${base?.online ?? 0}, ${Date.now()})
      on conflict (id) do update set paused = ${paused}, name = ${name}, region = ${region}`;
    return { ok: true as const };
  });

export const saveCustomRoom = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { name: string; region?: string }) => d)
  .handler(async ({ context, data }) => {
    await assertStaff(context.userId, "super");
    const name = data.name.trim().slice(0, 40);
    if (name.length < 2) return { ok: false as const, reason: "Name is too short." };
    const id = `x-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 24)}`;
    if (!id || id === "x-") return { ok: false as const, reason: "Need a name." };
    const region = (data.region || "More rooms").slice(0, 40);
    const sql = await ensure();
    await sql`insert into nf_rooms (id, name, region, paused, custom, online, ts)
      values (${id}, ${name}, ${region}, ${0}, ${1}, ${0}, ${Date.now()})
      on conflict (id) do update set name = ${name}, region = ${region}, paused = ${0}`;
    return { ok: true as const, id };
  });
