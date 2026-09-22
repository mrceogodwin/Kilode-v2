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
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 pb-8">
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
          <p className="mt-1 text-[12px] text-muted">Super adds products from the ops desk. They show here the moment they publish.</p>
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
                  <a href={out.downloadUrl} target="_blank" rel="noreferrer" className="btn-join mt-2 inline-flex rounded-lg px-4 py-2 text-[12px] font-bold">
                    Open download
                  </a>
                ) : (
                  <p className="text-[12px] text-muted">No file URL on this item yet. Super will attach one.</p>
                )}
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
                    else setOut({ title: r.title, details: r.details, downloadUrl: r.downloadUrl });
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
  const [msg, setMsg] = useState("");
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<ProductKind>("app");
  const [blurb, setBlurb] = useState("");
  const [details, setDetails] = useState("");
  const [cover, setCover] = useState("");
  const [price, setPrice] = useState("Free");
  const [downloadUrl, setDownloadUrl] = useState("");
  const load = () => {
    void listStaffShop()
      .then((r) => {
        setItems(r.items);
        setLeads(r.leads);
      })
      .catch(() => undefined);
  };
  useEffect(load, []);
  return (
    <div className="md:col-span-2 raised space-y-3 rounded-xl p-3">
      <div>
        <div className="text-[11px] font-medium text-muted">Downloads desk</div>
        <h3 className="text-base font-bold">Kilode products</h3>
        <p className="mt-1 text-xs text-muted">
          Apps, zips, videos, music, links. BUY NOW collects email, then shows the file. {leads} emails saved.
        </p>
      </div>
      <form
        className="grid gap-2 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          void saveProduct({ data: { title, kind, blurb, details, cover, price, downloadUrl } }).then((r) => {
            if (!r.ok) setMsg(r.reason);
            else {
              setMsg("Published");
              setTitle("");
              setBlurb("");
              setDetails("");
              setCover("");
              setDownloadUrl("");
              load();
            }
          });
        }}
      >
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="rounded-lg border border-line bg-bg px-2 py-2 text-sm sm:col-span-2" required />
        <select value={kind} onChange={(e) => setKind(e.target.value as ProductKind)} className="rounded-lg border border-line bg-bg px-2 py-2 text-sm">
          {PRODUCT_KINDS.map((k) => (
            <option key={k} value={k}>
              {KIND_META[k].label}
            </option>
          ))}
        </select>
        <input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Price · Free / ₦5,000" className="rounded-lg border border-line bg-bg px-2 py-2 text-sm" />
        <input value={cover} onChange={(e) => setCover(e.target.value)} placeholder="Cover image URL" className="rounded-lg border border-line bg-bg px-2 py-2 text-sm sm:col-span-2" />
        <input value={downloadUrl} onChange={(e) => setDownloadUrl(e.target.value)} placeholder="Download / file URL" className="rounded-lg border border-line bg-bg px-2 py-2 text-sm sm:col-span-2" />
        <input value={blurb} onChange={(e) => setBlurb(e.target.value)} placeholder="Short blurb" className="rounded-lg border border-line bg-bg px-2 py-2 text-sm sm:col-span-2" />
        <textarea value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Details shown after they leave an email" className="min-h-20 rounded-lg border border-line bg-bg px-2 py-2 text-sm sm:col-span-2" />
        <button type="submit" className="btn-join rounded-lg py-2 text-[12px] font-bold sm:col-span-2">
          + Add product
        </button>
      </form>
      {msg ? <p className="text-[11px] text-lime-2">{msg}</p> : null}
      <div className="max-h-[360px] space-y-2 overflow-y-auto">
        {items.map((p) => (
          <div key={p.id} className="flex items-center gap-2 rounded-xl border border-line bg-panel p-2">
            {p.cover ? <img src={p.cover} alt="" className="size-12 rounded-md object-cover" /> : <div className="grid size-12 place-items-center rounded-md bg-panel-3"><Download className="size-4 text-lime-2" /></div>}
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-semibold">{p.title}</div>
              <div className="text-[10px] text-muted">
                {p.status} · {p.kind} · {p.price}
              </div>
            </div>
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
    </div>
  );
}
