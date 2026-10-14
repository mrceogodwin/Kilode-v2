# Kilode v2 — Implementation Tracker (HONEST)

**Target:** https://kilode-v2.vercel.app/  
**Repo:** mrceogodwin/Kilode-v2  
**User override:** Blue header + blue bottom dock

## Real audit findings (2026-10-14)

### Critical bugs found by live inspection
1. **Menu drawer was black** — root cause: `styles.css` ends with a black-force block (`background: #0a0a0a !important` on `.menu-sheet`, `.menu-row`, `.menu-press`). Our white-blue layer was losing. Fixed by matching exact selectors in `styles-white-blue.css` (loads after).
2. **Logo white square** — `filter: brightness(0) invert(1)` on a non-transparent PNG produces a solid white box. Mitigated; may still need a true transparent white wordmark asset.
3. **"PASTE HERE"** still visible on home — source not found in components (possible leftover/debug node).
4. **Cinema** is a simplified functional shell (list + player + sound). Full vote/rate/quiz/chat/admin from the 50k artifact was NOT fully restored (imports dead).
5. **splash-screen.tsx** is `return null` — no launch experience.
6. **Large modules never redesigned:** `qonvo-app.tsx` (186k), `qonvo-screens.tsx` (203k), `socials-feed.tsx` (113k), `me-dashboard.tsx` (92k), music/communities/events/listings — only global CSS surface, not screen-by-screen.
7. **styles.css** is still the dark green/black theme engine; white-blue is an override layer fighting it.

### Stage status (honest)

| Stage | Name | Status |
|------|------|--------|
| 0 | Audit | DONE (this pass) |
| 1 | Design system | PARTIAL — tokens exist; fight with styles.css continues |
| 2 | Shell + dock | PARTIAL — blue chrome live; logo box, menu were broken |
| 3 | Home / discovery | PARTIAL — feed OK; density/polish incomplete |
| 4 | Social feed | PARTIAL |
| 5 | Media + article | PARTIAL — article route polished; media lane OK |
| 6 | Ecosystem modules | NOT DONE |
| 7 | Immersive Cinema | PARTIAL — simplified; missing full features |
| 8 | Native motion | PARTIAL |
| 9–12 | Remaining / QA / ship | NOT DONE |

### What is actually live and working
- Blue header + blue dock with labels
- White content canvas on home/media
- Fact/Cap, people you may know, composer
- Media grid with real news
- Article `/p/$id` reading comfort
- Cinema list + YouTube player + tick sound
- Menu should now be white after this CSS beat

### Required next (no more false complete)
1. Verify menu white live after deploy
2. Fix logo asset (transparent white wordmark)
3. Kill PASTE HERE
4. Restore full Cinema features from artifact OR remove dead imports
5. Screen-by-screen pass: My Space, Create, Chat, Music, Communities, Activity, /ops
6. Splash / opening experience
7. Full regression
