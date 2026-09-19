import { createFileRoute } from "@tanstack/react-router";
import { auth } from "@/lib/auth/server";
import { ensureDbReady, MISSING_DB } from "@/lib/db";

async function handle(request: Request) {
  try {
    await ensureDbReady();
    return await auth.handler(request);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[auth]", message);
    const safe = /enoent|pglite|\/var\/task|econnrefused|127\.0\.0\.1:1|postgres is not connected/i.test(message)
      ? MISSING_DB
      : message;
    return new Response(JSON.stringify({ message: safe, code: "AUTH_CRASH" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: ({ request }) => handle(request),
      POST: ({ request }) => handle(request),
    },
  },
});
