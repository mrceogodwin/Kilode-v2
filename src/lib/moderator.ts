export type ModAction = "block" | "mask" | "hold";
export type ModSurface = "chat" | "feeds" | "comments" | "ads" | "music";

export type ModSettings = {
  enabled: boolean;
  action: ModAction;
  chat: boolean;
  feeds: boolean;
  comments: boolean;
  ads: boolean;
  music: boolean;
  sexual: boolean;
  insults: boolean;
  scam: boolean;
  links: boolean;
  shout: boolean;
  custom: string;
  allow: string;
};

export const DEFAULT_MOD: ModSettings = {
  enabled: true,
  action: "mask",
  chat: true,
  feeds: true,
  comments: true,
  ads: true,
  music: true,
  sexual: true,
  insults: true,
  scam: true,
  links: false,
  shout: false,
  custom: "",
  allow: "",
};

const SEXUAL = [
  "porn",
  "porno",
  "xxx",
  "onlyfans",
  "nudes",
  "nude",
  "blowjob",
  "handjob",
  "cumshot",
  "pussy",
  "dick",
  "cock",
  "dildo",
  "orgasm",
  "hentai",
  "sex tape",
  "sex video",
  "suck my",
  "send nudes",
];

const INSULTS = [
  "kill yourself",
  "kys",
  "rape",
  "rapist",
  "pedophile",
  "paedophile",
  "child porn",
  "retard",
  "faggot",
  "nigger",
  "nigga",
];

const SCAM = [
  "double your bitcoin",
  "double your usdt",
  "giveaway click",
  "send btc to",
  "send usdt to",
  "investment guaranteed",
  "forex signal",
  "binary options",
];

function esc(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseList(raw: string) {
  return raw
    .split(/[\n,]+/)
    .map((w) => w.trim().toLowerCase())
    .filter((w) => w.length >= 2);
}

function normalize(s: string) {
  return s
    .toLowerCase()
    .replace(/[@4]/g, "a")
    .replace(/0/g, "o")
    .replace(/1/g, "i")
    .replace(/3/g, "e")
    .replace(/\$/g, "s")
    .replace(/(.)\1{2,}/g, "$1$1");
}

export function scanText(text: string, cfg: ModSettings) {
  const hits: string[] = [];
  if (!cfg.enabled) return { hits, masked: text };
  const terms: string[] = [];
  if (cfg.sexual) terms.push(...SEXUAL);
  if (cfg.insults) terms.push(...INSULTS);
  if (cfg.scam) terms.push(...SCAM);
  terms.push(...parseList(cfg.custom));
  const allow = new Set(parseList(cfg.allow));
  const uniq = [...new Set(terms.filter((t) => !allow.has(t)))].sort((a, b) => b.length - a.length);
  let masked = text;
  const norm = normalize(text);
  for (const term of uniq) {
    const nterm = normalize(term);
    if (!nterm) continue;
    const re = new RegExp(`(?:^|[^a-z0-9])${esc(nterm).replace(/ /g, "\\s+")}(?:$|[^a-z0-9])`, "i");
    if (re.test(norm)) {
      hits.push(term);
      masked = masked.replace(new RegExp(esc(term), "ig"), "***");
    }
  }
  if (cfg.links) {
    const n = (text.match(/https?:\/\//gi) ?? []).length;
    if (n >= 2) hits.push("too-many-links");
  }
  if (cfg.shout && text.length > 24) {
    const letters = text.replace(/[^A-Za-z]/g, "");
    const caps = letters.replace(/[^A-Z]/g, "").length;
    if (letters.length > 12 && caps / letters.length > 0.82) hits.push("shouting");
  }
  return { hits, masked };
}

export function surfaceOn(cfg: ModSettings, surface: ModSurface) {
  return cfg[surface];
}
