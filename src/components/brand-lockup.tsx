export function BrandLockup({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const icon = size === "lg" ? "size-11 rounded-[12px]" : size === "sm" ? "size-7 rounded-[8px]" : "size-8 rounded-[9px] sm:size-9 sm:rounded-[10px]";
  const word = size === "lg" ? "text-[26px]" : size === "sm" ? "text-[16px]" : "text-[19px] sm:text-[22px]";
  return (
    <span className="brand-lockup inline-flex items-center gap-1.5">
      <img src="/kilode-bang-icon.png" alt="" className={`${icon} shrink-0 object-cover`} />
      <span className="min-w-0 leading-none">
        <span className={`brand-word ${word}`}>Kilode</span>
        <span className="brand-url">KILODE.NG</span>
      </span>
    </span>
  );
}
