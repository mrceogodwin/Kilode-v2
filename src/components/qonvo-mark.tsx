import { useId } from "react";

export function QonvoMark({ className = "size-8" }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 32 32" className={`kilode-mark ${className}`} aria-hidden>
      <defs>
        <linearGradient id={`${id}Face`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#9ec9a8" />
          <stop offset="0.45" stopColor="#6b9e78" />
          <stop offset="1" stopColor="#3d6a48" />
        </linearGradient>
        <linearGradient id={`${id}Side`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2a4a32" />
          <stop offset="1" stopColor="#152018" />
        </linearGradient>
        <linearGradient id={`${id}Plate`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1c1c1c" />
          <stop offset="1" stopColor="#0c0c0c" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill={`url(#${id}Plate)`} stroke="#2a2a2a" strokeWidth="1" />
      <g transform="translate(16 16) rotate(11) translate(-16 -16)">
        <path d="M20 7.2 12.4 9.1 13.6 21.8 21.2 19.9Z" fill={`url(#${id}Side)`} />
        <rect x="12.6" y="6.4" width="7.2" height="13.2" rx="2.2" fill={`url(#${id}Face)`} />
        <ellipse cx="16.2" cy="24.6" rx="2.7" ry="2.5" fill={`url(#${id}Face)`} />
        <ellipse cx="15.4" cy="24.2" rx="1.1" ry="1" fill="#d7eadc" opacity="0.55" />
        <path d="M13.2 7.2c1.6-.5 4.8-.4 6.2.2" stroke="#e8f6ec" strokeWidth="1.1" strokeLinecap="round" opacity="0.55" />
      </g>
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
