import { useEffect, useMemo, useState } from "react";
import {
  Briefcase,
  Flame,
  Laptop,
  MapPin,
  Music,
  Plus,
  Search,
  Smile,
  Trophy,
  Users,
  Utensils,
  type LucideIcon,
} from "lucide-react";
import { ROOMS, fmtCount, type Room } from "@/lib/qonvo-data";
import { listRoomOverlay } from "@/lib/rooms-server";

const COVER: Record<string, string> = {
  lounge: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=900&q=70",
  hot: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=900&q=70",
  ng: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=900&q=70",
  music: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=900&q=70",
  cinema: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=900&q=70",
  jobs: "https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=900&q=70",
  sport: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=900&q=70",
  tech: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=900&q=70",
  "st-lagos": "https://images.unsplash.com/photo-1618828665011-0abd973f7bb8?auto=format&fit=crop&w=900&q=70",
  "st-fct": "https://images.unsplash.com/photo-1568632234157-ce7aecd03d0d?auto=format&fit=crop&w=900&q=70",
  "st-rivers": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=70",
  north: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=70",
};

const BLURB: Record<string, string> = {
  lounge: "Music, talks, people.",
  hot: "Politics, society, trends.",
  ng: "News, gist, real talk.",
  music: "Share, discuss, discover.",
  cinema: "Movies, reviews, talk.",
  jobs: "Opportunities and skills.",
  sport: "Football and more.",
  tech: "Ideas. Support. Growth.",
  "st-lagos": "News, gist, real talk.",
  "st-fct": "Friends. Business. Events.",
  "st-rivers": "Music, lifestyle, events.",
  north: "Northern pulse.",
};

const TONE: Record<string, { bg: string; fg: string; Icon: LucideIcon }> = {
  ng: { bg: "#123d2a", fg: "#3dff9a", Icon: Flame },
  tech: { bg: "#102844", fg: "#7ec8ff", Icon: Laptop },
  lounge: { bg: "#2a1844", fg: "#d7a4ff", Icon: Music },
  music: { bg: "#3a1860", fg: "#e0b0ff", Icon: Music },
  hot: { bg: "#3a2410", fg: "#ffb020", Icon: Utensils },
  sport: { bg: "#3a1218", fg: "#ff6b6b", Icon: Trophy },
  cinema: { bg: "#2a220c", fg: "#ffe08a", Icon: Smile },
  jobs: { bg: "#142018", fg: "#b7f7c8", Icon: Briefcase },
  "st-lagos": { bg: "#102818", fg: "#7dffa8", Icon: MapPin },
  "st-fct": { bg: "#241808", fg: "#ffd27a", Icon: MapPin },
  "st-rivers": { bg: "#102030", fg: "#9fd4ff", Icon: MapPin },
  north: { bg: "#201410", fg: "#ffc7a1", Icon: MapPin },
};

type Mine = { id: string; name: string; blurb: string; city: string };

function readJoined(): string[] {
  try {
    return JSON.parse(localStorage.getItem("kilode-joined-rooms") || "[]") as string[];
  } catch {
    return [];
  }
}
function readMine(): Mine[] {
  try {
    return JSON.parse(localStorage.getItem("kilode-my-communities") || "[]") as Mine[];
  } catch {
    return [];
  }
}

export function CommunitiesHub({ onHome }: { onHome: (roomId?: string) => void }) {
  const [rooms, setRooms] = useState<Room[]>(ROOMS);
  const [q, setQ] = useState("");
  const [joined, setJoined] = useState<string[]>([]);
  const [mine, setMine] = useState<Mine[]>([]);
  const [create, setCreate] = useState(false);
  const [name, setName] = useState("");
  const [blurb, setBlurb] = useState("");
  const [city, setCity] = useState("");
  const [see, setSee] = useState<"feat" | "near" | null>(null);

  useEffect(() => {
    setJoined(readJoined());
    setMine(readMine());
    void listRoomOverlay()
      .then((o) => {
        const paused = new Set(o.paused || []);
        const base = ROOMS.filter((r) => !paused.has(r.id)).map((r) => ({
          ...r,
          name: o.overrides?.[r.id]?.name || r.name,
          region: o.overrides?.[r.id]?.region || r.region,
        }));
        setRooms([...base, ...(o.extra || [])]);
      })
      .catch(() => undefined);
  }, []);

  const needle = q.trim().toLowerCase();
  const shown = useMemo(
    () => rooms.filter((r) => !needle || `${r.name} ${r.region} ${BLURB[r.id] || ""}`.toLowerCase().includes(needle)),
    [rooms, needle],
  );
  const featured = shown.filter((r) => r.region === "Featured");
  const places = shown.filter((r) => r.region === "Places" || r.region === "More rooms");
  const featShown = see === "feat" ? featured : featured.slice(0, 6);
  const nearShown = see === "near" ? places : places.slice(0, 6);
  const yours = shown.filter((r) => joined.includes(r.id));

  function join(id: string) {
    setJoined((cur) => {
      const next = cur.includes(id) ? cur : [id, ...cur];
      localStorage.setItem("kilode-joined-rooms", JSON.stringify(next));
      return next;
    });
  }

  function openRoom(id: string) {
    join(id);
    onHome(id);
  }

  return (
    <div className="fm-page">
      <div className="fm-banner">
        <div className="fm-head">
          <span className="fm-mark"><Users className="size-5" /></span>
          <div className="min-w-0 flex-1">
            <div className="fm-kicker">DISCOVER COMMUNITIES</div>
            <h1 className="fm-title">Discover Communities</h1>
            <p className="fm-sub">Hubs by region. Tap a room to chat.</p>
          </div>
          <button type="button" className="fm-cta" onClick={() => setCreate((v) => !v)}>+ Create Community</button>
        </div>

        <label className="fm-search">
          <Search className="size-4 shrink-0" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search communities, interests, regions..." aria-label="Search communities" />
        </label>
      </div>

      {create ? (
        <form
          className="fm-form"
          onSubmit={(e) => {
            e.preventDefault();
            const label = name.trim();
            if (label.length < 2) return;
            const row: Mine = { id: `me-${Date.now().toString(36)}`, name: label, blurb: blurb.trim() || "Your hub.", city: city.trim() || "Kilode" };
            const next = [row, ...mine].slice(0, 12);
            setMine(next);
            localStorage.setItem("kilode-my-communities", JSON.stringify(next));
            setName("");
            setBlurb("");
            setCity("");
            setCreate(false);
          }}
        >
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Community name" required />
          <input value={blurb} onChange={(e) => setBlurb(e.target.value)} placeholder="One line about it" />
          <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City or region" />
          <button type="submit" className="fm-cta wide"><Plus className="size-3.5" /> Save community</button>
        </form>
      ) : null}

      <section className="fm-sec">
        <div className="fm-sec-h">
          <h2>★ Featured Communities</h2>
          {featured.length > 3 ? <button type="button" className="fm-link" onClick={() => setSee((v) => (v === "feat" ? null : "feat"))}>{see === "feat" ? "Less" : "See all →"}</button> : null}
        </div>
        <div className="fm-hscroll">
          {featShown.map((r) => (
            <article key={r.id} className="fm-comm">
              <button type="button" className="fm-comm-shot" onClick={() => openRoom(r.id)}>
                <img src={COVER[r.id] || COVER.lounge} alt="" />
                <em>{r.region === "Featured" ? "Trending" : r.region}</em>
              </button>
              <div className="fm-comm-body">
                <b>{r.name}</b>
                <span>{BLURB[r.id] || r.region}</span>
                <div className="fm-row">
                  <small><MapPin className="size-3" /> {r.region}{r.online ? ` · ${fmtCount(r.online)} online` : ""}</small>
                  <button type="button" className={joined.includes(r.id) ? "fm-cta tiny on" : "fm-cta tiny"} onClick={() => (joined.includes(r.id) ? openRoom(r.id) : join(r.id))}>
                    {joined.includes(r.id) ? "Open" : "Join"}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="fm-sec">
        <div className="fm-sec-h"><h2>Popular Communities</h2></div>
        <div className="fm-orbs">
          {shown.slice(0, 8).map((r) => {
            const tone = TONE[r.id] || { bg: "#163024", fg: "#7dffa8", Icon: Users };
            return (
              <button key={r.id} type="button" className="fm-orb" onClick={() => openRoom(r.id)}>
                <span style={{ background: tone.bg, color: tone.fg }}><tone.Icon className="size-5" /></span>
                <b>{r.name}</b>
                <small>{r.online ? `${fmtCount(r.online)} online` : r.region}</small>
              </button>
            );
          })}
        </div>
      </section>

      <section className="fm-sec">
        <div className="fm-sec-h">
          <div>
            <h2>Nearby Communities</h2>
            <p>Places and more rooms</p>
          </div>
          {places.length > 3 ? <button type="button" className="fm-link" onClick={() => setSee((v) => (v === "near" ? null : "near"))}>{see === "near" ? "Less" : "See all →"}</button> : null}
        </div>
        <div className="fm-hscroll">
          {nearShown.map((r) => (
            <article key={r.id} className="fm-comm">
              <button type="button" className="fm-comm-shot" onClick={() => openRoom(r.id)}>
                <img src={COVER[r.id] || COVER.north} alt="" />
                <em>Near You</em>
              </button>
              <div className="fm-comm-body">
                <b>{r.name}</b>
                <span>{BLURB[r.id] || r.region}</span>
                <div className="fm-row">
                  <small><MapPin className="size-3" /> {r.name}</small>
                  <button type="button" className="fm-cta tiny" onClick={() => openRoom(r.id)}>Join</button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="fm-sec">
        <div className="fm-sec-h"><h2>Your Communities</h2></div>
        <div className="fm-yours-row">
          {mine.map((m) => (
            <button key={m.id} type="button" className="fm-your" onClick={() => onHome("lounge")}>
              <span className="fm-your-ico"><Users className="size-4" /></span>
              <b>{m.name}</b>
              <small>{m.city} · saved</small>
            </button>
          ))}
          {yours.map((r) => {
            const tone = TONE[r.id] || { bg: "#163024", fg: "#7dffa8", Icon: Users };
            return (
              <button key={r.id} type="button" className="fm-your" onClick={() => openRoom(r.id)}>
                <span className="fm-your-ico" style={{ background: tone.bg, color: tone.fg }}><tone.Icon className="size-4" /></span>
                <b>{r.name}</b>
                <small>Joined · tap to chat</small>
              </button>
            );
          })}
          {!mine.length && !yours.length ? <p className="fm-sub">Join a room or create a hub. It stays in this row.</p> : null}
        </div>
      </section>
    </div>
  );
}
