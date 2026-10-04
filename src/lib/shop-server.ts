import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { assertStaff } from "@/lib/staff-server";
import { safeHttpUrl } from "@/lib/qonvo-data";

export const PRODUCT_KINDS = ["app", "zip", "video", "music", "link", "other"] as const;
export type ProductKind = (typeof PRODUCT_KINDS)[number];

export type ShopProduct = {
  id: string;
  title: string;
  kind: ProductKind;
  blurb: string;
  details: string;
  cover: string;
  price: string;
  downloadUrl: string;
  status: "publish" | "hidden";
  ts: number;
};

function asKind(v: string): ProductKind {
  return (PRODUCT_KINDS as readonly string[]).includes(v) ? (v as ProductKind) : "other";
}

function nid() {
  return `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function mailOk(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim().toLowerCase());
}

async function ensure() {
  const sql = await getSql();
  await sql.query(`create table if not exists nf_products (
    id text primary key, title text not null, kind text not null default 'app',
    blurb text not null default '', details text not null default '',
    cover text not null default '', price text not null default 'Free',
    download_url text not null default '', status text not null default 'publish', ts bigint not null)`);
  await sql.query(`create table if not exists nf_product_leads (
    id text primary key, product_id text not null, email text not null, ts bigint not null)`);
}

function row(r: {
  id: string;
  title: string;
  kind: string;
  blurb: string | null;
  details: string | null;
  cover: string | null;
  price: string | null;
  download_url: string | null;
  status: string;
  ts: number | string;
}): ShopProduct {
  return {
    id: r.id,
    title: r.title,
    kind: asKind(r.kind),
    blurb: r.blurb || "",
    details: r.details || "",
    cover: r.cover || "",
    price: r.price || "Free",
    downloadUrl: r.download_url || "",
    status: r.status === "hidden" ? "hidden" : "publish",
    ts: Number(r.ts),
  };
}

export const listShop = createServerFn({ method: "GET" }).handler(async () => {
  await ensure();
  const sql = await getSql();
  const rows = await sql<{
    id: string;
    title: string;
    kind: string;
    blurb: string | null;
    details: string | null;
    cover: string | null;
    price: string | null;
    download_url: string | null;
    status: string;
    ts: number | string;
  }>`select id, title, kind, blurb, details, cover, price, download_url, status, ts from nf_products where status = ${"publish"} order by ts desc limit 200`;
  return rows.map((r) => ({ ...row(r), downloadUrl: "" }));
});

export const listStaffShop = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await assertStaff(context.userId);
    await ensure();
    const sql = await getSql();
    const rows = await sql<{
      id: string;
      title: string;
      kind: string;
      blurb: string | null;
      details: string | null;
      cover: string | null;
      price: string | null;
      download_url: string | null;
      status: string;
      ts: number | string;
    }>`select id, title, kind, blurb, details, cover, price, download_url, status, ts from nf_products order by ts desc limit 400`;
    const leads = await sql<{ n: string | number }>`select count(*) as n from nf_product_leads`;
    const recent = await sql<{ email: string; title: string | null; ts: number | string }>`select l.email, l.ts, coalesce(p.title, '') as title from nf_product_leads l left join nf_products p on p.id = l.product_id order by l.ts desc limit 40`;
    return {
      items: rows.map(row),
      leads: Number(leads[0]?.n ?? 0),
      recent: recent.map((r) => ({ email: r.email, title: r.title || "Product", ts: Number(r.ts) })),
    };
  });

export const saveProduct = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: Partial<ShopProduct> & { id?: string } = {}) => d)
  .handler(async ({ context, data }) => {
    await assertStaff(context.userId, "super");
    await ensure();
    const title = (data.title || "").trim().slice(0, 120);
    if (!title) return { ok: false as const, reason: "Need a title" };
    const sql = await getSql();
    const id = data.id || nid();
    const kind = asKind(data.kind || "app");
    const blurb = (data.blurb || "").trim().slice(0, 280);
    const details = (data.details || "").trim().slice(0, 4000);
    const cover = safeHttpUrl(data.cover || "") || "";
    const price = (data.price || "Free").trim().slice(0, 40);
    const rawUrl = (data.downloadUrl || "").trim().slice(0, 600);
    const downloadUrl = rawUrl ? safeHttpUrl(rawUrl) || "" : "";
    if (rawUrl && !downloadUrl) return { ok: false as const, reason: "Download link must be https" };
    const ts = Date.now();
    if (data.id) {
      await sql`update nf_products set title = ${title}, kind = ${kind}, blurb = ${blurb}, details = ${details}, cover = ${cover}, price = ${price}, download_url = ${downloadUrl} where id = ${id}`;
    } else {
      await sql`insert into nf_products (id, title, kind, blurb, details, cover, price, download_url, status, ts)
        values (${id}, ${title}, ${kind}, ${blurb}, ${details}, ${cover}, ${price}, ${downloadUrl}, ${"publish"}, ${ts})`;
    }
    return { ok: true as const, id };
  });

export const hideProduct = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { id: string; hidden: boolean }) => d)
  .handler(async ({ context, data }) => {
    await assertStaff(context.userId);
    await ensure();
    const sql = await getSql();
    await sql`update nf_products set status = ${data.hidden ? "hidden" : "publish"} where id = ${data.id}`;
    return { ok: true as const };
  });

export const deleteProduct = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { id: string }) => d)
  .handler(async ({ context, data }) => {
    await assertStaff(context.userId, "super");
    await ensure();
    const sql = await getSql();
    await sql`delete from nf_products where id = ${data.id}`;
    return { ok: true as const };
  });

export const claimProduct = createServerFn({ method: "POST" })
  .validator((d: { id: string; email: string }) => d)
  .handler(async ({ data }) => {
    const email = data.email.trim().toLowerCase();
    if (!mailOk(email)) return { ok: false as const, reason: "Need a real email" };
    await ensure();
    const sql = await getSql();
    const rows = await sql<{
      id: string;
      title: string;
      details: string | null;
      download_url: string | null;
      status: string;
    }>`select id, title, details, download_url, status from nf_products where id = ${data.id} limit 1`;
    const p = rows[0];
    if (!p || p.status !== "publish") return { ok: false as const, reason: "That item is gone" };
    await sql`insert into nf_product_leads (id, product_id, email, ts) values (${nid()}, ${p.id}, ${email}, ${Date.now()})`;
    return {
      ok: true as const,
      title: p.title,
      details: p.details || "",
      downloadUrl: safeHttpUrl(p.download_url || "") || "",
    };
  });
