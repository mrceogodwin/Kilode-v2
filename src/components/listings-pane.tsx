import { useEffect, useState } from "react";
import { Briefcase, Store, Building2 } from "lucide-react";
import { listListings, type Listing, type ListingKind } from "@/lib/listings-server";
import { CompanyMark } from "@/components/company-mark";
import { JoinCta } from "@/components/get-app";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

const TITLES: Record<ListingKind, string> = {
  job: "Jobs",
  market: "Marketplace",
  rent: "Rent / space",
};

export function ListingsPane({ kind }: { kind: ListingKind }) {
  const session = useCurrentUserState();
  const [rows, setRows] = useState<Listing[]>([]);
  const [err, setErr] = useState("");
  useEffect(() => {
    void listListings({ data: { kind } })
      .then((live) => setRows(Array.isArray(live) ? live : []))
      .catch((e) => setErr(e instanceof Error ? e.message : "Could not load"));
  }, [kind]);

  return (
    <div className="mx-auto max-w-3xl space-y-3 px-3 pb-20 pt-2">
      <div className="flex items-center gap-2">
        <span className="grid size-9 place-items-center rounded-xl bg-[#1877F2]/10 text-[#1877F2]">
          {kind === "job" ? <Briefcase className="size-4" /> : kind === "market" ? <Store className="size-4" /> : <Building2 className="size-4" />}
        </span>
        <div>
          <div className="text-[10px] font-bold tracking-[0.14em] text-[#1877F2]">{kind.toUpperCase()}</div>
          <h2 className="text-xl font-extrabold text-[#172033]">{TITLES[kind]}</h2>
        </div>
      </div>
      {err ? <p className="text-[12px] text-red-600">{err}</p> : null}
      {rows.length === 0 && !err ? (
        <p className="rounded-2xl border border-dashed border-[#E7ECF2] bg-[#F7F9FC] px-4 py-8 text-center text-[13px] text-[#64748B]">
          No approved listings yet. Staff approve before they go public.
        </p>
      ) : null}
      <div className="space-y-2">
        {rows.map((r) => (
          <article key={r.id} className="flex gap-3 rounded-2xl border border-[#E7ECF2] bg-white p-3">
            <CompanyMark name={r.company || r.title} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[14px] font-bold text-[#172033]">{r.title}</div>
              <div className="truncate text-[12px] text-[#64748B]">
                {r.company || "Company"} · {r.city || "Nigeria"}
              </div>
              {r.body ? <p className="mt-1 line-clamp-2 text-[12px] leading-snug text-[#334155]">{r.body}</p> : null}
            </div>
          </article>
        ))}
      </div>
      {!session.user ? (
        <div className="rounded-xl border border-[#E7ECF2] bg-[#F7F9FC] p-3 text-center">
          <p className="text-[12px] text-[#64748B]">Join to post or apply.</p>
          <JoinCta className="mx-auto mt-2 w-40" />
        </div>
      ) : null}
    </div>
  );
}

export function ListingsAdminPanel() {
  return (
    <div className="raised rounded-xl p-3 text-[13px] text-muted">
      Listings queue lives in /ops.
    </div>
  );
}
