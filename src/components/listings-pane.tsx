import { useEffect, useMemo, useState } from "react";
import { Briefcase, Building2, ChevronLeft, MapPin, Search, Store } from "lucide-react";
import {
  applyListing,
  listListings,
  listMyApps,
  seeListing,
  type Listing,
  type ListingKind,
  type MyApp,
} from "@/lib/listings-server";
import { CompanyMark } from "@/components/company-mark";
import { JoinCta } from "@/components/get-app";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

const TITLES: Record<ListingKind, string> = {
  job: "Jobs",
  market: "Marketplace",
  rent: "Rent / space",
};

function readMeta(raw?: string) {
  try {
    return JSON.parse(raw || "{}") as {
      jobType?: string;
      category?: string;
      salary?: string;
      experience?: string;
      deadline?: string;
      price?: string;
      condition?: string;
    };
  } catch {
    return {};
  }
}

export function ListingsPane({ kind }: { kind: ListingKind }) {
  const session = useCurrentUserState();
  const signedIn = Boolean(session.user);
  const [rows, setRows] = useState<Listing[]>([]);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<Listing | null>(null);
  const [applying, setApplying] = useState(false);
  const [note, setNote] = useState("");
  const [phone, setPhone] = useState("");
  const [cv, setCv] = useState("");
  const [skills, setSkills] = useState("");
  const [legal, setLegal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<"roles" | "apps">("roles");
  const [myApps, setMyApps] = useState<MyApp[]>([]);

  function load() {
    void listListings({ data: { kind } })
      .then((live) => setRows(Array.isArray(live) ? live : []))
      .catch((e) => setErr(e instanceof Error ? e.message : "Could not load"));
  }

  function loadApps() {
    if (!signedIn) return;
    void listMyApps()
      .then((a) => setMyApps(Array.isArray(a) ? a : []))
      .catch(() => setMyApps([]));
  }

  useEffect(() => {
    load();
    setOpen(null);
    setApplying(false);
    setErr("");
    setMsg("");
  }, [kind]);

  useEffect(() => {
    if (signedIn && kind === "job") loadApps();
  }, [signedIn, kind]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((r) =>
      `${r.title} ${r.company} ${r.city} ${r.body}`.toLowerCase().includes(needle),
    );
  }, [rows, q]);

  function openRole(r: Listing) {
    setOpen(r);
    setApplying(false);
    setErr("");
    setMsg("");
    void seeListing({ data: { id: r.id } }).catch(() => undefined);
  }

  async function submitApply() {
    if (!open) return;
    if (!signedIn) {
      window.location.href = "/login?mode=up";
      return;
    }
    if (!legal) {
      setErr("Tick the notice before you apply.");
      return;
    }
    setBusy(true);
    setErr("");
    setMsg("");
    try {
      const res = await applyListing({
        data: { id: open.id, note, phone, cv, skills },
      });
      if (!res.ok) {
        setErr("reason" in res ? res.reason : "Could not apply.");
      } else {
        setMsg("Application sent. The employer can see your note.");
        setApplying(false);
        setNote("");
        loadApps();
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not apply.");
    } finally {
      setBusy(false);
    }
  }

  const alreadyApplied = open
    ? myApps.some((a) => a.listingId === open.id)
    : false;

  /* ——— Role detail + apply ——— */
  if (open && kind === "job") {
    const meta = readMeta(open.meta);
    return (
      <div className="mx-auto max-w-3xl px-3 pb-24 pt-2">
        <button
          type="button"
          onClick={() => {
            setOpen(null);
            setApplying(false);
            setErr("");
            setMsg("");
          }}
          className="mb-3 inline-flex items-center gap-1 text-[13px] font-semibold text-[#1877F2]"
        >
          <ChevronLeft size={16} /> All roles
        </button>

        <div className="rounded-2xl border border-[#E7ECF2] bg-white p-4">
          <div className="flex gap-3">
            <CompanyMark name={open.company || open.title} size={44} />
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#1877F2]">
                {open.company || "Company"}
              </div>
              <h2 className="text-[18px] font-extrabold leading-tight text-[#172033]">{open.title}</h2>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] text-[#64748B]">
                <span className="inline-flex items-center gap-0.5">
                  <MapPin size={12} /> {open.city || "Nigeria"}
                </span>
                {meta.jobType ? <span>· {meta.jobType}</span> : null}
                {meta.salary ? <span>· {meta.salary}</span> : null}
                {meta.experience ? <span>· {meta.experience}</span> : null}
              </div>
            </div>
          </div>

          {open.body ? (
            <p className="mt-4 whitespace-pre-wrap text-[14px] leading-relaxed text-[#334155]">{open.body}</p>
          ) : (
            <p className="mt-4 text-[13px] text-[#94A3B8]">No full description yet.</p>
          )}

          <div className="mt-3 text-[11px] text-[#94A3B8]">
            Posted by @{open.submitter || "—"} · {open.views || 0} views
          </div>

          {alreadyApplied ? (
            <p className="mt-4 rounded-xl bg-[#EFF6FF] px-3 py-2.5 text-[13px] font-semibold text-[#1877F2]">
              You already applied. Check “My apps” for your note.
            </p>
          ) : applying ? (
            <div className="mt-4 space-y-2.5 rounded-2xl border border-[#E7ECF2] bg-[#F7F9FC] p-3">
              <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#1877F2]">Apply as yourself</div>
              <label className="flex items-start gap-2 text-[12px] leading-snug text-[#64748B]">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={legal}
                  onChange={(e) => setLegal(e.target.checked)}
                />
                <span>
                  Kilode only introduces you. It does not hire or pay. Verify the employer before you share a CV or private details.
                </span>
              </label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Phone (WhatsApp ok)"
                inputMode="tel"
                className="w-full rounded-xl border border-[#E7ECF2] bg-white px-3 py-2.5 text-[14px] outline-none focus:border-[#1877F2]"
              />
              <input
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                placeholder="Skills · e.g. React, sales, design"
                maxLength={160}
                className="w-full rounded-xl border border-[#E7ECF2] bg-white px-3 py-2.5 text-[14px] outline-none focus:border-[#1877F2]"
              />
              <input
                value={cv}
                onChange={(e) => setCv(e.target.value)}
                placeholder="CV link · https://… (optional)"
                className="w-full rounded-xl border border-[#E7ECF2] bg-white px-3 py-2.5 text-[14px] outline-none focus:border-[#1877F2]"
              />
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder="Short apply note — why you fit"
                className="w-full rounded-xl border border-[#E7ECF2] bg-white px-3 py-2.5 text-[14px] outline-none focus:border-[#1877F2]"
              />
              <div className="text-[11px] text-[#94A3B8]">{note.length}/500</div>
              {err ? <p className="text-[12px] text-red-600">{err}</p> : null}
              {msg ? <p className="text-[12px] font-semibold text-[#1877F2]">{msg}</p> : null}
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void submitApply()}
                  className="flex-1 rounded-full bg-[#1877F2] py-2.5 text-[14px] font-bold text-white disabled:opacity-60"
                >
                  {busy ? "Sending…" : "Send application"}
                </button>
                <button
                  type="button"
                  onClick={() => setApplying(false)}
                  className="rounded-full border border-[#E7ECF2] px-4 py-2.5 text-[13px] font-semibold text-[#64748B]"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (!signedIn) {
                  window.location.href = "/login?mode=up";
                  return;
                }
                setApplying(true);
              }}
              className="mt-4 w-full rounded-full bg-[#1877F2] py-3 text-[15px] font-bold text-white"
            >
              {signedIn ? "Apply for this role" : "Join to apply"}
            </button>
          )}

          {msg && !applying ? <p className="mt-2 text-[13px] font-semibold text-[#1877F2]">{msg}</p> : null}
          {open.contact ? (
            <p className="mt-3 text-[12px] text-[#64748B]">Employer contact (after you apply they also see your note): {open.contact}</p>
          ) : null}
        </div>
      </div>
    );
  }

  /* ——— List board ——— */
  return (
    <div className="mx-auto max-w-3xl space-y-3 px-3 pb-24 pt-2">
      <div className="flex items-center gap-2">
        <span className="grid size-9 place-items-center rounded-xl bg-[#1877F2]/10 text-[#1877F2]">
          {kind === "job" ? <Briefcase className="size-4" /> : kind === "market" ? <Store className="size-4" /> : <Building2 className="size-4" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-bold tracking-[0.14em] text-[#1877F2]">{kind.toUpperCase()}</div>
          <h2 className="text-xl font-extrabold text-[#172033]">{TITLES[kind]}</h2>
        </div>
      </div>

      {kind === "job" ? (
        <p className="text-[13px] leading-snug text-[#64748B]">
          Real roles. Staff approve listings. You apply with a note — Kilode introduces, it does not hire.
        </p>
      ) : (
        <p className="text-[13px] text-[#64748B]">Showcase only. Contact the seller outside Kilode.</p>
      )}

      {kind === "job" && signedIn ? (
        <div className="flex gap-1 rounded-full border border-[#E7ECF2] bg-[#F7F9FC] p-1">
          <button
            type="button"
            onClick={() => setTab("roles")}
            className={`flex-1 rounded-full py-1.5 text-[12px] font-bold ${tab === "roles" ? "bg-white text-[#172033] shadow-sm" : "text-[#64748B]"}`}
          >
            Open roles
          </button>
          <button
            type="button"
            onClick={() => {
              setTab("apps");
              loadApps();
            }}
            className={`flex-1 rounded-full py-1.5 text-[12px] font-bold ${tab === "apps" ? "bg-white text-[#172033] shadow-sm" : "text-[#64748B]"}`}
          >
            My apps{myApps.length ? ` · ${myApps.length}` : ""}
          </button>
        </div>
      ) : null}

      {tab === "apps" && kind === "job" ? (
        <div className="space-y-2">
          {myApps.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-[#E7ECF2] bg-[#F7F9FC] px-4 py-8 text-center text-[13px] text-[#64748B]">
              No applications yet. Open a role and send a note.
            </p>
          ) : (
            myApps.map((a) => (
              <article key={a.id} className="rounded-2xl border border-[#E7ECF2] bg-white p-3">
                <div className="flex gap-3">
                  <CompanyMark name={a.company || a.title} />
                  <div className="min-w-0 flex-1">
                    <div className="text-[14px] font-bold text-[#172033]">{a.title}</div>
                    <div className="text-[12px] text-[#64748B]">
                      {a.company || "Company"} · {a.city || "Nigeria"}
                    </div>
                    {a.note ? <p className="mt-1 text-[12px] text-[#334155]">“{a.note}”</p> : null}
                    <div className="mt-1 text-[11px] text-[#94A3B8]">{a.status}</div>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      ) : (
        <>
          <label className="flex items-center gap-2 rounded-2xl border border-[#E7ECF2] bg-white px-3 py-2.5">
            <Search className="size-4 shrink-0 text-[#94A3B8]" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={kind === "job" ? "Search roles, companies, cities…" : "Search…"}
              className="min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-[#94A3B8]"
            />
          </label>

          {err ? <p className="text-[12px] text-red-600">{err}</p> : null}

          {filtered.length === 0 && !err ? (
            <p className="rounded-2xl border border-dashed border-[#E7ECF2] bg-[#F7F9FC] px-4 py-8 text-center text-[13px] text-[#64748B]">
              No approved {kind === "job" ? "roles" : "listings"} yet. Staff approve before they go public.
            </p>
          ) : null}

          <div className="space-y-2">
            {filtered.map((r) => {
              const meta = readMeta(r.meta);
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => (kind === "job" ? openRole(r) : undefined)}
                  className="flex w-full gap-3 rounded-2xl border border-[#E7ECF2] bg-white p-3 text-left transition active:scale-[0.99]"
                >
                  <CompanyMark name={r.company || r.title} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14px] font-bold text-[#172033]">{r.title}</div>
                    <div className="truncate text-[12px] text-[#64748B]">
                      {r.company || "Company"} · {r.city || "Nigeria"}
                      {meta.jobType ? ` · ${meta.jobType}` : ""}
                    </div>
                    {meta.salary ? (
                      <div className="mt-0.5 text-[12px] font-semibold text-[#1877F2]">{meta.salary}</div>
                    ) : null}
                    {r.body ? (
                      <p className="mt-1 line-clamp-2 text-[12px] leading-snug text-[#64748B]">{r.body}</p>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}

      {!signedIn ? (
        <div className="rounded-xl border border-[#E7ECF2] bg-[#F7F9FC] p-3 text-center">
          <p className="text-[12px] text-[#64748B]">Guests can browse. Join to apply or post.</p>
          <JoinCta className="mx-auto mt-2 w-40" />
        </div>
      ) : null}
    </div>
  );
}

export function ListingsAdminPanel() {
  return (
    <div className="raised rounded-xl p-3 text-[13px] text-muted">
      Listings queue lives in /ops. Staff approve jobs before they are public.
    </div>
  );
}
