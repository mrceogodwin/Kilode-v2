import { useEffect, useState } from "react";
import { AI_KEY_SLOTS, listAiKeys, saveAiKey } from "@/lib/keys-server";
import { boostSeo, listSeoWeak, type SeoWeak } from "@/lib/seo-server";
import { AD_SLOT_DEFS, type AdSlotKind, type AdSlotRow } from "@/lib/ad-slots";
import { listAdSlots, listDigestCount, saveAdSlot } from "@/lib/ad-slots-server";
import { listAdCatalog, saveAdCatalog, type AdCatalog } from "@/lib/ad-catalog-server";
import { AD_PLACEMENTS } from "@/lib/qonvo-data";
import { listRoomsAdmin, saveCustomRoom, setRoomPaused } from "@/lib/rooms-server";
import { ROOM_SECTION_ORDER } from "@/lib/qonvo-data";

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

export function AdCatalogPanel() {
  const [cat, setCat] = useState<AdCatalog | null>(null);
  const [msg, setMsg] = useState("");
  useEffect(() => {
    void listAdCatalog()
      .then(setCat)
      .catch(() => undefined);
  }, []);
  if (!cat) return null;
  return (
    <div className="md:col-span-2 raised space-y-3 rounded-2xl p-4">
      <div>
        <div className="text-[10px] font-bold tracking-[0.18em] text-lime-2">AD CATALOG · PRICES · CAPS</div>
        <h3 className="text-lg font-extrabold">Paid inventory</h3>
        <p className="text-[11px] text-muted">
          Daily cap stops a flood of submissions. Featured N is how many live ads rotate at the top of the Ads tab so a paid campaign is not buried. Page size is the first 3-column page; more loads on scroll. Save to take effect.
        </p>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <label className="text-[11px]">
          Ads / day
          <input
            type="number"
            min={1}
            max={200}
            value={cat.dailyCap}
            onChange={(e) => setCat({ ...cat, dailyCap: Number(e.target.value) })}
            className="mt-1 w-full rounded-lg border border-line bg-bg px-2 py-1.5"
          />
        </label>
        <label className="text-[11px]">
          Featured slider
          <input
            type="number"
            min={3}
            max={24}
            value={cat.featuredN}
            onChange={(e) => setCat({ ...cat, featuredN: Number(e.target.value) })}
            className="mt-1 w-full rounded-lg border border-line bg-bg px-2 py-1.5"
          />
        </label>
        <label className="text-[11px]">
          Grid page size
          <input
            type="number"
            min={6}
            max={48}
            value={cat.pageSize}
            onChange={(e) => setCat({ ...cat, pageSize: Number(e.target.value) })}
            className="mt-1 w-full rounded-lg border border-line bg-bg px-2 py-1.5"
          />
        </label>
      </div>
      <div className="grid gap-1.5 sm:grid-cols-2">
        {AD_PLACEMENTS.map((p) => (
          <label key={p.id} className="flex items-center justify-between gap-2 rounded-lg border border-line px-2 py-1.5 text-[12px]">
            <span className="min-w-0 truncate">{p.label}</span>
            <span className="flex items-center gap-1">
              $
              <input
                type="number"
                min={1}
                value={cat.prices[p.id] ?? p.usd}
                onChange={(e) => setCat({ ...cat, prices: { ...cat.prices, [p.id]: Number(e.target.value) } })}
                className="w-16 rounded border border-line bg-bg px-1 py-0.5 text-right"
              />
            </span>
          </label>
        ))}
      </div>
      <div className="space-y-2 rounded-xl border border-lime-2/30 bg-lime-2/5 p-3">
        <div className="text-[10px] font-bold tracking-[0.16em] text-lime-2">FEEDS HERO SLIDER</div>
        <p className="text-[11px] text-muted">
          Mixes trending posts with a Google AdSense slide and five company banners. Paid feeds-hero campaigns and Super image/video also rotate in. No RENT chrome on Feeds — that stays on the Ads tab. Paste creatives under Ad slots (Feeds hero · company 1–5 and Google).
        </p>
        {(
          [
            ["heroPosts", "Trending + new posts"],
            ["heroPaid", "Paid user campaigns"],
            ["heroGoogle", "AdSense as a slide"],
            ["heroVideo", "Click-to-play video"],
          ] as const
        ).map(([k, label]) => (
          <label key={k} className="flex items-center justify-between gap-2 text-[12px]">
            <span>{label}</span>
            <input
              type="checkbox"
              checked={cat[k]}
              onChange={(e) => setCat({ ...cat, [k]: e.target.checked })}
            />
          </label>
        ))}
        <label className="block text-[11px]">
          Seconds per slide
          <input
            type="number"
            min={4}
            max={15}
            value={Math.round(cat.heroMs / 1000)}
            onChange={(e) => setCat({ ...cat, heroMs: Math.max(4, Math.min(15, Number(e.target.value) || 7)) * 1000 })}
            className="mt-1 w-24 rounded-lg border border-line bg-bg px-2 py-1.5"
          />
        </label>
      </div>
      <button
        type="button"
        className="btn-3d rounded-md px-3 py-1.5 text-[11px] font-semibold"
        onClick={() => {
          void saveAdCatalog({ data: cat }).then((r) => {
            setMsg(r.ok ? "Catalog saved. Live prices and caps apply now." : "Could not save");
            if (r.ok) setCat(r.catalog);
          });
        }}
      >
        Save catalog
      </button>
      {msg ? <p className="text-[11px] text-lime-2">{msg}</p> : null}
    </div>
  );
}

export function AdSlotsPanel() {
  const [rows, setRows] = useState<AdSlotRow[]>([]);
  const [draft, setDraft] = useState<Record<string, Partial<AdSlotRow>>>({});
  const [msg, setMsg] = useState("");
  const [digest, setDigest] = useState(0);
  function load() {
    void listAdSlots()
      .then(setRows)
      .catch(() => setRows([]));
    void listDigestCount()
      .then((r) => setDigest(r.n))
      .catch(() => setDigest(0));
  }
  useEffect(() => {
    load();
  }, []);
  return (
    <div className="md:col-span-2 raised space-y-3 rounded-2xl p-4">
      <div>
        <div className="text-[10px] font-bold tracking-[0.18em] text-lime-2">AD SLOTS · GOOGLE · BANNERS · VIDEO</div>
        <h3 className="text-lg font-extrabold">Where ads appear</h3>
        <p className="text-[11px] text-muted">
          Four kinds: Google (ca-pub + unit), image banner, YouTube video, HTML iframe. Empty slots show a dashed placeholder on the site — they do not load Google until you paste a real unit. Digest emails stored: {digest}. Sending mail waits for a mail API key.
        </p>
      </div>
      <div className="space-y-2">
        {AD_SLOT_DEFS.map((d) => {
          const row = rows.find((r) => r.id === d.id);
          const cur = { ...row, ...draft[d.id] };
          return (
            <div key={d.id} className="rounded-xl border border-line bg-panel p-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-[13px] font-bold">{d.label}</div>
                  <div className="text-[10px] text-muted">{d.hint}</div>
                </div>
                <label className="flex items-center gap-1 text-[11px]">
                  <input
                    type="checkbox"
                    checked={Boolean(cur.enabled)}
                    onChange={(e) => setDraft((m) => ({ ...m, [d.id]: { ...cur, enabled: e.target.checked } }))}
                  />
                  On
                </label>
              </div>
              <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                <select
                  value={cur.kind ?? d.kind}
                  onChange={(e) => setDraft((m) => ({ ...m, [d.id]: { ...cur, kind: e.target.value as AdSlotKind } }))}
                  className="rounded-lg border border-line bg-bg px-2 py-1.5 text-[12px]"
                >
                  <option value="image">Image</option>
                  <option value="video">YouTube</option>
                  <option value="google">Google Ads</option>
                  <option value="html">HTML / iframe</option>
                </select>
                <input
                  value={cur.link ?? ""}
                  onChange={(e) => setDraft((m) => ({ ...m, [d.id]: { ...cur, link: e.target.value } }))}
                  placeholder="Click URL https://…"
                  className="rounded-lg border border-line bg-bg px-2 py-1.5 text-[12px]"
                />
                <input
                  value={cur.image ?? ""}
                  onChange={(e) => setDraft((m) => ({ ...m, [d.id]: { ...cur, image: e.target.value } }))}
                  placeholder="Image URL"
                  className="rounded-lg border border-line bg-bg px-2 py-1.5 text-[12px]"
                />
                <input
                  value={cur.video ?? ""}
                  onChange={(e) => setDraft((m) => ({ ...m, [d.id]: { ...cur, video: e.target.value } }))}
                  placeholder="YouTube URL"
                  className="rounded-lg border border-line bg-bg px-2 py-1.5 text-[12px]"
                />
                <input
                  value={cur.pubId ?? ""}
                  onChange={(e) => setDraft((m) => ({ ...m, [d.id]: { ...cur, pubId: e.target.value } }))}
                  placeholder="ca-pub-xxxxxxxx"
                  className="rounded-lg border border-line bg-bg px-2 py-1.5 font-mono text-[11px]"
                />
                <input
                  value={cur.adUnit ?? ""}
                  onChange={(e) => setDraft((m) => ({ ...m, [d.id]: { ...cur, adUnit: e.target.value } }))}
                  placeholder="Ad unit id"
                  className="rounded-lg border border-line bg-bg px-2 py-1.5 font-mono text-[11px]"
                />
                <select
                  value={String(cur.days ?? 30)}
                  onChange={(e) => setDraft((m) => ({ ...m, [d.id]: { ...cur, days: Number(e.target.value) } }))}
                  className="rounded-lg border border-line bg-bg px-2 py-1.5 text-[12px]"
                >
                  <option value="1">1 day</option>
                  <option value="7">7 days</option>
                  <option value="14">14 days</option>
                  <option value="30">30 days</option>
                </select>
              </div>
              <textarea
                value={cur.html ?? ""}
                onChange={(e) => setDraft((m) => ({ ...m, [d.id]: { ...cur, html: e.target.value } }))}
                rows={2}
                placeholder="Optional HTML for iframe (no Kilode scripts). Prefer Google fields above."
                className="mt-1.5 w-full rounded-lg border border-line bg-bg px-2 py-1.5 font-mono text-[11px]"
              />
              <button
                type="button"
                className="btn-3d mt-2 rounded-lg px-3 py-1.5 text-[11px] font-semibold"
                onClick={() => {
                  void saveAdSlot({
                    data: {
                      id: d.id,
                      kind: (cur.kind as AdSlotKind) ?? d.kind,
                      enabled: Boolean(cur.enabled),
                      image: cur.image ?? "",
                      video: cur.video ?? "",
                      link: cur.link ?? "",
                      html: cur.html ?? "",
                      pubId: cur.pubId ?? "",
                      adUnit: cur.adUnit ?? "",
                      days: Number(cur.days ?? 30),
                    },
                  }).then((r) => {
                    setMsg(r.ok ? `Saved ${d.label}` : r.reason);
                    load();
                  });
                }}
              >
                Save slot
              </button>
            </div>
          );
        })}
      </div>
      {msg ? <p className="text-[11px] text-lime-2">{msg}</p> : null}
    </div>
  );
}

export function RoomsAdminPanel() {
  const [rows, setRows] = useState<{ id: string; name: string; region: string; paused: boolean; custom: boolean }[]>([]);
  const [name, setName] = useState("");
  const [region, setRegion] = useState<string>("More rooms");
  const [msg, setMsg] = useState("");
  const [q, setQ] = useState("");
  function load() {
    void listRoomsAdmin()
      .then(setRows)
      .catch(() => setRows([]));
  }
  useEffect(() => {
    load();
  }, []);
  const shown = rows.filter((r) => !q || r.name.toLowerCase().includes(q.toLowerCase()) || r.region.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="md:col-span-2 raised space-y-3 rounded-2xl p-4">
      <div>
        <div className="text-[10px] font-bold tracking-[0.18em] text-lime-2">ROOMS · 36 STATES · PAUSE</div>
        <h3 className="text-lg font-extrabold">Chat rooms</h3>
        <p className="text-[11px] text-muted">Pause hides a room from the list. Create extra rooms under More rooms. Pause is saved immediately.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="New room name" className="min-w-[140px] flex-1 rounded-lg border border-line bg-bg px-2 py-1.5 text-[12px]" />
        <select value={region} onChange={(e) => setRegion(e.target.value)} className="rounded-lg border border-line bg-bg px-2 py-1.5 text-[12px]">
          {ROOM_SECTION_ORDER.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="btn-join rounded-lg px-3 py-1.5 text-[11px] font-bold"
          onClick={() => {
            void saveCustomRoom({ data: { name, region } }).then((r) => {
              setMsg(r.ok ? `Created ${name}` : r.reason);
              if (r.ok) setName("");
              load();
            });
          }}
        >
          Create room
        </button>
      </div>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search rooms" className="w-full rounded-lg border border-line bg-bg px-2 py-1.5 text-[12px]" />
      <div className="max-h-80 overflow-y-auto">
        {shown.map((r) => (
          <div key={r.id} className="flex items-center justify-between gap-2 border-b border-line py-1.5">
            <div className="min-w-0">
              <div className="truncate text-[12px] font-semibold">{r.name}</div>
              <div className="text-[10px] text-muted">
                {r.region}
                {r.custom ? " · custom" : ""}
              </div>
            </div>
            <button
              type="button"
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${r.paused ? "bg-danger/20 text-danger" : "border border-line"}`}
              onClick={() => {
                void setRoomPaused({ data: { id: r.id, paused: !r.paused, name: r.name, region: r.region } }).then(() => {
                  setMsg(r.paused ? `Live: ${r.name}` : `Paused: ${r.name}`);
                  load();
                });
              }}
            >
              {r.paused ? "Paused · tap to live" : "Pause"}
            </button>
          </div>
        ))}
      </div>
      {msg ? <p className="text-[11px] text-lime-2">{msg}</p> : null}
    </div>
  );
}
