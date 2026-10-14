/** Deterministic company mark — used on Jobs / Market cards so boards don't look like empty K placeholders. */
export function companyHue(name: string) {
  let n = 0;
  for (const c of name) n = (n * 31 + c.charCodeAt(0)) >>> 0;
  const hues = [210, 152, 28, 268, 340, 188, 12];
  return hues[n % hues.length];
}

export function CompanyMark({ name, size = 36 }: { name: string; size?: number }) {
  const label = (name || "Job").trim() || "Job";
  const letter = label.slice(0, 1).toUpperCase();
  const h = companyHue(label);
  const official = /kilode/i.test(label);
  return (
    <span
      className="relative grid shrink-0 place-items-center rounded-xl text-[13px] font-extrabold text-white shadow-sm"
      style={{
        width: size,
        height: size,
        background: `linear-gradient(145deg, hsl(${h} 72% 42%), hsl(${h} 65% 28%))`,
      }}
      title={label}
    >
      {letter}
      {official ? (
        <span className="absolute -bottom-0.5 -right-0.5 grid size-3.5 place-items-center rounded-full bg-[#1877F2] text-[8px] text-white ring-2 ring-white">
          ✓
        </span>
      ) : null}
    </span>
  );
}
