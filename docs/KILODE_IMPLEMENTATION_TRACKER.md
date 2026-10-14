# Kilode v2 — Implementation Tracker

**Target application:** https://kilode-v2.vercel.app/  
**Repository:** mrceogodwin/Kilode-v2  
**Branch:** main  
**Baseline commit:** 1eeaef40c4bd0bf030c8d01f448789f6e616fb98  
**Design direction:** White canvas + social blue (#1877F2) + native-app feel  
**Rule:** Preserve existing engine, routes, APIs, auth, ads, and business logic

---

## Stage checklist

| Stage | Name | Status |
|------|------|--------|
| 0 | Repository verification and application audit | VERIFIED COMPLETE |
| 1 | Design system and visual foundation | IN PROGRESS |
| 2 | Global app shell and navigation | NOT STARTED |
| 3 | Home and discovery | NOT STARTED |
| 4 | Social and community experiences | NOT STARTED |
| 5 | Media, articles, and advertising | NOT STARTED |
| 6 | Music, artists, promotion, ecosystem | NOT STARTED |
| 7 | Immersive Cinema | NOT STARTED |
| 8 | Native-app interaction and motion | NOT STARTED |
| 9 | Remaining pages and edge cases | NOT STARTED |
| 10 | Performance, responsive, accessibility | NOT STARTED |
| 11 | Full regression testing | NOT STARTED |
| 12 | Production readiness and shipping | NOT STARTED |

---

## Stage 0 — Audit results

### Verified deployment mapping
- Live site `https://kilode-v2.vercel.app/` returns 200 from Vercel.
- Repo `mrceogodwin/Kilode-v2` default branch `main` at `1eeaef4`.
- Stack: TanStack Start 1.168.60, React 19, Vite 8, Tailwind 4, better-auth, Neon/PGLite, Zustand.

### Route inventory (file-based)
**Public routes**
- `/` — index (home shell)
- `/p/$id` — article/post reader
- `/u/$handle` — public profile
- `/artist/$slug` — artist page
- `/login` — auth
- `/install` — PWA install
- `/about`, `/company`, `/contact`, `/content`
- `/advertise`, `/ads-policy`
- `/privacy`, `/terms`, `/cookies`, `/rules`, `/safety`, `/how-to`
- `/ops` — staff desk entry
- `/sitemap.xml`
- `/desk/*`, `/pay/*`, `/api/*`

**In-app screens (client shell via qonvo-app / qonvo-screens)**
- Home tabs: feeds (social-first), media, chat, music, cinema, advert, videos, watch, downloads, socials
- Search, dashboard (My Space), create, profile
- Bookmarks, notifications, inbox, settings, teams, badges, leaderboard
- Ads, jobs, market, rent, help, how, pricing
- Trending, spaces, TV, contact, admin
- Communities hub, activity, events, listings, shop

### Major components
- `qonvo-app.tsx` — app shell, dock, chrome, home tabs
- `qonvo-screens.tsx` — screen router
- `social-first.tsx` — social feed + media lane
- `cinema-pane.tsx`, `music-hub.tsx`, `communities-hub.tsx`, `me-dashboard.tsx`
- `listings-pane.tsx`, `markets-desk.tsx`, `advert-pane.tsx`, `events-pane.tsx`
- `ops-tools.tsx` — super admin / staff
- Auth under `src/lib/auth/*`

### Design baseline before this redesign
- Prior skin: ivory + charcoal/black chrome + gold accents + green brand remnants
- Social-first shell under `data-sf="1"`

### Functionality that must be preserved
- Auth, takes/posts, stories, news/media, chat, music, cinema
- Jobs / market / rent, ads, payments, notifications, follows
- Super admin / ops tools, PWA install

### Known constraints
- Changes ship via GitHub API push; Vercel deploys from `main`.

---

## Stage 1 notes
- Replaced `@theme` tokens with white + social blue palette.
- Added centralized `--k-*` design tokens.
- Global shell, header, dock, feed, menu, My Space, Create overrides toward white/blue.
- Press feedback + reduced-motion hooks added.
- Engine and components untouched in this stage (CSS-first foundation).
