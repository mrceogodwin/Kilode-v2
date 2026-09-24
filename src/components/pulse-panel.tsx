import { useEffect, useState } from "react";
import { myPulse, sitePulse, type Pulse } from "@/lib/pulse-server";

function Cell({ k, v }: { k: string; v: number }) {
  return (
    <div className="rounded-[10px] border border-line bg-panel px-2 py-1.5">
      <div className="text-[9px] font-semibold tracking-[0.06em] text-muted">{k}</div>
      <div className="text-[16px] font-semibold tabular-nums leading-tight">{v}</div>
    </div>
  );
}

export function SitePulsePanel() {
  const [p, setP] = useState<Pulse | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    void sitePulse()
      .then(setP)
      .catch(() => setErr("Counts are not ready yet."));
  }, []);
  return (
    <div className="md:col-span-2 rounded-xl border border-line bg-panel-2 p-3">
      <div className="text-[11px] font-semibold tracking-[0.08em] text-lime-2">PULSE</div>
      <p className="mt-0.5 text-[11px] text-muted">Counts only. Refreshes every 3 minutes. No live tracker, so it does not load the database on every visit.</p>
      {err ? <p className="mt-2 text-[11px] text-danger">{err}</p> : null}
      {p ? (
        <div className="mt-2 grid grid-cols-4 gap-1.5 sm:grid-cols-8">
          <Cell k="MEMBERS" v={p.members} />
          <Cell k="POSTS" v={p.posts} />
          <Cell k="DRAFTS" v={p.drafts} />
          <Cell k="SOCIALS" v={p.takes} />
          <Cell k="CHATS" v={p.chats} />
          <Cell k="ADS" v={p.ads} />
          <Cell k="TRACKS" v={p.tracks} />
          <Cell k="LISTINGS" v={p.listings} />
        </div>
      ) : !err ? (
        <p className="mt-2 text-[11px] text-muted">Loading…</p>
      ) : null}
    </div>
  );
}

export function MyPulseCard({ kind }: { kind: string }) {
  const [p, setP] = useState<Awaited<ReturnType<typeof myPulse>> | null>(null);
  useEffect(() => {
    void myPulse()
      .then(setP)
      .catch(() => setP(null));
  }, []);
  if (!p) return null;
  const focus =
    kind === "artist" ? "Tracks are your main number." :
    kind === "advertiser" || kind === "brand" ? "Ads are your main number." :
    kind === "job_poster" || kind === "vendor" || kind === "renter" ? "Listings are your main number." :
    kind === "writer" ? "Posts are your main number." :
    "Chat and takes are yours. News you write waits as a draft.";
  return (
    <div className="rounded-xl border border-line bg-panel p-3">
      <div className="text-[11px] font-semibold tracking-[0.08em] text-lime-2">YOUR NUMBERS</div>
      <p className="mt-0.5 text-[11px] text-muted">{focus}</p>
      <div className="mt-2 grid grid-cols-3 gap-1.5">
        <Cell k="POSTS" v={p.posts} />
        <Cell k="TAKES" v={p.takes} />
        <Cell k="CHATS" v={p.chats} />
        <Cell k="ADS" v={p.ads} />
        <Cell k="TRACKS" v={p.tracks} />
        <Cell k="LISTINGS" v={p.listings} />
      </div>
    </div>
  );
}
