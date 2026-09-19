export const AD_SLOT_DEFS = [
  { id: "howto_video", label: "How Kilode works (YouTube)", kind: "video" as const, hint: "Paste a YouTube URL. Shows in the side menu. Empty = in-app walkthrough." },
  { id: "article_mid", label: "Inside article · mid", kind: "image" as const, hint: "Between the story and comments. Image or Google." },
  { id: "article_leader", label: "Article · long banner", kind: "image" as const, hint: "728×90 style strip under comments." },
  { id: "article_box", label: "Article · box / Google", kind: "google" as const, hint: "300×250. Paste ca-pub + slot, or an image." },
  { id: "article_video", label: "Article · video", kind: "video" as const, hint: "YouTube URL. Plays in a 16:9 box." },
  { id: "article_native", label: "Article · native tile", kind: "image" as const, hint: "Image + title + link next to related posts." },
  { id: "ads_leader", label: "Ads tab · leaderboard", kind: "image" as const, hint: "Full-width strip at the top of Ads." },
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
};

export function isPubId(v: string) {
  return /^ca-pub-\d{8,22}$/.test(v.trim());
}

export function isAdUnit(v: string) {
  return /^\d{6,22}$/.test(v.trim());
}
