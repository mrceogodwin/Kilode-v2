import { useEffect, useState } from "react";
import { myPulse, sitePulse, type Pulse } from "@/lib/pulse-server";

function Cell({ k, v }: { k: string; v: number }) {
  return (
    <div
      style={{
        borderRadius: 10,
        border: "1px solid #E7ECF2",
        background: "#fff",
        padding: "8px 10px",
      }}
    >
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", color: "#94A3B8" }}>{k}</div>
      <div style={{ fontSize: 16, fontWeight: 800, fontVariantNumeric: "tabular-nums", lineHeight: 1.2, color: "#0F172A" }}>
        {v}
      </div>
    </div>
  );
}

const EMPTY: Pulse = {
  members: 0,
  posts: 0,
  drafts: 0,
  takes: 0,
  chats: 0,
  ads: 0,
  tracks: 0,
  listings: 0,
};

export function SitePulsePanel() {
  const [p, setP] = useState<Pulse | null>(null);
  const [status, setStatus] = useState<"loading" | "ok" | "cold">("loading");

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const data = await sitePulse();
        if (!alive) return;
        setP(data);
        setStatus("ok");
      } catch {
        if (!alive) return;
        // Show zeros instead of a scary red error — counts often cold on first boot
        setP(EMPTY);
        setStatus("cold");
      }
    };
    void load();
    const t = window.setInterval(() => void load(), 180_000);
    return () => {
      alive = false;
      window.clearInterval(t);
    };
  }, []);

  return (
    <div
      style={{
        borderRadius: 16,
        border: "1px solid #E7ECF2",
        background: "#F8FAFC",
        padding: 14,
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", color: "#1877F2" }}>PULSE</div>
      <p style={{ margin: "4px 0 0", fontSize: 11, color: "#64748B", lineHeight: 1.4 }}>
        Live counts across Kilode. Refreshes every 3 minutes.
      </p>
      {status === "loading" && !p ? (
        <p style={{ marginTop: 10, fontSize: 11, color: "#94A3B8" }}>Loading counts…</p>
      ) : null}
      {p ? (
        <div
          style={{
            marginTop: 10,
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 8,
          }}
        >
          <Cell k="MEMBERS" v={p.members} />
          <Cell k="POSTS" v={p.posts} />
          <Cell k="DRAFTS" v={p.drafts} />
          <Cell k="SOCIALS" v={p.takes} />
          <Cell k="CHATS" v={p.chats} />
          <Cell k="ADS" v={p.ads} />
          <Cell k="TRACKS" v={p.tracks} />
          <Cell k="LISTINGS" v={p.listings} />
        </div>
      ) : null}
      {status === "cold" ? (
        <p style={{ marginTop: 8, fontSize: 11, color: "#94A3B8" }}>
          Counts warming up — zeros until the first successful read.
        </p>
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
    kind === "artist"
      ? "Tracks are your main number."
      : kind === "advertiser" || kind === "brand"
        ? "Ads are your main number."
        : kind === "job_poster" || kind === "vendor" || kind === "renter"
          ? "Listings are your main number."
          : kind === "writer"
            ? "Posts are your main number."
            : "Chat and takes are yours. News you write waits as a draft.";
  return (
    <div style={{ borderRadius: 16, border: "1px solid #E7ECF2", background: "#fff", padding: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", color: "#1877F2" }}>YOUR NUMBERS</div>
      <p style={{ margin: "4px 0 0", fontSize: 11, color: "#64748B" }}>{focus}</p>
      <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
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
