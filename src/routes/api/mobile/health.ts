import { createFileRoute } from "@tanstack/react-router";

/**
 * Mobile readiness probe.
 * Do not report a fully-ready backend just because the HTTP process is alive:
 * native feed, posting, music and sign-in need persistent Postgres + production auth.
 * This endpoint reports only whether required configuration is present; it never
 * returns credential values.
 */
function configured(...names: string[]) {
  return names.some((name) => Boolean(process.env[name]?.trim()));
}

export const Route = createFileRoute("/api/mobile/health")({
  server: {
    handlers: {
      GET: async () => {
        const database = configured(
          "DATABASE_URL",
          "POSTGRES_URL",
          "POSTGRES_PRISMA_URL",
          "NEON_DATABASE_URL",
        );
        const authEnabled = process.env.VITE_AUTH_ENABLED?.trim() !== "false";
        const productionAuth = configured("BETTER_AUTH_URL") &&
          configured("GROK_AUTH_ISSUER") &&
          configured("GROK_AUTH_CLIENT_ID") &&
          configured("GROK_AUTH_CLIENT_SECRET");
        const storage = configured("SUPABASE_URL", "VITE_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL") &&
          configured("SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SERVICE_KEY", "SUPABASE_SECRET_KEY");
        const ready = database && authEnabled && productionAuth;

        return Response.json(
          {
            ok: true,
            ready,
            service: "kilode-mobile-bridge",
            version: 2,
            checks: {
              http: true,
              database: database ? "configured" : "missing",
              auth: !authEnabled ? "disabled" : productionAuth ? "configured" : "production_credentials_missing",
              mediaStorage: storage ? "configured" : "optional_not_configured",
            },
            ts: Date.now(),
          },
          { status: ready ? 200 : 503 },
        );
      },
    },
  },
});
