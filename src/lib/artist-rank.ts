/** Charts use Kilode numbers only: opens and how new a track is. */

export type RankTrack = {
  id: string;
  title: string;
  artist: string;
  url: string;
  cover?: string;
  genre?: string;
  platform?: string;
  ts: number;
  views?: number;
};

export type RankArtist = {
  name: string;
  slug: string;
  cover: string;
  genre: string;
  url: string;
  plays: number;
  tracks: RankTrack[];
};

export function artistSlug(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

export function groupArtists(tracks: RankTrack[]): RankArtist[] {
  const map = new Map<string, RankArtist>();
  for (const track of tracks) {
    const name = track.artist?.trim();
    if (!name || !track.id) continue;
    let row = map.get(name);
    if (!row) {
      row = { name, slug: artistSlug(name), cover: "", genre: "", url: track.url, plays: 0, tracks: [] };
      map.set(name, row);
    }
    if (!row.cover && track.cover) row.cover = track.cover;
    if (!row.genre && track.genre) row.genre = track.genre;
    row.plays += Number(track.views || 0);
    row.tracks.push(track);
  }
  return [...map.values()].map((row) => ({
    ...row,
    tracks: [...row.tracks].sort((a, b) => b.ts - a.ts),
    cover: row.tracks.find((t) => t.cover)?.cover || row.cover,
    url: row.tracks[0]?.url || row.url,
  }));
}

export function rankSongs(tracks: RankTrack[]) {
  return [...tracks].sort((a, b) => (b.views || 0) - (a.views || 0) || b.ts - a.ts);
}

export function rankArtists(artists: RankArtist[]) {
  return [...artists].sort((a, b) => b.plays - a.plays || b.tracks.length - a.tracks.length || (b.tracks[0]?.ts || 0) - (a.tracks[0]?.ts || 0));
}

export function risingSongs(tracks: RankTrack[], now: number) {
  const cut = now - 14 * 86_400_000;
  return rankSongs(tracks.filter((t) => t.ts >= cut));
}

/** Null when nobody has seen it. Never invent a percent. */
export function clickRate(views: number, clicks: number): number | null {
  if (views < 1) return null;
  return Math.round((clicks / views) * 1000) / 10;
}
