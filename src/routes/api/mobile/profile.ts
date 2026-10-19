import { createFileRoute } from "@tanstack/react-router";
import { getSql } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/verify.server";

const ACCOUNT_KINDS = new Set([
  "member", "artist", "writer", "advertiser", "cinema",
  "job_poster", "job_seeker", "vendor", "renter", "brand",
]);

export const Route = createFileRoute("/api/mobile/profile")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const authorization = request.headers.get("authorization") || "";
        const bearer = authorization.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
        let user;
        try { user = await getSessionUser(bearer); } catch { user = null; }
        if (!user) return Response.json({ ok: false, error: "Authentication required." }, { status: 401 });
        try {
          const sql = await getSql();
          const rows = await sql<{ handle: string; kind: string | null; bio: string | null; city: string | null }>`
            select handle, kind, bio, city from nf_profiles where user_id = ${user.id} limit 1
          `;
          return Response.json(rows[0] || { handle: "", kind: "member", bio: "", city: "" });
        } catch (error) {
          console.error("[mobile/profile GET]", error instanceof Error ? error.message : "failed");
          return Response.json({ ok: false, error: "Profile is temporarily unavailable." }, { status: 503 });
        }
      },
      POST: async ({ request }) => {
        const authorization = request.headers.get("authorization") || "";
        const bearer = authorization.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
        let user;
        try { user = await getSessionUser(bearer); } catch { user = null; }
        if (!user) return Response.json({ ok: false, error: "Authentication required." }, { status: 401 });
        let body: { kind?: unknown; handle?: unknown; bio?: unknown; city?: unknown };
        try { body = await request.json(); } catch { return Response.json({ ok: false, error: "Invalid JSON." }, { status: 400 }); }
        const kind = typeof body.kind === "string" ? body.kind : "";
        if (!ACCOUNT_KINDS.has(kind)) return Response.json({ ok: false, error: "Choose a valid Kilode account type." }, { status: 400 });
        try {
          const sql = await getSql();
          const users = await sql<{ name: string }>`select name from "user" where id = ${user.id} limit 1`;
          const rawHandle = typeof body.handle === "string" ? body.handle : users[0]?.name || user.email?.split("@")[0] || "member";
          const handle = rawHandle.replace(/^@/, "").trim().slice(0, 24);
          if (!handle) return Response.json({ ok: false, error: "A profile handle is required." }, { status: 400 });
          await sql`
            insert into nf_profiles (user_id, handle, bio, city, ts, kind)
            values (${user.id}, ${handle}, ${typeof body.bio === "string" ? body.bio.slice(0, 280) : ""}, ${typeof body.city === "string" ? body.city.slice(0, 80) : ""}, ${Date.now()}, ${kind})
            on conflict (user_id) do update set
              kind = excluded.kind,
              handle = case when nf_profiles.handle = '' then excluded.handle else nf_profiles.handle end
          `;
          return Response.json({ ok: true, userId: user.id, handle, kind });
        } catch (error) {
          console.error("[mobile/profile POST]", error instanceof Error ? error.message : "failed");
          return Response.json({ ok: false, error: "Could not save your Kilode account type." }, { status: 503 });
        }
      },
    },
  },
});
