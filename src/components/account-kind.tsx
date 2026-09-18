import { ACCOUNT_KINDS, FACE_EMOJIS, KIND_FACE, type AccountKind } from "@/lib/qonvo-data";

export function AccountKindPicker({
  value,
  onChange,
  compact,
}: {
  value: AccountKind;
  onChange: (v: AccountKind) => void;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as AccountKind)}
        className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm"
      >
        {ACCOUNT_KINDS.map((k) => (
          <option key={k.id} value={k.id}>
            {KIND_FACE[k.id]} {k.label} — {k.hint}
          </option>
        ))}
      </select>
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
          <div className="text-[12px] font-semibold">
            {KIND_FACE[k.id]} {k.label}
          </div>
          <div className="text-[10px] text-muted">{k.hint}</div>
        </button>
      ))}
    </div>
  );
}

export function FacePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {FACE_EMOJIS.map((f) => (
        <button
          key={f}
          type="button"
          onClick={() => onChange(f)}
          className={`grid size-9 place-items-center rounded-lg text-lg ${value === f ? "btn-3d" : "border border-line bg-panel"}`}
          aria-label={`Face ${f}`}
        >
          {f}
        </button>
      ))}
    </div>
  );
}
