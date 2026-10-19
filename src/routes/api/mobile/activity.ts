import { createFileRoute } from "@tanstack/react-router";
import { getSql } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/verify.server";

export const Route = createFileRoute("/api/mobile/activity")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const authorization = request.headers.get("authorization") || "";
        const bearer = authorization.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
        let user;
        try {
          user = await getSessionUser(bearer);
        } catch {
          user = null;
        }
        if (!user) {
          return Response.json({ ok: false, error: "Authentication required.", code: "UNAUTHORIZED" }, { status: 401 });
        }
        try {
          const sql = await getSql();
          await sql`create table if not exists nf_notes (
            id text primary key,
            user_id text not null,
            text text not null,
            href text,
            ts bigint not null,
            seen integer not null default 0
          )`;
          const rows = await sql<{ id: string; text: string; href: string | null; ts: number | string; seen: number | string }>`
            select id, text, href, ts, seen
            from nf_notes
            where user_id = ${user.id}
            order by ts desc
            limit 40
          `;
          return Response.json(rows.map((row) => ({
            id: row.id,
            text: row.text,
            href: row.href || undefined,
            ts: Number(row.ts),
            seen: Number(row.seen),
          })));
        } catch (error) {
          console.error("[mobile/activity GET]", error instanceof Error ? error.message : "failed");
          return Response.json({ ok: false, error: "Activity is temporarily unavailable." }, { status: 503 });
        }
      },
    },
  },
});
