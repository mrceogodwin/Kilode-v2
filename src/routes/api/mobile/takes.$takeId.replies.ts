import { createFileRoute } from "@tanstack/react-router";
import { replyTakeForUser } from "@/lib/takes-server";
import { getSessionUser } from "@/lib/auth/verify.server";

export const Route = createFileRoute("/api/mobile/takes/$takeId/replies")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const takeId = String(params.takeId || "").trim().slice(0, 80);
        if (!takeId) {
          return Response.json({ ok: false, error: "Take ID is required." }, { status: 400 });
        }
        const payload = (await request.json().catch(() => ({}))) as {
          body?: string;
          text?: string;
          image?: string;
        };
        const body = String(payload.body ?? payload.text ?? "").trim().slice(0, 180);
        const authorization = request.headers.get("authorization") || "";
        const bearer = authorization.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
        let user;
        try {
          user = await getSessionUser(bearer);
        } catch {
          user = null;
        }
        if (!user) {
          return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }
        try {
          const result = await replyTakeForUser(user.id, {
            id: takeId,
            body,
            image: payload.image,
          });
          return Response.json(result, { status: result.ok === false ? 400 : 200 });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Reply failed.";
          console.error("[mobile/takes replies POST]", message);
          return Response.json({ ok: false, error: "Reply could not be saved." }, { status: 503 });
        }
      },
    },
  },
});
