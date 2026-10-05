/** Artist push rules. The screen, the charge, and the tests use this file. */

const HOSTS: [string, string][] = [
  ["instagram.com", "Instagram"],
  ["tiktok.com", "TikTok"],
  ["x.com", "X"],
  ["twitter.com", "X"],
  ["youtube.com", "YouTube"],
  ["youtu.be", "YouTube"],
  ["open.spotify.com", "Spotify"],
  ["spotify.com", "Spotify"],
  ["audiomack.com", "Audiomack"],
  ["music.apple.com", "Apple Music"],
  ["soundcloud.com", "SoundCloud"],
  ["deezer.com", "Deezer"],
  ["boomplay.com", "Boomplay"],
];

export function pushNetwork(raw: string): { url: string; network: string } | null {
  const url = raw.trim();
  if (!/^https:\/\//i.test(url)) return null;
  try {
    const host = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
    const hit = HOSTS.find(([name]) => host === name || host.endsWith(`.${name}`));
    if (!hit) return null;
    return { url, network: hit[1] };
  } catch {
    return null;
  }
}

export function pushDays(purpose: string): 1 | 3 | 7 | 0 {
  if (purpose === "push-1") return 1;
  if (purpose === "push-3") return 3;
  if (purpose === "push-7") return 7;
  return 0;
}

/** A longer push costs more. This is not an ad slot. */
export function pushUsd(days: number): number {
  if (days === 1) return 4;
  if (days === 3) return 9;
  if (days === 7) return 18;
  return 0;
}

export function appleTrackId(raw: string): string {
  try {
    const url = new URL(raw);
    if (!url.hostname.includes("apple.com")) return "";
    return url.searchParams.get("i") || url.pathname.match(/\/(\d+)\/?$/)?.[1] || "";
  } catch {
    return "";
  }
}

export function artworkFromLookup(json: unknown): string {
  const row = (json as { results?: { artworkUrl100?: string }[] } | null)?.results?.[0];
  const art = String(row?.artworkUrl100 || "");
  if (!art.startsWith("https://")) return "";
  return art.replace("100x100bb", "300x300bb");
}
