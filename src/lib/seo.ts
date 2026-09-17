export const SITE = {
  name: "Kilode",
  url: "https://kilode.ng",
  description: "Kilode is Nigeria’s live forum — feeds, chat rooms, music, videos, and ads. Talk Nigeria. Live.",
  locale: "en_NG",
};

export function seoHead(opts?: { title?: string; description?: string; path?: string; image?: string; type?: string }) {
  const title = opts?.title ? `${opts.title} · ${SITE.name}` : `${SITE.name} — Talk Nigeria. Live.`;
  const description = opts?.description ?? SITE.description;
  const url = `${SITE.url}${opts?.path ?? "/"}`;
  const image = opts?.image ?? `${SITE.url}/og.svg`;
  return {
    meta: [
      { title },
      { name: "description", content: description },
      { name: "robots", content: "index,follow" },
      { name: "theme-color", content: "#0a0908" },
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
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: SITE.name,
          url: SITE.url,
          description,
          potentialAction: {
            "@type": "SearchAction",
            target: `${SITE.url}/?q={search_term_string}`,
            "query-input": "required name=search_term_string",
          },
        }),
      },
    ],
  };
}
