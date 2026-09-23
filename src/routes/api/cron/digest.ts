import { createFileRoute } from "@tanstack/react-router";
import { runDigestFanout } from "@/lib/ad-slots-server";
import { env } from "@/lib/env.server";

/**
 * Once-daily Vercel Cron — emails new public Feeds posts to nf_digest subscribers.
 * Schedule in vercel.json: `30 5 * * *` (05:30 UTC).
 *
 * Auth: `Authorization: Bearer ${CRON_SECRET}` or `?CRON_SECRET=`.
 * Mail: RESEND_API_KEY (preferred) or SMTP_URL / SMTP_HOST+SMTP_USER+SMTP_PASS.
 * Optional: RESEND_FROM / MAIL_FROM, PUBLIC_SITE_URL.
 * Super can also trigger from /ops Ad slots panel.
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
    return Response.json({ ok: false, error: "CRON_SECRET not set on this deploy" }, { status: 401 });
  }
  if (!authorized(request)) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await runDigestFanout();
    return Response.json(result, { status: result.ok || result.mailReady === false ? 200 : 500 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "digest fan-out failed";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}

export const Route = createFileRoute("/api/cron/digest")({
  server: {
    handlers: {
      GET: async ({ request }) => handle(request),
      POST: async ({ request }) => handle(request),
    },
  },
});
