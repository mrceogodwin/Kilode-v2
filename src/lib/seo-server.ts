import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { assertStaff } from "@/lib/staff-server";
import { SITE } from "@/lib/seo";
import { readAiKey } from "@/lib/keys-server";

export type SeoWeak = {
  id: string;
  title: string;
  slug: string;
  reasons: string[];
  seo_title: string | null;
  seo_desc: string | null;
};

export const listSeoWeak = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await assertStaff(context.userId);
  const sql = await getSql();
  try {
    const rows = await sql<{ id: string; title: string; slug: string | null; excerpt: string | null; body: string; image: string | null; seo_title: string | null; seo_desc: string | null }>`
      select id, title, slug, excerpt, body, image, seo_title, seo_desc from nf_posts order by ts desc limit 80`;
    return rows
      .map((r) => {
        const reasons: string[] = [];
        if (!r.seo_title || r.seo_title.length < 20) reasons.push("weak title");
        if (!r.seo_desc || r.seo_desc.length < 50) reasons.push("weak description");
        if (!r.image) reasons.push("no image");
        if ((r.excerpt || r.body || "").length < 80) reasons.push("thin copy");
        return { id: r.id, title: r.title, slug: r.slug || r.id, reasons, seo_title: r.seo_title, seo_desc: r.seo_desc };
      })
      .filter((r) => r.reasons.length);
  } catch {
    return [] as SeoWeak[];
  }
});

export const boostSeo = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { id?: string } = {}) => d)
  .handler(async ({ context, data }) => {
    await assertStaff(context.userId, "super");
    const sql = await getSql();
    const openai = await readAiKey("openai");
    const grok = await readAiKey("grok");
    const groq = await readAiKey("groq");
    const indexNow = await readAiKey("indexnow");
    const rows = data.id
      ? await sql<{ id: string; title: string; slug: string | null; excerpt: string | null; body: string }>`select id, title, slug, excerpt, body from nf_posts where id = ${data.id}`
      : await sql<{ id: string; title: string; slug: string | null; excerpt: string | null; body: string }>`select id, title, slug, excerpt, body from nf_posts order by ts desc limit 40`;
    let n = 0;
    const urls: string[] = [];
    for (const r of rows) {
      const desc = (r.excerpt || r.body || "").replace(/\s+/g, " ").slice(0, 155);
      const title = r.title.slice(0, 70);
      let seoTitle = title;
      let seoDesc = desc;
      const key = grok || openai || groq;
      const endpoint = grok
        ? "https://api.x.ai/v1/chat/completions"
        : openai
          ? "https://api.openai.com/v1/chat/completions"
          : groq
            ? "https://api.groq.com/openai/v1/chat/completions"
            : "";
      if (key && endpoint) {
        try {
          const res = await fetch(endpoint, {
            method: "POST",
            headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
            body: JSON.stringify({
              model: grok ? "grok-2-latest" : openai ? "gpt-4o-mini" : "llama-3.1-8b-instant",
              messages: [
                { role: "system", content: "Write SEO title (max 60 chars) and meta description (max 155 chars) for a Nigerian news site. JSON {title, description}. No clickbait, no spam." },
                { role: "user", content: `${r.title}\n${desc}` },
              ],
              temperature: 0.2,
            }),
          });
          const j = (await res.json()) as { choices?: { message?: { content?: string } }[] };
          const text = j.choices?.[0]?.message?.content || "";
          const parsed = JSON.parse(text.replace(/```json|```/g, "").trim()) as { title?: string; description?: string };
          if (parsed.title) seoTitle = parsed.title.slice(0, 70);
          if (parsed.description) seoDesc = parsed.description.slice(0, 160);
        } catch {
          /* keep deterministic */
        }
      }
      await sql`update nf_posts set seo_title = ${seoTitle}, seo_desc = ${seoDesc}, seo_boosted = ${Date.now()} where id = ${r.id}`;
      urls.push(`${SITE.url}/p/${encodeURIComponent(r.slug || r.id)}`);
      n += 1;
    }
    if (indexNow && urls.length) {
      await fetch("https://api.indexnow.org/indexnow", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ host: "kilode.ng", key: indexNow, keyLocation: `https://kilode.ng/${indexNow}.txt`, urlList: urls.slice(0, 100) }),
      }).catch(() => undefined);
    }
    return { ok: true as const, n, pinged: Boolean(indexNow) };
  });

export const sitemapXml = createServerFn({ method: "GET" }).handler(async () => {
  const sql = await getSql().catch(() => null);
  const now = new Date().toISOString();
  const urls: { loc: string; lastmod: string; changefreq: string; priority: string }[] = [
    { loc: `${SITE.url}/`, lastmod: now, changefreq: "hourly", priority: "1.0" },
    { loc: `${SITE.url}/advertise`, lastmod: now, changefreq: "weekly", priority: "0.5" },
    { loc: `${SITE.url}/install`, lastmod: now, changefreq: "monthly", priority: "0.3" },
  ];
  if (sql) {
    try {
      const rows = await sql<{ slug: string | null; id: string; ts: number | string }>`
        select id, slug, ts from nf_posts where status = ${"publish"} order by ts desc limit 2000
      `;
      for (const r of rows) {
        urls.push({
          loc: `${SITE.url}/p/${encodeURIComponent(r.slug || r.id)}`,
          lastmod: new Date(Number(r.ts) || Date.now()).toISOString(),
          changefreq: "daily",
          priority: "0.8",
        });
      }
    } catch {
      /* seed-only */
    }
  }
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) =>
      `  <url><loc>${u.loc}</loc><lastmod>${u.lastmod}</lastmod><changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority></url>`,
  )
  .join("\n")}
</urlset>`;
  return body;
});
