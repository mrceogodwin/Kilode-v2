import { useEffect, useMemo, useState } from "react";
import { listEvents, rsvpEvent, submitEvent, adminEvents, setEvent, purgeEvents, matchEventPay, type EEvent, type EventCat } from "@/lib/events-server";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { AD_COINS } from "@/lib/qonvo-data";
import { listWallets } from "@/lib/forum-server";
import { usePublicSite } from "@/components/site-chrome";

const CATS: Array<EventCat | "all"> = ["all", "tech", "music", "culture", "cinema"];

function whenLabel(ts: number) {
  return new Date(ts).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function leftLabel(ts: number, now: number) {
  const s = Math.max(0, Math.floor((ts - now) / 1000));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (ts <= now) return "Live now";
  if (d > 0) return `${d}d ${h}h`;
  return `${h}h ${m}m`;
}

function Mark() {
  return <span className="e-mark" aria-hidden>e</span>;
}

export function EventsPane() {
  const session = useCurrentUserState();
  const signed = !!session.user;
  const [events, setEvents] = useState<EEvent[]>([]);
  const [hero, setHero] = useState<EEvent | null>(null);
  const [cat, setCat] = useState<(typeof CATS)[number]>("all");
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [now, setNow] = useState(() => Date.now());
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
  const pay = !usePublicSite().site.payOff.split(",").includes("events");
  const [wallets, setWallets] = useState<{ coin: string; address: string }[]>([]);

  function load() {
    void listEvents()
      .then((r) => {
        setEvents(r.events);
        setHero(r.hero);
        setErr("");
      })
      .catch(() => {
        setEvents([]);
        setHero(null);
        setErr("");
      });
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    if (!form || wallets.length) return;
    void listWallets()
      .then((rows) => setWallets(Array.isArray(rows) ? rows : []))
      .catch(() => setWallets([]));
  }, [form, wallets.length]);

  const list = useMemo(
    () => events.filter((e) => e.id !== hero?.id && (cat === "all" || e.category === cat)),
    [events, hero, cat],
  );

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
        setHero((h) => (h ? patch(h) : h));
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
      data: { title, blurb, category, place, link, startsAt, endsAt: startsAt + 3 * 3_600_000, coin, amount, txHash },
    })
      .then(() => {
        setMsg(pay ? "Sent. Staff check the hash, then approve it." : "Sent for review. Crypto is off for events.");
        setForm(false);
        setTitle("");
        setBlurb("");
        setPlace("");
        setLink("");
        setAmount("");
        setTxHash("");
      })
      .catch((e) => setErr(e instanceof Error ? e.message : "Could not submit."))
      .finally(() => setBusy(false));
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 dock-pad">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Mark />
          <div>
            <div className="text-[10px] font-semibold tracking-[0.16em] text-lime-2 uppercase">Events</div>
            <h2 className="text-sm font-extrabold leading-none">What is on</h2>
          </div>
        </div>
        <button type="button" className="btn-3d rounded-lg px-2.5 py-1 text-[11px] font-bold" onClick={() => (signed ? setForm((v) => !v) : (window.location.href = "/login?mode=up"))}>
          {signed ? "Submit" : "Join to submit"}
        </button>
      </div>

      {hero ? (
        <article className="e-hero mb-3 overflow-hidden rounded-2xl border border-line p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="rounded-full bg-lime-2/15 px-2 py-0.5 text-[10px] font-bold text-lime-2">
              {hero.startsAt <= now ? "Live" : leftLabel(hero.startsAt, now)}
            </span>
            <span className="text-[10px] capitalize text-muted">{hero.category}</span>
          </div>
          <h3 className="mt-2 text-lg font-extrabold leading-tight">{hero.title}</h3>
          {hero.blurb ? <p className="mt-1 text-[12px] leading-snug text-muted">{hero.blurb}</p> : null}
          <p className="mt-1 text-[11px] text-fg/80">{whenLabel(hero.startsAt)}{hero.place ? ` · ${hero.place}` : ""}</p>
          <div className="mt-3 flex items-center gap-2">
            <button type="button" className="btn-join rounded-full px-3 py-1.5 text-[12px] font-bold" disabled={hero.mine} onClick={() => rsvp(hero.id)}>
              {hero.mine ? "You're in" : "RSVP"}
            </button>
            <span className="text-[11px] text-muted">{hero.rsvps} going</span>
            {hero.link ? (
              <a href={hero.link} target="_blank" rel="noopener noreferrer" className="ml-auto text-[11px] font-semibold text-lime-2">
                Link
              </a>
            ) : null}
          </div>
        </article>
      ) : (
        <p className="mb-3 rounded-xl border border-line bg-panel px-3 py-4 text-[12px] text-muted">
          No event yet. Pay the Kilode wallet, paste the hash, and staff approve it. RSVP stays free. A hash can be used once.
        </p>
      )}

      <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {CATS.map((c) => (
          <button key={c} type="button" onClick={() => setCat(c)} className={`shrink-0 snap-start rounded-full px-3 py-1.5 text-[11px] font-bold capitalize ${cat === c ? "btn-3d text-lime-2" : "border border-line bg-panel text-muted"}`}>
            {c === "all" ? "All" : c}
          </button>
        ))}
      </div>

      {err ? <p className="mb-2 text-[11px] text-danger">{err}</p> : null}
      {msg ? <p className="mb-2 text-[11px] text-lime-2">{msg}</p> : null}

      {form ? (
        <form className="mb-3 space-y-2 rounded-xl border border-line bg-panel p-3" onSubmit={(e) => { e.preventDefault(); send(); }}>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Event title" className="min-h-11 w-full rounded-lg border border-line bg-bg px-3 text-base" />
          <div className="flex gap-2">
            <select value={category} onChange={(e) => setCategory(e.target.value as EventCat)} className="min-h-11 flex-1 rounded-lg border border-line bg-bg px-2 text-base">
              {CATS.filter((c) => c !== "all").map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} className="min-h-11 flex-1 rounded-lg border border-line bg-bg px-2 text-base" />
          </div>
          <input value={place} onChange={(e) => setPlace(e.target.value)} placeholder="City or Online" className="min-h-11 w-full rounded-lg border border-line bg-bg px-3 text-base" />
          <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https link, optional" className="min-h-11 w-full rounded-lg border border-line bg-bg px-3 text-base" />
          <textarea value={blurb} onChange={(e) => setBlurb(e.target.value)} placeholder="Short note" rows={3} className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-base" />
          {pay ? (
            <>
          <p className="text-[11px] leading-snug text-muted">Copy the wallet, pay, then paste the hash. Kilode never DMs a wallet. One hash works once.</p>
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
          ) : <p className="text-[11px] text-lime-2">Crypto is off for events. Staff still approve before it goes live.</p>}
          <button type="submit" disabled={busy} className="btn-join w-full rounded-xl py-2.5 text-sm font-bold disabled:opacity-60">{busy ? "Sending…" : "Submit for review"}</button>
        </form>
      ) : null}

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {list.map((e) => (
          <article key={e.id} className="rounded-xl border border-line bg-panel p-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="rounded-full border border-line px-2 py-0.5 text-[10px] font-semibold">{whenLabel(e.startsAt)}</span>
              <span className="text-[10px] capitalize text-muted">{e.category}</span>
            </div>
            <h3 className="mt-1.5 text-[13px] font-bold leading-tight">{e.title}</h3>
            <p className="mt-0.5 truncate text-[11px] text-muted">{e.place || "Kilode"} · {e.rsvps} going</p>
            <button type="button" className="btn-3d mt-2 rounded-lg px-2.5 py-1 text-[11px] font-bold" disabled={e.mine} onClick={() => rsvp(e.id)}>
              {e.mine ? "You're in" : "RSVP"}
            </button>
          </article>
        ))}
      </div>
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
        <Mark />
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
