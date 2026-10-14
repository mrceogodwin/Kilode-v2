export type Room = {
  id: string;
  name: string;
  region: string;
  online: number;
};

export const ROOMS: Room[] = [
  { id: "lounge", name: "Kilode Lounge", region: "Featured", online: 0 },
  { id: "hot", name: "Hot Topics", region: "Featured", online: 0 },
  { id: "ng", name: "Naija Pulse", region: "Featured", online: 0 },
  { id: "music", name: "Music & Vibes", region: "Featured", online: 0 },
  { id: "cinema", name: "Cinema", region: "Featured", online: 0 },
  { id: "jobs", name: "Jobs", region: "Featured", online: 0 },
  { id: "sport", name: "Sports", region: "Featured", online: 0 },
  { id: "tech", name: "Tech & Biz", region: "Featured", online: 0 },
  { id: "st-lagos", name: "Lagos", region: "Places", online: 0 },
  { id: "st-fct", name: "Abuja", region: "Places", online: 0 },
  { id: "st-rivers", name: "South-South", region: "Places", online: 0 },
  { id: "north", name: "Northern Pulse", region: "Places", online: 0 },
];

export const ROOM_SECTION_ORDER = [
  "Featured",
  "Places",
  "More rooms",
] as const;

export const REGIONS = ["All", ...ROOM_SECTION_ORDER];

export const ACCOUNT_KINDS = [
  { id: "member", label: "Normal user", hint: "Chat, feeds, vote, apply to jobs" },
  { id: "artist", label: "Artist", hint: "List music URLs live — no pay, no staff approval" },
  { id: "writer", label: "Writer", hint: "News, blogs, reviews" },
  { id: "advertiser", label: "Ads Poster", hint: "Pay to place business ads (not cinema)" },
  { id: "cinema", label: "Cinema Poster", hint: "Pay to submit movie YouTube URLs (not business ads)" },
  { id: "job_poster", label: "Job Poster", hint: "Post jobs and manage applicants" },
  { id: "job_seeker", label: "Job Seeker", hint: "Resume + apply to jobs" },
  { id: "vendor", label: "Marketplace seller", hint: "Showcase products. No in-app checkout" },
  { id: "renter", label: "Rent / space lister", hint: "List properties with contact links" },
  { id: "brand", label: "Brand / business", hint: "Company page and ads" },
] as const;

export function uniqueAccountKinds() {
  const seen = new Set<string>();
  return ACCOUNT_KINDS.filter((k) => {
    if (seen.has(k.id)) return false;
    seen.add(k.id);
    return true;
  });
}

export type AccountKind = (typeof ACCOUNT_KINDS)[number]["id"];

export type ProfileExtra = {
  kind: AccountKind;
  stage: string;
  genre: string;
  website: string;
  brand: string;
  face: string;
};

export const FACE_EMOJIS = ["😎", "🙂", "😁", "🤓", "👑", "🎵", "✍️", "💼", "🎬", "🏡", "🛍️", "🇳🇬", "🔥", "💭", "🦁", "🌟"] as const;

export const AVATAR_SEEDS = ["Ada", "Tunde", "Amaka", "Chidi", "Zara", "Femi", "Ngozi", "Kemi", "Ife", "Sade", "Yemi", "Baba"] as const;

export const LANG_CHOICES = [
  { id: "en", label: "English" },
  { id: "pcm", label: "Pidgin" },
  { id: "yo", label: "Yoruba" },
  { id: "ig", label: "Igbo" },
  { id: "ha", label: "Hausa" },
] as const;

export const KIND_INTERESTS: Record<AccountKind, string[]> = {
  member: ["News", "Sports", "Music", "Chat", "Jobs", "Market"],
  writer: ["Politics", "Tech", "Sports", "Entertainment", "Business"],
  artist: ["Afrobeats", "Amapiano", "Hip-Hop", "Highlife", "Gospel", "R&B"],
  advertiser: ["Shops", "Events", "Brands", "Food", "Fashion"],
  cinema: ["Nollywood", "Trailers", "Comedy", "Music videos"],
  job_poster: ["Hiring", "Tech", "Sales", "Creative", "Remote"],
  job_seeker: ["Jobs", "Tech", "Creative", "Remote", "Lagos"],
  vendor: ["Fashion", "Food", "Phones", "Beauty", "Home"],
  renter: ["Flats", "Shops", "Short let", "Lagos", "Abuja"],
  brand: ["Ads", "Products", "Events", "Music", "Fashion"],
};

export const KIND_FACE: Record<AccountKind, string> = {
  member: "av:Ada",
  writer: "av:Chidi",
  artist: "av:Zara",
  advertiser: "av:Femi",
  cinema: "av:Tunde",
  job_poster: "av:Baba",
  job_seeker: "av:Ife",
  vendor: "av:Sade",
  renter: "av:Kemi",
  brand: "av:Yemi",
};

export function avatarUrl(handle: string, face?: string | null) {
  if (face && (face.startsWith("data:image/") || /^https?:\/\//.test(face))) return face;
  if (face && FACE_EMOJIS.includes(face as (typeof FACE_EMOJIS)[number])) {
    return `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(handle || "Kilode")}&backgroundColor=111827,14532d,1f2937`;
  }
  const seed = face && face.startsWith("av:") ? face.slice(3) : handle || "Kilode";
  return `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(seed)}&backgroundColor=111827,14532d,1f2937`;
}

export function faceFor(handle: string, face?: string | null) {
  if (face && FACE_EMOJIS.includes(face as (typeof FACE_EMOJIS)[number])) return face;
  return "";
}

/** Relative time. Prefer short forms; avoid raw calendar dates until > 8 weeks. */
export function timeAgo(ts: number) {
  const n = Number(ts);
  if (!Number.isFinite(n) || n <= 0) return "";
  // Accept seconds or ms
  const ms = n < 1e12 ? n * 1000 : n;
  const s = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  if (s < 45) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 604800) return `${Math.floor(s / 86400)}d`;
  if (s < 4838400) return `${Math.floor(s / 604800)}w`; // up to ~8 weeks
  try {
    return new Date(ms).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  } catch {
    return new Date(ms).toLocaleDateString();
  }
}

export function asAccountKind(v: string | null | undefined): AccountKind {
  return ACCOUNT_KINDS.some((k) => k.id === v) ? (v as AccountKind) : "member";
}

export function isOfficialHandle(handle: string) {
  return /^kilode(\.ng)?$/i.test((handle || "").replace(/^@/, "").trim());
}

export function handleLabel(handle: string) {
  const h = (handle || "").replace(/^@/, "").trim();
  if (isOfficialHandle(h)) return "Kilode.ng";
  return h || "user";
}

export const KIND_PURPOSE: Record<AccountKind, string> = {
  member: "Chat live, post in Feeds, vote Cinema, apply to jobs.",
  artist: "Share the link to Spotify, Audiomack, Apple, or YouTube. Kilode does not play the file. Verified artists get the Kilode Artist mark and a public bio.",
  writer: "Publish news and opinion in Feeds under your handle.",
  advertiser: "Place paid ads. Pay, and the slot goes live for the days you bought.",
  cinema: "Submit movie YouTube URLs. Staff approve. Votes send them to Watching Now.",
  job_poster: "List jobs. Seekers apply. Staff approve before they go live.",
  job_seeker: "Keep a profile and apply to jobs from Jobs.",
  vendor: "Showcase products with a contact link. No in-app checkout.",
  renter: "List spaces with a contact link. No in-app renting.",
  brand: "Company page plus ads. Staff approve ads after payment.",
};

export const COMMUNITIES = [
  { id: "featured", name: "Featured rooms", region: "Featured" },
  { id: "places", name: "Places", region: "Places" },
  { id: "more", name: "More rooms", region: "More rooms" },
] as const;

export const MENU = [
  ["home", "Home"],
  ["forum", "Feeds & topics"],
  ["community", "Communities"],
  ["search", "Search"],
  ["create", "Create"],
  ["dashboard", "Dashboard"],
  ["profile", "Edit profile"],
  ["bookmarks", "My Bookmarks"],
  ["notifications", "Notifications"],
  ["inbox", "Messages"],
  ["teams", "Teams"],
  ["badges", "Badges"],
  ["leaderboard", "Leaderboard"],
  ["trending", "Trending tags"],
  ["tv", "Kilode TV"],
  ["ads", "Ads"],
  ["jobs", "Jobs"],
  ["spaces", "My Spaces"],
  ["market", "Marketplace"],
  ["rent", "Rent"],
  ["contact", "Contact"],
  ["admin", "Admin"],
  ["settings", "Settings"],
  ["help", "Help & FAQ"],
  ["how", "How Kilode works"],
  ["pricing", "Pricing"],
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
  commentsOn?: boolean;
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

export function daysLeft(expiresAt?: number, fallbackDays?: number) {
  if (expiresAt && expiresAt > Date.now()) return Math.max(1, Math.ceil((expiresAt - Date.now()) / 86_400_000));
  if (expiresAt && expiresAt <= Date.now()) return 0;
  return fallbackDays ?? 0;
}

export function timeLeftLabel(expiresAt?: number) {
  if (!expiresAt) return "";
  const ms = expiresAt - Date.now();
  if (ms <= 0) return "Ended";
  const totalMin = Math.max(1, Math.floor(ms / 60_000));
  const days = Math.floor(totalMin / (60 * 24));
  const hours = Math.floor((totalMin % (60 * 24)) / 60);
  const mins = totalMin % 60;
  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h ${mins}m left`;
  return `${mins}m left`;
}
