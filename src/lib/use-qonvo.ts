import { useCallback, useEffect, useRef, useState } from "react";
import {
  ROOMS,
  allRoomMessages,
  asAccountKind,
  KIND_FACE,
  clearAll,
  loadJson,
  saveJson,
  type AccountKind,
  type Campaign,
  type ChatMsg,
  type Join,
  type MusicTrack,
  type Note,
  type Post,
  type PresenceUser,
  parseMusicUrl,
  type Team,
} from "@/lib/qonvo-data";
import { bumpView, getChatTtl, getProfile, joinTeamRow, listAds, listJoins, listMsgs, listMyAds, listPins, listPosts, listScores, listTeams, listTracks, pingPresence, purgeMsgs, reportPost, saveAdRow, saveComment, saveJoin, saveMsg, deleteOwnMsg, savePin, savePost, savePrefs, saveProfile, saveRx, saveTeam, saveTrack, sendMail, setOwnAdRun } from "@/lib/forum-server";
import { postBodyPlain } from "@/lib/post-body";
import { listNotes } from "@/lib/social-server";
import { hidePost as hidePostRow, setAdPlacement, setAdStatus, setAdWindow } from "@/lib/staff-server";
import { DEMO_TRACKS } from "@/lib/qonvo-seed";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { publicUsername } from "@/lib/account-email";
import {
  ACTIVITY_EVENTS,
  CHAT_POLL_ACTIVE_MS,
  CHAT_POLL_IDLE_MS,
  pollDelayMs,
} from "@/lib/adaptive-poll";

function guestName() {
  return `Guest#${Math.floor(1000 + Math.random() * 9000)}`;
}

function plantedId(id: string) {
  return /^(demo-|dig-|ka-|dn\d+$)/.test(id);
}

const PLANTED_NAMES = new Set(["Amaka#2201", "Kemi#0092", "Chidi#4410", "Baba#12", "Ife#830"]);

function plantedAd(c: { id?: string; txHash?: string; image?: string }) {
  if (plantedId(String(c.id || ""))) return true;
  if (String(c.txHash || "").startsWith("0xdemo")) return true;
  if (String(c.image || "").includes("picsum.photos")) return true;
  return false;
}

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

type MsgPack = {
  msgs: ChatMsg[];
  older?: boolean;
  newer?: boolean;
  hours?: number;
  online?: PresenceUser[];
  typing?: string[];
  paused?: boolean;
  until?: number;
  reason?: string;
  error?: string;
};

function asPack(r: MsgPack | ChatMsg[]): MsgPack {
  return Array.isArray(r) ? { msgs: r, older: false, newer: false, hours: 24, online: [], typing: [] } : r;
}

/** Timed-out / failed listMsgs returns empty msgs + online — must not wipe UI or advance cursors. */
function packFailed(pack: MsgPack): boolean {
  return typeof pack.error === "string" && pack.error.length > 0;
}

function packPaused(pack: MsgPack, now = Date.now()): { paused: boolean; until: number; reason: string } {
  const until = typeof pack.until === "number" ? pack.until : 0;
  if (pack.paused && until > now) {
    return {
      paused: true,
      until,
      reason: pack.reason || "Chat is on a short break — back soon.",
    };
  }
  return { paused: false, until: 0, reason: "" };
}

/** Union by ts (server fields win); rx counts take max so optimistic taps are not wiped below pending saves. */
function mergeByTs(prev: ChatMsg[], incoming: ChatMsg[], cap = 80): ChatMsg[] {
  const map = new Map<number, ChatMsg>();
  for (const m of prev) map.set(m.ts, m);
  for (const m of incoming) {
    const old = map.get(m.ts);
    if (!old) {
      map.set(m.ts, m);
      continue;
    }
    const rx: Record<string, number> = { ...(m.rx ?? {}) };
    for (const [k, v] of Object.entries(old.rx ?? {})) {
      rx[k] = Math.max(rx[k] ?? 0, v ?? 0);
    }
    map.set(m.ts, { ...m, rx });
  }
  return [...map.values()].sort((a, b) => a.ts - b.ts).slice(-cap);
}

/** Local send still waiting to appear in a server pack (or explicitly failed). */
type PendingSend = {
  id: string;
  roomId: string;
  /** Optimistic client ts (for removal) and/or server-confirmed ts. */
  ts: number;
  optimisticTs: number;
  t: string;
  n: string;
  parentTs?: number;
  parentN?: string;
  parentT?: string;
  confirmed: boolean;
};

const PENDING_MATCH_WINDOW_MS = 120_000;

function pendingToMsg(p: PendingSend): ChatMsg {
  return {
    n: p.n,
    t: p.t,
    ts: p.ts,
    rx: {},
    parentTs: p.parentTs,
    parentN: p.parentN,
    parentT: p.parentT,
  };
}

function serverHasPending(incoming: ChatMsg[], p: PendingSend): boolean {
  if (incoming.some((m) => m.ts === p.ts || m.ts === p.optimisticTs)) return true;
  const lo = Math.min(p.ts, p.optimisticTs) - PENDING_MATCH_WINDOW_MS;
  const hi = Math.max(p.ts, p.optimisticTs) + PENDING_MATCH_WINDOW_MS;
  return incoming.some(
    (m) =>
      m.t === p.t &&
      m.n.toLowerCase() === p.n.toLowerCase() &&
      m.ts >= lo &&
      m.ts <= hi,
  );
}

/** Keep just-sent rows that a stale/incomplete server page omitted (ts <= serverTip case). */
function mergePreservingPending(
  incoming: ChatMsg[],
  pending: PendingSend[],
  prev: ChatMsg[] = [],
  cap = 80,
): ChatMsg[] {
  const missing = pending.filter((p) => !serverHasPending(incoming, p)).map(pendingToMsg);
  // Also keep prev rows that match pending (covers confirmed already painted but not in pack).
  const pendingTs = new Set(pending.flatMap((p) => [p.ts, p.optimisticTs]));
  const fromPrev = prev.filter(
    (m) => pendingTs.has(m.ts) && !incoming.some((x) => x.ts === m.ts) && !missing.some((x) => x.ts === m.ts),
  );
  return mergeByTs(incoming, [...fromPrev, ...missing], cap);
}

function passKey(name: string, pass: string) {
  return `${name.toLowerCase()}::${pass}`;
}

export function useQonvo() {
  const session = useCurrentUserState();
  const [ready, setReady] = useState(false);
  const [handle, setHandle] = useState("");
  const [verified, setVerified] = useState(false);
  const [roomId, setRoomId] = useState("lounge");
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [pins, setPins] = useState<string[]>([]);
  const [savedPosts, setSavedPosts] = useState<string[]>([]);
  const [likes, setLikes] = useState<Record<string, number>>({});
  const [shares, setShares] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState<Note[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [joins, setJoins] = useState<Join[]>([]);
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [openPost, setOpenPost] = useState<string | null>(null);
  const [openTrack, setOpenTrack] = useState<string | null>(null);
  const [authed, setAuthed] = useState(false);
  /** Blocks session→handle rehydration after an intentional Sign out (cookie may linger briefly). */
  const [localSignedOut, setLocalSignedOut] = useState(false);
  const localSignedOutRef = useRef(false);
  const [authErr, setAuthErr] = useState("");
  const [bio, setBio] = useState("");
  const [city, setCity] = useState("");
  const [hasOlder, setHasOlder] = useState(false);
  const [hasNewer, setHasNewer] = useState(false);
  const [chatHours, setChatHours] = useState(24);
  const [livePausedUntil, setLivePausedUntil] = useState(0);
  const [livePausedReason, setLivePausedReason] = useState("");
  const [kind, setKind] = useState<AccountKind>("member");
  const [stage, setStage] = useState("");
  const [genre, setGenre] = useState("");
  const [website, setWebsite] = useState("");
  const [interests, setInterests] = useState("");
  const [langs, setLangs] = useState("");
  const [onboarded, setOnboarded] = useState<number | null>(null);
  const [brand, setBrand] = useState("");
  const [face, setFace] = useState(() => {
    if (typeof window === "undefined") return KIND_FACE.member;
    try {
      const saved = sessionStorage.getItem("kilode-face");
      if (saved && saved.length > 8) return saved;
    } catch {
      /* private mode */
    }
    return KIND_FACE.member;
  });
  const [board, setBoard] = useState<{ name: string; n: number }[]>([]);
  const [online, setOnline] = useState<PresenceUser[]>([]);
  const [typing, setTyping] = useState<string[]>([]);
  const msgsRef = useRef<ChatMsg[]>([]);
  const hasNewerRef = useRef(false);
  /** Max server-confirmed ts per room — never use optimistic Date.now() as after: cursor. */
  const tipTsByRoomRef = useRef<Record<string, number>>({});
  const lastPing = useRef(0);
  const [chatLive, setChatLive] = useState(false);
  const [chatErr, setChatErr] = useState("");
  const [msgsLoading, setMsgsLoading] = useState(false);
  const roomIdRef = useRef(roomId);
  /** In-memory per-room threads so switching rooms does not wipe other rooms' cache. */
  const msgsByRoomRef = useRef<Record<string, ChatMsg[]>>({});
  /** Blocks double reaction taps (click+touch / rapid re-press) until saveRx settles. */
  const rxInFlightRef = useRef<Set<string>>(new Set());
  /** Just-sent rows per room until they appear in a server pack (or fail). */
  const pendingByRoomRef = useRef<Record<string, PendingSend[]>>({});
  /** Bumped on each send; stale room-load / post-send listMsgs ignore older generations. */
  const sendSeqByRoomRef = useRef<Record<string, number>>({});
  /** Bumped when a room-load starts; responses for older gens are ignored. */
  const roomLoadGenRef = useRef<Record<string, number>>({});

  const listPending = useCallback((id: string) => pendingByRoomRef.current[id] ?? [], []);

  const upsertPending = useCallback((row: PendingSend) => {
    const cur = pendingByRoomRef.current[row.roomId] ?? [];
    const without = cur.filter((p) => p.id !== row.id && p.optimisticTs !== row.optimisticTs);
    pendingByRoomRef.current[row.roomId] = [...without, row];
  }, []);

  const dropPending = useCallback((room: string, pred: (p: PendingSend) => boolean) => {
    const cur = pendingByRoomRef.current[room] ?? [];
    pendingByRoomRef.current[room] = cur.filter((p) => !pred(p));
  }, []);

  const reconcilePending = useCallback((room: string, incoming: ChatMsg[]) => {
    const cur = pendingByRoomRef.current[room] ?? [];
    if (!cur.length) return;
    pendingByRoomRef.current[room] = cur.filter((p) => !serverHasPending(incoming, p));
  }, []);

  const bumpSendSeq = useCallback((room: string) => {
    const n = (sendSeqByRoomRef.current[room] ?? 0) + 1;
    sendSeqByRoomRef.current[room] = n;
    return n;
  }, []);

  const persistNotes = useCallback((next: Note[]) => {
    setNotes(next);
    saveJson("notes", next);
  }, []);

  const note = useCallback(
    (text: string) => {
      persistNotes([{ id: uid(), text, ts: Date.now() }, ...notes].slice(0, 50));
    },
    [notes, persistNotes],
  );

  useEffect(() => {
    setHandle(loadJson("me", ""));
    setRoomId(loadJson("room", "lounge"));
    const posts0 = loadJson<Post[]>("posts", [])
      .filter((p): p is Post => !!p && typeof p.id === "string")
      .filter((p) => !plantedId(p.id) && !String(p.id).startsWith("demo-feed-"));
    const ads0 = loadJson<Campaign[]>("ads", []).filter((p): p is Campaign => !!p && typeof p.id === "string" && !plantedAd(p));
    const notes0 = loadJson<Note[]>("notes", []).filter((n): n is Note => !!n && typeof n.id === "string" && !plantedId(n.id));
    const joins0 = loadJson<Join[]>("joins", []).filter((j): j is Join => !!j && typeof j.name === "string" && !PLANTED_NAMES.has(j.name));
    setPosts(posts0);
    setCampaigns(
      ads0.map((c) => ({
        ...c,
        status: c.status ?? "pending",
        placement: c.placement ?? "sidebar",
      })),
    );
    saveJson("ads", ads0);
    setNotes(notes0);
    setJoins(joins0);
    saveJson("notes", notes0);
    saveJson("joins", joins0);
    setPins(loadJson("pins", []));
    setSavedPosts(loadJson("savedPosts", []));
    setLikes(loadJson("postLikes", {}));
    setShares(loadJson("postShares", {}));
    setTeams(loadJson<Team[]>("teams", []).filter((t): t is Team => !!t && typeof t.id === "string"));
    const tracks0 = loadJson<MusicTrack[]>("tracks", []).filter((t): t is MusicTrack => !!t && typeof t.id === "string" && typeof t.url === "string" && !plantedId(t.id));
    const tracks = tracks0.filter((t) => !!parseMusicUrl(t.url));
    setTracks(tracks);
    saveJson("tracks", tracks);
    setReady(true);
    void Promise.all([listPosts(), listAds()])
      .then(([dbPosts, dbAds]) => {
        const applyPosts = (dbPosts: Awaited<ReturnType<typeof listPosts>>) => {
          if (!dbPosts.length) return;
          const mapped = dbPosts
            .filter((p): p is NonNullable<typeof p> => !!p && typeof (p as { id?: string }).id === "string")
            .map((p) => ({
              ...p,
              excerpt: p.excerpt ?? undefined,
              category: p.category ?? undefined,
              tags: p.tags ?? undefined,
              link: p.link ?? undefined,
              image: p.image ?? undefined,
              slug: p.slug ?? undefined,
              status: p.status as Post["status"],
              comments: p.comments ?? [],
              views: Number(p.views ?? 0),
            }));
          setPosts(mapped);
          saveJson("posts", mapped);
        };
        applyPosts(dbPosts);
        setCampaigns(dbAds.filter((a) => !!a && typeof a.id === "string" && !plantedAd(a)) as Campaign[]);
      })
      .catch(() => undefined);
    void listJoins()
      .then((rows) => {
        if (rows.length) setJoins(rows);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    roomIdRef.current = roomId;
  }, [roomId]);

  const cacheRoomMsgs = useCallback((id: string, next: ChatMsg[]) => {
    msgsByRoomRef.current[id] = next;
    saveJson(`msgs.${id}`, next);
  }, []);

  const noteServerTip = useCallback((id: string, ts: number) => {
    if (!ts || ts <= 0) return;
    tipTsByRoomRef.current[id] = Math.max(tipTsByRoomRef.current[id] ?? 0, ts);
  }, []);

  const tracksOnce = useRef(false);
  const loadTracks = useCallback(() => {
    if (tracksOnce.current) return;
    tracksOnce.current = true;
    void listTracks()
      .then((dbTracks) => {
        if (!dbTracks.length) {
          setTracks(DEMO_TRACKS.filter((t) => !!parseMusicUrl(t.url)).map((t) => ({ ...t, author: "Kilode" })));
          return;
        }
        const mapped = dbTracks
          .filter((t): t is NonNullable<typeof t> => !!t && typeof (t as { id?: string }).id === "string")
          .map((t) => ({
            ...t,
            embed: t.embed ?? undefined,
            cover: t.cover ?? undefined,
            genre: t.genre ?? undefined,
            album: t.album ?? undefined,
            note: t.note ?? undefined,
            tags: t.tags ?? undefined,
          }));
        const live = mapped.filter((t) => !!t && !!parseMusicUrl(t.url) && !plantedId(t.id));
        const catalog = DEMO_TRACKS.filter((t) => !!parseMusicUrl(t.url)).map((t) => ({ ...t, author: "Kilode" }));
        setTracks(live.length ? live : catalog);
      })
      .catch(() => {
        tracksOnce.current = false;
      });
  }, []);

  const clockOnce = useRef(false);
  const loadChatClock = useCallback(() => {
    if (clockOnce.current) return;
    clockOnce.current = true;
    void getChatTtl()
      .then((r) => setChatHours(r.hours))
      .catch(() => {
        clockOnce.current = false;
      });
  }, []);

  const scoresOnce = useRef(false);
  const loadScores = useCallback(() => {
    if (scoresOnce.current) return;
    scoresOnce.current = true;
    void listScores()
      .then(setBoard)
      .catch(() => {
        scoresOnce.current = false;
      });
  }, []);

  useEffect(() => {
    if (!ready) return;
    let on = true;
    const want = roomId;
    const ac = new AbortController();
    roomIdRef.current = want;
    // Never show another room's thread. Prefer this room's cache while Neon loads.
    const cached = msgsByRoomRef.current[want] ?? loadJson<ChatMsg[]>(`msgs.${want}`, []);
    msgsRef.current = cached;
    setMsgs(cached);
    // Do not seed tip from local cache — it may hold optimistic Date.now() ahead of Neon.
    setHasOlder(false);
    setHasNewer(false);
    setOnline([]);
    setTyping([]);
    setChatErr("");
    setLivePausedUntil(0);
    setLivePausedReason("");
    setMsgsLoading(true);
    const loadGen = (roomLoadGenRef.current[want] ?? 0) + 1;
    roomLoadGenRef.current[want] = loadGen;
    const sendSeqAtStart = sendSeqByRoomRef.current[want] ?? 0;
    void listMsgs({ data: { roomId: want }, signal: ac.signal })
      .then((r) => {
        // Stale-response guard: ignore if user already left this room.
        if (!on || roomIdRef.current !== want) return;
        // Ignore if a newer room-load started, or a send finished after this fetch began.
        if (roomLoadGenRef.current[want] !== loadGen) return;
        if ((sendSeqByRoomRef.current[want] ?? 0) > sendSeqAtStart) return;
        const pack = asPack(r);
        // Timeout/error packs are empty — keep cache, do not wipe presence or thread.
        if (packFailed(pack)) {
          const fallback = msgsByRoomRef.current[want] ?? loadJson<ChatMsg[]>(`msgs.${want}`, []);
          msgsRef.current = fallback;
          setMsgs(fallback);
          return;
        }
        {
          const br = packPaused(pack);
          if (br.paused) {
            setLivePausedUntil(br.until);
            setLivePausedReason(br.reason);
            setOnline([]);
            setTyping([]);
            if (typeof pack.hours === "number") setChatHours(pack.hours);
            setMsgsLoading(false);
            return;
          }
          setLivePausedUntil(0);
          setLivePausedReason("");
        }
        // Prefer server page; always re-attach pending/confirmed sends missing from the pack.
        const incoming = pack.msgs ?? [];
        const pending = listPending(want);
        setMsgs((prev) => {
          let merged: ChatMsg[];
          if (!incoming.length) {
            // Never wipe a thread that still has in-flight local sends.
            if (pending.length) {
              merged = mergePreservingPending([], pending, prev);
            } else {
              merged = [];
              tipTsByRoomRef.current[want] = 0;
            }
          } else {
            const serverTip = incoming.reduce((a, m) => Math.max(a, m.ts), 0);
            // Keep poll-raced rows newer than the pack tip AND any pending/confirmed locals.
            const raced = prev.filter((m) => m.ts > serverTip);
            merged = mergePreservingPending(mergeByTs(incoming, raced), pending, prev);
          }
          reconcilePending(want, incoming);
          msgsRef.current = merged;
          cacheRoomMsgs(want, merged);
          return merged;
        });
        for (const m of incoming) noteServerTip(want, m.ts);
        setHasOlder(!!pack.older);
        setHasNewer(!!pack.newer);
        if (typeof pack.hours === "number") setChatHours(pack.hours);
        if (pack.online) setOnline(pack.online);
        if (pack.typing) setTyping(pack.typing);
      })
      .catch(() => {
        if (!on || roomIdRef.current !== want) return;
        const fallback = msgsByRoomRef.current[want] ?? loadJson<ChatMsg[]>(`msgs.${want}`, []);
        msgsRef.current = fallback;
        setMsgs(fallback);
      })
      .finally(() => {
        if (on && roomIdRef.current === want) setMsgsLoading(false);
      });
    return () => {
      on = false;
      ac.abort(); // drop in-flight listMsgs on room switch
    };
  }, [roomId, ready, cacheRoomMsgs, noteServerTip, listPending, reconcilePending]);

  useEffect(() => {
    msgsRef.current = msgs;
    if (roomId) msgsByRoomRef.current[roomId] = msgs;
  }, [msgs, roomId]);
  useEffect(() => {
    hasNewerRef.current = hasNewer;
  }, [hasNewer]);

  useEffect(() => {
    if (!ready || !chatLive) return;
    let dead = false;
    let inFlight = false;
    let ac: AbortController | null = null;
    let timer: number | undefined;
    let lastActivity = Date.now();
    let pollN = 0;
    let forceReconcile = false;
    let pausedUntilLocal = 0;
    const want = roomId;

    const markActivity = () => {
      lastActivity = Date.now();
    };

    const arm = () => {
      if (dead) return;
      if (timer !== undefined) window.clearTimeout(timer);
      if (pausedUntilLocal > Date.now()) {
        const wait = Math.min(Math.max(500, pausedUntilLocal - Date.now() + 400), 6 * 3600_000);
        timer = window.setTimeout(() => {
          pausedUntilLocal = 0;
          setLivePausedUntil(0);
          setLivePausedReason("");
          forceReconcile = true;
          tick();
        }, wait);
        return;
      }
      const delay = pollDelayMs(lastActivity, CHAT_POLL_ACTIVE_MS, CHAT_POLL_IDLE_MS);
      if (!delay) return; // hidden → stop until visibilitychange
      timer = window.setTimeout(tick, delay);
    };

    const tick = () => {
      if (dead || (typeof document !== "undefined" && document.hidden)) return;
      if (pausedUntilLocal > Date.now()) {
        arm();
        return;
      }
      if (inFlight) {
        arm();
        return;
      }
      if (roomIdRef.current !== want) return;
      pollN += 1;
      // Full reconcile every 2nd poll (50s active → ≤100s heal) + on tab focus.
      const reconcile = forceReconcile || pollN % 2 === 0;
      forceReconcile = false;
      // Server-confirmed tip only — never after: an optimistic Date.now() still in the list.
      const afterTs = tipTsByRoomRef.current[want] ?? 0;
      const payload =
        hasNewerRef.current || !afterTs || reconcile
          ? { roomId: want }
          : { roomId: want, after: afterTs };
      ac?.abort();
      ac = new AbortController();
      const signal = ac.signal;
      inFlight = true;
      void listMsgs({ data: payload, signal })
        .then((r) => {
          // Classic A→B→A race: drop responses for a room we already left.
          if (dead || signal.aborted || roomIdRef.current !== want) return;
          const pack = asPack(r);
          if (packFailed(pack)) return; // do not wipe online / msgs on Neon timeout
          {
            const br = packPaused(pack);
            if (br.paused) {
              pausedUntilLocal = br.until;
              setLivePausedUntil(br.until);
              setLivePausedReason(br.reason);
              setOnline([]);
              setTyping([]);
              if (typeof pack.hours === "number") setChatHours(pack.hours);
              return;
            }
            if (pausedUntilLocal || pack.paused === false) {
              pausedUntilLocal = 0;
              setLivePausedUntil(0);
              setLivePausedReason("");
            }
          }
          if (pack.online) setOnline(pack.online);
          if (pack.typing) setTyping(pack.typing);
          if (typeof pack.hours === "number") setChatHours(pack.hours);
          // Viewing older page: keep presence fresh, leave the history window alone.
          if (hasNewerRef.current) return;
          if (!afterTs || reconcile || !("after" in payload)) {
            if (!pack.msgs.length) {
              // Empty success must not erase pending local sends.
              const pending = listPending(want);
              if (!pending.length) return;
              setMsgs((prev) => {
                const merged = mergePreservingPending([], pending, prev);
                msgsRef.current = merged;
                cacheRoomMsgs(want, merged);
                return merged;
              });
              return;
            }
            setMsgs((prev) => {
              const pending = listPending(want);
              const merged = mergePreservingPending(mergeByTs(prev, pack.msgs), pending, prev);
              reconcilePending(want, pack.msgs);
              msgsRef.current = merged;
              cacheRoomMsgs(want, merged);
              return merged;
            });
            for (const m of pack.msgs) noteServerTip(want, m.ts);
            setHasOlder(!!pack.older);
            setHasNewer(!!pack.newer);
            return;
          }
          if (!pack.msgs.length) return;
          const known = new Set(msgsRef.current.map((m) => m.ts));
          const extra = pack.msgs.filter((m) => !known.has(m.ts));
          for (const m of pack.msgs) noteServerTip(want, m.ts);
          reconcilePending(want, pack.msgs);
          if (!extra.length) {
            // Still re-attach pending if a prior merge dropped them.
            const pending = listPending(want);
            if (!pending.length) return;
            setMsgs((prev) => {
              const merged = mergePreservingPending(prev, pending, prev);
              msgsRef.current = merged;
              cacheRoomMsgs(want, merged);
              return merged;
            });
            return;
          }
          setMsgs((prev) => {
            const pending = listPending(want);
            const merged = mergePreservingPending(mergeByTs(prev, extra), pending, prev);
            msgsRef.current = merged;
            cacheRoomMsgs(want, merged);
            return merged;
          });
          setHasNewer(!!pack.newer);
        })
        .catch(() => undefined)
        .finally(() => {
          // Only the current controller may clear inFlight / re-arm (abort race).
          if (ac?.signal !== signal) return;
          inFlight = false;
          arm();
        });
    };

    tick();
    // Cost: active ~50s, idle ~120s, hidden stop. Only while Chat tab is live.
    const onVis = () => {
      if (document.hidden) {
        if (timer !== undefined) window.clearTimeout(timer);
        return;
      }
      markActivity();
      // Heal tip-skip / clock-skew gaps as soon as the tab is visible again.
      forceReconcile = true;
      tick();
    };
    document.addEventListener("visibilitychange", onVis);
    for (const ev of ACTIVITY_EVENTS) window.addEventListener(ev, markActivity, { passive: true });
    return () => {
      dead = true;
      ac?.abort();
      if (timer !== undefined) window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVis);
      for (const ev of ACTIVITY_EVENTS) window.removeEventListener(ev, markActivity);
    };
  }, [ready, roomId, chatLive, cacheRoomMsgs, noteServerTip, listPending, reconcilePending]);

  useEffect(() => {
    if (session.isPending) return;
    // Intentional Sign out: keep Me on Join until the cookie is gone or the page reloads.
    if (localSignedOut) {
      if (!session.user) {
        localSignedOutRef.current = false;
        setLocalSignedOut(false);
      }
      return;
    }
    if (session.user) {
      const name = publicUsername(session.user.displayName || session.user.primaryEmail || session.user.id.slice(0, 16));
      setHandle(name);
      setAuthed(true);
      saveJson("me", name);
      saveJson("authed", name);
      void listPins()
        .then((rows) => {
          if (localSignedOutRef.current) return;
          setPins(rows);
        })
        .catch(() => undefined);
      void listTeams()
        .then((rows) => {
          if (localSignedOutRef.current) return;
          setTeams((Array.isArray(rows) ? rows : []).filter((t) => !!t && typeof t.id === "string") as Team[]);
        })
        .catch(() => undefined);
      void listNotes()
        .then((rows) => {
          if (localSignedOutRef.current) return;
          if (rows.length) setNotes(rows);
        })
        .catch(() => undefined);
      void listMyAds()
        .then((mine) => {
          if (localSignedOutRef.current || !mine.length) return;
          setCampaigns((prev) => {
            const ids = new Set(prev.map((c) => c.id));
            return [...mine.filter((m) => !ids.has(m.id)), ...prev];
          });
        })
        .catch(() => undefined);
      void getProfile()
        .then((p) => {
          if (localSignedOutRef.current) return;
          if (p.handle) {
            setHandle(p.handle);
            saveJson("me", p.handle);
            saveJson("authed", p.handle);
          }
          setBio(p.bio);
          setCity(p.city);
          setKind(asAccountKind(p.kind));
          setStage(p.stage ?? "");
          setGenre(p.genre ?? "");
          setWebsite(p.website ?? "");
          setBrand(p.brand ?? "");
          setInterests(p.interests ?? "");
          setLangs(p.langs ?? "");
          setOnboarded(p.onboarded === 1 ? 1 : 0);
          const nextFace = p.photo || p.face || KIND_FACE[asAccountKind(p.kind)];
          setFace(nextFace);
          try {
            sessionStorage.setItem("kilode-face", nextFace.slice(0, 80000));
          } catch {
            /* quota */
          }
          setVerified(p.verified === true);
          try {
            const pending = sessionStorage.getItem("nf_account");
            if (pending) {
              sessionStorage.removeItem("nf_account");
              const extra = JSON.parse(pending) as { kind?: string; stage?: string; genre?: string; website?: string; brand?: string; face?: string };
              const nextKind = asAccountKind(extra.kind);
              setKind(nextKind);
              if (extra.stage) setStage(extra.stage);
              if (extra.genre) setGenre(extra.genre);
              if (extra.website) setWebsite(extra.website);
              if (extra.brand) setBrand(extra.brand);
              const nextFace = extra.face || KIND_FACE[nextKind];
              setFace(nextFace);
              void saveProfile({
                data: {
                  handle: p.handle || name,
                  bio: p.bio,
                  city: p.city,
                  kind: nextKind,
                  stage: extra.stage ?? p.stage,
                  genre: extra.genre ?? p.genre,
                  website: extra.website ?? p.website,
                  brand: extra.brand ?? p.brand,
                  face: nextFace,
                },
              }).catch(() => undefined);
            }
          } catch {
            /* ignore */
          }
        })
        .catch(() => undefined);
    } else {
      setAuthed(false);
    }
  }, [session.isPending, session.user?.id, localSignedOut]);

  const recordJoin = useCallback((name: string, room?: string) => {
    setJoins((prev) => [{ name, ts: Date.now(), room }, ...prev.filter((j) => j.name !== name)].slice(0, 20));
    void saveJoin({ data: { name, room } }).catch(() => undefined);
  }, []);

  const openRoom = useCallback((id: string) => {
    setRoomId(id);
    saveJson("room", id);
  }, []);

  const ensureHandle = useCallback(() => {
    if (handle) return handle;
    const name = guestName();
    setHandle(name);
    saveJson("me", name);
    recordJoin(name, roomId);
    return name;
  }, [handle, recordJoin, roomId]);

  const register = useCallback((name: string, pass: string, agreed?: boolean) => {
    const n = name.trim().slice(0, 24);
    const p = pass.trim();
    if (!agreed) {
      setAuthErr("Accept the Terms to register.");
      return false;
    }
    if (n.length < 3 || p.length < 4) {
      setAuthErr("Username 3+ chars, password 4+.");
      return false;
    }
    const users = loadJson<Record<string, string>>("users", {});
    const key = n.toLowerCase();
    if (users[key]) {
      setAuthErr("That username is taken. Sign in.");
      return false;
    }
    users[key] = passKey(n, p);
    saveJson("users", users);
    setHandle(n);
    saveJson("me", n);
    saveJson("authed", n);
    saveJson("terms", "1");
    setAuthed(true);
    setAuthErr("");
    recordJoin(n, roomId);
    note(`Registered ${n}`);
    return true;
  }, [note, recordJoin, roomId]);

  const login = useCallback((name: string, pass: string) => {
    const n = name.trim();
    const users = loadJson<Record<string, string>>("users", {});
    const key = n.toLowerCase();
    if (!users[key] || users[key] !== passKey(n, pass.trim())) {
      setAuthErr("Wrong username or password.");
      return false;
    }
    setHandle(n);
    saveJson("me", n);
    saveJson("authed", n);
    setAuthed(true);
    setAuthErr("");
    recordJoin(n, roomId);
    note(`Signed in ${n}`);
    return true;
  }, [note, recordJoin, roomId]);

  const logout = useCallback(() => {
    // Clear Kilode UI session immediately so Me never sits on "Signing out…".
    // Server cookie clear is best-effort via signOut(); localSignedOut blocks rehydration.
    localSignedOutRef.current = true;
    setLocalSignedOut(true);
    setHandle("");
    setAuthed(false);
    saveJson("me", "");
    saveJson("authed", "");
  }, []);

  const needAccount = useCallback(() => {
    // saveMsg / other writes require authMiddleware — localStorage authed is not enough.
    if (session.user) return true;
    setChatErr("Sign in to chat.");
    note("Sign in to do that.");
    return false;
  }, [note, session.user]);

  const finishOnboard = useCallback(async (d: { interests?: string; langs?: string; website?: string; city?: string; skip?: boolean }) => {
    const r = await savePrefs({ data: d });
    if (!r.ok) return r;
    setInterests(r.interests);
    setLangs(r.langs);
    if (typeof r.website === "string") setWebsite(r.website);
    if (typeof r.city === "string" && r.city) setCity(r.city);
    setOnboarded(1);
    return r;
  }, []);

  const rename = useCallback(async (name: string, extra?: { bio?: string; city?: string; kind?: AccountKind; stage?: string; genre?: string; website?: string; brand?: string; face?: string; gender?: string; photo?: string }) => {
    const next = name.trim().slice(0, 24);
    if (!next) return { ok: false as const, reason: "Add a username." };
    const nextBio = (extra?.bio ?? bio).trim().slice(0, 280);
    setHandle(next);
    saveJson("me", next);
    setBio(nextBio);
    if (extra?.city !== undefined) setCity(extra.city);
    if (extra?.kind !== undefined) setKind(extra.kind);
    if (extra?.stage !== undefined) setStage(extra.stage);
    if (extra?.genre !== undefined) setGenre(extra.genre);
    if (extra?.website !== undefined) setWebsite(extra.website);
    if (extra?.brand !== undefined) setBrand(extra.brand);
    if (extra?.face !== undefined) setFace(extra.face);
    try {
      const r = await saveProfile({
        data: {
          handle: next,
          bio: nextBio,
          city: extra?.city ?? city,
          kind: extra?.kind ?? kind,
          stage: extra?.stage ?? stage,
          genre: extra?.genre ?? genre,
          website: extra?.website ?? website,
          brand: extra?.brand ?? brand,
          face: extra?.face ?? face,
          gender: extra?.gender,
          photo: extra?.photo,
        },
      });
      if (!r?.ok) {
        note(r?.reason || "Profile did not save.");
        return { ok: false as const, reason: r?.reason || "Profile did not save." };
      }
      note("Profile saved.");
      recordJoin(next, roomId);
      return { ok: true as const };
    } catch {
      note("Profile did not save.");
      return { ok: false as const, reason: "Profile did not save." };
    }
  }, [bio, brand, city, face, genre, kind, note, recordJoin, roomId, stage, website]);

  const sendContact = useCallback(
    (text: string) => {
      const body = text.trim();
      if (!body) return;
      if (!needAccount()) return;
      void sendMail({ data: body }).catch(() => undefined);
      note("Message sent to staff");
    },
    [needAccount, note],
  );

  const pushPost = useCallback((item: Post) => {
    if (!item?.id) return;
    setPosts((prev) => [item, ...prev.filter((p) => p?.id !== item.id)]);
  }, []);

  const hidePost = useCallback((id: string) => {
    setPosts((prev) => prev.filter((p) => p?.id !== id));
    if (openPost === id) setOpenPost(null);
    void hidePostRow({ data: id }).catch(() => undefined);
    note("Post hidden");
  }, [note, openPost]);

  const send = useCallback(
    async (text: string, parentTs?: number): Promise<boolean> => {
      const body = text.trim();
      if (!body) return false;
      setChatErr("");
      if (!session.user) {
        setChatErr("Sign in to chat.");
        note("Sign in to chat.");
        return false;
      }
      // Capture room at send time — user may switch rooms before save/list returns.
      const sentRoom = roomId;
      const stillHere = () => roomIdRef.current === sentRoom;
      const who =
        handle ||
        publicUsername(session.user.displayName || session.user.primaryEmail || session.user.id.slice(0, 16));
      const optimisticTs = Date.now();
      const pendingId = uid();
      const sendSeq = bumpSendSeq(sentRoom);
      const parent = parentTs ? msgsRef.current.find((m) => m.ts === parentTs) : undefined;
      const optimistic: ChatMsg = {
        n: who,
        t: body,
        ts: optimisticTs,
        rx: {},
        parentTs,
        parentN: parent?.n,
        parentT: parent?.t?.slice(0, 80),
      };
      upsertPending({
        id: pendingId,
        roomId: sentRoom,
        ts: optimisticTs,
        optimisticTs,
        t: body,
        n: who,
        parentTs,
        parentN: parent?.n,
        parentT: parent?.t?.slice(0, 80),
        confirmed: false,
      });
      // Show immediately; replace with server row on success.
      if (!hasNewer) {
        setMsgs((prev) => {
          const next = [...prev, optimistic];
          msgsRef.current = next;
          msgsByRoomRef.current[sentRoom] = next;
          return next;
        });
      }
      try {
        const r = await saveMsg({ data: { roomId: sentRoom, text: body, parentTs } });
        if (!r || ("ok" in r && r.ok === false)) {
          const reason =
            r && "reason" in r && typeof (r as { reason: string }).reason === "string"
              ? (r as { reason: string }).reason
              : "Blocked by the moderator.";
          note(reason);
          dropPending(sentRoom, (p) => p.id === pendingId);
          if (stillHere()) {
            setChatErr(reason);
            setMsgs((prev) => {
              const next = prev.filter((m) => m.ts !== optimisticTs);
              msgsRef.current = next;
              msgsByRoomRef.current[sentRoom] = next;
              return next;
            });
          } else {
            const cur = (msgsByRoomRef.current[sentRoom] ?? []).filter((m) => m.ts !== optimisticTs);
            msgsByRoomRef.current[sentRoom] = cur;
            saveJson(`msgs.${sentRoom}`, cur);
          }
          return false;
        }
        const row = r as {
          n: string;
          t?: string;
          ts: number;
          parentTs?: number;
          parentN?: string;
          parentT?: string;
        };
        const confirmed: ChatMsg = {
          n: row.n,
          t: row.t ?? body,
          ts: row.ts,
          rx: {},
          parentTs: row.parentTs ?? parentTs,
          parentN: row.parentN ?? parent?.n,
          parentT: row.parentT ?? parent?.t?.slice(0, 80),
        };
        // Keep pending until a server pack actually includes this row (ts or n+t match).
        upsertPending({
          id: pendingId,
          roomId: sentRoom,
          ts: confirmed.ts,
          optimisticTs,
          t: confirmed.t,
          n: confirmed.n,
          parentTs: confirmed.parentTs,
          parentN: confirmed.parentN,
          parentT: confirmed.parentT,
          confirmed: true,
        });
        noteServerTip(sentRoom, confirmed.ts);
        if (stillHere()) {
          setMsgs((prev) => {
            const withoutOpt = prev.filter((m) => m.ts !== optimisticTs);
            const next = withoutOpt.some((m) => m.ts === confirmed.ts)
              ? withoutOpt
              : [...withoutOpt, confirmed];
            msgsRef.current = next;
            cacheRoomMsgs(sentRoom, next);
            return next;
          });
        } else {
          const prev = msgsByRoomRef.current[sentRoom] ?? [];
          const withoutOpt = prev.filter((m) => m.ts !== optimisticTs);
          const next = withoutOpt.some((m) => m.ts === confirmed.ts)
            ? withoutOpt
            : [...withoutOpt, confirmed];
          cacheRoomMsgs(sentRoom, next);
        }
        // Re-fetch this room only; merge so a laggy list never drops the just-sent message.
        void listMsgs({ data: { roomId: sentRoom } })
          .then((pack) => {
            // Ignore if a newer send for this room already superseded this reconcile.
            if ((sendSeqByRoomRef.current[sentRoom] ?? 0) !== sendSeq) return;
            const p = asPack(pack);
            if (packFailed(p)) return;
            const server = p.msgs ?? [];
            const pending = listPending(sentRoom);
            const merged = mergePreservingPending(server, pending, [confirmed]);
            // Belt: always keep this confirmed even if pending was cleared early.
            const withConfirmed = merged.some((m) => m.ts === confirmed.ts)
              ? merged
              : mergeByTs(merged, [confirmed]);
            reconcilePending(sentRoom, server);
            cacheRoomMsgs(sentRoom, withConfirmed);
            for (const m of withConfirmed) noteServerTip(sentRoom, m.ts);
            // Never paint another room's list onto the active thread.
            if (!stillHere()) return;
            setHasOlder(!!p.older);
            setHasNewer(!!p.newer);
            if (p.online) setOnline(p.online);
            if (p.typing) setTyping(p.typing);
            msgsRef.current = withConfirmed;
            setMsgs(withConfirmed);
          })
          .catch(() => undefined);
        note(`Sent in ${ROOMS.find((x) => x.id === sentRoom)?.name ?? sentRoom}`);
        return true;
      } catch (e: unknown) {
        dropPending(sentRoom, (p) => p.id === pendingId);
        if (stillHere()) {
          setMsgs((prev) => {
            const next = prev.filter((m) => m.ts !== optimisticTs);
            msgsRef.current = next;
            msgsByRoomRef.current[sentRoom] = next;
            return next;
          });
        } else {
          const cur = (msgsByRoomRef.current[sentRoom] ?? []).filter((m) => m.ts !== optimisticTs);
          msgsByRoomRef.current[sentRoom] = cur;
          saveJson(`msgs.${sentRoom}`, cur);
        }
        const msg =
          e instanceof Error && (e.message === "Unauthorized" || e.name === "UnauthorizedError")
            ? "Sign in to chat."
            : e instanceof Error && e.message
              ? e.message
              : "Could not send. Try again.";
        if (stillHere()) setChatErr(msg);
        note(msg);
        return false;
      }
    },
    [
      bumpSendSeq,
      cacheRoomMsgs,
      dropPending,
      handle,
      hasNewer,
      listPending,
      note,
      noteServerTip,
      reconcilePending,
      roomId,
      session.user,
      upsertPending,
    ],
  );

  const bumpPresence = useCallback(
    (typingOn: boolean) => {
      if (!session.user && !authed) return;
      if (typeof document !== "undefined" && document.hidden) return;
      // Callers only invoke from Chat UI; do not gate on chatLive (races setChatLive).
      const now = Date.now();
      // typing: 14s throttle; non-typing: min 50s between presence POSTs (Hobby stretch)
      if (now - lastPing.current < (typingOn ? 14_000 : 50_000)) return;
      lastPing.current = now;
      void pingPresence({ data: { roomId, typing: typingOn } })
        .then((p) => {
          if (p.online) setOnline(p.online);
          if (p.typing) setTyping(p.typing);
        })
        .catch(() => undefined);
    },
    [authed, roomId, session.user],
  );

  const olderChat = useCallback(() => {
    const first = msgs[0];
    if (!first) return;
    const want = roomId;
    void listMsgs({ data: { roomId: want, before: first.ts } }).then((pack) => {
      if (roomIdRef.current !== want) return;
      const p = asPack(pack);
      if (packFailed(p)) return;
      if (!p.msgs.length) {
        setHasOlder(false);
        return;
      }
      const pending = listPending(want);
      const merged = mergePreservingPending(p.msgs, pending);
      reconcilePending(want, p.msgs);
      msgsRef.current = merged;
      setMsgs(merged);
      cacheRoomMsgs(want, merged);
      setHasOlder(!!p.older);
      setHasNewer(true);
    }).catch(() => undefined);
  }, [cacheRoomMsgs, chatHours, listPending, msgs, reconcilePending, roomId]);

  const newerChat = useCallback(() => {
    const last = msgs[msgs.length - 1];
    const want = roomId;
    if (!last || !hasNewer) {
      void listMsgs({ data: { roomId: want } }).then((pack) => {
        if (roomIdRef.current !== want) return;
        const p = asPack(pack);
        if (packFailed(p)) return;
        const pending = listPending(want);
        const merged = mergePreservingPending(p.msgs, pending);
        reconcilePending(want, p.msgs);
        msgsRef.current = merged;
        setMsgs(merged);
        cacheRoomMsgs(want, merged);
        for (const m of p.msgs) noteServerTip(want, m.ts);
        setHasOlder(!!p.older);
        setHasNewer(!!p.newer);
      }).catch(() => undefined);
      return;
    }
    const afterTs = tipTsByRoomRef.current[want] || last.ts;
    void listMsgs({ data: { roomId: want, after: afterTs } }).then((pack) => {
      if (roomIdRef.current !== want) return;
      const p = asPack(pack);
      if (packFailed(p)) return;
      if (!p.msgs.length || !p.newer) {
        void listMsgs({ data: { roomId: want } }).then((live) => {
          if (roomIdRef.current !== want) return;
          const l = asPack(live);
          if (packFailed(l)) return;
          const pending = listPending(want);
          const merged = mergePreservingPending(l.msgs, pending);
          reconcilePending(want, l.msgs);
          msgsRef.current = merged;
          setMsgs(merged);
          cacheRoomMsgs(want, merged);
          for (const m of l.msgs) noteServerTip(want, m.ts);
          setHasOlder(!!l.older);
          setHasNewer(false);
        }).catch(() => undefined);
        return;
      }
      const pending = listPending(want);
      const merged = mergePreservingPending(p.msgs, pending);
      reconcilePending(want, p.msgs);
      msgsRef.current = merged;
      setMsgs(merged);
      cacheRoomMsgs(want, merged);
      for (const m of p.msgs) noteServerTip(want, m.ts);
      setHasOlder(true);
      setHasNewer(!!p.newer);
    }).catch(() => undefined);
  }, [cacheRoomMsgs, chatHours, hasNewer, listPending, noteServerTip, reconcilePending, msgs, roomId]);

  /** One gesture → one saveRx until settled (+ short cooldown absorbs click/touch double-fire). */
  const react = useCallback(
    (ts: number, kind: string) => {
      const key = `${roomId}|${ts}|${kind}`;
      if (rxInFlightRef.current.has(key)) return;
      rxInFlightRef.current.add(key);
      void saveRx({ data: { roomId, ts, kind } })
        .then((r) => {
          const n = r && typeof r === "object" && "n" in r ? Number(r.n) : NaN;
          if (!Number.isFinite(n)) return;
          setMsgs((prev) => {
            const next = prev.map((m) => {
              if (m.ts !== ts) return m;
              return { ...m, rx: { ...(m.rx ?? {}), [kind]: n } };
            });
            msgsRef.current = next;
            if (roomId) msgsByRoomRef.current[roomId] = next;
            return next;
          });
        })
        .finally(() => {
          window.setTimeout(() => rxInFlightRef.current.delete(key), 450);
        });
    },
    [roomId],
  );

  const flagPost = useCallback(
    (postId: string, reason: string) => {
      if (!needAccount()) return;
      void reportPost({ data: { postId, reason } }).catch(() => undefined);
      note("Report sent to staff");
    },
    [needAccount, note],
  );

  const purgeChat = useCallback(() => {
    setMsgs([]);
    void purgeMsgs({ data: roomId }).catch(() => undefined);
    note(`Chat purged in ${ROOMS.find((r) => r.id === roomId)?.name ?? roomId}`);
  }, [note, roomId]);

  const pinRoom = useCallback(() => {
    setPins((prev) => {
      const next = [roomId, ...prev.filter((p) => p !== roomId)].slice(0, 30);
      saveJson("pins", next);
      return next;
    });
    void savePin({ data: { roomId, on: true } }).catch(() => undefined);
    note(`Bookmarked ${ROOMS.find((r) => r.id === roomId)?.name ?? roomId}`);
  }, [note, roomId]);

  const unpin = useCallback((id: string) => {
    setPins((prev) => {
      const next = prev.filter((p) => p !== id);
      saveJson("pins", next);
      return next;
    });
    void savePin({ data: { roomId: id, on: false } }).catch(() => undefined);
  }, []);

  const publishPost = useCallback(
    (draft: {
      title: string;
      body: string;
      excerpt?: string;
      category?: string;
      tags?: string;
      link?: string;
      image?: string;
      slug?: string;
      status?: "draft" | "publish";
      seoTitle?: string;
      seoDesc?: string;
      altText?: string;
      sourceName?: string;
      commentsOn?: boolean;
    }) => {
      const t = draft.title.trim();
      const b = draft.body.trim();
      if (!t || !b) return;
      if (!needAccount()) return;
      const who = session.user?.displayName || ensureHandle();
      const item: Post = {
        id: uid(),
        title: t,
        body: b,
        excerpt: draft.excerpt?.trim() || postBodyPlain(b).slice(0, 140),
        author: who,
        ts: Date.now(),
        comments: [],
        category: draft.category,
        tags: draft.tags?.trim(),
        link: draft.link,
        image: draft.image,
        slug: draft.slug,
        status: draft.status ?? "publish",
        commentsOn: draft.commentsOn !== false,
      };
      setPosts((prev) => [item, ...prev]);
      void savePost({
        data: {
          title: t,
          body: b,
          excerpt: item.excerpt,
          category: draft.category,
          tags: draft.tags,
          link: draft.link,
          image: draft.image,
          slug: draft.slug,
          seoTitle: draft.seoTitle,
          seoDesc: draft.seoDesc,
          altText: draft.altText,
          sourceName: draft.sourceName,
          status: draft.status ?? "publish",
          commentsOn: draft.commentsOn !== false,
        },
      }).then((r) => {
        if (r && "ok" in r && r.ok === false) {
          setPosts((prev) => prev.filter((p) => p?.id !== item.id));
          note(r.reason);
          return;
        }
        if (r && "id" in r && r.id) {
          const real = String(r.id);
          setPosts((prev) => prev.map((p) => (p.id === item.id ? { ...p, id: real } : p)));
          setOpenPost((cur) => (cur === item.id ? real : cur));
        }
      }).catch(() => undefined);
      if (item.status === "publish") {
        setOpenPost(item.id);
        note(`New feed posted: “${t}”`);
      } else {
        note(`Draft saved: “${t}”`);
      }
    },
    [ensureHandle, needAccount, note, session.user],
  );

  const commentPost = useCallback(
    (postId: string, body: string, parentTs?: number) => {
      const text = body.trim();
      if (!text) return;
      if (!needAccount()) return;
      const who = session.user?.displayName || ensureHandle();
      const ts = Date.now();
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, comments: [...(p.comments ?? []), { author: who, body: text, ts, parentTs }] } : p,
        ),
      );
      void saveComment({ data: { postId, body: text, parentTs } }).then((r) => {
        if (r && "ok" in r && r.ok === false) {
          setPosts((prev) =>
            prev.map((p) => (p.id === postId ? { ...p, comments: (p.comments ?? []).filter((c) => c.ts !== ts) } : p)),
          );
          note(r.reason);
        }
      }).catch(() => undefined);
    },
    [ensureHandle, needAccount, note, session.user],
  );

  const see = useCallback((table: "posts" | "ads" | "tracks", id: string) => {
    if (table === "posts") setPosts((prev) => prev.map((p) => (p?.id === id ? { ...p, views: (p.views ?? 0) + 1 } : p)));
    if (table === "ads") setCampaigns((prev) => prev.map((a) => (a?.id === id ? { ...a, views: (a.views ?? 0) + 1 } : a)));
    if (table === "tracks") setTracks((prev) => prev.map((t) => (t?.id === id ? { ...t, views: (t.views ?? 0) + 1 } : t)));
    void bumpView({ data: { table, id } }).catch(() => undefined);
  }, []);

  const likePost = useCallback((id: string) => {
    setLikes((prev) => {
      const mine = loadJson<string[]>("likedIds", []);
      const has = mine.includes(id);
      saveJson("likedIds", has ? mine.filter((x) => x !== id) : [...mine, id]);
      const next = { ...prev, [id]: Math.max(0, (prev[id] ?? 0) + (has ? -1 : 1)) };
      saveJson("postLikes", next);
      return next;
    });
  }, []);

  const dropMsg = useCallback((ts: number) => {
    const room = roomId;
    setMsgs((prev) => {
      const next = prev.filter((m) => m.ts !== ts);
      msgsRef.current = next;
      msgsByRoomRef.current[room] = next;
      return next;
    });
    void deleteOwnMsg({ data: { roomId: room, ts } }).then((r) => {
      if (!r.ok) note("That message stayed. Try again.");
    }).catch(() => note("That message stayed. Try again."));
  }, [note, roomId]);

  const savePostMark = useCallback((id: string) => {
    setSavedPosts((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [id, ...prev];
      saveJson("savedPosts", next);
      return next;
    });
  }, []);

  const sharePost = useCallback((id: string) => {
    setShares((prev) => {
      const next = { ...prev, [id]: (prev[id] ?? 0) + 1 };
      saveJson("postShares", next);
      return next;
    });
  }, []);

  const createTeam = useCallback(
    (name: string) => {
      const n = name.trim();
      if (!n) return;
      if (!needAccount()) return;
      const who = session.user?.displayName || ensureHandle();
      const item = { id: uid(), name: n, members: [who] };
      setTeams((prev) => [item, ...prev]);
      void saveTeam({ data: { name: n } }).then((r) => {
        if (r && "ok" in r && r.ok === false) {
          setTeams((prev) => prev.filter((t) => t.id !== item.id));
          note(r.reason);
        } else if (r && "id" in r && r.id) {
          setTeams((prev) => prev.map((t) => (t.id === item.id ? { ...t, id: String(r.id) } : t)));
        }
      }).catch(() => undefined);
      note(`Created team ${n}`);
    },
    [ensureHandle, needAccount, note, session.user],
  );

  const joinTeam = useCallback(
    (id: string) => {
      if (!needAccount()) return;
      const who = session.user?.displayName || ensureHandle();
      setTeams((prev) =>
        prev.map((t) => (t?.id === id && !(t.members ?? []).includes(who) ? { ...t, members: [...(t.members ?? []), who] } : t)),
      );
      void joinTeamRow({ data: id }).catch(() => undefined);
    },
    [ensureHandle, needAccount, session.user],
  );

  const saveAd = useCallback(
    (name: string, text: string, extra?: Partial<Campaign>) => {
      const n = name.trim();
      if (!n) return;
      if (!needAccount()) return;
      const row = {
        id: uid(),
        name: n,
        note: text.trim(),
        ts: Date.now(),
        status: "pending" as const,
        placement: extra?.placement ?? "board",
        txHash: extra?.txHash,
        amount: extra?.amount,
        coin: extra?.coin,
        link: extra?.link,
        image: extra?.image,
        video: extra?.video,
        kind: extra?.kind ?? "image-text",
        views: 0,
        days: extra?.days ?? 7,
      } as Campaign;
      setCampaigns((prev) => [row, ...prev]);
      return saveAdRow({
        data: {
          name: n,
          note: text.trim(),
          placement: row.placement,
          amount: extra?.amount,
          txHash: extra?.txHash,
          coin: extra?.coin,
          link: extra?.link,
          image: extra?.image,
          kind: extra?.kind,
          video: extra?.video,
          days: extra?.days,
        },
      }).then((r) => {
        if (r && typeof r === "object" && "ok" in r && r.ok === false) {
          setCampaigns((prev) => prev.filter((c) => c.id !== row.id));
          note(r.reason);
          return false;
        }
        if (r && typeof r === "object" && "status" in r && typeof r.status === "string") {
          const expiresAt = "expiresAt" in r && typeof r.expiresAt === "number" ? r.expiresAt : undefined;
          setCampaigns((prev) => prev.map((c) => (c.id === row.id ? { ...c, status: r.status as Campaign["status"], expiresAt: expiresAt ?? c.expiresAt } : c)));
          note(r.status === "approved" ? `Live on ${row.placement}: ${n}` : `Ad submitted: ${n}`);
          return r.status === "approved";
        }
        return false;
      }).catch(() => false);
    },
    [needAccount, note],
  );

  const runOwnAd = useCallback((id: string, action: "pause" | "resume" | "end") => {
    return setOwnAdRun({ data: { id, action } }).then((r) => {
      if (r.ok) setCampaigns((prev) => prev.map((c) => (c?.id === id ? { ...c, status: r.status, expiresAt: action === "end" ? Date.now() : c.expiresAt } : c)));
      return r;
    });
  }, []);

  const patchAd = useCallback((id: string, patch: Partial<Campaign>) => {
    setCampaigns((prev) => prev.map((c) => (c?.id === id ? { ...c, ...patch } : c)));
    if (patch.status === "pending" || patch.status === "paid" || patch.status === "approved" || patch.status === "rejected") {
      void setAdStatus({ data: { id, status: patch.status } }).catch(() => undefined);
    }
    if (patch.placement) {
      void setAdPlacement({ data: { id, placement: String(patch.placement) } }).catch(() => undefined);
    }
    if (typeof patch.days === "number") {
      void setAdWindow({ data: { id, days: patch.days } }).catch(() => undefined);
    }
  }, []);

  const publishTrack = useCallback(
    (draft: {
      title: string;
      artist: string;
      url: string;
      cover?: string;
      genre?: string;
      album?: string;
      note?: string;
      tags?: string;
    }) => {
      const parsed = parseMusicUrl(draft.url);
      if (!parsed) return;
      if (!needAccount()) return;
      const who = session.user?.displayName || ensureHandle();
      const item: MusicTrack = {
        id: uid(),
        title: draft.title.trim() || "Untitled",
        artist: draft.artist.trim() || who,
        url: parsed.url,
        platform: parsed.platform,
        embed: parsed.embed,
        cover: draft.cover,
        genre: draft.genre,
        album: draft.album,
        note: draft.note,
        tags: draft.tags,
        author: who,
        ts: Date.now(),
      };
      setTracks((prev) => [item, ...prev]);
      void saveTrack({
        data: {
          title: item.title,
          artist: item.artist,
          url: item.url,
          platform: item.platform,
          embed: item.embed,
          cover: item.cover,
          genre: item.genre,
          album: item.album,
          note: item.note,
          tags: item.tags,
        },
      }).catch(() => undefined);
      setOpenTrack(item.id);
      note(`Music listed: “${item.title}”`);
    },
    [ensureHandle, needAccount, note, session.user],
  );

  const reset = useCallback(() => {
    clearAll();
    setHandle("");
    setRoomId("lounge");
    setMsgs([]);
    setPosts([]);
    setPins([]);
    setNotes([]);
    setTeams([]);
    setCampaigns([]);
    setJoins([]);
    setTracks([]);
    setOpenPost(null);
    setOpenTrack(null);
  }, []);

  const scores = board.length
    ? Object.fromEntries(board.map((r) => [r.name, r.n]))
    : allRoomMessages().reduce<Record<string, number>>((acc, m) => {
        acc[m.n] = (acc[m.n] ?? 0) + 1;
        return acc;
      }, {});

  const badges = [
    { id: "msg", label: "First message", on: allRoomMessages().some((m) => m.n === handle) },
    { id: "pin", label: "Bookmarker", on: pins.length > 0 },
    { id: "post", label: "Feeds starter", on: posts.some((p) => !!p?.id && p.author === handle) },
    { id: "team", label: "Teammate", on: teams.some((t) => !!t?.id && (t.members ?? []).includes(handle)) },
    { id: "travel", label: "World traveler", on: pins.length >= 5 },
  ];

  return {
    ready,
    handle,
    verified,
    roomId,
    msgs,
    msgsLoading,
    posts,
    pins,
    notes,
    note,
    teams,
    campaigns,
    joins,
    tracks,
    openPost,
    setOpenPost,
    openTrack,
    setOpenTrack,
    scores,
    loadTracks,
    loadChatClock,
    loadScores,
    badges,
    openRoom,
    rename,
    send,
    dropMsg,
    chatErr,
    clearChatErr: () => setChatErr(""),
    bumpPresence,
    setChatLive,
    online,
    typing,
    olderChat,
    newerChat,
    hasOlder,
    hasNewer,
    chatHours,
    livePausedUntil,
    livePausedReason,
    react,
    purgeChat,
    pinRoom,
    unpin,
    publishPost,
    publishTrack,
    commentPost,
    see,
    likePost,
    savePostMark,
    sharePost,
    savedPosts,
    likes,
    shares,
    createTeam,
    joinTeam,
    saveAd,
    patchAd,
    runOwnAd,
    hidePost,
    pushPost,
    flagPost,
    sendContact,
    reset,
    authed,
    authErr,
    register,
    login,
    logout,
    setJoinHandle: rename,
    bio,
    city,
    kind,
    face,
    setFace,
    stage,
    genre,
    website,
    interests,
    langs,
    onboarded,
    finishOnboard,
    brand,
  };
}
