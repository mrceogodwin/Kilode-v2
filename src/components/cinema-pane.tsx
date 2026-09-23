import { useEffect, useRef, useState } from "react";
import {
  CINEMA_SECTIONS,
  CINEMA_SEED,
  fetchCinemaCatalog,
  getCinemaExtra,
  listCinema,
  listCinemaQueue,
  rateMovie,
  saveCinemaQuiz,
  setMovieStatus,
  submitMovie,
  voteMovie,
  type CinemaMovie,
  type CinemaQuiz,
  type CinemaSection,
} from "@/lib/cinema-server";
import { Film, HelpCircle, Send, Star, X } from "lucide-react";
import { listMsgs, saveMsg, getProfile, pingPresence } from "@/lib/forum-server";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { timeLabel, type AccountKind, type ChatMsg } from "@/lib/qonvo-data";
import { canKind } from "@/lib/permissions";
import { HandleLink } from "@/components/handle-link";
import { ThreadTranslateBar, TranslatedLine } from "@/components/translate-btn";
import { AdSlot } from "@/components/ad-slot";

function thumb(id: string) {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

export function CinemaPane() {
  const session = useCurrentUserState();
  const [sec, setSec] = useState<CinemaSection>("watching");
  const [watching, setWatching] = useState<CinemaMovie | null>(CINEMA_SEED[0]);
  const [movies, setMovies] = useState<CinemaMovie[]>(CINEMA_SEED);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [submitSec, setSubmitSec] = useState<"nigerian" | "global" | "coming">("nigerian");
  const [shown, setShown] = useState(8);
  const [kind, setKind] = useState<AccountKind>("member");

  function load(section: CinemaSection = sec) {
    void listCinema({ data: { section } })
      .then((r) => {
        setWatching(r.watching ?? CINEMA_SEED[0]);
        setMovies(r.movies.length ? r.movies : CINEMA_SEED);
      })
      .catch(() => {
        setWatching(CINEMA_SEED[0]);
        setMovies(CINEMA_SEED);
      });
  }

  useEffect(() => {
    load(sec);
    setShown(8);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sec]);

  useEffect(() => {
    if (!session.user) return;
    void getProfile()
      .then((p) => setKind(p.kind))
      .catch(() => undefined);
  }, [session.user]);

  const [how, setHow] = useState(false);
  const [topic, setTopic] = useState("All");
  const signed = !!session.user;
  const also = movies.filter((m) => m.id !== watching?.id && (topic === "All" || m.section === topic)).slice(0, shown);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-white/5 px-2 py-1">
        <button type="button" className="btn-3d mr-1 inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold" onClick={() => setHow(true)}>
          <HelpCircle className="size-3" />
          How
        </button>
        {CINEMA_SECTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSec(s)}
            className={`shrink-0 rounded-full px-2 py-1 text-[10px] capitalize ${sec === s ? "btn-3d font-semibold" : "text-muted"}`}
          >
            {s === "watching" ? "Watching now" : s}
          </button>
        ))}
      </div>

      {how ? (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/55 p-3 sm:items-center" onClick={() => setHow(false)}>
          <div className="w-full max-w-md rounded-2xl border border-line bg-panel p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div className="text-[10px] font-medium tracking-[0.16em] text-lime-2">CINEMA</div>
              <button type="button" onClick={() => setHow(false)} aria-label="Close"><X className="size-4" /></button>
            </div>
            <h3 className="mt-1 text-base font-extrabold">Watch together. Kilode never hosts the file.</h3>
            <ul className="mt-3 space-y-2 text-[12px] leading-snug text-muted">
              <li>YouTube embed only. Trailer or official clip.</li>
              <li>Join to vote once a day, rate 1–5 stars, and take the A–E quiz Super sets.</li>
              <li>Cinema Advertisers submit URLs. Staff approve. Votes can send it to Watching Now.</li>
              <li>Live talk beside the player is a watch-party chat — join this hour's discussion while it plays.</li>
            </ul>
          </div>
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2 dock-pad">
        <AdSlot id="cinema_banner" className="mb-2" quiet />
        {watching ? (
          <div className="mb-3 md:grid md:grid-cols-[minmax(0,1.35fr)_minmax(280px,1fr)] md:items-start md:gap-3">
            <div className="overflow-hidden rounded-xl border border-line bg-black">
            <div className="flex items-center justify-between px-2 py-1.5">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-lime-2">
                <Film className="size-3.5" />
                Watching now
              </div>
              <span className="text-[10px] text-muted">{watching.votes} votes · {watching.section}</span>
            </div>
            <CinemaPlayer title={watching.title} youtubeId={watching.youtube_id} />
            <div className="flex items-center justify-between gap-2 border-t border-white/5 bg-panel px-2 py-1.5">
              <div>
                <div className="text-sm font-semibold">{watching.title}</div>
                <p className="text-[10px] text-muted">Played from YouTube. Not stored on Kilode.</p>
              </div>
              <button
                type="button"
                className="btn-3d shrink-0 rounded-lg px-2 py-1 text-[10px] font-semibold"
                onClick={() => {
                  if (!signed) {
                    window.location.href = "/login?mode=up";
                    return;
                  }
                  void voteMovie({ data: { id: watching.id } }).then((r) => {
                    if (!r.ok) setErr(r.reason);
                    else load(sec);
                  });
                }}
              >
                Vote · {watching.votes}
              </button>
            </div>
            <CinemaRate movieId={watching.id} signed={signed} />
            </div>
            <div className="cinema-live-card mt-2 flex shrink-0 flex-col overflow-hidden rounded-xl border border-lime-2/40 bg-panel shadow-[0_0_28px_rgba(107,158,120,0.14)] md:mt-0 md:max-h-[70vh]">
              <CinemaChat movieId={watching.id} title={watching.title} signed={signed} />
              <CinemaQuizBox movieId={watching.id} signed={signed} />
            </div>
          </div>
        ) : null}

        {canKind(kind, "cinema.submit") ? (
        <div className="mb-3 rounded-xl border border-line bg-panel p-2">
          <div className="text-[11px] font-medium text-muted">Cinema Advertiser — submit a YouTube URL</div>
          <p className="mb-2 text-[10px] text-muted">Staff approve. Votes send it to Watching Now. No video files on Kilode.</p>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Movie title" className="mb-1 w-full rounded-lg border border-line bg-bg px-2 py-1.5 text-base" />
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://youtube.com/watch?v=…" className="mb-1 w-full rounded-lg border border-line bg-bg px-2 py-1.5 text-base" />
          <div className="mb-1 flex gap-1">
            {(["nigerian", "global", "coming"] as const).map((s) => (
              <button key={s} type="button" onClick={() => setSubmitSec(s)} className={`rounded-full px-2 py-0.5 text-[10px] capitalize ${submitSec === s ? "btn-3d" : "border border-line text-muted"}`}>
                {s}
              </button>
            ))}
          </div>
          {err ? <p className="text-[11px] text-danger">{err}</p> : null}
          {msg ? <p className="text-[11px] text-lime-2">{msg}</p> : null}
          <button
            type="button"
            className="btn-join mt-1 rounded-lg px-3 py-1.5 text-[11px] font-bold"
            onClick={() => {
              if (!signed) {
                window.location.href = "/login";
                return;
              }
              setErr("");
              setMsg("");
              void submitMovie({ data: { title, url, section: submitSec } }).then((r) => {
                if (!r.ok) setErr(r.reason);
                else {
                  setMsg("Submitted. Staff will approve before it enters the vote pool.");
                  setTitle("");
                  setUrl("");
                }
              });
            }}
          >
            Submit for approval
          </button>
        </div>
        ) : (
          <p className="mb-3 rounded-xl border border-line px-3 py-2 text-[11px] text-muted">
            Watch free. Vote after you join. To submit a title, register as <strong>Advertiser (Cinema)</strong>.
          </p>
        )}
        {err && !canKind(kind, "cinema.submit") ? <p className="mb-2 text-[11px] text-danger">{err}</p> : null}

        <div className="mb-1 flex items-center gap-1 overflow-x-auto">
          {["All", "nigerian", "global", "coming"].map((t) => (
            <button key={t} type="button" onClick={() => setTopic(t)} className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] capitalize ${topic === t ? "btn-3d" : "border border-line text-muted"}`}>
              {t === "All" ? "Topics" : t}
            </button>
          ))}
        </div>
        <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted">{sec === "watching" ? "Also in Cinema" : sec}</div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {also.map((m) => (
            <article key={m.id} className="raised overflow-hidden rounded-lg">
              <button type="button" className="block w-full text-left" onClick={() => { setWatching(m); setErr(""); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
                <img src={thumb(m.youtube_id)} alt="" className="aspect-video w-full object-cover" />
                <div className="p-1.5">
                  <div className="line-clamp-2 text-[11px] font-semibold leading-tight">{m.title}</div>
                  <div className="mt-0.5 text-[9px] capitalize text-muted">{m.section} · {m.votes} votes · tap to watch</div>
                </div>
              </button>
              <div className="px-1.5 pb-1.5">
                <button
                  type="button"
                  className="w-full rounded border border-line py-0.5 text-[10px] font-semibold"
                  onClick={() => {
                    if (!signed) {
                      window.location.href = "/login";
                      return;
                    }
                    void voteMovie({ data: { id: m.id } }).then((r) => {
                      if (!r.ok) setErr(r.reason);
                      else {
                        setErr("");
                        load(sec);
                      }
                    });
                  }}
                >
                  Vote
                </button>
              </div>
            </article>
          ))}
        </div>
        {shown < movies.filter((m) => m.id !== watching?.id).length ? (
          <button type="button" className="btn-3d mx-auto mt-3 block rounded-md px-4 py-1.5 text-[11px] font-semibold" onClick={() => setShown((n) => n + 8)}>
            Load more
          </button>
        ) : null}
      </div>
    </div>
  );
}

function CinemaPlayer({ title, youtubeId }: { title: string; youtubeId: string }) {
  const [failed, setFailed] = useState(false);
  const id = (youtubeId || "").trim();
  const showEmbed = Boolean(id) && !failed;

  return (
    <div className="relative w-full min-h-[11.5rem] aspect-video shrink-0 bg-black sm:min-h-[14rem]">
      {showEmbed ? (
        <iframe
          title={title}
          src={`https://www.youtube.com/embed/${id}?rel=0`}
          className="absolute inset-0 h-full w-full border-0 bg-black"
          allow="encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-b from-[#0c1210] via-black to-[#061008] px-4 text-center">
          {id ? (
            <img
              src={thumb(id)}
              alt=""
              className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-35"
              onError={() => setFailed(true)}
            />
          ) : null}
          <div className="relative z-[1] flex flex-col items-center gap-1.5">
            <span className="inline-flex size-10 items-center justify-center rounded-xl border border-lime-2/40 bg-black/55 text-lime-2 shadow-[0_0_20px_rgba(107,158,120,0.25)]">
              <Film className="size-5" />
            </span>
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-lime-2">Kilode Cinema</div>
            <div className="max-w-[18rem] text-sm font-extrabold leading-snug text-fg">{title || "Watching now"}</div>
            <p className="max-w-[16rem] text-[10px] leading-snug text-muted">
              {id ? "Trailer preview unavailable. Vote, rate, and join Live talk below." : "No YouTube clip yet. Staff will pin a trailer soon."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function CinemaRate({ movieId, signed }: { movieId: string; signed: boolean }) {
  const [avg, setAvg] = useState(0);
  const [n, setN] = useState(0);
  const [mine, setMine] = useState(0);
  useEffect(() => {
    void getCinemaExtra({ data: { movieId } })
      .then((r) => {
        setAvg(r.avg);
        setN(r.n);
        setMine(r.mine);
      })
      .catch(() => undefined);
  }, [movieId]);
  return (
    <div className="flex items-center gap-1 border-t border-white/5 bg-panel px-2 py-1.5">
      <span className="mr-1 text-[10px] text-muted">Stars</span>
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          aria-label={`${s} star`}
          className="p-0.5"
          onClick={() => {
            if (!signed) {
              window.location.href = "/login";
              return;
            }
            void rateMovie({ data: { id: movieId, stars: s } }).then((r) => {
              if (r.ok) {
                setAvg(r.avg);
                setN(r.n);
                setMine(s);
              }
            });
          }}
        >
          <Star className={`size-3.5 ${s <= (mine || Math.round(avg)) ? "fill-lime-2 text-lime-2" : "text-muted"}`} />
        </button>
      ))}
      <span className="ml-1 text-[10px] text-muted">{avg ? avg.toFixed(1) : "—"} · {n}</span>
    </div>
  );
}

function CinemaQuizBox({ movieId, signed }: { movieId: string; signed: boolean }) {
  const [quiz, setQuiz] = useState<CinemaQuiz[]>([]);
  const [pick, setPick] = useState<Record<string, string>>({});
  const [i, setI] = useState(0);
  useEffect(() => {
    void getCinemaExtra({ data: { movieId } })
      .then((r) => {
        setQuiz(r.quiz);
        setI(0);
        setPick({});
      })
      .catch(() => setQuiz([]));
  }, [movieId]);
  const q = quiz[i];
  if (!q) return null;
  const letters = ["A", "B", "C", "D", "E"] as const;
  const opts = [q.a, q.b, q.c, q.d, q.e];
  const chosen = pick[q.id];
  return (
    <div className="border-t border-line p-2">
      <div className="text-[10px] font-medium tracking-[0.14em] text-lime-2">QUIZ · {q.topic}</div>
      <p className="mt-1 text-[12px] font-semibold leading-snug">{q.q}</p>
      <div className="mt-2 space-y-1">
        {opts.map((t, n) =>
          t ? (
            <button
              key={letters[n]}
              type="button"
              className={`flex w-full items-center gap-2 rounded-lg border px-2 py-1.5 text-left text-[11px] ${chosen === letters[n] ? (letters[n] === q.answer ? "border-lime-2 bg-lime-2/15" : "border-danger bg-danger/10") : "border-line"}`}
              onClick={() => {
                if (!signed) {
                  window.location.href = "/login";
                  return;
                }
                setPick((p) => ({ ...p, [q.id]: letters[n] }));
              }}
            >
              <span className="font-bold text-lime-2">{letters[n]}</span>
              {t}
            </button>
          ) : null,
        )}
      </div>
      {quiz.length > 1 ? (
        <button type="button" className="mt-2 text-[10px] text-lime-2" onClick={() => setI((n) => (n + 1) % quiz.length)}>
          Next question
        </button>
      ) : null}
    </div>
  );
}

function CinemaChat({ movieId, title, signed }: { movieId: string; title?: string; signed: boolean }) {
  const roomId = `cinema:${movieId}`;
  const [mode, setMode] = useState<"live" | "full">("live");
  const [allMsgs, setAllMsgs] = useState<ChatMsg[]>([]);
  const [draft, setDraft] = useState("");
  const [err, setErr] = useState("");
  const [xlate, setXlate] = useState<Record<string, string>>({});
  const [online, setOnline] = useState<{ handle: string; typing: boolean }[]>([]);
  const [chatHours, setChatHours] = useState(24);
  const pendingRef = useRef<{ ts: number; t: string; n: string } | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const stickBottom = useRef(true);
  const lastLen = useRef(0);
  const lastPing = useRef(0);

  const LIVE_MS = 60 * 60_000;
  const liveMs = chatHours > 0 ? Math.min(LIVE_MS, chatHours * 3600_000) : LIVE_MS;
  const liveWindowNote =
    liveMs >= 55 * 60_000 ? "last 60 min" : liveMs >= 3600_000 ? `last ${Math.round(liveMs / 3600_000)} h` : `last ${Math.max(1, Math.round(liveMs / 60_000))} min`;

  function applyPack(pack: unknown) {
    const p = Array.isArray(pack) ? { msgs: pack as ChatMsg[] } : (pack as { msgs?: ChatMsg[]; hours?: number; online?: { handle: string; typing: boolean }[] });
    const server = p.msgs ?? [];
    if (typeof p.hours === "number") setChatHours(p.hours);
    if (Array.isArray(p.online)) setOnline(p.online);
    const pending = pendingRef.current;
    if (pending && !server.some((m) => m.ts === pending.ts || (m.t === pending.t && m.n === pending.n))) {
      setAllMsgs([...server, { n: pending.n, t: pending.t, ts: pending.ts, rx: {} }]);
    } else {
      if (pending && server.some((m) => m.ts === pending.ts || (m.t === pending.t && m.n === pending.n))) {
        pendingRef.current = null;
      }
      setAllMsgs(server);
    }
  }

  useEffect(() => {
    let on = true;
    setAllMsgs([]);
    setErr("");
    setXlate({});
    setOnline([]);
    pendingRef.current = null;
    stickBottom.current = true;
    lastLen.current = 0;
    setMode("live");
    const pull = () => {
      if (typeof document !== "undefined" && document.hidden) return;
      void listMsgs({ data: { roomId } })
        .then((r) => {
          if (!on) return;
          applyPack(r);
        })
        .catch(() => {
          if (on && !pendingRef.current) setAllMsgs([]);
        });
    };
    pull();
    const t = setInterval(pull, 8000);
    return () => {
      on = false;
      clearInterval(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  useEffect(() => {
    if (!signed) return;
    let on = true;
    const bump = () => {
      const now = Date.now();
      if (now - lastPing.current < 12_000) return;
      lastPing.current = now;
      void pingPresence({ data: { roomId, typing: false } })
        .then((p) => {
          if (!on) return;
          if (p.online) setOnline(p.online);
        })
        .catch(() => undefined);
    };
    bump();
    const t = setInterval(bump, 20_000);
    return () => {
      on = false;
      clearInterval(t);
    };
  }, [roomId, signed]);

  const cutoff = Date.now() - liveMs;
  const msgs = mode === "live" ? allMsgs.filter((m) => m.ts >= cutoff) : allMsgs;
  const shortTitle = (title || "this film").trim().slice(0, 28);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const added = msgs.length - lastLen.current;
    lastLen.current = msgs.length;
    if (added <= 0 && msgs.length === 0) return;
    if (stickBottom.current) {
      requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight;
      });
    }
  }, [msgs, mode]);

  return (
    <div className="flex shrink-0 flex-col border-t border-lime-2/15 bg-gradient-to-b from-lime-2/[0.06] to-bg">
      <div className="flex shrink-0 items-center justify-between gap-1.5 border-b border-lime-2/20 px-2 py-1">
        <div
          className="flex min-w-0 flex-1 items-center gap-1.5"
          title={
            mode === "live"
              ? `Watch-party · talk while it plays · ${liveWindowNote}${online.length > 0 ? ` · ${online.length} in this room` : ""}`
              : `Watch-party · full film thread${online.length > 0 ? ` · ${online.length} in this room` : ""}`
          }
        >
          <span className="inline-flex size-4 shrink-0 items-center justify-center rounded border border-lime-2/35 bg-black/40 text-lime-2" aria-hidden>
            <svg viewBox="0 0 64 64" className="size-3">
              <rect x="26" y="7" width="11" height="34" rx="4.5" transform="rotate(-12 32 24)" fill="currentColor" />
              <circle cx="36.5" cy="50" r="6.5" fill="currentColor" />
            </svg>
          </span>
          <span className="min-w-0 truncate text-[11px] font-extrabold leading-none text-fg">
            Live talk <span className="font-semibold text-muted">· {shortTitle}</span>
          </span>
          {mode === "live" ? (
            <span className="inline-flex h-4 shrink-0 items-center gap-0.5 rounded-full border border-lime-2/50 bg-lime-2/15 px-1 text-[8px] font-bold uppercase leading-none tracking-wide text-lime-2">
              <span className="desk-live size-1 rounded-full bg-lime-2" aria-hidden />
              Live
            </span>
          ) : (
            <span className="inline-flex h-4 shrink-0 items-center rounded-full border border-line px-1 text-[8px] font-semibold leading-none text-muted">Full</span>
          )}
          {online.length > 0 ? (
            <span className="hidden shrink-0 text-[8px] font-semibold leading-none text-lime-2 sm:inline">{online.length}</span>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <div className="flex h-6 items-center rounded-full border border-line p-0.5" role="group" aria-label="Talk mode">
            <button
              type="button"
              onClick={() => {
                setMode("live");
                stickBottom.current = true;
              }}
              className={`rounded-full px-1.5 py-0 text-[9px] font-semibold leading-none ${mode === "live" ? "btn-3d text-lime-2" : "text-muted"}`}
            >
              Live
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("full");
                stickBottom.current = true;
              }}
              className={`rounded-full px-1.5 py-0 text-[9px] font-semibold leading-none ${mode === "full" ? "btn-3d" : "text-muted"}`}
            >
              Full
            </button>
          </div>
          <ThreadTranslateBar items={msgs.map((m) => ({ key: String(m.ts), text: m.t }))} onTranslated={setXlate} />
        </div>
      </div>
      <div
        ref={scroller}
        className="h-48 max-h-[40vh] overflow-y-auto overscroll-contain px-2 py-2 sm:h-56 sm:max-h-[44vh] md:h-64 md:max-h-[50vh]"
        onScroll={() => {
          const el = scroller.current;
          if (!el) return;
          stickBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
        }}
      >
        {msgs.length === 0 ? (
          <p className="text-[10px] text-muted">
            {mode === "live"
              ? "No one in this hour yet — be first. Others watching now will see you."
              : "No chat for this film yet. Each title has its own thread."}
            {!signed ? (
              <>
                {" "}
                <a href="/login" className="font-semibold text-lime-2 underline">
                  Sign in to send
                </a>
              </>
            ) : null}
          </p>
        ) : null}
        {msgs.map((m) => (
          <div key={m.ts + m.n} className="py-0.5">
            <div className="flex items-baseline gap-1.5">
              <HandleLink handle={m.n} className="text-[11px] font-semibold" />
              <span className="text-[9px] text-muted">{timeLabel(m.ts)}</span>
            </div>
            <p className="text-[12px] leading-snug">{m.t}</p>
            <TranslatedLine text={xlate[String(m.ts)]} />
          </div>
        ))}
      </div>
      <form
        className="flex shrink-0 items-center gap-1 border-t border-white/5 px-2 py-1.5"
        onSubmit={(e) => {
          e.preventDefault();
          if (!signed) {
            window.location.href = "/login";
            return;
          }
          const text = draft.trim();
          if (!text) return;
          setErr("");
          const optimisticTs = Date.now();
          const optimistic = { n: "You", t: text, ts: optimisticTs, rx: {} as Record<string, number> };
          pendingRef.current = { ts: optimisticTs, t: text, n: "You" };
          stickBottom.current = true;
          setAllMsgs((prev) => [...prev, optimistic]);
          setDraft("");
          void saveMsg({ data: { roomId, text } })
            .then((r) => {
              if (r && "ok" in r && r.ok === false) {
                setErr(r.reason);
                setAllMsgs((prev) => prev.filter((m) => m.ts !== optimisticTs));
                pendingRef.current = null;
                setDraft(text);
                return;
              }
              if (r && "n" in r && "ts" in r) {
                const confirmed = {
                  n: String(r.n),
                  t: "t" in r && r.t ? String(r.t) : text,
                  ts: Number(r.ts),
                  rx: {} as Record<string, number>,
                };
                pendingRef.current = { ts: confirmed.ts, t: confirmed.t, n: confirmed.n };
                setAllMsgs((prev) => {
                  const without = prev.filter((m) => m.ts !== optimisticTs);
                  if (without.some((m) => m.ts === confirmed.ts)) return without;
                  return [...without, confirmed];
                });
              }
              void listMsgs({ data: { roomId } }).then((pack) => applyPack(pack));
              if (signed) {
                lastPing.current = 0;
                void pingPresence({ data: { roomId, typing: false } })
                  .then((p) => {
                    if (p.online) setOnline(p.online);
                  })
                  .catch(() => undefined);
              }
            })
            .catch((e: unknown) => {
              setAllMsgs((prev) => prev.filter((m) => m.ts !== optimisticTs));
              pendingRef.current = null;
              setDraft(text);
              const msg =
                e instanceof Error && (e.message === "Unauthorized" || e.name === "UnauthorizedError")
                  ? "Sign in to chat."
                  : "Could not save. Check you are signed in.";
              setErr(msg);
            });
        }}
      >
        <input
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            if (err) setErr("");
          }}
          readOnly={!signed}
          placeholder={signed ? "Say something about this scene…" : "Sign in to join live talk"}
          className="min-w-0 flex-1 rounded-lg border border-line bg-panel px-2 py-1.5 text-base"
        />
        {signed ? (
          <button type="submit" className="btn-join grid size-8 place-items-center rounded-lg" aria-label="Send">
            <Send className="size-3.5" />
          </button>
        ) : (
          <a href="/login" className="btn-join inline-flex h-8 items-center rounded-lg px-2 text-[10px] font-bold">
            Sign in
          </a>
        )}
      </form>
      {err ? (
        <p className="px-2 pb-1 text-[10px] text-danger">
          {err}{" "}
          {/sign in/i.test(err) ? (
            <a href="/login" className="font-semibold underline">
              Sign in
            </a>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}

export function CinemaAdminPanel() {
  const [rows, setRows] = useState<CinemaMovie[]>([]);
  const [msg, setMsg] = useState("");
  const [fetchBusy, setFetchBusy] = useState(false);

  function load() {
    void listCinemaQueue()
      .then(setRows)
      .catch(() => setRows([]));
  }
  useEffect(() => {
    load();
  }, []);

  return (
    <div className="md:col-span-2 raised space-y-2 rounded-xl p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-[11px] font-medium text-muted">Cinema</div>
        <button
          type="button"
          disabled={fetchBusy}
          className="btn-join rounded-lg px-3 py-1.5 text-[11px] font-bold disabled:opacity-60"
          onClick={() => {
            setFetchBusy(true);
            setMsg("");
            void fetchCinemaCatalog()
              .then((r) => {
                setMsg(`Fetch ok · inserted ${r.inserted} · updated ${r.updated} · watching ${r.watching}`);
                load();
              })
              .catch((e) => setMsg(e instanceof Error ? e.message : "Fetch failed"))
              .finally(() => setFetchBusy(false));
          }}
        >
          {fetchBusy ? "Fetching…" : "Fetch"}
        </button>
      </div>
      <p className="text-xs text-muted">Approve advertiser YouTube URLs. Pin Watching Now. Votes are 1 per user per title per UTC day. Super Fetch upserts the curated trailer cache (CINEMA_SEED) — no YouTube search API. Daily cron: /api/cron/cinema (needs CRON_SECRET on Vercel).</p>
      {msg ? <p className="text-[11px] text-lime-2">{msg}</p> : null}
      {rows.length === 0 ? <p className="text-xs text-muted">No movies yet.</p> : null}
      {rows.map((m) => (
        <div key={m.id} className="flex items-center gap-2 rounded-lg border border-line bg-panel p-2">
          <img src={thumb(m.youtube_id)} alt="" className="h-10 w-16 shrink-0 rounded object-cover" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">{m.title}</div>
            <div className="text-[10px] text-muted">
              {m.status}
              {m.watching ? " · NOW" : ""} · {m.section} · {m.votes} votes · {m.submitter}
            </div>
          </div>
          {m.status !== "approved" ? (
            <button type="button" className="text-[10px] text-lime-2" onClick={() => void setMovieStatus({ data: { id: m.id, status: "approved" } }).then(() => { setMsg("Approved"); load(); })}>
              Approve
            </button>
          ) : null}
          <button
            type="button"
            className="text-[10px] text-lime-2"
            onClick={() => void setMovieStatus({ data: { id: m.id, status: "approved", watching: true } }).then(() => { setMsg("Watching now"); load(); })}
          >
            Play now
          </button>
          {m.status !== "rejected" ? (
            <button type="button" className="text-[10px] text-danger" onClick={() => void setMovieStatus({ data: { id: m.id, status: "rejected" } }).then(() => { setMsg("Rejected"); load(); })}>
              Reject
            </button>
          ) : null}
        </div>
      ))}
      <CinemaQuizAdmin movies={rows} onSaved={(t) => setMsg(t)} />
    </div>
  );
}

function CinemaQuizAdmin({ movies, onSaved }: { movies: CinemaMovie[]; onSaved: (t: string) => void }) {
  const [movieId, setMovieId] = useState("");
  const [topic, setTopic] = useState("Story");
  const [q, setQ] = useState("");
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [c, setC] = useState("");
  const [d, setD] = useState("");
  const [e, setE] = useState("");
  const [answer, setAnswer] = useState("A");
  return (
    <div className="mt-3 border-t border-line pt-3">
      <div className="text-[11px] font-medium text-muted">A–E quiz (you type it. AI generate waits for an operator key — we do not invent answers)</div>
      <select value={movieId} onChange={(ev) => setMovieId(ev.target.value)} className="mt-1 w-full rounded-lg border border-line bg-bg px-2 py-1.5 text-base">
        <option value="">Movie</option>
        {movies.map((m) => (
          <option key={m.id} value={m.id}>{m.title}</option>
        ))}
      </select>
      <input value={topic} onChange={(ev) => setTopic(ev.target.value)} placeholder="Topic" className="mt-1 w-full rounded-lg border border-line bg-bg px-2 py-1.5 text-base" />
      <input value={q} onChange={(ev) => setQ(ev.target.value)} placeholder="Question" className="mt-1 w-full rounded-lg border border-line bg-bg px-2 py-1.5 text-base" />
      {(["A", "B", "C", "D", "E"] as const).map((L, i) => (
        <input
          key={L}
          value={[a, b, c, d, e][i]}
          onChange={(ev) => [setA, setB, setC, setD, setE][i](ev.target.value)}
          placeholder={`${L} option`}
          className="mt-1 w-full rounded-lg border border-line bg-bg px-2 py-1.5 text-base"
        />
      ))}
      <div className="mt-1 flex gap-1">
        {(["A", "B", "C", "D", "E"] as const).map((L) => (
          <button key={L} type="button" className={`rounded-md px-2 py-1 text-[11px] ${answer === L ? "btn-3d" : "border border-line text-muted"}`} onClick={() => setAnswer(L)}>
            {L}
          </button>
        ))}
      </div>
      <button
        type="button"
        className="btn-join mt-2 rounded-lg px-3 py-1.5 text-[11px] font-bold"
        onClick={() => {
          if (!movieId || !q || !a || !b) return;
          void saveCinemaQuiz({ data: { id: "", movie_id: movieId, topic, q, a, b, c, d, e, answer } }).then((r) => {
            if (r.ok) {
              onSaved("Quiz saved");
              setQ("");
              setA("");
              setB("");
              setC("");
              setD("");
              setE("");
            }
          });
        }}
      >
        Save quiz
      </button>
    </div>
  );
}
