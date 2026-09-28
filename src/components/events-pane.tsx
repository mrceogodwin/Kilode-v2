import { useEffect, useMemo, useState } from "react";
import { Calendar, Clapperboard, Cpu, MapPin, Music2, Palette, Pencil, Search, Trophy, Users, UtensilsCrossed } from "lucide-react";
import { listEvents, rsvpEvent, submitEvent, adminEvents, setEvent, purgeEvents, matchEventPay, type EEvent, type EventCat } from "@/lib/events-server";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { AD_COINS } from "@/lib/qonvo-data";
import { listWallets } from "@/lib/forum-server";
import { listPayMethods } from "@/lib/pay-gateways";
import { GatewayPay } from "@/components/pay-checkout";
import type { CardProvider } from "@/lib/pay-money";
import { usePublicSite } from "@/components/site-chrome";
import { AdReserve } from "@/components/ad-slot";

const CATS: Array<EventCat | "all"> = ["all", "tech", "music", "culture", "cinema", "food", "sports"];

const CAT_ICON: Record<EventCat, typeof Music2> = {
  music: Music2,
  tech: Cpu,
  culture: Palette,
  cinema: Clapperboard,
  food: UtensilsCrossed,
  sports: Trophy,
};

function whenPretty(ts: number) {
  return new Date(ts).toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function Cover({ src, cat }: { src?: string; cat: EventCat }) {
  if (src) return <img src={src} alt="" className="h-full w-full object-cover" />;
  const Icon = CAT_ICON[cat] ?? Calendar;
  return (
    <div className="grid h-full w-full place-items-center bg-panel-3 text-lime-2">
      <Icon className="size-6" />
    </div>
  );
}

export function EventsPane() {
  const session = useCurrentUserState();
  const signed = !!session.user;
  const [events, setEvents] = useState<EEvent[]>([]);
  const [cat, setCat] = useState<(typeof CATS)[number]>("all");
  const [q, setQ] = useState("");
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [form, setForm] = useState(false);
  const [title, setTitle] = useState("");
  const [blurb, setBlurb] = useState("");
  const [place, setPlace] = useState("");
  const [link, setLink] = useState("");
  const [category, setCategory] = useState<EventCat>("culture");
  const [start, setStart] = useState("");
  const [busy, setBusy] = useState(false);
  const [coin, setCoin] = useState("btc");
  const [amount, setAmount] = useState("");
  const [txHash, setTxHash] = useState("");
  const [payWith, setPayWith] = useState<"crypto" | CardProvider>("crypto");
  const [gate, setGate] = useState({ paystack: false, flutterwave: false, ngnPerUsd: 1600, eventUsd: 10 });
  const [ticket, setTicket] = useState("");
  const [cover, setCover] = useState("");
  const pay = !usePublicSite().site.payOff.split(",").includes("events");
  const [wallets, setWallets] = useState<{ coin: string; address: string }[]>([]);

  function load() {
    void listEvents()
      .then((r) => {
        setEvents(r.events);
        setErr("");
      })
      .catch(() => {
        setEvents([]);
        setErr("");
      });
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!form || wallets.length) return;
    void listWallets()
      .then((rows) => setWallets(Array.isArray(rows) ? rows : []))
      .catch(() => setWallets([]));
    void listPayMethods()
      .then((m) => setGate(m))
      .catch(() => undefined);
  }, [form, wallets.length]);

  const list = useMemo(() => {
    const query = q.trim().toLowerCase();
    return events.filter((e) => {
      if (cat !== "all" && e.category !== cat) return false;
      if (!query) return true;
      return `${e.title} ${e.place} ${e.blurb} ${e.submitter}`.toLowerCase().includes(query);
    });
  }, [events, cat, q]);
  const featured = list.slice(0, 3);
  const upcoming = list.slice(3);

  function rsvp(id: string) {
    if (!signed) {
      window.location.href = "/login?mode=up";
      return;
    }
    setErr("");
    void rsvpEvent({ data: { id } })
      .then((r) => {
        const patch = (e: EEvent) => (e.id === id ? { ...e, rsvps: r.rsvps, mine: true } : e);
        setEvents((rows) => rows.map(patch));
      })
      .catch((e) => setErr(e instanceof Error ? e.message : "Could not RSVP."));
  }

  function send() {
    const startsAt = start ? new Date(start).getTime() : 0;
    if (!title.trim() || !startsAt) {
      setErr("Title and start time are required.");
      return;
    }
    setBusy(true);
    setErr("");
    void submitEvent({
      data: { title, blurb, category, place, link, cover, ticket, startsAt, endsAt: startsAt + 3 * 3_600_000, coin, amount, txHash },
    })
      .then(() => {
        setMsg(pay ? "Sent. Staff check the hash, then approve it." : "Sent for review. Crypto is off for events.");
        setForm(false);
        setTitle("");
        setBlurb("");
        setPlace("");
        setLink("");
        setCover("");
        setTicket("");
        setAmount("");
        setTxHash("");
      })
      .catch((e) => setErr(e instanceof Error ? e.message : "Could not submit."))
      .finally(() => setBusy(false));
  }

  function openEvent(e: EEvent) {
    if (e.link) {
      window.open(e.link, "_blank", "noopener,noreferrer");
      return;
    }
    rsvp(e.id);
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 dock-pad">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-lime-2/15 text-lime-2">
            <Calendar className="size-5" />
          </span>
          <div>
            <div className="text-[10px] font-semibold tracking-[0.16em] text-lime-2 uppercase">Events</div>
            <h2 className="text-2xl font-extrabold leading-none tracking-tight">What's on</h2>
            <p className="mt-1 max-w-[16rem] text-[12px] leading-snug text-muted">Discover events, meetups, and experiences around you.</p>
          </div>
        </div>
        <button type="button" className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-line bg-panel px-2.5 py-2 text-[11px] font-bold" onClick={() => (signed ? setForm((v) => !v) : (window.location.href = "/login?mode=up"))}>
          <Pencil className="size-3.5" />
          {signed ? "Submit Event" : "Join to submit"}
        </button>
      </div>

      <label className="mb-3 flex items-center gap-2 rounded-2xl border border-line bg-panel px-3 py-2.5">
        <Search className="size-4 shrink-0 text-muted" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search events, artists, venues..." className="min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-muted" />
      </label>

      <div className="mb-4 flex gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {CATS.map((c) => (
          <button key={c} type="button" onClick={() => setCat(c)} className={`shrink-0 rounded-full px-3 py-1.5 text-[12px] font-bold capitalize ${cat === c ? "bg-[#FACC15] text-black" : "border border-line bg-panel text-fg"}`}>
            {c === "all" ? "All" : c}
          </button>
        ))}
      </div>

      {err ? <p className="mb-2 text-[11px] text-danger">{err}</p> : null}
      {msg ? <p className="mb-2 text-[11px] text-lime-2">{msg}</p> : null}

      {form ? (
        <form className="mb-4 space-y-2 rounded-xl border border-line bg-panel p-3" onSubmit={(e) => { e.preventDefault(); send(); }}>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Event title" className="min-h-11 w-full rounded-lg border border-line bg-bg px-3 text-base" />
          <div className="flex gap-2">
            <select value={category} onChange={(e) => setCategory(e.target.value as EventCat)} className="min-h-11 flex-1 rounded-lg border border-line bg-bg px-2 text-base">
              {CATS.filter((c) => c !== "all").map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} className="min-h-11 flex-1 rounded-lg border border-line bg-bg px-2 text-base" />
          </div>
          <input value={place} onChange={(e) => setPlace(e.target.value)} placeholder="Venue or city" className="min-h-11 w-full rounded-lg border border-line bg-bg px-3 text-base" />
          <input value={ticket} onChange={(e) => setTicket(e.target.value)} placeholder="Ticket price, or Free" className="min-h-11 w-full rounded-lg border border-line bg-bg px-3 text-base" />
          <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="Ticket link, https" className="min-h-11 w-full rounded-lg border border-line bg-bg px-3 text-base" />
          <input value={cover} onChange={(e) => setCover(e.target.value)} placeholder="Cover image, https" className="min-h-11 w-full rounded-lg border border-line bg-bg px-3 text-base" />
          <textarea value={blurb} onChange={(e) => setBlurb(e.target.value)} placeholder="Short note" rows={3} className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-base" />
          {pay ? (
            <>
          <p className="text-[11px] leading-snug text-muted">Pay the event fee with crypto, Paystack, or Flutterwave. Staff still approve before it is public.</p>
          <div className="flex flex-wrap gap-1">
            {(["crypto", "paystack", "flutterwave"] as const).map((id) => (
              <button key={id} type="button" onClick={() => { setPayWith(id); setTxHash(""); }} className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${payWith === id ? "btn-3d" : "border border-line text-muted"}`}>
                {id === "crypto" ? "Crypto" : id === "paystack" ? "Paystack" : "Flutterwave"}
              </button>
            ))}
          </div>
          {payWith === "crypto" ? (
            <>
          <select value={coin} onChange={(e) => setCoin(e.target.value)} className="min-h-11 w-full rounded-lg border border-line bg-bg px-2 text-base">
            {AD_COINS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
          <div className="break-all rounded-lg border border-line bg-bg px-2 py-2 text-[11px]">
            {wallets.find((w) => w.coin === coin)?.address || "No wallet saved for this coin yet."}
          </div>
          <button
            type="button"
            className="btn-3d rounded-lg px-2.5 py-1 text-[11px] font-bold"
            onClick={() => {
              const addr = wallets.find((w) => w.coin === coin)?.address;
              if (addr) void navigator.clipboard?.writeText(addr);
            }}
          >
            Copy wallet
          </button>
          <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount you sent" className="min-h-11 w-full rounded-lg border border-line bg-bg px-3 text-base" />
          <input value={txHash} onChange={(e) => setTxHash(e.target.value)} placeholder="Transaction hash" className="min-h-11 w-full rounded-lg border border-line bg-bg px-3 text-base" />
            </>
          ) : (
            <GatewayPay
              provider={payWith}
              kind="event"
              purpose="listing"
              usd={gate.eventUsd}
              rate={gate.ngnPerUsd}
              ready={payWith === "paystack" ? gate.paystack : gate.flutterwave}
              onPaid={(paid) => {
                setCoin(paid.provider);
                setAmount(String(paid.amountNgn));
                setTxHash(paid.reference);
              }}
            />
          )}
          {payWith !== "crypto" && txHash.startsWith("kld_") ? <p className="text-[12px] font-semibold text-lime-2">Paid. Submit the event.</p> : null}
            </>
          ) : <p className="text-[11px] text-lime-2">Crypto is off for events. Staff still approve before it goes live.</p>}
          <button type="submit" disabled={busy} className="btn-join w-full rounded-xl py-2.5 text-sm font-bold disabled:opacity-60">{busy ? "Sending…" : "Submit for review"}</button>
        </form>
      ) : null}

      <section className="mb-4">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-[10px] font-bold tracking-[0.16em] text-lime-2">FEATURED EVENTS</div>
        </div>
        {featured.length === 0 ? (
          <p className="rounded-2xl border border-line bg-panel px-3 py-6 text-center text-[12px] text-muted">No live events in this filter. Submit one and staff will approve it.</p>
        ) : (
          <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {featured.map((e) => (
              <article key={e.id} className="w-[78%] max-w-[240px] shrink-0 overflow-hidden rounded-2xl border border-line bg-panel">
                <div className="relative h-28">
                  <Cover src={e.cover} cat={e.category} />
                  <span className="absolute left-2 top-2 rounded-md bg-black/70 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-[#FACC15]">{e.category}</span>
                </div>
                <div className="p-2.5">
                  <h3 className="line-clamp-2 text-[13px] font-extrabold leading-tight">{e.title}</h3>
                  <p className="mt-1 flex items-center gap-1 text-[10px] text-muted"><Calendar className="size-3" /> {whenPretty(e.startsAt)}</p>
                  <p className="mt-0.5 flex items-center gap-1 truncate text-[10px] text-muted"><MapPin className="size-3 shrink-0" /> {e.place || "Venue TBA"}</p>
                  <p className="mt-0.5 flex items-center gap-1 text-[10px] text-lime-2"><Users className="size-3" /> {e.rsvps} going</p>
                  <button type="button" className="mt-2 w-full rounded-full border border-[#FACC15]/70 py-1.5 text-[11px] font-bold text-[#FACC15]" onClick={() => openEvent(e)}>
                    {e.link ? "Get Tickets" : e.mine ? "You're in" : "RSVP"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="mb-4">
        <div className="mb-2 text-[10px] font-bold tracking-[0.16em] text-lime-2">EVENT CATEGORIES</div>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {CATS.filter((c): c is EventCat => c !== "all").map((c) => {
            const Icon = CAT_ICON[c];
            return (
              <button key={c} type="button" onClick={() => setCat(c)} className={`rounded-2xl border px-2 py-3 text-center ${cat === c ? "border-[#FACC15] bg-[#FACC15]/10" : "border-line bg-panel"}`}>
                <Icon className="mx-auto size-5 text-lime-2" />
                <div className="mt-1 text-[11px] font-bold capitalize">{c}</div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="mb-4">
        <div className="mb-2 text-[10px] font-bold tracking-[0.16em] text-lime-2">UPCOMING EVENTS</div>
        <div className="space-y-2">
          {upcoming.length === 0 ? (
            <p className="text-[12px] text-muted">{featured.length ? "Featured is the full list right now." : "Nothing upcoming."}</p>
          ) : upcoming.map((e) => (
            <button key={`up-${e.id}`} type="button" onClick={() => openEvent(e)} className="flex w-full items-center gap-2 rounded-2xl border border-line bg-panel p-2 text-left">
              <span className="size-14 shrink-0 overflow-hidden rounded-xl">
                <Cover src={e.cover} cat={e.category} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-bold">{e.title}</span>
                <span className="mt-0.5 flex items-center gap-1 text-[10px] text-muted"><Calendar className="size-3" /> {whenPretty(e.startsAt)}</span>
                <span className="flex items-center gap-1 truncate text-[10px] text-muted"><MapPin className="size-3 shrink-0" /> {e.place || "Venue TBA"}</span>
              </span>
              <span className="shrink-0 rounded-full border border-lime-2/40 px-2 py-1 text-[10px] font-bold text-lime-2">{e.ticket || (e.mine ? "In" : "RSVP")}</span>
            </button>
          ))}
        </div>
      </section>

      <AdReserve id="list_events_mid" className="mb-2" />
    </div>
  );
}

export function EventsAdminPanel() {
  const [rows, setRows] = useState<EEvent[]>([]);
  const [stats, setStats] = useState({ pending: 0, live: 0, rsvps: 0 });
  const [msg, setMsg] = useState("");

  function load() {
    void adminEvents()
      .then((r) => {
        setRows(r.events);
        setStats({ pending: r.pending, live: r.live, rsvps: r.rsvps });
      })
      .catch((e) => setMsg(e instanceof Error ? e.message : "Events admin failed"));
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <section className="rounded-2xl border border-line bg-panel p-3">
      <div className="mb-2 flex items-center gap-2">
        <Calendar className="size-4 text-lime-2" />
        <h3 className="text-sm font-extrabold">Events</h3>
      </div>
      <p className="mb-2 text-[11px] text-muted">{stats.live} live · {stats.pending} waiting · {stats.rsvps} RSVPs</p>
      <button
        type="button"
        className="btn-3d mb-2 rounded-lg px-2.5 py-1 text-[11px] font-bold"
        onClick={() => {
          void purgeEvents()
            .then((r) => setMsg(`Archived ${r.archived}`))
            .catch((e) => setMsg(e instanceof Error ? e.message : "Purge failed"))
            .finally(load);
        }}
      >
        Archive past events
      </button>
      {msg ? <p className="mb-2 text-[11px] text-lime-2">{msg}</p> : null}
      <div className="space-y-2">
        {rows.length === 0 ? <p className="text-[11px] text-muted">No events yet.</p> : null}
        {rows.map((e) => (
          <div key={e.id} className="rounded-lg border border-line p-2">
            <div className="text-[12px] font-bold">{e.title}</div>
            <p className="text-[10px] text-muted">{e.status}{e.flagship ? " · spotlight" : ""} · {e.category} · {e.rsvps} RSVPs · {e.submitter}</p>
            {e.txHash ? <p className="mt-0.5 break-all text-[10px] text-muted">{e.coin} {e.amount} · {e.txHash}</p> : null}
            {e.matchNote ? <p className="text-[10px] text-lime-2">{e.matchNote}</p> : null}
            <div className="mt-1 flex flex-wrap gap-2">
              {e.txHash ? (
                <button type="button" className="text-[10px] font-semibold" onClick={() => void matchEventPay({ data: { id: e.id } }).then((r) => setMsg(r.reason)).then(load).catch((err) => setMsg(err instanceof Error ? err.message : "Match failed"))}>Check hash</button>
              ) : null}
              {e.status !== "approved" ? (
                <button type="button" className="text-[10px] font-bold text-lime-2" onClick={() => void setEvent({ data: { id: e.id, status: "approved" } }).then(load)}>Approve</button>
              ) : null}
              {e.status !== "rejected" ? (
                <button type="button" className="text-[10px] text-danger" onClick={() => void setEvent({ data: { id: e.id, status: "rejected" } }).then(load)}>Reject</button>
              ) : null}
              <button type="button" className="text-[10px] font-semibold" onClick={() => void setEvent({ data: { id: e.id, flagship: !e.flagship } }).then(load)}>
                {e.flagship ? "Unpin" : "Spotlight"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
