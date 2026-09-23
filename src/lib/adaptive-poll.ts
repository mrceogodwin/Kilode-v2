/**
 * Adaptive poll cadence for chat / cinema talk (Fluid Active CPU hygiene).
 * Active tab + recent input → snappy; idle → slow; hidden → stop.
 * Realtime can come later via PartyKit/Ably — do not migrate to WebSockets/Supabase here.
 */
export const CHAT_POLL_ACTIVE_MS = 12_000;
export const CHAT_POLL_IDLE_MS = 45_000;
export const CINEMA_POLL_ACTIVE_MS = 14_000;
export const CINEMA_POLL_IDLE_MS = 50_000;
/** No pointer/key activity for this long → use idle interval. */
export const POLL_IDLE_AFTER_MS = 50_000;

export const ACTIVITY_EVENTS = ["pointerdown", "keydown", "touchstart"] as const;

export function pollDelayMs(
  lastActivityAt: number,
  activeMs: number,
  idleMs: number,
  now = Date.now(),
): number {
  if (typeof document !== "undefined" && document.hidden) return 0;
  return now - lastActivityAt < POLL_IDLE_AFTER_MS ? activeMs : idleMs;
}
