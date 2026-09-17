import { getSql } from "@/lib/db";
import { DEFAULT_MOD, scanText, surfaceOn, type ModSettings, type ModSurface } from "@/lib/moderator";

const g = globalThis as typeof globalThis & { __nfMod?: { at: number; cfg: ModSettings } };

export function invalidateMod() {
  g.__nfMod = undefined;
}

function mapRow(r: Record<string, unknown>): ModSettings {
  return {
    enabled: r.enabled !== false && r.enabled !== "f",
    action: r.action === "block" || r.action === "hold" ? r.action : "mask",
    chat: r.chat !== false && r.chat !== "f",
    feeds: r.feeds !== false && r.feeds !== "f",
    comments: r.comments !== false && r.comments !== "f",
    ads: r.ads !== false && r.ads !== "f",
    music: r.music !== false && r.music !== "f",
    sexual: r.sexual !== false && r.sexual !== "f",
    insults: r.insults !== false && r.insults !== "f",
    scam: r.scam !== false && r.scam !== "f",
    links: r.links === true || r.links === "t",
    shout: r.shout === true || r.shout === "t",
    custom: String(r.custom ?? ""),
    allow: String(r.allow_list ?? ""),
  };
}

export async function loadMod(): Promise<ModSettings> {
  if (g.__nfMod && Date.now() - g.__nfMod.at < 12_000) return g.__nfMod.cfg;
  try {
    const sql = await getSql();
    const rows = await sql<Record<string, unknown>>`select enabled, action, chat, feeds, comments, ads, music, sexual, insults, scam, links, shout, custom, allow_list from nf_mod_settings where id = 1 limit 1`;
    const cfg = rows[0] ? mapRow(rows[0]) : DEFAULT_MOD;
    g.__nfMod = { at: Date.now(), cfg };
    return cfg;
  } catch {
    return DEFAULT_MOD;
  }
}

export async function gateText(
  surface: ModSurface,
  text: string,
  meta: { userId: string; author: string; roomId?: string },
): Promise<{ ok: true; text: string } | { ok: false; reason: string }> {
  const cfg = await loadMod();
  if (!cfg.enabled || !surfaceOn(cfg, surface)) return { ok: true, text };
  const { hits, masked } = scanText(text, cfg);
  if (!hits.length) return { ok: true, text };
  try {
    const sql = await getSql();
    const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
    await sql`insert into nf_mod_hits (id, surface, action, hits, excerpt, body, room_id, user_id, author, status, ts)
      values (${id}, ${surface}, ${cfg.action}, ${hits.join(", ")}, ${text.slice(0, 180)}, ${text.slice(0, 2000)}, ${meta.roomId ?? ""}, ${meta.userId}, ${meta.author}, ${cfg.action === "mask" ? "masked" : "open"}, ${Date.now()})`;
  } catch {
    // logging must never block the write path
  }
  if (cfg.action === "mask") return { ok: true, text: masked };
  if (cfg.action === "hold") return { ok: false, reason: "Held for staff review." };
  return { ok: false, reason: "Blocked by the moderator." };
}
