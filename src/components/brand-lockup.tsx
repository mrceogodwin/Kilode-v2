/** The Kilode! wordmark. Transparent PNG, no black plate. */
export function KilodeMark({ large = false }: { large?: boolean }) {
  return (
    <span className={`brand-lockup ${large ? "lg" : ""}`} role="img" aria-label="Kilode">
      <img src="/kilode-wordmark.jpg" alt="Kilode" className="kilode-wordmark" draggable={false} />
    </span>
  );
}

export function OfficialLockup({ className = "kilode-lockup" }: { className?: string }) {
  return (
    <span className={className}>
      <KilodeMark large={className.includes("login")} />
    </span>
  );
}

export function BangMark({ className }: { className: string }) {
  return (
    <span className={`bang-ico ${className}`} aria-hidden>!</span>
  );
}

export function BrandLockup({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const icon = size === "lg" ? "size-10 rounded-[12px]" : size === "sm" ? "size-8 rounded-[10px]" : "size-8 rounded-[10px]";
  const word = size === "lg" ? "text-[18px]" : size === "sm" ? "text-[15px]" : "text-[16px]";
  return (
    <span className="brand-lockup inline-flex items-center gap-2">
      <span className={`brand-mark ${icon} shrink-0`} aria-hidden>
        <img src="/kilode-bang-mark-white.png" alt="" className="h-full w-full object-contain p-[12%]" draggable={false} />
      </span>
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
