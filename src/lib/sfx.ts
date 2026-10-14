let on = true;
let audio: AudioContext | null = null;
let loaded = false;

function readPref() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const v = localStorage.getItem("kilode-sfx");
    if (v === "0") on = false;
    if (v === "1") on = true;
  } catch {
    /* ignore */
  }
}

/** Optional interface sounds. Off by default only if user set kilode-sfx=0. */
export function setSounds(next: boolean) {
  on = next;
  try {
    localStorage.setItem("kilode-sfx", next ? "1" : "0");
  } catch {
    /* ignore */
  }
}

export function soundsEnabled() {
  readPref();
  return on;
}

function tone() {
  readPref();
  if (!on || typeof window === "undefined") return null;
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!audio) audio = new AC();
  if (audio.state === "suspended") void audio.resume();
  return audio;
}

/** Kilode's own short click. Nothing plays when sounds are off or before user gesture. */
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
    gain.gain.setValueAtTime(0.012, t);
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
