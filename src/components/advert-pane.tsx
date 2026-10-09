import { useMemo, useState } from "react";
import {
  Briefcase,
  Calendar,
  Eye,
  Flame,
  Landmark,
  Laptop,
  Megaphone,
  Music,
  Newspaper,
  Radio,
  Search,
  Shirt,
  Sparkles,
  Star,
  Store,
  Users,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import { adVertical, fmtCount, type Campaign } from "@/lib/qonvo-data";

const ACCENT = "#22c55e";

const FILTERS = ["All", "Premium", "30 Days", "7 Days", "Sponsored"] as const;
const CATS: { id: string; Icon: LucideIcon }[] = [
  { id: "Telecom", Icon: Radio },
  { id: "Banking", Icon: Landmark },
  { id: "Fashion", Icon: Shirt },
  { id: "Food", Icon: UtensilsCrossed },
  { id: "Tech", Icon: Laptop },
  { id: "Beauty", Icon: Sparkles },
  { id: "Sports", Icon: Flame },
];

const PACKS: { days: string; name: string; price: string; Icon: LucideIcon; placement: string }[] = [
  { days: "7 DAYS", name: "Social Push", price: "From ₦75,000", Icon: Laptop, placement: "board" },
  { days: "30 DAYS", name: "Full Reach", price: "From ₦250,000", Icon: Calendar, placement: "featured" },
  { days: "SPONSORED", name: "Top Placement", price: "From ₦500,000", Icon: Star, placement: "feeds-hero" },
];

const PLACES: { id: string; label: string; Icon: LucideIcon }[] = [
  { id: "feeds", label: "Media", Icon: Newspaper },
  { id: "socials", label: "Socials", Icon: Users },
  { id: "music", label: "Music", Icon: Music },
  { id: "events", label: "Events", Icon: Calendar },
  { id: "jobs", label: "Jobs", Icon: Briefcase },
  { id: "market", label: "Market", Icon: Store },
];

const PLACE_PRICE: Record<string, string> = {
  featured: "₦250,000",
  square: "₦180,000",
  "feeds-hero": "₦500,000",
  "feeds-strip": "₦180,000",
  board: "₦75,000",
  story: "₦320,000",
  chat: "₦200,000",
  "chat-pin": "₦400,000",
  cinema: "₦220,000",
  "article-leader": "₦160,000",
  "article-mid": "₦140,000",
};

const SHOWCASE = [
  {
    name: "Media hero",
    note: "Top of the news feed",
    price: "₦500,000",
    image: "https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=900&q=70",
  },
  {
    name: "Discovery card",
    note: "Square beside stories",
    price: "₦250,000",
    image: "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&w=900&q=70",
  },
];

function thumbOf(a: Campaign) {
  return a.image || "";
}

function placeLabel(p: string) {
  if (p === "feeds-hero" || p === "feeds-strip" || p === "article-leader" || p === "article-mid" || p === "story") return "Media";
  if (p === "chat" || p === "chat-pin" || p === "board") return "Socials";
  if (p === "cinema") return "Events";
  if (p === "featured" || p === "square") return "Discovery";
  return "Kilode";
}

function matchesFilter(a: Campaign, f: (typeof FILTERS)[number]) {
  if (f === "All") return true;
  if (f === "Premium") return a.placement === "featured" || a.placement === "square" || a.placement === "feeds-hero";
  if (f === "30 Days") return (a.days ?? 0) >= 30;
  if (f === "7 Days") return (a.days ?? 0) === 7 || (a.days ?? 0) === 14;
  return a.placement === "featured" || a.placement === "feeds-hero" || a.placement === "chat-pin";
}

function matchesPlace(a: Campaign, place: string) {
  if (!place) return true;
  const label = placeLabel(a.placement).toLowerCase();
  if (place === "feeds") return label === "media" || label === "discovery";
  if (place === "socials") return label === "socials";
  if (place === "events") return label === "events";
  if (place === "music") return /music|spotify|audiomack/i.test(`${a.name} ${a.note}`);
  if (place === "jobs") return /job|hire/i.test(`${a.name} ${a.note}`);
  if (place === "market") return /shop|market|deal|jumia/i.test(`${a.name} ${a.note}`);
  return true;
}

export function AdvertPane({ ads, onCreate, onView }: { ads: Campaign[]; onCreate: () => void; onView: (id: string) => void }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const [cat, setCat] = useState("All");
  const [place, setPlace] = useState("");
  const [more, setMore] = useState(false);

  const live = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return ads.filter((a) => {
      if (a.status !== "approved") return false;
      if (cat !== "All" && adVertical(a.name, a.note) !== cat) return false;
      if (!matchesFilter(a, filter)) return false;
      if (!matchesPlace(a, place)) return false;
      if (!needle) return true;
      return `${a.name} ${a.note} ${a.placement}`.toLowerCase().includes(needle);
    });
  }, [ads, q, filter, cat, place]);

  const mine = ads.filter((a) => a.status !== "approved" && a.status !== "rejected");
  const premium = (more ? live : live.slice(0, 4));
  const hero = premium[0];
  const side = premium[1];

  function open(a: Campaign) {
    onView(a.id);
    if (a.link) window.open(a.link, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="fm-page">
      <div className="fm-banner">
        <div className="fm-head">
          <span className="fm-mark"><Megaphone className="size-5" /></span>
          <div className="min-w-0 flex-1">
            <div className="fm-kicker">ADS MARKETPLACE</div>
            <h1 className="fm-title">Ads Marketplace</h1>
            <p className="fm-sub">Create, publish and track campaigns across Media, Socials, Music, Events, Jobs and more.</p>
          </div>
          <button type="button" className="fm-cta" onClick={onCreate}>+ Place an Ad</button>
        </div>

        <label className="fm-search">
          <Search className="size-4 shrink-0" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search campaigns, brands, categories..." aria-label="Search campaigns" />
        </label>

        <div className="fm-pills">
          {FILTERS.map((f) => (
            <button key={f} type="button" className={filter === f ? "on" : ""} onClick={() => setFilter(f)}>{f}</button>
          ))}
        </div>

        <div className="fm-cats">
          <button type="button" className={cat === "All" ? "on" : ""} onClick={() => setCat("All")} aria-label="All categories">
            <Sparkles className="size-4" />
            <span>All</span>
          </button>
          {CATS.map((c) => (
            <button key={c.id} type="button" className={cat === c.id ? "on" : ""} onClick={() => setCat(c.id)}>
              <c.Icon className="size-4" />
              <span>{c.id}</span>
            </button>
          ))}
        </div>
      </div>

      <section className="fm-sec">
        <div className="fm-sec-h">
          <div>
            <h2>PREMIUM PLACEMENTS</h2>
            <p>High visibility. Real engagement. Maximum reach.</p>
          </div>
          {live.length > 2 ? <button type="button" className="fm-link" onClick={() => setMore((v) => !v)}>{more ? "Show less" : "See all →"}</button> : null}
        </div>
        {hero ? (
          <div className="fm-prem">
            {[hero, side].filter(Boolean).map((a) => a ? (
              <article key={a.id} className="fm-prem-card">
                <div className="fm-shot">
                  {thumbOf(a) ? <img src={thumbOf(a)} alt="" /> : <span className="fm-shot-fallback">{a.name}</span>}
                  <em>PREMIUM</em>
                </div>
                <h3>{a.name}</h3>
                <p>{placeLabel(a.placement)}{a.note ? ` · ${a.note}` : ""}</p>
                <div className="fm-row">
                  <b style={{ color: ACCENT }}>From {PLACE_PRICE[a.placement] || "₦75,000"}</b>
                  <button type="button" className="fm-ghost" onClick={() => open(a)}>View placement →</button>
                </div>
              </article>
            ) : null)}
          </div>
        ) : (
          <div className="fm-prem">
            {SHOWCASE.map((a) => (
              <article key={a.name} className="fm-prem-card">
                <div className="fm-shot">
                  <img src={a.image} alt="" />
                  <em>PREMIUM</em>
                </div>
                <h3>{a.name}</h3>
                <p>{a.note}</p>
                <div className="fm-row">
                  <b style={{ color: ACCENT }}>From {a.price}</b>
                  <button type="button" className="fm-ghost" onClick={onCreate}>View placement →</button>
                </div>
              </article>
            ))}
          </div>
        )}
        {more && live.length > 2 ? (
          <div className="fm-prem mt">
            {live.slice(2).map((a) => (
              <article key={a.id} className="fm-prem-card">
                <div className="fm-shot">
                  {thumbOf(a) ? <img src={thumbOf(a)} alt="" /> : <span className="fm-shot-fallback">{a.name}</span>}
                  <em>LIVE</em>
                </div>
                <h3>{a.name}</h3>
                <p>{fmtCount(a.views ?? 0)} views · {a.days ?? 7}d</p>
                <button type="button" className="fm-ghost" onClick={() => open(a)}>View placement →</button>
              </article>
            ))}
          </div>
        ) : null}
      </section>

      <section className="fm-sec">
        <div className="fm-sec-h"><h2>POPULAR CAMPAIGNS</h2></div>
        <div className="fm-packs">
          {PACKS.map((p) => (
            <article key={p.days} className="fm-pack">
              <em className="fm-pack-days">{p.days}</em>
              <span className="fm-pack-ico"><p.Icon className="size-5" /></span>
              <b>{p.name}</b>
              <strong>{p.price}</strong>
              <button type="button" className="fm-ghost" onClick={onCreate}>Start campaign →</button>
            </article>
          ))}
        </div>
      </section>

      <section className="fm-sec">
        <h2 className="fm-sec-title">BY PLACEMENT</h2>
        <div className="fm-places">
          {PLACES.map((p) => (
            <button key={p.id} type="button" className={place === p.id ? "on" : ""} onClick={() => setPlace((cur) => (cur === p.id ? "" : p.id))}>
              <p.Icon className="size-4" />
              <span>{p.label}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="fm-sec">
        <div className="fm-sec-h">
          <div>
            <h2>YOUR CAMPAIGNS</h2>
            <p>Track performance and manage your ads.</p>
          </div>
          <button type="button" className="fm-link" onClick={onCreate}>See all →</button>
        </div>
        {mine.length ? mine.map((a) => (
          <article key={a.id} className="fm-yours">
            {thumbOf(a) ? <img src={thumbOf(a)} alt="" /> : <span className="fm-yours-ph">AD</span>}
            <div className="min-w-0 flex-1">
              <div className="fm-yours-top">
                <em>{a.status === "paid" ? "PAID" : "REVIEW"}</em>
                <b>{a.name}</b>
              </div>
              <p>{placeLabel(a.placement)} · {a.days ?? 7} days</p>
              <small><Eye className="size-3" /> {fmtCount(a.views ?? 0)} impressions</small>
            </div>
            <button type="button" className="fm-ghost" onClick={onCreate}>Analytics →</button>
          </article>
        )) : (
          <button type="button" className="fm-empty" onClick={onCreate}>
            You have no campaign in review. Place an ad to track it here.
          </button>
        )}
      </section>
    </div>
  );
}
