import { useEffect, useState } from "react";
import { Tv } from "lucide-react";
import { deleteSocial, listSocials, saveSocial, type SocialRow } from "@/lib/socials-server";

const TINT: Record<string, string> = {
  youtube: "#7a1f1f",
  tiktok: "#1a1a22",
  instagram: "#5a2140",
  x: "#1c1c1c",
  facebook: "#1a2744",
  telegram: "#16344a",
  whatsapp: "#14351f",
};

export function TvPane() {
  const [rows, setRows] = useState<SocialRow[]>([]);
  useEffect(() => {
    void listSocials()
      .then(setRows)
      .catch(() => setRows([]));
  }, []);
  return (
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 dock-pad">
      <section className="shop-hero mb-3 overflow-hidden rounded-2xl border border-line px-3 py-4 sm:px-4 sm:py-6">
        <div className="flex items-center gap-2 text-lime-2">
          <Tv className="size-4 sm:size-5" />
          <span className="text-[10px] font-medium tracking-[0.2em]">KILODE TV & SOCIALS</span>
        </div>
        <h1 className="mt-1.5 text-[22px] font-bold leading-tight sm:text-[32px]">Watch. Follow. Share.</h1>
        <p className="mt-1.5 max-w-md text-[12px] leading-relaxed text-muted sm:text-[13px]">
          One tap to every Kilode channel. Super pastes the real URLs and thumbs from ops.
        </p>
      </section>

      {rows.length === 0 ? (
        <p className="text-sm text-muted">No channels yet. Super adds them in ops.</p>
      ) : (
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
          {rows.map((s) => (
            <article key={s.id} className="raised flex min-w-0 flex-col overflow-hidden rounded-lg">
              {s.thumb ? (
                <img src={s.thumb} alt="" className="aspect-[4/3] w-full object-cover" />
              ) : (
                <div
                  className="grid aspect-[4/3] place-items-center border-b border-white/5"
                  style={{ background: TINT[s.id] || "#1a2420" }}
                >
                  <span className="text-[15px] font-black tracking-tight text-white/90 sm:text-[20px]">
                    {s.name.slice(0, 2).toUpperCase()}
                  </span>
                </div>
              )}
              <div className="flex min-h-0 flex-1 flex-col px-1.5 py-1.5 sm:px-2 sm:py-2">
                <div className="truncate text-[9px] font-medium tracking-[0.14em] text-lime-2">
                  {s.followers || s.name.toUpperCase()}
                </div>
                <h2 className="mt-0.5 truncate text-[11px] font-bold leading-snug sm:text-[13px]">{s.name}</h2>
                {s.handle ? <p className="truncate text-[10px] leading-snug text-muted">{s.handle}</p> : null}
                {s.blurb ? (
                  <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-muted sm:text-[11px]">{s.blurb}</p>
                ) : null}
                <div className="mt-auto pt-1.5">
                  {s.url ? (
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-join inline-flex w-full items-center justify-center rounded-md px-1.5 py-1 text-[9px] font-extrabold tracking-[0.1em] sm:text-[10px]"
                    >
                      FOLLOW
                    </a>
                  ) : (
                    <p className="text-[9px] leading-snug text-muted sm:text-[10px]">Super pastes the live URL in ops.</p>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

export function SocialsAdminPanel() {
  const [rows, setRows] = useState<SocialRow[]>([]);
  const [msg, setMsg] = useState("");
  const [id, setId] = useState("");
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [url, setUrl] = useState("");
  const [blurb, setBlurb] = useState("");
  const [thumb, setThumb] = useState("");
  const [followers, setFollowers] = useState("");
  const load = () => {
    void listSocials()
      .then(setRows)
      .catch(() => undefined);
  };
  useEffect(load, []);
  return (
    <div className="md:col-span-2 raised space-y-3 rounded-xl p-3">
      <div>
        <div className="text-[11px] font-medium text-muted">Kilode TV</div>
        <h3 className="text-base font-bold">Socials on the TV page</h3>
        <p className="mt-1 text-xs text-muted">YouTube, TikTok, IG, X, Facebook, Telegram. FOLLOW opens the real URL.</p>
      </div>
      <form
        className="grid gap-2 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          void saveSocial({ data: { id: id || name.toLowerCase(), name, handle, url, blurb, thumb, followers, sort: rows.length + 1 } }).then((r) => {
            if (!r.ok) setMsg(r.reason);
            else {
              setMsg("Saved");
              setId("");
              setName("");
              setHandle("");
              setUrl("");
              setBlurb("");
              setThumb("");
              load();
            }
          });
        }}
      >
        <input value={id} onChange={(e) => setId(e.target.value)} placeholder="id · youtube" className="rounded-lg border border-line bg-bg px-2 py-2 text-base" />
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name · YouTube" className="rounded-lg border border-line bg-bg px-2 py-2 text-base" required />
        <input value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="@handle" className="rounded-lg border border-line bg-bg px-2 py-2 text-base" />
        <input value={followers} onChange={(e) => setFollowers(e.target.value)} placeholder="Badge · 12K" className="rounded-lg border border-line bg-bg px-2 py-2 text-base" />
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" className="rounded-lg border border-line bg-bg px-2 py-2 text-base sm:col-span-2" />
        <input value={thumb} onChange={(e) => setThumb(e.target.value)} placeholder="Preview image URL" className="rounded-lg border border-line bg-bg px-2 py-2 text-base sm:col-span-2" />
        <input value={blurb} onChange={(e) => setBlurb(e.target.value)} placeholder="One-line blurb" className="rounded-lg border border-line bg-bg px-2 py-2 text-base sm:col-span-2" />
        <button type="submit" className="btn-join rounded-lg py-2 text-[12px] font-bold sm:col-span-2">
          + Add / update
        </button>
      </form>
      {msg ? <p className="text-[11px] text-lime-2">{msg}</p> : null}
      <div className="space-y-2">
        {rows.map((s) => (
          <div key={s.id} className="flex items-center gap-2 rounded-xl border border-line bg-panel p-2">
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-semibold">{s.name}</div>
              <div className="truncate text-[10px] text-muted">{s.handle} · {s.url}</div>
            </div>
            <button
              type="button"
              className="text-[11px] text-danger"
              onClick={() => {
                if (!window.confirm("Remove this social?")) return;
                void deleteSocial({ data: { id: s.id } }).then(load);
              }}
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
