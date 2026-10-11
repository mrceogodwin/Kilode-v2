import { useEffect, useState } from "react";
import { Eye, Heart, Home, Menu, MessageCircle, Plus, Search, Send, ThumbsUp } from "lucide-react";
import { avatarUrl, timeAgo } from "@/lib/qonvo-data";
import { likeTake, listStories, listTakes, type FellowRow, type TakeRow } from "@/lib/takes-server";

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

  useEffect(() => {
    try {
      if (localStorage.getItem("kilode-sf-lane") === "media") setLane("media");
    } catch { /* ignore */ }
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

  const needle = q.trim().toLowerCase();
  const posts = takes.filter((t) => !needle || `${t.name} ${t.handle} ${t.body}`.toLowerCase().includes(needle));
  const storyPeople = (() => {
    const seen = new Set<string>();
    const rows: { key: string; name: string; face: string; href?: string }[] = [];
    if (me) rows.push({ key: "you", name: "You", face: avatarUrl(me, face) });
    for (const s of stories) {
      const h = s.handle.toLowerCase();
      if (seen.has(h)) continue;
      seen.add(h);
      rows.push({ key: s.id, name: s.handle.slice(0, 8), face: s.image || avatarUrl(s.handle), href: `/u/${encodeURIComponent(s.handle)}` });
    }
    for (const p of people) {
      const h = p.handle.toLowerCase();
      if (seen.has(h) || h === me.toLowerCase()) continue;
      seen.add(h);
      rows.push({ key: p.id, name: p.handle.slice(0, 8), face: faces[h] || p.photo || avatarUrl(p.handle), href: `/u/${encodeURIComponent(p.handle)}` });
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

  return (
    <div className="sf">
      <header className="sf-bar">
        <img src="/kilode-logo.png" alt="Kilode" className="sf-logo" />
        <div className="sf-tools">
          <button type="button" aria-label="Likes" onClick={onLikes}><Heart /></button>
          <button type="button" aria-label="Messages" onClick={onSend}><Send /></button>
          <button type="button" aria-label="Menu" onClick={onMenu}><Menu /></button>
        </div>
      </header>
      <div className="sf-tabs">
        <button type="button" className={lane === "feed" ? "on" : ""} onClick={() => setLane("feed")}>Feed</button>
        <button type="button" className={lane === "media" ? "on" : ""} onClick={() => setLane("media")}>Media</button>
      </div>
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
            {posts.length === 0 ? <p className="sf-empty">No member posts yet.</p> : null}
            {posts.map((t) => {
              const photo = shotOf(t.meta);
              const tags = tagsOf(t.body);
              const who = faces[t.handle.toLowerCase()] || avatarUrl(t.handle);
              return (
                <article key={t.id} className="sf-post">
                  <header>
                    <a className="sf-mini" href={`/u/${encodeURIComponent(t.handle)}`} style={{ boxShadow: `0 0 0 2px ${ringOf(t.handle)}` }}>
                      <img src={who} alt="" />
                    </a>
                    <strong><a href={`/u/${encodeURIComponent(t.handle)}`}>{t.name || t.handle}</a></strong>
                    <em>@{t.handle}</em>
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
                  {(t.likes || 0) > 0 ? (
                    <div className="sf-liked">
                      <span className="sf-piles"><img src={who} alt="" /></span>
                      <p><b>{t.likes}</b> {t.likes === 1 ? "like" : "likes"}</p>
                    </div>
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
        <button type="button" className="sf-plus" aria-label="Create" onClick={onCreate}><Plus /><i>NEW</i></button>
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
