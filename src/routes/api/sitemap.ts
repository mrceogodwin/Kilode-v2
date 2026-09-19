import { createFileRoute } from "@tanstack/react-router";
import { sitemapXml } from "@/lib/seo-server";

export const Route = createFileRoute("/api/sitemap")({
  server: {
    handlers: {
      GET: async () => {
        const xml = await sitemapXml();
        return new Response(xml, {
          status: 200,
          headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=600" },
        });
      },
    },
  },
});
