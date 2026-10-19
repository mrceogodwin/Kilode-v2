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

export const Route = createFileRoute("/api/mobile/carousel")({
  server: {
    handlers: {
      GET: async () => {
        if (!databaseConfigured()) {
          return Response.json({ ok: false, error: "Database is not configured.", code: "DATABASE_NOT_CONFIGURED" }, { status: 503 });
        }
        try {
          await getSql();
          const posts = await listPosts();
          const cards = posts
            .filter((post: { image?: string; title?: string }) => Boolean(post.image && post.title))
            .slice(0, 8)
            .map((post: { id: string; title: string; excerpt?: string; body?: string; image?: string; slug?: string; category?: string }) => ({
              id: post.id,
              title: post.title,
              sub: (post.excerpt || post.body || "").slice(0, 100),
              cta: "Read",
              image: post.image,
              href: `/p/${encodeURIComponent(post.slug || post.id)}`,
              category: post.category || "News",
            }));
          return Response.json(cards);
        } catch (error) {
          console.error("[mobile/carousel GET]", error instanceof Error ? error.message : "failed");
          return Response.json({ ok: false, error: "Featured content is temporarily unavailable." }, { status: 503 });
        }
      },
    },
  },
});
