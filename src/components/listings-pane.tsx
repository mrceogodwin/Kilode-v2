import { useEffect, useState } from "react";
import { applyListing, listListingQueue, listListings, saveListing, setListingStatus, type Listing, type ListingKind } from "@/lib/listings-server";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { timeLabel } from "@/lib/qonvo-data";

const COPY: Record<ListingKind, { title: string; who: string; contact: string; extra: string }> = {
  job: { title: "Jobs", who: "Job Poster accounts list roles. Job Seekers / members apply. Staff approve. No in-app hiring.", contact: "Apply note / WhatsApp", extra: "Company" },
  market: { title: "Marketplace", who: "Sellers showcase products with a contact link. No checkout in Kilode.", contact: "WhatsApp / Instagram", extra: "Brand" },
  rent: { title: "Rent / space", who: "Listers show properties with contact. No payments in the app.", contact: "Agent contact", extra: "Area" },
};

export function ListingsPane({ kind }: { kind: ListingKind }) {
  const session = useCurrentUserState();
  const copy = COPY[kind];
  const [rows, setRows] = useState<Listing[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [city, setCity] = useState("");
  const [contact, setContact] = useState("");
  const [link, setLink] = useState("");
  const [company, setCompany] = useState("");
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [shown, setShown] = useState(8);

  function load() {
    void listListings({ data: { kind } })
      .then(setRows)
      .catch(() => setRows([]));
  }
  useEffect(() => {
    load();
    setShown(8);
  }, [kind]);

  return (
    <div className="mx-auto max-w-3xl space-y-3 p-4 pb-20">
      <h2 className="text-xl font-bold">{copy.title}</h2>
      <p className="text-sm text-muted">{copy.who}</p>

      <div className="raised space-y-2 rounded-xl p-3">
        <div className="text-[11px] font-medium text-muted">Post a listing (correct account type only)</div>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm" />
        <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder={copy.extra} className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm" />
        <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City / area" className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm" />
        <input value={contact} onChange={(e) => setContact(e.target.value)} placeholder={copy.contact} className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm" />
        <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://…" className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm" />
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} placeholder="Short description" className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm" />
        {err ? <p className="text-[11px] text-danger">{err}</p> : null}
        {msg ? <p className="text-[11px] text-lime-2">{msg}</p> : null}
        <button
          type="button"
          className="btn-join rounded-lg px-3 py-2 text-[12px] font-bold"
          onClick={() => {
            if (!session.user) {
              window.location.href = "/login?mode=up";
              return;
            }
            setErr("");
            setMsg("");
            void saveListing({ data: { kind, title, body, city, contact, link, company } }).then((r) => {
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
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {rows.slice(0, shown).map((r) => (
          <article key={r.id} className="raised rounded-xl p-3">
            <div className="text-[10px] uppercase tracking-wide text-lime-2">{r.city || r.kind}</div>
            <h3 className="text-sm font-semibold">{r.title}</h3>
            {r.company ? <div className="text-[11px] text-muted">{r.company}</div> : null}
            <p className="mt-1 line-clamp-3 text-[12px] text-muted">{r.body}</p>
            <div className="mt-2 text-[10px] text-muted">{r.submitter} · {timeLabel(r.ts)}</div>
            {r.link ? (
              <a href={r.link} target="_blank" rel="noreferrer" className="mt-1 inline-block text-[11px] text-lime-2">
                Open link
              </a>
            ) : null}
            {kind === "job" ? (
              <div className="mt-2 flex gap-1">
                <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Short apply note" className="min-w-0 flex-1 rounded border border-line bg-panel px-2 py-1 text-[11px]" />
                <button
                  type="button"
                  className="rounded border border-line px-2 text-[11px] font-semibold"
                  onClick={() => {
                    if (!session.user) {
                      window.location.href = "/login?mode=up";
                      return;
                    }
                    void applyListing({ data: { id: r.id, note } }).then((a) => {
                      if (!a.ok) setErr(a.reason);
                      else setMsg("Application sent. Contact is on the listing — Kilode does not hire for you.");
                    });
                  }}
                >
                  Apply
                </button>
              </div>
            ) : r.contact ? (
              <p className="mt-1 text-[11px] text-fg">Contact: {r.contact}</p>
            ) : null}
          </article>
        ))}
      </div>
      {shown < rows.length ? (
        <button type="button" className="btn-3d mx-auto block rounded-md px-4 py-1.5 text-[11px]" onClick={() => setShown((n) => n + 8)}>
          Load more
        </button>
      ) : null}
      {rows.length === 0 ? <p className="text-sm text-muted">Nothing live yet. Staff approve listings from /ops.</p> : null}
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
            <button type="button" className="text-[10px] text-lime-2" onClick={() => void setListingStatus({ data: { id: r.id, status: "approved" } }).then(() => { setMsg("Approved"); load(); })}>
              Approve
            </button>
          ) : null}
          {r.status !== "rejected" ? (
            <button type="button" className="text-[10px] text-danger" onClick={() => void setListingStatus({ data: { id: r.id, status: "rejected" } }).then(() => { setMsg("Rejected"); load(); })}>
              Reject
            </button>
          ) : null}
        </div>
      ))}
    </div>
  );
}
