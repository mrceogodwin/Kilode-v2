import { useEffect, useMemo, useState } from "react";
import { AD_COINS, AD_KINDS, AD_PLACEMENTS, ACCOUNT_KINDS, CHAT_TTLS, COMMUNITIES, POST_CATS, REGIONS, ROOMS, TERMS, chatTtlLabel, fmtCount, handleColor, parseMusicUrl, roomName, safeHttpUrl, slugify, timeLabel, youtubeId, type AccountKind, type AdKind, type AdPlacement, type MenuId, type Post } from "@/lib/qonvo-data";
import type { useQonvo } from "@/lib/use-qonvo";
import { claimOps, clearModUser, getModSettings, listMail, listMembers, listModHits, listModUsers, listReports, listStaff, removeStaff, resetUserPassword, saveChatTtl, saveModSettings, saveWallet, setModHitStatus, setModUser, setStaffRole, staffMe } from "@/lib/staff-server";
import { listWallets, getChatTtl } from "@/lib/forum-server";
import { listInbox, listNotes, sendDm } from "@/lib/social-server";
import { authClient } from "@/lib/auth/client";
import { AccountKindPicker } from "@/components/account-kind";
import { DEFAULT_MOD, type ModSettings } from "@/lib/moderator";

type Store = ReturnType<typeof useQonvo>;

export function QonvoScreen({
  id,
  store,
  onHome,
  onForum,
}: {
  id: MenuId;
  store: Store;
  onHome: (roomId?: string) => void;
  onForum?: () => void;
}) {
  let view: React.ReactNode = null;
  if (id === "forum") view = <Forum store={store} onHome={onHome} />;
  else if (id === "create") view = <Create store={store} onForum={onForum} />;
  else if (id === "community") view = <Communities onHome={onHome} />;
  else if (id === "search") view = <Search store={store} onHome={onHome} />;
  else if (id === "profile") view = <Profile store={store} onHome={onHome} />;
  else if (id === "bookmarks") view = <Bookmarks store={store} onHome={onHome} />;
  else if (id === "notifications") view = <Notes store={store} />;
  else if (id === "inbox") view = <Inbox />;
  else if (id === "teams") view = <Teams store={store} />;
  else if (id === "badges") view = <Badges store={store} />;
  else if (id === "leaderboard") view = <Board store={store} />;
  else if (id === "ads") view = <Ads store={store} />;
  else if (id === "settings") view = <Settings store={store} />;
  else if (id === "help") view = <Help />;
  else if (id === "dashboard") view = <Dash store={store} onHome={onHome} onForum={onForum} />;
  else if (id === "trending") view = <Trending onHome={onHome} />;
  else if (id === "contact") view = <Contact store={store} />;
  else if (id === "admin") view = <Admin store={store} />;
  return <div className="h-full overflow-y-auto pb-20 md:pb-4">{view}</div>;
}

function Card({ title, body, children }: { title: string; body?: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-panel p-3">
      <div className="font-semibold">{title}</div>
      {body ? <p className="mt-1 whitespace-pre-wrap text-sm text-muted">{body}</p> : null}
      {children}
    </div>
  );
}

function Forum({ store, onHome }: { store: Store; onHome: (roomId?: string) => void }) {
  const live = store.posts.filter((p) => p.status !== "draft");
  return (
    <div className="mx-auto max-w-5xl space-y-3 p-5">
      <h2 className="text-xl font-bold">Feeds</h2>
      {live.length === 0 ? <p className="text-sm text-muted">No posts yet. Create one from Create.</p> : null}
      <div className="grid grid-cols-4 gap-1">
        {live.map((p) => (
          <button key={p.id} type="button" onClick={() => { store.setOpenPost(p.id); onHome(); }} className="raised overflow-hidden rounded-md text-left">
            {p.image ? <img src={p.image} alt="" className="h-16 w-full object-cover" /> : <div className="h-16 bg-panel-3" />}
            <div className="px-1.5 py-1">
              <div className="text-[11px] font-medium text-lime-2">{p.category || "General"}</div>
              <div className="mt-px line-clamp-2 text-[13px] font-semibold leading-snug">{p.title}</div>
              <p className="mt-px line-clamp-1 text-[11px] text-muted">{p.excerpt || p.body}</p>
              <div className="mt-px text-[11px]">
                <span style={{ color: handleColor(p.author) }}>{p.author}</span>
                <span className="text-muted"> · {timeLabel(p.ts)} · {fmtCount(p.views ?? 0)}</span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function PostDetail({ post, store }: { post: Post; store: Store }) {
  const [body, setBody] = useState("");
  const [reason, setReason] = useState("");
  return (
    <div className="mx-auto max-w-2xl space-y-3 p-5">
      <button type="button" className="text-xs text-muted" onClick={() => store.setOpenPost(null)}>
        Back to feeds
      </button>
      <Card title={post.title} body={post.body} />
      {post.image ? <img src={post.image} alt="" className="max-h-40 w-40 rounded-xl object-cover" /> : null}
      {post.link ? (
        <a href={post.link} target="_blank" rel="noopener noreferrer" className="text-xs text-lime-2">
          {post.link}
        </a>
      ) : null}
      <p className="text-xs text-muted">
        <span style={{ color: handleColor(post.author) }}>{post.author}</span> · {post.category} · {timeLabel(post.ts)}
        {post.tags ? ` · ${post.tags}` : ""}
      </p>
      {post.comments.map((c) => (
        <Card key={c.ts} title={c.author} body={c.body} />
      ))}
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        placeholder="Comment"
        className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm"
      />
      <button
        type="button"
        className="rounded-lg border border-line bg-panel-3 px-3 py-2 text-sm"
        onClick={() => {
          store.commentPost(post.id, body);
          setBody("");
        }}
      >
        Comment
      </button>
      <div className="raised space-y-2 rounded-xl p-3">
        <div className="text-[11px] font-medium text-muted">Report</div>
        <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why this post should be reviewed" className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm" />
        <button
          type="button"
          className="text-xs text-danger"
          onClick={() => {
            if (!reason.trim()) return;
            store.flagPost(post.id, reason);
            setReason("");
          }}
        >
          Send report
        </button>
      </div>
    </div>
  );
}

function Create({ store, onForum }: { store: Store; onForum?: () => void }) {
  const [kind, setKind] = useState<"post" | "music">("post");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [category, setCategory] = useState("General");
  const [tags, setTags] = useState("");
  const [link, setLink] = useState("");
  const [image, setImage] = useState("");
  const [err, setErr] = useState("");
  const [agree, setAgree] = useState(false);
  const [artist, setArtist] = useState("");
  const [album, setAlbum] = useState("");
  const [genre, setGenre] = useState("Afrobeats");
  const [preview, setPreview] = useState("");

  function onUrl(v: string) {
    setLink(v);
    const parsed = parseMusicUrl(v);
    setPreview(parsed ? `${parsed.platform}${parsed.embed ? " · embed ready" : " · link only"}` : "");
  }

  async function onFile(file: File | undefined) {
    setErr("");
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setErr("Images only.");
      return;
    }
    if (file.size > 2_000_000) {
      setErr("Keep the image under 2MB.");
      return;
    }
    const data = await compressImage(file);
    setImage(data);
  }

  function submit(status: "draft" | "publish") {
    setErr("");
    if (!agree) {
      setErr("Accept the Terms to publish.");
      return;
    }
    if (!title.trim() || !body.trim()) {
      setErr("Title and post content are required.");
      return;
    }
    const url = safeHttpUrl(link);
    if (link.trim() && !url) {
      setErr("Link must be http or https.");
      return;
    }
    store.publishPost({
      title,
      body,
      excerpt,
      category,
      tags,
      link: url,
      image,
      slug: slugify(title),
      status,
    });
    setTitle("");
    setBody("");
    setExcerpt("");
    setTags("");
    setLink("");
    setImage("");
    if (status === "publish") onForum?.();
  }

  function submitMusic() {
    setErr("");
    if (!agree) {
      setErr("Accept the Terms to list music.");
      return;
    }
    if (!parseMusicUrl(link)) {
      setErr("Paste a Spotify, Apple Music, SoundCloud, Audiomack or Deezer track URL. YouTube video is for VIDEOS.");
      return;
    }
    if (!title.trim() || !artist.trim()) {
      setErr("Title and artist are required.");
      return;
    }
    store.publishTrack({
      title,
      artist,
      url: link,
      cover: image,
      genre,
      album,
      note: body,
      tags,
    });
    setTitle("");
    setArtist("");
    setAlbum("");
    setBody("");
    setTags("");
    setLink("");
    setImage("");
    setPreview("");
    onForum?.();
  }

  return (
    <div className="mx-auto max-w-2xl space-y-3 p-5">
      <h2 className="text-xl font-bold">Create</h2>
      <div className="flex gap-2">
        <button type="button" className={`rounded-md px-3 py-1.5 text-[11px] font-bold ${kind === "post" ? "btn-3d" : "border border-line text-muted"}`} onClick={() => setKind("post")}>
          Post
        </button>
        <button type="button" className={`rounded-md px-3 py-1.5 text-[11px] font-bold ${kind === "music" ? "btn-3d" : "border border-line text-muted"}`} onClick={() => setKind("music")}>
          Music
        </button>
      </div>
      {kind === "music" ? (
        <>
          <p className="text-sm text-muted">Audio platforms only: Spotify, Apple Music, SoundCloud, Audiomack, Deezer. YouTube clips belong in VIDEOS.</p>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Track title" className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm" />
          <input value={artist} onChange={(e) => setArtist(e.target.value)} placeholder="Artist name" className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm" />
          <input value={album} onChange={(e) => setAlbum(e.target.value)} placeholder="Album / EP (optional)" className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm" />
          <input value={genre} onChange={(e) => setGenre(e.target.value)} placeholder="Genre" className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm" />
          <input value={link} onChange={(e) => onUrl(e.target.value)} placeholder="https://open.spotify.com/track/…" className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm" />
          {preview ? <p className="text-xs text-lime-2">{preview}</p> : null}
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} placeholder="Notes / credits" className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm" />
          <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Tags" className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm" />
          <div className="raised rounded-xl p-3">
            <div className="mb-2 text-[11px] font-medium text-muted">Cover image only (optional)</div>
            <input type="file" accept="image/*" onChange={(e) => void onFile(e.target.files?.[0])} className="text-xs" />
          </div>
          {err ? <p className="text-sm text-danger">{err}</p> : null}
          <label className="flex items-start gap-2 text-[11px] text-muted">
            <input type="checkbox" className="mt-0.5" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
            <span>I agree to the Terms. This URL is mine to share. Audio is not hosted here.</span>
          </label>
          <button type="button" className="btn-3d rounded-lg px-3 py-2 text-sm font-semibold" onClick={submitMusic}>
            List on Music
          </button>
        </>
      ) : (
        <>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm" />
      <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={7} placeholder="Post content" className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm" />
      <textarea value={excerpt} onChange={(e) => setExcerpt(e.target.value)} rows={2} placeholder="Excerpt / summary" className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm" />
      <div className="grid gap-2 sm:grid-cols-2">
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-lg border border-line bg-panel px-3 py-2 text-sm">
          {POST_CATS.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Tags (comma)" className="rounded-lg border border-line bg-panel px-3 py-2 text-sm" />
      </div>
      <input
        value={link}
        onChange={(e) => setLink(e.target.value)}
        placeholder="Safe URL — https://…"
        className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm"
      />
      <div className="raised rounded-xl p-3">
        <div className="mb-2 text-[11px] font-medium text-muted">Featured image</div>
        <input type="file" accept="image/*" onChange={(e) => void onFile(e.target.files?.[0])} className="text-xs" />
        {image ? <img src={image} alt="" className="mt-2 max-h-40 rounded-lg object-cover" /> : null}
      </div>
      <p className="text-[11px] text-muted">Slug: {title ? slugify(title) : "—"} · Author set on publish</p>
      {err ? <p className="text-sm text-danger">{err}</p> : null}
      <label className="flex items-start gap-2 text-[11px] text-muted">
        <input type="checkbox" className="mt-0.5" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
        <span>I agree to the Terms & Conditions and I am responsible for this post.</span>
      </label>
      <div className="flex gap-2">
        <button type="button" className="btn-3d rounded-lg px-3 py-2 text-sm font-semibold" onClick={() => submit("publish")}>
          Publish to feeds
        </button>
        <button type="button" className="rounded-lg border border-line px-3 py-2 text-sm" onClick={() => submit("draft")}>
          Save draft
        </button>
      </div>
        </>
      )}
    </div>
  );
}

function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, 900 / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("canvas"));
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.72));
    };
    img.onerror = () => reject(new Error("image"));
    img.src = url;
  });
}

function Communities({ onHome }: { onHome: (roomId?: string) => void }) {
  return (
    <div className="mx-auto max-w-2xl space-y-3 p-5">
      <h2 className="text-xl font-bold">Communities</h2>
      {COMMUNITIES.map((c) => {
        const rooms = ROOMS.filter((r) => r.region === c.region);
        return (
          <Card key={c.id} title={c.name} body={`${rooms.length} rooms`}>
            <div className="mt-2 flex flex-wrap gap-2">
              {rooms.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  className="rounded-full border border-line px-3 py-1 text-xs"
                  onClick={() => onHome(r.id)}
                >
                  {r.name}
                </button>
              ))}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function Search({ store, onHome }: { store: Store; onHome: (roomId?: string) => void }) {
  const [q, setQ] = useState("");
  const s = q.trim().toLowerCase();
  const rooms = useMemo(
    () =>
      ROOMS.filter(
        (r) => !s || r.name.toLowerCase().includes(s) || r.region.toLowerCase().includes(s),
      ),
    [s],
  );
  const posts = s ? store.posts.filter((p) => !!p?.id && `${p.title} ${p.body} ${p.author} ${p.category}`.toLowerCase().includes(s)) : [];
  const tracks = s ? store.tracks.filter((t) => !!t?.id && `${t.title} ${t.artist}`.toLowerCase().includes(s)) : [];
  return (
    <div className="mx-auto max-w-2xl space-y-3 p-5">
      <h2 className="text-xl font-bold">Search</h2>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Rooms, posts, artists"
        className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm"
      />
      {s ? (
        <>
          <div className="text-[11px] font-medium text-muted">Feeds</div>
          {posts.length === 0 ? <p className="rounded-xl border border-line bg-panel p-6 text-center text-sm text-muted">No posts match. Try another word.</p> : null}
          {posts.map((p) => (
            <button key={p.id} type="button" className="block w-full rounded-xl border border-line bg-panel p-3 text-left" onClick={() => { store.setOpenPost(p.id); onHome(); }}>
              <div className="font-semibold">{p.title}</div>
              <div className="text-xs text-muted">{p.author} · {p.category}</div>
            </button>
          ))}
          <div className="text-[11px] font-medium text-muted">Music</div>
          {tracks.length === 0 ? <p className="rounded-xl border border-line bg-panel p-6 text-center text-sm text-muted">No tracks match.</p> : null}
          {tracks.filter((t) => !!t?.id).map((t) => (
            <div key={t.id} className="rounded-xl border border-line bg-panel p-3 text-sm">
              {t.title} <span className="text-muted">· {t.artist}</span>
            </div>
          ))}
        </>
      ) : null}
      <div className="text-[11px] font-medium text-muted">Rooms</div>
      {rooms.map((r) => (
        <button
          key={r.id}
          type="button"
          onClick={() => onHome(r.id)}
          className="block w-full rounded-xl border border-line bg-panel p-3 text-left text-sm"
        >
          {r.name}
          <span className="block text-xs text-muted">{r.region}</span>
        </button>
      ))}
    </div>
  );
}

function Profile({ store, onHome }: { store: Store; onHome?: (id?: string) => void }) {
  const [name, setName] = useState(store.handle);
  const [bio, setBio] = useState(store.bio);
  const [city, setCity] = useState(store.city);
  const [kind, setKind] = useState<AccountKind>(store.kind);
  const [stage, setStage] = useState(store.stage);
  const [genre, setGenre] = useState(store.genre);
  const [website, setWebsite] = useState(store.website);
  const [brand, setBrand] = useState(store.brand);
  useEffect(() => {
    setName(store.handle);
    setBio(store.bio);
    setCity(store.city);
    setKind(store.kind);
    setStage(store.stage);
    setGenre(store.genre);
    setWebsite(store.website);
    setBrand(store.brand);
  }, [store.bio, store.brand, store.city, store.genre, store.handle, store.kind, store.stage, store.website]);
  const mine = store.posts.filter((p) => p.author === store.handle);
  const songs = store.tracks.filter((t) => t.author === store.handle || t.artist === store.handle);
  const kindLabel = ACCOUNT_KINDS.find((k) => k.id === kind)?.label ?? "Member";
  return (
    <div className="mx-auto max-w-2xl space-y-3 p-5">
      <h2 className="text-xl font-bold">Profile</h2>
      <Card title={store.handle || "Sign in"} body={`${kindLabel} · ${mine.length} posts · ${store.pins.length} bookmarks · ${songs.length} tracks`}>
        {store.handle ? (
          <a href={`/u/${encodeURIComponent(store.handle)}`} className="mt-2 inline-block text-xs text-lime-2">
            Open public profile
          </a>
        ) : null}
      </Card>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Public username" className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm" />
      <div>
        <div className="mb-1 text-[11px] font-medium text-muted">Account type</div>
        <AccountKindPicker value={kind} onChange={setKind} />
      </div>
      {kind === "artist" ? (
        <>
          <input value={stage} onChange={(e) => setStage(e.target.value)} placeholder="Stage name" className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm" />
          <input value={genre} onChange={(e) => setGenre(e.target.value)} placeholder="Genre (Afrobeats, Highlife…)" className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm" />
        </>
      ) : null}
      {kind === "writer" ? (
        <>
          <input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Outlet / publication" className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm" />
          <input value={genre} onChange={(e) => setGenre(e.target.value)} placeholder="Beats (politics, music, sport…)" className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm" />
        </>
      ) : null}
      {kind === "advertiser" || kind === "brand" ? (
        <>
          <input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder={kind === "brand" ? "Company name" : "Brand name"} className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm" />
          <input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://your-site.com" className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm" />
        </>
      ) : null}
      {kind === "artist" ? (
        <input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="Spotify / Apple / Audiomack URL" className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm" />
      ) : null}
      <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City (optional)" className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm" />
      <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} placeholder="Bio" className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm" />
      <button
        type="button"
        className="btn-3d rounded-lg px-3 py-2 text-sm"
        onClick={() => store.rename(name, { bio, city, kind, stage, genre, website, brand })}
      >
        Save profile
      </button>
      {kind === "artist" ? (
        <p className="text-[11px] text-muted">Artists list tracks from Music → Add. We never host audio files.</p>
      ) : null}
      {kind === "advertiser" || kind === "brand" ? (
        <p className="text-[11px] text-muted">Place ads from Advertise. Staff approve after your crypto payment.</p>
      ) : null}
      {mine.map((p) => (
        <button key={p.id} type="button" className="block w-full rounded-xl border border-line bg-panel p-3 text-left" onClick={() => { store.setOpenPost(p.id); onHome?.(); }}>
          <div className="font-semibold">{p.title}</div>
          <div className="text-xs text-muted">{p.category}</div>
        </button>
      ))}
    </div>
  );
}

function Bookmarks({ store, onHome }: { store: Store; onHome: (id?: string) => void }) {
  const saved = store.posts.filter((p) => store.savedPosts.includes(p.id));
  return (
    <div className="mx-auto max-w-2xl space-y-3 p-5">
      <h2 className="text-xl font-bold">Bookmarks</h2>
      <div className="text-[11px] font-medium text-muted">Saved posts</div>
      {saved.length === 0 ? <p className="text-sm text-muted">Save a feed post from the article view.</p> : null}
      {saved.map((p) => (
        <button key={p.id} type="button" className="raised flex w-full gap-3 overflow-hidden rounded-xl text-left" onClick={() => { store.setOpenPost(p.id); onHome(); }}>
          {p.image ? <img src={p.image} alt="" className="h-16 w-20 object-cover" /> : <div className="h-16 w-20 bg-panel-3" />}
          <div className="min-w-0 py-2 pr-2">
            <div className="truncate text-sm font-semibold">{p.title}</div>
            <div className="text-[10px] text-muted">{p.author} · {fmtCount(p.views ?? 0)} views</div>
          </div>
        </button>
      ))}
      <div className="text-[11px] font-medium text-muted">Rooms</div>
      {store.pins.length === 0 ? (
        <div className="rounded-2xl border border-line bg-panel px-5 py-8 text-center">
          <img src="/kilode-logo-green.png" alt="" className="mx-auto mb-3 h-8 w-auto max-w-[140px] object-contain" />
          <p className="text-base font-semibold">No bookmarks yet</p>
          <p className="mt-1 text-sm text-muted">Pin a room from Chat to find it fast.</p>
          <button type="button" className="btn-join mt-4 rounded-lg px-4 py-2 text-sm font-bold" onClick={() => onHome()}>
            Open chat
          </button>
        </div>
      ) : null}
      {store.pins.map((id) => (
        <div key={id} className="flex items-center justify-between rounded-xl border border-line bg-panel p-3">
          <button type="button" className="text-left text-sm font-semibold" onClick={() => onHome(id)}>
            {roomName(id)}
          </button>
          <button type="button" className="text-xs text-muted" onClick={() => store.unpin(id)}>
            Remove
          </button>
        </div>
      ))}
    </div>
  );
}

function Notes({ store }: { store: Store }) {
  const [rows, setRows] = useState<{ id: string; text: string; href?: string; ts: number }[]>([]);
  useEffect(() => {
    void listNotes()
      .then(setRows)
      .catch(() => setRows(store.notes));
  }, [store.notes]);
  const list = rows.length ? rows : store.notes;
  return (
    <div className="mx-auto max-w-2xl space-y-3 p-5">
      <h2 className="text-xl font-bold">Notifications</h2>
      <p className="text-xs text-muted">Replies, comments, and DMs land here when you are signed in.</p>
      {list.length === 0 ? <p className="text-sm text-muted">Nothing yet.</p> : null}
      {list.map((n) => (
        <a key={n.id} href={n.href || "#"} className="block rounded-xl border border-line bg-panel p-3">
          <div className="font-semibold">{n.text}</div>
          <div className="text-xs text-muted">{new Date(n.ts).toLocaleString()}</div>
        </a>
      ))}
    </div>
  );
}

function Inbox() {
  const [to, setTo] = useState("");
  const [body, setBody] = useState("");
  const [msg, setMsg] = useState("");
  const [rows, setRows] = useState<{ id: string; from: string; to: string; body: string; ts: number }[]>([]);
  function reload() {
    void listInbox()
      .then(setRows)
      .catch(() => setRows([]));
  }
  useEffect(() => {
    reload();
  }, []);
  return (
    <div className="mx-auto max-w-2xl space-y-3 p-5">
      <h2 className="text-xl font-bold">Messages</h2>
      <p className="text-xs text-muted">Private DMs. Username only. Staff cannot read these.</p>
      <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="Their username" className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm" />
      <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} placeholder="Message" className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm" />
      {msg ? <p className="text-sm text-muted">{msg}</p> : null}
      <button
        type="button"
        className="btn-3d rounded-lg px-3 py-2 text-sm"
        onClick={() => {
          void sendDm({ data: { to, body } }).then((r) => {
            if (r.ok) {
              setBody("");
              setMsg("Sent.");
              reload();
            } else setMsg(r.reason);
          });
        }}
      >
        Send
      </button>
      {rows.map((r) => (
        <div key={r.id} className="rounded-xl border border-line bg-panel p-3">
          <div className="text-xs text-lime-2">
            {r.from} → {r.to}
          </div>
          <p className="mt-1 text-sm">{r.body}</p>
          <div className="text-[10px] text-muted">{new Date(r.ts).toLocaleString()}</div>
        </div>
      ))}
    </div>
  );
}

function Teams({ store }: { store: Store }) {
  const [name, setName] = useState("");
  return (
    <div className="mx-auto max-w-2xl space-y-3 p-5">
      <h2 className="text-xl font-bold">Teams</h2>
      <div className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Team name"
          className="flex-1 rounded-lg border border-line bg-panel px-3 py-2 text-sm"
        />
        <button
          type="button"
          className="rounded-lg border border-line bg-panel-3 px-3 py-2 text-sm"
          onClick={() => {
            store.createTeam(name);
            setName("");
          }}
        >
          Create
        </button>
      </div>
      {store.teams.filter((t) => !!t?.id).map((t) => (
        <Card key={t.id} title={t.name} body={`${(t.members ?? []).length} members · ${(t.members ?? []).join(", ")}`}>
          <button type="button" className="mt-2 text-xs text-fg" onClick={() => store.joinTeam(t.id)}>
            Join
          </button>
        </Card>
      ))}
    </div>
  );
}

function Badges({ store }: { store: Store }) {
  return (
    <div className="mx-auto max-w-2xl space-y-3 p-5">
      <h2 className="text-xl font-bold">Badges</h2>
      {store.badges.map((b) => (
        <Card key={b.id} title={b.label} body={b.on ? "Unlocked" : "Locked — do the action to earn it"} />
      ))}
    </div>
  );
}

function Board({ store }: { store: Store }) {
  const rows = Object.entries(store.scores).sort((a, b) => b[1] - a[1]);
  return (
    <div className="mx-auto max-w-2xl space-y-3 p-5">
      <h2 className="text-xl font-bold">Leaderboard</h2>
      {rows.length === 0 ? <p className="text-sm text-muted">Chat on the server to appear here.</p> : null}
      {rows.map(([name, n], i) => (
        <Card key={name} title={`${i + 1}. ${name}`} body={`${n} messages`} />
      ))}
    </div>
  );
}

function Ads({ store }: { store: Store }) {
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [link, setLink] = useState("");
  const [image, setImage] = useState("");
  const [video, setVideo] = useState("");
  const [kind, setKind] = useState<AdKind>("image-text");
  const [place, setPlace] = useState<AdPlacement>("board");
  const [coin, setCoin] = useState("usdt");
  const [txHash, setTxHash] = useState("");
  const [amount, setAmount] = useState("");
  const [agree, setAgree] = useState(false);
  const [err, setErr] = useState("");
  const [wallets, setWallets] = useState<{ coin: string; address: string }[]>([]);
  useEffect(() => {
    void listWallets()
      .then(setWallets)
      .catch(() => setWallets([]));
  }, []);
  const payTo = wallets.find((w) => w.coin === coin)?.address;
  return (
    <div className="mx-auto max-w-2xl space-y-3 overflow-y-auto p-5">
      <h2 className="text-xl font-bold">Place an ad</h2>
      <p className="text-sm text-muted">
        Sign in. Pick where it shows. Pay the fee in crypto. Paste the tx. Super admin approves.
      </p>
      <div className="text-[11px] font-medium text-muted">Where it shows</div>
      <div className="grid gap-1.5">
        {AD_PLACEMENTS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setPlace(p.id)}
            className={`rounded-xl border px-3 py-2 text-left ${place === p.id ? "border-lime-2 bg-lime-2/10" : "border-line bg-panel"}`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold">{p.label}</span>
              <span className="text-[11px] text-lime-2">${p.usd} USD</span>
            </div>
            <div className="text-[11px] text-muted">{p.hint}</div>
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-1">
        {AD_KINDS.map((k) => (
          <button key={k.id} type="button" onClick={() => setKind(k.id)} className={`rounded-full px-2 py-1 text-[11px] ${kind === k.id ? "btn-3d font-semibold" : "border border-line text-muted"}`}>
            {k.label}
          </button>
        ))}
      </div>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Brand / campaign name" className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm" />
      <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="Destination URL (https://…)" className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm" />
      {kind === "image" || kind === "image-text" ? (
        <input value={image} onChange={(e) => setImage(e.target.value)} placeholder="Image URL" className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm" />
      ) : null}
      {kind === "video" || kind === "video-text" ? (
        <input value={video} onChange={(e) => setVideo(e.target.value)} placeholder="YouTube URL or id (not hosted here)" className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm" />
      ) : null}
      {kind !== "image" && kind !== "video" ? (
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Short copy" className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm" />
      ) : null}
      <div className="text-[11px] font-medium text-muted">Pay with</div>
      <div className="flex flex-wrap gap-1">
        {AD_COINS.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCoin(c.id)}
            className={`rounded-full px-2 py-1 text-[11px] ${coin === c.id ? "btn-3d font-semibold" : "border border-line text-muted"}`}
          >
            {c.ticker}
          </button>
        ))}
      </div>
      <div className="raised rounded-xl p-3 text-xs">
        <div className="text-muted">Send {AD_COINS.find((c) => c.id === coin)?.label} to</div>
        <div className="mt-1 break-all font-mono text-[11px]">{payTo || "Wallet not set yet — staff must paste addresses on /ops."}</div>
      </div>
      <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={`Amount sent (about $${AD_PLACEMENTS.find((p) => p.id === place)?.usd} USD in crypto)`} className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm" />
      <input value={txHash} onChange={(e) => setTxHash(e.target.value)} placeholder="Transaction hash / payment ID after you pay" className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm" />
      {err ? <p className="text-sm text-danger">{err}</p> : null}
      <label className="flex items-start gap-2 text-[11px] text-muted">
        <input type="checkbox" className="mt-0.5" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
        <span>I agree to the Terms. I paid from my own wallet. Staff may reject a bad or missing hash.</span>
      </label>
      <button
        type="button"
        className="btn-3d rounded-lg px-3 py-2 text-sm font-semibold"
        onClick={() => {
          if (!agree) {
            setErr("Accept the Terms.");
            return;
          }
          if (!name.trim() || !txHash.trim()) {
            setErr("Name and payment tx are required.");
            return;
          }
          store.saveAd(name, note, {
            placement: place,
            txHash,
            amount,
            coin,
            link: safeHttpUrl(link),
            image: kind.includes("image") ? safeHttpUrl(image) : undefined,
            video: kind.includes("video") ? youtubeId(video) || safeHttpUrl(video) : undefined,
            kind,
            status: "paid",
          });
          setName("");
          setNote("");
          setLink("");
          setImage("");
          setVideo("");
          setTxHash("");
          setAmount("");
          setErr("");
        }}
      >
        Submit for approval
      </button>
      {store.campaigns.map((c) => (
        <Card key={c.id} title={c.name} body={`${c.status} · ${(c.coin || "").toUpperCase()} ${c.amount || ""}${c.txHash ? `\ntx ${c.txHash}` : ""}`} />
      ))}
    </div>
  );
}

function Admin({ store }: { store: Store }) {
  const [role, setRole] = useState<string | null>(null);
  const [empty, setEmpty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState("");
  const [staff, setStaff] = useState<{ user_id: string; role: string; handle: string | null; locked?: boolean | null }[]>([]);
  const [grantId, setGrantId] = useState("");
  const [grantRole, setGrantRole] = useState<"mod" | "admin">("mod");
  const [msg, setMsg] = useState("");
  const [mail, setMail] = useState<{ id: string; author: string; body: string; ts: number }[]>([]);
  const [reports, setReports] = useState<{ id: string; post_id: string; author: string; reason: string; ts: number }[]>([]);
  const [wallets, setWallets] = useState<Record<string, string>>({});
  const [members, setMembers] = useState<{ id: string; handle: string; kind?: string }[]>([]);
  const [walletMsg, setWalletMsg] = useState("");

  useEffect(() => {
    void staffMe()
      .then((s) => {
        setRole(s.role);
        setEmpty(s.empty);
        setUserId(s.userId);
      })
      .catch(() => {
        setRole(null);
        setEmpty(false);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!role) return;
    void listStaff()
      .then((rows) => setStaff(rows))
      .catch(() => setStaff([]));
    void listMail()
      .then(setMail)
      .catch(() => setMail([]));
    void listReports()
      .then(setReports)
      .catch(() => setReports([]));
    void listWallets()
      .then((rows) => setWallets(Object.fromEntries(rows.map((w) => [w.coin, w.address]))))
      .catch(() => undefined);
    void listMembers()
      .then(setMembers)
      .catch(() => setMembers([]));
  }, [role]);

  if (loading) {
    return (
      <div className="mx-auto max-w-sm space-y-3 p-5">
        <h2 className="text-xl font-bold">Staff console</h2>
        <p className="text-sm text-muted">Checking access…</p>
      </div>
    );
  }

  if (empty) {
    return (
      <div className="mx-auto max-w-sm space-y-3 p-5">
        <h2 className="text-xl font-bold">Claim ops</h2>
        <p className="text-sm text-muted">No staff yet. The first signed-in owner becomes super admin. Do this once.</p>
        <button
          type="button"
          className="btn-join w-full rounded-lg py-2 text-sm font-semibold"
          onClick={() => {
            void claimOps().then((r) => {
              if (r.ok) {
                setRole("super");
                setEmpty(false);
              } else setMsg(r.reason);
            });
          }}
        >
          Claim super admin
        </button>
        {msg ? <p className="text-sm text-danger">{msg}</p> : null}
      </div>
    );
  }

  if (!role) {
    return (
      <div className="mx-auto max-w-sm space-y-3 p-5">
        <h2 className="text-xl font-bold">Staff console</h2>
        <p className="text-sm text-muted">This account is not staff. Sign in on the staff door (tap the mark 5 times) with the owner account.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-3 overflow-y-auto p-4 md:grid-cols-2">
      <div className="md:col-span-2">
        <h2 className="text-xl font-bold">Super admin</h2>
        <p className="text-xs text-muted">
          Role {role} · id {userId}
        </p>
      </div>
      <Card title="Queue" body={`${store.campaigns.filter((c) => c.status === "pending" || c.status === "paid").length} waiting`} />
      <Card title="Live ads" body={`${store.campaigns.filter((c) => c.status === "approved").length} approved`} />
      <div className="md:col-span-2 space-y-2">
        {store.campaigns.map((c) => (
          <div key={c.id} className="rounded-xl border border-line bg-panel p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="font-semibold">{c.name}</div>
                <div className="text-xs text-muted">
                  {c.status} · {(c.coin || "").toUpperCase()} {c.amount || ""} · {c.placement}
                </div>
                {c.note ? <p className="mt-1 text-sm">{c.note}</p> : null}
                {c.txHash ? <p className="mt-1 break-all text-[11px] text-muted">tx {c.txHash}</p> : null}
              </div>
              <div className="flex flex-wrap gap-1">
                <button type="button" className="rounded border border-line px-2 py-1 text-xs" onClick={() => store.patchAd(c.id, { status: "paid" })}>
                  Mark paid
                </button>
                <button type="button" className="rounded border border-line px-2 py-1 text-xs" onClick={() => store.patchAd(c.id, { status: "approved" })}>
                  Approve
                </button>
                <button type="button" className="rounded border border-line px-2 py-1 text-xs" onClick={() => store.patchAd(c.id, { placement: "chat" })}>
                  Chat stream
                </button>
                <button type="button" className="rounded border border-line px-2 py-1 text-xs" onClick={() => store.patchAd(c.id, { placement: "chat-pin" })}>
                  Pin in chat
                </button>
                <button type="button" className="rounded border border-line px-2 py-1 text-xs" onClick={() => store.patchAd(c.id, { placement: "board" })}>
                  Advert grid
                </button>
                <button type="button" className="rounded border border-line px-2 py-1 text-xs text-danger" onClick={() => store.patchAd(c.id, { status: "rejected" })}>
                  Reject
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="md:col-span-2 space-y-2">
        <div className="text-[11px] font-medium text-muted">Inbox</div>
        {mail.length === 0 ? <p className="text-sm text-muted">No contact mail.</p> : null}
        {mail.map((m) => (
          <div key={m.id} className="rounded-xl border border-line bg-panel p-3">
            <div className="text-xs font-semibold">{m.author}</div>
            <p className="mt-1 text-sm">{m.body}</p>
          </div>
        ))}
      </div>
      <div className="md:col-span-2 space-y-2">
        <div className="text-[11px] font-medium text-muted">Reports</div>
        {reports.length === 0 ? <p className="text-sm text-muted">No flags.</p> : null}
        {reports.map((r) => (
          <div key={r.id} className="flex items-center justify-between gap-2 rounded-xl border border-line bg-panel p-3">
            <div className="min-w-0">
              <div className="text-xs font-semibold">{r.author}</div>
              <p className="text-sm">{r.reason}</p>
              <div className="text-[10px] text-muted">post {r.post_id}</div>
            </div>
            <button type="button" className="shrink-0 text-xs text-danger" onClick={() => store.hidePost(r.post_id)}>
              Hide post
            </button>
          </div>
        ))}
      </div>
      <div className="md:col-span-2 space-y-2">
        <div className="text-[11px] font-medium text-muted">Feeds moderation</div>
        {store.posts.map((p) => (
          <div key={p.id} className="flex items-center justify-between gap-2 rounded-xl border border-line bg-panel p-3">
            <div className="min-w-0">
              <div className="truncate font-semibold">{p.title}</div>
              <div className="text-xs text-muted">{p.author}</div>
            </div>
            <button type="button" className="shrink-0 text-xs text-danger" onClick={() => store.hidePost(p.id)}>
              Hide
            </button>
          </div>
        ))}
      </div>
      {role === "super" ? <ChatTtlPanel /> : null}
      {role ? <BanMutePanel members={members} /> : null}
      {role === "super" || role === "admin" ? <ModPanel /> : null}
      {role === "super" || role === "admin" ? <AdminPassword /> : null}
      {role === "super" || role === "admin" ? <AdminResetPassword members={members} /> : null}
      {role === "super" || role === "admin" ? (
        <div className="md:col-span-2 raised space-y-2 rounded-xl p-3">
          <div className="text-[11px] font-medium text-muted">Pay-to wallets</div>
          <p className="text-xs text-muted">Users send BTC / SOL / USDC / ETH here. Paste your real addresses.</p>
          {walletMsg ? <p className="text-[11px] text-lime-2">{walletMsg}</p> : null}
          {AD_COINS.map((c) => (
            <div key={c.id} className="flex gap-2">
              <span className="w-14 shrink-0 pt-2 text-[10px] font-bold text-muted">{c.ticker}</span>
              <input
                value={wallets[c.id] ?? ""}
                onChange={(e) => setWallets((w) => ({ ...w, [c.id]: e.target.value }))}
                placeholder={`${c.label} address`}
                className="flex-1 rounded-lg border border-line bg-panel px-3 py-2 font-mono text-xs"
              />
              <button
                type="button"
                className="rounded border border-line px-2 text-xs"
                onClick={() => {
                  void saveWallet({ data: { coin: c.id, address: wallets[c.id] ?? "" } }).then(() => {
                    setWalletMsg(`${c.ticker} saved`);
                    setTimeout(() => setWalletMsg(""), 1500);
                  });
                }}
              >
                Save
              </button>
            </div>
          ))}
        </div>
      ) : null}
      {role === "super" ? (
        <div className="md:col-span-2 raised space-y-2 rounded-xl p-3">
          <div className="text-[11px] font-medium text-muted">Staff access</div>
          <p className="text-xs text-muted">Only you are super. You grant sub-admin or admin. You can revoke. Nobody can take your seat.</p>
          <input value={grantId} onChange={(e) => setGrantId(e.target.value)} placeholder="Their username" className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm" />
          <select value={grantRole} onChange={(e) => setGrantRole(e.target.value as typeof grantRole)} className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm">
            <option value="mod">Sub-admin (mod) — hide, reports, ads</option>
            <option value="admin">Admin — wallets + moderator too</option>
          </select>
          <button
            type="button"
            className="btn-3d rounded-lg px-3 py-2 text-sm"
            onClick={() => {
              if (!grantId.trim()) return;
              void setStaffRole({ data: { userId: grantId.trim(), role: grantRole, handle: grantId.trim() } }).then((r) => {
                if (r && "ok" in r && r.ok === false) setMsg(r.reason);
                else setMsg("");
                void listStaff().then(setStaff);
              });
            }}
          >
            Grant access
          </button>
          {msg ? <p className="text-sm text-danger">{msg}</p> : null}
          {staff.map((s) => (
            <div key={s.user_id} className="flex items-center justify-between gap-2 text-xs">
              <span className="text-muted">
                {s.handle || s.user_id} · {s.locked || s.role === "super" ? "owner (you)" : s.role === "mod" ? "sub-admin" : s.role}
              </span>
              {s.role !== "super" && !s.locked ? (
                <button
                  type="button"
                  className="text-danger"
                  onClick={() => {
                    void removeStaff({ data: s.user_id }).then(() => listStaff().then(setStaff));
                  }}
                >
                  Revoke
                </button>
              ) : null}
            </div>
          ))}
          {members.length ? <div className="pt-2 text-[11px] font-medium text-muted">Registered users</div> : null}
          {members.map((m) => (
            <button
              key={m.id}
              type="button"
              className="block w-full truncate text-left text-[11px] text-muted hover:text-fg"
              onClick={() => setGrantId(m.handle)}
            >
              {m.handle} {m.kind ? `· ${m.kind}` : ""}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function AdminResetPassword({ members }: { members: { id: string; handle: string }[] }) {
  const [handle, setHandle] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  return (
    <div className="md:col-span-2 raised space-y-2 rounded-xl p-3">
      <div className="text-[11px] font-medium text-muted">Reset a user’s password</div>
      <p className="text-xs text-muted">No email. If they forget, you set a new one and tell them in chat. Cannot reset the owner.</p>
      <input value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="Username" className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm" />
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="New password (8+)" className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm" />
      {err ? <p className="text-sm text-danger">{err}</p> : null}
      {msg ? <p className="text-sm text-lime-2">{msg}</p> : null}
      <button
        type="button"
        className="btn-3d rounded-lg px-3 py-2 text-sm"
        onClick={() => {
          setErr("");
          setMsg("");
          void resetUserPassword({ data: { handle, password } }).then((r) => {
            if (r.ok) {
              setMsg(`Password reset for ${r.handle}. Tell them the new one privately.`);
              setPassword("");
            } else setErr(r.reason);
          });
        }}
      >
        Reset password
      </button>
      <div className="flex flex-wrap gap-1">
        {members.slice(0, 16).map((m) => (
          <button key={m.id} type="button" className="rounded-full border border-line px-2 py-0.5 text-[10px] text-muted" onClick={() => setHandle(m.handle)}>
            {m.handle}
          </button>
        ))}
      </div>
    </div>
  );
}

function AdminPassword() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  return (
    <div className="md:col-span-2 raised space-y-2 rounded-xl p-3">
      <div className="text-[11px] font-medium text-muted">Your password</div>
      <p className="text-xs text-muted">Change it here. No email reset — we never stored a real mailbox.</p>
      <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} placeholder="Current password" className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm" />
      <input type="password" value={next} onChange={(e) => setNext(e.target.value)} placeholder="New password (8+)" className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm" />
      {err ? <p className="text-sm text-danger">{err}</p> : null}
      {msg ? <p className="text-sm text-lime-2">{msg}</p> : null}
      <button
        type="button"
        className="btn-3d rounded-lg px-3 py-2 text-sm"
        onClick={() => {
          setErr("");
          setMsg("");
          if (next.trim().length < 8) {
            setErr("New password needs 8+ characters.");
            return;
          }
          void authClient.changePassword({ currentPassword: current, newPassword: next }).then((r) => {
            if (r.error) setErr(r.error.message ?? "Could not change password.");
            else {
              setMsg("Password updated.");
              setCurrent("");
              setNext("");
            }
          });
        }}
      >
        Update password
      </button>
    </div>
  );
}

function BanMutePanel({ members }: { members: { id: string; handle: string; kind?: string }[] }) {
  const [handle, setHandle] = useState("");
  const [reason, setReason] = useState("");
  const [rows, setRows] = useState<{ userId: string; handle: string; kind: "ban" | "mute"; until: number; reason: string }[]>([]);
  const [msg, setMsg] = useState("");
  const refresh = () => {
    void listModUsers()
      .then(setRows)
      .catch(() => setRows([]));
  };
  useEffect(() => {
    refresh();
  }, []);
  const act = (kind: "ban" | "mute", hours: number) => {
    if (!handle.trim()) return;
    void setModUser({ data: { handle: handle.trim(), kind, hours, reason } }).then((r) => {
      if (r && "ok" in r && r.ok === false) setMsg(r.reason);
      else {
        setMsg("");
        setReason("");
        refresh();
      }
    });
  };
  return (
    <div className="md:col-span-2 raised space-y-2 rounded-xl p-3">
      <div className="text-[10px] font-bold tracking-normal text-lime-2">Mute & ban</div>
      <p className="text-xs text-muted">Mute stops chat. Ban stops chat, feeds, ads, and music. Owner cannot be restricted.</p>
      <input value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="Username" className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm" />
      <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (optional)" className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm" />
      <div className="flex flex-wrap gap-1">
        <button type="button" className="rounded border border-line px-2 py-1 text-[11px]" onClick={() => act("mute", 1)}>Mute 1h</button>
        <button type="button" className="rounded border border-line px-2 py-1 text-[11px]" onClick={() => act("mute", 24)}>Mute 24h</button>
        <button type="button" className="rounded border border-line px-2 py-1 text-[11px]" onClick={() => act("mute", 0)}>Mute forever</button>
        <button type="button" className="rounded border border-line px-2 py-1 text-[11px] text-danger" onClick={() => act("ban", 24)}>Ban 24h</button>
        <button type="button" className="rounded border border-line px-2 py-1 text-[11px] text-danger" onClick={() => act("ban", 0)}>Ban forever</button>
      </div>
      {msg ? <p className="text-sm text-danger">{msg}</p> : null}
      {rows.length === 0 ? <p className="text-[11px] text-muted">Nobody restricted.</p> : null}
      {rows.map((r) => (
        <div key={r.userId} className="flex items-center justify-between gap-2 text-xs">
          <span className="text-muted">
            {r.handle} · {r.kind} · {r.until ? `until ${new Date(r.until).toLocaleString()}` : "forever"}
            {r.reason ? ` · ${r.reason}` : ""}
          </span>
          <button type="button" className="text-lime-2" onClick={() => void clearModUser({ data: r.userId }).then(refresh)}>
            Lift
          </button>
        </div>
      ))}
      {members.slice(0, 12).map((m) => (
        <button key={m.id} type="button" className="mr-2 text-[11px] text-muted hover:text-fg" onClick={() => setHandle(m.handle)}>
          {m.handle}
        </button>
      ))}
    </div>
  );
}

function ChatTtlPanel() {
  const [hours, setHours] = useState(24);
  const [saved, setSaved] = useState("");
  useEffect(() => {
    void getChatTtl()
      .then((r) => setHours(r.hours))
      .catch(() => undefined);
  }, []);
  return (
    <div className="md:col-span-2 raised space-y-2 rounded-xl p-3">
      <div className="text-[10px] font-bold tracking-normal text-lime-2">Chat lifetime</div>
      <p className="text-xs text-muted">How long user messages stay in Chat before they disappear. Only you set this. Feeds and ads are not touched.</p>
      <div className="flex flex-wrap gap-1">
        {CHAT_TTLS.map((t) => (
          <button
            key={t.hours}
            type="button"
            onClick={() => setHours(t.hours)}
            className={`rounded-full px-2 py-1 text-[11px] ${hours === t.hours ? "btn-3d font-semibold" : "border border-line text-muted"}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <button
        type="button"
        className="btn-3d rounded-lg px-3 py-2 text-sm font-semibold"
        onClick={() => {
          void saveChatTtl({ data: hours })
            .then((r) => {
              setHours(r.hours);
              setSaved(`Saved · ${chatTtlLabel(r.hours)}`);
              setTimeout(() => setSaved(""), 2000);
            })
            .catch(() => setSaved("Could not save"));
        }}
      >
        Save lifetime
      </button>
      {saved ? <span className="ml-2 text-[11px] text-lime-2">{saved}</span> : null}
    </div>
  );
}

function Toggle({ on, label, set }: { on: boolean; label: string; set: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-[11px]">
      <input type="checkbox" checked={on} onChange={(e) => set(e.target.checked)} />
      {label}
    </label>
  );
}

function ModPanel() {
  const [cfg, setCfg] = useState<ModSettings>(DEFAULT_MOD);
  const [hits, setHits] = useState<{ id: string; surface: string; action: string; hits: string; excerpt: string; author: string; status: string; ts: number }[]>([]);
  const [saved, setSaved] = useState("");
  useEffect(() => {
    void getModSettings()
      .then(setCfg)
      .catch(() => undefined);
    void listModHits()
      .then(setHits)
      .catch(() => setHits([]));
  }, []);
  function patch(p: Partial<ModSettings>) {
    setCfg((c) => ({ ...c, ...p }));
  }
  return (
    <div className="md:col-span-2 raised space-y-3 rounded-xl p-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-[10px] font-bold tracking-normal text-lime-2">AI moderator</div>
          <p className="text-[11px] text-muted">Runs on the write path in milliseconds. No extra API. Safe with heavy traffic.</p>
        </div>
        <button type="button" className={`rounded-full px-3 py-1 text-[11px] font-bold ${cfg.enabled ? "btn-3d" : "border border-line text-muted"}`} onClick={() => patch({ enabled: !cfg.enabled })}>
          {cfg.enabled ? "On" : "Off"}
        </button>
      </div>
      <div className="text-[11px] font-medium text-muted">When it hits</div>
      <div className="flex flex-wrap gap-1">
        {(["mask", "block", "hold"] as const).map((a) => (
          <button key={a} type="button" className={`rounded-full px-2 py-1 text-[11px] ${cfg.action === a ? "btn-3d font-semibold" : "border border-line text-muted"}`} onClick={() => patch({ action: a })}>
            {a === "mask" ? "Mask ***" : a === "block" ? "Block" : "Hold for review"}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Toggle on={cfg.chat} label="Chat" set={(v) => patch({ chat: v })} />
        <Toggle on={cfg.feeds} label="Feeds" set={(v) => patch({ feeds: v })} />
        <Toggle on={cfg.comments} label="Comments" set={(v) => patch({ comments: v })} />
        <Toggle on={cfg.ads} label="Ads" set={(v) => patch({ ads: v })} />
        <Toggle on={cfg.music} label="Music notes" set={(v) => patch({ music: v })} />
      </div>
      <div className="text-[11px] font-medium text-muted">Filters</div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Toggle on={cfg.sexual} label="Sexual / porn" set={(v) => patch({ sexual: v })} />
        <Toggle on={cfg.insults} label="Abuse / slurs" set={(v) => patch({ insults: v })} />
        <Toggle on={cfg.scam} label="Scam / giveaway" set={(v) => patch({ scam: v })} />
        <Toggle on={cfg.links} label="Too many links" set={(v) => patch({ links: v })} />
        <Toggle on={cfg.shout} label="ALL CAPS shout" set={(v) => patch({ shout: v })} />
      </div>
      <textarea value={cfg.custom} onChange={(e) => patch({ custom: e.target.value })} rows={3} placeholder="Extra block words, comma or new line" className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-xs" />
      <textarea value={cfg.allow} onChange={(e) => patch({ allow: e.target.value })} rows={2} placeholder="Allow list (never block these)" className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-xs" />
      <button
        type="button"
        className="btn-3d rounded-lg px-3 py-2 text-sm font-semibold"
        onClick={() => {
          void saveModSettings({ data: cfg })
            .then(() => {
              setSaved("Saved");
              setTimeout(() => setSaved(""), 2000);
            })
            .catch(() => {
              setSaved("Could not save");
              setTimeout(() => setSaved(""), 2500);
            });
        }}
      >
        Save moderator
      </button>
      {saved ? <span className="ml-2 text-[11px] text-lime-2">{saved}</span> : null}
      <div className="text-[11px] font-medium text-muted">Hit log</div>
      {hits.length === 0 ? <p className="text-xs text-muted">Nothing caught yet.</p> : null}
      {hits.map((h) => (
        <div key={h.id} className="rounded-lg border border-white/5 p-2 text-[11px]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-semibold text-lime-2">{h.surface}</span>
            <span className="text-muted">{h.action} · {h.status} · {h.author}</span>
          </div>
          <p className="mt-1 text-muted">{h.hits}</p>
          <p className="mt-1">{h.excerpt}</p>
          {h.status === "open" ? (
            <div className="mt-1 flex gap-2">
              <button type="button" className="text-[10px] text-lime-2" onClick={() => void setModHitStatus({ data: { id: h.id, status: "kept" } }).then(() => setHits((xs) => xs.map((x) => (x.id === h.id ? { ...x, status: "kept" } : x))))}>
                Keep log
              </button>
              <button type="button" className="text-[10px] text-danger" onClick={() => void setModHitStatus({ data: { id: h.id, status: "dropped" } }).then(() => setHits((xs) => xs.map((x) => (x.id === h.id ? { ...x, status: "dropped" } : x))))}>
                Drop
              </button>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function Settings({ store }: { store: Store }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [staffRole, setStaffRoleState] = useState<string | null>(null);

  useEffect(() => {
    void staffMe()
      .then((s) => setStaffRoleState(s.role))
      .catch(() => setStaffRoleState(null));
  }, []);

  async function change() {
    setErr("");
    setMsg("");
    if (next.trim().length < 8) {
      setErr("New password needs 8+ characters.");
      return;
    }
    const r = await authClient.changePassword({ currentPassword: current, newPassword: next });
    if (r.error) setErr(r.error.message ?? "Could not change password.");
    else {
      setMsg("Password updated.");
      setCurrent("");
      setNext("");
    }
  }

  const kindLabel = ACCOUNT_KINDS.find((k) => k.id === store.kind)?.label ?? "Member";

  return (
    <div className="mx-auto max-w-2xl space-y-3 p-5">
      <h2 className="text-xl font-bold">Settings</h2>
      <Card title="Public username" body={`${store.handle || "Sign in to set one"} · ${kindLabel}`} />
      <Card title="Change password" body="Do this while signed in. There is no reset email — this app does not collect your real email, so nobody can mail you a new password.">
        <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} placeholder="Current password" className="mt-2 w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm" />
        <input type="password" value={next} onChange={(e) => setNext(e.target.value)} placeholder="New password" className="mt-2 w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm" />
        {err ? <p className="mt-2 text-sm text-danger">{err}</p> : null}
        {msg ? <p className="mt-2 text-sm text-lime-2">{msg}</p> : null}
        <button type="button" className="btn-3d mt-2 rounded-lg px-3 py-2 text-sm" onClick={() => void change()}>
          Update password
        </button>
      </Card>
      {staffRole ? (
        <Card title="Staff console" body={`Your staff role: ${staffRole === "mod" ? "sub-admin" : staffRole}. This link is hidden from normal users.`}>
          <a href="/ops" className="mt-2 inline-block rounded-lg border border-line px-3 py-2 text-sm">
            Open /ops
          </a>
        </Card>
      ) : null}
      <Card title="This device" body="Signed-in pins and teams save on the server. Clear only wipes extras cached here.">
        <button type="button" className="mt-2 rounded-lg border border-danger/40 px-3 py-2 text-sm text-danger" onClick={store.reset}>
          Clear local extras
        </button>
      </Card>
    </div>
  );
}

function Help() {
  return (
    <div className="mx-auto max-w-2xl space-y-3 p-5">
      <h2 className="text-xl font-bold">Help & Terms</h2>
      <Card title="Accounts" body="Username + password. Tick Terms. Choose Member, Artist, Writer, Advertiser, or Brand. No public email." />
      <Card title="Chat" body="Signed-in messages save on the server. Super admin sets how long they live (1 hour to 30 days, or never). Use ‹ › to page older/newer chat. Tap Translate under a line for Yoruba, Igbo, Hausa, French, Spanish." />
      <Card title="Profiles & messages" body="Every handle has a public page at /u/username. DMs are under Messages. Notifications fire on comments and replies." />
      <Card title="Feeds & music" body="Create post or Add track after you sign in. Music is a URL to Spotify / Apple / SoundCloud — we do not host files." />
      <Card title="Ads" body="Advert grid $40. Chat stream (scrolls with chat) $250. Pinned at top of Chat $800. Pay crypto, paste tx, staff approve. Super can pin / revoke." />
      <Card title="Staff" body="Tap the logo 5 times or open /ops. First signed-in owner claims super. Nobody else can be made super. Grant and revoke sub-admins only." />
      <div className="raised whitespace-pre-wrap rounded-xl p-3 text-xs text-muted">{TERMS}</div>
    </div>
  );
}

function Dash({ store, onHome, onForum }: { store: Store; onHome: (id?: string) => void; onForum?: () => void }) {
  const kindLabel = ACCOUNT_KINDS.find((k) => k.id === store.kind)?.label ?? "Member";
  return (
    <div className="mx-auto max-w-2xl space-y-3 p-5">
      <h2 className="text-xl font-bold">Dashboard</h2>
      <Card title={store.handle || "Guest"} body={`${kindLabel} · ${store.posts.filter((p) => p.author === store.handle).length} of your posts · ${store.pins.length} rooms saved`} />
      <Card title="Your rooms">
        <div className="mt-2 flex flex-wrap gap-2">
          {(store.pins.length ? store.pins : ["global"]).map((id) => (
            <button key={id} type="button" className="rounded-full border border-line px-3 py-1 text-xs" onClick={() => onHome(id)}>
              {roomName(id)}
            </button>
          ))}
        </div>
      </Card>
      <Card title="Your posts">
        {store.posts.filter((p) => !store.handle || p.author === store.handle).length === 0 ? (
          <p className="mt-1 text-sm text-muted">None yet.</p>
        ) : (
          store.posts
            .filter((p) => !store.handle || p.author === store.handle)
            .map((p) => (
              <button
                key={p.id}
                type="button"
                className="mt-2 block w-full text-left text-sm"
                onClick={() => {
                  store.setOpenPost(p.id);
                  onForum?.();
                }}
              >
                {p.title}
              </button>
            ))
        )}
      </Card>
    </div>
  );
}

function Trending({ onHome }: { onHome: (id?: string) => void }) {
  const top = [...ROOMS].sort((a, b) => b.online - a.online).slice(0, 12);
  return (
    <div className="mx-auto max-w-2xl space-y-3 p-5">
      <h2 className="text-xl font-bold">Trending</h2>
      {top.map((r) => (
        <button
          key={r.id}
          type="button"
          onClick={() => onHome(r.id)}
          className="flex w-full items-center justify-between rounded-xl border border-line bg-panel p-3 text-left"
        >
          <span>
            <span className="block font-semibold">{r.name}</span>
            <span className="text-xs text-muted">{r.region}</span>
          </span>
          <span className="text-xs text-muted">{r.online.toLocaleString()}</span>
        </button>
      ))}
    </div>
  );
}

function Contact({ store }: { store: Store }) {
  const [body, setBody] = useState("");
  const [sent, setSent] = useState(false);
  return (
    <div className="mx-auto max-w-2xl space-y-3 p-5">
      <h2 className="text-xl font-bold">Contact</h2>
      <p className="text-sm text-muted">Goes to staff inbox. Sign in first. Do not send passwords.</p>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={5}
        placeholder="Message"
        className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm"
      />
      <button
        type="button"
        className="btn-3d rounded-lg px-3 py-2 text-sm"
        onClick={() => {
          if (!body.trim()) return;
          store.sendContact(body);
          setBody("");
          setSent(true);
        }}
      >
        Send to staff
      </button>
      {sent ? <p className="text-sm text-lime-2">Sent. Staff see it on /ops.</p> : null}
    </div>
  );
}
