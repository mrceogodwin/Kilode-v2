import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bell, Flame, Home, Menu, MessageSquare, Plus, Search, User, Users } from "lucide-react";
import { getPublicProfile, sendDm } from "@/lib/social-server";
import { deleteOwnPost, reportPost } from "@/lib/forum-server";
import { connectByHandle, listConnects, listUserTakes, type TakeRow } from "@/lib/takes-server";
import { seoHead } from "@/lib/seo";
import { ACCOUNT_KINDS, avatarUrl, fmtCount, handleColor, isOfficialHandle, timeAgo, timeLabel } from "@/lib/qonvo-data";
import { OfficialLockup } from "@/components/brand-lockup";
import { ReportMenu } from "@/components/report-menu";
import { VerifiedMark } from "@/components/handle-link";
import { GatewayPay } from "@/components/pay-checkout";
import { listPayMethods, submitVerification } from "@/lib/pay-gateways";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import type { CardProvider } from "@/lib/pay-money";

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
  const [friend, setFriend] = useState<"add" | "pending" | "friends">("add");
  const [payWith, setPayWith] = useState<CardProvider>("paystack");
  const [payNote, setPayNote] = useState("");
  const [gate, setGate] = useState<{ paystack: boolean; flutterwave: boolean; ngnPerUsd: number; verifyUsd: number } | null>(null);
  useEffect(() => {
    if (!profile?.handle) return;
    void listUserTakes({ data: profile.handle }).then(setTakes).catch(() => setTakes([]));
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
  const showBadge = Boolean(profile && (profile.verified || isOfficialHandle(profile.handle)));
  useEffect(() => {
    if (!mine || showBadge) return;
    void listPayMethods().then((m) => setGate(m)).catch(() => undefined);
  }, [mine, showBadge]);
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
              <a href="/" className="hdr-ico" aria-label="Alerts"><Bell className="size-4" /></a>
              <a href="/" className="hdr-ico" aria-label="Trending"><Flame className="size-4" /></a>
              <a href="/" className="hdr-ico" aria-label="Messages"><MessageSquare className="size-4" /></a>
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
              <span><b>{profile.tracks.length}</b> <span className="text-muted">tracks</span></span>
              <span><b>{profile.friends.length}</b> <span className="text-muted">friends</span></span>
            </div>
            {!mine ? (
              <button
                type="button"
                disabled={friend !== "add"}
                className="btn-join mt-3 rounded-full px-4 py-2 text-[12px] font-bold disabled:opacity-70"
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
          <section className="mt-4 rounded-2xl border border-line bg-panel p-3">
            <h2 className="text-sm font-extrabold">Get verified</h2>
            <p className="mt-1 text-[12px] text-muted">Pay the fee. Staff approve it. The badge shows after that, on this page and next to your name.</p>
            <div className="mt-2 flex gap-2">
              {(["paystack", "flutterwave"] as const).map((id) => (
                <button key={id} type="button" className={`rounded-full px-3 py-1 text-[12px] font-bold ${payWith === id ? "btn-join" : "border border-line"}`} onClick={() => setPayWith(id)}>
                  {id === "paystack" ? "Paystack" : "Flutterwave"}
                </button>
              ))}
            </div>
            <div className="mt-2">
              <GatewayPay
                provider={payWith}
                kind="verify"
                purpose="badge"
                usd={gate?.verifyUsd ?? 5}
                rate={gate?.ngnPerUsd ?? 1600}
                ready={payWith === "paystack" ? Boolean(gate?.paystack) : Boolean(gate?.flutterwave)}
                onPaid={(paid) => {
                  void submitVerification({ data: { reference: paid.reference } }).then((r) => {
                    setPayNote(r.ok ? "Paid. Staff still have to approve the badge." : r.reason);
                  });
                }}
              />
            </div>
            {payNote ? <p className="mt-2 text-[12px] text-lime-2">{payNote}</p> : null}
          </section>
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
          <h2>Timeline</h2>
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
        <a href="/" className="app-tab grid place-items-center text-[10px] font-semibold"><Home className="size-5" />Home</a>
        <a href="/?tab=socials" className="app-tab grid place-items-center text-[10px] font-semibold"><Search className="size-5" />Explore</a>
        <a href="/" className="dock-plus" aria-label="Create"><Plus className="size-6" strokeWidth={2.75} /></a>
        <a href="/" className="app-tab grid place-items-center text-[10px] font-semibold"><MessageSquare className="size-5" />Chat</a>
        <a href="/?open=me" className="app-tab grid place-items-center text-[10px] font-semibold"><User className="size-5" />Profile</a>
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