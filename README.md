# Kilode

Nigeria’s live forum — feeds, chat, music, videos, ads. Talk Nigeria. Live.

- Site: [kilode.ng](https://kilode.ng)
- Live app: [kilode.vercel.app](https://kilode.vercel.app)
- Repo: [github.com/mrceogodwin/Kilode](https://github.com/mrceogodwin/Kilode)

## Run

```bash
npm install
npm run dev
```

## Super admin

Not in the public menu. Tap the **square bang mark** (left of the Kilode word) **5 times**. Sign in with username + password. If the staff table is empty, tap **Claim super admin** once.

Do not grant another user the same super role. Sub-admins are `mod` or `admin` only.

## News Engine (super admin)

Honest news ingest for Feeds — **Google News RSS** + publisher RSS (Punch, Premium Times, TechCabal, …).  
We do **not** scrape Google Search HTML / SERP pages.

Open **Admin** (tap bang mark 5× → `/ops`), claim super if needed, then use the **News Engine** panel: fetch → edit drafts → approve into Feeds. Optional LLM: set `OPENAI_API_KEY` or `NEWS_AI_KEY` (+ optional `NEWS_AI_URL` / `NEWS_AI_MODEL`). Without a key, a deterministic Kilode-voice rewriter still runs.


## Cinema (super admin)

Daily catalogue is a **curated cache** in Postgres (`nf_movies` / `CINEMA_SEED`). We never call the YouTube Data search API on page view.

- **Super Fetch** on `/ops` → Cinema panel upserts official trailer seeds and crowns Watching Now if empty. Session auth (super only).
- **Vercel Cron** once daily: `GET /api/cron/cinema` at `15 4 * * *` UTC (see `vercel.json`).
- Owner must set **`CRON_SECRET`** in Vercel → Settings → Environment Variables (generate a random string). Vercel Cron sends `Authorization: Bearer ${CRON_SECRET}`. If unset, the cron route returns **401**; Super Fetch still works.

## Auth

Users register with **username + password**. No public email. Login ids are private (`user@users.kilode.ng`).

## SEO

SSR titles, Open Graph, JSON-LD, `/robots.txt`, `/sitemap.xml`, and public posts at `/p/:id`.
