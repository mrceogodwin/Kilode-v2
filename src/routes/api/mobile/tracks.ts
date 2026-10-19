import { createFileRoute } from "@tanstack/react-router";
import { listTracks } from "@/lib/forum-server";

/** Mobile bridge — listTracks from forum-server */
export const Route = createFileRoute("/api/mobile/tracks")({
  server: {
    handlers: {
      GET: async () => {
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
