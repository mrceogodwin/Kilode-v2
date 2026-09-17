import { useState } from "react";
import { LANGS } from "@/lib/i18n";
import { translateText } from "@/lib/social-server";

export function TranslateBtn({ text }: { text: string }) {
  const [to, setTo] = useState("yo");
  const [out, setOut] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  if (!text.trim()) return null;
  return (
    <div className="mt-1">
      <div className="flex flex-wrap items-center gap-1">
        <select
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="rounded border border-line bg-panel px-1 py-0.5 text-[10px] text-muted"
          aria-label="Translate to"
        >
          {LANGS.filter((l) => l.id !== "en").map((l) => (
            <option key={l.id} value={l.id}>
              {l.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="text-[10px] text-lime-2"
          disabled={busy}
          onClick={() => {
            setBusy(true);
            setErr("");
            void translateText({ data: { text, to } })
              .then((r) => {
                if (r.ok) setOut(r.text);
                else setErr(r.reason);
              })
              .finally(() => setBusy(false));
          }}
        >
          {busy ? "…" : "Translate"}
        </button>
      </div>
      {out ? <p className="mt-1 text-[12px] text-muted">{out}</p> : null}
      {err ? <p className="mt-1 text-[11px] text-danger">{err}</p> : null}
    </div>
  );
}
