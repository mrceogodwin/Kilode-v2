import { useEffect, useMemo, useState } from "react";
import { Briefcase, Building2, ChevronLeft, MapPin, Plus, Search, Store } from "lucide-react";
import {
  applyListing,
  listListings,
  listMyApps,
  saveListing,
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

const DEMO_JOBS: Listing[] = [
  {
    id: "demo-job-1",
    kind: "job",
    title: "Frontend Engineer (React)",
    body: "Build product UI for a Lagos fintech. Remote-friendly, TypeScript preferred.\n\n• 2+ years React\n• Comfortable with mobile-first design\n• Weekly standups on Slack",
    city: "Lagos · Remote",
    contact: "",
    link: "",
    company: "PayStack Labs",
    status: "approved",
    submitter: "demo",
    ts: Date.now() - 86400000,
    views: 128,
    days: 30,
    meta: JSON.stringify({ jobType: "Full-time", salary: "₦800k–1.2m", experience: "2+ yrs" }),
  },
  {
    id: "demo-job-2",
    kind: "job",
    title: "Sales Associate — Retail",
    body: "In-store sales at a Lekki lifestyle brand. Weekend shifts available. Walk-in friendly after you apply here.",
    city: "Lekki, Lagos",
    contact: "",
    link: "",
    company: "Street & Co",
    status: "approved",
    submitter: "demo",
    ts: Date.now() - 172800000,
    views: 64,
    days: 14,
    meta: JSON.stringify({ jobType: "Part-time", salary: "₦80k–120k", experience: "Entry" }),
  },
  {
    id: "demo-job-3",
    kind: "job",
    title: "Content Writer (Naija culture)",
    body: "Weekly culture pieces for a digital magazine. Pitch 2 sample links in your note.",
    city: "Remote NG",
    contact: "",
    link: "",
    company: "Kilode Desk",
    status: "approved",
    submitter: "demo",
    ts: Date.now() - 259200000,
    views: 210,
    days: 30,
    meta: JSON.stringify({ jobType: "Contract", salary: "Per piece", experience: "Portfolio" }),
  },
];

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
  const [filter, setFilter] = useState<"all" | "remote" | "lagos">("all");
  const [open, setOpen] = useState<Listing | null>(null);
  const [applying, setApplying] = useState(false);
  const [note, setNote] = useState("");
  const [phone, setPhone] = useState("");
  const [cv, setCv] = useState("");
  const [skills, setSkills] = useState("");
  const [legal, setLegal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<"roles" | "apps" | "post">("roles");
  const [myApps, setMyApps] = useState<MyApp[]>([]);
  const [postTitle, setPostTitle] = useState("");
  const [postBody, setPostBody] = useState("");
  const [postCity, setPostCity] = useState("");
  const [postCompany, setPostCompany] = useState("");
  const [postContact, setPostContact] = useState("");
  const [postSalary, setPostSalary] = useState("");
  const [postType, setPostType] = useState("Full-time");
  const [postBusy, setPostBusy] = useState(false);
  const [payHint, setPayHint] = useState("");

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
    setTab("roles");
  }, [kind]);

  useEffect(() => {
    if (signedIn && kind === "job") loadApps();
  }, [signedIn, kind]);

  const source = rows.length > 0 ? rows : kind === "job" ? DEMO_JOBS : rows;

  const filtered = useMemo(() => {
    let list = source;
    if (filter === "remote") list = list.filter((r) => /remote/i.test(`${r.city} ${r.title} ${r.body}`));
    if (filter === "lagos") list = list.filter((r) => /lagos|lekki|ikeja|vi\b|island/i.test(`${r.city} ${r.title}`));
    const needle = q.trim().toLowerCase();
    if (!needle) return list;
    return list.filter((r) => `${r.title} ${r.company} ${r.city} ${r.body}`.toLowerCase().includes(needle));
  }, [source, q, filter]);

  function openRole(r: Listing) {
    setOpen(r);
    setApplying(false);
    setErr("");
    setMsg("");
    if (!r.id.startsWith("demo-")) void seeListing({ data: { id: r.id } }).catch(() => undefined);
  }

  async function submitApply() {
    if (!open) return;
    if (open.id.startsWith("demo-")) {
      setMsg("This is a sample role. Real jobs go live after staff approve a paid post.");
      return;
    }
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
      const res = await applyListing({ data: { id: open.id, note, phone, cv, skills } });
      if (!res.ok) {
        setErr("reason" in res ? res.reason : "Could not apply.");
      } else {
        setMsg("Application sent. Employer gets an in-app note" + (open.contact?.includes("@") ? " and email if listed." : "."));
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

  async function submitPost() {
    if (!signedIn) {
      window.location.href = "/login?mode=up";
      return;
    }
    if (postTitle.trim().length < 3) {
      setErr("Add a clear job title.");
      return;
    }
    setPostBusy(true);
    setErr("");
    setPayHint("");
    try {
      const res = await saveListing({
        data: {
          kind: "job",
          title: postTitle.trim(),
          body: postBody.trim(),
          city: postCity.trim(),
          company: postCompany.trim(),
          contact: postContact.trim(),
          jobType: postType,
          salary: postSalary.trim(),
          days: 30,
        },
      });
      if (!res.ok) {
        setErr("reason" in res ? String((res as any).reason) : "Could not post.");
      } else {
        if ((res as any).needsPay) {
          setPayHint(
            `Posted — limited until payment. Fee about $${(res as any).priceUsd || "—"}. Pay from My Space → Listings desk or Super admin rates.`,
          );
        } else {
          setMsg("Job submitted for staff review. It goes public when approved.");
        }
        setPostTitle("");
        setPostBody("");
        setPostCity("");
        setPostCompany("");
        setPostContact("");
        setPostSalary("");
        load();
        setTab("roles");
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not post.");
    } finally {
      setPostBusy(false);
    }
  }

  const alreadyApplied = open ? myApps.some((a) => a.listingId === open.id) : false;
  const isDemoBoard = rows.length === 0 && kind === "job";

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
          {open.id.startsWith("demo-") ? (
            <div className="mb-3 rounded-xl bg-[#FFFBEB] px-3 py-2 text-[12px] font-semibold text-[#B45309]">
              Sample role — apply is demo-only until real jobs are approved.
            </div>
          ) : null}
          <div className="flex gap-3">
            <CompanyMark name={open.company || open.title} size={44} />
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#1877F2]">{open.company || "Company"}</div>
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
                <input type="checkbox" className="mt-0.5" checked={legal} onChange={(e) => setLegal(e.target.checked)} />
                <span>Kilode only introduces you. It does not hire or pay. Verify the employer before you share a CV.</span>
              </label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone (WhatsApp ok)" inputMode="tel" className="w-full rounded-xl border border-[#E7ECF2] bg-white px-3 py-2.5 text-[14px] outline-none focus:border-[#1877F2]" />
              <input value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="Skills · e.g. React, sales, design" maxLength={160} className="w-full rounded-xl border border-[#E7ECF2] bg-white px-3 py-2.5 text-[14px] outline-none focus:border-[#1877F2]" />
              <input value={cv} onChange={(e) => setCv(e.target.value)} placeholder="CV link · https://… (optional)" className="w-full rounded-xl border border-[#E7ECF2] bg-white px-3 py-2.5 text-[14px] outline-none focus:border-[#1877F2]" />
              <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={500} placeholder="Short apply note — why you fit" className="w-full rounded-xl border border-[#E7ECF2] bg-white px-3 py-2.5 text-[14px] outline-none focus:border-[#1877F2]" />
              <div className="text-[11px] text-[#94A3B8]">{note.length}/500</div>
              {err ? <p className="text-[12px] text-red-600">{err}</p> : null}
              {msg ? <p className="text-[12px] font-semibold text-[#1877F2]">{msg}</p> : null}
              <div className="flex gap-2">
                <button type="button" disabled={busy} onClick={() => void submitApply()} className="flex-1 rounded-full bg-[#1877F2] py-2.5 text-[14px] font-bold text-white disabled:opacity-60">
                  {busy ? "Sending…" : "Send application"}
                </button>
                <button type="button" onClick={() => setApplying(false)} className="rounded-full border border-[#E7ECF2] px-4 py-2.5 text-[13px] font-semibold text-[#64748B]">
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
        </div>
      </div>
    );
  }

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
        {kind === "job" && signedIn ? (
          <button type="button" onClick={() => setTab("post")} className="inline-flex items-center gap-1 rounded-full bg-[#1877F2] px-3 py-2 text-[12px] font-bold text-white">
            <Plus size={14} /> Post
          </button>
        ) : null}
      </div>

      {kind === "job" ? (
        <p className="text-[13px] leading-snug text-[#64748B]">
          Real roles. Staff approve listings. You apply with a note — Kilode introduces, it does not hire.
          {isDemoBoard ? " Showing sample roles until the first live job is approved." : ""}
        </p>
      ) : (
        <p className="text-[13px] text-[#64748B]">Showcase only. Contact the seller outside Kilode.</p>
      )}

      {kind === "job" && signedIn ? (
        <div className="flex gap-1 rounded-full border border-[#E7ECF2] bg-[#F7F9FC] p-1">
          {(["roles", "apps", "post"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setTab(t);
                if (t === "apps") loadApps();
              }}
              className={`flex-1 rounded-full py-1.5 text-[12px] font-bold ${tab === t ? "bg-white text-[#172033] shadow-sm" : "text-[#64748B]"}`}
            >
              {t === "roles" ? "Open roles" : t === "apps" ? `My apps${myApps.length ? ` · ${myApps.length}` : ""}` : "Post job"}
            </button>
          ))}
        </div>
      ) : null}

      {payHint ? <p className="rounded-xl bg-[#FFFBEB] px-3 py-2 text-[12px] font-semibold text-[#B45309]">{payHint}</p> : null}
      {msg ? <p className="text-[13px] font-semibold text-[#1877F2]">{msg}</p> : null}
      {err ? <p className="text-[12px] text-red-600">{err}</p> : null}

      {tab === "post" && kind === "job" ? (
        <div className="space-y-2.5 rounded-2xl border border-[#E7ECF2] bg-white p-4">
          <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#1877F2]">Post a role</div>
          <p className="text-[12px] text-[#64748B]">You can post now. If pay-to-post is on in Super admin, the role stays limited until payment, then staff approve.</p>
          <input value={postTitle} onChange={(e) => setPostTitle(e.target.value)} placeholder="Job title *" className="w-full rounded-xl border border-[#E7ECF2] px-3 py-2.5 text-[14px] outline-none focus:border-[#1877F2]" />
          <input value={postCompany} onChange={(e) => setPostCompany(e.target.value)} placeholder="Company" className="w-full rounded-xl border border-[#E7ECF2] px-3 py-2.5 text-[14px] outline-none focus:border-[#1877F2]" />
          <input value={postCity} onChange={(e) => setPostCity(e.target.value)} placeholder="City · e.g. Lagos · Remote" className="w-full rounded-xl border border-[#E7ECF2] px-3 py-2.5 text-[14px] outline-none focus:border-[#1877F2]" />
          <div className="flex gap-2">
            <select value={postType} onChange={(e) => setPostType(e.target.value)} className="flex-1 rounded-xl border border-[#E7ECF2] bg-white px-3 py-2.5 text-[14px]">
              <option>Full-time</option>
              <option>Part-time</option>
              <option>Contract</option>
              <option>Internship</option>
            </select>
            <input value={postSalary} onChange={(e) => setPostSalary(e.target.value)} placeholder="Salary band" className="flex-1 rounded-xl border border-[#E7ECF2] px-3 py-2.5 text-[14px] outline-none focus:border-[#1877F2]" />
          </div>
          <input value={postContact} onChange={(e) => setPostContact(e.target.value)} placeholder="Contact email (gets apply alerts)" className="w-full rounded-xl border border-[#E7ECF2] px-3 py-2.5 text-[14px] outline-none focus:border-[#1877F2]" />
          <textarea value={postBody} onChange={(e) => setPostBody(e.target.value)} rows={5} maxLength={2000} placeholder="Role description, requirements…" className="w-full rounded-xl border border-[#E7ECF2] px-3 py-2.5 text-[14px] outline-none focus:border-[#1877F2]" />
          <button type="button" disabled={postBusy} onClick={() => void submitPost()} className="w-full rounded-full bg-[#1877F2] py-3 text-[15px] font-bold text-white disabled:opacity-60">
            {postBusy ? "Submitting…" : "Submit job"}
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
      ) : null}

      {tab === "roles" || (tab !== "apps" && tab !== "post") ? (
        <>
          {kind === "job" ? (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {([
                ["all", "All"],
                ["remote", "Remote"],
                ["lagos", "Lagos"],
              ] as const).map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setFilter(k)}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-[12px] font-bold ${filter === k ? "bg-[#1877F2] text-white" : "bg-[#F1F5F9] text-[#334155]"}`}
                >
                  {label}
                </button>
              ))}
            </div>
          ) : null}

          <label className="flex items-center gap-2 rounded-2xl border border-[#E7ECF2] bg-white px-3 py-2.5">
            <Search className="size-4 shrink-0 text-[#94A3B8]" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={kind === "job" ? "Search roles, companies, cities…" : "Search…"}
              className="min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-[#94A3B8]"
            />
          </label>

          {filtered.length === 0 && !err ? (
            <p className="rounded-2xl border border-dashed border-[#E7ECF2] bg-[#F7F9FC] px-4 py-8 text-center text-[13px] text-[#64748B]">
              No approved {kind === "job" ? "roles" : "listings"} match. Staff approve before they go public.
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
                    {meta.salary ? <div className="mt-0.5 text-[12px] font-semibold text-[#1877F2]">{meta.salary}</div> : null}
                    {r.body ? <p className="mt-1 line-clamp-2 text-[12px] leading-snug text-[#64748B]">{r.body}</p> : null}
                  </div>
                </button>
              );
            })}
          </div>
        </>
      ) : null}

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
