import { useEffect, useState } from "react";
import { AI_KEY_SLOTS, listAiKeys, saveAiKey } from "@/lib/keys-server";
import { boostSeo, listSeoWeak, type SeoWeak } from "@/lib/seo-server";

export function OpsKeysPanel() {
  const [rows, setRows] = useState<(typeof AI_KEY_SLOTS[number] & { value: string; set: boolean })[]>([]);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState("");
  function load() {
    void listAiKeys()
      .then((r) => {
        setRows(r);
        setDraft(Object.fromEntries(r.map((x) => [x.id, ""])));
      })
      .catch(() => setRows([]));
  }
  useEffect(() => {
    load();
  }, []);
  return (
    <div className="md:col-span-2 raised space-y-3 rounded-2xl p-4">
      <div>
        <div className="text-[10px] font-bold tracking-[0.18em] text-lime-2">API KEYS · 20 SLOTS</div>
        <h3 className="text-lg font-extrabold">Translate · news · SEO</h3>
        <p className="text-[11px] text-muted">Paste keys here. They stay on the server. Empty slots are skipped. RSS news works without a key. Translate uses DeepL or Google if set, else the public MyMemory fallback. SEO Boost uses Grok/OpenAI/Groq if set, else writes titles from the post itself and pings IndexNow if that key is set.</p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {rows.map((s) => (
          <label key={s.id} className="rounded-xl border border-line bg-panel p-2">
            <span className="flex items-center justify-between text-[11px] font-semibold">
              {s.label}
              <span className={s.set ? "text-lime-2" : "text-muted"}>{s.set ? "saved" : "empty"}</span>
            </span>
            <span className="block text-[10px] text-muted">{s.hint}</span>
            <input
              type="password"
              autoComplete="off"
              value={draft[s.id] ?? ""}
              placeholder={s.set ? "••••••••  (paste to replace)" : "Paste key"}
              onChange={(e) => setDraft((d) => ({ ...d, [s.id]: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-line bg-bg px-2 py-1.5 font-mono text-[11px]"
            />
            <button
              type="button"
              className="mt-1 text-[10px] font-bold text-lime-2"
              onClick={() => {
                void saveAiKey({ data: { id: s.id, value: draft[s.id] ?? "" } }).then((r) => {
                  setMsg(r.ok ? `Saved ${s.label}` : r.reason);
                  load();
                });
              }}
            >
              Save
            </button>
          </label>
        ))}
      </div>
      {msg ? <p className="text-[11px] text-lime-2">{msg}</p> : null}
    </div>
  );
}

export function OpsSeoPanel() {
  const [weak, setWeak] = useState<SeoWeak[]>([]);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    void listSeoWeak()
      .then(setWeak)
      .catch(() => setWeak([]));
  }, []);
  return (
    <div className="md:col-span-2 raised space-y-3 rounded-2xl p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="text-[10px] font-bold tracking-[0.18em] text-lime-2">SEO</div>
          <h3 className="text-lg font-extrabold">Sitemap · IndexNow · Boost</h3>
          <p className="text-[11px] text-muted">
            Live sitemap at /sitemap.xml. Article pages ship NewsArticle JSON-LD + Open Graph. Boost fills missing titles/descriptions (and uses an LLM key if you pasted one), then pings IndexNow. This is real crawl hygiene — not a ranking guarantee, and not a Google ToS scrape.
          </p>
        </div>
        <button
          type="button"
          disabled={busy}
          className="btn-join rounded-lg px-3 py-2 text-[12px] font-bold"
          onClick={() => {
            setBusy(true);
            void boostSeo({ data: {} })
              .then((r) => {
                setMsg(r.ok ? `Boosted ${r.n} posts${r.pinged ? " · IndexNow pinged" : " · add IndexNow key to ping Bing"}` : "Could not boost");
                return listSeoWeak();
              })
              .then(setWeak)
              .finally(() => setBusy(false));
          }}
        >
          {busy ? "Boosting…" : "SEO Boost"}
        </button>
      </div>
      {msg ? <p className="text-[11px] text-lime-2">{msg}</p> : null}
      <div className="text-[10px] font-bold tracking-normal text-muted">WEAK POSTS</div>
      {weak.length === 0 ? <p className="text-[12px] text-muted">No weak posts in the last 80.</p> : null}
      {weak.slice(0, 12).map((w) => (
        <div key={w.id} className="flex items-center justify-between gap-2 rounded-lg border border-line px-2 py-1.5">
          <div className="min-w-0">
            <div className="truncate text-[12px] font-semibold">{w.title}</div>
            <div className="text-[10px] text-muted">{w.reasons.join(" · ")}</div>
          </div>
          <a href={`/p/${encodeURIComponent(w.slug)}`} className="shrink-0 text-[10px] text-lime-2">
            open
          </a>
        </div>
      ))}
    </div>
  );
}
