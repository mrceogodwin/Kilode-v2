/**
 * Kilode News Engine — honest ingest pipeline.
 *
 * Sources: Google News RSS (official RSS endpoints) + optional publisher RSS.
 * We do NOT scrape Google Search HTML / SERP pages (ToS, brittle, inaccurate).
 *
 * Pipeline: fetch RSS → parse → filter/dedupe → AI or deterministic humanize
 * → cover image → draft → staff approve → nf_posts (Feeds).
 */
import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { env } from "@/lib/env.server";
import { slugify } from "@/lib/qonvo-data";

export type NewsSource = {
  id: string;
  name: string;
  url: string;
  kind: "google-news" | "publisher";
  enabled: boolean;
};

export type NewsDraft = {
  id: string;
  source_id: string;
  source_name: string;
  source_url: string;
  original_title: string;
  original_link: string;
  original_snippet: string;
  pub_date: number | null;
  title: string;
  body: string;
  meta_description: string;
  tags: string;
  category: string;
  image: string;
  status: "draft" | "approved" | "rejected";
  created_at: number;
  updated_at: number;
  approved_post_id: string | null;
};

export type NewsFilters = {
  include?: string;
  exclude?: string;
  maxAgeHours?: number;
  sourceIds?: string[];
};

type RssItem = {
  title: string;
  link: string;
  snippet: string;
  pubDate: number | null;
  image: string | null;
  sourceLabel: string;
};

function gn(id: string, name: string, q: string): NewsSource {
  return {
    id,
    name,
    url: `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-NG&gl=NG&ceid=NG:en`,
    kind: "google-news",
    enabled: true,
  };
}

function topic(id: string, name: string, t: string): NewsSource {
  return {
    id,
    name,
    url: `https://news.google.com/rss/headlines/section/topic/${t}?hl=en-NG&gl=NG&ceid=NG:en`,
    kind: "google-news",
    enabled: true,
  };
}

function rss(id: string, name: string, url: string): NewsSource {
  return { id, name, url, kind: "publisher", enabled: true };
}

const DEFAULT_SOURCES: NewsSource[] = [
  rss("gn-home", "Google News · Nigeria home", "https://news.google.com/rss?hl=en-NG&gl=NG&ceid=NG:en"),
  topic("gn-nation", "Google News · Nation", "NATION"),
  topic("gn-world", "Google News · World", "WORLD"),
  topic("gn-biz", "Google News · Business", "BUSINESS"),
  topic("gn-tech", "Google News · Technology", "TECHNOLOGY"),
  topic("gn-ent", "Google News · Entertainment", "ENTERTAINMENT"),
  topic("gn-sport", "Google News · Sports", "SPORTS"),
  topic("gn-sci", "Google News · Science", "SCIENCE"),
  topic("gn-health", "Google News · Health", "HEALTH"),
  gn("gn-nigeria", "Google News · Nigeria", "Nigeria"),
  gn("gn-lagos", "Google News · Lagos", "Lagos Nigeria"),
  gn("gn-abuja", "Google News · Abuja", "Abuja Nigeria"),
  gn("gn-ghana", "Google News · Ghana", "Ghana"),
  gn("gn-kenya", "Google News · Kenya", "Kenya"),
  gn("gn-sa", "Google News · South Africa", "South Africa"),
  gn("gn-africa", "Google News · Africa", "Africa"),
  gn("gn-afrobeats", "Google News · Afrobeats", "Afrobeats"),
  gn("gn-fintech", "Google News · Fintech NG", "Fintech Nigeria"),
  gn("gn-epl", "Google News · Premier League", "Premier League"),
  rss("punch", "Punch", "https://punchng.com/feed/"),
  rss("premiumtimes", "Premium Times", "https://www.premiumtimesng.com/feed"),
  rss("vanguard", "Vanguard", "https://www.vanguardngr.com/feed/"),
  rss("guardian-ng", "Guardian Nigeria", "https://guardian.ng/feed/"),
  rss("cable", "The Cable", "https://www.thecable.ng/feed/"),
  rss("channels", "Channels TV", "https://www.channelstv.com/feed/"),
  rss("dailypost", "Daily Post", "https://dailypost.ng/feed/"),
  rss("nairametrics", "Nairametrics", "https://nairametrics.com/feed/"),
  rss("techcabal", "TechCabal", "https://techcabal.com/feed/"),
  rss("techpoint", "Techpoint", "https://techpoint.africa/feed/"),
  rss("completesports", "Complete Sports", "https://www.completesports.com/feed/"),
  rss("bellanaija", "BellaNaija", "https://www.bellanaija.com/feed/"),
  rss("bbc-africa", "BBC Africa", "https://feeds.bbci.co.uk/news/world/africa/rss.xml"),
  rss("bbc-world", "BBC World", "https://feeds.bbci.co.uk/news/world/rss.xml"),
  rss("bbc-biz", "BBC Business", "https://feeds.bbci.co.uk/news/business/rss.xml"),
  rss("bbc-tech", "BBC Technology", "https://feeds.bbci.co.uk/news/technology/rss.xml"),
  rss("bbc-sport", "BBC Sport", "https://feeds.bbci.co.uk/sport/rss.xml"),
  rss("aljazeera", "Al Jazeera", "https://www.aljazeera.com/xml/rss/all.xml"),
  rss("guardian-uk", "Guardian World", "https://www.theguardian.com/world/rss"),
  rss("nyt-world", "NYT World", "https://rss.nytimes.com/services/xml/rss/nyt/World.xml"),
  rss("nyt-africa", "NYT Africa", "https://rss.nytimes.com/services/xml/rss/nyt/Africa.xml"),
  rss("npr-world", "NPR World", "https://feeds.npr.org/1004/rss.xml"),
  rss("techcrunch", "TechCrunch", "https://techcrunch.com/feed/"),
  rss("verge", "The Verge", "https://www.theverge.com/rss/index.xml"),
  rss("espn", "ESPN", "https://www.espn.com/espn/rss/news"),
];

const gMem = globalThis as typeof globalThis & {
  __nfNewsDrafts?: NewsDraft[];
  __nfNewsSources?: NewsSource[];
};

function memDrafts(): NewsDraft[] {
  gMem.__nfNewsDrafts ??= [];
  return gMem.__nfNewsDrafts;
}

function memSources(): NewsSource[] {
  gMem.__nfNewsSources ??= DEFAULT_SOURCES.map((s) => ({ ...s }));
  return gMem.__nfNewsSources;
}

function nid() {
  return `nd-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function decodeXml(s: string) {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tag(xml: string, name: string): string {
  const re = new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i");
  const m = xml.match(re);
  return m ? decodeXml(m[1]) : "";
}

function attr(xml: string, el: string, a: string): string {
  const re = new RegExp(`<${el}[^>]*\\s${a}=["']([^"']+)["'][^>]*/?>`, "i");
  const m = xml.match(re);
  return m?.[1] ?? "";
}

function parseRss(xml: string, sourceLabel: string): RssItem[] {
  const chunks = xml.split(/<item[\s>]/i).slice(1);
  const out: RssItem[] = [];
  for (const chunk of chunks) {
    const block = chunk.split(/<\/item>/i)[0] ?? "";
    const title = tag(block, "title");
    let link = tag(block, "link") || attr(block, "link", "href");
    if (!link) {
      const guid = tag(block, "guid");
      if (guid.startsWith("http")) link = guid;
    }
    if (!title || !link) continue;
    const snippet =
      tag(block, "description") ||
      tag(block, "content:encoded") ||
      tag(block, "summary") ||
      "";
    const pubRaw = tag(block, "pubDate") || tag(block, "published") || tag(block, "dc:date");
    let pubDate: number | null = null;
    if (pubRaw) {
      const t = Date.parse(pubRaw);
      if (Number.isFinite(t)) pubDate = t;
    }
    const image =
      attr(block, "media:content", "url") ||
      attr(block, "media:thumbnail", "url") ||
      attr(block, "enclosure", "url") ||
      (block.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1] ?? "") ||
      null;
    const srcName = tag(block, "source") || sourceLabel;
    const imgOk = image && /^https?:\/\//i.test(image) && !/picsum|placeholder|1x1|spacer|pixel\.gif|doubleclick/i.test(image);
    out.push({
      title,
      link: link.trim(),
      snippet: snippet.slice(0, 600),
      pubDate,
      image: imgOk ? image : null,
      sourceLabel: srcName || sourceLabel,
    });
  }
  return out;
}

function mapCategory(title: string, snippet: string, sourceId: string): string {
  const t = `${title} ${snippet} ${sourceId}`.toLowerCase();
  if (/fintech|bank|naira|economy|market|startup|business|commerce|trade/.test(t)) return "Business";
  if (/tech|ai |app |software|gadget|phone|internet|data /.test(t)) return "Tech";
  if (/afrobeats|music|song|album|artist|concert|nollywood|film|movie|fashion|wedding/.test(t)) return "Culture";
  if (/football|eagles|afcon|npfl|super eagles|sports|match/.test(t)) return "Sports";
  if (/lagos|abuja|naija|nigeria|ghana|kenya|africa/.test(t)) return "Naija";
  return "News";
}

function coverFor(_title: string, _link: string, enclosure: string | null): string {
  if (enclosure && /^https?:\/\//i.test(enclosure) && !/picsum|placeholder|1x1|spacer/i.test(enclosure)) return enclosure;
  return "";
}

async function ogImage(url: string): Promise<string | null> {
  try {
    const r = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(3500),
      headers: {
        "User-Agent": "KilodeNewsEngine/1.0 (+https://kilode.ng)",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    if (!r.ok) return null;
    const html = (await r.text()).slice(0, 80_000);
    const m =
      html.match(/<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::secure_url)?["']/i) ||
      html.match(/<meta[^>]+name=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["']/i);
    const u = (m?.[1] || "").replace(/&/g, "&").trim();
    if (!u || !/^https?:\/\//i.test(u) || /picsum|placeholder|1x1/i.test(u)) return null;
    return u;
  } catch {
    return null;
  }
}

/** Deterministic Kilode-voice rewrite when no LLM key is set. */
function humanizeDeterministic(item: RssItem, sourceName: string): {
  title: string;
  body: string;
  meta: string;
  tags: string;
  category: string;
} {
  const rawTitle = item.title.replace(/\s+-\s+[^-]+$/, "").trim();
  const title = rawTitle.length > 90 ? `${rawTitle.slice(0, 87).trim()}…` : rawTitle;
  const snip = item.snippet || "Details are still coming in from the wire.";
  const category = mapCategory(title, snip, sourceName);
  const lead =
    category === "Business"
      ? "Here's the money angle, without the buzzwords."
      : category === "Tech"
        ? "Straight talk for people who build and ship in Naija."
        : category === "Culture"
          ? "Culture desk — clear, not spammy."
          : "Kilode desk note — what matters for readers here.";
  const body = [
    lead,
    "",
    snip,
    "",
    `Source thread: ${sourceName}. We pulled this from an official RSS feed (not a Google SERP scrape), then rewrote it in Kilode voice for Feeds.`,
    "",
    `Read the original for full context: ${item.link}`,
    "",
    "Drop your take below — keep it respectful.",
  ].join("\n");
  const tags = [category.toLowerCase(), "rss", "naija", slugify(sourceName).slice(0, 20)]
    .filter(Boolean)
    .join(", ");
  const meta = (snip || title).slice(0, 155);
  return { title, body, meta, tags, category };
}

async function humanizeWithLlm(item: RssItem, sourceName: string): Promise<ReturnType<typeof humanizeDeterministic> | null> {
  const apiKey = env("OPENAI_API_KEY") || env("NEWS_AI_KEY");
  const base = (env("NEWS_AI_URL") || "https://api.openai.com/v1").replace(/\/$/, "");
  if (!apiKey) return null;
  try {
    const res = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: env("NEWS_AI_MODEL") || "gpt-4o-mini",
        temperature: 0.55,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You rewrite RSS news into Kilode voice: Naija-aware, clear, human, not spammy. Return JSON keys: title, body, meta_description, tags (comma string), category (one of News, Naija, Business, Tech, Culture, Sports, Opinion). Never invent quotes from real people. Keep facts grounded in the snippet. Mention that staff should verify before publish.",
          },
          {
            role: "user",
            content: JSON.stringify({
              source: sourceName,
              title: item.title,
              snippet: item.snippet,
              link: item.link,
            }),
          },
        ],
      }),
      signal: AbortSignal.timeout(25_000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const raw = json.choices?.[0]?.message?.content;
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      title?: string;
      body?: string;
      meta_description?: string;
      tags?: string;
      category?: string;
    };
    if (!parsed.title || !parsed.body) return null;
    return {
      title: String(parsed.title).slice(0, 160),
      body: String(parsed.body).slice(0, 8000),
      meta: String(parsed.meta_description || parsed.title).slice(0, 160),
      tags: String(parsed.tags || "news, naija").slice(0, 200),
      category: String(parsed.category || mapCategory(parsed.title, parsed.body, sourceName)).slice(0, 40),
    };
  } catch {
    return null;
  }
}

async function staffOf(userId: string) {
  const sql = await getSql();
  try {
    const rows = await sql<{ user_id: string; role: string }>`select user_id, role from nf_staff where user_id = ${userId} limit 1`;
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

async function requireSuper(userId: string) {
  const me = await staffOf(userId);
  if (me?.role !== "super") throw new Error("Forbidden");
  return me;
}

async function ensureDraftsTable() {
  const sql = await getSql();
  await sql`
    create table if not exists nf_news_drafts (
      id text primary key,
      source_id text not null,
      source_name text not null,
      source_url text not null,
      original_title text not null,
      original_link text not null,
      original_snippet text,
      pub_date bigint,
      title text not null,
      body text not null,
      meta_description text,
      tags text,
      category text,
      image text,
      status text not null default 'draft',
      created_at bigint not null,
      updated_at bigint not null,
      approved_post_id text
    )
  `;
  await sql`create unique index if not exists nf_news_drafts_link_uidx on nf_news_drafts (original_link)`;
}

function passesFilters(item: RssItem, filters: NewsFilters): boolean {
  const blob = `${item.title} ${item.snippet}`.toLowerCase();
  const include = (filters.include || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const exclude = (filters.exclude || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (include.length && !include.some((k) => blob.includes(k))) return false;
  if (exclude.some((k) => blob.includes(k))) return false;
  const maxAge = filters.maxAgeHours ?? 72;
  if (item.pubDate && maxAge > 0) {
    const ageH = (Date.now() - item.pubDate) / 3_600_000;
    if (ageH > maxAge) return false;
  }
  return true;
}

function normTitle(t: string) {
  return t
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .slice(0, 120);
}

async function saveDraftRow(d: NewsDraft): Promise<"db" | "memory"> {
  try {
    await ensureDraftsTable();
    const sql = await getSql();
    await sql`
      insert into nf_news_drafts (
        id, source_id, source_name, source_url, original_title, original_link, original_snippet,
        pub_date, title, body, meta_description, tags, category, image, status, created_at, updated_at, approved_post_id
      ) values (
        ${d.id}, ${d.source_id}, ${d.source_name}, ${d.source_url}, ${d.original_title}, ${d.original_link}, ${d.original_snippet},
        ${d.pub_date}, ${d.title}, ${d.body}, ${d.meta_description}, ${d.tags}, ${d.category}, ${d.image}, ${d.status},
        ${d.created_at}, ${d.updated_at}, ${d.approved_post_id}
      )
      on conflict (original_link) do nothing
    `;
    const list = memDrafts();
    if (!list.some((x) => x.original_link === d.original_link || x.id === d.id)) list.unshift(d);
    return "db";
  } catch {
    const list = memDrafts();
    if (!list.some((x) => x.original_link === d.original_link || x.id === d.id)) list.unshift(d);
    return "memory";
  }
}

export const newsEngineInfo = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await requireSuper(context.userId);
    return {
      label: "Sources: Google News RSS + publishers (not Google SERP scrape)",
      llm: Boolean(env("OPENAI_API_KEY") || env("NEWS_AI_KEY") || env("NEWS_AI_URL")),
      sources: memSources(),
    };
  });

export const listNewsSources = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await requireSuper(context.userId);
    return memSources();
  });

export const setNewsSourceEnabled = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { id: string; enabled: boolean }) => d)
  .handler(async ({ context, data }) => {
    await requireSuper(context.userId);
    const src = memSources().find((s) => s.id === data.id);
    if (src) src.enabled = data.enabled;
    return { ok: true as const, sources: memSources() };
  });

export const fetchNewsLatest = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: NewsFilters) => d)
  .handler(async ({ context, data: filters }) => {
    await requireSuper(context.userId);
    const wanted = new Set(
      filters.sourceIds?.length ? filters.sourceIds : memSources().filter((s) => s.enabled).map((s) => s.id),
    );
    const sources = memSources().filter((s) => wanted.has(s.id) && s.enabled);
    const seenLinks = new Set<string>();
    const seenTitles = new Set<string>();
    for (const d of memDrafts()) {
      seenLinks.add(d.original_link);
      seenTitles.add(normTitle(d.original_title));
    }
    try {
      await ensureDraftsTable();
      const sql = await getSql();
      const rows = await sql<{ original_link: string; original_title: string }>`
        select original_link, original_title from nf_news_drafts order by created_at desc limit 400
      `;
      for (const r of rows) {
        seenLinks.add(r.original_link);
        seenTitles.add(normTitle(r.original_title));
      }
    } catch {
      /* memory only */
    }

    let fetched = 0;
    let created = 0;
    const errors: string[] = [];
    const stores: Array<"db" | "memory"> = [];

    for (const src of sources) {
      try {
        const res = await fetch(src.url, {
          headers: {
            "User-Agent": "KilodeNewsEngine/1.0 (+https://kilode.ng; RSS reader)",
            Accept: "application/rss+xml, application/xml, text/xml, */*",
          },
          signal: AbortSignal.timeout(18_000),
        });
        if (!res.ok) {
          errors.push(`${src.name}: HTTP ${res.status}`);
          continue;
        }
        const xml = await res.text();
        const items = parseRss(xml, src.name).slice(0, 80);
        fetched += items.length;
        for (const item of items) {
          if (!passesFilters(item, filters)) continue;
          if (seenLinks.has(item.link)) continue;
          const nt = normTitle(item.title);
          if (seenTitles.has(nt)) continue;
          seenLinks.add(item.link);
          seenTitles.add(nt);
          const llm = await humanizeWithLlm(item, src.name);
          const rewritten = llm ?? humanizeDeterministic(item, src.name);
          const now = Date.now();
          const draft: NewsDraft = {
            id: nid(),
            source_id: src.id,
            source_name: src.name,
            source_url: src.url,
            original_title: item.title,
            original_link: item.link,
            original_snippet: item.snippet,
            pub_date: item.pubDate,
            title: rewritten.title,
            body: rewritten.body,
            meta_description: rewritten.meta,
            tags: rewritten.tags,
            category: rewritten.category,
            image: coverFor(rewritten.title, item.link, item.image),
            status: "draft",
            created_at: now,
            updated_at: now,
            approved_post_id: null,
          };
          stores.push(await saveDraftRow(draft));
          created += 1;
        }
      } catch (e) {
        errors.push(`${src.name}: ${e instanceof Error ? e.message : "fetch failed"}`);
      }
    }

    return {
      ok: true as const,
      fetched,
      created,
      errors,
      store: stores.includes("db") ? ("db" as const) : ("memory" as const),
      note: "Sources: Google News RSS + publishers (not Google SERP scrape)",
      llmUsed: Boolean(env("OPENAI_API_KEY") || env("NEWS_AI_KEY")),
    };
  });

export const listNewsDrafts = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await requireSuper(context.userId);
    try {
      await ensureDraftsTable();
      const sql = await getSql();
      const rows = await sql<{
        id: string;
        source_id: string;
        source_name: string;
        source_url: string;
        original_title: string;
        original_link: string;
        original_snippet: string | null;
        pub_date: number | string | null;
        title: string;
        body: string;
        meta_description: string | null;
        tags: string | null;
        category: string | null;
        image: string | null;
        status: string;
        created_at: number | string;
        updated_at: number | string;
        approved_post_id: string | null;
      }>`
        select id, source_id, source_name, source_url, original_title, original_link, original_snippet,
          pub_date, title, body, meta_description, tags, category, image, status, created_at, updated_at, approved_post_id
        from nf_news_drafts
        where status = 'draft'
        order by updated_at desc
        limit 80
      `;
      if (rows.length) {
        return rows.map(
          (r): NewsDraft => ({
            id: r.id,
            source_id: r.source_id,
            source_name: r.source_name,
            source_url: r.source_url,
            original_title: r.original_title,
            original_link: r.original_link,
            original_snippet: r.original_snippet ?? "",
            pub_date: r.pub_date == null ? null : Number(r.pub_date),
            title: r.title,
            body: r.body,
            meta_description: r.meta_description ?? "",
            tags: r.tags ?? "",
            category: r.category ?? "News",
            image: r.image ?? "",
            status: r.status as NewsDraft["status"],
            created_at: Number(r.created_at),
            updated_at: Number(r.updated_at),
            approved_post_id: r.approved_post_id,
          }),
        );
      }
    } catch {
      /* fall through */
    }
    return memDrafts().filter((d) => d.status === "draft").slice(0, 80);
  });

export const updateNewsDraft = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    (d: {
      id: string;
      title?: string;
      body?: string;
      meta_description?: string;
      tags?: string;
      category?: string;
      image?: string;
    }) => d,
  )
  .handler(async ({ context, data }) => {
    await requireSuper(context.userId);
    const now = Date.now();
    const patch = {
      title: data.title?.trim(),
      body: data.body?.trim(),
      meta_description: data.meta_description?.trim(),
      tags: data.tags?.trim(),
      category: data.category?.trim(),
      image: data.image?.trim(),
    };
    try {
      await ensureDraftsTable();
      const sql = await getSql();
      const cur = await sql<NewsDraft>`select * from nf_news_drafts where id = ${data.id} limit 1`;
      const row = cur[0];
      if (!row) {
        const list = memDrafts();
        const i = list.findIndex((d) => d.id === data.id);
        if (i < 0) return { ok: false as const, reason: "Not found" };
        const d = list[i]!;
        list[i] = {
          ...d,
          title: patch.title || d.title,
          body: patch.body || d.body,
          meta_description: patch.meta_description ?? d.meta_description,
          tags: patch.tags ?? d.tags,
          category: patch.category ?? d.category,
          image: patch.image ?? d.image,
          updated_at: now,
        };
        return { ok: true as const };
      }
      const next = {
        title: patch.title || row.title,
        body: patch.body || row.body,
        meta_description: patch.meta_description ?? row.meta_description,
        tags: patch.tags ?? row.tags,
        category: patch.category ?? row.category,
        image: patch.image ?? row.image,
      };
      await sql`
        update nf_news_drafts set
          title = ${next.title},
          body = ${next.body},
          meta_description = ${next.meta_description},
          tags = ${next.tags},
          category = ${next.category},
          image = ${next.image},
          updated_at = ${now}
        where id = ${data.id}
      `;
      return { ok: true as const };
    } catch {
      const list = memDrafts();
      const i = list.findIndex((d) => d.id === data.id);
      if (i < 0) return { ok: false as const, reason: "Not found" };
      const d = list[i]!;
      list[i] = {
        ...d,
        title: patch.title || d.title,
        body: patch.body || d.body,
        meta_description: patch.meta_description ?? d.meta_description,
        tags: patch.tags ?? d.tags,
        category: patch.category ?? d.category,
        image: patch.image ?? d.image,
        updated_at: now,
      };
      return { ok: true as const };
    }
  });

export const rejectNewsDraft = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: string) => id)
  .handler(async ({ context, data: id }) => {
    await requireSuper(context.userId);
    const now = Date.now();
    try {
      await ensureDraftsTable();
      const sql = await getSql();
      await sql`update nf_news_drafts set status = ${"rejected"}, updated_at = ${now} where id = ${id}`;
    } catch {
      /* memory */
    }
    const d = memDrafts().find((x) => x.id === id);
    if (d) {
      d.status = "rejected";
      d.updated_at = now;
    }
    return { ok: true as const };
  });

export const approveNewsDraft = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: string) => id)
  .handler(async ({ context, data: id }) => {
    await requireSuper(context.userId);
    let draft: NewsDraft | null = null;
    try {
      await ensureDraftsTable();
      const sql = await getSql();
      const rows = await sql<{
        id: string;
        source_id: string;
        source_name: string;
        source_url: string;
        original_title: string;
        original_link: string;
        original_snippet: string | null;
        pub_date: number | string | null;
        title: string;
        body: string;
        meta_description: string | null;
        tags: string | null;
        category: string | null;
        image: string | null;
        status: string;
        created_at: number | string;
        updated_at: number | string;
        approved_post_id: string | null;
      }>`select * from nf_news_drafts where id = ${id} limit 1`;
      const r = rows[0];
      if (r) {
        draft = {
          id: r.id,
          source_id: r.source_id,
          source_name: r.source_name,
          source_url: r.source_url,
          original_title: r.original_title,
          original_link: r.original_link,
          original_snippet: r.original_snippet ?? "",
          pub_date: r.pub_date == null ? null : Number(r.pub_date),
          title: r.title,
          body: r.body,
          meta_description: r.meta_description ?? "",
          tags: r.tags ?? "",
          category: r.category ?? "News",
          image: r.image ?? "",
          status: r.status as NewsDraft["status"],
          created_at: Number(r.created_at),
          updated_at: Number(r.updated_at),
          approved_post_id: r.approved_post_id,
        };
      }
    } catch {
      draft = memDrafts().find((d) => d.id === id) ?? null;
    }
    if (!draft) draft = memDrafts().find((d) => d.id === id) ?? null;
    if (!draft || draft.status === "rejected") return { ok: false as const, reason: "Draft not found" };
    if (draft.status === "approved" && draft.approved_post_id) {
      return { ok: true as const, postId: draft.approved_post_id, already: true as const };
    }

    const postId = `news-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const ts = Date.now();
    const author = "KilodeDesk#01";
    const slug = slugify(draft.title) || postId;
    const post = {
      id: postId,
      title: draft.title,
      body: draft.body,
      excerpt: draft.meta_description || draft.title.slice(0, 140),
      author,
      ts,
      comments: [] as { author: string; body: string; ts: number }[],
      category: draft.category || "News",
      tags: draft.tags || "",
      link: draft.original_link,
      image: draft.image || "",
      slug,
      status: "publish" as const,
      views: 0,
    };

    try {
      const sql = await getSql();
      await sql`
        insert into nf_posts (id, user_id, title, body, excerpt, category, tags, link, image, slug, status, author, ts)
        values (
          ${postId}, ${context.userId}, ${post.title}, ${post.body}, ${post.excerpt},
          ${post.category}, ${post.tags}, ${post.link}, ${post.image}, ${slug},
          ${"publish"}, ${author}, ${ts}
        )
      `;
      try {
        await sql`
          update nf_news_drafts set status = ${"approved"}, approved_post_id = ${postId}, updated_at = ${ts} where id = ${id}
        `;
      } catch {
        /* draft table optional */
      }
    } catch {
      const d = memDrafts().find((x) => x.id === id);
      if (d) {
        d.status = "approved";
        d.approved_post_id = postId;
        d.updated_at = ts;
      }
      return { ok: true as const, postId, post, localOnly: true as const };
    }

    const d = memDrafts().find((x) => x.id === id);
    if (d) {
      d.status = "approved";
      d.approved_post_id = postId;
      d.updated_at = ts;
    }

    return { ok: true as const, postId, post };
  });

export const publishNewsWeek = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await requireSuper(context.userId);
    const filters: NewsFilters = { maxAgeHours: 168 };
    const sources = memSources().filter((s) => s.enabled);
    const seenLinks = new Set<string>();
    const seenTitles = new Set<string>();
    try {
      const sql = await getSql();
      const rows = await sql<{ link: string | null; title: string }>`select link, title from nf_posts order by ts desc limit 2000`;
      for (const r of rows) {
        if (r.link) seenLinks.add(r.link);
        seenTitles.add(normTitle(r.title));
      }
    } catch {
      /* empty db */
    }

    const packs = await Promise.allSettled(
      sources.map(async (src) => {
        const res = await fetch(src.url, {
          headers: {
            "User-Agent": "KilodeNewsEngine/1.0 (+https://kilode.ng; RSS reader)",
            Accept: "application/rss+xml, application/xml, text/xml, */*",
          },
          signal: AbortSignal.timeout(12_000),
        });
        if (!res.ok) throw new Error(`${src.name}: HTTP ${res.status}`);
        const xml = await res.text();
        return { src, items: parseRss(xml, src.name).slice(0, 80) };
      }),
    );

    type Row = { src: NewsSource; item: RssItem };
    const pool: Row[] = [];
    const errors: string[] = [];
    for (const p of packs) {
      if (p.status === "rejected") {
        errors.push(p.reason instanceof Error ? p.reason.message : "feed failed");
        continue;
      }
      for (const item of p.value.items) {
        if (!passesFilters(item, filters)) continue;
        if (seenLinks.has(item.link)) continue;
        const nt = normTitle(item.title);
        if (seenTitles.has(nt)) continue;
        seenLinks.add(item.link);
        seenTitles.add(nt);
        pool.push({ src: p.value.src, item });
      }
    }

    const needPhoto = pool.filter((x) => !x.item.image).slice(0, 60);
    for (let i = 0; i < needPhoto.length; i += 8) {
      const batch = needPhoto.slice(i, i + 8);
      const photos = await Promise.all(batch.map((x) => ogImage(x.item.link)));
      photos.forEach((img, j) => {
        if (img) batch[j]!.item.image = img;
      });
    }

    const ready = pool.filter((x) => x.item.image).slice(0, 500);
    let published = 0;
    const sql = await getSql();
    for (const { src, item } of ready) {
      const rewritten = humanizeDeterministic(item, src.name);
      const postId = `news-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
      const ts = item.pubDate && item.pubDate > Date.now() - 8 * 24 * 3_600_000 ? item.pubDate : Date.now();
      const slug = slugify(rewritten.title) || postId;
      const image = item.image || "";
      const excerpt = rewritten.meta || rewritten.title.slice(0, 140);
      try {
        await sql`
          insert into nf_posts (id, user_id, title, body, excerpt, category, tags, link, image, slug, status, author, ts, source_name)
          values (
            ${postId}, ${context.userId}, ${rewritten.title}, ${rewritten.body}, ${excerpt},
            ${rewritten.category}, ${rewritten.tags}, ${item.link}, ${image}, ${slug},
            ${"publish"}, ${"KilodeDesk#01"}, ${ts}, ${src.name}
          )
        `;
        published += 1;
      } catch {
        try {
          await sql`
            insert into nf_posts (id, user_id, title, body, excerpt, category, tags, link, image, slug, status, author, ts)
            values (
              ${postId}, ${context.userId}, ${rewritten.title}, ${rewritten.body}, ${excerpt},
              ${rewritten.category}, ${rewritten.tags}, ${item.link}, ${image}, ${slug},
              ${"publish"}, ${"KilodeDesk#01"}, ${ts}
            )
          `;
          published += 1;
        } catch {
          /* skip dup */
        }
      }
    }

    return {
      ok: true as const,
      feeds: packs.filter((p) => p.status === "fulfilled").length,
      candidates: pool.length,
      withPhoto: ready.length,
      published,
      errors: errors.slice(0, 8),
    };
  });

