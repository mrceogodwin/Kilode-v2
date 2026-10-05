import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Activity, Bell, Layers, Menu, MessageSquare, Newspaper, Plus, Users, UsersRound, Zap } from "lucide-react";
import { getPublicProfile, sendDm } from "@/lib/social-server";
import { deleteOwnPost, reportPost } from "@/lib/forum-server";
import { connectByHandle, followLook, listConnects, listMyBlocks, listMyFollows, listMyMutes, listUserLikes, listUserReplies, listUserReposts, listUserTakes, toggleBlock, toggleFollow, toggleMute, type TakeRow } from "@/lib/takes-server";
import { seoHead } from "@/lib/seo";
import { ACCOUNT_KINDS, avatarUrl, fmtCount, handleColor, isOfficialHandle, timeAgo, timeLabel } from "@/lib/qonvo-data";
import { OfficialLockup } from "@/components/brand-lockup";
import { ReportMenu } from "@/components/report-menu";
import { VerifiedMark } from "@/components/handle-link";
import { VerifyDesk } from "@/components/verify-desk";
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
  const [replies, setReplies] = useState<{ id: string; takeId: string; body: string; ts: number }[]>([]);
  const [reposts, setReposts] = useState<TakeRow[]>([]);
  const [likes, setLikes] = useState<TakeRow[]>([]);
  const [cut, setCut] = useState<"takes" | "replies" | "reposts" | "media" | "likes">("takes");
  const [friend, setFriend] = useState<"add" | "pending" | "friends">("add");
  const [onFollow, setOnFollow] = useState(false);
  const [followsMe, setFollowsMe] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [muted, setMuted] = useState(false);
  const [look, setLook] = useState({ followers: 0, following: 0, mutuals: 0, followerHandles: [] as string[], followingHandles: [] as string[] });
  const [followList, setFollowList] = useState<"" | "followers" | "following">("");
  useEffect(() => {
    if (!profile?.handle) return;
    void listUserTakes({ data: profile.handle }).then((rows) => {
      setTakes([...rows].sort((a, b) => Number(b.meta.pinned === "1") - Number(a.meta.pinned === "1")));
    }).catch(() => setTakes([]));
    void listUserReplies({ data: profile.handle }).then(setReplies).catch(() => setReplies([]));
    void listUserReposts({ data: profile.handle }).then(setReposts).catch(() => setReposts([]));
    void listUserLikes({ data: profile.handle }).then(setLikes).catch(() => setLikes([]));
  }, [profile?.handle]);
  const mine = (session.user?.displayName || "").toLowerCase() === (profile?.handle || "").toLowerCase();
  useEffect(() => {
    if (!session.user || !profile?.handle || mine) return;
    void listConnects()
      .then((rows) => {
        const hit = rows.find((r) => r.handle.toLowerCase() === profile.handle.toLowerCase());
        if (!hit) return;
        setFriend(hit.dir === "friend" ? "friends" : hit.dir === "out" ? "pending" : "add");
      })
      .catch(() => undefined);
  }, [session.user, profile?.handle, mine]);
  useEffect(() => {
    if (!profile?.handle) return;
    void followLook({ data: { handle: profile.handle } }).then(setLook).catch(() => undefined);
  }, [profile?.handle]);
  useEffect(() => {
    if (!session.user || !profile?.handle || mine) return;
    void listMyFollows()
      .then((r) => {
        const h = profile.handle.toLowerCase();
        setOnFollow(r.following.some((p) => p.handle.toLowerCase() === h));
        setFollowsMe(r.followers.some((p) => p.handle.toLowerCase() === h));
      })
      .catch(() => undefined);
    void listMyBlocks()
      .then((rows) => setBlocked(rows.some((p) => p.handle.toLowerCase() === profile.handle.toLowerCase())))
      .catch(() => undefined);
    void listMyMutes()
      .then((rows) => setMuted(rows.some((p) => p.handle.toLowerCase() === profile.handle.toLowerCase())))
      .catch(() => undefined);
  }, [session.user, profile?.handle, mine]);
  const showBadge = Boolean(profile && (profile.verified || isOfficialHandle(profile.handle)));
  if (!profile) {
    return (
      <main className="grid min-h-svh place-items-center bg-bg p-6 text-fg">
        <div className="max-w-sm text-center">
          <div className="mx-auto mb-4 inline-flex justify-center"><OfficialLockup /></div>
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
  const occupation = [kindLabel, profile.stage, profile.genre, profile.city].filter(Boolean).join(" · ");
  const active = profile.lastSeen > 0 && Date.now() - profile.lastSeen < 180000;
  const posts = profile.posts.filter((p) => !!p?.id && !gone[p.id]);
  return (
    <main className="kilode-shell flex min-h-0 flex-col overflow-hidden bg-bg text-fg">
      <header className="kilode-chrome z-20 shrink-0">
        <div className="kilode-header-capsule">
          <div className="flex min-h-12 items-center gap-1">
            <a href="/" className="hdr-ico" aria-label="Menu"><Menu className="size-4" /></a>
            <a href="/" className="flex shrink-0 items-center" aria-label="Kilode home"><OfficialLockup /></a>
            <div className="ml-auto flex items-center gap-1">
              <a href="/?tab=socials" className="hdr-ico" aria-label="Friends"><Users className="size-4" /></a>
              <a href="/?open=notifications" className="hdr-ico" aria-label="Alerts"><Bell className="size-4" /></a>
              <a href="/?open=trending" className="hdr-ico" aria-label="BUZZ"><Zap className="buzz-zap size-4" /></a>
              <a href="/?open=inbox" className="hdr-ico" aria-label="Messages"><MessageSquare className="size-4" /></a>
            </div>
          </div>
        </div>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto dock-pad">
      <div className="mx-auto max-w-2xl px-4 pb-6">
        <div className="relative mt-4 overflow-hidden rounded-2xl border border-line bg-panel">
          <div className="h-24 bg-gradient-to-br from-[#1c3a28] via-[#14261b] to-[#0c0e0c]" />
          <div className="px-4 pb-4">
            <img src={profile.photo || avatarUrl(profile.handle)} alt="" className="-mt-8 size-16 rounded-full border-2 border-panel object-cover" />
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <h1 className="text-2xl font-extrabold" style={{ color: handleColor(profile.handle) }}>{profile.handle}</h1>
              {showBadge ? <VerifiedMark /> : null}
              {active ? <span className="live-dot" title="Active now" /> : null}
              {!mine ? <span className="ml-auto"><ReportMenu handle={profile.handle} signedIn={Boolean(session.user)} /></span> : null}
            </div>
            <p className="mt-1 text-[11px] font-bold tracking-[0.12em] text-muted">OCCUPATION</p>
            <p className="text-[13px] text-fg">{occupation || kindLabel}</p>
            <p className="mt-2 text-[11px] text-muted">{seenLabel(profile.lastSeen)}</p>
            <p className="mt-3 text-[11px] font-bold tracking-[0.12em] text-muted">BIO</p>
            <p className="text-sm text-fg/90">{profile.bio || "No bio yet."}</p>
            {profile.website ? (
              <a href={profile.website} className="mt-1 block text-xs text-lime-2" rel="noreferrer" target="_blank">
                {profile.website}
              </a>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[12px]">
              <span><b>{posts.length}</b> <span className="text-muted">posts</span></span>
              <button type="button" className="text-left" onClick={() => setFollowList((v) => (v === "followers" ? "" : "followers"))}>
                <b>{look.followers}</b> <span className="text-muted">followers</span>
              </button>
              <button type="button" className="text-left" onClick={() => setFollowList((v) => (v === "following" ? "" : "following"))}>
                <b>{look.following}</b> <span className="text-muted">following</span>
              </button>
              <span><b>{look.mutuals}</b> <span className="text-muted">mutuals</span></span>
              <span><b>{profile.friends.length}</b> <span className="text-muted">friends</span></span>
            </div>
            {followList ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {(followList === "followers" ? look.followerHandles : look.followingHandles).length === 0 ? (
                  <p className="text-[12px] text-muted">None yet.</p>
                ) : (followList === "followers" ? look.followerHandles : look.followingHandles).map((name) => (
                  <a key={name} href={`/u/${encodeURIComponent(name)}`} className="profile-pill">@{name}</a>
                ))}
              </div>
            ) : null}
            {!mine ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="follow-slim"
                  onClick={() => {
                    if (!session.user) {
                      window.location.href = "/login";
                      return;
                    }
                    const next = !onFollow;
                    setOnFollow(next);
                    setLook((cur) => ({ ...cur, followers: Math.max(0, cur.followers + (next ? 1 : -1)) }));
                    void toggleFollow({ data: { handle: profile.handle } }).then((r) => {
                      if (!r.ok) {
                        setOnFollow(!next);
                        setLook((cur) => ({ ...cur, followers: Math.max(0, cur.followers + (next ? -1 : 1)) }));
                        return;
                      }
                      setOnFollow(r.on);
                      void followLook({ data: { handle: profile.handle } }).then(setLook).catch(() => undefined);
                    });
                  }}
                >
                  {onFollow && followsMe ? "Mutual" : onFollow ? "Following" : followsMe ? "Follow back" : "Follow"}
                </button>
                <button
                  type="button"
                  disabled={friend !== "add"}
                  className="rounded-full border border-line px-4 py-2 text-[12px] font-bold disabled:opacity-70"
                  onClick={() => {
                    if (!session.user) {
                      window.location.href = "/login";
                      return;
                    }
                    void connectByHandle({ data: { handle: profile.handle } }).then((r) => {
                      if (!r.ok) return;
                      setFriend(r.status === "accepted" ? "friends" : "pending");
                    });
                  }}
                >
                  {friend === "friends" ? "Friends" : friend === "pending" ? "Requested" : "Add friend"}
                </button>
                <button
                  type="button"
                  className="rounded-full border border-line px-4 py-2 text-[12px] font-bold"
                  onClick={() => {
                    if (!session.user) {
                      window.location.href = "/login";
                      return;
                    }
                    void toggleBlock({ data: { handle: profile.handle } }).then((r) => {
                      if (!r.ok) return;
                      setBlocked(r.on);
                      if (r.on) {
                        setOnFollow(false);
                        setFriend("add");
                      }
                    });
                  }}
                >
                  {blocked ? "Unblock" : "Block"}
                </button>
                <button
                  type="button"
                  className="rounded-full border border-line px-4 py-2 text-[12px] font-bold"
                  onClick={() => {
                    if (!session.user) {
                      window.location.href = "/login";
                      return;
                    }
                    void toggleMute({ data: { handle: profile.handle } }).then((r) => {
                      if (!r.ok) return;
                      setMuted(r.on);
                    });
                  }}
                >
                  {muted ? "Unmute" : "Mute"}
                </button>
              </div>
            ) : null}
          </div>
        </div>
        <section className="profile-block">
          <h2>Friends</h2>
          {profile.friends.length === 0 ? <p className="text-sm text-muted">No friends yet.</p> : (
            <div className="mt-2 flex flex-wrap gap-2">
              {profile.friends.map((name) => (
                <a key={name} href={`/u/${encodeURIComponent(name)}`} className="profile-pill">@{name}</a>
              ))}
            </div>
          )}
        </section>
        {mine && !showBadge ? (
          <VerifyDesk kind={profile.kind || "member"} />
        ) : null}
        {!mine && friend === "friends" ? <ProfileMessage to={profile.handle} /> : !mine ? <p className="mt-3 text-[12px] text-muted">You can message after they accept.</p> : null}
        <button
          type="button"
          className="profile-pill mt-3"
          onClick={() => {
            const reason = window.prompt("Why report this account?")?.trim();
            if (!reason) return;
            void reportPost({ data: { postId: `user:${profile.handle}`, reason: reason.slice(0, 280) } });
          }}
        >
          Report account
        </button>
        <section className="profile-block">
          <div className="flex gap-1.5">
            {(["takes", "replies", "reposts", "media", "likes"] as const).map((id) => (
              <button key={id} type="button" className={`rounded-full px-3 py-1 text-[12px] font-bold ${cut === id ? "btn-join" : "border border-line"}`} onClick={() => setCut(id)}>
                {id === "takes" ? "Takes" : id === "replies" ? "Replies" : id === "reposts" ? "Reposts" : id === "media" ? "Media" : "Likes"}
              </button>
            ))}
          </div>
          <div className="mt-2 space-y-2">
            {cut === "takes" ? (
              takes.length === 0 ? <p className="text-sm text-muted">No takes yet.</p> : takes.map((t) => (
                <article key={t.id} className="rounded-xl border border-line bg-panel px-3 py-2">
                  <p className="whitespace-pre-wrap text-[13px] leading-snug">{t.meta.pinned === "1" ? "Pinned · " : ""}{t.body}</p>
                  <p className="mt-1 text-[11px] text-muted">{timeAgo(t.ts)} · {t.likes} likes · {t.reposts} reposts · {t.comments} replies</p>
                </article>
              ))
            ) : cut === "replies" ? (
              replies.length === 0 ? <p className="text-sm text-muted">No replies yet.</p> : replies.map((r) => (
                <article key={r.id} className="rounded-xl border border-line bg-panel px-3 py-2">
                  <p className="whitespace-pre-wrap text-[13px] leading-snug">{r.body}</p>
                  <p className="mt-1 text-[11px] text-muted">{timeAgo(r.ts)}</p>
                </article>
              ))
            ) : cut === "media" ? (
              takes.filter((t) => {
                const image = typeof t.meta.image === "string" ? t.meta.image : "";
                const video = typeof t.meta.video === "string" ? t.meta.video : "";
                return image.startsWith("http") || image.startsWith("data:image/") || video.startsWith("http");
              }).length === 0 ? (
                <p className="text-sm text-muted">No photos yet.</p>
              ) : (
                <div className="grid grid-cols-3 gap-1.5">
                  {takes.filter((t) => {
                    const image = typeof t.meta.image === "string" ? t.meta.image : "";
                    const video = typeof t.meta.video === "string" ? t.meta.video : "";
                    return image.startsWith("http") || image.startsWith("data:image/") || video.startsWith("http");
                  }).map((t) => (
                    typeof t.meta.video === "string" && t.meta.video.startsWith("http") ? (
                      <video key={t.id} src={t.meta.video} muted playsInline preload="metadata" className="aspect-square w-full rounded-lg object-cover" />
                    ) : (
                      <img key={t.id} src={String(t.meta.image)} alt="" referrerPolicy="no-referrer" className="aspect-square w-full rounded-lg object-cover" />
                    )
                  ))}
                </div>
              )
            ) : cut === "likes" ? (
              likes.length === 0 ? <p className="text-sm text-muted">No likes yet.</p> : likes.map((t) => (
                <article key={t.id} className="rounded-xl border border-line bg-panel px-3 py-2">
                  <p className="text-[11px] font-semibold text-muted">@{t.handle}</p>
                  <p className="mt-1 whitespace-pre-wrap text-[13px] leading-snug">{t.body}</p>
                </article>
              ))
            ) : reposts.length === 0 ? <p className="text-sm text-muted">No reposts yet.</p> : reposts.map((t) => (
              <article key={t.id} className="rounded-xl border border-line bg-panel px-3 py-2">
                <p className="text-[11px] font-semibold text-muted">Reposted from @{t.handle}</p>
                <p className="mt-1 whitespace-pre-wrap text-[13px] leading-snug">{t.body}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="profile-block">
          <h2>Posts</h2>
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
      </div>
      <nav className="dock pointer-events-auto z-40" aria-label="Kilode">
        <a href="/" className="app-tab grid place-items-center text-[10px] font-semibold"><Newspaper className="size-5" />Media</a>
        <a href={session.user ? "/?tab=socials" : "/login?mode=up"} className="app-tab grid place-items-center text-[10px] font-semibold"><UsersRound className="size-5" />Socials</a>
        <a href={session.user ? "/?open=create" : "/login?mode=up"} className="dock-plus" aria-label="Create"><Plus className="size-6" strokeWidth={2.75} /></a>
        <a href={session.user ? "/?open=search" : "/login?mode=up"} className="app-tab grid place-items-center text-[10px] font-semibold"><Activity className="size-5" />Activity</a>
        <a href={session.user ? "/?open=me" : "/login?mode=up"} className="app-tab grid place-items-center text-[10px] font-semibold"><Layers className="size-5" />My Space</a>
      </nav>
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