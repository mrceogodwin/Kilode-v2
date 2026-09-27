let unlocked = false;
let ctx: AudioContext | null = null;

/** iOS and installed PWAs only play sound after a tap. Call this from the first pointer. */
export function unlockSound() {
  if (unlocked || typeof window === "undefined") return;
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  void ctx.resume().catch(() => undefined);
  unlocked = true;
}

/** Short chime. Silent if the phone has not been tapped yet, or if audio is blocked. */
export function pingMessage() {
  try {
    if (!ctx) unlockSound();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(660, now + 0.12);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.08, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.2);
  } catch {
    /* no audio device */
  }
}
