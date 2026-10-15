import { useEffect, useState } from "react";
import {
  deleteListing,
  listMyApps,
  listMyApplicants,
  listMyListings,
  type Listing,
  type MyApp,
  type MyApplicant,
} from "@/lib/listings-server";
import { fmtCount, timeAgo } from "@/lib/qonvo-data";

function goto(detail: { screen?: string; tab?: string }) {
  window.dispatchEvent(new CustomEvent("kilode:goto", { detail }));
}

/** My listings + applications + applicants for My Space. */
export function ListingsDesk({ onBack }: { onBack: () => void }) {
  const [tab, setTab] = useState<"mine" | "apps" | "inbox">("mine");
  const [mine, setMine] = useState<Listing[]>([]);
  const [apps, setApps] = useState<MyApp[]>([]);
  const [inbox, setInbox] = useState<MyApplicant[]>([]);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");

  const reload = () => {
    void listMyListings()
      .then((r) => setMine(Array.isArray(r) ? r : []))
      .catch(() => setMine([]));
    void listMyApps()
      .then((r) => setApps(Array.isArray(r) ? r : []))
      .catch(() => setApps([]));
    void listMyApplicants()
      .then((r) => setInbox(Array.isArray(r) ? r : []))
      .catch(() => setInbox([]));
  };

  useEffect(() => {
    reload();
  }, []);

  return (
    <section className="mb-4">
      <button type="button" className="mb-3 text-[13px] font-semibold text-lime-2" onClick={onBack}>
        ← Back
      </button>
      <h2 className="text-lg font-extrabold">Listings desk</h2>
      <p className="mt-1 text-[12px] text-muted">Your jobs, market, rent posts — and who applied.</p>

      <div className="mt-3 flex gap-1.5">
        {(
          [
            ["mine", "My posts"],
            ["apps", "My applications"],
            ["inbox", "Applicants"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`rounded-full border px-3 py-1 text-[12px] font-bold ${tab === id ? "border-lime-2 bg-lime-2 text-black" : "border-line"}`}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {err ? <p className="mt-2 text-[12px] text-danger">{err}</p> : null}

      {tab === "mine" ? (
        <div className="mt-3 space-y-2">
          {mine.length === 0 ? (
            <p className="text-[13px] text-muted">
              No listings yet.{" "}
              <button type="button" className="font-semibold text-lime-2" onClick={() => goto({ screen: "jobs" })}>
                Post a job
              </button>
            </p>
          ) : null}
          {mine.map((r) => (
            <article key={r.id} className="rounded-xl border border-line px-3 py-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[10px] font-bold uppercase tracking-wide text-muted">
                    {r.kind} · {r.status}
                  </div>
                  <div className="truncate text-[14px] font-semibold">{r.title}</div>
                  <div className="text-[11px] text-muted">
                    {r.city || "—"} · {fmtCount(r.views)} views · {timeAgo(r.ts)}
                  </div>
                </div>
                <button
                  type="button"
                  disabled={busy === r.id}
                  className="shrink-0 text-[11px] font-semibold text-danger"
                  onClick={() => {
                    setBusy(r.id);
                    setErr("");
                    void deleteListing({ data: { id: r.id } })
                      .then((res) => {
                        if (res && "ok" in res && res.ok === false) {
                          setErr("Could not remove.");
                          return;
                        }
                        reload();
                      })
                      .catch(() => setErr("Could not remove."))
                      .finally(() => setBusy(""));
                  }}
                >
                  Remove
                </button>
              </div>
              {r.status === "awaiting_pay" ? (
                <p className="mt-1 text-[11px] text-amber-600">Limited until payment clears.</p>
              ) : null}
              {r.status === "pending" ? (
                <p className="mt-1 text-[11px] text-muted">Waiting for staff approval.</p>
              ) : null}
            </article>
          ))}
        </div>
      ) : null}

      {tab === "apps" ? (
        <div className="mt-3 space-y-2">
          {apps.length === 0 ? <p className="text-[13px] text-muted">You have not applied to any jobs yet.</p> : null}
          {apps.map((a) => (
            <article key={a.id} className="rounded-xl border border-line px-3 py-2">
              <div className="text-[14px] font-semibold">{a.title || "Job"}</div>
              <div className="text-[11px] text-muted">
                {a.company || "—"} · {a.city || "—"} · {timeAgo(a.ts)}
              </div>
              {a.note ? <p className="mt-1 text-[12px] text-muted">{a.note}</p> : null}
              <div className="mt-1 text-[10px] font-bold uppercase text-muted">{a.status}</div>
            </article>
          ))}
        </div>
      ) : null}

      {tab === "inbox" ? (
        <div className="mt-3 space-y-2">
          {inbox.length === 0 ? (
            <p className="text-[13px] text-muted">No applicants on your jobs yet. When someone applies, they show here.</p>
          ) : null}
          {inbox.map((a) => (
            <article key={a.id} className="rounded-xl border border-line px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[14px] font-semibold">@{a.handle}</div>
                  <div className="text-[11px] text-muted">
                    on {a.title || "job"} · {timeAgo(a.ts)}
                  </div>
                </div>
              </div>
              {a.note ? <p className="mt-1 text-[12px]">{a.note}</p> : null}
              {a.phone ? <div className="mt-1 text-[11px] text-muted">Phone · {a.phone}</div> : null}
              {a.skills ? <div className="text-[11px] text-muted">Skills · {a.skills}</div> : null}
              {a.cv ? (
                <a href={a.cv} target="_blank" rel="noreferrer" className="mt-1 inline-block text-[12px] font-semibold text-lime-2">
                  Open CV / link
                </a>
              ) : null}
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
