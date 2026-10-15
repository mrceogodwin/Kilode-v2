import { Briefcase, Clapperboard, Music, Store, Users, Megaphone, Building2, Calendar, Eye } from "lucide-react";
import { SitePulsePanel } from "@/components/pulse-panel";
import { PushStrip } from "@/components/artist-push";

type News = { id: string; title: string; image?: string; category?: string; ts: number; views?: number; status?: string };

const HUBS = [
  { key: "cinema", label: "Cinema", sub: "Watch & vote", icon: Clapperboard, color: "#7a4db8" },
  { key: "jobs", label: "Jobs", sub: "Hire · Apply", icon: Briefcase, color: "#1f8f4e" },
  { key: "market", label: "Market", sub: "Shop local", icon: Store, color: "#e25b4a" },
  { key: "music", label: "Music", sub: "Artists live", icon: Music, color: "#f0b429" },
  { key: "communities", label: "Rooms", sub: "Chat live", icon: Users, color: "#3a6ea5" },
  { key: "ads", label: "Ads", sub: "Promote", icon: Megaphone, color: "#1877F2" },
  { key: "rent", label: "Rent", sub: "Spaces", icon: Building2, color: "#0ea5e9" },
  { key: "spaces", label: "Events", sub: "Happenings", icon: Calendar, color: "#db2777" },
] as const;

const SEGMENTS = ["For you", "News", "Jobs", "Market", "Music", "Cinema"] as const;

const DEMO: News[] = [
  { id: "demo-1", title: "Naija tech founders raise seed for local apps", category: "Tech", ts: Date.now() - 3600000, views: 1240 },
  { id: "demo-2", title: "Lagos traffic: alternative routes this week", category: "City", ts: Date.now() - 7200000, views: 890 },
  { id: "demo-3", title: "AFCON buzz: fans gear up across the country", category: "Sports", ts: Date.now() - 10800000, views: 2100 },
  { id: "demo-4", title: "Naira market check — what traders are saying", category: "Business", ts: Date.now() - 14400000, views: 1560 },
  { id: "demo-5", title: "New music drops from emerging artists", category: "Culture", ts: Date.now() - 18000000, views: 640 },
  { id: "demo-6", title: "Job openings: remote roles hiring this week", category: "Jobs", ts: Date.now() - 21600000, views: 980 },
];

function normalizeNews(raw: unknown): News[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item: any, i: number) => {
      const title = String(item?.title || item?.body || item?.text || "").trim();
      if (!title) return null;
      return {
        id: String(item?.id || `n-${i}`),
        title: title.slice(0, 120),
        image: typeof item?.image === "string" ? item.image : typeof item?.meta?.image === "string" ? item.meta.image : undefined,
        category: String(item?.category || item?.kind || item?.tag || "News").slice(0, 24),
        ts: Number(item?.ts || item?.createdAt || Date.now()),
        views: typeof item?.views === "number" ? item.views : undefined,
        status: item?.status,
      } as News;
    })
    .filter(Boolean) as News[];
}

function hardOpen(key: string, onOpen?: (k: string) => void) {
  try {
    onOpen?.(key);
  } catch { /* ignore */ }
  try {
    window.dispatchEvent(new CustomEvent("kilode:goto", { detail: { screen: key } }));
  } catch { /* ignore */ }
  try {
    const u = new URL(window.location.href);
    u.searchParams.set("open", key);
    window.history.pushState({}, "", u.toString());
    window.dispatchEvent(new PopStateEvent("popstate"));
  } catch { /* ignore */ }
}

export function HomeMediaLane({
  news = [],
  tickText = "Talk Nigeria. Live.",
  onOpen,
  onOpenNews,
}: {
  news?: News[] | unknown;
  tickText?: string;
  onOpen?: (key: string) => void;
  onOpenNews?: (id?: string) => void;
}) {
  const open = (k: string) => hardOpen(k, onOpen);
  const fromStore = normalizeNews(news);
  const list = (fromStore.length > 0 ? fromStore : DEMO).slice(0, 12);
  const featured = list.slice(0, 5);
  const rest = list.slice(5);

  return (
    <div style={{ paddingBottom: 24 }} data-home-lane="v2">
      <div className="sf-tick" aria-label="Trending" style={{ marginBottom: 0 }}>
        <span className="sf-tick-label">LIVE</span>
        <div className="sf-tick-track">
          <div className="sf-tick-marquee">{tickText} · {tickText}</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, overflowX: "auto", padding: "10px 14px 6px", WebkitOverflowScrolling: "touch" }}>
        {SEGMENTS.map((s, i) => (
          <button
            key={s}
            type="button"
            onClick={() => {
              if (s === "News") onOpenNews?.() ?? open("news");
              else if (s === "Jobs") open("jobs");
              else if (s === "Market") open("market");
              else if (s === "Music") open("music");
              else if (s === "Cinema") open("cinema");
            }}
            style={{
              flex: "0 0 auto",
              border: 0,
              borderRadius: 999,
              padding: "7px 14px",
              fontSize: 12,
              fontWeight: 700,
              background: i === 0 ? "#1877F2" : "#F1F5F9",
              color: i === 0 ? "#fff" : "#334155",
            }}
          >
            {s}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", gap: 12, overflowX: "auto", padding: "10px 14px 4px", WebkitOverflowScrolling: "touch" }}>
        {featured.map((n) => (
          <button
            key={n.id}
            type="button"
            onClick={() => (n.id.startsWith("demo-") ? open("news") : onOpenNews?.(n.id))}
            style={{
              flex: "0 0 78%",
              maxWidth: 320,
              textAlign: "left",
              border: 0,
              padding: 0,
              background: "#0B0D12",
              borderRadius: 16,
              overflow: "hidden",
              color: "#fff",
            }}
          >
            {n.image ? (
              <img src={n.image} alt="" style={{ width: "100%", height: 160, objectFit: "cover", display: "block" }} />
            ) : (
              <div style={{ height: 120, background: "linear-gradient(135deg,#1877F2,#0B0D12)" }} />
            )}
            <div style={{ padding: "10px 12px 14px" }}>
              <div style={{ fontSize: 10, fontWeight: 700, opacity: 0.7, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                {n.category || "News"}
              </div>
              <div style={{ fontSize: 15, fontWeight: 800, lineHeight: 1.3, marginTop: 4 }}>{n.title}</div>
              {n.views != null ? (
                <div style={{ fontSize: 11, opacity: 0.65, marginTop: 6, display: "flex", alignItems: "center", gap: 4 }}>
                  <Eye size={12} /> {n.views}
                </div>
              ) : null}
            </div>
          </button>
        ))}
      </div>

      <div style={{ padding: "12px 14px 4px" }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: "#64748B", letterSpacing: "0.06em", marginBottom: 10 }}>EXPLORE</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {HUBS.map((h) => {
            const Icon = h.icon;
            return (
              <button
                key={h.key}
                type="button"
                onClick={() => open(h.key)}
                style={{
                  textAlign: "left",
                  border: "1px solid #E7ECF2",
                  borderRadius: 16,
                  padding: 12,
                  background: "#fff",
                }}
              >
                <span
                  style={{
                    display: "inline-grid",
                    placeItems: "center",
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    background: h.color + "18",
                    color: h.color,
                  }}
                >
                  <Icon size={16} />
                </span>
                <div style={{ fontWeight: 800, marginTop: 8, fontSize: 14 }}>{h.label}</div>
                <div style={{ fontSize: 11, color: "#64748B" }}>{h.sub}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ margin: "14px 14px 6px" }}>
        <button
          type="button"
          onClick={() => open("ads")}
          style={{
            width: "100%",
            border: 0,
            borderRadius: 16,
            padding: "16px 18px",
            background: "linear-gradient(135deg,#1877F2 0%,#0B5FCC 100%)",
            color: "#fff",
            textAlign: "left",
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.85 }}>PROMOTE</div>
          <div style={{ fontSize: 16, fontWeight: 800, marginTop: 4 }}>Reach Nigerians on Kilode</div>
          <div style={{ fontSize: 12, opacity: 0.9, marginTop: 4 }}>Boost a post, listing, or event · from ₦500</div>
        </button>
      </div>

      <div style={{ padding: "10px 14px 4px" }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: "#64748B", letterSpacing: "0.06em", marginBottom: 10 }}>LATEST</div>
        {(rest.length ? rest : list).map((n) => (
          <button
            key={n.id}
            type="button"
            onClick={() => (n.id.startsWith("demo-") ? open("news") : onOpenNews?.(n.id))}
            style={{
              display: "flex",
              gap: 12,
              alignItems: "center",
              width: "100%",
              border: 0,
              background: "none",
              padding: "10px 0",
              borderBottom: "1px solid #F1F5F9",
              textAlign: "left",
            }}
          >
            {n.image ? (
              <img src={n.image} alt="" width={52} height={52} style={{ borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
            ) : (
              <span
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: "50%",
                  background: "#EFF6FF",
                  color: "#1877F2",
                  display: "grid",
                  placeItems: "center",
                  fontWeight: 800,
                  fontSize: 14,
                  flexShrink: 0,
                }}
              >
                {(n.category || "N")[0]}
              </span>
            )}
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.35 }}>{n.title}</div>
              <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>
                {n.category || "News"}
                {n.views != null ? ` · ${n.views} views` : ""}
              </div>
            </div>
          </button>
        ))}
      </div>

      <div style={{ padding: "8px 14px" }}>
        <PushStrip />
      </div>

      <div style={{ margin: "8px 14px" }}>
        <button
          type="button"
          onClick={() => open("market")}
          style={{
            width: "100%",
            border: "1px solid #E7ECF2",
            borderRadius: 14,
            padding: "12px 14px",
            background: "#FFFBEB",
            textAlign: "left",
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 800, color: "#B45309" }}>MARKET</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#0F172A", marginTop: 2 }}>Sell on Kilode Market</div>
        </button>
      </div>

      <div style={{ padding: "4px 12px 8px" }}>
        <SitePulsePanel />
      </div>
    </div>
  );
}
