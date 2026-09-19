export const SITE = {
  name: "Kilode",
  url: "https://kilode.ng",
  description: "Kilode is Nigeria’s live feeds — chat rooms, music, cinema, and ads. Talk Nigeria. Live.",
  locale: "en_NG",
};

export function seoHead(opts?: {
  title?: string;
  description?: string;
  path?: string;
  image?: string;
  type?: string;
  published?: string;
  author?: string;
  keywords?: string;
}) {
  const title = opts?.title ? `${opts.title} · ${SITE.name}` : `${SITE.name} — Talk Nigeria. Live.`;
  const description = (opts?.description ?? SITE.description).slice(0, 160);
  const url = `${SITE.url}${opts?.path ?? "/"}`;
  const image = opts?.image ?? `${SITE.url}/og.svg`;
  const isArticle = opts?.type === "article";
  const jsonLd = isArticle
    ? {
        "@context": "https://schema.org",
        "@type": "NewsArticle",
        headline: opts?.title,
        description,
        image,
        datePublished: opts?.published,
        author: { "@type": "Person", name: opts?.author || "Kilode" },
        publisher: { "@type": "Organization", name: SITE.name, url: SITE.url, logo: `${SITE.url}/kilode-logo-green.png` },
        mainEntityOfPage: url,
        inLanguage: "en-NG",
      }
    : {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: SITE.name,
        url: SITE.url,
        description,
        inLanguage: "en-NG",
        potentialAction: {
          "@type": "SearchAction",
          target: `${SITE.url}/?q={search_term_string}`,
          "query-input": "required name=search_term_string",
        },
      };
  return {
    meta: [
      { title },
      { name: "description", content: description },
      { name: "robots", content: "index,follow,max-image-preview:large" },
      { name: "googlebot", content: "index,follow" },
      { name: "theme-color", content: "#0a0a0a" },
      ...(opts?.keywords ? [{ name: "keywords", content: opts.keywords }] : []),
      { property: "og:site_name", content: SITE.name },
      { property: "og:type", content: opts?.type ?? "website" },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:url", content: url },
      { property: "og:image", content: image },
      { property: "og:locale", content: SITE.locale },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
      { name: "twitter:image", content: image },
    ],
    links: [{ rel: "canonical", href: url }],
    scripts: [{ type: "application/ld+json", children: JSON.stringify(jsonLd) }],
  };
}
