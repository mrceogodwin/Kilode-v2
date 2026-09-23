# Kilode — continue from THIS repo (paste into Grok Build)

You are working on **github.com/mrceogodwin/Kilode** (live: https://kilode.vercel.app).

Do **NOT** rebuild. Do **NOT** add Prisma, JWT, Socket.IO, Redis, Supabase, or Paystack unless Super Admin later stores API keys.

## Stack (already live)

TanStack Start + Better Auth (username + password, hidden email) + Postgres (`getSql`) + server functions in `src/lib/forum-server.ts` + `staff-server.ts`. Staff door: tap logo **5 times** or `/ops`. Super cannot grant another super. Sub-admins: `mod` / `admin`.

## Account types (immutable)

Register picker in `ACCOUNT_KINDS` (`src/lib/qonvo-data.ts`). After first save, `saveProfile` **keeps existing kind**. Super admin may override later.

| id | Label | Can |
|---|---|---|
| member | Normal user | chat, feeds, vote, apply jobs |
| artist | Artist | + music URLs only (no audio files) |
| writer | Writer | feeds |
| advertiser | Ads Poster | + business ads (legacy id — keep) |
| cinema | Advertiser (Cinema) | + movie YouTube URLs |
| job_poster | Job Poster | + jobs |
| job_seeker | Job Seeker | apply jobs |
| vendor | Marketplace seller | showcase, no in-app checkout |
| renter | Rent / space lister | listings + contact |
| brand | Brand | ads + showcase |

Permissions: `src/lib/permissions.ts` `canKind()`. **Enforce in server functions**, not only UI. `saveTrack` = artist. `saveAdRow` = advertiser/brand.

Admin / Mod / Super are **staff**, not register types.

## Payments — manual crypto NOW. NOWPayments later.

Keep `nf_wallets` + tx hash + staff approve.

Owner wallets (already seeded in `migrations/0017_wallets_seed.sql`):

- BTC `bc1qzttekprl8khj06kzckld3kwmh3tghzgt6vevug`
- SOL `Dj9UHi549gcqcU8nHDFdFTLAScubChrVaKbDv2rwgCGE`
- ETH `0x6199542599eEb56Eec2F6A35F21Dd478Ea14983e`

`/ops` Pay-to wallets: edit, **Add coin**, Delete extra. User screens: **Copy** + warning (verify first/last 6 chars, never DM, wrong network = lost).

**NOWPayments:** do not wire until Super Admin pastes an API key in System Settings. Manual wallets stay the default. NOWPayments would auto-invoice many coins but needs KYC, fees, webhooks — extra crash surface on Vercel Hobby.

## Cinema (next flagship — not a YouTube search storm)

- No movie file hosting.
- Only `cinema` kind submits YouTube URL → pending → staff approve → voting pool.
- Users (any signed-in) vote **once per day per movie**.
- Watching Now = approved + top votes (or Super override). YouTube **iframe embed**. Chat uses existing `nf_msgs` with `room_id = cinema:{movieId}` — **no new websocket**. Poll like current chat (6.5s).
- Daily list: **Vercel Cron** `GET /api/cron/cinema` (`15 4 * * *` UTC in `vercel.json`, needs `CRON_SECRET` env) or Super **Fetch** in `/ops` Cinema panel. Upserts `CINEMA_SEED` into `nf_movies`. Cache in DB. Never call YouTube search on every page view.
- Sections: Top, Trending, Watching Now, Nigerian, Global, Coming Soon (filter columns on `nf_movies`).
- Mobile tabs: Feeds · Music · **Cinema** · Chat · More. Cinema next to Music.

New tables only (additive SQL): `nf_movies`, `nf_votes`. Reuse `nf_msgs`.

## Other modules (after Cinema)

Jobs, Marketplace, Rent: URL + contact showcase, staff approve. No in-app checkout.

## Admin

Extend existing `/ops` Admin — do not a new SaaS dashboard. Super-only: wallets, grant/revoke, News Engine, cinema override. Mods: hide/report/mute.

## Legal / credit (already in Help + menu footer)

Terms + Privacy in Help. Tiny Telegram https://t.me/Builtbystacks (@Builtbystacks) · Squadglobaldynasty. Do not make it loud.

## Quality

Every commit: `npm run build` must pass. Additive migrations only. No Staff link in the public menu. Test as a real user: register Artist vs Member, Member cannot add music, Ads Poster can place ad + copy wallet, logo 5× still opens /ops.

If you stop, leave `main` green so the next Grok bot continues from **mrceogodwin/Kilode**.
