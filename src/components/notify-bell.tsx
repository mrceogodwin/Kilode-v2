import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { listNotes, markNotesRead } from "@/lib/social-server";
import { replyConnect } from "@/lib/takes-server";
import { timeAgo, type Post } from "@/lib/qonvo-data";

export function NotifyBell({
  signedIn,
  posts,
  unread = 0,
  onOpenNotes,
  onOpenInbox,
  onOpenPost,
  onOpenFriends,
}: {
  signedIn: boolean;
  posts: Post[];
  unread?: number;
  onOpenNotes: () => void;
  onOpenInbox?: () => void;
  onOpenFriends?: () => void;
  onOpenPost: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [acked, setAcked] = useState(false);
  const [perm, setPerm] = useState<NotificationPermission | "unsupported">("default");
  const [notes, setNotes] = useState<{ id: string; text: string; href?: string; ts: number; seen?: number }[]>([]);
  useEffect(() => {
    if (typeof Notification === "undefined") setPerm("unsupported");
    else setPerm(Notification.permission);
  }, []);
  useEffect(() => {
    if (!signedIn || !open) return;
    let dead = false;
    void listNotes()
      .then((rows) => {
        if (dead) return;
        setNotes(rows.map((n) => ({ ...n, seen: 1 })));
        setAcked(true);
        void markNotesRead();
      })
      .catch(() => {
        if (!dead) setNotes([]);
      });
    return () => {
      dead = true;
    };
  }, [signedIn, open]);
  const latest = posts.filter((p) => p.status !== "draft").slice(0, 8);
  const liveUnread = notes.filter((n) => !n.seen).length;
  const badge = !signedIn ? 0 : acked ? liveUnread : Math.max(unread, liveUnread);

  function openNote(n: { href?: string; text: string }) {
    setOpen(false);
    if (n.href?.includes("open=friends") || /wants to connect/i.test(n.text) || /accepted your connect/i.test(n.text)) {
      onOpenFriends?.();
      return;
    }
    if (n.href?.includes("open=inbox")) {
      onOpenInbox?.();
      return;
    }
    if (n.href && n.href !== "/" && n.href !== "#" && !n.href.includes("open=me")) window.location.href = n.href;
  }

  async function allow() {
    if (typeof Notification === "undefined") {
      setPerm("unsupported");
      return;
    }
    const p = await Notification.requestPermission();
    setPerm(p);
    try {
      localStorage.setItem("kilode-notify", p === "granted" ? "1" : "0");
    } catch {
      /* ignore */
    }
    if (p === "granted" && latest[0]) {
      try {
        new Notification("Kilode", { body: latest[0].title, icon: "/kilode-bang-icon.png" });
      } catch {
        /* ignore */
      }
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        className="hdr-ico relative"
        aria-label="Notifications"
        onClick={() => setOpen((v) => !v)}
      >
        <Bell className="size-4" />
        {badge > 0 ? <span className="absolute top-1 right-1 size-1.5 rounded-full bg-[#ef4444]" /> : null}
      </button>
      {open ? (
        <div className="fixed top-[calc(env(safe-area-inset-top,0px)+4.75rem)] right-2 z-50 w-[min(340px,calc(100vw-1rem))] overflow-hidden rounded-2xl border border-line bg-panel shadow-2xl">
          <div className="flex items-center justify-between border-b border-line px-3 py-2">
            <div className="text-[11px] font-bold">{signedIn ? "Your alerts" : "Latest on Kilode"}</div>
            {signedIn ? (
              <button type="button" className="text-[10px] text-lime-2" onClick={() => { onOpenNotes(); setOpen(false); }}>
                All
              </button>
            ) : null}
          </div>
          {!signedIn ? (
            <div className="border-b border-line px-3 py-2">
              <p className="text-[11px] leading-snug text-muted">
                Allow this browser to ping you when a new post loads while you have Kilode open. No email.
              </p>
              <button type="button" className="btn-3d mt-2 rounded-lg px-2.5 py-1 text-[11px] font-semibold" onClick={() => void allow()}>
                {perm === "granted" ? "Allowed on this device" : perm === "denied" ? "Blocked in browser settings" : perm === "unsupported" ? "Not supported here" : "Allow updates"}
              </button>
            </div>
          ) : null}
          <div className="max-h-72 overflow-y-auto">
            {signedIn
              ? (notes.length ? notes.slice(0, 12).map((n) => {
                  const ask = /wants to connect/i.test(n.text);
                  const handle = (/@([A-Za-z0-9._-]+)/.exec(n.text) || [])[1] || "";
                  return (
                    <div key={n.id} className="border-b border-white/5 px-3 py-2">
                      <button type="button" onClick={() => openNote(n)} className="block w-full text-left text-[12px]">
                        {n.text}
                        <span className="mt-0.5 block text-[9px] text-muted">{timeAgo(n.ts)}</span>
                      </button>
                      {ask && handle ? (
                        <button
                          type="button"
                          className="mt-1 rounded-full border border-white/20 px-2.5 py-1 text-[11px] font-bold"
                          onClick={() => {
                            void replyConnect({ data: { id: handle, accept: true } }).then((r) => {
                              if (!r.ok) return;
                              setNotes((list) => list.filter((x) => x.id !== n.id));
                              setOpen(false);
                              onOpenFriends?.();
                            });
                          }}
                        >
                          Accept
                        </button>
                      ) : null}
                    </div>
                  );
                }) : <p className="px-3 py-4 text-[12px] text-muted">Quiet. Messages and replies land here.</p>)
              : latest.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className="flex w-full items-center gap-2 border-b border-white/5 px-3 py-2 text-left hover:bg-panel-2"
                    onClick={() => {
                      onOpenPost(p.id);
                      setOpen(false);
                    }}
                  >
                    {p.image ? <img src={p.image} alt="" className="h-9 w-11 rounded-md object-cover" /> : <div className="h-9 w-11 rounded-md bg-panel-3" />}
                    <span className="line-clamp-2 text-[11px] font-semibold leading-snug">{p.title}</span>
                  </button>
                ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
