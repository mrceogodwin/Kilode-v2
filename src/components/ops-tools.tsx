import { useEffect, useState } from "react";
import { AI_KEY_SLOTS, listAiKeys, saveAiKey } from "@/lib/keys-server";
import { listPayMethods, pingGateway } from "@/lib/pay-gateways";
import { boostSeo, listSeoWeak, type SeoWeak } from "@/lib/seo-server";
import { AD_SLOT_DEFS, type AdSlotKind, type AdSlotRow } from "@/lib/ad-slots";
import { listAdSlots, listDigestCount, runDigestNow, saveAdSlot } from "@/lib/ad-slots-server";
import { listAdCatalog, saveAdCatalog, type AdCatalog } from "@/lib/ad-catalog-server";
import { AD_PLACEMENTS } from "@/lib/qonvo-data";
import { deleteRoom, listRoomsAdmin, renameRoom, saveCustomRoom, setRoomPaused } from "@/lib/rooms-server";
import { ROOM_SECTION_ORDER } from "@/lib/qonvo-data";
import { getLivePause, setLivePause, LIVE_PAUSE_OPEN_UNTIL } from "@/lib/forum-server";
import { getPublicSite, saveSiteFlags, DESK_PAY, DEFAULT_DESKS, type DeskMoney, type DeskPay } from "@/lib/site-server";


type PauseKind = "chat" | "cinema";
type PauseDur = "1h" | "6h" | "open";

function untilLabel(until: number) {
  if (!until || until <= Date.now()) return "";
  if (until >= LIVE_PAUSE_OPEN_UNTIL - 1_000) return "Until you reopen";
  try {
    return new Date(until).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return new Date(until).toISOString();
  }
}

function durToUntil(dur: PauseDur) {
  const now = Date.now();
  if (dur === "1h") return now + 3600_000;
  if (dur === "6h") return now + 6 * 3600_000;
  return LIVE_PAUSE_OPEN_UNTIL;
}

function LivePauseRow({
  title,
  kind,
  until,
  onSaved,
}: {
  title: string;
  kind: PauseKind;
  until: number;
  onSaved: (next: { chatUntil: number; cinemaUntil: number }) => void;
}) {
  const [dur, setDur] = useState<PauseDur>("1h");
  const [busy, setBusy] = useState(false);
  const on = until > Date.now();
  return (
    <div className={`rounded-xl border p-3 ${on ? "border-danger/50 bg-danger/10" : "border-danger/25 bg-danger/5"}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm font-extrabold text-danger">{title}</div>
          <p className="mt-0.5 text-[11px] text-muted">
            {on
              ? `On · ${untilLabel(until)}`
              : "Off · visitors see live Chat / talk as usual"}
          </p>
        </div>
        <button
          type="button"
          disabled={busy}
          className={`rounded-full px-3 py-1 text-[11px] font-bold disabled:opacity-50 ${
            on ? "bg-danger text-white" : "border border-danger/40 text-danger"
          }`}
          onClick={() => {
            setBusy(true);
            const nextUntil = on ? 0 : durToUntil(dur);
            void setLivePause({ data: { kind, until: nextUntil } })
              .then((r) => {
                if (r.ok) onSaved({ chatUntil: r.chatUntil, cinemaUntil: r.cinemaUntil });
              })
              .finally(() => setBusy(false));
          }}
        >
          {busy ? "…" : on ? "Turn off" : "Turn on"}
        </button>
      </div>
      {!on ? (
        <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label={`${title} duration`}>
          {(
            [
              ["1h", "1 hour"],
              ["6h", "6 hours"],
              ["open", "Until I reopen"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                dur === id ? "bg-danger/25 text-danger" : "border border-line text-muted"
              }`}
              onClick={() => setDur(id)}
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** Super-only: pause live Chat / Cinema talk + Videos menu visibility. */
export function LivePausePanel() {
  const [chatUntil, setChatUntil] = useState(0);
  const [cinemaUntil, setCinemaUntil] = useState(0);
  const [videosOn, setVideosOn] = useState(true);
  const [photosOn, setPhotosOn] = useState(true);
  const [cryptoOn, setCryptoOn] = useState(true);
  const [desks, setDesks] = useState<Record<DeskPay, DeskMoney>>({
    jobs: { ...DEFAULT_DESKS.jobs },
    market: { ...DEFAULT_DESKS.market },
    rent: { ...DEFAULT_DESKS.rent },
    events: { ...DEFAULT_DESKS.events },
    cinema: { ...DEFAULT_DESKS.cinema },
  });
  const [videosBusy, setVideosBusy] = useState(false);
  const [msg, setMsg] = useState("");
  function apply(next: { chatUntil: number; cinemaUntil: number }) {
    setChatUntil(next.chatUntil);
    setCinemaUntil(next.cinemaUntil);
    setMsg("Saved");
    setTimeout(() => setMsg(""), 1600);
  }
  useEffect(() => {
    void getLivePause()
      .then((r) => {
        setChatUntil(r.chatUntil);
        setCinemaUntil(r.cinemaUntil);
      })
      .catch(() => undefined);
    void getPublicSite()
      .then((s) => {
        setVideosOn(s.videosMenuVisible !== false);
        setPhotosOn(s.photosOn !== false);
        setCryptoOn(s.cryptoEnabled !== false);
        if (s.desks) setDesks(s.desks);
      })
      .catch(() => undefined);
  }, []);
  return (
    <div className="md:col-span-2 min-w-0 max-w-full raised space-y-3 rounded-2xl border border-danger/35 p-4 shadow-[0_0_24px_rgba(220,60,60,0.12)]">
      <div className="min-w-0">
        <div className="text-[10px] font-bold tracking-[0.18em] text-danger">SUPER · LIVE BREAK</div>
        <h3 className="text-lg font-extrabold text-danger">Pause live Chat / Cinema talk</h3>
        <p className="break-words text-[11px] text-muted">
          Stops visitor live updates while you are away. They see a calm “on a short break” note — not staff words. Turn off (or wait out the timer) to reopen.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <LivePauseRow title="Pause live Chat" kind="chat" until={chatUntil} onSaved={apply} />
        <LivePauseRow title="Pause Cinema talk" kind="cinema" until={cinemaUntil} onSaved={apply} />
      </div>
      <div className="rounded-xl border border-line bg-panel p-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-sm font-extrabold">Videos in menu</div>
            <p className="mt-0.5 text-[11px] text-muted">
              {videosOn
                ? "Shown · hamburger lists Videos (Clips on Kilode)"
                : "Hidden · Videos is simply not in the menu"}
            </p>
          </div>
          <button
            type="button"
            disabled={videosBusy}
            className={`rounded-full px-3 py-1 text-[11px] font-bold disabled:opacity-50 ${
              videosOn ? "border border-line" : "bg-panel-2 border border-line text-muted"
            }`}
            onClick={() => {
              const next = !videosOn;
              setVideosBusy(true);
              void saveSiteFlags({ data: { videosMenuVisible: next } })
                .then((r) => {
                  if (r.ok) {
                    setVideosOn(r.videosMenuVisible);
                    setMsg(r.videosMenuVisible ? "Videos shown in menu" : "Videos hidden from menu");
                    setTimeout(() => setMsg(""), 1600);
                  }
                })
                .finally(() => setVideosBusy(false));
            }}
          >
            {videosBusy ? "…" : videosOn ? "Hide Videos" : "Show Videos in menu"}
          </button>
        </div>
      </div>
      <div className="rounded-xl border border-line bg-panel p-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-sm font-extrabold">Profile photo links</div>
            <p className="mt-0.5 text-[11px] text-muted">
              {photosOn ? "On · https photo links can show" : "Paused · photo links stay saved but do not show"}
            </p>
          </div>
          <button
            type="button"
            className="rounded-full border border-line px-3 py-1 text-[11px] font-bold"
            onClick={() => {
              const next = !photosOn;
              void saveSiteFlags({ data: { photosOn: next } }).then((r) => {
                if (r.ok) {
                  setPhotosOn(r.photosOn);
                  setMsg(r.photosOn ? "Photo links on" : "Photo links paused");
                  setTimeout(() => setMsg(""), 1600);
                }
              });
            }}
          >
            {photosOn ? "Pause photos" : "Allow photos"}
          </button>
        </div>
      </div>
      <div className="rounded-xl border border-line bg-panel p-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-sm font-extrabold">Crypto checkout</div>
            <p className="mt-0.5 text-[11px] text-muted">
              {cryptoOn ? "On · Paystack, Flutterwave, and crypto all show." : "Off · crypto is hidden while a card gateway is under review."}
            </p>
          </div>
          <button
            type="button"
            className="rounded-full border border-line px-3 py-1 text-[11px] font-bold"
            onClick={() => {
              const next = !cryptoOn;
              void saveSiteFlags({ data: { cryptoEnabled: next } }).then((r) => {
                if (r.ok) {
                  setCryptoOn(r.cryptoEnabled);
                  setMsg(r.cryptoEnabled ? "Crypto checkout on" : "Crypto checkout hidden");
                  setTimeout(() => setMsg(""), 1600);
                }
              });
            }}
          >
            {cryptoOn ? "Hide crypto" : "Show crypto"}
          </button>
        </div>
      </div>
      <div className="rounded-xl border border-line bg-panel p-3">
        <div className="text-sm font-extrabold">Listing desks</div>
        <p className="mt-0.5 text-[11px] text-muted">Free sends the listing to staff, so spam stays off the public page. Paid opens Paystack, Flutterwave, or crypto and goes live when the webhook confirms. Prices are USD.</p>
        <div className="mt-2 space-y-2">
          {DESK_PAY.map((k) => (
            <div key={k} className="flex flex-wrap items-center gap-2">
              <div className="w-16 text-[12px] font-bold capitalize">{k}</div>
              <button
                type="button"
                className={`rounded-full border px-3 py-1 text-[11px] font-bold ${desks[k].paid ? "border-[#e6c56a]/50 text-[#e6c56a]" : "border-line text-muted"}`}
                onClick={() => {
                  const next = { ...desks, [k]: { ...desks[k], paid: !desks[k].paid } };
                  setDesks(next);
                  void saveSiteFlags({ data: { desks: { [k]: { paid: next[k].paid } } } }).then((r) => {
                    if (r.ok) setMsg(`${k} is ${next[k].paid ? "paid" : "free"}`);
                  });
                }}
              >
                {desks[k].paid ? "Paid" : "Free · staff"}
              </button>
              <label className="flex items-center gap-1 text-[11px] text-muted">
                $
                <input
                  defaultValue={desks[k].usd}
                  key={`${k}-${desks[k].usd}`}
                  inputMode="numeric"
                  className="w-16 rounded-lg border border-line bg-bg px-2 py-1 text-base text-fg"
                  onBlur={(e) => {
                    const usd = Math.round(Number(e.target.value));
                    if (!(usd >= 1 && usd <= 500)) return;
                    void saveSiteFlags({ data: { desks: { [k]: { usd } } } }).then((r) => {
                      if (r.ok) {
                        setDesks(r.desks);
                        setMsg(`${k} price saved`);
                      }
                    });
                  }}
                />
              </label>
            </div>
          ))}
        </div>
      </div>
      {msg ? <p className="text-[11px] text-danger">{msg}</p> : null}
    </div>
  );
}

export function PaywaysPanel() {
  const [rate, setRate] = useState("1600");
  const [eventUsd, setEventUsd] = useState("10");
  const [verifyUsd, setVerifyUsd] = useState("5");
  const [paystack, setPaystack] = useState("");
  const [flutterSecret, setFlutterSecret] = useState("");
  const [flutterHash, setFlutterHash] = useState("");
  const [live, setLive] = useState({ paystack: false, flutterwave: false });
  const [msg, setMsg] = useState("");
  function load() {
    void listPayMethods()
      .then((m) => {
        setRate(String(m.ngnPerUsd));
        setEventUsd(String(m.eventUsd));
        setLive({ paystack: m.paystack, flutterwave: m.flutterwave });
      })
      .catch(() => undefined);
    void listAiKeys()
      .then((rows) => {
        const v = rows.find((r) => r.id === "verify_usd");
        if (v?.value) setVerifyUsd(v.value);
      })
      .catch(() => undefined);
  }
  useEffect(() => {
    load();
  }, []);
  function save(id: string, value: string, note: string) {
    void saveAiKey({ data: { id, value: value.trim() } }).then((r) => {
      setMsg(r.ok ? note : r.reason);
      if (id === "paystack_secret") setPaystack("");
      if (id === "flutterwave_secret") setFlutterSecret("");
      if (id === "flutterwave_hash") setFlutterHash("");
      load();
    });
  }
  return (
    <div className="md:col-span-2 min-w-0 max-w-full space-y-3">
      <div className="raised space-y-2 rounded-2xl p-4">
        <div className="text-[10px] font-bold tracking-[0.18em] text-lime-2">SHARED</div>
        <h3 className="text-lg font-extrabold">Prices</h3>
        <p className="text-[11px] leading-5 text-muted">These are not secret keys. One naira rate is used by both Paystack and Flutterwave.</p>
        <div className="grid gap-2 sm:grid-cols-3">
          <label className="rounded-xl border border-line bg-panel p-2 text-[11px]">
            Naira per 1 USD
            <input value={rate} onChange={(e) => setRate(e.target.value)} className="mt-1 w-full rounded-lg border border-line bg-bg px-2 py-1.5 text-base" />
          </label>
          <label className="rounded-xl border border-line bg-panel p-2 text-[11px]">
            Event fee (USD)
            <input value={eventUsd} onChange={(e) => setEventUsd(e.target.value)} className="mt-1 w-full rounded-lg border border-line bg-bg px-2 py-1.5 text-base" />
          </label>
          <label className="rounded-xl border border-line bg-panel p-2 text-[11px]">
            Verify fee (USD)
            <input value={verifyUsd} onChange={(e) => setVerifyUsd(e.target.value)} className="mt-1 w-full rounded-lg border border-line bg-bg px-2 py-1.5 text-base" />
          </label>
        </div>
        <button
          type="button"
          className="btn-3d rounded-lg px-3 py-1.5 text-[11px] font-bold"
          onClick={() => {
            void Promise.all([
              saveAiKey({ data: { id: "ngn_per_usd", value: rate.trim() } }),
              saveAiKey({ data: { id: "event_usd", value: eventUsd.trim() } }),
              saveAiKey({ data: { id: "verify_usd", value: verifyUsd.trim() } }),
            ]).then(() => {
              setMsg("Prices saved");
              load();
            });
          }}
        >
          Save prices
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="raised space-y-2 rounded-2xl p-4">
          <div className="text-[10px] font-bold tracking-[0.18em] text-lime-2">PAYSTACK ONLY</div>
          <h3 className="text-lg font-extrabold">Paystack</h3>
          <p className="text-[11px] leading-5 text-muted">Secret key only. Do not paste a Flutterwave key here. {live.paystack ? "A key is saved." : "No key yet."}</p>
          <input value={paystack} onChange={(e) => setPaystack(e.target.value)} placeholder="sk_live_…" type="password" autoComplete="off" className="w-full rounded-lg border border-line bg-bg px-2 py-1.5 text-base" />
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-3d rounded-lg px-3 py-1.5 text-[11px] font-bold" onClick={() => save("paystack_secret", paystack, "Paystack secret saved")}>Save Paystack</button>
            <button type="button" className="rounded-lg border border-line px-3 py-1.5 text-[11px] font-bold" onClick={() => { void pingGateway({ data: { provider: "paystack" } }).then((r) => setMsg(r.reason)); }}>Test Paystack</button>
          </div>
          <p className="break-all text-[11px] text-muted">Webhook: https://kilode.ng/api/pay/paystack</p>
        </div>
        <div className="raised space-y-2 rounded-2xl p-4">
          <div className="text-[10px] font-bold tracking-[0.18em] text-lime-2">FLUTTERWAVE ONLY</div>
          <h3 className="text-lg font-extrabold">Flutterwave</h3>
          <p className="text-[11px] leading-5 text-muted">Secret and webhook hash. Do not paste a Paystack key here. {live.flutterwave ? "A secret is saved." : "No secret yet."}</p>
          <input value={flutterSecret} onChange={(e) => setFlutterSecret(e.target.value)} placeholder="FLWSECK_…" type="password" autoComplete="off" className="w-full rounded-lg border border-line bg-bg px-2 py-1.5 text-base" />
          <input value={flutterHash} onChange={(e) => setFlutterHash(e.target.value)} placeholder="Webhook hash" type="password" autoComplete="off" className="w-full rounded-lg border border-line bg-bg px-2 py-1.5 text-base" />
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-3d rounded-lg px-3 py-1.5 text-[11px] font-bold" onClick={() => save("flutterwave_secret", flutterSecret, "Flutterwave secret saved")}>Save secret</button>
            <button type="button" className="btn-3d rounded-lg px-3 py-1.5 text-[11px] font-bold" onClick={() => save("flutterwave_hash", flutterHash, "Flutterwave hash saved")}>Save hash</button>
            <button type="button" className="rounded-lg border border-line px-3 py-1.5 text-[11px] font-bold" onClick={() => { void pingGateway({ data: { provider: "flutterwave" } }).then((r) => setMsg(r.reason)); }}>Test Flutterwave</button>
          </div>
          <p className="break-all text-[11px] text-muted">Webhook: https://kilode.ng/api/pay/flutterwave</p>
        </div>
      </div>
      {msg ? <p className="text-[11px] text-lime-2">{msg}</p> : null}
    </div>
  );
}

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
    <div className="md:col-span-2 min-w-0 max-w-full raised space-y-3 rounded-2xl p-4">
      <div className="min-w-0">
        <div className="text-[10px] font-bold tracking-[0.18em] text-lime-2">API KEYS · 20 SLOTS</div>
        <h3 className="text-lg font-extrabold">Translate · news · SEO</h3>
        <p className="break-words text-[11px] text-muted">Paste keys here. They stay on the server. Empty slots are skipped. RSS news works without a key. Translate uses DeepL or Google Cloud if you paste those, else MyMemory. SEO Boost uses Grok/OpenAI/Groq if set, else writes titles from the post itself. IndexNow pings Bing when that key is set (file served at /api/indexnow).</p>
      </div>
      <div className="grid min-w-0 gap-2 sm:grid-cols-2">
        {rows.filter((s) => !["paystack_secret", "flutterwave_secret", "flutterwave_hash", "ngn_per_usd", "event_usd", "verify_usd"].includes(s.id)).map((s) => (
          <label key={s.id} className="min-w-0 rounded-xl border border-line bg-panel p-2">
            <span className="flex min-w-0 flex-wrap items-center justify-between gap-x-2 gap-y-0.5 text-[11px] font-semibold">
              <span className="min-w-0 break-words">{s.label}</span>
              <span className={`shrink-0 ${s.set ? "text-lime-2" : "text-muted"}`}>{s.set ? "saved" : "empty"}</span>
            </span>
            <span className="mt-0.5 block break-words text-[10px] text-muted">{s.hint}</span>
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
    <div className="md:col-span-2 min-w-0 max-w-full raised space-y-3 rounded-2xl p-4">
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-bold tracking-[0.18em] text-lime-2">SEO</div>
          <h3 className="text-lg font-extrabold">Sitemap · IndexNow · Boost</h3>
          <p className="break-words text-[11px] text-muted">
            Live sitemap at /api/sitemap. Article pages ship NewsArticle JSON-LD + Open Graph. Boost fills missing titles/descriptions (and uses an LLM key if you pasted one), then pings IndexNow. This is crawl hygiene — not a Google ranking guarantee.
          </p>
        </div>
        <button
          type="button"
          disabled={busy}
          className="btn-join rounded-lg px-3 py-2 text-base font-bold"
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
      {weak.length === 0 ? <p className="text-base text-muted">No weak posts in the last 80.</p> : null}
      {weak.slice(0, 12).map((w) => (
        <div key={w.id} className="flex items-center justify-between gap-2 rounded-lg border border-line px-2 py-1.5">
          <div className="min-w-0">
            <div className="truncate text-base font-semibold">{w.title}</div>
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
    <div className="md:col-span-2 min-w-0 max-w-full raised space-y-3 rounded-2xl p-4">
      <div className="min-w-0">
        <div className="text-[10px] font-bold tracking-[0.18em] text-lime-2">AD CATALOG · PRICES · CAPS</div>
        <h3 className="text-lg font-extrabold">Paid inventory</h3>
        <p className="break-words text-[11px] text-muted">
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
          <label key={p.id} className="flex items-center justify-between gap-2 rounded-lg border border-line px-2 py-1.5 text-base">
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
          <label key={k} className="flex items-center justify-between gap-2 text-base">
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
  const [mailReady, setMailReady] = useState(false);
  const [digestBusy, setDigestBusy] = useState(false);
  function load() {
    void listAdSlots()
      .then(setRows)
      .catch(() => setRows([]));
    void listDigestCount()
      .then((r) => {
        setDigest(r.n);
        setMailReady(Boolean(r.mailReady));
      })
      .catch(() => {
        setDigest(0);
        setMailReady(false);
      });
  }
  useEffect(() => {
    load();
  }, []);
  return (
    <div className="md:col-span-2 min-w-0 max-w-full raised space-y-3 rounded-2xl p-4">
      <div>
        <div className="text-[10px] font-bold tracking-[0.18em] text-lime-2">AD SLOTS · GOOGLE · BANNERS · VIDEO</div>
        <h3 className="text-lg font-extrabold">Where ads appear</h3>
        <p className="text-[11px] text-muted">
          Four kinds: Google (ca-pub + unit), image banner, YouTube video, HTML iframe. Empty slots show a dashed placeholder on the site — they do not load Google until you paste a real unit. Digest subscribers: {digest}. Mail: {mailReady ? "provider ready (RESEND_API_KEY or SMTP_*)" : "set RESEND_API_KEY (or SMTP_*) + CRON_SECRET for daily send"}.
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={digestBusy}
            className="btn-join rounded-lg px-3 py-1.5 text-[11px] font-bold disabled:cursor-wait"
            onClick={() => {
              setDigestBusy(true);
              setMsg("");
              void runDigestNow({ data: {} })
                .then((r) => {
                  setDigestBusy(false);
                  setMsg(
                    r.ok
                      ? `Digest: ${r.sent} sent / ${r.recipients} recipients · ${r.posts} posts${r.failed ? ` · ${r.failed} failed` : ""}${r.reason ? ` · ${r.reason}` : ""}`
                      : r.reason || "Digest failed",
                  );
                  load();
                })
                .catch(() => {
                  setDigestBusy(false);
                  setMsg("Digest run failed.");
                });
            }}
          >
            {digestBusy ? "Sending…" : "Send digest now"}
          </button>
          <button
            type="button"
            disabled={digestBusy}
            className="btn-3d rounded-lg px-3 py-1.5 text-[11px] font-bold disabled:cursor-wait"
            onClick={() => {
              setDigestBusy(true);
              setMsg("");
              void runDigestNow({ data: { force: true } })
                .then((r) => {
                  setDigestBusy(false);
                  setMsg(
                    r.ok
                      ? `Force digest: ${r.sent} sent / ${r.recipients} · ${r.posts} posts`
                      : r.reason || "Force digest failed",
                  );
                })
                .catch(() => {
                  setDigestBusy(false);
                  setMsg("Force digest failed.");
                });
            }}
          >
            Force (ignore cursor)
          </button>
        </div>
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
                  className="rounded-lg border border-line bg-bg px-2 py-1.5 text-base"
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
                  className="rounded-lg border border-line bg-bg px-2 py-1.5 text-base"
                />
                <input
                  value={cur.image ?? ""}
                  onChange={(e) => setDraft((m) => ({ ...m, [d.id]: { ...cur, image: e.target.value } }))}
                  placeholder="Image URL"
                  className="rounded-lg border border-line bg-bg px-2 py-1.5 text-base"
                />
                <input
                  value={cur.video ?? ""}
                  onChange={(e) => setDraft((m) => ({ ...m, [d.id]: { ...cur, video: e.target.value } }))}
                  placeholder="YouTube URL"
                  className="rounded-lg border border-line bg-bg px-2 py-1.5 text-base"
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
                  className="rounded-lg border border-line bg-bg px-2 py-1.5 text-base"
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
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editRegion, setEditRegion] = useState("More rooms");
  function load() {
    void listRoomsAdmin()
      .then(setRows)
      .catch(() => setRows([]));
  }
  useEffect(() => {
    load();
  }, []);
  const shown = rows.filter(
    (r) => !q || r.name.toLowerCase().includes(q.toLowerCase()) || r.region.toLowerCase().includes(q.toLowerCase()) || r.id.includes(q.toLowerCase()),
  );
  return (
    <div className="md:col-span-2 min-w-0 max-w-full raised space-y-3 rounded-2xl p-4">
      <div>
        <div className="text-[10px] font-bold tracking-[0.18em] text-lime-2">SUPER · ROOMS · MANAGE</div>
        <h3 className="text-lg font-extrabold">Chat rooms</h3>
        <p className="text-[11px] text-muted">
          Curated defaults stay small for clarity. Super can add, rename, show/hide (pause), or delete custom rooms. Pause hides from visitors immediately.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New room name"
          className="min-w-[140px] flex-1 rounded-lg border border-line bg-bg px-2 py-1.5 text-base"
        />
        <select value={region} onChange={(e) => setRegion(e.target.value)} className="rounded-lg border border-line bg-bg px-2 py-1.5 text-base">
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
          Add room
        </button>
      </div>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search rooms"
        className="w-full rounded-lg border border-line bg-bg px-2 py-1.5 text-base"
      />
      <div className="max-h-96 space-y-2 overflow-y-auto">
        {shown.map((r) => {
          const editing = editId === r.id;
          return (
            <div key={r.id} className="rounded-xl border border-line/80 p-2.5">
              {editing ? (
                <div className="flex flex-wrap items-end gap-2">
                  <label className="min-w-[140px] flex-1 text-[10px] text-muted">
                    Name
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="mt-0.5 w-full rounded-lg border border-line bg-bg px-2 py-1.5 text-base text-fg"
                    />
                  </label>
                  <label className="text-[10px] text-muted">
                    Section
                    <select
                      value={editRegion}
                      onChange={(e) => setEditRegion(e.target.value)}
                      className="mt-0.5 block rounded-lg border border-line bg-bg px-2 py-1.5 text-base text-fg"
                    >
                      {ROOM_SECTION_ORDER.map((sec) => (
                        <option key={sec} value={sec}>
                          {sec}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="btn-join rounded-lg px-3 py-1.5 text-[11px] font-bold"
                    onClick={() => {
                      void renameRoom({ data: { id: r.id, name: editName, region: editRegion } }).then((res) => {
                        setMsg(res.ok ? `Renamed → ${editName}` : res.reason);
                        if (res.ok) setEditId(null);
                        load();
                      });
                    }}
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-line px-3 py-1.5 text-[11px] font-bold"
                    onClick={() => setEditId(null)}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-base font-semibold">{r.name}</div>
                    <div className="text-[10px] text-muted">
                      {r.region}
                      {r.custom ? " · custom" : " · built-in"}
                      {" · "}
                      <span className="font-mono">{r.id}</span>
                      {r.paused ? " · hidden" : ""}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      className="rounded-full border border-line px-2 py-0.5 text-[10px] font-bold"
                      onClick={() => {
                        setEditId(r.id);
                        setEditName(r.name);
                        setEditRegion(r.region);
                      }}
                    >
                      Rename
                    </button>
                    <button
                      type="button"
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${r.paused ? "bg-danger/20 text-danger" : "border border-line"}`}
                      onClick={() => {
                        void setRoomPaused({ data: { id: r.id, paused: !r.paused, name: r.name, region: r.region } }).then(() => {
                          setMsg(r.paused ? `Shown: ${r.name}` : `Hidden: ${r.name}`);
                          load();
                        });
                      }}
                    >
                      {r.paused ? "Show" : "Hide"}
                    </button>
                    <button
                      type="button"
                      className="rounded-full border border-danger/40 px-2 py-0.5 text-[10px] font-bold text-danger"
                      onClick={() => {
                        const label = r.custom ? `Delete custom room “${r.name}”?` : `Archive (hide) built-in “${r.name}”?`;
                        if (!window.confirm(label)) return;
                        void deleteRoom({ data: { id: r.id } }).then((res) => {
                          setMsg(res.mode === "deleted" ? `Deleted ${r.name}` : `Archived ${r.name}`);
                          load();
                        });
                      }}
                    >
                      {r.custom ? "Delete" : "Archive"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {msg ? <p className="text-[11px] text-lime-2">{msg}</p> : null}
    </div>
  );
}
