/** Transparent lockup. Night keeps the yellow ring. Light skin is black so it does not glow on ivory. */
export function OfficialLockup({ className = "kilode-lockup" }: { className?: string }) {
  return (
    <svg viewBox="0 0 168 36" className={className} role="img" aria-label="Kilode">
      <rect className="kilode-ring" x="1.4" y="1.4" width="33.2" height="33.2" rx="9" strokeWidth="2.3" />
      <path className="kilode-bang-ink" d="M16.1 8.4h3.4l-.8 12.6h-1.9L16.1 8.4z" />
      <circle className="kilode-bang-ink" cx="17.8" cy="25.8" r="1.75" />
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
