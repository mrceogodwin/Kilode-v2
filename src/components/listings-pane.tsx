import { useEffect, useMemo, useRef, useState } from "react";
import { Briefcase, Building2, Bookmark, ChevronRight, Home, Laptop, MapPin, MoreHorizontal, Pencil, Plus, Search, SlidersHorizontal, Store, TrendingUp } from "lucide-react";
import { applyListing, listListingQueue, listListings, saveListing, setListingStatus, type Listing, type ListingKind } from "@/lib/listings-server";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { getProfile } from "@/lib/forum-server";
import { daysLeft, fmtCount, timeAgo, timeLabel, type AccountKind } from "@/lib/qonvo-data";
import { canKind, kindActionHint } from "@/lib/permissions";
import { AdReserve } from "@/components/ad-slot";
import { JoinCta } from "@/components/get-app";
import { DeskPayBox } from "@/components/pay-checkout";
import { PortraitAd } from "@/components/premium-ad";
import { uploadListingPhoto } from "@/lib/supabase";

const COPY: Record<
  ListingKind,
  {
    kicker: string;
    title: string;
    who: string;
    contact: string;
    extra: string;
    postHint: string;
    apply: boolean;
    icon: typeof Briefcase;
  }
> = {
  job: {
    kicker: "CAREERS",
    title: "Jobs",
    who: "Real opportunities. Real people. Find your next move.",
    contact: "Apply note / WhatsApp",
    extra: "Company",
    postHint: "Join as Job Poster to list a role.",
    apply: true,
    icon: Briefcase,
  },
  market: {
    kicker: "MARKET",
    title: "Marketplace",
    who: "Sellers showcase products with a contact link. No checkout inside Kilode. Staff approve first.",
    contact: "WhatsApp / Instagram",
    extra: "Brand",
    postHint: "Join as Marketplace seller to showcase.",
    apply: false,
    icon: Store,
  },
  rent: {
    kicker: "SPACES",
    title: "Rent / space",
    who: "Listers show properties with contact. No deposits or rent paid in the app. Staff approve first.",
    contact: "Agent contact",
    extra: "Area",
    postHint: "Join as Rent / space lister to post.",
    apply: false,
    icon: Building2,
  },
};

const ACTION = { job: "jobs.post", market: "market.list", rent: "rent.list" } as const;
const JOB_TYPES = ["Full-time", "Part-time", "Contract", "Freelance"];
const JOB_CATS = ["Tech", "Design", "Marketing", "Other"];
const MARKET_CATS = ["Fashion", "Phones", "Electronics", "Beauty", "Home", "Cars", "Services", "Other"];
const MARKET_PILLS = ["All", ...MARKET_CATS.filter((c) => c !== "Other")];
const CONDITIONS = ["New", "Used - Like New", "Used - Good", "Used - Fair"];

function readMeta(raw?: string) {
  try {
    return JSON.parse(raw || "{}") as { jobType?: string; category?: string; salary?: string; condition?: string; price?: string };
  } catch {
    return {};
  }
}

type Card = Listing & { image?: string };

function cover(r: Card) {
  return r.image || "";
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
  const meta = readMeta(r.meta);
  const c = (meta.category || "").toLowerCase();
  const blob = `${r.title} ${c}`.toLowerCase();
  if (pill === "Cars") return c === "cars" || c === "vehicles" || /car|vehicle/.test(blob);
  if (pill === "Phones") return c === "phones" || /phone|iphone|android/.test(blob);
  if (pill === "Services") return c === "services" || c.includes("service");
  return c === pill.toLowerCase();
}

const JOB_PILLS = ["All", "Tech", "Creative", "Sales", "Remote"] as const;
const SALARY_BANDS = ["Any", "Under ₦500k", "₦500k – ₦1M", "₦1M+"] as const;

function salaryNum(raw?: string) {
  const n = Number(String(raw || "").replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function jobPillMatch(r: Card, pill: string) {
  if (pill === "All") return true;
  const meta = readMeta(r.meta);
  const blob = `${r.title} ${r.body} ${r.city} ${meta.category || ""} ${meta.jobType || ""}`.toLowerCase();
  if (pill === "Tech") return /tech|engineer|developer|software/.test(blob);
  if (pill === "Creative") return /design|creative|writer|media|art/.test(blob);
  if (pill === "Sales") return /sale|market/.test(blob);
  if (pill === "Remote") return /remote/.test(blob);
  return true;
}

function salaryMatch(raw: string | undefined, band: string) {
  if (band === "Any") return true;
  const n = salaryNum(raw);
  if (!n) return false;
  if (band === "Under ₦500k") return n < 500000;
  if (band === "₦500k – ₦1M") return n >= 500000 && n <= 1000000;
  return n > 1000000;
}

function CompanyMark({ name }: { name: string }) {
  const label = (name || "Job").trim();
  const letter = label.slice(0, 1).toUpperCase();
  return (
    <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-line bg-panel-2 text-[13px] font-extrabold">
      {letter}
    </span>
  );
}

function Shot({ src, className }: { src?: string; className: string }) {
  if (src) return <img src={src} alt="" className={className} />;
  return (
    <div className={`grid place-items-center bg-panel-3 text-muted ${className}`}>
      <Store className="size-4" />
    </div>
  );
}

function SlimRail({ rows, onOpen }: { rows: Card[]; onOpen: (r: Card) => void }) {
  const track = useRef<HTMLDivElement>(null);
  const hover = useRef(false);
  useEffect(() => {
    if (rows.length < 2) return;
    const t = window.setInterval(() => {
      if (hover.current || !track.current) return;
      const el = track.current;
      const next = el.scrollLeft + el.clientWidth * 0.55;
      el.scrollTo({ left: next >= el.scrollWidth - 8 ? 0 : next, behavior: "smooth" });
    }, 4000);
    return () => window.clearInterval(t);
  }, [rows.length]);
  if (!rows.length) return null;
  return (
    <section className="mb-4">
      <div className="mb-1.5 text-[10px] font-medium tracking-[0.16em] text-lime-2">FEATURED</div>
      <div
        ref={track}
        className="flex gap-1.5 overflow-x-auto overscroll-x-contain pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        onPointerEnter={() => {
          hover.current = true;
        }}
        onPointerLeave={() => {
          hover.current = false;
        }}
      >
        {rows.map((r) => (
          <button key={r.id} type="button" className="w-[168px] shrink-0 overflow-hidden rounded-md border border-line bg-panel text-left" onClick={() => onOpen(r)}>
            <div className="flex">
              {cover(r) ? <img src={cover(r)} alt="" className="h-12 w-[72px] shrink-0 object-cover" /> : <div className="grid h-12 w-[72px] shrink-0 place-items-center bg-panel-3 text-[8px] text-lime-2">{r.kind.toUpperCase()}</div>}
              <div className="min-w-0 flex-1 px-1.5 py-1">
                <div className="truncate text-[10px] text-lime-2">{r.city || r.kind}</div>
                <div className="line-clamp-2 text-[11px] font-semibold leading-tight">{r.title}</div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

function Tile({ r, kind, onOpen }: { r: Card; kind: ListingKind; onOpen: (r: Card) => void }) {
  return (
    <button type="button" className="raised overflow-hidden rounded-lg text-left" onClick={() => onOpen(r)}>
      {cover(r) ? <img src={cover(r)} alt="" className="aspect-[16/9] w-full object-cover" /> : <div className="grid aspect-[16/9] w-full place-items-center bg-panel-3 text-[10px] font-bold tracking-[0.16em] text-lime-2">{kind.toUpperCase()}</div>}
      <div className="px-1.5 py-1">
        <div className="flex items-center gap-1 text-[9px] uppercase text-lime-2">
          <MapPin className="size-2.5" />
          {r.city || kind}
        </div>
        <div className="mt-0.5 line-clamp-2 text-[11px] font-normal leading-snug">{r.title}</div>
        <div className="mt-0.5 flex items-center justify-between text-[9px] text-muted">
          <span className="truncate">{r.company}</span>
          <span>{r.days ? `${r.days}d` : ""}</span>
        </div>
      </div>
    </button>
  );
}

export function ListingsPane({ kind }: { kind: ListingKind }) {
  const session = useCurrentUserState();
  const copy = COPY[kind];
  const Icon = copy.icon;
  const [rows, setRows] = useState<Card[]>([]);
  const [meKind, setMeKind] = useState<AccountKind>("member");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [city, setCity] = useState("");
  const [contact, setContact] = useState("");
  const [link, setLink] = useState("");
  const [company, setCompany] = useState("");
  const [note, setNote] = useState("");
  const [days, setDays] = useState(30);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [payFor, setPayFor] = useState<{ id: string; usd: number } | null>(null);
  const [shown, setShown] = useState(12);
  const [filter, setFilter] = useState("All");
  const [legal, setLegal] = useState(false);
  const [formOn, setFormOn] = useState(false);
  const [jobType, setJobType] = useState("Full-time");
  const [category, setCategory] = useState("Tech");
  const [salary, setSalary] = useState("");
  const [condition, setCondition] = useState("New");
  const [price, setPrice] = useState("");
  const [image, setImage] = useState("");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<Card | null>(null);
  const [q, setQ] = useState("");
  const [catPick, setCatPick] = useState("All");
  const [jobPill, setJobPill] = useState("All");
  const [jobTypeFilter, setJobTypeFilter] = useState("All");
  const [salaryBand, setSalaryBand] = useState("Any");
  const [roleTab, setRoleTab] = useState<"foryou" | "recommended">("foryou");
  const [kept, setKept] = useState<string[]>([]);
  const skipSave = useRef(true);

  function load() {
    void listListings({ data: { kind } })
      .then((live) => setRows(live))
      .catch(() => setRows([]));
  }
  useEffect(() => {
    load();
    setShown(12);
    setOpen(null);
    setFormOn(false);
    setImage("");
    setCategory(kind === "market" ? "Electronics" : "Tech");
  }, [kind]);

  useEffect(() => {
    if (!session.user) {
      setMeKind("member");
      return;
    }
    void getProfile()
      .then((p) => setMeKind(p.kind))
      .catch(() => undefined);
  }, [session.user?.id]);

  useEffect(() => {
    if (kind !== "job") return;
    skipSave.current = true;
    try {
      const raw = localStorage.getItem("kilode-job-seek");
      if (raw) {
        const p = JSON.parse(raw) as { type?: string; pill?: string; city?: string; band?: string };
        if (p.type) setJobTypeFilter(p.type);
        if (p.pill) setJobPill(p.pill);
        if (p.city) setFilter(p.city);
        if (p.band) setSalaryBand(p.band);
      }
      const saved = JSON.parse(localStorage.getItem("kilode-job-kept") || "[]") as unknown;
      if (Array.isArray(saved)) setKept(saved.filter((x) => typeof x === "string"));
    } catch { /* ignore */ }
  }, [kind]);

  useEffect(() => {
    if (kind !== "job") return;
    if (skipSave.current) {
      skipSave.current = false;
      return;
    }
    try {
      localStorage.setItem("kilode-job-seek", JSON.stringify({ type: jobTypeFilter, pill: jobPill, city: filter, band: salaryBand }));
    } catch { /* ignore */ }
  }, [kind, jobTypeFilter, jobPill, filter, salaryBand]);

  function keepJob(id: string) {
    setKept((list) => {
      const next = list.includes(id) ? list.filter((x) => x !== id) : [id, ...list];
      try { localStorage.setItem("kilode-job-kept", JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }

  const cities = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => {
      if (r.city) set.add(r.city);
    });
    return ["All", ...[...set].sort()];
  }, [rows]);
  const filtered = filter === "All" ? rows : rows.filter((r) => r.city === filter);
  const marketRows = useMemo(() => {
    const query = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter !== "All" && r.city !== filter) return false;
      if (!catMatch(r, catPick)) return false;
      if (!query) return true;
      const meta = readMeta(r.meta);
      return `${r.title} ${r.company} ${r.submitter} ${r.city} ${meta.category || ""}`.toLowerCase().includes(query);
    });
  }, [rows, q, catPick, filter]);
  const featured = filtered.slice(0, 8);
  const canPost = !!session.user && canKind(meKind, ACTION[kind]);
  const canApply = !!session.user && canKind(meKind, "jobs.apply");
  const jobRows = useMemo(() => {
    const query = q.trim().toLowerCase();
    return rows.filter((r) => {
      const meta = readMeta(r.meta);
      if (filter !== "All" && r.city !== filter) return false;
      if (jobTypeFilter === "Remote") {
        if (!/remote/i.test(`${meta.jobType || ""} ${r.city} ${r.title} ${r.body}`)) return false;
      } else if (jobTypeFilter !== "All" && (meta.jobType || "") !== jobTypeFilter) return false;
      if (!salaryMatch(meta.salary, salaryBand)) return false;
      if (!jobPillMatch(r, jobPill)) return false;
      if (!query) return true;
      return `${r.title} ${r.company} ${r.city} ${r.submitter} ${meta.category || ""}`.toLowerCase().includes(query);
    });
  }, [rows, q, filter, jobTypeFilter, salaryBand, jobPill]);

  function needJoin(href = "/login?mode=up") {
    window.location.href = href;
  }

  return (
    <div className={`mx-auto max-w-3xl pb-20 ${kind === "job" ? "px-3 pt-2" : "p-3"}`}>
      {kind === "job" ? null : (
      <div className="mb-3 flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-line bg-panel-2 text-lime-2">
          <Icon className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-medium tracking-[0.16em] text-lime-2">{copy.kicker}</div>
          <h2 className="text-2xl font-extrabold tracking-tight">{copy.title}</h2>
          <p className="mt-1 text-base leading-snug text-muted">{kind === "market" ? "Buy and sell with people around you." : copy.who}</p>
        </div>
      </div>
      )}

      {kind === "market" ? (
        <>
          <label className="mb-3 flex items-center gap-2 rounded-2xl border border-line bg-panel px-3 py-2.5">
            <Search className="size-4 shrink-0 text-muted" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products, sellers, categories..." className="min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-muted" />
          </label>
          <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {MARKET_PILLS.map((c) => (
              <button key={c} type="button" onClick={() => setCatPick(c)} className={`shrink-0 rounded-full px-3 py-1.5 text-[12px] font-bold ${catPick === c ? "bg-[#e6c56a] text-black" : "border border-line bg-panel text-fg"}`}>
                {c}
              </button>
            ))}
          </div>
          <div className="mb-3 flex items-center gap-2">
            <label className="inline-flex items-center gap-1 rounded-full border border-line bg-panel px-3 py-1.5 text-[12px] font-semibold">
              <MapPin className="size-3.5 text-lime-2" />
              <select value={filter} onChange={(e) => setFilter(e.target.value)} className="bg-transparent text-[12px] font-semibold outline-none" aria-label="Location">
                {cities.map((c) => <option key={c} value={c}>{c === "All" ? "Everywhere" : c}</option>)}
              </select>
            </label>
            <button
              type="button"
              className="ml-auto inline-flex items-center gap-1 rounded-full bg-[#e6c56a] px-3 py-1.5 text-[12px] font-extrabold text-black"
              onClick={() => {
                if (session.isPending) return;
                if (!session.user) {
                  needJoin();
                  return;
                }
                setFormOn((v) => !v);
              }}
            >
              <Plus className="size-3.5" /> List a product
            </button>
          </div>
        </>
      ) : kind === "job" ? null : (
        <>
      <AdReserve id={`list_${kind}_top`} className="mb-3" />

      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        {cities.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => {
              setFilter(c);
              setShown(12);
            }}
            className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] ${filter === c ? "btn-3d font-semibold text-lime-2" : "border border-line text-muted"}`}
          >
            {c}
          </button>
        ))}
        <button
          type="button"
          className="btn-yellow ml-auto rounded-full px-3 py-1 text-[10px] font-extrabold text-black"
          onClick={() => {
            if (session.isPending) return;
            if (!session.user) {
              needJoin();
              return;
            }
            setFormOn((v) => !v);
          }}
        >
          List a space
        </button>
      </div>
        </>
      )}

      {formOn ? (
        <div className="mb-4 space-y-2 rounded-2xl border border-white/10 border-t-white/20 bg-white/5 p-3 shadow-2xl backdrop-blur-xl">
          {canPost ? (
            <>
              <div className="text-[11px] font-medium text-muted">Staff approve this before it goes public · {days} days live</div>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={kind === "job" ? "Job title" : "Item title"} className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-base" />
              <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder={kind === "market" ? "Brand" : copy.extra} className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-base" />
              <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City / location" className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-base" />
              {kind === "job" ? (
                <div className="grid grid-cols-2 gap-2">
                  <select value={jobType} onChange={(e) => setJobType(e.target.value)} className="rounded-lg border border-white/10 bg-black/40 px-2 py-2 text-base" aria-label="Job type">
                    {JOB_TYPES.map((t) => <option key={t}>{t}</option>)}
                  </select>
                  <select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-lg border border-white/10 bg-black/40 px-2 py-2 text-base" aria-label="Category">
                    {JOB_CATS.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
              ) : null}
              {kind === "market" ? (
                <div className="grid grid-cols-2 gap-2">
                  <select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-lg border border-white/10 bg-black/40 px-2 py-2 text-base" aria-label="Category">
                    {MARKET_CATS.map((t) => <option key={t}>{t}</option>)}
                  </select>
                  <select value={condition} onChange={(e) => setCondition(e.target.value)} className="rounded-lg border border-white/10 bg-black/40 px-2 py-2 text-base" aria-label="Condition">
                    {CONDITIONS.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
              ) : null}
              {kind === "job" ? <input value={salary} onChange={(e) => setSalary(e.target.value)} placeholder="Salary range (optional)" className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-base" /> : null}
              {kind === "market" ? <input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Price in Naira" inputMode="decimal" className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-base" /> : null}
              <input value={contact} onChange={(e) => setContact(e.target.value)} placeholder={kind === "market" ? "WhatsApp or email" : copy.contact} className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-base" />
              <input value={link} onChange={(e) => setLink(e.target.value)} placeholder={kind === "job" ? "Application link or email" : "https://…"} className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-base" />
              <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} placeholder="Description" className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-base" />
              <label className="block rounded-xl border border-dashed border-white/15 px-3 py-2 text-[12px] text-muted">
                Photo · JPG, PNG, or WebP · 5MB max
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="mt-1 block w-full text-[12px]"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (!file) return;
                    setErr("");
                    setBusy(true);
                    void uploadListingPhoto(file)
                      .then((url) => setImage(url))
                      .catch((ex: unknown) => setErr(ex instanceof Error ? ex.message : "Could not add that photo."))
                      .finally(() => setBusy(false));
                  }}
                />
              </label>
              {image ? <img src={image} alt="" className="h-28 w-full rounded-xl object-cover" /> : null}
              <div className="flex flex-wrap gap-1">
                {[7, 14, 30].map((d) => (
                  <button key={d} type="button" onClick={() => setDays(d)} className={`rounded-full px-2.5 py-1 text-[11px] ${days === d ? "btn-yellow font-extrabold text-black" : "border border-white/15 text-muted"}`}>
                    {d} days live
                  </button>
                ))}
              </div>
              {err ? <p className="text-[11px] text-danger">{err}</p> : null}
              {msg ? <p className="text-[11px] text-lime-2">{msg}</p> : null}
              {payFor ? (
                <DeskPayBox
                  kind={kind}
                  purpose={payFor.id}
                  usd={payFor.usd}
                  onLive={() => {
                    setPayFor(null);
                    setMsg("Paid. It is live for the days you picked.");
                    setTitle("");
                    setBody("");
                    setCity("");
                    setContact("");
                    setLink("");
                    setCompany("");
                    setSalary("");
                    setPrice("");
                    setImage("");
                    setFormOn(false);
                    load();
                  }}
                />
              ) : null}
              {kind === "job" ? (
                <label className="flex items-start gap-2 text-[11px] leading-snug text-muted">
                  <input type="checkbox" className="mt-0.5" checked={legal} onChange={(e) => setLegal(e.target.checked)} />
                  <span>Kilode is only the discovery board. It is not the employer and is not liable for the role, the recruiter, or what applicants send. Verify the other person before you share private details.</span>
                </label>
              ) : null}
              <button
                type="button"
                disabled={busy}
                className="btn-yellow w-full rounded-full px-3 py-2 text-base font-extrabold text-black disabled:opacity-60"
                onClick={() => {
                  setErr("");
                  setMsg("");
                  if (kind === "job" && !legal) {
                    setErr("Tick the notice before you post a job.");
                    return;
                  }
                  if (title.trim().length < 3) {
                    setErr("Add a title.");
                    return;
                  }
                  setBusy(true);
                  void saveListing({ data: { kind, title, body, city, contact, link, company, days, image, jobType, category, salary, condition, price } }).then((r) => {
                    if (!r?.ok) setErr(r && "reason" in r ? r.reason : "Could not post.");
                    else if (r.needsPay) {
                      setPayFor({ id: r.id, usd: r.priceUsd });
                      setMsg("");
                    } else {
                      setPayFor(null);
                      setMsg("Submitted. Staff will approve before it is public.");
                      setTitle("");
                      setBody("");
                      setCity("");
                      setContact("");
                      setLink("");
                      setCompany("");
                      setSalary("");
                      setPrice("");
                      setImage("");
                      setFormOn(false);
                      load();
                    }
                  }).finally(() => setBusy(false));
                }}
              >
                {busy ? "Saving…" : payFor ? "Waiting for payment" : "Submit"}
              </button>
            </>
          ) : (
            <div className="space-y-2 py-2 text-center">
              <p className="text-base text-muted">{session.user ? kindActionHint(ACTION[kind]) : copy.postHint}</p>
              <JoinCta className="mx-auto w-40" />
            </div>
          )}
        </div>
      ) : null}

      {open ? (
        <article className="raised mb-4 overflow-hidden rounded-2xl">
          <img src={cover(open)} alt="" className="aspect-[16/9] w-full object-cover" />
          <div className="p-3">
            <div className="text-[10px] uppercase tracking-wide text-lime-2">
              {open.city || kind} · {open.company}
            </div>
            <h3 className="mt-0.5 text-lg font-bold">{open.title}</h3>
            {(() => {
              const meta = readMeta(open.meta);
              const bits = [meta.jobType, meta.category, meta.condition, meta.price ? `₦${meta.price}` : "", meta.salary].filter(Boolean);
              return bits.length ? <p className="mt-1 text-[11px] text-muted">{bits.join(" · ")}</p> : null;
            })()}
            <p className="mt-1 text-[13px] leading-snug text-muted">{open.body}</p>
            <div className="mt-2 text-[10px] text-muted">
              {open.submitter} · {timeLabel(open.ts)} · {fmtCount(open.views)} views
              {open.expiresAt ? ` · ${daysLeft(open.expiresAt, open.days)}d left` : open.days ? ` · ${open.days}d window` : ""}
            </div>
            {kind === "job" ? (
              session.user && canApply ? (
                <div className="mt-3 space-y-2">
                  <label className="flex items-start gap-2 text-[11px] leading-snug text-muted">
                    <input type="checkbox" className="mt-0.5" checked={legal} onChange={(e) => setLegal(e.target.checked)} />
                    <span>Kilode only introduces you. It does not hire, pay, or check the employer. Verify them before you send a CV or personal details.</span>
                  </label>
                  <div className="flex gap-1">
                  <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Short apply note" className="min-w-0 flex-1 rounded border border-line bg-panel px-2 py-1.5 text-base" />
                  <button
                    type="button"
                    className="btn-3d rounded-md px-3 text-[11px] font-semibold"
                    onClick={() => {
                      if (!legal) {
                        setErr("Tick the notice before you apply.");
                        setLegal(false);
                        return;
                      }
                      void applyListing({ data: { id: open.id, note } }).then((a) => {
                        if (!a.ok) setErr("reason" in a ? a.reason : "Could not apply.");
                        else setMsg("Application sent. Contact is on the listing — Kilode does not hire for you.");
                      });
                    }}
                  >
                    Apply
                  </button>
                  </div>
                </div>
              ) : (
                <div className="mt-3 text-center">
                  <p className="mb-1 text-[11px] text-muted">{session.user ? kindActionHint("jobs.apply") : "Join as Job Seeker or Member to apply."}</p>
                  <JoinCta className="mx-auto w-40" />
                </div>
              )
            ) : open.contact ? (
              <p className="mt-2 text-base text-fg">Contact: {open.contact}</p>
            ) : null}
            {open.link ? (
              <a href={open.link} target="_blank" rel="noreferrer" className="mt-2 inline-block text-[11px] text-lime-2">
                Open link
              </a>
            ) : null}
            <button type="button" className="mt-3 block text-[11px] text-muted" onClick={() => setOpen(null)}>
              Close
            </button>
            {err ? <p className="mt-1 text-[11px] text-danger">{err}</p> : null}
            {msg ? <p className="mt-1 text-[11px] text-lime-2">{msg}</p> : null}
          </div>
        </article>
      ) : null}

      {kind === "market" ? (
        <MarketBoard rows={marketRows} onOpen={setOpen} onSell={() => {
          if (session.isPending) return;
          if (!session.user) {
            needJoin();
            return;
          }
          setFormOn(true);
        }} />
      ) : kind === "job" ? (
        <JobBoard
          rows={jobRows}
          pool={rows}
          cities={cities}
          filter={filter}
          setFilter={setFilter}
          q={q}
          setQ={setQ}
          jobPill={jobPill}
          setJobPill={setJobPill}
          jobTypeFilter={jobTypeFilter}
          setJobTypeFilter={setJobTypeFilter}
          salaryBand={salaryBand}
          setSalaryBand={setSalaryBand}
          roleTab={roleTab}
          setRoleTab={setRoleTab}
          kept={kept}
          onKeep={keepJob}
          onOpen={setOpen}
          onPost={() => {
            if (session.isPending) return;
            if (!session.user) {
              needJoin();
              return;
            }
            setFormOn((v) => !v);
          }}
        />
      ) : (
        <>
      <SlimRail rows={featured} onOpen={setOpen} />
      <AdReserve id={`list_${kind}_mid`} className="mb-4" />

      <section>
        <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-medium tracking-[0.16em] text-lime-2">
          <Icon className="size-3" />
          SPACES
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {filtered.slice(0, shown).map((r) => (
            <Tile key={r.id} r={r} kind={kind} onOpen={setOpen} />
          ))}
        </div>
        {shown < filtered.length ? (
          <button type="button" className="btn-3d mx-auto mt-2 block rounded-md px-4 py-1.5 text-[11px] font-semibold" onClick={() => setShown((n) => n + 12)}>
            Load more · {filtered.length - shown} left
          </button>
        ) : null}
      </section>

      <PortraitAd id={`list_${kind}_portrait`} />
      <AdReserve id={`list_${kind}_low`} className="my-4" />

      {filtered.length > 6 ? (
        <section>
          <div className="mb-1.5 text-[10px] font-medium tracking-[0.16em] text-lime-2">MORE SPACES</div>
          <div className="grid grid-cols-3 gap-1.5">
            {filtered.slice(shown, shown + 6).map((r) => (
              <Tile key={`m-${r.id}`} r={r} kind={kind} onOpen={setOpen} />
            ))}
          </div>
        </section>
      ) : null}

      <AdReserve id={`list_${kind}_foot`} className="mt-4" />
        </>
      )}

      {!session.user ? (
        <div className="mt-4 rounded-xl border border-line bg-panel-2 p-3 text-center">
          <p className="text-base text-muted">Guests can browse. Join as the matching member type to post or apply.</p>
          <JoinCta className="mx-auto mt-2 w-40" />
        </div>
      ) : null}
    </div>
  );
}

function payLabel(raw?: string) {
  const t = String(raw || "").trim();
  if (!t || /^salary|^ask/i.test(t)) return t || "Salary on request";
  if (t.startsWith("₦")) return t;
  if (/^N\s?\d/.test(t)) return `₦${t.replace(/^N\s?/, "")}`;
  if (/^\d/.test(t)) return /[–—-]/.test(t) ? `₦${t}` : naira(t);
  return t;
}

function roleTags(r: Card) {
  const meta = readMeta(r.meta);
  const tags = [meta.category, meta.jobType].filter((x): x is string => !!x && x !== "Remote");
  return [...new Set(tags)].slice(0, 3);
}

function trendBits(rows: Card[]) {
  const counts = new Map<string, number>();
  for (const r of rows) {
    if (r.city) counts.set(r.city, (counts.get(r.city) || 0) + 2);
    const meta = readMeta(r.meta);
    if (meta.category) counts.set(meta.category, (counts.get(meta.category) || 0) + 1);
    const head = r.title.split(/[—–-]/)[0]?.trim() || "";
    if (head.length > 2 && head.length < 26) counts.set(head, (counts.get(head) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([name]) => name);
}

function stamp(ts: number) {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "";
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

const JOB_LANES = [
  { id: "Tech", icon: Laptop },
  { id: "Creative", icon: Pencil },
  { id: "Sales", icon: TrendingUp },
  { id: "Remote", icon: Home },
  { id: "All", icon: Briefcase },
] as const;

function JobBoard({
  rows,
  pool,
  cities,
  filter,
  setFilter,
  q,
  setQ,
  jobPill,
  setJobPill,
  jobTypeFilter,
  setJobTypeFilter,
  salaryBand,
  setSalaryBand,
  roleTab,
  setRoleTab,
  kept,
  onKeep,
  onOpen,
  onPost,
}: {
  rows: Card[];
  pool: Card[];
  cities: string[];
  filter: string;
  setFilter: (v: string) => void;
  q: string;
  setQ: (v: string) => void;
  jobPill: string;
  setJobPill: (v: string) => void;
  jobTypeFilter: string;
  setJobTypeFilter: (v: string) => void;
  salaryBand: string;
  setSalaryBand: (v: string) => void;
  roleTab: "foryou" | "recommended";
  setRoleTab: (v: "foryou" | "recommended") => void;
  kept: string[];
  onKeep: (id: string) => void;
  onOpen: (r: Card) => void;
  onPost: () => void;
}) {
  const [filtersOn, setFiltersOn] = useState(false);
  const [menu, setMenu] = useState("");
  const [hidden, setHidden] = useState<string[]>([]);
  const live = rows.filter((r) => !hidden.includes(r.id));
  const featured = live.slice(0, 2);
  const savedFirst = [...live].sort((a, b) => Number(kept.includes(b.id)) - Number(kept.includes(a.id)));
  const openRoles = roleTab === "recommended" ? [...live].reverse() : savedFirst;
  const trends = trendBits(pool);
  const laneCount = (id: string) => (id === "All" ? pool.length : pool.filter((r) => jobPillMatch(r, id)).length);

  function pickType(next: string) {
    setJobTypeFilter(next);
    setRoleTab("foryou");
  }

  function seeAll() {
    setJobPill("All");
    setJobTypeFilter("All");
    setSalaryBand("Any");
    document.getElementById("kilode-roles")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="job-board">
      <button type="button" className="job-hero" onClick={() => document.getElementById("kilode-roles")?.scrollIntoView({ behavior: "smooth", block: "start" })}>
        <span className="job-hero-copy">
          <span className="job-hero-kicker"><Briefcase className="size-3.5" /> Careers</span>
          <strong>Build your next <em>opportunity</em></strong>
          <span>Real jobs. Real companies. Real people.</span>
        </span>
        <span className="job-hero-go" aria-hidden><ChevronRight className="size-5" /></span>
      </button>

      <div className="job-trend">
        <span className="job-trend-pill"><TrendingUp className="size-3.5" /> Trending</span>
        <div>
          {trends.length === 0 ? <em>Roles show here once they are approved.</em> : trends.map((name) => (
            <button key={name} type="button" onClick={() => setQ(name)}>{name}</button>
          ))}
        </div>
      </div>

      <div className="job-search">
        <label>
          <Search className="size-4" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search jobs, companies, skills..." />
        </label>
        <button type="button" className={filtersOn ? "on" : ""} aria-label="Filters" onClick={() => setFiltersOn((v) => !v)}>
          <SlidersHorizontal className="size-4" />
        </button>
      </div>

      {filtersOn ? (
        <div className="job-sheet">
          <div className="job-sheet-label">Salary</div>
          <div className="job-sheet-row">
            {SALARY_BANDS.map((band) => (
              <button key={band} type="button" className={salaryBand === band ? "on" : ""} onClick={() => setSalaryBand(band)}>{band}</button>
            ))}
          </div>
          <div className="job-sheet-label">Also</div>
          <div className="job-sheet-row">
            {["Contract", "Freelance"].map((t) => (
              <button key={t} type="button" className={jobTypeFilter === t ? "on" : ""} onClick={() => pickType(jobTypeFilter === t ? "All" : t)}>{t}</button>
            ))}
            <button type="button" onClick={() => { setSalaryBand("Any"); setJobTypeFilter("All"); setJobPill("All"); setFilter("All"); setQ(""); }}>Clear</button>
          </div>
          <button type="button" className="job-post" onClick={onPost}><Plus className="size-3.5" /> Post a role</button>
        </div>
      ) : null}

      <div className="job-types">
        <label>
          <MapPin className="size-3.5" />
          <select value={cities.includes(filter) ? filter : "All"} onChange={(e) => setFilter(e.target.value)} aria-label="Location">
            {cities.map((c) => <option key={c} value={c}>{c === "All" ? "Location" : c}</option>)}
          </select>
        </label>
        {["All", "Full-time", "Part-time", "Remote"].map((t) => (
          <button key={t} type="button" className={jobTypeFilter === t ? "on" : ""} onClick={() => pickType(t)}>{t}</button>
        ))}
      </div>

      <section className="job-block">
        <div className="job-head">
          <h3>Featured jobs</h3>
          <button type="button" onClick={seeAll}>See all <ChevronRight className="size-3.5" /></button>
        </div>
        {featured.length === 0 ? (
          <p className="job-empty">No roles in this cut yet. Change location or type, or post one.</p>
        ) : (
          <div className="job-featured">
            {featured.map((r) => {
              const meta = readMeta(r.meta);
              return (
                <button key={r.id} type="button" className="job-card" onClick={() => onOpen(r)}>
                  <span className="job-card-top">
                    <CompanyMark name={r.company || r.title} />
                    <span>{r.company || "Company"}</span>
                    <Bookmark className={kept.includes(r.id) ? "on" : ""} onClick={(e) => { e.stopPropagation(); onKeep(r.id); }} />
                  </span>
                  <strong>{r.title}</strong>
                  <em><MapPin className="size-3" /> {r.city || "Nigeria"} · {meta.jobType || "Open role"}</em>
                  <span className="job-card-foot">
                    <b>{payLabel(meta.salary)}</b>
                    <i>{stamp(r.ts)}</i>
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <div className="job-lanes">
        {JOB_LANES.map((lane) => {
          const Icon = lane.icon;
          const on = lane.id === "All" ? jobPill === "All" : jobPill === lane.id;
          return (
            <button key={lane.id} type="button" className={on ? "on" : ""} onClick={() => { setJobPill(lane.id); setRoleTab("foryou"); document.getElementById("kilode-roles")?.scrollIntoView({ behavior: "smooth", block: "start" }); }}>
              <Icon className="size-4" />
              <strong>{lane.id === "All" ? "All jobs" : lane.id}</strong>
              <em>{fmtCount(laneCount(lane.id))}</em>
            </button>
          );
        })}
      </div>

      <section className="job-block" id="kilode-roles">
        <div className="job-head">
          <h3>Open roles</h3>
          <div className="job-tabs">
            <button type="button" className={roleTab === "foryou" ? "on" : ""} onClick={() => setRoleTab("foryou")}>For you</button>
            <button type="button" className={roleTab === "recommended" ? "on" : ""} onClick={() => setRoleTab("recommended")}>Recommended</button>
          </div>
        </div>
        {openRoles.length === 0 ? <p className="job-empty">Nothing in this lane. Saved roles and the filters you pick come back next time.</p> : null}
        <div className="job-roles">
          {openRoles.slice(0, 12).map((r) => {
            const meta = readMeta(r.meta);
            const tags = roleTags(r);
            return (
              <article key={r.id} className="job-role">
                <button type="button" className="job-role-main" onClick={() => onOpen(r)}>
                  <CompanyMark name={r.company || r.title} />
                  <span>
                    <i>{r.company || "Company"}</i>
                    <strong>{r.title}</strong>
                    <em><MapPin className="size-3" /> {r.city || "Nigeria"} · {meta.jobType || "Open role"}</em>
                    {tags.length > 0 ? <span className="job-tags">{tags.map((t) => <b key={t}>{t}</b>)}</span> : null}
                  </span>
                </button>
                <span className="job-role-side">
                  <span>
                    <Bookmark className={kept.includes(r.id) ? "on" : ""} onClick={() => onKeep(r.id)} />
                    <button type="button" aria-label="More" onClick={() => setMenu((id) => (id === r.id ? "" : r.id))}><MoreHorizontal className="size-4" /></button>
                  </span>
                  <b>{payLabel(meta.salary)}</b>
                  <i>{timeAgo(r.ts)}</i>
                  {menu === r.id ? (
                    <span className="job-menu">
                      <button type="button" onClick={() => { setMenu(""); onOpen(r); }}>Open</button>
                      <button type="button" onClick={() => { onKeep(r.id); setMenu(""); }}>{kept.includes(r.id) ? "Unsave" : "Save"}</button>
                      <button type="button" onClick={() => {
                        setMenu("");
                        const url = r.link || window.location.href;
                        if (navigator.share) void navigator.share({ title: r.title, url });
                        else void navigator.clipboard?.writeText(url);
                      }}>Share</button>
                      <button type="button" onClick={() => { setHidden((list) => [...list, r.id]); setMenu(""); }}>Hide</button>
                    </span>
                  ) : null}
                </span>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function MarketBoard({ rows, onOpen, onSell }: { rows: Card[]; onOpen: (r: Card) => void; onSell: () => void }) {
  const featured = rows.slice(0, 3);
  const recent = rows.slice(0, 4);
  return (
    <>
      <section className="mb-4">
        <div className="mb-2 text-[10px] font-bold tracking-[0.16em] text-lime-2">FEATURED</div>
        {featured.length === 0 ? (
          <p className="rounded-2xl border border-line bg-panel px-3 py-6 text-center text-[12px] text-muted">No approved products in this filter yet. List one and staff will review it.</p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {featured.map((r) => {
              const meta = readMeta(r.meta);
              return (
                <button key={r.id} type="button" onClick={() => onOpen(r)} className="overflow-hidden rounded-2xl border border-line bg-panel text-left">
                  <Shot src={cover(r)} className="aspect-[4/3] w-full object-cover" />
                  <div className="p-1.5">
                    <div className="line-clamp-2 text-[11px] font-bold leading-tight">{r.title}</div>
                    <div className="mt-0.5 flex items-center gap-0.5 text-[9px] text-muted"><MapPin className="size-2.5" /> {r.city || "Nigeria"}</div>
                    <div className="truncate text-[9px] text-muted">@{r.submitter}</div>
                    <div className="text-[11px] font-extrabold text-[#e6c56a]">{naira(meta.price) || "Ask"}</div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <AdReserve id="list_market_mid" className="mb-4" />

      <section className="mb-4">
        <div className="mb-2 flex items-center gap-1.5 text-[10px] font-bold tracking-[0.16em] text-lime-2">
          <Store className="size-3" /> ON THE MARKET
        </div>
        <div className="grid grid-cols-2 gap-2">
          {rows.map((r) => {
            const meta = readMeta(r.meta);
            return (
              <button key={r.id} type="button" onClick={() => onOpen(r)} className="flex gap-2 rounded-2xl border border-line bg-panel p-2 text-left">
                <Shot src={cover(r)} className="size-16 shrink-0 rounded-xl object-cover" />
                <span className="min-w-0">
                  <span className="line-clamp-2 block text-[12px] font-bold leading-tight">{r.title}</span>
                  <span className="mt-0.5 block text-[13px] font-extrabold text-[#e6c56a]">{naira(meta.price) || "Ask"}</span>
                  <span className="flex items-center gap-0.5 text-[10px] text-muted"><MapPin className="size-3" /> {r.city || "Nigeria"}</span>
                  <span className="block truncate text-[10px] text-muted">@{r.submitter}</span>
                  <span className="block text-[10px] text-muted">{[meta.condition, timeAgo(r.ts)].filter(Boolean).join(" · ")}</span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="mb-4">
        <div className="mb-2 text-[10px] font-bold tracking-[0.16em] text-lime-2">POPULAR NEAR YOU</div>
        <div className="flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {MARKET_PILLS.filter((c) => c !== "All").map((c) => {
            const hit = rows.find((r) => catMatch(r, c) && cover(r));
            return (
              <div key={c} className="w-16 shrink-0 text-center">
                <Shot src={hit ? cover(hit) : ""} className="mx-auto size-14 rounded-full object-cover" />
                <div className="mt-1 truncate text-[10px] font-semibold">{c}</div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mb-4">
        <div className="mb-2 text-[10px] font-bold tracking-[0.16em] text-lime-2">RECENTLY LISTED</div>
        <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {recent.map((r) => {
            const meta = readMeta(r.meta);
            return (
              <button key={`rec-${r.id}`} type="button" onClick={() => onOpen(r)} className="flex w-36 shrink-0 items-center gap-2 rounded-xl border border-line bg-panel p-2 text-left">
                <Shot src={cover(r)} className="size-10 shrink-0 rounded-lg object-cover" />
                <span className="min-w-0">
                  <span className="block truncate text-[11px] font-bold">{r.title}</span>
                  <span className="block text-[11px] font-extrabold text-[#e6c56a]">{naira(meta.price) || "Ask"}</span>
                  <span className="block text-[9px] text-muted">{timeAgo(r.ts)}</span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <button type="button" onClick={onSell} className="flex w-full items-center justify-center gap-1 rounded-full bg-[#e6c56a] py-3 text-[14px] font-extrabold text-black">
        <Plus className="size-4" /> Sell something
      </button>
    </>
  );
}

export function ListingsAdminPanel() {
  const [rows, setRows] = useState<Listing[]>([]);
  const [msg, setMsg] = useState("");
  function load() {
    void listListingQueue()
      .then(setRows)
      .catch(() => setRows([]));
  }
  useEffect(() => {
    load();
  }, []);
  return (
    <div className="md:col-span-2 raised space-y-2 rounded-xl p-3">
      <div className="text-[11px] font-medium text-muted">Jobs · Marketplace · Rent</div>
      <p className="text-xs text-muted">Free listings wait here for staff. Paid ones go live when payment confirms and skip this queue. Staff can still reject a scam.</p>
      {msg ? <p className="text-[11px] text-lime-2">{msg}</p> : null}
      {rows.map((r) => (
        <div key={r.id} className="flex items-center gap-2 rounded-lg border border-line bg-panel p-2">
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">{r.title}</div>
            <div className="text-[10px] text-muted">
              {r.kind} · {r.status} · {r.submitter} · {r.city}
            </div>
          </div>
          {r.status === "pending" ? (
            <button
              type="button"
              className="text-[10px] text-lime-2"
              onClick={() =>
                void setListingStatus({ data: { id: r.id, status: "approved" } }).then(() => {
                  setMsg("Approved");
                  load();
                })
              }
            >
              Approve
            </button>
          ) : null}
          {r.status !== "rejected" ? (
            <button
              type="button"
              className="text-[10px] text-danger"
              onClick={() =>
                void setListingStatus({ data: { id: r.id, status: "rejected" } }).then(() => {
                  setMsg("Rejected");
                  load();
                })
              }
            >
              Reject
            </button>
          ) : null}
        </div>
      ))}
    </div>
  );
}
