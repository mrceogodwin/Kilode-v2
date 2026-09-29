import { useId } from "react";

/** Branded K: white mark, gold chat bubble, green play, green-to-gold rim. */
export function OfficialLockup({ className = "kilode-lockup" }: { className?: string }) {
  const raw = useId().replace(/:/g, "");
  const glow = `kglow-${raw}`;
  return (
    <svg viewBox="0 0 168 36" className={className} role="img" aria-label="Kilode">
      <defs>
        <linearGradient id={glow} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3ddea0" />
          <stop offset="52%" stopColor="#c6e36a" />
          <stop offset="100%" stopColor="#e6c15a" />
        </linearGradient>
      </defs>
      <rect x="1.5" y="1.5" width="33" height="33" rx="9.5" fill="#070908" stroke={`url(#${glow})`} strokeWidth="1.7" />
      <path fill="#f7f7f5" d="M8.6 8.4h4.1l4.7 5.8V8.4h3.7v19.2h-3.7v-7.2l-1.5 1.7-4.2 5.5H8.2l6.3-8.1-5.9-7.1z" />
      <path fill="#e6c15a" d="M23.6 6.6c2.15 0 3.7 1.35 3.7 3.15 0 1.45-1 2.6-2.45 2.95l-1.35 1.25.35-1.45c-1.35-.35-2.25-1.4-2.25-2.75 0-1.8 1.55-3.15 3.7-3.15z" />
      <path fill="#3ddea0" d="M22.2 19.6 28.2 23l-6 3.4z" />
      <text x="42" y="25.5" className="kilode-word-svg">
        Kilode
      </text>
    </svg>
  );
}

export function BangMark({ className }: { className: string }) {
  return (
    <span className={`brand-mark ${className}`} aria-hidden>
      <img src="/kilode-bang-mark-white.png" alt="" className="h-full w-full object-contain p-[12%]" draggable={false} />
    </span>
  );
}

export function BrandLockup({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const icon = size === "lg" ? "size-10 rounded-[12px]" : size === "sm" ? "size-6 rounded-[8px]" : "size-8 rounded-[10px] sm:size-9 sm:rounded-[11px]";
  const word = size === "lg" ? "text-[19px]" : size === "sm" ? "text-[13px]" : "text-[15px] sm:text-[16px]";
  return (
    <span className="brand-lockup inline-flex items-center gap-2">
      <BangMark className={`${icon} shrink-0`} />
      <span className="brand-copy min-w-0">
        <span className={`brand-word ${word}`}>
          <span className="brand-word-k">K</span>ILODE
        </span>
        <span className="brand-url">Talk News. Real People.</span>
      </span>
    </span>
  );
}

export function CinemaTvIcon({ className = "size-3.5" }: { className?: string }) {
  return (
    <span className={`cinema-tv-icon relative inline-grid place-items-center ${className}`} aria-hidden>
      <svg viewBox="0 0 28 24" className="h-full w-full overflow-visible">
        <rect x="1.5" y="1.5" width="25" height="17.5" rx="2.4" fill="#0a0e0b" stroke="#3d6a48" strokeWidth="1.4" />
        <rect x="3.4" y="3.2" width="21.2" height="14" rx="1.2" fill="#061008" className="cinema-tv-screen" />
        <g transform="translate(14 10.2) scale(0.22) translate(-32 -32)" fill="#6b9e78">
          <rect x="26" y="7" width="11" height="34" rx="4.5" transform="rotate(-12 32 24)" />
          <circle cx="36.5" cy="50" r="6.5" />
        </g>
        <rect x="10" y="20" width="8" height="1.6" rx="0.6" fill="#2a4a32" />
        <rect x="8.5" y="21.6" width="11" height="1.2" rx="0.5" fill="#1a2e20" />
      </svg>
      <span className="cinema-tv-ping pointer-events-none absolute inset-[18%_16%_28%_16%] rounded-[2px]" />
    </span>
  );
}
