import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getPublicProfile, sendDm } from "@/lib/social-server";
import { deleteOwnPost, reportPost } from "@/lib/forum-server";
import { listUserTakes, type TakeRow } from "@/lib/takes-server";
import { seoHead } from "@/lib/seo";
import { ACCOUNT_KINDS, avatarUrl, fmtCount, handleColor, timeAgo, timeLabel } from "@/lib/qonvo-data";
import { BrandLockup } from "@/components/brand-lockup";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

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

function seenLabel(ts: number) {
  if (!ts) return "No recent activity";
  if (Date.now() - ts < 180000) return "Active now";
  return `Last active ${timeAgo(ts)}`;
}

function PublicProfile() {
  const { profile, handle } = Route.useLoaderData() as {
    handle: string;
    profile: Awaited<ReturnType<typeof getPublicProfile>>;
  };
  const session = useCurrentUserState();
  const [gone, setGone] = useState<Record<string, boolean>>({});
  const [takes, setTakes] = useState<TakeRow[]>([]);
  useEffect(() => {
    if (!profile?.handle) return;
    void listUserTakes({ data: profile.handle }).then(setTakes).catch(() => setTakes([]));
  }, [profile?.handle]);
  if (!profile) {
    return (
      <main className="grid min-h-svh place-items-center bg-bg p-6 text-fg">
        <div className="max-w-sm text-center">
          <div className="mx-auto mb-4 inline-flex justify-center"><BrandLockup size="lg" /></div>
          <p className="text-base font-semibold">No profile for {handle}</p>
          <p className="mt-1 text-sm text-muted">That handle is not public yet.</p>
          <Link to="/" className="btn-join mt-4 inline-block rounded-lg px-4 py-2 text-sm font-bold">
            Browse feeds
          </Link>
        </div>
      </main>
    );
  }
  const kindLabel = ACCOUNT_KINDS.find((k) => k.id === profile.kind)?.label ?? "Member";
  const mine = (session.user?.displayName || "").toLowerCase() === profile.handle.toLowerCase();
  const active = profile.lastSeen > 0 && Date.now() - profile.lastSeen < 180000;
  const posts = profile.posts.filter((p) => !!p?.id && !gone[p.id]);
  return (
    <main className="min-h-svh bg-bg text-fg">
      <header className="flex items-center gap-2 border-b border-line px-4 py-3">
        <Link to="/" className="inline-flex">
          <BrandLockup size="sm" />
        </Link>
      </header>
      <div className="mx-auto max-w-2xl px-4 pb-10">
        <div className="relative mt-4 overflow-hidden rounded-2xl border border-line bg-panel">
          <div className="h-24 bg-gradient-to-br from-[#1c3a28] via-[#14261b] to-[#0c0e0c]" />
          <div className="px-4 pb-4">
            <img src={profile.photo || avatarUrl(profile.handle)} alt="" className="-mt-8 size-16 rounded-full border-2 border-panel object-cover" />
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <h1 className="text-2xl font-extrabold" style={{ color: handleColor(profile.handle) }}>{profile.handle}</h1>
              {active ? <span className="live-dot" title="Active now" /> : null}
            </div>
            <p className="text-[12px] text-lime-2">
              {kindLabel}
              {profile.stage ? ` · ${profile.stage}` : ""}
              {profile.city ? ` · ${profile.city}` : ""}
            </p>
            <p className="mt-0.5 text-[11px] text-muted">{seenLabel(profile.lastSeen)}</p>
            <p className="mt-2 text-sm text-fg/90">{profile.bio || "No bio yet."}</p>
            {profile.website ? (
              <a href={profile.website} className="mt-1 block text-xs text-lime-2" rel="noreferrer" target="_blank">
                {profile.website}
              </a>
            ) : null}
            <div className="mt-3 flex gap-4 text-[12px]">
              <span><b>{posts.length}</b> <span className="text-muted">posts</span></span>
              <span><b>{profile.tracks.length}</b> <span className="text-muted">tracks</span></span>
            </div>
          </div>
        </div>
        {!mine ? <ProfileMessage to={profile.handle} /> : null}
        <button
          type="button"
          className="mt-2 text-[12px] font-semibold text-muted"
          onClick={() => {
            const reason = window.prompt("Why report this account?")?.trim();
            if (!reason) return;
            void reportPost({ data: { postId: `user:${profile.handle}`, reason: reason.slice(0, 280) } });
          }}
        >
          Report account
        </button>
        <section className="mt-5">
          <h2 className="text-[11px] font-bold tracking-[0.14em] text-lime-2">TIMELINE</h2>
          <div className="mt-2 space-y-2">
            {takes.length === 0 ? <p className="text-sm text-muted">No posts from this user yet.</p> : null}
            {takes.map((t) => (
              <article key={t.id} className="rounded-xl border border-line bg-panel px-3 py-2">
                <p className="whitespace-pre-wrap text-[13px] leading-snug">{t.body}</p>
                <p className="mt-1 text-[11px] text-muted">{timeAgo(t.ts)} · {t.likes} likes · {t.reposts} reposts · {t.comments} replies</p>
              </article>
            ))}
          </div>
        </section>
        <section className="mt-5">
          <h2 className="text-[11px] font-bold tracking-[0.14em] text-lime-2">POSTS</h2>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {posts.length === 0 ? <p className="col-span-2 text-sm text-muted">No public posts yet.</p> : null}
            {posts.map((p) => (
              <div key={p.id} className="raised overflow-hidden rounded-lg">
                <a href={`/p/${p.slug || p.id}`}>
                  {p.image ? <img src={p.image} alt="" referrerPolicy="no-referrer" className="h-24 w-full object-cover" /> : <div className="h-16 bg-panel-3" />}
                  <div className="p-2">
                    <div className="line-clamp-2 text-xs font-semibold">{p.title}</div>
                    <div className="text-[10px] text-muted">{timeLabel(p.ts)} · {fmtCount(p.views)} views</div>
                  </div>
                </a>
                {mine ? (
                  <button
                    type="button"
                    className="px-2 pb-2 text-[11px] font-bold text-danger"
                    onClick={() => {
                      if (!window.confirm("Delete this story?")) return;
                      void deleteOwnPost({ data: p.id }).then((r) => {
                        if (r.ok) setGone((m) => ({ ...m, [p.id]: true }));
                      });
                    }}
                  >
                    Delete
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        </section>
        {profile.tracks.length ? (
          <section className="mt-5">
            <h2 className="text-[11px] font-bold tracking-[0.14em] text-lime-2">MUSIC</h2>
            <div className="mt-2 space-y-1">
              {profile.tracks.filter((t) => !!t?.id).map((t) => (
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

function ProfileMessage({ to }: { to: string }) {
  const [body, setBody] = useState("");
  const [note, setNote] = useState("");
  return (
    <form
      className="mt-3 flex flex-wrap gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const text = body.trim();
        if (!text) return;
        void sendDm({ data: { to, body: text } })
          .then((r) => {
            setNote(r.ok ? "Sent." : r.reason);
            if (r.ok) setBody("");
          })
          .catch(() => setNote("Sign in to message this member."));
      }}
    >
      <input
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={`Message @${to}`}
        className="min-w-0 flex-1 rounded-lg border border-line bg-panel px-3 py-2 outline-none"
        style={{ fontSize: 16 }}
      />
      <button type="submit" className="rounded-lg bg-lime-2 px-3 text-sm font-bold text-[#102016]">
        Send
      </button>
      {note ? <span className="w-full text-[11px] text-muted">{note}</span> : null}
    </form>
  );
}