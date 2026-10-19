import { createFileRoute } from "@tanstack/react-router";
import { listRoomOverlay } from "@/lib/rooms-server";
import { ROOMS } from "@/lib/qonvo-data";

export const Route = createFileRoute("/api/mobile/rooms")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const overlay = await listRoomOverlay();
          const paused = new Set(overlay.paused || []);
          const overrides = overlay.overrides || {};
          const rooms = [
            ...ROOMS.map((room) => ({
              ...room,
              ...(overrides[room.id] || {}),
              paused: paused.has(room.id),
            })),
            ...(overlay.extra || []),
          ].filter((room) => !paused.has(room.id));
          return Response.json(rooms);
        } catch (error) {
          console.error("[mobile/rooms GET]", error instanceof Error ? error.message : "failed");
          return Response.json({ ok: false, error: "Rooms are temporarily unavailable." }, { status: 503 });
        }
      },
    },
  },
});
