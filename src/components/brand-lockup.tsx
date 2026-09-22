function BangMark({ className }: { className: string }) {
  return (
    <span className={`brand-mark ${className}`} aria-hidden>
      <svg viewBox="0 0 64 64" className="h-[68%] w-[68%]">
        <rect x="26" y="7" width="11" height="34" rx="4.5" transform="rotate(-12 32 24)" fill="currentColor" />
        <circle cx="36.5" cy="50" r="6.5" fill="currentColor" />
      </svg>
    </span>
  );
}

export function BrandLockup({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const icon = size === "lg" ? "size-9 rounded-[10px]" : size === "sm" ? "size-6 rounded-[7px]" : "size-7 rounded-[8px]";
  const word = size === "lg" ? "text-[19px]" : size === "sm" ? "text-[13px]" : "text-[15px] sm:text-[16px]";
  return (
    <span className="brand-lockup inline-flex items-center gap-1.5">
      <BangMark className={`${icon} shrink-0`} />
      <span className="brand-copy min-w-0">
        <span className={`brand-word ${word}`}>KILODE</span>
        <span className="brand-url">News & Community Hub</span>
      </span>
    </span>
  );
}
