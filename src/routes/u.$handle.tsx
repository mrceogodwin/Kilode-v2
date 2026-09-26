import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { getPublicProfile, sendDm } from "@/lib/social-server";
import { reportPost } from "@/lib/forum-server";
import { seoHead } from "@/lib/seo";
import { ACCOUNT_KINDS, fmtCount, handleColor, timeLabel } from "@/lib/qonvo-data";
import { BrandLockup } from "@/components/brand-lockup";

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
  return (
    <main className="min-h-svh bg-bg text-fg">
      <header className="flex items-center gap-2 border-b border-line px-4 py-3">
        <Link to="/" className="inline-flex">
          <BrandLockup size="sm" />
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
          {profile.photo ? <img src={profile.photo} alt="" className="mt-3 size-16 rounded-full object-cover" /> : null}
          {profile.bio ? <p className="mt-2 text-sm text-muted">{profile.bio}</p> : null}
          <ProfileMessage to={profile.handle} />
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
          {profile.website ? (
            <a href={profile.website} className="mt-1 block text-xs text-lime-2" rel="noreferrer" target="_blank">
              {profile.website}
            </a>
          ) : null}
        </div>
        <section>
          <h2 className="text-[11px] font-medium text-muted">Posts</h2>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {profile.posts.length === 0 ? <p className="col-span-2 text-sm text-muted">No public posts yet.</p> : null}
            {profile.posts.filter((p) => !!p?.id).map((p) => (
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
            <h2 className="text-[11px] font-medium text-muted">Music</h2>
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
      className="mt-3 flex gap-2"
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
      {note ? <span className="self-center text-[11px] text-muted">{note}</span> : null}
    </form>
  );
}
