import { useEffect, useState } from "react";
import { BadgeCheck, Briefcase, Headphones, Heart, Lock, MessageSquare, Repeat2, Share2 } from "lucide-react";
import { avatarUrl, timeAgo } from "@/lib/qonvo-data";
import { connectFellow, likeTake, listTakes, replyTake, reportTake, repostTake, saveTake, searchPeople, voteTake, type FellowRow, type TakeKind, type TakeRow } from "@/lib/takes-server";

const KEY = "kilode-takes-v1";

const STARTER_FELLOWS: FellowRow[] = [
  { id: "f-tunde", handle: "tundeverse", name: "TundeVerse", role: "Tech Enthusiast", line: "Creators → Founders", verified: 1 },
  { id: "f-lily", handle: "lilycoded", name: "LilyCoded", role: "Creator", line: "Creators → Collaborators", verified: 1 },
  { id: "f-job", handle: "jobalertng", name: "JobAlertNG", role: "Recruiter", line: "Job Seekers → Recruiters", verified: 1 },
];

function bootCache(): { takes: TakeRow[]; fellows: FellowRow[] } {
  if (typeof window === "undefined") return { takes: [], fellows: STARTER_FELLOWS };
  try {
    const j = JSON.parse(localStorage.getItem(KEY) || "") as { takes?: TakeRow[]; fellows?: FellowRow[] };
    if (Array.isArray(j.takes)) return { takes: j.takes, fellows: j.fellows?.length ? j.fellows : STARTER_FELLOWS };
  } catch {
    /* first open */
  }
  return { takes: [], fellows: STARTER_FELLOWS };
}

function writeCache(takes: TakeRow[], fellows: FellowRow[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ takes: takes.slice(0, 40), fellows }));
  } catch {
    /* ignore */
  }
}

export function rememberTake(take: TakeRow, notify = true) {
  const cur = bootCache();
  const takes = [take, ...cur.takes.filter((t) => t.id !== take.id)].slice(0, 40);
  writeCache(takes, cur.fellows);
  if (notify) window.dispatchEvent(new CustomEvent("kilode:take", { detail: take }));
}

export async function shareNewsToSocials(p: { title: string; excerpt?: string; author?: string; category?: string }) {
  const r = await saveTake({
    data: {
      body: p.title.slice(0, 280),
      kind: "quote",
      quoteName: (p.author || "Kilode").slice(0, 40),
      quoteHandle: (p.author || "kilode").toLowerCase().replace(/[^a-z0-9._-]+/g, "").slice(0, 24) || "kilode",
      quoteBody: (p.excerpt || p.category || "From Feeds").slice(0, 180),
    },
  });
  if (r.ok) rememberTake(r.take);
  return r;
}

const REPORTS = ["Spam", "Scam or fraud", "Harassment or hate", "Nudity or sexual", "Misinformation", "Other"] as const;

const KINDS: { id: TakeKind; label: string }[] = [
  { id: "news", label: "News" },
  { id: "take", label: "Take" },
  { id: "job", label: "Job" },
  { id: "music", label: "Music" },
  { id: "banter", label: "Debate" },
];

function pct(a: number, b: number) {
  const t = a + b;
  if (!t) return 50;
  return Math.round((a / t) * 100);
}

function needLogin(e: unknown) {
  const m = e instanceof Error ? e.message : String(e || "");
  return /unauthor|sign in|forbidden/i.test(m);
}

export function SocialsFeed({ authed }: { authed: boolean }) {
  const boot = bootCache();
  const [takes, setTakes] = useState<TakeRow[]>(boot.takes);
  const [fellows, setFellows] = useState<FellowRow[]>(boot.fellows);
  const [next, setNext] = useState(0);
  const [err, setErr] = useState("");
  const [body, setBody] = useState("");
  const [line, setLine] = useState("");
  const [kind, setKind] = useState<TakeKind>("take");
  const [busy, setBusy] = useState(false);
  const [linked, setLinked] = useState<Record<string, boolean>>({});
  const [openReply, setOpenReply] = useState("");
  const [reply, setReply] = useState("");
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [applied, setApplied] = useState<Record<string, boolean>>({});
  const [q, setQ] = useState("");
  const [people, setPeople] = useState<{ handle: string; name: string; role: string; line: string; verified: number }[]>([]);
  const [reportId, setReportId] = useState("");
  const [reportNote, setReportNote] = useState("");

  function goLogin() {
    window.location.href = "/login?mode=up";
  }

  useEffect(() => {
    const onTake = (e: Event) => {
      const take = (e as CustomEvent<TakeRow>).detail;
      if (!take?.id) return;
      setTakes((list) => [take, ...list.filter((t) => t.id !== take.id)]);
    };
    window.addEventListener("kilode:take", onTake);
    let dead = false;
    void listTakes()
      .then((r) => {
        if (dead) return;
        setTakes(r.takes);
        setFellows(r.fellows.length ? r.fellows : STARTER_FELLOWS);
        setNext(r.next);
        writeCache(r.takes, r.fellows);
      })
      .catch(() => {
        if (!dead && takes.length === 0) setErr("Socials will retry. You can still write.");
      });
    return () => {
      dead = true;
      window.removeEventListener("kilode:take", onTake);
    };
  }, []);

  useEffect(() => {
    const needle = q.trim();
    if (needle.length < 2) {
      setPeople([]);
      return;
    }
    const t = window.setTimeout(() => {
      void searchPeople({ data: { q: needle } })
        .then(setPeople)
        .catch(() => setPeople([]));
    }, 250);
    return () => window.clearTimeout(t);
  }, [q]);

  async function post() {
    if (!authed) return goLogin();
    setBusy(true);
    setErr("");
    try {
      const r = await saveTake({ data: { body, kind, line } });
      if (!r.ok) setErr(r.reason);
      else {
        setTakes((list) => [r.take, ...list.filter((t) => t.id !== r.take.id)]);
        rememberTake(r.take, false);
        setBody("");
        setLine("");
      }
    } catch (e) {
      if (needLogin(e)) goLogin();
      else setErr("Could not post.");
    } finally {
      setBusy(false);
    }
  }

  function patch(id: string, fn: (t: TakeRow) => TakeRow) {
    setTakes((list) => list.map((t) => (t.id === id ? fn(t) : t)));
  }

  async function vote(id: string, side: "fact" | "cap" | "a" | "b") {
    if (!authed) return goLogin();
    patch(id, (t) => {
      if (side === "fact") return { ...t, fact: t.fact + 1 };
      if (side === "cap") return { ...t, cap: t.cap + 1 };
      if (side === "a") return { ...t, voteA: t.voteA + 1 };
      return { ...t, voteB: t.voteB + 1 };
    });
    try {
      await voteTake({ data: { id, side } });
    } catch (e) {
      if (needLogin(e)) goLogin();
    }
  }

  const needle = q.trim().toLowerCase();
  const shownFellows = needle
    ? fellows.filter((f) => `${f.name} ${f.handle} ${f.role}`.toLowerCase().includes(needle))
    : fellows;
  const shownTakes = needle
    ? takes.filter((t) => `${t.name} ${t.handle} ${t.role} ${t.body}`.toLowerCase().includes(needle))
    : takes;

  return (
    <div className="mb-3">
      <label className="mb-3 block">
        <span className="sr-only">Find a member</span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Find @username"
          className="w-full rounded-[12px] border border-line bg-panel px-3 py-2 outline-none"
          style={{ fontSize: 16 }}
        />
      </label>
      {people.length > 0 ? (
        <div className="mb-3 overflow-hidden rounded-[12px] border border-line">
          {people.map((p) => (
            <a key={p.handle} href={`/u/${encodeURIComponent(p.handle)}`} className="flex items-center gap-2 border-b border-line px-3 py-2 last:border-0">
              <img src={avatarUrl(p.handle)} alt="" className="size-7 rounded-full bg-panel-3" />
              <span className="min-w-0">
                <span className="block truncate text-[12px] font-semibold">@{p.handle}</span>
                <span className="block truncate text-[10px] text-muted">{p.role}{p.line ? ` · ${p.line}` : ""}</span>
              </span>
            </a>
          ))}
        </div>
      ) : null}
      <div className="mb-2 flex items-center justify-between">
        <div className="text-[11px] font-semibold tracking-[0.04em] text-fg">Connect with Fellows</div>
      </div>
      <div className="-mx-1 mb-3 flex gap-2 overflow-x-auto px-1 pb-1">
        {shownFellows.map((f) => (
          <div key={f.id} className="w-[148px] shrink-0 rounded-[12px] border border-line bg-panel px-2.5 py-2">
            <div className="flex items-center gap-1.5">
              <img src={avatarUrl(f.handle)} alt="" className="size-7 rounded-full bg-panel-3 object-cover" />
              <div className="min-w-0">
                <div className="flex items-center gap-0.5 truncate text-[11px] font-semibold">
                  {f.name}
                  {f.verified ? <BadgeCheck className="size-3 shrink-0 text-lime-2" /> : null}
                </div>
                <div className="truncate text-[9px] text-muted">{f.role}</div>
              </div>
            </div>
            <div className="mt-1 line-clamp-2 text-[10px] leading-snug text-muted">{f.line}</div>
            <button
              type="button"
              disabled={linked[f.id]}
              className="mt-1.5 rounded-[10px] border border-lime-2/40 px-2 py-0.5 text-[10px] font-semibold text-lime-2 disabled:opacity-60"
              onClick={() => {
                if (!authed) return goLogin();
                setLinked((m) => ({ ...m, [f.id]: true }));
                void connectFellow({ data: { id: f.id } }).catch((e) => {
                  if (needLogin(e)) goLogin();
                });
              }}
            >
              {linked[f.id] ? "Connected" : "Connect"}
            </button>
          </div>
        ))}
      </div>

      <div className="mb-3 rounded-[12px] border border-line bg-panel px-2.5 py-2">
        <div className="flex items-start gap-2">
          <img src={avatarUrl("me")} alt="" className="mt-0.5 size-7 rounded-full bg-panel-3" />
          <textarea
            value={body}
            maxLength={280}
            rows={2}
            placeholder="What's happening?"
            className="min-h-[80px] flex-1 resize-none bg-transparent text-[13px] leading-snug outline-none"
            style={{ fontSize: 16 }}
            onChange={(e) => setBody(e.target.value)}
          />
        </div>
        {kind === "job" ? (
          <input
            value={line}
            onChange={(e) => setLine(e.target.value)}
            placeholder="Remote · pay · years"
            className="mt-1 w-full bg-transparent text-[12px] outline-none"
            style={{ fontSize: 16 }}
          />
        ) : null}
        <div className="mt-1.5 flex items-center gap-1">
          <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto">
            {KINDS.map((k) => (
              <button
                key={k.id}
                type="button"
                className={`shrink-0 rounded-[10px] px-1.5 py-0.5 text-[10px] font-semibold ${kind === k.id ? "bg-lime-2/15 text-lime-2" : "text-muted"}`}
                onClick={() => setKind(k.id)}
              >
                {k.label}
              </button>
            ))}
          </div>
          <span className="shrink-0 text-[9px] tabular-nums text-muted">{body.length}/280</span>
          <button type="button" disabled={busy || body.trim().length < 2} className="shrink-0 rounded-[10px] bg-lime-2 px-2.5 py-1 text-[11px] font-bold text-[#102016] disabled:opacity-50" onClick={() => void post()}>
            {busy ? "…" : "Post"}
          </button>
        </div>
        {err ? <p className="mt-1 text-[11px] text-danger">{err}</p> : null}
      </div>

      {shownTakes.length === 0 ? <p className="py-3 text-center text-[11px] text-muted">No takes yet. Be first.</p> : null}
      <div className="space-y-2">
        {shownTakes.map((t) => (
          <TakeCard
            key={t.id}
            take={t}
            revealed={!!revealed[t.id]}
            applied={!!applied[t.id]}
            replyOpen={openReply === t.id}
            reply={openReply === t.id ? reply : ""}
            onReveal={() => setRevealed((m) => ({ ...m, [t.id]: true }))}
            onApply={() => setApplied((m) => ({ ...m, [t.id]: true }))}
            onVote={(side) => void vote(t.id, side)}
            onReport={() => {
              setReportNote("");
              setReportId(t.id);
            }}
            onLike={() => {
              if (!authed) return goLogin();
              patch(t.id, (row) => ({ ...row, likes: row.likes + 1 }));
              void likeTake({ data: { id: t.id } }).catch((e) => {
                if (needLogin(e)) goLogin();
              });
            }}
            onRepost={() => {
              if (!authed) return goLogin();
              patch(t.id, (row) => ({ ...row, reposts: row.reposts + 1 }));
              void repostTake({ data: { id: t.id } }).catch(() => undefined);
            }}
            onShare={() => {
              const text = `${t.name}: ${t.body}`;
              if (navigator.share) void navigator.share({ text });
              else void navigator.clipboard?.writeText(text);
            }}
            onReplyOpen={() => {
              setOpenReply(t.id);
              setReply("");
            }}
            onReplyChange={setReply}
            onReplySend={() => {
              if (!authed) return goLogin();
              const text = reply.trim();
              if (!text) return;
              patch(t.id, (row) => ({ ...row, comments: row.comments + 1, lastReply: text }));
              setReply("");
              setOpenReply("");
              void replyTake({ data: { id: t.id, body: text } }).catch((e) => {
                if (needLogin(e)) goLogin();
              });
            }}
          />
        ))}
      </div>
      {next ? (
        <button
          type="button"
          className="mt-3 w-full rounded-[10px] border border-line py-2 text-[11px] font-semibold text-muted"
          onClick={() => {
            void listTakes({ data: { before: next } }).then((r) => {
              setTakes((list) => [...list, ...r.takes]);
              setNext(r.next);
            });
          }}
        >
          Load more
        </button>
      ) : null}
      {reportId ? (
        <div className="fixed inset-0 z-50 flex items-end bg-black/60" onClick={() => setReportId("")}>
          <div className="w-full rounded-t-2xl bg-[#141414] px-4 pt-3 pb-[max(16px,env(safe-area-inset-bottom))]" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20" />
            <div className="text-[18px] font-bold">Report gist</div>
            <p className="mt-1 text-[13px] text-muted">Why are you reporting this?</p>
            <div className="mt-2">
              {REPORTS.map((reason) => (
                <button
                  key={reason}
                  type="button"
                  className="block w-full border-b border-white/10 py-3 text-left text-[16px]"
                  onClick={() => {
                    if (!authed) return goLogin();
                    void reportTake({ data: { id: reportId, reason } })
                      .then((r) => {
                        setReportId("");
                        setReportNote(r.ok ? "Report sent. Staff will see it." : r.reason);
                      })
                      .catch((e) => {
                        if (needLogin(e)) goLogin();
                        else setReportNote("Could not send the report.");
                      });
                  }}
                >
                  {reason}
                </button>
              ))}
            </div>
            <button type="button" className="mt-1 w-full py-3 text-center text-[16px] text-muted" onClick={() => setReportId("")}>
              Cancel
            </button>
          </div>
        </div>
      ) : null}
      {reportNote ? <p className="mt-2 text-center text-[11px] text-muted">{reportNote}</p> : null}
    </div>
  );
}

function TakeCard({
  take,
  revealed,
  applied,
  replyOpen,
  reply,
  onReveal,
  onApply,
  onVote,
  onReport,
  onLike,
  onRepost,
  onShare,
  onReplyOpen,
  onReplyChange,
  onReplySend,
}: {
  take: TakeRow;
  revealed: boolean;
  applied: boolean;
  replyOpen: boolean;
  reply: string;
  onReveal: () => void;
  onApply: () => void;
  onVote: (side: "fact" | "cap" | "a" | "b") => void;
  onReport: () => void;
  onLike: () => void;
  onRepost: () => void;
  onShare: () => void;
  onReplyOpen: () => void;
  onReplyChange: (v: string) => void;
  onReplySend: () => void;
}) {
  const ghost = take.kind === "ghost";
  const locked = take.meta.lock === true && !revealed;
  const fact = pct(take.fact, take.cap);
  const banter = pct(take.voteA, take.voteB);
  const expires = typeof take.meta.expires === "number" ? take.meta.expires : 0;
  const hours = expires ? Math.max(0, Math.round((expires - Date.now()) / 3600000)) : 0;
  return (
    <article className={`rounded-[12px] border px-2.5 py-2 ${ghost ? "border-white/10 bg-panel" : "border-line bg-panel"}`}>
      <div className="flex items-start gap-2">
        <img src={avatarUrl(ghost ? "ghost" : take.handle)} alt="" className="size-7 rounded-full bg-panel-3 object-cover" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <span className="truncate text-[12px] font-semibold">
              {ghost ? (
                "Anonymous"
              ) : (
                <a href={`/u/${encodeURIComponent(take.handle)}`} className="hover:underline">
                  {take.name}
                </a>
              )}
            </span>
            {!ghost && take.verified ? <BadgeCheck className="size-3 shrink-0 text-lime-2" /> : null}
            {!ghost ? <span className="truncate text-[10px] text-muted">@{take.handle}</span> : null}
            <span className="shrink-0 text-[10px] text-muted">· {timeAgo(take.ts)}</span>
            <button type="button" aria-label="Report gist" className="ml-auto shrink-0 px-1 text-[12px] font-bold tracking-widest text-muted" onClick={onReport}>
              =
            </button>
          </div>
          {take.role ? <div className="text-[10px] text-muted">{take.role}</div> : null}
          {ghost ? (
            <div className="mt-0.5 flex items-center justify-between text-[10px] text-violet-300/80">
              <span>Ghost Take</span>
              <span>{hours ? `expires in ${hours}h` : "expires soon"}</span>
            </div>
          ) : null}
          {take.kind === "job" ? (
            <div className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-lime-2">
              <Briefcase className="size-3" /> Job
            </div>
          ) : null}
          {take.kind === "music" ? (
            <div className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-lime-2">
              <Headphones className="size-3" /> Music
            </div>
          ) : null}
          {take.kind === "banter" ? <div className="mt-1 text-[10px] font-semibold tracking-[0.08em] text-muted">BANTER BATTLE</div> : null}
          {take.kind === "quote" && typeof take.meta.stance === "string" ? (
            <div className="mt-1 text-[10px] font-semibold tracking-[0.08em] text-lime-2">{take.meta.stance}</div>
          ) : null}
          {take.meta.street === true ? <div className="mt-0.5 text-[9px] text-amber-200/80">Street Certified</div> : null}

          {locked ? (
            <button type="button" className="mt-1.5 flex w-full items-center justify-center gap-1 rounded-[10px] border border-line py-3 text-[11px] text-muted" onClick={onReveal}>
              <Lock className="size-3" /> Tap to reveal
            </button>
          ) : (
            <p className={`mt-1 whitespace-pre-wrap text-[13px] leading-snug ${ghost ? "text-white/80" : ""}`}>{take.body}</p>
          )}

          {take.kind === "quote" ? (
            <div className="mt-1.5 rounded-[10px] border border-line px-2 py-1.5">
              <div className="text-[10px] text-muted">{String(take.meta.quoteName || "")} @{String(take.meta.quoteHandle || "")}</div>
              <div className="text-[12px] leading-snug text-fg/80">{String(take.meta.quoteBody || "")}</div>
            </div>
          ) : null}

          {take.kind === "job" && typeof take.meta.line === "string" ? <div className="mt-1 text-[11px] text-muted">{take.meta.line}</div> : null}
          {take.kind === "job" ? (
            <button type="button" disabled={applied} className="mt-1.5 rounded-[10px] border border-lime-2/40 px-2 py-1 text-[10px] font-semibold text-lime-2 disabled:opacity-60" onClick={onApply}>
              {applied ? "Sent" : "1-Tap Express Apply"}
            </button>
          ) : null}

          {take.kind === "music" ? (
            <div className="mt-1.5 flex items-center gap-2">
              <div className="grid size-9 place-items-center rounded-[8px] bg-panel-3 text-lime-2">
                <Headphones className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[12px] font-semibold">{String(take.meta.title || take.body)}</div>
                <div className="text-[10px] text-muted">{String(take.meta.artist || take.name)}</div>
              </div>
              <span className="rounded-[10px] border border-line px-2 py-1 text-[10px] font-semibold">Listen</span>
            </div>
          ) : null}

          {(take.kind === "take" || take.kind === "news" || take.kind === "quote") && (take.fact + take.cap > 0 || take.kind === "take") ? (
            <div className="mt-2">
              <div className="mb-1 flex justify-between text-[10px] font-semibold">
                <button type="button" className="text-lime-2" onClick={() => onVote("fact")}>FACT {fact}%</button>
                <button type="button" className="text-muted" onClick={() => onVote("cap")}>CAP {100 - fact}%</button>
              </div>
              <div className="flex h-1 overflow-hidden rounded-sm bg-white/10">
                <div className="h-full bg-lime-2" style={{ width: `${fact}%` }} />
              </div>
            </div>
          ) : null}

          {take.kind === "banter" ? (
            <div className="mt-2">
              <div className="mb-1 flex justify-between text-[10px] font-semibold">
                <button type="button" className="text-lime-2" onClick={() => onVote("a")}>{String(take.meta.a || "For")} {banter}%</button>
                <button type="button" className="text-muted" onClick={() => onVote("b")}>{String(take.meta.b || "Against")} {100 - banter}%</button>
              </div>
              <div className="flex h-1 overflow-hidden rounded-sm bg-white/10">
                <div className="h-full bg-lime-2" style={{ width: `${banter}%` }} />
              </div>
            </div>
          ) : null}

          {take.lastReply ? <p className="mt-1.5 text-[11px] text-muted">Reply · {take.lastReply}</p> : null}
          {replyOpen ? (
            <form
              className="mt-1.5 flex gap-1"
              onSubmit={(e) => {
                e.preventDefault();
                onReplySend();
              }}
            >
              <input value={reply} onChange={(e) => onReplyChange(e.target.value)} placeholder="Reply" className="min-w-0 flex-1 rounded-[10px] border border-line bg-bg px-2 py-1 outline-none" style={{ fontSize: 16 }} />
              <button type="submit" className="text-[11px] font-semibold text-lime-2">Send</button>
            </form>
          ) : null}

          <div className="mt-1.5 flex items-center gap-3 text-[10px] text-muted">
            <button type="button" className="inline-flex items-center gap-1" onClick={onReplyOpen}>
              <MessageSquare className="size-3.5" /> {take.comments}
            </button>
            <button type="button" className="inline-flex items-center gap-1" onClick={onRepost}>
              <Repeat2 className="size-3.5" /> {take.reposts}
            </button>
            <button type="button" className="inline-flex items-center gap-1" onClick={onLike}>
              <Heart className="size-3.5" /> {take.likes}
            </button>
            <button type="button" className="ml-auto inline-flex items-center" onClick={onShare} aria-label="Share">
              <Share2 className="size-3.5" />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
