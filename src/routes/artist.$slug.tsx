import { createFileRoute, Link } from "@tanstack/react-router";
import { listTracks } from "@/lib/forum-server";
import { groupArtists, type RankTrack } from "@/lib/artist-rank";
import { seoHead } from "@/lib/seo";
import { fmtCount } from "@/lib/qonvo-data";

export const Route = createFileRoute("/artist/$slug")({
  loader: async ({ params }) => {
    const slug = String((params as { slug?: string }).slug || "").slice(0, 60);
    const rows = await listTracks().catch(() => []);
    const tracks: RankTrack[] = (Array.isArray(rows) ? rows : []).map((t) => ({
      id: String(t.id),
      title: t.title,
      artist: t.artist,
      url: t.url,
      cover: t.cover || "",
      genre: t.genre || "",
      platform: t.platform,
      ts: Number(t.ts),
      views: Number(t.views || 0),
    }));
    const artist = groupArtists(tracks).find((a) => a.slug === slug) || null;
    return { artist, slug };
  },
  head: ({ loaderData }) => seoHead({
    title: loaderData?.artist?.name || "Artist",
    description: loaderData?.artist ? `${loaderData.artist.name} on Kilode. Songs open on the artist's own platform.` : "Artist on Kilode.",
    path: `/artist/${loaderData?.slug || ""}`,
    image: loaderData?.artist?.cover || undefined,
  }),
  component: ArtistPage,
});

function ArtistPage() {
  const { artist } = Route.useLoaderData();
  if (!artist) {
    return (
      <main className="grid min-h-svh place-items-center bg-[#0d0d0d] p-6 text-[#f5f3ee]">
        <div>
          <p className="text-sm text-[#a7a7a4]">That artist is not on Kilode yet.</p>
          <Link to="/" className="mt-3 inline-block text-sm text-[#ffd45a]">Back to Kilode</Link>
        </div>
      </main>
    );
  }
  return (
    <main className="min-h-svh bg-[#0d0d0d] px-4 py-6 text-[#f5f3ee]">
      <div className="mx-auto max-w-md">
        <Link to="/" className="text-xs font-bold text-[#ffd45a]">Kilode</Link>
        <div className="mt-4 flex items-center gap-3">
          {artist.cover ? <img src={artist.cover} alt="" referrerPolicy="no-referrer" className="size-16 rounded-full object-cover" /> : <span className="grid size-16 place-items-center rounded-full bg-[#191919] text-lg font-extrabold text-[#ffd45a]">{artist.name.slice(0, 1)}</span>}
          <div>
            <div className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#ffd45a]">{artist.genre || "Music"}</div>
            <h1 className="text-2xl font-extrabold">{artist.name}</h1>
            <p className="text-xs text-[#a7a7a4]">{fmtCount(artist.plays)} Kilode opens · {artist.tracks.length} release{artist.tracks.length === 1 ? "" : "s"}</p>
          </div>
        </div>
        <p className="mt-3 text-[13px] leading-snug text-[#a7a7a4]">This page only links out. The song plays on the artist's platform.</p>
        <div className="mt-4 space-y-2">
          {artist.tracks.map((t) => (
            <a key={t.id} href={t.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-xl border border-[#343434] bg-[#191919] p-2">
              {t.cover ? <img src={t.cover} alt="" referrerPolicy="no-referrer" className="size-10 rounded-lg object-cover" /> : <span className="grid size-10 place-items-center rounded-lg bg-black text-xs text-[#ffd45a]">{t.title.slice(0, 1)}</span>}
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold">{t.title}</span>
                <span className="text-[11px] text-[#a7a7a4]">{t.platform || "Link"} · {t.views ? `${fmtCount(t.views)} opens` : "No opens yet"}</span>
              </span>
            </a>
          ))}
        </div>
      </div>
    </main>
  );
}
