export const AD_SLOT_DEFS = [
  { id: "howto_video", label: "How Kilode works (YouTube)", kind: "video" as const, hint: "Paste a YouTube URL. Shows in the side menu. Empty = in-app walkthrough." },
  { id: "article_mid", label: "Inside article · mid", kind: "image" as const, hint: "Between the story and comments. Image or Google." },
  { id: "article_leader", label: "Article · long banner", kind: "image" as const, hint: "728×90 style strip under comments." },
  { id: "article_box", label: "Article · box / Google", kind: "google" as const, hint: "300×250. Paste ca-pub + slot, or an image." },
  { id: "article_video", label: "Article · video", kind: "video" as const, hint: "YouTube URL. Plays in a 16:9 box." },
  { id: "article_before_top10", label: "Article · before Top 10", kind: "image" as const, hint: "Company banner Super pastes. Duration in days." },
  { id: "article_after_top10", label: "Article · after Top 10", kind: "image" as const, hint: "Second company placement. Different brand from the one above." },
  { id: "article_top", label: "Feeds · short strip above grids", kind: "image" as const, hint: "Not tall. Image or video Super pastes." },
  { id: "premium_story", label: "Premium 9:16 story (article)", kind: "video" as const, hint: "Portrait on every story. Super sets image/YouTube + days." },
  { id: "ads_square", label: "Ads tab · premium square", kind: "image" as const, hint: "1:1 tile before member ads." },
  { id: "ads_split_a", label: "Ads tab · split left", kind: "google" as const, hint: "Half-width. Google unit or image." },
  { id: "ads_split_b", label: "Ads tab · split right", kind: "image" as const, hint: "Half-width image or video." },
  { id: "ads_footer", label: "Ads tab · footer banner", kind: "image" as const, hint: "Long banner under the grid." },
] as const;

export type AdSlotId = (typeof AD_SLOT_DEFS)[number]["id"];
export type AdSlotKind = "image" | "video" | "google" | "html";

export type AdSlotRow = {
  id: string;
  kind: AdSlotKind;
  enabled: boolean;
  label: string;
  image: string;
  video: string;
  link: string;
  html: string;
  pubId: string;
  adUnit: string;
  days?: number;
  expiresAt?: number;
};

export function isPubId(v: string) {
  return /^ca-pub-\d{8,22}$/.test(v.trim());
}

export function isAdUnit(v: string) {
  return /^\d{6,22}$/.test(v.trim());
}
