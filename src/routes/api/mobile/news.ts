import { createFileRoute } from "@tanstack/react-router";
import { listPosts } from "@/lib/forum-server";
import { getSql } from "@/lib/db";

function databaseConfigured() {
  return Boolean(
    process.env.DATABASE_URL?.trim() ||
    process.env.POSTGRES_URL?.trim() ||
    process.env.POSTGRES_PRISMA_URL?.trim() ||
    process.env.NEON_DATABASE_URL?.trim(),
  );
}

export const Route = createFileRoute("/api/mobile/news")({
  server: {
    handlers: {
      GET: async () => {
        if (!databaseConfigured()) {
          return Response.json({ ok: false, error: "Database is not configured.", code: "DATABASE_NOT_CONFIGURED" }, { status: 503 });
        }
        try {
          await getSql();
          return Response.json(await listPosts());
        } catch (error) {
          console.error("[mobile/news GET]", error instanceof Error ? error.message : "failed");
          return Response.json({ ok: false, error: "News is temporarily unavailable." }, { status: 503 });
        }
      },
    },
  },
});
