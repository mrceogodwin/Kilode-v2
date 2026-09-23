export type Room = {
  id: string;
  name: string;
  region: string;
  online: number;
};

export const ROOMS: Room[] = [
  { id: "hot", name: "Hot Topics", region: "Featured", online: 8204 },
  { id: "ng", name: "Nigeria", region: "Featured", online: 8204 },
  { id: "politics", name: "Politics", region: "Featured", online: 6102 },
  { id: "sport", name: "Sports", region: "Featured", online: 3102 },
  { id: "music", name: "Music & Vibes", region: "Featured", online: 2401 },
  { id: "tech", name: "Tech", region: "Featured", online: 3901 },
  { id: "biz", name: "Business", region: "Featured", online: 1604 },
  { id: "jobs", name: "Jobs", region: "Featured", online: 2104 },
  { id: "st-fct", name: "FCT Abuja", region: "North Central", online: 4201 },
  { id: "st-benue", name: "Benue", region: "North Central", online: 980 },
  { id: "st-kogi", name: "Kogi", region: "North Central", online: 870 },
  { id: "st-kwara", name: "Kwara", region: "North Central", online: 910 },
  { id: "st-nasarawa", name: "Nasarawa", region: "North Central", online: 640 },
  { id: "st-niger", name: "Niger", region: "North Central", online: 720 },
  { id: "st-plateau", name: "Plateau", region: "North Central", online: 1104 },
  { id: "st-adamawa", name: "Adamawa", region: "North East", online: 701 },
  { id: "st-bauchi", name: "Bauchi", region: "North East", online: 830 },
  { id: "st-borno", name: "Borno", region: "North East", online: 940 },
  { id: "st-gombe", name: "Gombe", region: "North East", online: 560 },
  { id: "st-taraba", name: "Taraba", region: "North East", online: 490 },
  { id: "st-yobe", name: "Yobe", region: "North East", online: 410 },
  { id: "st-jigawa", name: "Jigawa", region: "North West", online: 620 },
  { id: "st-kaduna", name: "Kaduna", region: "North West", online: 2104 },
  { id: "st-kano", name: "Kano", region: "North West", online: 3401 },
  { id: "st-katsina", name: "Katsina", region: "North West", online: 980 },
  { id: "st-kebbi", name: "Kebbi", region: "North West", online: 540 },
  { id: "st-sokoto", name: "Sokoto", region: "North West", online: 710 },
  { id: "st-zamfara", name: "Zamfara", region: "North West", online: 430 },
  { id: "st-abia", name: "Abia", region: "South East", online: 1204 },
  { id: "st-anambra", name: "Anambra", region: "South East", online: 1802 },
  { id: "st-ebonyi", name: "Ebonyi", region: "South East", online: 640 },
  { id: "st-enugu", name: "Enugu", region: "South East", online: 1501 },
  { id: "st-imo", name: "Imo", region: "South East", online: 1402 },
  { id: "st-akwaibom", name: "Akwa Ibom", region: "South South", online: 1301 },
  { id: "st-bayelsa", name: "Bayelsa", region: "South South", online: 720 },
  { id: "st-crossriver", name: "Cross River", region: "South South", online: 810 },
  { id: "st-delta", name: "Delta", region: "South South", online: 1604 },
  { id: "st-edo", name: "Edo", region: "South South", online: 1408 },
  { id: "st-rivers", name: "Rivers", region: "South South", online: 2401 },
  { id: "st-ekiti", name: "Ekiti", region: "South West", online: 890 },
  { id: "st-lagos", name: "Lagos", region: "South West", online: 9204 },
  { id: "st-ogun", name: "Ogun", region: "South West", online: 1802 },
  { id: "st-ondo", name: "Ondo", region: "South West", online: 940 },
  { id: "st-osun", name: "Osun", region: "South West", online: 1010 },
  { id: "st-oyo", name: "Oyo", region: "South West", online: 1704 },
  { id: "game", name: "Gaming Lounge", region: "More rooms", online: 5802 },
  { id: "edu", name: "Education", region: "More rooms", online: 1402 },
  { id: "food", name: "Food", region: "More rooms", online: 980 },
  { id: "lang", name: "Language Exchange", region: "More rooms", online: 3119 },
  { id: "global", name: "Global Chat", region: "More rooms", online: 12481 },
  { id: "gh", name: "Ghana", region: "World", online: 1892 },
  { id: "za", name: "South Africa", region: "World", online: 2103 },
  { id: "ke", name: "Kenya", region: "World", online: 1204 },
  { id: "eg", name: "Egypt", region: "World", online: 2890 },
  { id: "et", name: "Ethiopia", region: "World", online: 891 },
  { id: "ma", name: "Morocco", region: "World", online: 1340 },
  { id: "us", name: "United States", region: "World", online: 9310 },
  { id: "br", name: "Brazil", region: "World", online: 4108 },
  { id: "gb", name: "United Kingdom", region: "World", online: 3210 },
  { id: "in", name: "India", region: "World", online: 11020 },
];

export const ROOM_SECTION_ORDER = [
  "Featured",
  "North Central",
  "North East",
  "North West",
  "South East",
  "South South",
  "South West",
  "More rooms",
  "World",
] as const;

export const REGIONS = ["All", ...ROOM_SECTION_ORDER];

export const ACCOUNT_KINDS = [
  { id: "member", label: "Normal user", hint: "Chat, feeds, vote, apply to jobs" },
  { id: "artist", label: "Artist", hint: "List music URLs. We embed the player." },
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
  face: string;
};

export const FACE_EMOJIS = ["😎", "🙂", "😁", "🤓", "👑", "🎵", "✍️", "💼", "🎬", "🏡", "🛍️", "🇳🇬", "🔥", "💭", "🦁", "🌟"] as const;

export const AVATAR_SEEDS = ["Ada", "Tunde", "Amaka", "Chidi", "Zara", "Femi", "Ngozi", "Kemi", "Ife", "Sade", "Yemi", "Baba"] as const;

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
  if (face && /^https?:\/\//.test(face)) return face;
  const seed = face && face.startsWith("av:") ? face.slice(3) : handle || "Kilode";
  return `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(seed)}&backgroundColor=111827,14532d,1f2937`;
}

export function faceFor(handle: string, face?: string | null) {
  if (face && FACE_EMOJIS.includes(face as (typeof FACE_EMOJIS)[number])) return face;
  return "";
}

export function timeAgo(ts: number) {
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 45) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 604800) return `${Math.floor(s / 86400)}d`;
  return new Date(ts).toLocaleDateString();
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
  artist: "List music as a URL. We embed the platform player — Kilode never hosts audio files.",
  writer: "Publish news and opinion in Feeds under your handle.",
  advertiser: "Place paid ads. Copy the wallet, pay crypto, staff approve.",
  cinema: "Submit movie YouTube URLs. Staff approve. Votes send them to Watching Now.",
  job_poster: "List jobs. Seekers apply. Staff approve before they go live.",
  job_seeker: "Keep a profile and apply to jobs from Jobs.",
  vendor: "Showcase products with a contact link. No in-app checkout.",
  renter: "List spaces with a contact link. No in-app renting.",
  brand: "Company page plus ads. Staff approve ads after payment.",
};


export const COMMUNITIES = [
  { id: "featured", name: "Featured rooms", region: "Featured" },
  { id: "sw", name: "South West", region: "South West" },
  { id: "ss", name: "South South", region: "South South" },
  { id: "se", name: "South East", region: "South East" },
  { id: "nc", name: "North Central", region: "North Central" },
  { id: "nw", name: "North West", region: "North West" },
  { id: "ne", name: "North East", region: "North East" },
  { id: "more", name: "More rooms", region: "More rooms" },
] as const;

export const MENU = [
  ["home", "Home"],
  ["forum", "Feeds & topics"],
  ["community", "Communities"],
  ["search", "Search"],
  ["create", "Create post"],
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
  ["market", "Marketplace"],
  ["rent", "Rent"],
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
  commentsOn?: boolean;
};

export const POST_CATS = ["General", "News", "Naija", "Tech", "Sports", "Business", "Culture", "Opinion", "Music", "Comedy", "Politics", "Lifestyle", "Education", "Health", "Travel", "Fashion", "Food", "Jobs"];

export const AD_VERTICALS = [
  "All",
  "Telecom",
  "Banking",
  "Fintech",
  "Fashion",
  "Food",
  "Music",
  "Nollywood",
  "Sports",
  "Jobs",
  "Education",
  "Health",
  "Auto",
  "Real estate",
  "Travel",
  "Beauty",
  "Religion",
  "Politics",
  "NGO",
  "Tech",
  "Retail",
  "Logistics",
  "Agriculture",
  "Energy",
  "Insurance",
  "Betting",
  "Events",
  "Nightlife",
  "Comedy",
  "Podcast",
  "Church",
  "Mosque",
  "School",
  "Hospital",
  "Pharmacy",
  "Hotels",
  "Airlines",
  "Fuel",
  "Cement",
  "Brewery",
  "Soft drinks",
  "Phones",
  "Gadgets",
  "Furniture",
  "Construction",
  "Legal",
  "Media",
  "Government",
  "Startup",
  "Other",
] as const;

export function adVertical(name: string, note?: string) {
  const t = `${name} ${note ?? ""}`.toLowerCase();
  const hits: [string, string[]][] = [
    ["Telecom", ["mtn", "glo", "airtel", "9mobile", "data"]],
    ["Fintech", ["paystack", "opay", "palmpay", "flutterwave", "kuda", "cowry"]],
    ["Banking", ["bank", "gtb", "gtbank", "access", "uba", "zenith"]],
    ["Fashion", ["ankara", "adire", "fashion"]],
    ["Food", ["food", "chicken", "jollof", "indomie"]],
    ["Music", ["spotify", "audiomack", "boomplay", "afrobeats"]],
    ["Nollywood", ["nollywood", "film", "movie", "trailer"]],
    ["Sports", ["sport", "bet", "football", "bet9ja"]],
    ["Retail", ["jumia", "konga", "shop", "shoprite"]],
    ["Jobs", ["job", "hiring", "vacancy"]],
    ["Real estate", ["rent", "house", "apartment", "land"]],
    ["Travel", ["flight", "airline", "hotel", "ibom"]],
    ["Health", ["hospital", "pharma", "clinic", "reddington"]],
    ["Auto", ["car", "toyota", "motor", "infinix wait"]],
    ["Education", ["school", "university", "course", "unilag"]],
    ["Energy", ["fuel", "diesel", "solar", "total"]],
    ["Brewery", ["beer", "star", "guinness", "hero"]],
    ["Soft drinks", ["coke", "coca-cola", "fanta", "pepsi", "malt"]],
    ["Phones", ["tecno", "infinix", "samsung", "iphone"]],
    ["Gadgets", ["gadget", "spark", "laptop"]],
    ["Cement", ["cement", "dangote", "ibeto"]],
    ["Insurance", ["insurance", "wapic"]],
    ["Logistics", ["logistics", "transit", "bolt", "uber"]],
    ["Agriculture", ["farm", "crowdy", "agro"]],
    ["Hotels", ["hotel", "short-let"]],
    ["Airlines", ["air", "aero", "ibom air"]],
    ["Fuel", ["fuel", "petrol", "totalenergies"]],
    ["Furniture", ["furniture", "sofa"]],
    ["Nightlife", ["club", "quilox", "night"]],
    ["Events", ["event", "wedding"]],
    ["Media", ["dstv", "tv", "radio"]],
    ["Church", ["church", "rccg", "pastor"]],
    ["Hospital", ["hospital", "reddington"]],
    ["School", ["school", "unilag"]],
    ["Betting", ["bet9ja", "bet", "sporty"]],
  ];
  for (const [v, keys] of hits) {
    if (keys.some((k) => t.includes(k))) return v;
  }
  return "Other";
}

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
  { id: "board", label: "Ads grid tile", usd: 40, hint: "3-column tile on the Ads tab. Title, thumb, link." },
  { id: "featured", label: "Ads featured slider", usd: 150, hint: "Rotates at the top of Ads so the campaign is never buried." },
  { id: "square", label: "Ads square", usd: 90, hint: "Square tile near the top of the Ads tab." },
  { id: "chat", label: "Chat stream", usd: 250, hint: "Scrolls with live chat every few messages." },
  { id: "chat-pin", label: "Pinned in chat", usd: 800, hint: "Stays at the top of Chat until it expires." },
  { id: "feeds-strip", label: "Feeds strip", usd: 180, hint: "Flat banner under the category row on Feeds." },
  { id: "story", label: "Story portrait", usd: 400, hint: "Tall 9:16 creative on every story page." },
  { id: "article-leader", label: "Article long banner", usd: 220, hint: "Wide banner under the story." },
  { id: "article-mid", label: "Inside article", usd: 150, hint: "Sits between the story and comments." },
  { id: "cinema", label: "Cinema banner", usd: 300, hint: "Shows on the Cinema tab while a title plays." },
  { id: "feeds-hero", label: "Feeds hero slider", usd: 1200, hint: "Expensive. 16:9 image or video that rotates in the Feeds hero with posts, Google, and company banners." },
] as const;

export type AdPlacement = (typeof AD_PLACEMENTS)[number]["id"];

export function isAdPlacement(v: string): v is AdPlacement {
  return AD_PLACEMENTS.some((p) => p.id === v);
}

export const AD_DAYS = [1, 7, 14, 30] as const;
export type AdDays = (typeof AD_DAYS)[number];

export function daysLeft(expiresAt?: number, fallbackDays?: number) {
  if (expiresAt && expiresAt > Date.now()) return Math.max(1, Math.ceil((expiresAt - Date.now()) / 86_400_000));
  if (expiresAt && expiresAt <= Date.now()) return 0;
  return fallbackDays ?? 0;
}

export function adDayBucket(days?: number) {
  const d = Number(days ?? 7);
  if (d <= 1) return 1;
  if (d <= 7) return 7;
  if (d <= 14) return 14;
  return 30;
}

export const AD_SIZES: Record<AdPlacement, { label: string; hint: string }> = {
  board: { label: "1080 × 720", hint: "Landscape tile. JPG/PNG, max 2MB." },
  featured: { label: "1200 × 628", hint: "Wide featured slide. JPG/PNG, max 2MB." },
  square: { label: "1080 × 1080", hint: "Square. JPG/PNG, max 2MB." },
  chat: { label: "1200 × 400", hint: "Wide banner in chat. JPG/PNG, max 2MB." },
  "chat-pin": { label: "1200 × 240", hint: "Slim pin strip. JPG/PNG, max 2MB." },
  "feeds-strip": { label: "1200 × 120", hint: "Flat strip. Keep it short. JPG/PNG, max 2MB." },
  story: { label: "1080 × 1920", hint: "9:16 portrait. JPG/PNG or YouTube, max 2MB image." },
  "article-leader": { label: "728 × 90", hint: "Long banner. JPG/PNG, max 2MB." },
  "article-mid": { label: "600 × 300", hint: "In-story box. JPG/PNG, max 2MB." },
  cinema: { label: "1280 × 220", hint: "Cinema strip. JPG/PNG, max 2MB." },
  "feeds-hero": { label: "1280 × 720", hint: "16:9. Image or YouTube. Super prices this high." },
};

export type Campaign = {
  id: string;
  name: string;
  note: string;
  ts: number;
  status: "pending" | "paid" | "approved" | "rejected";
  placement: AdPlacement | "sidebar" | "hero";
  txHash?: string;
  amount?: string;
  coin?: string;
  link?: string;
  image?: string;
  video?: string;
  kind?: AdKind;
  views?: number;
  days?: number;
  expiresAt?: number;
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
  if (id.startsWith("tm-")) return "Team chat";
  if (id.startsWith("cin-")) return "Cinema";
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
Kilode is built with @Builtbystacks. Telegram: https://t.me/Builtbystacks`;

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
