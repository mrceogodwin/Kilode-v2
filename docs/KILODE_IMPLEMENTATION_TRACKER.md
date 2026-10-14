# Kilode v2 — Implementation Tracker

**Target:** https://kilode-v2.vercel.app/  
**Repo:** mrceogodwin/Kilode-v2  
**Protocol sources:** white+blue UI redesign + native experience engineering + mandatory stages

## Honest status (read this)

Earlier passes over-indexed on **white surfaces + blue buttons**. That is only part of the brief.

The full docs also require:
- Tiny refined **typography scale** (nav/meta/body/title)
- **Motion system** (press 80–160ms, transitions 180–280ms, reduced-motion)
- Premium **dock** with labels + safe-area
- **Not** turning every block into a heavy rounded card (dividers OK)
- **Cinema** as immersive world (dark panel, poster motion, optional sound) — not a blue paint job
- Optional **sound** with preference, never on load
- Preserve engine, ads, auth, playback
- Stage verification on the **live** app, not “CSS written”

## Stage checklist

| Stage | Name | Status |
|------|------|--------|
| 0 | Audit | VERIFIED COMPLETE |
| 1 | Design system (tokens + type + motion vars) | IN PROGRESS — type/motion tokens added this pass |
| 2 | Shell + navigation + dock labels | IN PROGRESS |
| 3 | Home / discovery density | IN PROGRESS |
| 4 | Social feed (dividers, compact type) | IN PROGRESS |
| 5 | Media + article reading comfort | IN PROGRESS |
| 6 | Ecosystem modules | IN PROGRESS (surface pass only so far) |
| 7 | Immersive Cinema | IN PROGRESS (dark panel + hover; sound wiring next) |
| 8 | Native motion / sheets / continuity | IN PROGRESS (sheet animation + press; route continuity TBD) |
| 9 | Remaining routes | NOT STARTED |
| 10 | Performance / a11y | NOT STARTED |
| 11 | Regression | NOT STARTED |
| 12 | Ship checks | NOT STARTED |

## This pass

- CSS: full type scale (`--k-fs-*`), motion tokens, press feedback, dock tab type, feed **dividers** instead of oversized cards, sheet rise animation, article body 15px/1.65
- `sfx.ts`: persist `kilode-sfx` preference; `soundsEnabled()`
- Engine still untouched for posts/cinema/vote/ads

## Still required by the docs (next)

1. Wire `kilodeSound('tick')` on Cinema poster select (optional, after gesture)
2. Sound on/off control in settings UI
3. Explicit dock labels under sf-dock icons in JSX
4. Route transition continuity for kept tabs
5. Per-screen visual QA at 375/390 against protocol
6. Mark stages VERIFIED COMPLETE only after live checks
