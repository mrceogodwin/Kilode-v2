import { useState } from "react";
import { Heart, Home, MessageCircle, Plus, Search, Send, ThumbsDown, ThumbsUp } from "lucide-react";

type Story = { name: string; ring: string; src?: string; art?: "you" | "tate" | "mike" };
type Post = {
  id: string;
  name: string;
  face: string;
  ring: string;
  photo: string;
  score: string;
  tags: string[];
  caption: string;
  up: number;
  down: number;
  comments: number;
  when: string;
  liked: string;
  others: string;
};

const STORIES: Story[] = [
  { name: "You", ring: "#f0b429", art: "you" },
  { name: "Nina", ring: "#e7b0c4", src: "/sf/nina.jpg" },
  { name: "Tate", ring: "#cbb6ea", art: "tate" },
  { name: "Mike", ring: "#e4d2b0", art: "mike" },
  { name: "Roy", ring: "#d5d5d5", src: "/sf/roy.jpg" },
  { name: "Nate", ring: "#b7d7c6", src: "/sf/nate.jpg" },
];

const POSTS: Post[] = [
  {
    id: "jane",
    name: "Jane Cooper",
    face: "/sf/jane.jpg",
    ring: "#e25b4a",
    photo: "/sf/hero.jpg",
    score: "4.8",
    tags: ["#Photos", "#Lightroom"],
    caption: "Creating culinary magic in my kitchen!",
    up: 1672,
    down: 232,
    comments: 324,
    when: "1 Day Ago",
    liked: "timur.kzb",
    others: "651",
  },
];

export function SocialFirst({
  onLikes,
  onSend,
  onCreate,
  onMe,
}: {
  onLikes: () => void;
  onSend: () => void;
  onCreate: () => void;
  onMe: () => void;
}) {
  const [lane, setLane] = useState<"feed" | "reels">("feed");
  const [find, setFind] = useState(false);
  const [q, setQ] = useState("");
  const [vote, setVote] = useState<Record<string, "up" | "down" | "">>({});
  const needle = q.trim().toLowerCase();
  const posts = POSTS.filter((p) => !needle || `${p.name} ${p.caption} ${p.tags.join(" ")}`.toLowerCase().includes(needle));

  return (
    <div className="sf">
      <header className="sf-bar">
        <div className="sf-tabs">
          <button type="button" className={lane === "feed" ? "on" : ""} onClick={() => setLane("feed")}>
            Feed
          </button>
          <button type="button" className={lane === "reels" ? "on" : ""} onClick={() => setLane("reels")}>
            Reels
          </button>
        </div>
        <div className="sf-tools">
          <button type="button" aria-label="Likes" onClick={onLikes}>
            <Heart />
          </button>
          <button type="button" aria-label="Send" onClick={onSend}>
            <Send />
          </button>
        </div>
      </header>
      {find ? (
        <label className="sf-find">
          <Search />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" aria-label="Search" />
        </label>
      ) : null}
      <div className="sf-scroll">
        {lane === "feed" ? (
          <>
            <div className="sf-stories">
              {STORIES.map((s) => (
                <button key={s.name} type="button" className="sf-story">
                  <span className="sf-ring" style={{ boxShadow: `0 0 0 2px #fff, 0 0 0 4px ${s.ring}` }}>
                    {s.src ? <img src={s.src} alt="" /> : <Art who={s.art || "you"} />}
                  </span>
                  {s.name}
                </button>
              ))}
            </div>
            {posts.length === 0 ? <p className="sf-empty">Nothing for that.</p> : null}
            {posts.map((p) => (
              <article key={p.id} className="sf-post">
                <header>
                  <span className="sf-mini" style={{ boxShadow: `0 0 0 2px ${p.ring}` }}>
                    <img src={p.face} alt="" />
                  </span>
                  <strong>{p.name}</strong>
                  <span className="sf-score">
                    {Array.from({ length: 4 }, (_, i) => (
                      <Star key={i} />
                    ))}
                    <em>{p.score}</em>
                  </span>
                </header>
                <div className="sf-shot">
                  <img src={p.photo} alt="" />
                  <div className="sf-cap">
                    <div className="sf-tags">
                      {p.tags.map((t) => (
                        <span key={t}>{t}</span>
                      ))}
                    </div>
                    <p>{p.caption}</p>
                  </div>
                </div>
                <div className="sf-acts">
                  <button type="button" className={vote[p.id] === "up" ? "on" : ""} onClick={() => setVote((m) => ({ ...m, [p.id]: m[p.id] === "up" ? "" : "up" }))}>
                    <ThumbsUp /> {p.up + (vote[p.id] === "up" ? 1 : 0)}
                  </button>
                  <button type="button" className={vote[p.id] === "down" ? "on" : ""} onClick={() => setVote((m) => ({ ...m, [p.id]: m[p.id] === "down" ? "" : "down" }))}>
                    <ThumbsDown /> {p.down + (vote[p.id] === "down" ? 1 : 0)}
                  </button>
                  <button type="button">
                    <MessageCircle /> {p.comments}
                  </button>
                  <em>{p.when}</em>
                </div>
                <div className="sf-liked">
                  <span className="sf-piles">
                    <img src="/sf/like1.jpg" alt="" />
                    <img src="/sf/like2.jpg" alt="" />
                  </span>
                  <p>
                    Liked by <b>{p.liked}</b> and {p.others} others
                  </p>
                  <button type="button" aria-label="More">
                    ···
                  </button>
                </div>
              </article>
            ))}
          </>
        ) : (
          <div className="sf-reels">
            <article>
              <img src="/sf/hero.jpg" alt="" />
              <div>
                <b>Jane Cooper</b>
                <span>Creating culinary magic in my kitchen!</span>
              </div>
            </article>
          </div>
        )}
      </div>
      <nav className="sf-dock">
        <button type="button" className={lane === "feed" ? "on" : ""} aria-label="Home" onClick={() => setLane("feed")}>
          <Home />
        </button>
        <button type="button" className={find ? "on" : ""} aria-label="Search" onClick={() => setFind((v) => !v)}>
          <Search />
        </button>
        <button type="button" className="sf-plus" aria-label="Create" onClick={onCreate}>
          <Plus />
          <i>NEW</i>
        </button>
        <button type="button" className={lane === "reels" ? "on" : ""} aria-label="Reels" onClick={() => setLane("reels")}>
          <Orbit />
        </button>
        <button type="button" className="sf-me" aria-label="Me" onClick={onMe}>
          <Art who="you" />
        </button>
      </nav>
    </div>
  );
}

function Star() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden>
      <path d="M10 1.6 12.5 7l5.8.5-4.4 3.7 1.4 5.5L10 13.8 4.7 16.7 6.1 11.2 1.7 7.5 7.5 7z" />
    </svg>
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

function Art({ who }: { who: "you" | "tate" | "mike" }) {
  if (who === "tate") {
    return (
      <svg viewBox="0 0 64 64" aria-hidden>
        <rect width="64" height="64" rx="32" fill="#efe4ff" />
        <circle cx="32" cy="30" r="12" fill="#f3d2c3" />
        <path d="M16 34c1-16 14-22 16-22s15 6 16 22c-6 4-10 2-16 2s-10 2-16-2z" fill="#7a4db8" />
        <circle cx="27.5" cy="30" r="1.3" fill="#2a1c16" />
        <circle cx="36.5" cy="30" r="1.3" fill="#2a1c16" />
        <path d="M28 35.5c1.6 1.4 6.4 1.4 8 0" fill="none" stroke="#c47a88" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    );
  }
  if (who === "mike") {
    return (
      <svg viewBox="0 0 64 64" aria-hidden>
        <rect width="64" height="64" rx="32" fill="#f6e7cf" />
        <circle cx="32" cy="31" r="12" fill="#f0c2a0" />
        <path d="M18 28c2-14 26-16 30-4-4 2-8-2-15-1-6 1-11 2-15 5z" fill="#4a3428" />
        <circle cx="27" cy="31" r="1.3" fill="#2a1c16" />
        <circle cx="36" cy="31" r="1.3" fill="#2a1c16" />
        <path d="M29 36h6" stroke="#c47a88" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 64 64" aria-hidden>
      <rect width="64" height="64" fill="#f2c14d" />
      <circle cx="32" cy="28" r="16" fill="#2a1810" />
      <circle cx="32" cy="34" r="13" fill="#f6c7a4" />
      <path d="M18 32c2-14 10-20 14-20s12 6 14 20c-6-4-10-3-14-3s-8-1-14 3z" fill="#2a1810" />
      <circle cx="27" cy="34" r="1.3" fill="#2a1c16" />
      <circle cx="37" cy="34" r="1.3" fill="#2a1c16" />
      <path d="M28.5 39c1.6 1.6 5.4 1.6 7 0" fill="none" stroke="#c45b62" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}
