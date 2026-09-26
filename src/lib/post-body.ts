import { safeHttpUrl } from "@/lib/qonvo-data";

const ALLOWED = new Set(["p", "br", "strong", "b", "em", "i", "h2", "h3", "ul", "ol", "li", "a", "img"]);

/** True when body looks like our compact rich-editor HTML (not legacy plain text). */
export function looksLikeRichHtml(s: string): boolean {
  return /<\/?(?:p|br|strong|b|em|i|h[1-3]|ul|ol|li|a|img)\b/i.test(s || "");
}

export function escapeHtml(s: string): string {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/'/g, "&#39;");
}

function extractAttr(attrs: string, name: string): string {
  const re = new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i");
  const m = attrs.match(re);
  return (m?.[1] ?? m?.[2] ?? m?.[3] ?? "").trim();
}

/** Strip tags → plain text (for empty checks, excerpts, soft-mod plain scan, read time). */
export function stripHtml(raw: string): string {
  return String(raw || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(?:p|h[1-3]|li|div|blockquote)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function postBodyPlain(raw: string): string {
  return stripHtml(raw).replace(/\u00a0/g, " ").trim();
}

/**
 * Sanitize a small HTML subset for Feeds post bodies.
 * Works in browser and Node (no DOM dependency).
 * Legacy plain text (no allowed tags) is returned unchanged.
 */
export function sanitizePostHtml(input: string): string {
  const raw = String(input || "");
  if (!raw.trim()) return "";
  if (!looksLikeRichHtml(raw)) return raw;

  let s = raw
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\son\w+\s*=\s*(["'])[\s\S]*?\1/gi, "")
    .replace(/\son\w+\s*=\s*[^\s>]+/gi, "")
    .replace(/\s(href|src)\s*=\s*(["'])\s*javascript:[\s\S]*?\2/gi, "");

  s = s.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)(\s[^>]*)?\/?>/g, (full, tag: string, attrs = "") => {
    const t = tag.toLowerCase();
    const closing = full.startsWith("</");
    if (!ALLOWED.has(t)) return "";
    if (t === "br") return "<br>";
    if (closing) {
      if (t === "img") return "";
      return `</${t}>`;
    }
    if (t === "a") {
      const href = extractAttr(attrs, "href");
      const safe = safeHttpUrl(href);
      if (!safe) return "";
      return `<a href="${escapeAttr(safe)}" target="_blank" rel="noopener noreferrer">`;
    }
    if (t === "img") {
      const src = extractAttr(attrs, "src");
      const alt = extractAttr(attrs, "alt").slice(0, 120);
      let safe = safeHttpUrl(src) ?? "";
      if (!safe && src.startsWith("data:image/") && src.length < 900_000) safe = src;
      if (!safe) return "";
      return `<img src="${escapeAttr(safe)}" alt="${escapeAttr(alt)}" />`;
    }
    return `<${t}>`;
  });

  // Collapse empty shells from toolbar glitches
  s = s.replace(/(?:<p>(?:\s|&nbsp;|<br\s*\/?>)*<\/p>\s*)+$/gi, "").trim();
  return s;
}

/** Build safe HTML from legacy plain text (newlines → paragraphs). */
export function plainToSafeHtml(plain: string): string {
  const t = String(plain || "").replace(/\r\n/g, "\n").trim();
  if (!t) return "";
  return t
    .split(/\n{2,}/)
    .map((block) => `<p>${linkifyEscaped(escapeHtml(block).replace(/\n/g, "<br>"))}</p>`)
    .join("");
}

function linkifyEscaped(escaped: string): string {
  return escaped.replace(/https?:\/\/[^\s<]+/gi, (raw) => {
    const url = raw.replace(/[),.;!?]+$/g, "");
    const tail = raw.slice(url.length);
    let label = "Original";
    try {
      label = new URL(url).hostname.replace(/^www\./, "");
    } catch {
      /* keep short label */
    }
    return `<a href="${url}" target="_blank" rel="noopener noreferrer nofollow">🔗 ${label}</a>${tail}`;
  });
}

/** HTML string safe to inject for display (sanitized subset or escaped plain). */
export function postBodyToSafeHtml(raw: string): string {
  const v = String(raw || "");
  if (!v.trim()) return "";
  if (looksLikeRichHtml(v)) return sanitizePostHtml(v);
  return plainToSafeHtml(v);
}
