export type Room = {
  id: string;
  name: string;
  region: string;
  online: number;
};

export const ROOMS: Room[] = [
  { id: "global", name: "Global Chat", region: "Featured", online: 12481 },
  { id: "hot", name: "Hot Topics", region: "Featured", online: 8204 },
  { id: "music", name: "Music & Vibes", region: "Entertainment", online: 2401 },
  { id: "game", name: "Gaming Lounge", region: "Gaming", online: 5802 },
  { id: "tech", name: "Tech", region: "Tech", online: 3901 },
  { id: "sport", name: "Sports", region: "Sports", online: 3102 },
  { id: "edu", name: "Education", region: "Education", online: 1402 },
  { id: "food", name: "Food", region: "Food", online: 980 },
  { id: "biz", name: "Business", region: "Business", online: 1604 },
  { id: "lang", name: "Language Exchange", region: "Featured", online: 3119 },
  { id: "ng", name: "Nigeria", region: "Africa", online: 8204 },
  { id: "gh", name: "Ghana", region: "Africa", online: 1892 },
  { id: "za", name: "South Africa", region: "Africa", online: 2103 },
  { id: "ke", name: "Kenya", region: "Africa", online: 1204 },
  { id: "eg", name: "Egypt", region: "Africa", online: 2890 },
  { id: "et", name: "Ethiopia", region: "Africa", online: 891 },
  { id: "ma", name: "Morocco", region: "Africa", online: 1340 },
  { id: "us", name: "United States", region: "Americas", online: 9310 },
  { id: "br", name: "Brazil", region: "Americas", online: 4108 },
  { id: "mx", name: "Mexico", region: "Americas", online: 3890 },
  { id: "ca", name: "Canada", region: "Americas", online: 2104 },
  { id: "ar", name: "Argentina", region: "Americas", online: 1802 },
  { id: "in", name: "India", region: "Asia", online: 11020 },
  { id: "jp", name: "Japan", region: "Asia", online: 6520 },
  { id: "kr", name: "South Korea", region: "Asia", online: 5102 },
  { id: "id", name: "Indonesia", region: "Asia", online: 4580 },
  { id: "ph", name: "Philippines", region: "Asia", online: 3740 },
  { id: "cn", name: "China", region: "Asia", online: 7041 },
  { id: "pk", name: "Pakistan", region: "Asia", online: 3120 },
  { id: "gb", name: "United Kingdom", region: "Europe", online: 3210 },
  { id: "fr", name: "France", region: "Europe", online: 2801 },
  { id: "de", name: "Germany", region: "Europe", online: 2210 },
  { id: "it", name: "Italy", region: "Europe", online: 1904 },
  { id: "es", name: "Spain", region: "Europe", online: 2011 },
  { id: "tr", name: "Turkey", region: "Middle East", online: 3401 },
  { id: "sa", name: "Saudi Arabia", region: "Middle East", online: 2890 },
  { id: "ae", name: "UAE", region: "Middle East", online: 2201 },
  { id: "au", name: "Australia", region: "Oceania", online: 2801 },
  { id: "nz", name: "New Zealand", region: "Oceania", online: 891 },
];

export const REGIONS = ["All", ...Array.from(new Set(ROOMS.map((r) => r.region)))];

export const ACCOUNT_KINDS = [
  { id: "member", label: "Normal user", hint: "Chat, feeds, vote, apply to jobs" },
  { id: "artist", label: "Artist", hint: "Pay to list music URLs only" },
  { id: "writer", label: "Writer", hint: "News, blogs, reviews" },
  { id: "advertiser", label: "Ads Poster", hint: "Pay to place business ads" },
  { id: "cinema", label: "Advertiser (Cinema)", hint: "Pay to submit movie YouTube URLs" },
  { id: "job_poster", label: "Job Poster", hint: "Post jobs and manage applicants" },
  { id: "job_seeker", label: "Job Seeker", hint: "Resume + apply to jobs" },
  { id: "vendor", label: "Marketplace seller", hint: "Showcase products. No in-app checkout" },
  { id: "renter", label: "Rent / space lister", hint: "List properties with contact links" },
  { id: "brand", label: "Brand / business", hint: "Company page and ads" },
] as const;

export type AccountKind = (typeof ACCOUNT_KINDS)[number]["id"];

export type ProfileExtra = {
  kind: AccountKind;
  stage: string;
  genre: string;
  website: string;
  brand: string;
};

export function asAccountKind(v: string | null | undefined): AccountKind {
  return ACCOUNT_KINDS.some((k) => k.id === v) ? (v as AccountKind) : "member";
}

export const COMMUNITIES = [
  { id: "africa", name: "Africa Hub", region: "Africa" },
  { id: "americas", name: "Americas Hub", region: "Americas" },
  { id: "asia", name: "Asia Hub", region: "Asia" },
  { id: "europe", name: "Europe Hub", region: "Europe" },
  { id: "me", name: "Middle East Hub", region: "Middle East" },
  { id: "tech", name: "Tech", region: "Tech" },
  { id: "game", name: "Gaming", region: "Gaming" },
] as const;

export const MENU = [
  ["home", "Home"],
  ["forum", "Feeds & topics"],
  ["community", "Communities"],
  ["search", "Search"],
  ["create", "Create post"],
  ["profile", "My Profile"],
  ["dashboard", "Dashboard"],
  ["bookmarks", "My Bookmarks"],
  ["notifications", "Notifications"],
  ["inbox", "Messages"],
  ["teams", "Teams"],
  ["badges", "Badges"],
  ["leaderboard", "Leaderboard"],
  ["trending", "Trending tags"],
  ["ads", "Ads"],
  ["contact", "Contact"],
  ["admin", "Admin"],
  ["settings", "Settings"],
  ["help", "Help & FAQ"],
] as const;

export type MenuId = (typeof MENU)[number][0];

export type ChatMsg = {
  n: string;
  t: string;
  ts: number;
  rx?: Record<string, number>;
  parentTs?: number;
  parentN?: string;
  parentT?: string;
};

export type PresenceUser = { handle: string; typing: boolean };

export type PostComment = { author: string; body: string; ts: number; parentTs?: number };

export type Post = {
  id: string;
  title: string;
  body: string;
  excerpt?: string;
  author: string;
  ts: number;
  comments: PostComment[];
  category?: string;
  tags?: string;
  link?: string;
  image?: string;
  slug?: string;
  status?: "draft" | "publish";
  views?: number;
};

export const POST_CATS = ["General", "News", "Naija", "Tech", "Sports", "Business", "Culture", "Opinion", "Music", "Comedy", "Politics", "Lifestyle", "Education", "Health", "Travel", "Fashion", "Food", "Jobs"];

export function safeHttpUrl(raw: string): string | undefined {
  const v = raw.trim();
  if (!v) return undefined;
  try {
    const u = new URL(v);
    if (u.protocol !== "http:" && u.protocol !== "https:") return undefined;
    return u.toString();
  } catch {
    return undefined;
  }
}

export function slugify(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

export function youtubeId(raw: string) {
  const v = raw.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(v)) return v;
  try {
    const u = new URL(v);
    if (u.hostname.includes("youtu.be")) return u.pathname.replace("/", "").slice(0, 11) || undefined;
    const vq = u.searchParams.get("v");
    if (vq) return vq;
    const parts = u.pathname.split("/").filter(Boolean);
    const i = parts.findIndex((p) => p === "embed" || p === "shorts");
    if (i >= 0 && parts[i + 1]) return parts[i + 1].slice(0, 11);
  } catch {
    return undefined;
  }
  return undefined;
}

export function fmtCount(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(n);
}

export type Team = { id: string; name: string; members: string[] };
export type AdKind = "image" | "video" | "image-text" | "video-text" | "text";

export const AD_KINDS: { id: AdKind; label: string }[] = [
  { id: "image", label: "Image" },
  { id: "video", label: "Video" },
  { id: "image-text", label: "Image + text" },
  { id: "video-text", label: "Video + text" },
  { id: "text", label: "Text + link" },
];

export const CHAT_TTLS = [
  { hours: 1, label: "1 hour" },
  { hours: 6, label: "6 hours" },
  { hours: 12, label: "12 hours" },
  { hours: 24, label: "1 day" },
  { hours: 48, label: "2 days" },
  { hours: 72, label: "3 days" },
  { hours: 168, label: "7 days" },
  { hours: 336, label: "14 days" },
  { hours: 720, label: "30 days" },
  { hours: 0, label: "Never (keep)" },
] as const;

export function chatTtlLabel(hours: number) {
  return CHAT_TTLS.find((t) => t.hours === hours)?.label ?? `${hours} hours`;
}

export const AD_PLACEMENTS = [
  { id: "board", label: "Ads grid", usd: 40, hint: "Shows in the Ads area" },
  { id: "chat", label: "Chat stream · premium", usd: 250, hint: "Scrolls up with live chat" },
  { id: "chat-pin", label: "Pinned in chat · top", usd: 800, hint: "Stays at the top of Chat" },
] as const;

export type AdPlacement = (typeof AD_PLACEMENTS)[number]["id"];

export type Campaign = {
  id: string;
  name: string;
  note: string;
  ts: number;
  status: "pending" | "paid" | "approved" | "rejected";
  placement: "sidebar" | "hero" | "chat" | "board" | "chat-pin";
  txHash?: string;
  amount?: string;
  coin?: string;
  link?: string;
  image?: string;
  video?: string;
  kind?: AdKind;
  views?: number;
};

export const AD_COINS = [
  { id: "btc", label: "Bitcoin", ticker: "BTC" },
  { id: "eth", label: "Ethereum", ticker: "ETH" },
  { id: "usdc", label: "USDC", ticker: "USDC" },
  { id: "usdt", label: "USDT", ticker: "USDT" },
  { id: "sol", label: "Solana", ticker: "SOL" },
  { id: "bnb", label: "BNB", ticker: "BNB" },
  { id: "ltc", label: "Litecoin", ticker: "LTC" },
  { id: "trx", label: "Tron TRC-20", ticker: "TRX" },
] as const;

export type Join = { name: string; ts: number; room?: string };
export type Note = { id: string; text: string; ts: number; href?: string };

export const PREFIX = "qonvo.v6.";

export function loadJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as T;
    // One-time salvage: drop null holes / objects missing string id (corrupt prior writes).
    if (Array.isArray(parsed) && Array.isArray(fallback)) {
      const idKeys = new Set(["posts", "tracks", "teams", "ads", "pins", "notes", "joins"]);
      const cleaned = (parsed as unknown[]).filter((x) => {
        if (x == null) return false;
        if (!idKeys.has(key)) return true;
        return typeof (x as { id?: unknown }).id === "string" || typeof (x as { name?: unknown }).name === "string";
      });
      if (cleaned.length !== (parsed as unknown[]).length) {
        try {
          localStorage.setItem(PREFIX + key, JSON.stringify(cleaned));
        } catch {
          /* quota */
        }
        return cleaned as T;
      }
    }
    return parsed;
  } catch {
    try {
      localStorage.removeItem(PREFIX + key);
    } catch {
      /* ignore */
    }
    return fallback;
  }
}

export function saveJson(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* quota */
  }
}

export function clearAll() {
  if (typeof window === "undefined") return;
  const drop: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(PREFIX)) drop.push(k);
  }
  drop.forEach((k) => localStorage.removeItem(k));
}

export function allRoomMessages(): ChatMsg[] {
  const out: ChatMsg[] = [];
  for (const room of ROOMS) {
    out.push(...loadJson<ChatMsg[]>(`msgs.${room.id}`, []));
  }
  return out;
}

export function roomName(id: string) {
  return ROOMS.find((r) => r.id === id)?.name ?? id;
}

export function handleColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 33 + name.charCodeAt(i)) >>> 0;
  return `hsl(${h % 360} 62% 64%)`;
}

export const TERMS = `Kilode Terms of Use

By creating an account or using post, music, video, cinema, ads, jobs, marketplace, or rent tools you agree:

1. You pick one account type at register. You cannot switch it yourself. Super admin may override.
2. You are responsible for what you publish. Do not post illegal content, scams, hate, or anyone’s private data.
3. Music is link-only (YouTube, Audiomack, SoundCloud, Spotify, Boomplay, Apple). We do not host audio files.
4. Movies are YouTube URLs submitted by Cinema Advertisers, then approved. We do not host video files.
5. Ads, jobs, marketplace, and rent listings may be refused. Crypto tx hashes are a record until staff checks them.
6. Send crypto only to addresses shown in Kilode after you tap Copy. Verify the first and last 6 characters. Wrong network = lost funds. Kilode never DMs a wallet.
7. Handles and public posts can be seen by others. This is not a bank or a lawyer.
8. We may hide, reject, or remove content and accounts that break these rules.
9. The service is provided as-is. Community chat is not professional advice.

Last updated September 2026.

Privacy
We do not ask for a public email. Login uses a private username. Do not put real addresses or ID numbers in chat. Cookies keep you signed in. We do not sell your handle list.

Developer
Kilode is built with @Builtbystacks · Squadglobaldynasty. Telegram: https://t.me/Builtbystacks`;

export function timeLabel(ts: number) {
  const diff = Date.now() - ts;
  if (diff < 45_000) return "just now";
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h`;
  return new Date(ts).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export type MusicTrack = {
  id: string;
  title: string;
  artist: string;
  url: string;
  platform: string;
  embed?: string;
  cover?: string;
  genre?: string;
  album?: string;
  note?: string;
  tags?: string;
  author: string;
  ts: number;
  views?: number;
};

const MUSIC_HOSTS = [
  "open.spotify.com",
  "spotify.com",
  "soundcloud.com",
  "audiomack.com",
  "music.apple.com",
  "boomplay.com",
  "deezer.com",
];

export function parseMusicUrl(raw: string): { url: string; platform: string; embed?: string } | undefined {
  const url = safeHttpUrl(raw);
  if (!url) return undefined;
  let host = "";
  try {
    host = new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return undefined;
  }
  if (host.includes("youtu")) return undefined;
  if (!MUSIC_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))) return undefined;

  if (host.includes("spotify")) {
    const path = new URL(url).pathname.replace(/^\/intl-[^/]+/, "");
    return { url, platform: "Spotify", embed: `https://open.spotify.com/embed${path}` };
  }
  if (host.includes("soundcloud")) {
    return { url, platform: "SoundCloud", embed: `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%231f8a5b&auto_play=false` };
  }
  if (host.includes("audiomack")) {
    const path = new URL(url).pathname;
    return { url, platform: "Audiomack", embed: `https://audiomack.com/embed${path}` };
  }
  if (host.includes("apple")) {
    return { url, platform: "Apple Music", embed: url.replace("music.apple.com", "embed.music.apple.com") };
  }
  if (host.includes("boomplay")) return { url, platform: "Boomplay" };
  if (host.includes("deezer")) {
    const id = url.match(/track\/(\d+)/)?.[1];
    return { url, platform: "Deezer", embed: id ? `https://widget.deezer.com/widget/dark/track/${id}` : undefined };
  }
  return { url, platform: host };
}
