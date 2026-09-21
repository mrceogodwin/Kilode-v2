import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { assertStaff } from "@/lib/staff-server";
import { applyMatch } from "@/lib/pay-match";

export const matchAdPayments = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await assertStaff(context.userId);
    const sql = await getSql();
    const rows = await sql<{ id: string; coin: string | null; tx_hash: string | null; status: string }>`
      select id, coin, tx_hash, status from nf_ads
      where status = ${"pending"} and coalesce(tx_hash, '') <> ''
      order by ts desc limit 40`;
    const out: Awaited<ReturnType<typeof applyMatch>>[] = [];
    for (const r of rows) {
      if (!r.tx_hash) continue;
      out.push(await applyMatch(r.id, r.coin ?? "", r.tx_hash));
    }
    const paid = out.filter((x) => x.ok).length;
    return { ok: true as const, n: out.length, paid, rows: out };
  });

export const matchOneAd = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { id: string }) => d)
  .handler(async ({ context, data }) => {
    await assertStaff(context.userId);
    const sql = await getSql();
    const rows = await sql<{ id: string; coin: string | null; tx_hash: string | null }>`select id, coin, tx_hash from nf_ads where id = ${data.id} limit 1`;
    const row = rows[0];
    if (!row?.tx_hash) return { ok: false as const, reason: "No tx hash on this ad." };
    const r = await applyMatch(row.id, row.coin ?? "", row.tx_hash);
    return { ok: true as const, match: r };
  });
