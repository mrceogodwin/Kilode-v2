import { ACCOUNT_KINDS, type AccountKind } from "@/lib/qonvo-data";

export function AccountKindPicker({
  value,
  onChange,
}: {
  value: AccountKind;
  onChange: (v: AccountKind) => void;
}) {
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
