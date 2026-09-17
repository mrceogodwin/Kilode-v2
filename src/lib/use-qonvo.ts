import { useCallback, useEffect, useRef, useState } from "react";
import {
  ROOMS,
  allRoomMessages,
  asAccountKind,
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
import { DEMO_ADS, DEMO_JOINS, DEMO_NOTES, DEMO_POSTS, DEMO_TRACKS } from "@/lib/qonvo-seed";
import { bumpView, getChatTtl, getProfile, joinTeamRow, listAds, listJoins, listMsgs, listPins, listPosts, listScores, listTeams, listTracks, pingPresence, purgeMsgs, reportPost, saveAdRow, saveComment, saveJoin, saveMsg, savePin, savePost, saveProfile, saveRx, saveTeam, saveTrack, sendMail } from "@/lib/forum-server";
import { listNotes } from "@/lib/social-server";
import { hidePost as hidePostRow, setAdPlacement, setAdStatus } from "@/lib/staff-server";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { publicUsername } from "@/lib/account-email";

function guestName() {
  return `Guest#${Math.floor(1000 + Math.random() * 9000)}`;
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
};

function asPack(r: MsgPack | ChatMsg[]): MsgPack {
  return Array.isArray(r) ? { msgs: r, older: false, newer: false, hours: 24, online: [], typing: [] } : r;
}

function passKey(name: string, pass: string) {
  return `${name.toLowerCase()}::${pass}`;
}

export function useQonvo() {
  const session = useCurrentUserState();
  const [ready, setReady] = useState(false);
  const [handle, setHandle] = useState("");
  const [roomId, setRoomId] = useState("global");
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
  const [authErr, setAuthErr] = useState("");
  const [bio, setBio] = useState("");
  const [city, setCity] = useState("");
  const [hasOlder, setHasOlder] = useState(false);
  const [hasNewer, setHasNewer] = useState(false);
  const [chatHours, setChatHours] = useState(24);
  const [kind, setKind] = useState<AccountKind>("member");
  const [stage, setStage] = useState("");
  const [genre, setGenre] = useState("");
  const [website, setWebsite] = useState("");
  const [brand, setBrand] = useState("");
  const [board, setBoard] = useState<{ name: string; n: number }[]>([]);
  const [online, setOnline] = useState<PresenceUser[]>([]);
  const [typing, setTyping] = useState<string[]>([]);
  const msgsRef = useRef<ChatMsg[]>([]);
  const hasNewerRef = useRef(false);
  const lastPing = useRef(0);

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
    setRoomId(loadJson("room", "global"));
    const posts0 = loadJson<Post[]>("posts", []);
    const ads0 = loadJson<Campaign[]>("ads", []);
    const notes0 = loadJson<Note[]>("notes", []);
    const joins0 = loadJson<Join[]>("joins", []);
    const posts = [
      ...DEMO_POSTS.filter((d) => !posts0.some((p) => p.id === d.id)),
      ...posts0.map((p) => {
        const demo = DEMO_POSTS.find((d) => d.id === p.id);
        return demo ? { ...p, image: demo.image } : p;
      }),
    ];
    const ads = [
      ...DEMO_ADS.filter((d) => !ads0.some((p) => p.id === d.id)),
      ...ads0,
    ];
    setPosts(posts);
    saveJson("posts", posts);
    setCampaigns(
      ads.map((c) => ({
        ...c,
        status: c.status ?? "pending",
        placement: c.placement ?? "sidebar",
      })),
    );
    saveJson("ads", ads);
    const notes = notes0.length ? notes0 : DEMO_NOTES;
    const joins = joins0.length ? joins0 : DEMO_JOINS;
    setNotes(notes);
    setJoins(joins);
    if (!notes0.length) saveJson("notes", notes);
    if (!joins0.length) saveJson("joins", joins);
    setPins(loadJson("pins", []));
    setSavedPosts(loadJson("savedPosts", []));
    setLikes(loadJson("postLikes", {}));
    setShares(loadJson("postShares", {}));
    setTeams(loadJson("teams", []));
    const tracks0 = loadJson<MusicTrack[]>("tracks", []);
    const tracks = [
      ...DEMO_TRACKS.filter((d) => !tracks0.some((t) => t.id === d.id)),
      ...tracks0.map((t) => {
        const demo = DEMO_TRACKS.find((d) => d.id === t.id);
        return demo ?? t;
      }),
    ].filter((t) => !!parseMusicUrl(t.url));
    setTracks(tracks);
    saveJson("tracks", tracks);
    setReady(true);
    void Promise.all([listPosts(), listTracks(), listAds()])
      .then(([dbPosts, dbTracks, dbAds]) => {
        if (dbPosts.length) {
          setPosts(
            dbPosts.map((p) => ({
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
            })),
          );
        }
        if (dbTracks.length) {
          setTracks(
            dbTracks.map((t) => ({
              ...t,
              embed: t.embed ?? undefined,
              cover: t.cover ?? undefined,
              genre: t.genre ?? undefined,
              album: t.album ?? undefined,
              note: t.note ?? undefined,
              tags: t.tags ?? undefined,
            })),
          );
        }
        if (dbAds.length) setCampaigns(dbAds);
      })
      .catch(() => undefined);
    void listScores()
      .then(setBoard)
      .catch(() => undefined);
    void listJoins()
      .then((rows) => {
        if (rows.length) setJoins(rows);
      })
      .catch(() => undefined);
    void getChatTtl()
      .then((r) => setChatHours(r.hours))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!ready) return;
    void listMsgs({ data: { roomId } })
      .then((r) => {
        const pack = asPack(r);
        setMsgs(pack.msgs);
        setHasOlder(!!pack.older);
        setHasNewer(!!pack.newer);
        if (typeof pack.hours === "number") setChatHours(pack.hours);
        if (pack.online) setOnline(pack.online);
        if (pack.typing) setTyping(pack.typing);
      })
      .catch(() => setMsgs(loadJson(`msgs.${roomId}`, [])));
  }, [roomId, ready]);

  useEffect(() => {
    msgsRef.current = msgs;
  }, [msgs]);
  useEffect(() => {
    hasNewerRef.current = hasNewer;
  }, [hasNewer]);

  useEffect(() => {
    if (!ready) return;
    let dead = false;
    const tick = () => {
      if (dead || (typeof document !== "undefined" && document.hidden)) return;
      const last = msgsRef.current[msgsRef.current.length - 1];
      const payload = hasNewerRef.current || !last ? { roomId } : { roomId, after: last.ts };
      void listMsgs({ data: payload })
        .then((r) => {
          if (dead) return;
          const pack = asPack(r);
          if (pack.online) setOnline(pack.online);
          if (pack.typing) setTyping(pack.typing);
          if (typeof pack.hours === "number") setChatHours(pack.hours);
          if (hasNewerRef.current) return;
          if (!last) {
            if (pack.msgs.length) {
              setMsgs(pack.msgs);
              setHasOlder(!!pack.older);
              setHasNewer(!!pack.newer);
            }
            return;
          }
          if (!pack.msgs.length) return;
          const known = new Set(msgsRef.current.map((m) => m.ts));
          const extra = pack.msgs.filter((m) => !known.has(m.ts));
          if (!extra.length) return;
          setMsgs((prev) => [...prev, ...extra].slice(-80));
          setHasNewer(!!pack.newer);
        })
        .catch(() => undefined);
    };
    const id = window.setInterval(tick, 6500);
    const onVis = () => {
      if (!document.hidden) tick();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      dead = true;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [ready, roomId]);

  useEffect(() => {
    if (session.isPending) return;
    if (session.user) {
      const name = publicUsername(session.user.displayName || session.user.primaryEmail || session.user.id.slice(0, 16));
      setHandle(name);
      setAuthed(true);
      saveJson("me", name);
      saveJson("authed", name);
      void listPins()
        .then(setPins)
        .catch(() => undefined);
      void listTeams()
        .then(setTeams)
        .catch(() => undefined);
      void listNotes()
        .then((rows) => {
          if (rows.length) setNotes(rows);
        })
        .catch(() => undefined);
      void getProfile()
        .then((p) => {
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
          try {
            const pending = sessionStorage.getItem("nf_account");
            if (pending) {
              sessionStorage.removeItem("nf_account");
              const extra = JSON.parse(pending) as { kind?: string; stage?: string; genre?: string; website?: string; brand?: string };
              const nextKind = asAccountKind(extra.kind);
              setKind(nextKind);
              if (extra.stage) setStage(extra.stage);
              if (extra.genre) setGenre(extra.genre);
              if (extra.website) setWebsite(extra.website);
              if (extra.brand) setBrand(extra.brand);
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
  }, [session.isPending, session.user]);

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
    saveJson("authed", "");
    setAuthed(false);
  }, []);

  const needAccount = useCallback(() => {
    if (session.user || (authed && handle)) return true;
    note("Register or sign in to do that.");
    return false;
  }, [authed, handle, note, session.user]);

  const rename = useCallback((name: string, extra?: { bio?: string; city?: string; kind?: AccountKind; stage?: string; genre?: string; website?: string; brand?: string }) => {
    const next = name.trim().slice(0, 24);
    if (!next) return;
    setHandle(next);
    saveJson("me", next);
    if (extra?.bio !== undefined) setBio(extra.bio);
    if (extra?.city !== undefined) setCity(extra.city);
    if (extra?.kind !== undefined) setKind(extra.kind);
    if (extra?.stage !== undefined) setStage(extra.stage);
    if (extra?.genre !== undefined) setGenre(extra.genre);
    if (extra?.website !== undefined) setWebsite(extra.website);
    if (extra?.brand !== undefined) setBrand(extra.brand);
    void saveProfile({
      data: {
        handle: next,
        bio: extra?.bio ?? bio,
        city: extra?.city ?? city,
        kind: extra?.kind ?? kind,
        stage: extra?.stage ?? stage,
        genre: extra?.genre ?? genre,
        website: extra?.website ?? website,
        brand: extra?.brand ?? brand,
      },
    }).catch(() => undefined);
    recordJoin(next, roomId);
    note(`Handle set to ${next}`);
  }, [bio, brand, city, genre, kind, note, recordJoin, roomId, stage, website]);

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

  const hidePost = useCallback((id: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== id));
    if (openPost === id) setOpenPost(null);
    void hidePostRow({ data: id }).catch(() => undefined);
    note("Post hidden");
  }, [note, openPost]);

  const send = useCallback(
    (text: string, parentTs?: number) => {
      const body = text.trim();
      if (!body) return;
      if (!needAccount()) return;
      void saveMsg({ data: { roomId, text: body, parentTs } }).then((r) => {
        if (!r || ("ok" in r && r.ok === false)) {
          note(("reason" in (r ?? {}) ? (r as { reason: string }).reason : null) || "Blocked by the moderator.");
          return;
        }
        const row = r as { n: string; t?: string; ts: number; parentTs?: number; parentN?: string; parentT?: string };
        if (hasNewer) {
          void listMsgs({ data: { roomId } }).then((pack) => {
            const p = asPack(pack);
            setMsgs(p.msgs);
            setHasOlder(!!p.older);
            setHasNewer(!!p.newer);
            if (p.online) setOnline(p.online);
            if (p.typing) setTyping(p.typing);
          }).catch(() => undefined);
        } else {
          const parent = parentTs ? msgsRef.current.find((m) => m.ts === parentTs) : undefined;
          setMsgs((prev) => [
            ...prev,
            {
              n: row.n,
              t: row.t ?? body,
              ts: row.ts,
              rx: {},
              parentTs: row.parentTs ?? parentTs,
              parentN: row.parentN ?? parent?.n,
              parentT: row.parentT ?? parent?.t?.slice(0, 80),
            },
          ]);
        }
        note(`Sent in ${ROOMS.find((x) => x.id === roomId)?.name ?? roomId}`);
      }).catch(() => undefined);
    },
    [chatHours, hasNewer, needAccount, note, roomId],
  );

  const bumpPresence = useCallback(
    (typingOn: boolean) => {
      if (!session.user && !authed) return;
      const now = Date.now();
      if (typingOn && now - lastPing.current < 2500) return;
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
    void listMsgs({ data: { roomId, before: first.ts } }).then((pack) => {
      const p = asPack(pack);
      if (!p.msgs.length) {
        setHasOlder(false);
        return;
      }
      setMsgs(p.msgs);
      setHasOlder(!!p.older);
      setHasNewer(true);
    }).catch(() => undefined);
  }, [chatHours, msgs, roomId]);

  const newerChat = useCallback(() => {
    const last = msgs[msgs.length - 1];
    if (!last || !hasNewer) {
      void listMsgs({ data: { roomId } }).then((pack) => {
        const p = asPack(pack);
        setMsgs(p.msgs);
        setHasOlder(!!p.older);
        setHasNewer(!!p.newer);
      }).catch(() => undefined);
      return;
    }
    void listMsgs({ data: { roomId, after: last.ts } }).then((pack) => {
      const p = asPack(pack);
      if (!p.msgs.length || !p.newer) {
        void listMsgs({ data: { roomId } }).then((live) => {
          const l = asPack(live);
          setMsgs(l.msgs);
          setHasOlder(!!l.older);
          setHasNewer(false);
        }).catch(() => undefined);
        return;
      }
      setMsgs(p.msgs);
      setHasOlder(true);
      setHasNewer(!!p.newer);
    }).catch(() => undefined);
  }, [chatHours, hasNewer, msgs, roomId]);

  const react = useCallback(
    (ts: number, kind: string) => {
      setMsgs((prev) =>
        prev.map((m) => {
          if (m.ts !== ts) return m;
          const rx = { ...(m.rx ?? {}) };
          rx[kind] = (rx[kind] ?? 0) + 1;
          return { ...m, rx };
        }),
      );
      void saveRx({ data: { roomId, ts, kind } }).catch(() => undefined);
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
    setPins((prev) => [roomId, ...prev.filter((p) => p !== roomId)].slice(0, 30));
    void savePin({ data: { roomId, on: true } }).catch(() => undefined);
    note(`Bookmarked ${ROOMS.find((r) => r.id === roomId)?.name ?? roomId}`);
  }, [note, roomId]);

  const unpin = useCallback((id: string) => {
    setPins((prev) => prev.filter((p) => p !== id));
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
        excerpt: draft.excerpt?.trim() || b.slice(0, 140),
        author: who,
        ts: Date.now(),
        comments: [],
        category: draft.category,
        tags: draft.tags?.trim(),
        link: draft.link,
        image: draft.image,
        slug: draft.slug,
        status: draft.status ?? "publish",
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
        },
      }).then((r) => {
        if (r && "ok" in r && r.ok === false) {
          setPosts((prev) => prev.filter((p) => p.id !== item.id));
          note(r.reason);
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
          p.id === postId ? { ...p, comments: [...p.comments, { author: who, body: text, ts, parentTs }] } : p,
        ),
      );
      void saveComment({ data: { postId, body: text, parentTs } }).then((r) => {
        if (r && "ok" in r && r.ok === false) {
          setPosts((prev) =>
            prev.map((p) => (p.id === postId ? { ...p, comments: p.comments.filter((c) => c.ts !== ts) } : p)),
          );
          note(r.reason);
        }
      }).catch(() => undefined);
    },
    [ensureHandle, needAccount, note, session.user],
  );

  const see = useCallback((table: "posts" | "ads" | "tracks", id: string) => {
    if (table === "posts") setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, views: (p.views ?? 0) + 1 } : p)));
    if (table === "ads") setCampaigns((prev) => prev.map((a) => (a.id === id ? { ...a, views: (a.views ?? 0) + 1 } : a)));
    if (table === "tracks") setTracks((prev) => prev.map((t) => (t.id === id ? { ...t, views: (t.views ?? 0) + 1 } : t)));
    void bumpView({ data: { table, id } }).catch(() => undefined);
  }, []);

  const likePost = useCallback((id: string) => {
    setLikes((prev) => {
      const next = { ...prev, [id]: (prev[id] ?? 0) + 1 };
      saveJson("postLikes", next);
      return next;
    });
  }, []);

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
      void saveTeam({ data: { name: n } }).catch(() => undefined);
      note(`Created team ${n}`);
    },
    [ensureHandle, needAccount, note, session.user],
  );

  const joinTeam = useCallback(
    (id: string) => {
      if (!needAccount()) return;
      const who = session.user?.displayName || ensureHandle();
      setTeams((prev) =>
        prev.map((t) => (t.id === id && !t.members.includes(who) ? { ...t, members: [...t.members, who] } : t)),
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
        status: extra?.status ?? "pending",
        placement: extra?.placement ?? "board",
        txHash: extra?.txHash,
        amount: extra?.amount,
        coin: extra?.coin,
        link: extra?.link,
        image: extra?.image,
        video: extra?.video,
        kind: extra?.kind ?? "image-text",
        views: 0,
      } as Campaign;
      setCampaigns((prev) => [row, ...prev]);
      void saveAdRow({
        data: {
          name: n,
          note: text.trim(),
          placement: row.placement,
          status: row.status,
          amount: extra?.amount,
          txHash: extra?.txHash,
          coin: extra?.coin,
          link: extra?.link,
          image: extra?.image,
          kind: extra?.kind,
          video: extra?.video,
        },
      }).catch(() => undefined);
      note(`Ad submitted: ${n}`);
    },
    [needAccount, note],
  );

  const patchAd = useCallback((id: string, patch: Partial<Campaign>) => {
    setCampaigns((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
    if (patch.status) {
      void setAdStatus({ data: { id, status: patch.status } }).catch(() => undefined);
    }
    if (patch.placement === "board" || patch.placement === "chat" || patch.placement === "chat-pin") {
      void setAdPlacement({ data: { id, placement: patch.placement } }).catch(() => undefined);
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
    setRoomId("global");
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
    { id: "post", label: "Forum starter", on: posts.some((p) => p.author === handle) },
    { id: "team", label: "Teammate", on: teams.some((t) => t.members.includes(handle)) },
    { id: "travel", label: "World traveler", on: pins.length >= 5 },
  ];

  return {
    ready,
    handle,
    roomId,
    msgs,
    posts,
    pins,
    notes,
    teams,
    campaigns,
    joins,
    tracks,
    openPost,
    setOpenPost,
    openTrack,
    setOpenTrack,
    scores,
    badges,
    openRoom,
    rename,
    send,
    bumpPresence,
    online,
    typing,
    olderChat,
    newerChat,
    hasOlder,
    hasNewer,
    chatHours,
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
    hidePost,
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
    stage,
    genre,
    website,
    brand,
  };
}
