const URL_RE = /(https?:\/\/[^\s]+|\/p\/[A-Za-z0-9._~%-]+)/g;

export function LinkText({ text }: { text: string }) {
  const parts = text.split(URL_RE);
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
