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
    ["Auto", ["car", "toyota", "motor"]],
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

export type Join = { name: string; ts: number; room?: string };
export type Note = { id: string; text: string; ts: number; href?: string; seen?: number };

export const PREFIX = "qonvo.v6.";

export function loadJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as T;
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

export type ChatMsgLite = {
  n: string;
  t: string;
  ts: number;
  rx?: Record<string, number>;
  parentTs?: number;
  parentN?: string;
  parentT?: string;
};

/** Room ids mirrored here to avoid circular import with qonvo-data. */
const ROOM_IDS = [
  "lounge", "hot", "ng", "music", "cinema", "jobs", "sport", "tech",
  "st-lagos", "st-fct", "st-rivers", "north",
] as const;

export function allRoomMessages(): ChatMsgLite[] {
  const out: ChatMsgLite[] = [];
  for (const id of ROOM_IDS) {
    out.push(...loadJson<ChatMsgLite[]>(`msgs.${id}`, []));
  }
  return out;
}

export const TERMS = `Kilode Terms of Use

By creating an account or using post, music, video, cinema, ads, jobs, marketplace, or rent tools you agree:

1. You pick one account type at register. You cannot switch it yourself. Kilode may adjust it if needed.
2. You are responsible for what you publish. Do not post illegal content, scams, hate, or anyone's private data.
3. Music is link-only (YouTube, Audiomack, SoundCloud, Spotify, Boomplay, Apple). We do not host audio files.
4. Movies are YouTube URLs submitted by Cinema Posters, then approved. We do not host video files.
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
