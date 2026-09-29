import { useEffect, useState, type ReactNode } from "react";

type Take = { id: string; handle?: string; body?: string; comments?: number; likes?: number };
type Fellow = { handle: string; line?: string; role?: string };

const MOODS = ["Calm", "Outside", "Working", "Loud"];

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* private mode */
  }
}

function tonight() {
  const now = new Date();
  const hit = new Date(now);
  hit.setHours(21, 0, 0, 0);
  if (hit.getTime() <= now.getTime()) hit.setDate(hit.getDate() + 1);
  const hrs = Math.max(1, Math.round((hit.getTime() - now.getTime()) / 3600000));
  return `${hrs}h to 9pm`;
}

export function SocialDesk({ takes, fellows, me }: { takes: Take[]; fellows: Fellow[]; me: string }) {
  const day = new Date().toISOString().slice(0, 10);
  const [streak, setStreak] = useState(0);
  const [mood, setMood] = useState("");
  const [shout, setShout] = useState("");
  const [shouts, setShouts] = useState<string[]>([]);
  const [circle, setCircle] = useState<string[]>([]);
  const [handle, setHandle] = useState("");
  const [line, setLine] = useState("");
  const [lines, setLines] = useState<string[]>([]);
  const [answer, setAnswer] = useState("");
  const [saved, setSaved] = useState("");
  const [pins, setPins] = useState<string[]>([]);
  const [open, setOpen] = useState("streak");

  useEffect(() => {
    const s = read<{ day: string; n: number }>("kilode-streak", { day: "", n: 0 });
    setStreak(s.n);
    setMood(read<string>("kilode-mood-" + day, ""));
    setShouts(read<string[]>("kilode-shouts", []));
    setCircle(read<string[]>("kilode-circle", []));
    setLines(read<string[]>("kilode-lines", []));
    setSaved(read<string>("kilode-challenge-" + day, ""));
    setPins(read<string[]>("kilode-pins", []));
  }, [day]);

  function checkIn() {
    const s = read<{ day: string; n: number }>("kilode-streak", { day: "", n: 0 });
    if (s.day === day) return;
    const next = { day, n: s.n + 1 };
    write("kilode-streak", next);
    setStreak(next.n);
  }

  const top = [...takes].sort((a, b) => (b.comments || 0) + (b.likes || 0) - ((a.comments || 0) + (a.likes || 0))).slice(0, 3);
  const near = fellows.filter((f) => f.line || f.role).slice(0, 4);

  const cards: { id: string; title: string; body: ReactNode }[] = [
    {
      id: "streak",
      title: "Daily in",
      body: (
        <>
          <b>{streak} day{streak === 1 ? "" : "s"}</b>
          <button type="button" onClick={checkIn}>I'm in</button>
        </>
      ),
    },
    {
      id: "mood",
      title: "Mood",
      body: (
        <div className="desk-pills">
          {MOODS.map((m) => (
            <button key={m} type="button" className={mood === m ? "on" : ""} onClick={() => { setMood(m); write("kilode-mood-" + day, m); }}>{m}</button>
          ))}
        </div>
      ),
    },
    {
      id: "shout",
      title: "Shoutout",
      body: (
        <>
          <form onSubmit={(e) => { e.preventDefault(); const t = shout.trim().slice(0, 80); if (!t) return; const next = [`${me || "You"}: ${t}`, ...shouts].slice(0, 6); setShouts(next); write("kilode-shouts", next); setShout(""); }}>
            <input value={shout} onChange={(e) => setShout(e.target.value)} placeholder="One line" maxLength={80} />
          </form>
          {shouts.slice(0, 2).map((s) => <em key={s}>{s}</em>)}
        </>
      ),
    },
    {
      id: "circle",
      title: "Close circle",
      body: (
        <>
          <form onSubmit={(e) => { e.preventDefault(); const h = handle.replace(/^@/, "").trim().slice(0, 24); if (!h || circle.includes(h) || circle.length >= 5) return; const next = [...circle, h]; setCircle(next); write("kilode-circle", next); setHandle(""); }}>
            <input value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="@handle" />
          </form>
          <div className="desk-pills">{circle.map((h) => <span key={h}>@{h}</span>)}</div>
        </>
      ),
    },
    {
      id: "tonight",
      title: "Tonight",
      body: <b>{tonight()} · Lounge</b>,
    },
    {
      id: "line",
      title: "Line drop",
      body: (
        <>
          <form onSubmit={(e) => { e.preventDefault(); const t = line.trim().slice(0, 100); if (!t) return; const next = [t, ...lines].slice(0, 5); setLines(next); write("kilode-lines", next); setLine(""); }}>
            <input value={line} onChange={(e) => setLine(e.target.value)} placeholder="Say it short" />
          </form>
          <i className="wave" />
          {lines[0] ? <em>{lines[0]}</em> : null}
        </>
      ),
    },
    {
      id: "challenge",
      title: "Today's ask",
      body: (
        <>
          <em>What should Lagos hear this week?</em>
          <form onSubmit={(e) => { e.preventDefault(); const t = answer.trim().slice(0, 120); if (!t) return; write("kilode-challenge-" + day, t); setSaved(t); }}>
            <input value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder={saved || "Your answer"} />
          </form>
        </>
      ),
    },
    {
      id: "near",
      title: "Around you",
      body: near.length ? near.map((f) => <em key={f.handle}>@{f.handle} · {f.line || f.role}</em>) : <em>Fellows show here once they have a line.</em>,
    },
    {
      id: "race",
      title: "Reply race",
      body: top.length ? top.map((t) => <em key={t.id}>@{t.handle || "member"} · {(t.comments || 0)} replies</em>) : <em>Post a take and it lands here.</em>,
    },
    {
      id: "pins",
      title: "Pin board",
      body: (
        <>
          <button type="button" onClick={() => { const t = takes[0]?.body?.slice(0, 80); if (!t) return; const next = [t, ...pins].slice(0, 5); setPins(next); write("kilode-pins", next); }}>Pin latest</button>
          {pins.slice(0, 2).map((p) => <em key={p}>{p}</em>)}
        </>
      ),
    },
  ];

  return (
    <section className="social-desk">
      <header>Come back for this</header>
      <div className="desk-grid">
        {cards.map((c) => (
          <button key={c.id} type="button" className={open === c.id ? "on" : ""} onClick={() => setOpen(c.id)}>
            {c.title}
          </button>
        ))}
      </div>
      <div className="desk-body">{cards.find((c) => c.id === open)?.body}</div>
    </section>
  );
}
