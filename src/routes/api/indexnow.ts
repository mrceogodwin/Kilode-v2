import { createFileRoute } from "@tanstack/react-router";
import { readAiKey } from "@/lib/keys-server";

export const Route = createFileRoute("/api/indexnow")({
  server: {
    handlers: {
      GET: async () => {
        const key = await readAiKey("indexnow");
        if (!key) return new Response("missing", { status: 404, headers: { "content-type": "text/plain" } });
        return new Response(key, {
          status: 200,
          headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=300" },
        });
      },
    },
  },
});
