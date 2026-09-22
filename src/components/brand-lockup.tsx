export function BrandLockup({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const icon = size === "lg" ? "size-9 rounded-[10px]" : size === "sm" ? "size-6 rounded-[7px]" : "size-7 rounded-[8px]";
  const word = size === "lg" ? "text-[20px]" : size === "sm" ? "text-[14px]" : "text-[16px] sm:text-[17px]";
  return (
    <span className="brand-lockup inline-flex items-center gap-1.5">
      <img src="/kilode-bang-icon.png" alt="" className={`${icon} shrink-0 object-cover`} />
      <span className="min-w-0 leading-none">
        <span className={`brand-word ${word}`}>Kilode</span>
        <span className="brand-url">THE PREMIUM MEDIA APP</span>
      </span>
    </span>
  );
}
