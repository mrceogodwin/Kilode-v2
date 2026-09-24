import { useEffect, useMemo, useRef, useState } from "react";
import { Briefcase, Building2, MapPin, Store } from "lucide-react";
import { applyListing, listListingQueue, listListings, saveListing, setListingStatus, type Listing, type ListingKind } from "@/lib/listings-server";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { getProfile } from "@/lib/forum-server";
import { daysLeft, fmtCount, timeLabel, type AccountKind } from "@/lib/qonvo-data";
import { canKind, kindActionHint } from "@/lib/permissions";
import { AdReserve } from "@/components/ad-slot";
import { JoinCta } from "@/components/get-app";
import { PortraitAd } from "@/components/premium-ad";

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
    who: "Browse roles across Nigeria. Job Posters list them. Job Seekers and members apply. Staff approve first.",
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

type Card = Listing & { image?: string };

function cover(r: Card) {
  return r.image || "";
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
  const [shown, setShown] = useState(12);
  const [filter, setFilter] = useState("All");
  const [formOn, setFormOn] = useState(false);
  const [open, setOpen] = useState<Card | null>(null);

  function load() {
    void listListings({ data: { kind } })
      .then((live) => setRows(live))
      .catch(() => setRows([]));
  }
  useEffect(() => {
    load();
    setShown(12);
    setFilter("All");
    setOpen(null);
    setFormOn(false);
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

  const cities = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => {
      if (r.city) set.add(r.city);
    });
    return ["All", ...[...set].sort()];
  }, [rows]);
  const filtered = filter === "All" ? rows : rows.filter((r) => r.city === filter);
  const featured = filtered.slice(0, 8);
  const canPost = !!session.user && canKind(meKind, ACTION[kind]);
  const canApply = !!session.user && canKind(meKind, "jobs.apply");

  function needJoin(href = "/login?mode=up") {
    window.location.href = href;
  }

  return (
    <div className="mx-auto max-w-3xl p-3 pb-20">
      <div className="mb-3 flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-line bg-panel-2 text-lime-2">
          <Icon className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-medium tracking-[0.16em] text-lime-2">{copy.kicker}</div>
          <h2 className="text-2xl font-extrabold tracking-tight">{copy.title}</h2>
          <p className="mt-1 text-base leading-snug text-muted">{copy.who}</p>
        </div>
      </div>

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
        <button type="button" className="btn-3d ml-auto rounded-md px-2.5 py-1 text-[10px] font-semibold" onClick={() => (session.user ? setFormOn((v) => !v) : needJoin())}>
          {kind === "job" ? "Post a job" : kind === "market" ? "List a product" : "List a space"}
        </button>
      </div>

      {formOn ? (
        <div className="raised mb-4 space-y-2 rounded-xl p-3">
          {canPost ? (
            <>
              <div className="text-[11px] font-medium text-muted">Submit for staff approval · {days} days live</div>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-base" />
              <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder={copy.extra} className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-base" />
              <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City / area" className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-base" />
              <input value={contact} onChange={(e) => setContact(e.target.value)} placeholder={copy.contact} className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-base" />
              <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://…" className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-base" />
              <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} placeholder="Short description" className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-base" />
              <div className="flex flex-wrap gap-1">
                {[7, 14, 30].map((d) => (
                  <button key={d} type="button" onClick={() => setDays(d)} className={`rounded-full px-2.5 py-1 text-[11px] ${days === d ? "btn-3d font-semibold" : "border border-line text-muted"}`}>
                    {d} days live
                  </button>
                ))}
              </div>
              {err ? <p className="text-[11px] text-danger">{err}</p> : null}
              {msg ? <p className="text-[11px] text-lime-2">{msg}</p> : null}
              <button
                type="button"
                className="btn-join rounded-lg px-3 py-2 text-base font-bold"
                onClick={() => {
                  setErr("");
                  setMsg("");
                  void saveListing({ data: { kind, title, body, city, contact, link, company, days } }).then((r) => {
                    if (!r?.ok) setErr(r && "reason" in r ? r.reason : "Could not post.");
                    else {
                      setMsg("Submitted. Staff will approve before it is public.");
                      setTitle("");
                      setBody("");
                      setCity("");
                      setContact("");
                      setLink("");
                      setCompany("");
                    }
                  });
                }}
              >
                Submit for approval
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
            <p className="mt-1 text-[13px] leading-snug text-muted">{open.body}</p>
            <div className="mt-2 text-[10px] text-muted">
              {open.submitter} · {timeLabel(open.ts)} · {fmtCount(open.views)} views
              {open.expiresAt ? ` · ${daysLeft(open.expiresAt, open.days)}d left` : open.days ? ` · ${open.days}d window` : ""}
            </div>
            {kind === "job" ? (
              session.user && canApply ? (
                <div className="mt-3 flex gap-1">
                  <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Short apply note" className="min-w-0 flex-1 rounded border border-line bg-panel px-2 py-1.5 text-base" />
                  <button
                    type="button"
                    className="btn-3d rounded-md px-3 text-[11px] font-semibold"
                    onClick={() => {
                      void applyListing({ data: { id: open.id, note } }).then((a) => {
                        if (!a.ok) setErr("reason" in a ? a.reason : "Could not apply.");
                        else setMsg("Application sent. Contact is on the listing — Kilode does not hire for you.");
                      });
                    }}
                  >
                    Apply
                  </button>
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

      <SlimRail rows={featured} onOpen={setOpen} />
      <AdReserve id={`list_${kind}_mid`} className="mb-4" />

      <section>
        <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-medium tracking-[0.16em] text-lime-2">
          <Icon className="size-3" />
          {kind === "job" ? "OPEN ROLES" : kind === "market" ? "ON THE MARKET" : "SPACES"}
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
          <div className="mb-1.5 text-[10px] font-medium tracking-[0.16em] text-lime-2">{kind === "job" ? "MORE ROLES" : kind === "market" ? "MORE FINDS" : "MORE SPACES"}</div>
          <div className="grid grid-cols-3 gap-1.5">
            {filtered.slice(shown, shown + 6).map((r) => (
              <Tile key={`m-${r.id}`} r={r} kind={kind} onOpen={setOpen} />
            ))}
          </div>
        </section>
      ) : null}

      <AdReserve id={`list_${kind}_foot`} className="mt-4" />

      {!session.user ? (
        <div className="mt-4 rounded-xl border border-line bg-panel-2 p-3 text-center">
          <p className="text-base text-muted">Guests can browse. Join as the matching member type to post or apply.</p>
          <JoinCta className="mx-auto mt-2 w-40" />
        </div>
      ) : null}
    </div>
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
      <p className="text-xs text-muted">Approve listings. Contact stays on the card. No in-app payments.</p>
      {msg ? <p className="text-[11px] text-lime-2">{msg}</p> : null}
      {rows.map((r) => (
        <div key={r.id} className="flex items-center gap-2 rounded-lg border border-line bg-panel p-2">
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">{r.title}</div>
            <div className="text-[10px] text-muted">
              {r.kind} · {r.status} · {r.submitter} · {r.city}
            </div>
          </div>
          {r.status !== "approved" ? (
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
