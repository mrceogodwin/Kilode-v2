import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { listNotes } from "@/lib/social-server";
import { timeAgo, type Post } from "@/lib/qonvo-data";

export function NotifyBell({
  signedIn,
  posts,
  onOpenNotes,
  onOpenPost,
}: {
  signedIn: boolean;
  posts: Post[];
  onOpenNotes: () => void;
  onOpenPost: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [perm, setPerm] = useState<NotificationPermission | "unsupported">("default");
  const [notes, setNotes] = useState<{ id: string; text: string; href?: string; ts: number; seen?: number }[]>([]);
  useEffect(() => {
    if (typeof Notification === "undefined") setPerm("unsupported");
    else setPerm(Notification.permission);
  }, []);
  useEffect(() => {
    if (!signedIn || !open) return;
    void listNotes()
      .then(setNotes)
      .catch(() => setNotes([]));
  }, [signedIn, open]);
  const latest = posts.filter((p) => p.status !== "draft").slice(0, 8);
  const badge = signedIn ? notes.filter((n) => !n.seen).length : 0;

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
        className="chrome-ico relative"
        aria-label="Notifications"
        onClick={() => setOpen((v) => !v)}
      >
        <Bell className="size-3.5 text-lime-2" />
        {badge > 0 ? <span className="absolute top-1 right-1 size-1.5 rounded-full bg-lime-2" /> : null}
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
              ? (notes.length ? notes.slice(0, 12).map((n) => (
                  <a key={n.id} href={n.href || "#"} className="block border-b border-white/5 px-3 py-2 text-[12px] hover:bg-panel-2">
                    {n.text}
                    <span className="mt-0.5 block text-[9px] text-muted">{timeAgo(n.ts)}</span>
                  </a>
                )) : <p className="px-3 py-4 text-[12px] text-muted">Quiet. Replies land here.</p>)
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
