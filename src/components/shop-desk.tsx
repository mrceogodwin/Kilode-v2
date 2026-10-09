import { useEffect, useMemo, useState } from "react";
import {
  Heart,
  Home,
  Laptop,
  LayoutGrid,
  Search,
  Shirt,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Store,
  Utensils,
} from "lucide-react";
import { listListings, saveListing, type Listing } from "@/lib/listings-server";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { uploadListingPhoto } from "@/lib/supabase";

const CATS = [
  { id: "All", Icon: LayoutGrid },
  { id: "Fashion", Icon: Shirt },
  { id: "Phones", Icon: Smartphone },
  { id: "Electronics", Icon: Laptop },
  { id: "Beauty", Icon: Sparkles },
  { id: "Home", Icon: Home },
  { id: "Food", Icon: Utensils },
] as const;

type Card = Listing & { image?: string };

function metaOf(raw?: string) {
  try {
    return JSON.parse(raw || "{}") as { category?: string; price?: string; condition?: string };
  } catch {
    return {};
  }
}

function naira(raw?: string) {
  const t = String(raw || "").trim();
  if (!t) return "";
  const n = Number(t.replace(/[^\d.]/g, ""));
  if (!Number.isFinite(n) || n <= 0) return t.startsWith("₦") ? t : `₦${t}`;
  return `₦${Math.round(n).toLocaleString("en-NG")}`;
}

function catMatch(r: Card, pill: string) {
  if (pill === "All") return true;
  const meta = metaOf(r.meta);
  const blob = `${r.title} ${meta.category || ""} ${r.body}`.toLowerCase();
  if (pill === "Phones") return /phone|iphone|android|tecno|case/.test(blob);
  if (pill === "Electronics") return /electronic|laptop|gadget|headphone|solar|beats/.test(blob) || (meta.category || "").toLowerCase() === "electronics";
  if (pill === "Fashion") return /fashion|ankara|hoodie|bag|slipper|bead|wear/.test(blob);
  if (pill === "Beauty") return /beauty|shea|skin|glow/.test(blob);
  if (pill === "Home") return /home|lantern|furniture/.test(blob);
  if (pill === "Food") return /food|spice|oil|suya/.test(blob);
  return (meta.category || "").toLowerCase() === pill.toLowerCase();
}

function loadSaved() {
  try {
    return JSON.parse(localStorage.getItem("kilode-saved-products") || "[]") as string[];
  } catch {
    return [];
  }
}

export function ShopDesk() {
  const session = useCurrentUserState();
  const [rows, setRows] = useState<Card[]>([]);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const [saved, setSaved] = useState<string[]>([]);
  const [open, setOpen] = useState<Card | null>(null);
  const [form, setForm] = useState(false);
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [company, setCompany] = useState("");
  const [city, setCity] = useState("");
  const [contact, setContact] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("Fashion");
  const [image, setImage] = useState("");
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [seeAll, setSeeAll] = useState<"pop" | "new" | null>(null);

  function load() {
    void listListings({ data: { kind: "market" } })
      .then((live) => setRows(Array.isArray(live) ? live : []))
      .catch(() => setRows([]));
  }
  useEffect(() => {
    load();
    setSaved(loadSaved());
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (!catMatch(r, cat)) return false;
      if (!needle) return true;
      return `${r.title} ${r.company} ${r.city} ${r.submitter}`.toLowerCase().includes(needle);
    });
  }, [rows, q, cat]);

  const featured = filtered[0];
  const popular = seeAll === "pop" ? filtered : filtered.slice(0, 8);
  const recent = [...filtered].reverse();
  const recentShown = seeAll === "new" ? recent : recent.slice(0, 8);

  function toggleSave(id: string) {
    setSaved((cur) => {
      const next = cur.includes(id) ? cur.filter((x) => x !== id) : [id, ...cur];
      localStorage.setItem("kilode-saved-products", JSON.stringify(next));
      return next;
    });
  }

  function sell() {
    if (session.isPending) return;
    if (!session.user) {
      window.location.href = "/login?mode=up";
      return;
    }
    setForm((v) => !v);
  }

  return (
    <div className="fm-page">
      <div className="fm-head">
        <span className="fm-mark"><ShoppingBag className="size-5" /></span>
        <div className="min-w-0 flex-1">
          <div className="fm-kicker">MARKETPLACE</div>
          <h1 className="fm-title">Products for You</h1>
          <p className="fm-sub">Discover and buy authentic products from trusted sellers on Kilode.</p>
        </div>
        <button type="button" className="fm-cta" onClick={sell}>+ Sell a Product</button>
      </div>

      <label className="fm-search">
        <Search className="size-4 shrink-0" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products, sellers, categories..." aria-label="Search products" />
      </label>

      <div className="fm-pills fm-pills-ico">
        {CATS.map((c) => (
          <button key={c.id} type="button" className={cat === c.id ? "on" : ""} onClick={() => setCat(c.id)}>
            <c.Icon className="size-3.5" />
            {c.id}
          </button>
        ))}
      </div>

      {form ? (
        <form
          className="fm-form"
          onSubmit={(e) => {
            e.preventDefault();
            setErr("");
            setMsg("");
            if (title.trim().length < 3) {
              setErr("Add a product name.");
              return;
            }
            setBusy(true);
            void saveListing({
              data: { kind: "market", title, body, city, contact, link: "", company, days: 30, image, category, price, condition: "New", jobType: "", salary: "" },
            }).then((r) => {
              if (!r?.ok) setErr(r && "reason" in r ? r.reason : "Could not list that.");
              else {
                setMsg(r.needsPay ? "Saved. Finish payment on the listing to go live." : "Submitted. Staff approve before it is public.");
                setTitle("");
                setBody("");
                setPrice("");
                setImage("");
                setForm(false);
                load();
              }
            }).finally(() => setBusy(false));
          }}
        >
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Product name" required />
          <div className="fm-form-row">
            <input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Price in Naira" inputMode="decimal" />
            <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category">
              {CATS.filter((c) => c.id !== "All").map((c) => <option key={c.id}>{c.id}</option>)}
            </select>
          </div>
          <div className="fm-form-row">
            <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Shop name" />
            <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" />
          </div>
          <input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="WhatsApp or email" />
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={2} placeholder="Short description" />
          <label className="fm-file">
            Photo
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                setBusy(true);
                void uploadListingPhoto(file)
                  .then(setImage)
                  .catch((ex: unknown) => setErr(ex instanceof Error ? ex.message : "Photo failed."))
                  .finally(() => setBusy(false));
              }}
            />
          </label>
          {image ? <img src={image} alt="" className="fm-form-shot" /> : null}
          {err ? <p className="fm-err">{err}</p> : null}
          {msg ? <p className="fm-ok">{msg}</p> : null}
          <button type="submit" className="fm-cta wide" disabled={busy}>{busy ? "Saving…" : "Submit product"}</button>
        </form>
      ) : null}

      {featured ? (
        <button type="button" className="fm-feature" onClick={() => setOpen(featured)}>
          <em>FEATURED</em>
          <h2>{featured.title}</h2>
          <p>{featured.city || "Kilode"} · {featured.company || featured.submitter || "Seller"}</p>
          <span className="fm-ghost">Shop Now →</span>
          {featured.image ? <img src={featured.image} alt="" /> : <Store className="fm-feature-ico" />}
        </button>
      ) : (
        <button type="button" className="fm-empty" onClick={sell}>No products in this lane yet. Sell the first one.</button>
      )}

      <section className="fm-sec">
        <div className="fm-sec-h">
          <h2><FlameMark /> POPULAR PRODUCTS</h2>
          {filtered.length > 8 ? <button type="button" className="fm-link" onClick={() => setSeeAll((v) => (v === "pop" ? null : "pop"))}>{seeAll === "pop" ? "Less" : "See all →"}</button> : null}
        </div>
        <div className="fm-grid">
          {popular.map((r) => {
            const priceLabel = naira(metaOf(r.meta).price);
            return (
              <article key={r.id} className="fm-product">
                <button type="button" className="fm-heart" aria-label="Save" onClick={() => toggleSave(r.id)}>
                  <Heart className="size-3.5" fill={saved.includes(r.id) ? "currentColor" : "none"} />
                </button>
                <button type="button" className="fm-product-hit" onClick={() => setOpen(r)}>
                  {r.image ? <img src={r.image} alt="" /> : <span className="fm-ph"><Store className="size-5" /></span>}
                  <b>{r.title}</b>
                  <strong>{priceLabel || "Ask"}</strong>
                  <small>{fmtViews(r.views)} · @{r.company || r.submitter || "seller"}</small>
                </button>
              </article>
            );
          })}
        </div>
      </section>

      <section className="fm-sec">
        <div className="fm-sec-h">
          <h2>RECENTLY LISTED</h2>
          {recent.length > 4 ? <button type="button" className="fm-link" onClick={() => setSeeAll((v) => (v === "new" ? null : "new"))}>{seeAll === "new" ? "Less" : "See all →"}</button> : null}
        </div>
        <div className="fm-recent">
          {recentShown.map((r) => (
            <button key={r.id} type="button" className="fm-recent-card" onClick={() => setOpen(r)}>
              <Heart className="fm-heart-abs size-3.5" onClick={(e) => { e.stopPropagation(); toggleSave(r.id); }} />
              {r.image ? <img src={r.image} alt="" /> : <span className="fm-ph"><Store className="size-4" /></span>}
              <b>{r.title}</b>
              <strong>{naira(metaOf(r.meta).price) || "Ask"}</strong>
              <small>@{r.company || r.submitter || "seller"}</small>
            </button>
          ))}
        </div>
      </section>

      {open ? (
        <div className="fm-sheet" role="dialog" aria-label={open.title}>
          <button type="button" className="fm-sheet-x" onClick={() => setOpen(null)}>Close</button>
          {open.image ? <img src={open.image} alt="" /> : null}
          <h3>{open.title}</h3>
          <p>{naira(metaOf(open.meta).price) || "Ask the seller"} · {open.city || "Kilode"}</p>
          <p className="fm-sub">{open.body}</p>
          <p className="fm-sub">Seller @{open.company || open.submitter || "seller"}</p>
          {open.link || open.contact ? (
            <a className="fm-cta wide" href={open.link || `mailto:${open.contact}`} target={open.link ? "_blank" : undefined} rel="noreferrer">Contact seller</a>
          ) : (
            <p className="fm-sub">No checkout inside Kilode. Ask the seller on their listing contact.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}

function FlameMark() {
  return <span className="fm-flame" aria-hidden>🔥</span>;
}

function fmtViews(n?: number) {
  const v = n ?? 0;
  if (v >= 1000) return `${(v / 1000).toFixed(1).replace(/\.0$/, "")}k views`;
  return `${v} views`;
}
