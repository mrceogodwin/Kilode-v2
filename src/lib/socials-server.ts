import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { assertStaff } from "@/lib/staff-server";
import { safeHttpUrl } from "@/lib/qonvo-data";

export type SocialRow = {
  id: string;
  name: string;
  handle: string;
  url: string;
  blurb: string;
  thumb: string;
  followers: string;
  sort: number;
};

const SEED: SocialRow[] = [
  { id: "youtube", name: "YouTube", handle: "@KilodeTV", url: "https://www.youtube.com/@KilodeTV", blurb: "Shows, news clips, live.", thumb: "", followers: "TV", sort: 1 },
  { id: "tiktok", name: "TikTok", handle: "@kilode.ng", url: "https://www.tiktok.com/@kilode.ng", blurb: "Shorts from the desk.", thumb: "", followers: "Clips", sort: 2 },
  { id: "instagram", name: "Instagram", handle: "@kilode.ng", url: "https://www.instagram.com/kilode.ng", blurb: "Stills and stories.", thumb: "", followers: "Grid", sort: 3 },
  { id: "x", name: "X", handle: "@kilode_ng", url: "https://x.com/kilode_ng", blurb: "Breaking and replies.", thumb: "", followers: "Feed", sort: 4 },
  { id: "facebook", name: "Facebook", handle: "Kilode", url: "https://www.facebook.com/kilode.ng", blurb: "Longer posts and live.", thumb: "", followers: "Page", sort: 5 },
  { id: "telegram", name: "Telegram", handle: "@Builtbystacks", url: "https://t.me/Builtbystacks", blurb: "Alerts in your pocket.", thumb: "", followers: "Channel", sort: 6 },
  { id: "whatsapp", name: "WhatsApp", handle: "Kilode channel", url: "https://whatsapp.com/channel", blurb: "Status and channel drops.", thumb: "", followers: "Chat", sort: 7 },
];

async function ensure() {
  const sql = await getSql();
  await sql.query(`create table if not exists nf_socials (
    id text primary key, name text not null, handle text not null default '',
    url text not null default '', blurb text not null default '',
    thumb text not null default '', followers text not null default '', sort int not null default 0)`);
  const n = await sql<{ n: string | number }>`select count(*) as n from nf_socials`;
  if (Number(n[0]?.n ?? 0) === 0) {
    for (const s of SEED) {
      await sql`insert into nf_socials (id, name, handle, url, blurb, thumb, followers, sort)
        values (${s.id}, ${s.name}, ${s.handle}, ${s.url}, ${s.blurb}, ${s.thumb}, ${s.followers}, ${s.sort})`;
    }
  }
}

function row(r: SocialRow): SocialRow {
  return {
    id: r.id,
    name: r.name,
    handle: r.handle || "",
    url: r.url || "",
    blurb: r.blurb || "",
    thumb: r.thumb || "",
    followers: r.followers || "",
    sort: Number(r.sort) || 0,
  };
}

export const listSocials = createServerFn({ method: "GET" }).handler(async () => {
  await ensure();
  const sql = await getSql();
  const rows = await sql<SocialRow>`select id, name, handle, url, blurb, thumb, followers, sort from nf_socials order by sort asc, name asc`;
  return rows.map(row);
});

export const saveSocial = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: Partial<SocialRow> & { id: string }) => d)
  .handler(async ({ context, data }) => {
    await assertStaff(context.userId, "super");
    await ensure();
    const sql = await getSql();
    const id = data.id.trim().slice(0, 32);
    if (!id) return { ok: false as const, reason: "Need an id" };
    const name = (data.name || id).trim().slice(0, 40);
    const handle = (data.handle || "").trim().slice(0, 60);
    const url = safeHttpUrl(data.url || "") || (data.url || "").trim().slice(0, 300);
    const blurb = (data.blurb || "").trim().slice(0, 180);
    const thumb = safeHttpUrl(data.thumb || "") || "";
    const followers = (data.followers || "").trim().slice(0, 24);
    const sort = Number(data.sort) || 0;
    await sql`insert into nf_socials (id, name, handle, url, blurb, thumb, followers, sort)
      values (${id}, ${name}, ${handle}, ${url}, ${blurb}, ${thumb}, ${followers}, ${sort})
      on conflict (id) do update set name = ${name}, handle = ${handle}, url = ${url}, blurb = ${blurb}, thumb = ${thumb}, followers = ${followers}, sort = ${sort}`;
    return { ok: true as const };
  });

export const deleteSocial = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { id: string }) => d)
  .handler(async ({ context, data }) => {
    await assertStaff(context.userId, "super");
    const sql = await getSql();
    await sql`delete from nf_socials where id = ${data.id}`;
    return { ok: true as const };
  });
