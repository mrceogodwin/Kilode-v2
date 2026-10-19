import { createFileRoute } from "@tanstack/react-router";
import { listTakes, saveTakeForUser } from "@/lib/takes-server";
import { getSessionUser } from "@/lib/auth/verify.server";

/**
 * Mobile bridge for Socials takes.
 * Reuses Kilode-v2 createServerFn handlers (listTakes / saveTake).
 *
 * GET  /api/mobile/takes?before=<ts>
 * POST /api/mobile/takes  JSON { body, kind? }  (requires session via better-auth cookie/bearer)
 */
async function getTakes(request: Request) {
  try {
    const url = new URL(request.url);
    const beforeRaw = url.searchParams.get("before");
    const before = beforeRaw ? Number(beforeRaw) : undefined;
    const data =
      before && Number.isFinite(before) && before > 0
        ? await listTakes({ data: { before } })
        : await listTakes({ data: {} });
    return Response.json({ ok: true, ...((data as object) || {}) }, { status: 200 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "listTakes failed";
    console.error("[mobile/takes GET]", message);
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}

async function postTake(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      body?: string;
      text?: string;
      kind?: string;
      image?: string;
      video?: string;
      place?: string;
    };
    const text = (body.body ?? body.text ?? "").trim();
    if (!text) {
      return Response.json({ ok: false, error: "Write something first." }, { status: 400 });
    }
    const authorization = request.headers.get("authorization") || "";
    const bearer = authorization.match(/^Bearer\\s+(.+)$/i)?.[1]?.trim();
    let user;
    try {
      user = await getSessionUser(bearer);
    } catch {
      user = null;
    }
    if (!user) {
      return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    const result = await saveTakeForUser(user.id, {
      body: text,
      kind: body.kind || "take",
      image: body.image,
      video: body.video,
      place: body.place,
      line: body.line,
      quoteName: body.quoteName,
      quoteHandle: body.quoteHandle,
      quoteBody: body.quoteBody,
      quoteHref: body.quoteHref,
      alt: body.alt,
      circle: body.circle,
    });
    const status = (result as { ok?: boolean })?.ok === false ? 400 : 200;
    return Response.json(result, { status });
  } catch (e) {
    const message = e instanceof Error ? e.message : "saveTake failed";
    console.error("[mobile/takes POST]", message);
    // Unauthenticated saveTake often throws / returns auth failure
    const lower = message.toLowerCase();
    const status = lower.includes("auth") || lower.includes("login") || lower.includes("session")
      ? 401
      : 500;
    return Response.json({ ok: false, error: message }, { status });
  }
}

export const Route = createFileRoute("/api/mobile/takes")({
  server: {
    handlers: {
      GET: async ({ request }) => getTakes(request),
      POST: async ({ request }) => postTake(request),
    },
  },
});
