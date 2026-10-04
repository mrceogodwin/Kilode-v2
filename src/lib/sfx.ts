let on = true;
let audio: AudioContext | null = null;

export function setSounds(next: boolean) {
  on = next;
}

function tone() {
  if (!on || typeof window === "undefined") return null;
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!audio) audio = new AC();
  if (audio.state === "suspended") void audio.resume();
  return audio;
}

/** Kilode's own short click. Nothing is played when super admin turns sounds off. */
export function kilodeSound(kind: "tick" | "sent" | "sheet" | "ask") {
  const ac = tone();
  if (!ac) return;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.connect(gain);
  gain.connect(ac.destination);
  const t = ac.currentTime;
  if (kind === "tick") {
    osc.type = "square";
    osc.frequency.setValueAtTime(1760, t);
    osc.frequency.exponentialRampToValueAtTime(880, t + 0.045);
    gain.gain.setValueAtTime(0.035, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    osc.start(t);
    osc.stop(t + 0.055);
    return;
  }
  if (kind === "sheet") {
    osc.type = "sine";
    osc.frequency.setValueAtTime(440, t);
    osc.frequency.exponentialRampToValueAtTime(160, t + 0.12);
    gain.gain.setValueAtTime(0.05, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    osc.start(t);
    osc.stop(t + 0.15);
    return;
  }
  if (kind === "ask") {
    osc.type = "triangle";
    osc.frequency.setValueAtTime(523, t);
    osc.frequency.setValueAtTime(784, t + 0.07);
    gain.gain.setValueAtTime(0.045, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    osc.start(t);
    osc.stop(t + 0.19);
    return;
  }
  osc.type = "triangle";
  osc.frequency.setValueAtTime(660, t);
  osc.frequency.setValueAtTime(990, t + 0.06);
  gain.gain.setValueAtTime(0.05, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
  osc.start(t);
  osc.stop(t + 0.17);
}
