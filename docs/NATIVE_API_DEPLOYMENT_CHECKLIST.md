# Kilode native API deployment checklist

The Expo app lives in `mrceogodwin/Kilode`. The existing web app and shared backend live in `mrceogodwin/Kilode-v2`. The native client must use the separate Kilode-v2 API host; do not point it at the legacy `kilode-nine.vercel.app` site.

## Required before the native app can be considered connected

Set these as Vercel Environment Variables on the **Kilode-v2 backend project**. Use separate Neon databases/credentials for Preview and Production if both environments will be used.

| Variable | Purpose | Required |
| --- | --- | --- |
| `DATABASE_URL` | Neon PostgreSQL pooled connection string. The server uses Postgres/Kysely and runs migrations during deployment. | Yes |
| `BETTER_AUTH_URL` | Canonical backend origin, e.g. `https://kilode-v2.vercel.app`. | Yes |
| `GROK_AUTH_ISSUER` | Approved production authentication broker issuer URL. | Yes |
| `GROK_AUTH_CLIENT_ID` | Production client ID issued by the auth broker. | Yes |
| `GROK_AUTH_CLIENT_SECRET` | Production client secret issued by the auth broker. Store only in Vercel; never commit it. | Yes |
| `VITE_AUTH_ENABLED` | Set to `true` to enforce real auth. Never leave auth disabled against a real database. | Yes |
| `SUPABASE_URL` | Supabase Storage project URL for media uploads. | For photo/video upload features |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only Supabase Storage key. Never expose it in the native app or a `VITE_*` variable. | For photo/video upload features |

The repository's current database adapter is designed for Neon/Postgres. Supabase is **not required as the primary database** unless the architecture is deliberately migrated; it is already used by media upload code. Do not switch providers merely to clear a missing environment variable.

After adding variables, redeploy Kilode-v2 so its migration step can run. Verify `GET /api/mobile/health` returns HTTP 200 with `ready: true` and checks for database/auth marked configured.

## Current mobile API bridge

| Endpoint | Purpose | Current contract |
| --- | --- | --- |
| `GET /api/mobile/health` | Liveness + readiness checks | Returns 503 and `ready: false` if database or production auth config is missing |
| `GET /api/mobile/rooms` | Built-in rooms plus saved overrides | Public read; default rooms can render without the database |
| `GET /api/mobile/takes` | Socials feed | Requires the database |
| `POST /api/mobile/takes` | Create a take | Requires a verified Better Auth session; unauthenticated requests must return 401 |
| `POST /api/mobile/takes/:takeId/replies` | Reply to a take | Requires a verified bearer session; reuses the existing moderation, rate-limit and ownership rules |
| `GET /api/mobile/tracks` | Music catalogue links | Requires the database |
| `GET /api/mobile/news` | Published news/media posts | Requires the database |
| `GET /api/mobile/carousel` | Featured published posts with images | Requires the database |
| `GET /api/mobile/activity` | Current user's notifications | Requires a verified bearer session and database |

The native client must treat seeded fallback data as preview-only and must not display it as a successful live API response.

## Verification before release

1. Check `/api/mobile/health` returns `ready: true`.
2. Test signup/sign-in and verify the returned session token is accepted by the bearer-authenticated mobile routes.
3. Create a test take, then read it back from `GET /api/mobile/takes`.
4. Verify tracks/news/carousel come from database rows, not local seed arrays.
5. Verify an unauthenticated write returns 401 and a valid session can write.
6. Verify Supabase upload tickets work before enabling image/video posting.
7. Build an EAS iOS preview and test on a real iPhone. A successful web export is not a native IPA build.

Never place database URLs, OAuth client secrets, or Supabase service-role keys in GitHub files, Expo public variables, or the mobile binary.
