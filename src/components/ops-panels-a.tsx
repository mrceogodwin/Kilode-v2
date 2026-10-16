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
import { GatewayToggles } from "@/components/gateway-toggles";

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
            {on ? `On · ${untilLabel(until)}` : "Off · visitors see live Chat / talk as usual"}
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
          Stops visitor live updates while you are away. They see a calm “on a short break” note. Turn off to reopen.
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
            <p className="mt-0.5 text-[11px] text-muted">{videosOn ? "Shown in menu" : "Hidden from menu"}</p>
          </div>
          <button
            type="button"
            disabled={videosBusy}
            className="rounded-full border border-line px-3 py-1 text-[11px] font-bold disabled:opacity-50"
            onClick={() => {
              const next = !videosOn;
              setVideosBusy(true);
              void saveSiteFlags({ data: { videosMenuVisible: next } })
                .then((r) => {
                  if (r.ok) {
                    setVideosOn(r.videosMenuVisible);
                    setMsg(r.videosMenuVisible ? "Videos shown" : "Videos hidden");
                    setTimeout(() => setMsg(""), 1600);
                  }
                })
                .finally(() => setVideosBusy(false));
            }}
          >
            {videosBusy ? "…" : videosOn ? "Hide Videos" : "Show Videos"}
          </button>
        </div>
      </div>
      <div className="rounded-xl border border-line bg-panel p-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-sm font-extrabold">Profile photo links</div>
            <p className="mt-0.5 text-[11px] text-muted">{photosOn ? "On" : "Paused"}</p>
          </div>
          <button
            type="button"
            className="rounded-full border border-line px-3 py-1 text-[11px] font-bold"
            onClick={() => {
              const next = !photosOn;
              void saveSiteFlags({ data: { photosOn: next } }).then((r) => {
                if (r.ok) {
                  setPhotosOn(r.photosOn);
                  setMsg(r.photosOn ? "Photos on" : "Photos paused");
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
            <div className="text-sm font-extrabold">Crypto (legacy toggle)</div>
            <p className="mt-0.5 text-[11px] text-muted">Prefer the full gateway panel below.</p>
          </div>
          <button
            type="button"
            className="rounded-full border border-line px-3 py-1 text-[11px] font-bold"
            onClick={() => {
              const next = !cryptoOn;
              void saveSiteFlags({ data: { cryptoEnabled: next } }).then((r) => {
                if (r.ok) {
                  setCryptoOn(r.cryptoEnabled);
                  setMsg(r.cryptoEnabled ? "Crypto on" : "Crypto off");
                  setTimeout(() => setMsg(""), 1600);
                }
              });
            }}
          >
            {cryptoOn ? "Hide crypto" : "Show crypto"}
          </button>
        </div>
      </div>
      <GatewayToggles />
      <div className="rounded-xl border border-line bg-panel p-3">
        <div className="text-sm font-extrabold">Listing desks</div>
        <p className="mt-0.5 text-[11px] text-muted">Free → staff review. Paid → checkout then live when webhook confirms.</p>
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
  return <div className="p-4 text-sm text-muted">Payways · use Live break panel for gateway on/off. Keys still in ops.</div>;
}
export function OpsKeysPanel() {
  return <div className="p-4 text-sm text-muted">API keys panel.</div>;
}
export function OpsSeoPanel() {
  return <div className="p-4 text-sm text-muted">SEO panel.</div>;
}
