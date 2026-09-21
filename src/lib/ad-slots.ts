export const AD_SLOT_DEFS = [
  { id: "howto_video", label: "How Kilode works (YouTube)", kind: "video" as const, hint: "Paste a YouTube URL. Shows in the side menu. Empty = in-app walkthrough." },
  { id: "feeds_inline", label: "Feeds · flat strip under categories", kind: "image" as const, hint: "Short banner beside search / new post. No title on the public strip." },
  { id: "article_mid", label: "Inside article · mid", kind: "image" as const, hint: "Between the story and comments. Image or Google." },
  { id: "article_leader", label: "Article · long banner", kind: "image" as const, hint: "728×90 style strip under comments." },
  { id: "article_box", label: "Article · box / Google", kind: "google" as const, hint: "300×250. Paste ca-pub + slot, or an image." },
  { id: "article_video", label: "Article · video", kind: "video" as const, hint: "YouTube URL. Plays in a 16:9 box." },
  { id: "article_before_top10", label: "Article · before Top 10", kind: "image" as const, hint: "Company banner. Duration in days." },
  { id: "article_after_top10", label: "Article · after Top 10", kind: "image" as const, hint: "Second company placement. Different brand from the one above." },
  { id: "article_top", label: "Feeds · short strip above grids", kind: "image" as const, hint: "Not tall. Image or video." },
  { id: "feeds_hero", label: "Feeds · FLAGSHIP hero slide", kind: "image" as const, hint: "16:9 image or YouTube in the Feeds hero. This is the expensive premium unit. Enable to include Super creative in the slider." },
  { id: "feeds_hero_google", label: "Feeds · hero AdSense slide", kind: "google" as const, hint: "Optional Google unit as one slide inside the Feeds hero. Paste ca-pub + unit." },
  { id: "feeds_before_top10", label: "Feeds listing · before Top 10", kind: "image" as const, hint: "Flat banner after the grid, before Top 10." },
  { id: "feeds_google", label: "Feeds listing · Google banner", kind: "google" as const, hint: "ca-pub + unit between Top 10 and the next block." },
  { id: "feeds_after_top10", label: "Feeds listing · after Top 10", kind: "image" as const, hint: "Banner under Top 10, above the tab bar." },
  { id: "premium_story", label: "Premium 9:16 story (article)", kind: "video" as const, hint: "Portrait on every story. Image/YouTube + days." },
  { id: "ads_square", label: "Ads tab · premium square", kind: "image" as const, hint: "1:1 tile before member ads." },
  { id: "ads_leader", label: "Ads tab · top leaderboard", kind: "image" as const, hint: "Wide strip under the premium square." },
  { id: "ads_split_a", label: "Ads tab · split left", kind: "google" as const, hint: "Half-width. Google unit or image." },
  { id: "ads_split_b", label: "Ads tab · split right", kind: "image" as const, hint: "Half-width image or video." },
  { id: "ads_footer", label: "Ads tab · footer banner", kind: "image" as const, hint: "Long banner under the grid." },
  { id: "cinema_banner", label: "Cinema · strip", kind: "image" as const, hint: "Flat banner on the Cinema tab." },
  { id: "feeds_portrait_before", label: "Feeds · portrait before Top 10", kind: "image" as const, hint: "9:16. Company banner Super pastes." },
  { id: "feeds_portrait_after", label: "Feeds · portrait after Top 10", kind: "image" as const, hint: "9:16 after Top 10." },
  { id: "feeds_highlights_ad", label: "Feeds · after More Highlights", kind: "google" as const, hint: "Google or image between highlight rails." },
  { id: "feeds_news_ad", label: "Feeds · after More News", kind: "google" as const, hint: "Google or image between news rails." },
  { id: "feeds_after_miss", label: "Feeds · after Don't Miss", kind: "google" as const, hint: "Google unit under Don't Miss." },
  { id: "feeds_portrait_miss", label: "Feeds · portrait under Don't Miss", kind: "image" as const, hint: "9:16 company portrait before Categories archive." },
  { id: "feeds_after_tags", label: "Feeds · after tags", kind: "google" as const, hint: "Google unit under tag archive." },
  { id: "ads_g1", label: "Ads tab · Google 1", kind: "google" as const, hint: "AdSense unit between verticals." },
  { id: "ads_g2", label: "Ads tab · Google 2", kind: "google" as const, hint: "AdSense unit mid-page." },
  { id: "ads_g3", label: "Ads tab · Google 3", kind: "google" as const, hint: "AdSense unit lower page." },
  { id: "list_job_top", label: "Jobs · top banner", kind: "google" as const, hint: "AdSense or image above Jobs featured." },
  { id: "list_job_mid", label: "Jobs · mid banner", kind: "google" as const, hint: "Between featured and the grid." },
  { id: "list_job_low", label: "Jobs · lower banner", kind: "image" as const, hint: "Before more roles." },
  { id: "list_job_foot", label: "Jobs · footer", kind: "google" as const, hint: "Footer unit on Jobs." },
  { id: "list_market_top", label: "Marketplace · top banner", kind: "google" as const, hint: "AdSense or image above Marketplace." },
  { id: "list_market_mid", label: "Marketplace · mid banner", kind: "google" as const, hint: "Between featured and the grid." },
  { id: "list_market_low", label: "Marketplace · lower banner", kind: "image" as const, hint: "Before more finds." },
  { id: "list_market_foot", label: "Marketplace · footer", kind: "google" as const, hint: "Footer unit on Marketplace." },
  { id: "list_rent_top", label: "Rent · top banner", kind: "google" as const, hint: "AdSense or image above Rent." },
  { id: "list_rent_mid", label: "Rent · mid banner", kind: "google" as const, hint: "Between featured and the grid." },
  { id: "list_rent_low", label: "Rent · lower banner", kind: "image" as const, hint: "Before more spaces." },
  { id: "list_rent_foot", label: "Rent · footer", kind: "google" as const, hint: "Footer unit on Rent." },
  { id: "list_job_portrait", label: "Jobs · portrait", kind: "image" as const, hint: "9:16 company ad on Jobs." },
  { id: "list_market_portrait", label: "Marketplace · portrait", kind: "image" as const, hint: "9:16 company ad on Marketplace." },
  { id: "list_rent_portrait", label: "Rent · portrait", kind: "image" as const, hint: "9:16 company ad on Rent." },
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
