import { createFileRoute } from "@tanstack/react-router";
import { listTracks } from "@/lib/forum-server";

/** Mobile bridge — listTracks from forum-server */
export const Route = createFileRoute("/api/mobile/tracks")({
  server: {
    handlers: {
      GET: async () => {
        const databaseConfigured = Boolean(
          process.env.DATABASE_URL?.trim() ||
          process.env.POSTGRES_URL?.trim() ||
          process.env.POSTGRES_PRISMA_URL?.trim() ||
          process.env.NEON_DATABASE_URL?.trim(),
        );
        if (!databaseConfigured) {
          return Response.json({ ok: false, error: "Database is not configured.", code: "DATABASE_NOT_CONFIGURED" }, { status: 503 });
        }
        try {
          const data = await listTracks();
          return Response.json({ ok: true, tracks: data }, { status: 200 });
        } catch (e) {
          const message = e instanceof Error ? e.message : "listTracks failed";
          console.error("[mobile/tracks]", message);
          return Response.json({ ok: false, error: message }, { status: 500 });
        }
      },
    },
  },
});
