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
import { listMsgs, saveMsg, getProfile } from "@/lib/forum-server";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { timeLabel, type AccountKind, type ChatMsg } from "@/lib/qonvo-data";
import { canKind } from "@/lib/permissions";
import { HandleLink } from "@/components/handle-link";
import { TranslateBtn } from "@/components/translate-btn";
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
              <li>On a computer the chat sits beside the player so you can talk while it plays.</li>
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
            <iframe
              title={watching.title}
              src={`https://www.youtube.com/embed/${watching.youtube_id}?rel=0`}
              className="aspect-video w-full border-0 bg-black md:max-h-[52vh]"
              allow="encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
            />
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
            <div className="mt-2 overflow-hidden rounded-xl border border-line bg-panel md:mt-0 md:max-h-[70vh] md:overflow-y-auto">
              <CinemaChat movieId={watching.id} signed={signed} />
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

function CinemaChat({ movieId, signed }: { movieId: string; signed: boolean }) {
  const roomId = `cinema:${movieId}`;
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [draft, setDraft] = useState("");
  const [err, setErr] = useState("");
  const pendingRef = useRef<{ ts: number; t: string; n: string } | null>(null);

  useEffect(() => {
    let on = true;
    setMsgs([]);
    setErr("");
    pendingRef.current = null;
    const pull = () => {
      if (typeof document !== "undefined" && document.hidden) return;
      void listMsgs({ data: { roomId } })
        .then((r) => {
          if (!on) return;
          const pack = Array.isArray(r) ? { msgs: r } : r;
          const server = pack.msgs ?? [];
          const pending = pendingRef.current;
          if (pending && !server.some((m) => m.ts === pending.ts || (m.t === pending.t && m.n === pending.n))) {
            setMsgs([...server, { n: pending.n, t: pending.t, ts: pending.ts, rx: {} }]);
          } else {
            if (pending && server.some((m) => m.ts === pending.ts || (m.t === pending.t && m.n === pending.n))) {
              pendingRef.current = null;
            }
            setMsgs(server);
          }
        })
        .catch(() => {
          if (on && !pendingRef.current) setMsgs([]);
        });
    };
    pull();
    const t = setInterval(pull, 8000);
    return () => {
      on = false;
      clearInterval(t);
    };
  }, [roomId]);

  return (
    <div className="border-t border-white/5 bg-bg">
      <div className="max-h-56 overflow-y-auto px-2 py-1.5">
        {msgs.length === 0 ? (
          <p className="text-[10px] text-muted">
            No chat for this film yet. Each title has its own thread.
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
            <TranslateBtn text={m.t} />
          </div>
        ))}
      </div>
      <form
        className="flex items-center gap-1 border-t border-white/5 px-2 py-1.5"
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
          setMsgs((prev) => [...prev, optimistic]);
          setDraft("");
          void saveMsg({ data: { roomId, text } })
            .then((r) => {
              if (r && "ok" in r && r.ok === false) {
                setErr(r.reason);
                setMsgs((prev) => prev.filter((m) => m.ts !== optimisticTs));
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
                setMsgs((prev) => {
                  const without = prev.filter((m) => m.ts !== optimisticTs);
                  if (without.some((m) => m.ts === confirmed.ts)) return without;
                  return [...without, confirmed];
                });
              }
              void listMsgs({ data: { roomId } }).then((pack) => {
                const p = Array.isArray(pack) ? { msgs: pack } : pack;
                const server = p.msgs ?? [];
                const pending = pendingRef.current;
                if (pending && !server.some((m) => m.ts === pending.ts || (m.t === pending.t && m.n === pending.n))) {
                  setMsgs([...server, { n: pending.n, t: pending.t, ts: pending.ts, rx: {} }]);
                } else {
                  if (pending) pendingRef.current = null;
                  setMsgs(server);
                }
              });
            })
            .catch((e: unknown) => {
              setMsgs((prev) => prev.filter((m) => m.ts !== optimisticTs));
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
          placeholder={signed ? "Talk this scene…" : "Sign in to chat"}
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
