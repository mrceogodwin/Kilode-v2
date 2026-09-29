const URL_RE = /(https?:\/\/[^\s]+|\/p\/[A-Za-z0-9._~%-]+)/g;

function plain(s: string) {
  let out = s;
  for (let i = 0; i < 2; i++) {
    out = out
      .replace(/&/g, "&")
      .replace(/</g, "<")
      .replace(/>/g, ">")
      .replace(/"/g, '"')
      .replace(/&#(\d+);/g, (_, n) => {
        const c = Number(n);
        return c > 0 && c < 0x110000 ? String.fromCodePoint(c) : _;
      })
      .replace(/&#x([0-9a-f]+);/gi, (_, h) => {
        const c = parseInt(h, 16);
        return c > 0 && c < 0x110000 ? String.fromCodePoint(c) : _;
      })
      .replace(/'|&#39;/g, "'")
      .replace(/&nbsp;/g, " ");
  }
  return out;
}

export function LinkText({ text }: { text: string }) {
  const parts = plain(text).split(URL_RE);
  return (
    <>
      {parts.map((part, i) => {
        if (/^https?:\/\//.test(part)) {
          return (
            <a key={i} href={part} target="_blank" rel="noreferrer" className="font-semibold text-lime-2 underline">
              {part.replace(/^https?:\/\//, "").slice(0, 42)}
            </a>
          );
        }
        if (part.startsWith("/p/")) {
          return (
            <button
              key={i}
              type="button"
              className="font-semibold text-lime-2 underline"
              onClick={() => window.dispatchEvent(new CustomEvent("kilode:read", { detail: part }))}
            >
              Open story
            </button>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}
