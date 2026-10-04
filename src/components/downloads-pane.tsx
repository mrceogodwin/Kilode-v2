import { useEffect, useMemo, useState } from "react";
import { Download, FileArchive, Link2, Music, Smartphone, Video } from "lucide-react";
import {
  PRODUCT_KINDS,
  claimProduct,
  deleteProduct,
  hideProduct,
  listShop,
  listStaffShop,
  saveProduct,
  type ProductKind,
  type ShopProduct,
} from "@/lib/shop-server";
import { uploadDropFile } from "@/lib/supabase";
import { kilodeSound } from "@/lib/sfx";

const KIND_META: Record<ProductKind, { label: string; Icon: typeof Smartphone }> = {
  app: { label: "Apps", Icon: Smartphone },
  zip: { label: "Zips", Icon: FileArchive },
  video: { label: "Videos", Icon: Video },
  music: { label: "Music", Icon: Music },
  link: { label: "Links", Icon: Link2 },
  other: { label: "More", Icon: Download },
};

export function DownloadsPane() {
  const [items, setItems] = useState<ShopProduct[]>([]);
  const [kind, setKind] = useState<"all" | ProductKind>("all");
  const [buy, setBuy] = useState<ShopProduct | null>(null);
  const [email, setEmail] = useState("");
  const [out, setOut] = useState<{ title: string; details: string; downloadUrl: string } | null>(null);
  const [msg, setMsg] = useState("");
  useEffect(() => {
    void listShop()
      .then(setItems)
      .catch(() => setItems([]));
  }, []);
  const shown = useMemo(() => items.filter((p) => kind === "all" || p.kind === kind), [items, kind]);
  return (
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 dock-pad">
      <section className="shop-hero mb-4 overflow-hidden rounded-2xl border border-line px-4 py-6">
        <div className="text-[10px] font-medium tracking-[0.2em] text-lime-2">KILODE DOWNLOADS</div>
        <h1 className="mt-1 text-[26px] font-bold leading-tight text-fg sm:text-[32px]">Your products. One tap.</h1>
        <p className="mt-2 max-w-md text-[13px] leading-relaxed text-muted">
          Apps, zips, videos, music, and links from Kilode. Tap BUY NOW, drop your email, get the file.
        </p>
      </section>
      <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <button type="button" className={`desk-pill shrink-0 ${kind === "all" ? "on" : ""}`} onClick={() => setKind("all")}>
          All
        </button>
        {PRODUCT_KINDS.map((k) => (
          <button key={k} type="button" className={`desk-pill shrink-0 ${kind === k ? "on" : ""}`} onClick={() => setKind(k)}>
            {KIND_META[k].label}
          </button>
        ))}
      </div>
      {shown.length === 0 ? (
        <div className="raised rounded-2xl px-4 py-10 text-center">
          <Download className="mx-auto size-8 text-lime-2" />
          <p className="mt-3 text-sm font-semibold">Nothing listed yet</p>
          <p className="mt-1 text-[12px] text-muted">Kilode publishes products here as they go live.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {shown.map((p) => {
            const Meta = KIND_META[p.kind];
            return (
              <article key={p.id} className="raised overflow-hidden rounded-2xl">
                {p.cover ? <img src={p.cover} alt="" className="aspect-[16/9] w-full object-cover" /> : <div className="grid aspect-[16/9] place-items-center bg-panel-3"><Meta.Icon className="size-8 text-lime-2" /></div>}
                <div className="p-3">
                  <div className="text-[9px] font-medium tracking-[0.16em] text-lime-2">{Meta.label.toUpperCase()}</div>
                  <h2 className="mt-0.5 text-[15px] font-bold leading-snug">{p.title}</h2>
                  {p.blurb ? <p className="mt-1 text-[12px] leading-relaxed text-muted">{p.blurb}</p> : null}
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <span className="text-[12px] font-semibold text-lime-2">{p.price}</span>
                    <button
                      type="button"
                      className="btn-join rounded-lg px-3 py-1.5 text-[10px] font-extrabold tracking-[0.12em]"
                      onClick={() => {
                        setBuy(p);
                        setOut(null);
                        setEmail("");
                        setMsg("");
                      }}
                    >
                      BUY NOW
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {buy ? (
        <div className="fixed inset-0 z-50 grid place-items-end bg-black/50 p-3 sm:place-items-center" onClick={() => setBuy(null)}>
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-line bg-panel p-4" onClick={(e) => e.stopPropagation()}>
            <div className="text-[9px] font-medium tracking-[0.16em] text-lime-2">{KIND_META[buy.kind].label.toUpperCase()}</div>
            <h3 className="mt-1 text-lg font-bold">{buy.title}</h3>
            {out ? (
              <div className="mt-3 space-y-2">
                <p className="text-[13px] text-muted">Saved. Use the link below — we also keep this email for the drop.</p>
                {out.details ? <p className="whitespace-pre-wrap text-[13px] leading-relaxed">{out.details}</p> : null}
                {out.downloadUrl ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <a href={out.downloadUrl} target="_blank" rel="noreferrer" className="btn-join inline-flex rounded-lg px-4 py-2 text-[12px] font-bold">
                      Open download
                    </a>
                    <button
                      type="button"
                      className="rounded-lg border border-line px-3 py-2 text-[12px] font-semibold"
                      onClick={() => {
                        void navigator.clipboard?.writeText(out.downloadUrl);
                        setMsg("Link copied");
                      }}
                    >
                      Copy link
                    </button>
                  </div>
                ) : (
                  <p className="text-[12px] text-muted">Kilode has {email}. The file is not attached yet — ask again once it is live.</p>
                )}
                {msg ? <p className="text-[11px] text-lime-2">{msg}</p> : null}
                <button type="button" className="mt-3 block text-[12px] text-muted" onClick={() => setBuy(null)}>
                  Close
                </button>
              </div>
            ) : (
              <form
                className="mt-3 space-y-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  void claimProduct({ data: { id: buy.id, email } }).then((r) => {
                    if (!r.ok) setMsg(r.reason);
                    else {
                      setOut({ title: r.title, details: r.details, downloadUrl: r.downloadUrl });
                      if (r.downloadUrl) kilodeSound("sent");
                    }
                  });
                }}
              >
                <p className="text-[12px] text-muted">Email for the details and download link. No checkout inside the app.</p>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  className="min-h-10 w-full rounded-lg border border-line bg-bg px-3 text-[13px]"
                />
                {msg ? <p className="text-[11px] text-danger">{msg}</p> : null}
                <div className="flex gap-2">
                  <button type="submit" className="btn-join flex-1 rounded-lg py-2 text-[12px] font-bold">
                    Get it
                  </button>
                  <button type="button" className="rounded-lg border border-line px-3 text-[12px]" onClick={() => setBuy(null)}>
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function ShopAdminPanel() {
  const [items, setItems] = useState<ShopProduct[]>([]);
  const [leads, setLeads] = useState(0);
  const [recent, setRecent] = useState<{ email: string; title: string; ts: number }[]>([]);
  const [msg, setMsg] = useState("");
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<ProductKind>("app");
  const [blurb, setBlurb] = useState("");
  const [details, setDetails] = useState("");
  const [cover, setCover] = useState("");
  const [price, setPrice] = useState("Free");
  const [downloadUrl, setDownloadUrl] = useState("");
  const [editId, setEditId] = useState("");
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState("");
  const load = () => {
    void listStaffShop()
      .then((r) => {
        setItems(r.items);
        setLeads(r.leads);
        setRecent(r.recent || []);
      })
      .catch(() => undefined);
  };
  useEffect(load, []);
  function reset() {
    setEditId("");
    setTitle("");
    setBlurb("");
    setDetails("");
    setCover("");
    setPrice("Free");
    setDownloadUrl("");
    setFileName("");
    setKind("app");
  }
  function fill(p: ShopProduct) {
    setEditId(p.id);
    setTitle(p.title);
    setKind(p.kind);
    setBlurb(p.blurb);
    setDetails(p.details);
    setCover(p.cover);
    setPrice(p.price);
    setDownloadUrl(p.downloadUrl);
    setFileName("");
    setMsg("");
  }
  return (
    <div className="md:col-span-2 raised space-y-3 rounded-xl p-3">
      <div>
        <div className="text-[11px] font-medium text-muted">Downloads desk</div>
        <h3 className="text-base font-bold">Kilode products</h3>
        <p className="mt-1 text-xs text-muted">
          Apps, zips, videos, music, links. Attach the file or paste https. BUY NOW collects the email, then opens the file. {leads} emails saved.
        </p>
      </div>
      <form
        className="grid gap-2 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          void saveProduct({ data: { id: editId || undefined, title, kind, blurb, details, cover, price, downloadUrl } }).then((r) => {
            if (!r.ok) setMsg(r.reason);
            else {
              setMsg(editId ? "Updated" : "Published");
              reset();
              load();
            }
          });
        }}
      >
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="rounded-lg border border-line bg-bg px-2 py-2 text-base sm:col-span-2" required />
        <select value={kind} onChange={(e) => setKind(e.target.value as ProductKind)} className="rounded-lg border border-line bg-bg px-2 py-2 text-base">
          {PRODUCT_KINDS.map((k) => (
            <option key={k} value={k}>
              {KIND_META[k].label}
            </option>
          ))}
        </select>
        <input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Price · Free / ₦5,000" className="rounded-lg border border-line bg-bg px-2 py-2 text-base" />
        <input value={cover} onChange={(e) => setCover(e.target.value)} placeholder="Cover image URL" className="rounded-lg border border-line bg-bg px-2 py-2 text-base sm:col-span-2" />
        <input value={downloadUrl} onChange={(e) => setDownloadUrl(e.target.value)} placeholder="Download / file URL" className="rounded-lg border border-line bg-bg px-2 py-2 text-base sm:col-span-2" />
        <label className="flex cursor-pointer items-center justify-center rounded-lg border border-dashed border-line px-2 py-2 text-center text-[12px] font-semibold sm:col-span-2">
          {uploading ? "Uploading…" : fileName ? `Attached · ${fileName}` : "Attach the file · APK, ZIP, PDF, MP3, MP4 · 18MB"}
          <input
            type="file"
            accept=".apk,.zip,.pdf,.mp3,.m4a,.wav,.mp4,.webm,.jpg,.jpeg,.png,.webp"
            className="sr-only"
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              setUploading(true);
              setMsg("");
              void uploadDropFile(file)
                .then((url) => {
                  setDownloadUrl(url);
                  setFileName(file.name);
                  setMsg("File attached. Save the product.");
                })
                .catch((err) => setMsg(err instanceof Error ? err.message : "Upload failed"))
                .finally(() => setUploading(false));
            }}
          />
        </label>
        <input value={blurb} onChange={(e) => setBlurb(e.target.value)} placeholder="Short blurb" className="rounded-lg border border-line bg-bg px-2 py-2 text-base sm:col-span-2" />
        <textarea value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Details shown after they leave an email" className="min-h-20 rounded-lg border border-line bg-bg px-2 py-2 text-base sm:col-span-2" />
        <button type="submit" className="btn-join rounded-lg py-2 text-[12px] font-bold sm:col-span-2" disabled={uploading}>
          {editId ? "Update product" : "+ Add product"}
        </button>
        {editId ? (
          <button type="button" className="text-[12px] text-muted sm:col-span-2" onClick={reset}>
            Cancel edit
          </button>
        ) : null}
      </form>
      {msg ? <p className="text-[11px] text-lime-2">{msg}</p> : null}
      <div className="max-h-[360px] space-y-2 overflow-y-auto">
        {items.map((p) => (
          <div key={p.id} className="flex items-center gap-2 rounded-xl border border-line bg-panel p-2">
            {p.cover ? <img src={p.cover} alt="" className="size-12 rounded-md object-cover" /> : <div className="grid size-12 place-items-center rounded-md bg-panel-3"><Download className="size-4 text-lime-2" /></div>}
            <button type="button" className="min-w-0 flex-1 text-left" onClick={() => fill(p)}>
              <div className="truncate text-[13px] font-semibold">{p.title}</div>
              <div className="text-[10px] text-muted">
                {p.status} · {p.kind} · {p.price} · {p.downloadUrl ? "file ready" : "no file yet"}
              </div>
            </button>
            <button
              type="button"
              className="text-[11px] text-muted"
              onClick={() => {
                void hideProduct({ data: { id: p.id, hidden: p.status !== "hidden" } }).then(() => load());
              }}
            >
              {p.status === "hidden" ? "Restore" : "Hide"}
            </button>
            <button
              type="button"
              className="text-[11px] text-danger"
              onClick={() => {
                if (!window.confirm("Delete this product?")) return;
                void deleteProduct({ data: { id: p.id } }).then(() => load());
              }}
            >
              Delete
            </button>
          </div>
        ))}
      </div>
      {recent.length > 0 ? (
        <div>
          <div className="text-[11px] font-medium text-muted">Emails waiting on a file</div>
          <ul className="mt-1 max-h-40 space-y-1 overflow-y-auto text-[12px]">
            {recent.map((r, i) => (
              <li key={`${r.email}-${r.ts}-${i}`} className="flex items-center justify-between gap-2">
                <span className="min-w-0 truncate">{r.email}</span>
                <span className="shrink-0 text-[10px] text-muted">{r.title}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
