import { useState } from "react";
import { LANGS } from "@/lib/i18n";
import { translateText } from "@/lib/social-server";

/** Tiny top-right control: pick a language, translate the whole visible thread. */
export function ThreadTranslateBar({
  items,
  onTranslated,
}: {
  items: { key: string; text: string }[];
  onTranslated: (map: Record<string, string>) => void;
}) {
  const [to, setTo] = useState("yo");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const label = LANGS.find((l) => l.id === to)?.label ?? to;

  return (
    <div className="flex shrink-0 flex-col items-end gap-0">
      <div className="flex h-6 max-w-full flex-nowrap items-center gap-0.5 whitespace-nowrap">
        <select
          value={to}
          onChange={(e) => {
            setTo(e.target.value);
            setErr("");
            onTranslated({});
          }}
          className="h-6 min-h-[24px] min-w-[2.75rem] max-w-[3.5rem] rounded border border-line bg-panel px-0.5 py-0 text-[10px] leading-none text-muted"
          aria-label="Show messages in"
          title={label}
        >
          {LANGS.filter((l) => l.id !== "en").map((l) => (
            <option key={l.id} value={l.id}>
              {l.id.toUpperCase()}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="h-6 min-h-[24px] rounded border border-lime-2/40 bg-lime-2/10 px-1.5 py-0 text-[10px] font-semibold leading-none text-lime-2 disabled:opacity-50"
          disabled={busy || items.length === 0}
          aria-label={`Show in ${label}`}
          title={`Show in ${label}`}
          onClick={() => {
            const pack = items.filter((i) => i.text.trim());
            if (!pack.length) {
              onTranslated({});
              return;
            }
            setBusy(true);
            setErr("");
            void (async () => {
              const map: Record<string, string> = {};
              let fail = "";
              for (const item of pack) {
                try {
                  const r = await translateText({ data: { text: item.text, to } });
                  if (r.ok) map[item.key] = r.text;
                  else if (!fail) fail = r.reason;
                } catch {
                  fail = "Translate failed.";
                  break;
                }
              }
              if (fail) setErr(fail);
              onTranslated(map);
            })().finally(() => setBusy(false));
          }}
        >
          {busy ? "…" : "Show"}
        </button>
      </div>
      {err ? <span className="max-w-[8rem] text-right text-[8px] leading-tight text-danger">{err}</span> : null}
    </div>
  );
}

/** Shown under a message when the thread bar has a translation for it. */
export function TranslatedLine({ text }: { text?: string }) {
  if (!text?.trim()) return null;
  return <p className="mt-0.5 text-[12px] leading-snug text-muted">{text}</p>;
}
