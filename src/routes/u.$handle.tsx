import { createFileRoute, Link } from "@tanstack/react-router";
import { getPublicProfile } from "@/lib/social-server";
import { seoHead } from "@/lib/seo";
import { ACCOUNT_KINDS, fmtCount, handleColor, timeLabel } from "@/lib/qonvo-data";
import { KilodeWord, QonvoMark } from "@/components/qonvo-mark";

export const Route = createFileRoute("/u/$handle")({
  loader: async ({ params }) => {
    const handle = String((params as { handle?: string }).handle ?? "");
    const profile = await getPublicProfile({ data: handle }).catch(() => null);
    return { profile, handle };
  },
  head: ({ loaderData }) => {
    const p = loaderData?.profile;
    const handle = p?.handle || loaderData?.handle || "user";
    return seoHead({
      title: `${handle} on Kilode`,
      description: p?.bio || `${handle} — ${p?.kind || "member"} on Kilode.`,
      path: `/u/${encodeURIComponent(handle)}`,
    });
  },
  component: PublicProfile,
});

function PublicProfile() {
  const { profile, handle } = Route.useLoaderData() as {
    handle: string;
    profile: Awaited<ReturnType<typeof getPublicProfile>>;
  };
  if (!profile) {
    return (
      <main className="grid min-h-svh place-items-center bg-bg p-6 text-fg">
        <div>
          <p className="text-sm text-muted">No public profile for {handle}.</p>
          <Link to="/" className="mt-3 inline-block text-sm text-lime-2">
            Back to Kilode
          </Link>
        </div>
      </main>
    );
  }
  const kindLabel = ACCOUNT_KINDS.find((k) => k.id === profile.kind)?.label ?? "Member";
  return (
    <main className="min-h-svh bg-bg text-fg">
      <header className="flex items-center gap-2 border-b border-line px-4 py-3">
        <QonvoMark className="size-8" />
        <Link to="/">
          <KilodeWord className="text-lg" />
        </Link>
      </header>
      <div className="mx-auto max-w-2xl space-y-4 px-4 py-6">
        <div>
          <div className="text-2xl font-extrabold" style={{ color: handleColor(profile.handle) }}>
            {profile.handle}
          </div>
          <div className="text-xs text-lime-2">
            {kindLabel}
            {profile.stage ? ` · ${profile.stage}` : ""}
            {profile.city ? ` · ${profile.city}` : ""}
          </div>
          {profile.bio ? <p className="mt-2 text-sm text-muted">{profile.bio}</p> : null}
          {profile.website ? (
            <a href={profile.website} className="mt-1 block text-xs text-lime-2" rel="noreferrer" target="_blank">
              {profile.website}
            </a>
          ) : null}
        </div>
        <section>
          <h2 className="text-[10px] font-bold tracking-wide text-muted uppercase">Posts</h2>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {profile.posts.length === 0 ? <p className="col-span-2 text-sm text-muted">No public posts yet.</p> : null}
            {profile.posts.map((p) => (
              <a key={p.id} href={`/p/${p.slug || p.id}`} className="raised overflow-hidden rounded-lg">
                {p.image ? <img src={p.image} alt="" className="h-24 w-full object-cover" /> : <div className="h-16 bg-panel-3" />}
                <div className="p-2">
                  <div className="line-clamp-2 text-xs font-semibold">{p.title}</div>
                  <div className="text-[10px] text-muted">{timeLabel(p.ts)} · {fmtCount(p.views)} views</div>
                </div>
              </a>
            ))}
          </div>
        </section>
        {profile.tracks.length ? (
          <section>
            <h2 className="text-[10px] font-bold tracking-wide text-muted uppercase">Music</h2>
            <div className="mt-2 space-y-1">
              {profile.tracks.map((t) => (
                <div key={t.id} className="rounded-lg border border-line px-3 py-2 text-sm">
                  {t.title} <span className="text-muted">· {t.artist}</span>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
