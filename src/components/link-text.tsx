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
            <a key={i} href={part} className="font-semibold text-lime-2 underline">
              Open story
            </a>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}
