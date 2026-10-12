import { useEffect, useState, type FormEvent } from "react";
import { Eye, Flame, Heart, Home, LayoutGrid, Menu, MessageCircle, MoreHorizontal, Newspaper, Plus, Search, Send, Share2, ThumbsUp } from "lucide-react";
import { avatarUrl, timeAgo } from "@/lib/qonvo-data";
import { likeTake, listStories, listTakes, saveTake, toggleFollow, voteTake, type FellowRow, type TakeRow } from "@/lib/takes-server";

type News = { id: string; title: string; image?: string; category?: string; ts: number; views?: number; status?: string };

const RINGS = ["#e25b4a", "#f0b429", "#7a4db8", "#1f8f4e", "#3a6ea5", "#111111"];

function ringOf(name: string) {
  let n = 0;
  for (const c of name) n += c.charCodeAt(0);
  return RINGS[n % RINGS.length];
}

function tagsOf(body: string) {
  return [...body.matchAll(/#([A-Za-z0-9_]{2,24})/g)].slice(0, 3).map((m) => `#${m[1]}`);
}

function shotOf(meta: TakeRow["meta"]) {
  const img = meta?.image;
  return typeof img === "string" && (img.startsWith("http") || img.startsWith("data:image/")) ? img : "";
}

function roleLabel(role: string) {
  const raw = (role || "member").replace(/_/g, " ").replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "").trim();
  if (!raw) return "Member";
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function heatOf(t: TakeRow) {
  return (t.likes || 0) * 3 + (t.reposts || 0) * 4 + (t.comments || 0) * 2 + (t.fact || 0) + (t.cap || 0);
}

function takeUrl(id: string) {
  return `${window.location.origin}/?tab=feeds&take=${encodeURIComponent(id)}`;
}

export function SocialFirst({
  me,
  face,
  authed,
  news,
  onLikes,
  onSend,
  onCreate,
  onMe,
  onMenu,
  onOpenNews,
  onNeedAuth,
}: {
  me: string;
  face?: string;
  authed: boolean;
  news: News[];
  onLikes: () => void;
  onSend: () => void;
  onCreate: () => void;
  onMe: () => void;
  onMenu: () => void;
  onOpenNews: (id: string) => void;
  onNeedAuth: () => void;
}) {
  const [lane, setLane] = useState<"feed" | "media">("feed");
  const [find, setFind] = useState(false);
  const [q, setQ] = useState("");
  const [takes, setTakes] = useState<TakeRow[]>([]);
  const [next, setNext] = useState(0);
  const [people, setPeople] = useState<FellowRow[]>([]);
  const [faces, setFaces] = useState<Record<string, string>>({});
  const [stories, setStories] = useState<{ id: string; handle: string; image: string; ts: number }[]>([]);
  const [moreBusy, setMoreBusy] = useState(false);
  const [cut, setCut] = useState("trending");
  const [voted, setVoted] = useState<Record<string, "" | "fact" | "cap">>({});
  const [moreId, setMoreId] = useState("");
  const [note, setNote] = useState("");
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const [followed, setFollowed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const place = JSON.parse(localStorage.getItem("kilode-place") || "null") as { tab?: string } | null;
      if (place?.tab === "socials") {
        localStorage.setItem("kilode-sf-lane", "feed");
        return;
      }
      if (localStorage.getItem("kilode-sf-lane") === "media") setLane("media");
    } catch { /* ignore */ }
  }, []);
  useEffect(() => {
    const feed = () => setLane("feed");
    const media = () => setLane("media");
    window.addEventListener("kilode:sf-feed", feed);
    window.addEventListener("kilode:sf-media", media);
    return () => {
      window.removeEventListener("kilode:sf-feed", feed);
      window.removeEventListener("kilode:sf-media", media);
    };
  }, []);
  useEffect(() => {
    try { localStorage.setItem("kilode-sf-lane", lane); } catch { /* ignore */ }
  }, [lane]);

  useEffect(() => {
    let dead = false;
    void listTakes()
      .then((r) => {
        if (dead) return;
        setTakes(r.takes || []);
        setNext(r.next || 0);
        setPeople(r.fellows || []);
        setFaces(r.faces || {});
      })
      .catch(() => undefined);
    void listStories()
      .then((r) => { if (!dead) setStories(r.stories || []); })
      .catch(() => undefined);
    return () => { dead = true; };
  }, []);

  useEffect(() => {
    if (!note) return;
    const id = window.setTimeout(() => setNote(""), 1600);
    return () => window.clearTimeout(id);
  }, [note]);

  useEffect(() => {
    if (!takes.length || typeof window === "undefined") return;
    const id = new URLSearchParams(window.location.search).get("take");
    if (!id) return;
    document.querySelector(`[data-take="${CSS.escape(id)}"]`)?.scrollIntoView({ block: "center" });
  }, [takes]);

  const needle = q.trim().toLowerCase();
  const posts = takes.filter((t) => !needle || `${t.name} ${t.handle} ${t.body}`.toLowerCase().includes(needle));
  const storyPeople = (() => {
    const seen = new Set<string>();
    const rows: { key: string; name: string; face: string; href: string }[] = [];
    for (const s of stories) {
      const h = (s.handle || "").toLowerCase();
      if (!h || seen.has(h) || !s.image) continue;
      seen.add(h);
      rows.push({
        key: s.id,
        name: s.handle.slice(0, 10),
        face: s.image,
        href: `/u/${encodeURIComponent(s.handle)}`,
      });
      if (rows.length >= 16) break;
    }
    return rows;
  })();

  const liveNews = news.filter((p) => p?.id && p.status !== "draft");
  const cats = [...new Set(liveNews.map((p) => p.category || "News"))].slice(0, 6);
  const media = [...liveNews]
    .filter((p) => cut === "trending" || cut === "latest" || (p.category || "News") === cut)
    .filter((p) => !needle || `${p.title} ${p.category || ""}`.toLowerCase().includes(needle))
    .sort((a, b) => (cut === "latest" ? b.ts - a.ts : (b.views ?? 0) - (a.views ?? 0)));
  const lead = media[0];
  const side = media.slice(1, 3);
  const rest = media.slice(3);

  function more() {
    if (!next || moreBusy) return;
    setMoreBusy(true);
    void listTakes({ data: { before: next } })
      .then((r) => {
        setTakes((cur) => {
          const ids = new Set(cur.map((t) => t.id));
          return [...cur, ...(r.takes || []).filter((t) => !ids.has(t.id))];
        });
        setNext(r.next || 0);
      })
      .catch(() => undefined)
      .finally(() => setMoreBusy(false));
  }

  function like(id: string) {
    if (!authed) { onNeedAuth(); return; }
    void likeTake({ data: { id } })
      .then((r) => {
        if (!r.ok) return;
        setTakes((cur) => cur.map((t) => (t.id === id ? { ...t, likes: r.likes } : t)));
      })
      .catch(() => onNeedAuth());
  }

  function vote(id: string, side: "fact" | "cap") {
    if (!authed) { onNeedAuth(); return; }
    const prev = voted[id] || "";
    if (prev === side) return;
    const apply = (from: "" | "fact" | "cap", to: "" | "fact" | "cap") => {
      setTakes((cur) => cur.map((t) => {
        if (t.id !== id) return t;
        let fact = t.fact || 0;
        let cap = t.cap || 0;
        if (from === "fact") fact = Math.max(0, fact - 1);
        if (from === "cap") cap = Math.max(0, cap - 1);
        if (to === "fact") fact += 1;
        if (to === "cap") cap += 1;
        return { ...t, fact, cap };
      }));
    };
    setVoted((m) => ({ ...m, [id]: side }));
    apply(prev, side);
    void voteTake({ data: { id, side } })
      .then((r) => {
        if (r.ok) return;
        setVoted((m) => ({ ...m, [id]: prev }));
        apply(side, prev);
      })
      .catch(() => {
        setVoted((m) => ({ ...m, [id]: prev }));
        apply(side, prev);
        onNeedAuth();
      });
  }

  async function share(t: TakeRow) {
    const url = takeUrl(t.id);
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({ title: t.name || "Kilode", text: (t.body || "").slice(0, 140), url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setNote("Link copied");
    } catch { /* dismissed */ }
  }

  function publish(e: FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!authed) { onNeedAuth(); return; }
    if (body.length < 1 || posting) return;
    setPosting(true);
    void saveTake({ data: { body, kind: "take" } })
      .then((r) => {
        if (!r.ok) { setNote(r.reason || "Could not post."); return; }
        setDraft("");
        setNote("Posted");
        return listTakes().then((fresh) => {
          setTakes(fresh.takes || []);
          setNext(fresh.next || 0);
          setPeople(fresh.fellows || []);
          setFaces(fresh.faces || {});
        });
      })
      .catch(() => onNeedAuth())
      .finally(() => setPosting(false));
  }

  function addPerson(p: FellowRow) {
    if (!authed) { onNeedAuth(); return; }
    void toggleFollow({ data: { id: p.id, handle: p.handle } })
      .then((r) => { if (r.ok) setFollowed((m) => ({ ...m, [p.handle]: r.on })); })
      .catch(() => onNeedAuth());
  }

  const hottest = posts.reduce((n, t) => Math.max(n, heatOf(t)), 0);
  const ticks = liveNews.map((p) => p.title).filter(Boolean).slice(0, 12);
  const know = people.filter((p) => p.handle && p.handle.toLowerCase() !== me.toLowerCase()).slice(0, 8);

  return (
    <div className="sf">
      <header className="sf-bar">
        <div className="sf-left">
          <button type="button" className="sf-menu" aria-label="Menu" onClick={onMenu}><Menu /></button>
          <img src="/kilode-logo.png" alt="Kilode" className="sf-logo" />
        </div>
        <div className="sf-tools">
          <button type="button" aria-label="Feed" className={lane === "feed" ? "on" : ""} onClick={() => setLane("feed")}><Newspaper /></button>
          <button type="button" aria-label="Media" className={lane === "media" ? "on" : ""} onClick={() => setLane("media")}><LayoutGrid /></button>
          <button type="button" aria-label="Likes" onClick={onLikes}><Heart /></button>
          <button type="button" aria-label="Messages" onClick={onSend}><Send /></button>
          <button type="button" className="sf-ava" aria-label="Profile" onClick={onMe}>
            <img src={avatarUrl(me || "me", face)} alt="" />
          </button>
        </div>
      </header>
      {ticks.length > 0 ? (
        <div className="sf-tick" aria-label="Trending">
          <b>Trending</b>
          <div className="sf-tick-mask">
            <div className="sf-tick-track">
              {[...ticks, ...ticks].map((title, i) => <span key={`${title}-${i}`}>{title}</span>)}
            </div>
          </div>
        </div>
      ) : null}
      {note ? <p className="sf-note">{note}</p> : null}
      {find ? (
        <label className="sf-find">
          <Search />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={lane === "media" ? "Search stories" : "Search people, posts"} aria-label="Search" />
        </label>
      ) : null}
      <div className="sf-scroll">
        {lane === "feed" ? (
          <>
            {storyPeople.length > 0 ? (
              <div className="sf-stories">
                {storyPeople.map((s) => {
                  const inner = (
                    <>
                      <span className="sf-ring" style={{ boxShadow: `0 0 0 2px #fff, 0 0 0 4px ${ringOf(s.name)}` }}>
                        <img src={s.face} alt="" />
                      </span>
                      {s.name}
                    </>
                  );
                  return s.href ? (
                    <a key={s.key} className="sf-story" href={s.href}>{inner}</a>
                  ) : (
                    <button key={s.key} type="button" className="sf-story">{inner}</button>
                  );
                })}
              </div>
            ) : null}
            <form className="sf-box" onSubmit={publish}>
              <img src={avatarUrl(me || "me", face)} alt="" />
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onFocus={() => { if (!authed) onNeedAuth(); }}
                maxLength={280}
                placeholder="What's happening?"
                aria-label="Create a post"
              />
              <button type="submit" disabled={posting || draft.trim().length < 1}>{posting ? "…" : "Post"}</button>
            </form>
            {know.length > 0 ? (
              <section className="sf-know" aria-label="People you may know">
                <b>People you may know</b>
                <div>
                  {know.map((p) => (
                    <article key={p.id || p.handle}>
                      <a href={`/u/${encodeURIComponent(p.handle)}`}>
                        <img src={faces[p.handle.toLowerCase()] || p.photo || avatarUrl(p.handle)} alt="" />
                        <strong>{p.name || p.handle}</strong>
                        <em>{roleLabel(p.role)}</em>
                      </a>
                      <button type="button" onClick={() => addPerson(p)}>{followed[p.handle] ? "Added" : "Add"}</button>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}
            {posts.length === 0 ? <p className="sf-empty">No member posts yet.</p> : null}
            {posts.map((t) => {
              const photo = shotOf(t.meta);
              const tags = tagsOf(t.body);
              const who = faces[t.handle.toLowerCase()] || avatarUrl(t.handle);
              const hot = (() => {
                const h = heatOf(t);
                return h >= 6 || (h >= 3 && h === hottest);
              })();
              return (
                <article key={t.id} className="sf-post" data-take={t.id}>
                  <header>
                    <a className="sf-mini" href={`/u/${encodeURIComponent(t.handle)}`} style={{ boxShadow: `0 0 0 2px ${ringOf(t.handle)}` }}>
                      <img src={who} alt="" />
                    </a>
                    <div className="sf-who">
                      <strong>
                        <a href={`/u/${encodeURIComponent(t.handle)}`}>{t.name || t.handle}</a>
                        {hot ? <Flame className="sf-hot" aria-label="Trending" /> : null}
                      </strong>
                      <em className="sf-role">{roleLabel(t.role)}</em>
                    </div>
                    <button type="button" className="sf-dot" aria-label="More" aria-expanded={moreId === t.id} onClick={() => setMoreId((id) => (id === t.id ? "" : t.id))}>
                      <MoreHorizontal />
                    </button>
                    {moreId === t.id ? (
                      <div className="sf-pop">
                        <button type="button" onClick={() => { setMoreId(""); void share(t); }}>Share</button>
                        <button type="button" onClick={() => { setMoreId(""); void navigator.clipboard?.writeText(takeUrl(t.id)); setNote("Link copied"); }}>Copy link</button>
                        <a href={`/u/${encodeURIComponent(t.handle)}`}>Profile</a>
                      </div>
                    ) : null}
                  </header>
                  {photo ? (
                    <div className="sf-shot">
                      <img src={photo} alt="" />
                    </div>
                  ) : null}
                  <div className="sf-copy">
                    {tags.length > 0 ? <div className="sf-tags dark">{tags.map((tag) => <span key={tag}>{tag}</span>)}</div> : null}
                    {t.body ? <p>{t.body}</p> : null}
                  </div>
                  <div className="sf-acts">
                    <button type="button" onClick={() => like(t.id)}><ThumbsUp /> {t.likes || 0}</button>
                    <button type="button"><MessageCircle /> {t.comments || 0}</button>
                    <span><Eye /> {t.views || 0}</span>
                    <em>{timeAgo(t.ts)}</em>
                  </div>
                  <div className="sf-judge">
                    <button type="button" className={voted[t.id] === "fact" ? "on" : ""} onClick={() => vote(t.id, "fact")}>Fact <b>{t.fact || 0}</b></button>
                    <button type="button" className={voted[t.id] === "cap" ? "on" : ""} onClick={() => vote(t.id, "cap")}>Cap <b>{t.cap || 0}</b></button>
                    <button type="button" aria-label="Share" onClick={() => void share(t)}><Share2 /></button>
                  </div>
                  {(t.likes || 0) > 0 ? (
                    <p className="sf-liked"><b>{t.likes}</b> {t.likes === 1 ? "like" : "likes"}</p>
                  ) : null}
                </article>
              );
            })}
            {next ? <button type="button" className="sf-more" onClick={more}>{moreBusy ? "Loading" : "Load more"}</button> : null}
          </>
        ) : (
          <div className="sf-media">
            <div className="sf-cuts">
              {(["trending", "latest", ...cats] as string[]).map((id) => (
                <button key={id} type="button" className={cut === id ? "on" : ""} onClick={() => setCut(id)}>
                  {id === "trending" ? "Trending" : id === "latest" ? "Latest" : id}
                </button>
              ))}
            </div>
            {media.length === 0 ? <p className="sf-empty">No stories in this cut.</p> : null}
            {lead ? (
              <div className="sf-feature">
                <button type="button" className="sf-lead" onClick={() => onOpenNews(lead.id)}>
                  {lead.image ? <img src={lead.image} alt="" /> : <span />}
                  <b>{lead.category || "News"}</b>
                  <strong>{lead.title}</strong>
                  <em>{lead.views ?? 0} views</em>
                </button>
                <div>
                  {side.map((p) => (
                    <button key={p.id} type="button" onClick={() => onOpenNews(p.id)}>
                      {p.image ? <img src={p.image} alt="" /> : <span />}
                      <strong>{p.title}</strong>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            {rest.length > 0 ? (
              <div className="sf-mosaic">
                {rest.map((p) => (
                  <button key={p.id} type="button" onClick={() => onOpenNews(p.id)}>
                    {p.image ? <img src={p.image} alt="" /> : <span />}
                    <strong>{p.title}</strong>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        )}
      </div>
      <nav className="sf-dock">
        <button type="button" className={lane === "feed" ? "on" : ""} aria-label="Home" onClick={() => setLane("feed")}><Home /></button>
        <button type="button" className={find ? "on" : ""} aria-label="Search" onClick={() => setFind((v) => !v)}><Search /></button>
        <button type="button" className="sf-plus" aria-label="Create" onClick={() => {
          if (!authed) { onNeedAuth(); return; }
          document.querySelector<HTMLInputElement>(".sf-box input")?.focus();
        }}><Plus /><i>NEW</i></button>
        <button type="button" className={lane === "media" ? "on" : ""} aria-label="Media" onClick={() => setLane("media")}><Orbit /></button>
        <button type="button" className="sf-me" aria-label="Me" onClick={onMe}>
          <img src={avatarUrl(me || "me", face)} alt="" />
        </button>
      </nav>
    </div>
  );
}

function Orbit() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="3.1" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="12" cy="4.2" r="1.35" fill="currentColor" />
      <circle cx="18.6" cy="15.6" r="1.35" fill="currentColor" />
      <circle cx="5.4" cy="15.6" r="1.35" fill="currentColor" />
    </svg>
  );
}
