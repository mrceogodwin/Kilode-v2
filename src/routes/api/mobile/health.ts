import { createFileRoute } from "@tanstack/react-router";

/**
 * Mobile health probe — must accept Accept: application/json (unlike SPA HTML gate).
 * Native clients use this to distinguish bridge-up vs HTML-only 406.
 */
export const Route = createFileRoute("/api/mobile/health")({
  server: {
    handlers: {
      GET: async () =>
        Response.json({
          ok: true,
          service: "kilode-mobile-bridge",
          version: 1,
          ts: Date.now(),
        }),
    },
  },
});
