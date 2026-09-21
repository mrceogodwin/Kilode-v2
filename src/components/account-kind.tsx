import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { ACCOUNT_KINDS, AVATAR_SEEDS, KIND_FACE, avatarUrl, type AccountKind } from "@/lib/qonvo-data";

export function AccountKindPicker({
  value,
  onChange,
  compact,
}: {
  value: AccountKind;
  onChange: (v: AccountKind) => void;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const current = ACCOUNT_KINDS.find((k) => k.id === value);
  if (compact) {
    return (
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center justify-between rounded-lg border border-line bg-panel px-3 py-1.5 text-left"
        >
          <span className="min-w-0">
            <span className="block truncate text-[13px] font-semibold">{current?.label ?? "Choose type"}</span>
          </span>
          <ChevronDown className={`size-4 shrink-0 text-muted transition ${open ? "rotate-180" : ""}`} />
        </button>
        {open ? (
          <div className="absolute z-40 mt-1 max-h-52 w-full overflow-y-auto rounded-xl border border-line bg-panel-2 p-1 shadow-xl">
            {ACCOUNT_KINDS.map((k) => (
              <button
                key={k.id}
                type="button"
                onClick={() => {
                  onChange(k.id);
                  setOpen(false);
                }}
                className={`flex w-full flex-col rounded-lg px-3 py-1.5 text-left ${value === k.id ? "bg-lime-2/15 text-lime-2" : "hover:bg-panel"}`}
              >
                <span className="text-[13px] font-semibold">{k.label}</span>
                <span className="text-[10px] text-muted">{k.hint}</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-1.5">
      {ACCOUNT_KINDS.map((k) => (
        <button
          key={k.id}
          type="button"
          onClick={() => onChange(k.id)}
          className={`rounded-lg border px-2 py-2 text-left ${value === k.id ? "border-lime-2 bg-lime-2/10" : "border-line bg-black/20"}`}
        >
          <div className="text-[12px] font-semibold">{k.label}</div>
          <div className="text-[10px] text-muted">{k.hint}</div>
        </button>
      ))}
    </div>
  );
}

export function AvatarImg({
  handle,
  face,
  size = 32,
  className = "",
}: {
  handle: string;
  face?: string | null;
  size?: number;
  className?: string;
}) {
  return (
    <img
      src={avatarUrl(handle, face)}
      alt=""
      width={size}
      height={size}
      className={`shrink-0 rounded-full bg-panel-3 object-cover ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

export function AvatarPicker({
  value,
  handle,
  onChange,
  compact,
}: {
  value: string;
  handle?: string;
  onChange: (v: string) => void;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <div className="flex gap-1.5 overflow-x-auto overscroll-x-contain pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {AVATAR_SEEDS.map((seed) => {
          const id = `av:${seed}`;
          return (
            <button
              key={seed}
              type="button"
              onClick={() => onChange(id)}
              className={`size-9 shrink-0 overflow-hidden rounded-full ${value === id ? "ring-2 ring-lime-2 ring-offset-1 ring-offset-bg" : "ring-1 ring-line"}`}
              aria-label={`Avatar ${seed}`}
            >
              <img src={avatarUrl(handle || seed, id)} alt="" className="size-full object-cover" />
            </button>
          );
        })}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-6 gap-1.5">
      {AVATAR_SEEDS.map((seed) => {
        const id = `av:${seed}`;
        return (
          <button
            key={seed}
            type="button"
            onClick={() => onChange(id)}
            className={`overflow-hidden rounded-full ring-offset-2 ring-offset-bg ${value === id ? "ring-2 ring-lime-2" : "ring-1 ring-line"}`}
            aria-label={`Avatar ${seed}`}
          >
            <img src={avatarUrl(handle || seed, id)} alt="" className="aspect-square w-full object-cover" />
          </button>
        );
      })}
    </div>
  );
}

export function FacePicker(props: { value: string; onChange: (v: string) => void; handle?: string }) {
  return <AvatarPicker value={props.value || KIND_FACE.member} handle={props.handle} onChange={props.onChange} />;
}

export function YearBornSelect({
  value,
  onChange,
}: {
  value: number | "";
  onChange: (v: number | "") => void;
}) {
  const y = new Date().getUTCFullYear();
  const years: number[] = [];
  for (let n = y - 15; n >= y - 100; n--) years.push(n);
  return (
    <label className="flex items-center gap-2">
      <span className="shrink-0 text-[11px] font-medium text-muted">Born · 15+</span>
      <select
        value={value === "" ? "" : String(value)}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : "")}
        className="min-h-9 min-w-0 flex-1 rounded-lg border border-line bg-panel px-2 py-1.5 text-sm"
      >
        <option value="">Year</option>
        {years.map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
    </label>
  );
}
