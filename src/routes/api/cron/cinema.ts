import { createFileRoute } from "@tanstack/react-router";
import { runCinemaCatalogFetch } from "@/lib/cinema-server";
import { env } from "@/lib/env.server";

/**
 * Once-daily Vercel Cron — clears leftover sample films and crowns a real approved title if none is pinned.
 * Schedule in vercel.json: `15 4 * * *` (04:15 UTC).
 *
 * Auth: `Authorization: Bearer ${CRON_SECRET}` (Vercel Cron default) or
 * `?CRON_SECRET=` query. Owner must set CRON_SECRET in Vercel env (random string).
 * If CRON_SECRET is missing, this route returns 401. Super Fetch on /ops still works via session.
 */
function authorized(request: Request): boolean {
  const secret = env("CRON_SECRET");
  if (!secret) return false;
  const header = request.headers.get("authorization") || "";
  if (header === `Bearer ${secret}`) return true;
  try {
    const url = new URL(request.url);
    const q = url.searchParams.get("CRON_SECRET") || url.searchParams.get("cron_secret");
    if (q && q === secret) return true;
  } catch {
    /* ignore */
  }
  return false;
}

async function handle(request: Request) {
  if (!env("CRON_SECRET")) {
    return Response.json(
      { ok: false, error: "CRON_SECRET not set on this deploy" },
      { status: 401 },
    );
  }
  if (!authorized(request)) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await runCinemaCatalogFetch();
    return Response.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "cinema fetch failed";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}

export const Route = createFileRoute("/api/cron/cinema")({
  server: {
    handlers: {
      GET: async ({ request }) => handle(request),
      POST: async ({ request }) => handle(request),
    },
  },
});
