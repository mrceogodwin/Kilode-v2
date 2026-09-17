import { useId } from "react";

export function QonvoMark({ className = "size-8" }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 32 32" className={`kilode-mark ${className}`} aria-hidden>
      <defs>
        <linearGradient id={`${id}Face`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f0e0b0" />
          <stop offset="0.42" stopColor="#dcc07a" />
          <stop offset="1" stopColor="#9a7c3c" />
        </linearGradient>
        <linearGradient id={`${id}Side`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6a5424" />
          <stop offset="1" stopColor="#2a210f" />
        </linearGradient>
        <linearGradient id={`${id}Plate`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1c1914" />
          <stop offset="1" stopColor="#0c0b09" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill={`url(#${id}Plate)`} stroke="#3a3428" strokeWidth="1" />
      <g transform="translate(16 16) rotate(12) translate(-16 -16)">
        <path d="M20 7.2 12.4 9.1 13.6 21.8 21.2 19.9Z" fill={`url(#${id}Side)`} />
        <rect x="12.6" y="6.4" width="7.2" height="13.2" rx="2.2" fill={`url(#${id}Face)`} />
        <ellipse cx="16.2" cy="24.6" rx="2.7" ry="2.5" fill={`url(#${id}Face)`} />
        <ellipse cx="15.4" cy="24.2" rx="1.1" ry="1" fill="#fff6d8" opacity="0.55" />
        <path d="M13.2 7.2c1.6-.5 4.8-.4 6.2.2" stroke="#fff6d8" strokeWidth="1.1" strokeLinecap="round" opacity="0.55" />
      </g>
      <circle cx="25.2" cy="7.4" r="2.1" fill="#6a9a78" />
    </svg>
  );
}

export function KilodeWord({ className = "" }: { className?: string }) {
  return (
    <span className={`kilode-word ${className}`}>
      K<span className="kilode-i">i</span>lode
    </span>
  );
}
