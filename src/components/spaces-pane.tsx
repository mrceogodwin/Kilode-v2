import { useEffect, useState } from "react";
import { MapPin, Plus, Share2 } from "lucide-react";
import { getSpace, listMySpaces, listPublicSpaces, noteEnquiry, saveSpace, saveSpaceItem, deleteSpaceItem, spacePulse, toggleSpaceFollow, type SpaceCard } from "@/lib/spaces-server";
import { uploadListingPhoto } from "@/lib/supabase";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

const CATS = ["Fashion", "Beauty", "Food", "Photography", "Tech", "Services", "Other"];

export function SpacesPane() {
  const session = useCurrentUserState();
  const [mine, setMine] = useState<SpaceCard[]>([]);
  const [discover, setDiscover] = useState<SpaceCard[]>([]);
  const [filter, setFilter] = useState<"All" | "Published" | "Draft" | "Private">("All");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<SpaceCard | null>(null);
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState("");

  function reload() {
    void listMySpaces()
      .then((rows) => setMine(Array.isArray(rows) ? rows : []))
      .catch(() => setMine([]));
    void listPublicSpaces({ data: {} })
      .then((rows) => setDiscover(Array.isArray(rows) ? rows : []))
      .catch(() => setDiscover([]));
  }
  useEffect(() => {
    reload();
    let pending = "";
    try { pending = sessionStorage.getItem("kilode-space") || ""; sessionStorage.removeItem("kilode-space"); } catch { pending = ""; }
    const q = new URLSearchParams(window.location.search).get("space") || pending;
    if (q) {
      void getSpace({ data: { username: q } }).then((s) => { if (s) setOpen(s); });
    }
    const onOpen = (e: Event) => {
      const name = String((e as CustomEvent<string>).detail || "");
      if (!name) return;
      void getSpace({ data: { username: name } }).then((s) => { if (s) setOpen(s); });
    };
    window.addEventListener("kilode:space", onOpen);
    return () => window.removeEventListener("kilode:space", onOpen);
  }, [session.user?.id]);

  if (open) return <Storefront space={open} mine={mine.some((s) => s.id === open.id)} onBack={() => { setOpen(null); reload(); }} />;
  if (creating) {
    return (
      <CreateSpace
        onBack={() => setCreating(false)}
        onDone={(username) => {
          setCreating(false);
          void getSpace({ data: { username } }).then((s) => {
            if (s) setOpen(s);
            else reload();
          });
        }}
      />
    );
  }

  const shown = mine.filter((s) => (filter === "All" || s.status === filter) && `${s.name} ${s.username}`.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <div className="mx-auto max-w-3xl px-3 pt-3 pb-24">
      <h1 className="text-[28px] font-extrabold tracking-tight">My Spaces</h1>
      <p className="text-[13px] text-muted">Your business page on Kilode. No separate website.</p>
      <div className="mt-3 flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
        <div>
          <div className="text-[10px] text-muted">Total spaces</div>
          <div className="text-lg font-extrabold">{mine.length} / 5</div>
        </div>
        <button type="button" className="btn-yellow rounded-full px-3 py-1.5 text-[12px] font-extrabold text-black" onClick={() => (session.user ? setCreating(true) : (window.location.href = "/login"))}>
          + Create space
        </button>
      </div>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search your spaces" className="mt-3 w-full rounded-full border border-line bg-panel px-3 py-2 text-base" />
      <div className="lane-rail mt-3">
        {(["All", "Published", "Draft", "Private"] as const).map((f) => (
          <button key={f} type="button" className={`lane-chip ${filter === f ? "on" : ""}`} onClick={() => setFilter(f)}>
            {f === "All" ? "All spaces" : f}
          </button>
        ))}
      </div>
      {err ? <p className="mt-2 text-[12px] text-danger">{err}</p> : null}
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {shown.map((s) => (
          <article key={s.id} className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
            <div className="relative h-24 bg-black/40">
              {s.banner ? <img src={s.banner} alt="" className="h-full w-full object-cover" /> : null}
              <span className="absolute top-2 left-2 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-bold text-[#e6c56a]">{s.status}</span>
            </div>
            <div className="p-3">
              <div className="flex items-center gap-2">
                <span className="grid size-10 place-items-center overflow-hidden rounded-full border border-[#e6c56a] bg-black text-[11px] font-extrabold">
                  {s.logo ? <img src={s.logo} alt="" className="h-full w-full object-cover" /> : s.name.slice(0, 2).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <div className="truncate font-extrabold">{s.name}</div>
                  <div className="truncate text-[11px] text-muted">@{s.username} · {s.category}</div>
                </div>
              </div>
              <div className="mt-2 flex gap-3 text-center text-[10px] text-muted">
                <span><b className="block text-sm text-fg">{s.visitors}</b>Visitors</span>
                <span><b className="block text-sm text-fg">{s.items.length}</b>Offers</span>
                <span><b className="block text-sm text-fg">{s.enquiries}</b>Enquiries</span>
              </div>
              <button type="button" className="btn-yellow mt-2 w-full rounded-full py-1.5 text-[12px] font-extrabold text-black" onClick={() => setOpen(s)}>
                Manage
              </button>
            </div>
          </article>
        ))}
        <button type="button" className="grid min-h-48 place-items-center rounded-2xl border border-dashed border-white/20 p-4 text-center" onClick={() => (session.user ? setCreating(true) : (window.location.href = "/login"))}>
          <Plus className="size-8 text-[#e6c56a]" />
          <div className="mt-2 font-extrabold">Create new space</div>
          <div className="text-[12px] text-muted">A page people can open from Kilode.</div>
        </button>
      </div>
      <h2 className="mt-6 text-lg font-extrabold">Discover spaces</h2>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {discover.map((s) => (
          <button key={s.id} type="button" className="rounded-2xl border border-white/10 p-3 text-left" onClick={() => setOpen(s)}>
            <div className="font-bold">{s.name}</div>
            <div className="text-[11px] text-muted">{s.category} · {s.location}</div>
          </button>
        ))}
        {discover.length === 0 ? <p className="col-span-2 text-[12px] text-muted">No public spaces yet. Yours can be first.</p> : null}
      </div>
    </div>
  );
}

function CreateSpace({ onBack, onDone }: { onBack: () => void; onDone: (username: string) => void }) {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [category, setCategory] = useState(CATS[0]);
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [hours, setHours] = useState("");
  const [logo, setLogo] = useState("");
  const [banner, setBanner] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function photo(file: File | undefined, set: (v: string) => void) {
    if (!file) return;
    setErr("");
    setBusy(true);
    try {
      set(await uploadListingPhoto(file));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not add that photo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-2 px-3 pt-3 pb-24">
      <button type="button" className="text-[12px] text-muted" onClick={onBack}>← Back</button>
      <h1 className="text-2xl font-extrabold">Create space</h1>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Business name" className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2" />
      <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Handle, like johnfashion" className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2" />
      <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2" aria-label="Category">
        {CATS.map((c) => <option key={c}>{c}</option>)}
      </select>
      <input value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="Tagline" className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2" />
      <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Description" className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2" />
      <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="City" className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2" />
      <input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="WhatsApp number" className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2" />
      <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2" />
      <input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="Website, optional" className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2" />
      <input value={hours} onChange={(e) => setHours(e.target.value)} placeholder="Hours, e.g. Mon–Sat 9–6" className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2" />
      <label className="block text-[12px] text-muted">Logo
        <input type="file" accept="image/jpeg,image/png,image/webp" className="mt-1 block w-full" onChange={(e) => void photo(e.target.files?.[0], setLogo)} />
      </label>
      <label className="block text-[12px] text-muted">Cover
        <input type="file" accept="image/jpeg,image/png,image/webp" className="mt-1 block w-full" onChange={(e) => void photo(e.target.files?.[0], setBanner)} />
      </label>
      {logo ? <img src={logo} alt="" className="size-16 rounded-full object-cover" /> : null}
      {banner ? <img src={banner} alt="" className="h-24 w-full rounded-xl object-cover" /> : null}
      {err ? <p className="text-[12px] text-danger">{err}</p> : null}
      <button
        type="button"
        disabled={busy}
        className="btn-yellow w-full rounded-full py-2.5 font-extrabold text-black disabled:opacity-60"
        onClick={() => {
          setBusy(true);
          setErr("");
          void saveSpace({ data: { name, username, category, tagline, description, location, whatsapp, email, website, hours, logo, banner, status: "Published" } }).then((r) => {
            if (!r.ok) setErr(r.reason);
            else onDone(r.username);
          }).finally(() => setBusy(false));
        }}
      >
        {busy ? "Saving…" : "Publish space"}
      </button>
    </div>
  );
}

function Storefront({ space, mine, onBack }: { space: SpaceCard; mine: boolean; onBack: () => void }) {
  const [tab, setTab] = useState<"Home" | "Products" | "Services" | "Offers" | "About">("Home");
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [kind, setKind] = useState<"service" | "offer" | "product">("product");
  const [shot, setShot] = useState("");
  const [msg, setMsg] = useState("");
  const [followers, setFollowers] = useState(0);
  const [followed, setFollowed] = useState(false);
  const [items, setItems] = useState(space.items);
  useEffect(() => {
    setItems(space.items);
    void spacePulse({ data: { spaceId: space.id } }).then((p) => {
      setFollowers(p.followers);
      setFollowed(p.followed);
    }).catch(() => undefined);
  }, [space.id, space.items]);
  const products = items.filter((i) => i.kind === "product");
  const services = items.filter((i) => i.kind === "service");
  const offers = items.filter((i) => i.kind === "offer");
  const shown = tab === "Products" ? products : tab === "Services" ? services : tab === "Offers" ? offers : tab === "Home" ? items.slice(0, 4) : [];
  const wa = space.whatsapp.replace(/[^\d]/g, "");
  function ask(label: string) {
    void noteEnquiry({ data: { spaceId: space.id } }).catch(() => undefined);
    if (wa) window.open(`https://wa.me/${wa}?text=${encodeURIComponent(label)}`, "_blank", "noopener");
    else if (space.email) window.location.href = `mailto:${space.email}?subject=${encodeURIComponent(label)}`;
    else setMsg("This space has no WhatsApp or email yet.");
  }
  async function share() {
    const url = `${location.origin}/?space=${space.username}`;
    if (navigator.share) {
      try { await navigator.share({ title: space.name, url }); return; } catch { /* copy instead */ }
    }
    await navigator.clipboard?.writeText(url);
    setMsg("Link copied.");
  }
  return (
    <div className="space-store pb-24">
      <div className="relative h-40 bg-black">
        {space.banner ? <img src={space.banner} alt="" className="h-full w-full object-cover" /> : null}
        <button type="button" className="absolute top-3 left-3 rounded-full bg-black/60 px-2 py-1 text-[12px] text-white" onClick={onBack}>←</button>
      </div>
      <div className="mx-auto max-w-3xl px-3">
        <div className="-mt-8 flex items-end gap-3">
          <span className="grid size-16 place-items-center overflow-hidden rounded-full border-2 border-[#e6c56a] bg-black text-lg font-extrabold text-white">
            {space.logo ? <img src={space.logo} alt="" className="h-full w-full object-cover" /> : space.name.slice(0, 1)}
          </span>
          <div className="min-w-0 flex-1 pb-1">
            <h1 className="truncate text-xl font-extrabold">{space.name}</h1>
            <p className="text-[12px] text-muted">@{space.username} · {space.category}</p>
          </div>
          <button type="button" className="mb-1 rounded-full border border-line px-3 py-1 text-[11px]" onClick={() => void share()}>
            <Share2 className="inline size-3" /> Share
          </button>
        </div>
        <p className="mt-2 flex items-center gap-1 text-[12px] text-muted"><MapPin className="size-3" /> {space.location || "Nigeria"} · {followers} followers</p>
        <p className="mt-1 text-[13px] leading-snug">{space.tagline || space.description}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className="rounded-full border border-line px-3 py-1.5 text-[12px] font-bold" onClick={() => {
            void toggleSpaceFollow({ data: { spaceId: space.id } }).then((r) => {
              setFollowed(r.followed);
              setFollowers((n) => Math.max(0, n + (r.followed ? 1 : -1)));
            }).catch(() => { window.location.href = "/login"; });
          }}>{followed ? "Following" : "Follow"}</button>
          {wa ? <button type="button" className="btn-yellow rounded-full px-3 py-1.5 text-[12px] font-extrabold text-black" onClick={() => ask(space.name)}>WhatsApp</button> : null}
          <button type="button" className="rounded-full border border-line px-3 py-1.5 text-[12px]" onClick={() => ask(`Hello ${space.name}`)}>Enquire</button>
        </div>
        <div className="lane-rail mt-3">
          {(["Home", "Products", "Services", "Offers", "About"] as const).map((t) => (
            <button key={t} type="button" className={`lane-chip ${tab === t ? "on" : ""}`} onClick={() => setTab(t)}>{t}</button>
          ))}
        </div>
        {tab === "About" ? (
          <div className="mt-3 space-y-2 text-[13px]">
            <p>{space.description || "No story yet."}</p>
            <p className="text-muted">{space.hours || "Hours not listed"}</p>
            <p className="text-muted">{space.location}</p>
            {space.website ? <a className="text-[#e6c56a]" href={space.website} target="_blank" rel="noreferrer">{space.website.replace(/^https?:\/\//, "")}</a> : null}
          </div>
        ) : (
          <div className="mt-3 grid grid-cols-2 gap-2">
            {shown.length === 0 ? <p className="col-span-2 text-[12px] text-muted">Nothing in this tab yet.</p> : null}
            {shown.map((item) => (
              <article key={item.id} className="overflow-hidden rounded-2xl border border-line bg-panel">
                {item.image ? <img src={item.image} alt="" className="h-24 w-full object-cover" /> : <div className="h-16 bg-white/5" />}
                <div className="p-2">
                  {item.badge ? <div className="text-[10px] font-bold text-[#e6c56a]">{item.badge}</div> : null}
                  <div className="text-[13px] font-bold">{item.title}</div>
                  <div className="text-[12px]">{item.price ? `₦${item.price}` : ""} {item.duration}</div>
                  <button type="button" className="mt-1 w-full rounded-full bg-black px-2 py-1 text-center text-[11px] font-bold text-white" onClick={() => ask(item.title)}>{item.kind === "product" ? "Order" : "Book"}</button>
                  {mine ? <button type="button" className="mt-1 text-[10px] text-danger" onClick={() => void deleteSpaceItem({ data: { id: item.id } }).then((r) => { if (r.ok) setItems((rows) => rows.filter((x) => x.id !== item.id)); })}>Remove</button> : null}
                </div>
              </article>
            ))}
          </div>
        )}
        {mine ? (
          <form
            className="mt-4 space-y-2 rounded-2xl border border-line p-3"
            onSubmit={(e) => {
              e.preventDefault();
              void saveSpaceItem({ data: { spaceId: space.id, kind, title, price, image: shot } }).then((r) => {
                setMsg(r.ok ? "Added." : r.reason);
                if (r.ok) {
                  setItems((rows) => [...rows, { id: r.id, kind, title, badge: "", price, duration: "", image: shot, description: "" }]);
                  setTitle("");
                  setShot("");
                }
              });
            }}
          >
            <div className="text-[12px] font-bold">Add to this space</div>
            <div className="flex gap-2">
              {(["product", "service", "offer"] as const).map((k) => (
                <button key={k} type="button" className={`rounded-full px-2 py-1 text-[11px] ${kind === k ? "bg-[#e6c56a] text-black" : "border border-line"}`} onClick={() => setKind(k)}>{k}</button>
              ))}
            </div>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="w-full rounded-lg border border-line bg-panel px-2 py-1.5" />
            <input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Price in Naira" className="w-full rounded-lg border border-line bg-panel px-2 py-1.5" />
            <label className="block text-[11px] text-muted">Photo
              <input type="file" accept="image/jpeg,image/png,image/webp" className="mt-1 block w-full text-[11px]" onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                void uploadListingPhoto(file).then(setShot).catch((err) => setMsg(err instanceof Error ? err.message : "Photo failed"));
              }} />
            </label>
            {shot ? <img src={shot} alt="" className="h-16 w-full rounded-lg object-cover" /> : null}
            <button type="submit" className="btn-yellow rounded-full px-3 py-1.5 text-[12px] font-extrabold text-black">Add</button>
            {msg ? <p className="text-[11px] text-muted">{msg}</p> : null}
          </form>
        ) : null}
        {msg && !mine ? <p className="mt-2 text-[11px] text-muted">{msg}</p> : null}
      </div>
    </div>
  );
}
