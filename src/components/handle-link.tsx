import { handleColor } from "@/lib/qonvo-data";

export function HandleLink({ handle, className = "text-xs font-bold" }: { handle: string; className?: string }) {
  const href = `/u/${encodeURIComponent(handle)}`;
  return (
    <a href={href} className={className} style={{ color: handleColor(handle) }}>
      {handle}
    </a>
  );
}
