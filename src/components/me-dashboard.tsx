import { useEffect, useState } from "react";
import {
  Bookmark, Store, User, Users, UsersRound, MessageSquare,
  Briefcase, Megaphone, Radio, Film, Building2, LogOut,
} from "lucide-react";
import { SafetyBlock } from "@/components/me-safety";
import { ListingsDesk } from "@/components/me-listings";
import { ArtistDesk } from "@/components/me-artist";
import { STAFF_PATH } from "@/lib/staff-path";
import { AvatarImg } from "@/components/account-kind";
import {
  disconnectFellow, listConnects, listMyFollows, listSavedTakes,
  replyConnect, toggleFollow,
  type ConnectRow, type FollowPerson, type TakeRow,
} from "@/lib/takes-server";

function goto(detail: { screen?: string; tab?: string }) {
  window.dispatchEvent(new CustomEvent("kilode:goto", { detail }));
}

export function FriendsBlock({ rows, onChange, onBack }: { rows: ConnectRow[]; onChange: () => void; onBack: () => void }) {
  const incoming = rows.filter((r) => r.dir === "in");
  const friends = rows.filter((r) => r.dir === "friend");
  const sent = rows.filter((r) => r.dir === "out");
  return (
    <section id="me-friends" className="mb-4">
      <button type="button" className="mb-3 text-[13px] font-semibold text-lime-2" onClick={onBack}>
        ← Back
      </button>
      <h2 className="text-lg font-extrabold">Friends</h2>
      {incoming.length === 0 && friends.length === 0 && sent.length === 0 ? (
        <p className="mt-3 text-[13px] text-muted">No one yet. Connect from Socials.</p>
      ) : null}
      {incoming.length > 0 ? <p className="mt-3 text-[11px] font-semibold text-muted">Requests</p> : null}
      {incoming.map((r) => (
        <div key={`in-${r.id}`} className="mt-2 flex items-center gap-2 border-b border-line py-2">
          <AvatarImg handle={r.handle} size={36} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[14px] font-semibold">@{r.handle}</div>
            <div className="text-[11px] text-muted">{r.role || "member"}</div>
          </div>
          <button
            type="button"
            className="rounded-full bg-lime-2 px-2.5 py-1 text-[12px] font-semibold text-[#102016]"
            onClick={() => {
              void replyConnect({ data: { id: r.id, accept: true } }).then((res) => {
                if (res && "ok" in res && res.ok === false) return;
                onChange();
              });
            }}
          >
            Accept
          </button>
          <button
            type="button"
            className="rounded-full border border-line px-2.5 py-1 text-[12px]"
            onClick={() => {
              void replyConnect({ data: { id: r.id, accept: false } }).then(() => onChange());
            }}
          >
            Decline
          </button>
        </div>
      ))}
      {sent.map((r) => (
        <div key={`out-${r.id}`} className="mt-2 flex items-center gap-2 border-b border-line py-2 text-[13px] text-muted">
          <AvatarImg handle={r.handle} size={36} />
          <span className="min-w-0 flex-1 truncate">@{r.handle}</span>
          <span className="text-[11px]">Asked</span>
        </div>
      ))}
      {friends.map((r) => (
        <div key={`ok-${r.id}`} className="mt-2 flex items-center gap-2 border-b border-line py-2">
          <a href={`/u/${encodeURIComponent(r.handle)}`} className="flex min-w-0 flex-1 items-center gap-2">
            <AvatarImg handle={r.handle} size={36} />
            <span className="min-w-0">
              <span className="block truncate text-[14px] font-semibold">@{r.handle}</span>
              <span className="text-[11px] text-muted">Connected</span>
            </span>
          </a>
          <a href={`/u/${encodeURIComponent(r.handle)}`} className="rounded-full border border-line px-2.5 py-1 text-[12px] font-semibold">
            Message
          </a>
          <button
            type="button"
            className="text-[12px] text-muted"
            onClick={() => {
              void disconnectFellow({ data: { id: r.id } }).then(() => onChange());
            }}
          >
            Remove
          </button>
        </div>
      ))}
    </section>
  );
}

export function FollowsBlock({ onBack }: { onBack: () => void }) {
  const [rows, setRows] = useState<{ following: FollowPerson[]; followers: FollowPerson[] }>({ following: [], followers: [] });
  const [tab, setTab] = useState<"following" | "followers" | "mutual">("following");
  useEffect(() => {
    void listMyFollows().then(setRows).catch(() => undefined);
  }, []);
  const list = tab === "followers" ? rows.followers : tab === "mutual" ? rows.following.filter((p) => p.back) : rows.following;
  return (
    <section className="mb-4">
      <button type="button" className="mb-3 text-[13px] font-semibold text-lime-2" onClick={onBack}>
        ← Back
      </button>
      <h2 className="text-lg font-extrabold">Follows</h2>
      <div className="mt-3 flex gap-1.5">
        {(
          [
            ["following", "Following"],
            ["followers", "Followers"],
            ["mutual", "Mutuals"],
          ] as const
        ).map(([id, label]) => (
          <button key={id} type="button" className={`rounded-full border px-3 py-1 text-[12px] font-bold ${tab === id ? "border-lime-2 bg-lime-2 text-black" : "border-line"}`} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>
      {list.length === 0 ? <p className="mt-3 text-[13px] text-muted">None yet.</p> : null}
      {list.map((p) => (
        <div key={`${tab}-${p.id}`} className="mt-2 flex items-center gap-2 border-b border-line py-2">
          <a href={`/u/${encodeURIComponent(p.handle)}`} className="flex min-w-0 flex-1 items-center gap-2">
            <AvatarImg handle={p.handle} size={36} />
            <span className="min-w-0">
              <span className="block truncate text-[14px] font-semibold">@{p.handle}</span>
              <span className="text-[11px] text-muted">{p.back ? "Follows you" : p.role || "member"}</span>
            </span>
          </a>
          {tab === "followers" && !p.back ? (
            <button
              type="button"
              className="rounded-full bg-lime-2 px-2.5 py-1 text-[12px] font-semibold text-[#102016]"
              onClick={() => {
                void toggleFollow({ data: { id: p.id, handle: p.handle } }).then((r) => {
                  if (!r.ok || !r.on) return;
                  setRows((cur) => ({
                    ...cur,
                    followers: cur.followers.map((x) => (x.id === p.id ? { ...x, back: true } : x)),
                    following: cur.following.some((x) => x.id === p.id) ? cur.following : [...cur.following, { ...p, back: true }],
                  }));
                });
              }}
            >
              Follow back
            </button>
          ) : (
            <a href={`/u/${encodeURIComponent(p.handle)}`} className="rounded-full border border-line px-2.5 py-1 text-[12px] font-semibold">
              Open
            </a>
          )}
        </div>
      ))}
    </section>
  );
}

export function SavedTakesBlock({ onBack }: { onBack: () => void }) {
  const [rows, setRows] = useState<TakeRow[]>([]);
  useEffect(() => {
    void listSavedTakes().then(setRows).catch(() => setRows([]));
  }, []);
  return (
    <section className="mb-4">
      <button type="button" className="mb-3 text-[13px] font-semibold text-lime-2" onClick={onBack}>
        ← Back
      </button>
      <h2 className="text-lg font-extrabold">Saved takes</h2>
      {rows.length === 0 ? <p className="mt-3 text-[13px] text-muted">Save a take from Socials. It stays here.</p> : null}
      <div className="mt-2 space-y-2">
        {rows.map((t) => (
          <article key={t.id} className="rounded-xl border border-line px-3 py-2">
            <a href={`/u/${encodeURIComponent(t.handle)}`} className="text-[12px] font-semibold">@{t.handle}</a>
            <p className="mt-1 whitespace-pre-wrap text-[13px] leading-snug">{t.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function MeDashboard({ store, onForum, onLogout }: { store: any; onForum?: () => void; onLogout?: () => void | Promise<void> }) {
  const [mePane, setMePane] = useState<null | "friends" | "follows" | "saved" | "blocked" | "muted" | "listings" | "artist">(null);
  const [connects, setConnects] = useState<ConnectRow[]>([]);
  const user = store?.session?.user;
  const profile = store?.profile;
  const authed = !!user;
  const handle = profile?.handle || user?.name || "you";
  const kind = profile?.kind || "member";
  const isStaff = !!store?.staff || !!profile?.staff;

  const loadConnects = () => {
    void listConnects()
      .then((r) => setConnects(Array.isArray(r) ? r : []))
      .catch(() => setConnects([]));
  };

  useEffect(() => {
    if (authed) loadConnects();
  }, [authed]);

  if (!authed) {
    return (
      <div className="space-page p-4 pb-24">
        <h2 className="text-xl font-extrabold">My Space</h2>
        <p className="mt-2 text-sm text-muted">Join Kilode to open your desk.</p>
      </div>
    );
  }

  if (mePane === "friends") {
    return (
      <div className="space-page p-4 pb-24">
        <FriendsBlock rows={connects} onChange={loadConnects} onBack={() => setMePane(null)} />
      </div>
    );
  }
  if (mePane === "follows") {
    return (
      <div className="space-page p-4 pb-24">
        <FollowsBlock onBack={() => setMePane(null)} />
      </div>
    );
  }
  if (mePane === "saved") {
    return (
      <div className="space-page p-4 pb-24">
        <SavedTakesBlock onBack={() => setMePane(null)} />
      </div>
    );
  }
  if (mePane === "listings") {
    return (
      <div className="space-page p-4 pb-24">
        <ListingsDesk onBack={() => setMePane(null)} />
      </div>
    );
  }
  if (mePane === "artist") {
    return (
      <div className="space-page p-4 pb-24">
        <ArtistDesk onBack={() => setMePane(null)} />
      </div>
    );
  }
  if (mePane === "blocked") {
    return (
      <div className="space-page p-4 pb-24">
        <SafetyBlock mode="blocked" onBack={() => setMePane(null)} />
      </div>
    );
  }
  if (mePane === "muted") {
    return (
      <div className="space-page p-4 pb-24">
        <SafetyBlock mode="muted" onBack={() => setMePane(null)} />
      </div>
    );
  }

  return (
    <div className="space-page p-4 pb-24">
      <div className="me-hero rounded-2xl p-4 mb-4">
        <div className="text-[10px] font-bold tracking-widest opacity-70">MY SPACE</div>
        <h2 className="text-xl font-extrabold mt-1">@{handle}</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          <span className="kind-pill rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase">{String(kind).replace(/_/g, " ")}</span>
          {isStaff ? <span className="staff-pill">SUPER ADMIN</span> : null}
        </div>
        <div className="mt-3 flex gap-2">
          <button type="button" className="btn-join rounded-full px-3 py-1.5 text-[12px] font-bold" onClick={() => window.dispatchEvent(new Event("kilode:create"))}>
            New post
          </button>
          <button type="button" className="rounded-full border px-3 py-1.5 text-[12px] font-semibold" onClick={() => goto({ screen: "settings" })}>
            Edit profile
          </button>
        </div>
      </div>

      {isStaff ? (
        <section className="staff-power mb-4 rounded-2xl border p-4">
          <div className="text-[10px] font-bold tracking-widest text-muted">YOUR POWER</div>
          <p className="mt-1 text-[13px]">Staff tools for ops, ads, news, and payouts.</p>
          <a href={STAFF_PATH} className="staff-go">Staff desk</a>
        </section>
      ) : null}

      <div className="me-shortcuts mb-4">
        {(
          [
            ["Friends", Users, () => setMePane("friends")],
            ["Follows", Users, () => setMePane("follows")],
            ["Saved", Bookmark, () => setMePane("saved")],
            ["Blocked", User, () => setMePane("blocked")],
            ["Muted", User, () => setMePane("muted")],
            ["Spaces", Store, () => goto({ screen: "spaces" })],
            ["Groups", UsersRound, () => goto({ screen: "teams" })],
            ["Marketplace", Store, () => goto({ screen: "market" })],
            ["Messages", MessageSquare, () => goto({ screen: "inbox" })],
            ["Listings", Briefcase, () => setMePane("listings")],
            ["Artist", Radio, () => setMePane("artist")],
          ] as const
        ).map(([label, Icon, go]) => (
          <button key={label} type="button" onClick={go} className="me-chip">
            <Icon className="size-3.5 shrink-0" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2">
        {(
          [
            ["Jobs desk", Briefcase, () => setMePane("listings")],
            ["Ads", Megaphone, () => goto({ screen: "ads" })],
            ["Music", Radio, () => setMePane("artist")],
            ["Cinema", Film, () => goto({ tab: "watch" })],
            ["Rent", Building2, () => goto({ screen: "rent" })],
            ["Market", Store, () => goto({ screen: "market" })],
          ] as const
        ).map(([label, Icon, go]) => (
          <button key={label} type="button" onClick={go} className="me-action raised flex items-center gap-2 rounded-2xl p-3 text-left">
            <span className="grid size-8 place-items-center rounded-xl bg-lime-2/15 text-lime-2"><Icon className="size-4" /></span>
            <span className="text-[13px] font-bold">{label}</span>
          </button>
        ))}
      </div>

      {onLogout ? (
        <button type="button" className="mt-2 flex items-center gap-2 text-[13px] font-semibold text-danger" onClick={() => void onLogout()}>
          <LogOut className="size-4" /> Log out
        </button>
      ) : null}
    </div>
  );
}
