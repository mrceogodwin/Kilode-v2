import { type AccountKind } from "@/lib/qonvo-data";

/** Public actions a registered account type may perform. Staff bypass on /ops. */
export type KindAction =
  | "feeds.post"
  | "music.submit"
  | "ads.submit"
  | "cinema.submit"
  | "jobs.post"
  | "jobs.apply"
  | "market.list"
  | "rent.list";

const BASE: KindAction[] = ["feeds.post", "jobs.apply"];

const TABLE: Record<AccountKind, KindAction[]> = {
  member: BASE,
  writer: BASE,
  artist: [...BASE, "music.submit"],
  advertiser: [...BASE, "ads.submit"],
  brand: [...BASE, "ads.submit", "market.list"],
  cinema: [...BASE, "cinema.submit"],
  job_poster: ["feeds.post", "jobs.post"],
  job_seeker: BASE,
  vendor: [...BASE, "market.list"],
  renter: [...BASE, "rent.list"],
};

export function canKind(kind: AccountKind, action: KindAction): boolean {
  return TABLE[kind]?.includes(action) ?? false;
}

export function kindActionHint(action: KindAction): string {
  switch (action) {
    case "music.submit":
      return "Only Artist accounts can list music URLs.";
    case "ads.submit":
      return "Only Ads Poster / Advertiser / Brand accounts can place ads.";
    case "cinema.submit":
      return "Only Cinema Advertiser accounts can submit movie YouTube URLs.";
    case "jobs.post":
      return "Only Job Poster accounts can list jobs.";
    case "jobs.apply":
      return "Job Seeker / Member accounts apply to jobs.";
    case "market.list":
      return "Only Marketplace Seller accounts can showcase products.";
    case "rent.list":
      return "Only Rent Lister accounts can list spaces.";
    default:
      return "This account type cannot do that.";
  }
}

/** True if Create menu should show for this account type. */
export function canCreateMenu(kind: AccountKind): boolean {
  return (
    canKind(kind, "feeds.post") ||
    canKind(kind, "music.submit") ||
    canKind(kind, "ads.submit") ||
    canKind(kind, "cinema.submit") ||
    canKind(kind, "jobs.post") ||
    canKind(kind, "jobs.apply") ||
    canKind(kind, "market.list") ||
    canKind(kind, "rent.list")
  );
}
