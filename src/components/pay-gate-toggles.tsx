import { useEffect, useState } from "react";
import { getPublicSite, saveSiteFlags } from "@/lib/site-server";
import { listPayMethods } from "@/lib/pay-gateways";
import { listAiKeys, saveAiKey } from "@/lib/keys-server";

type Gates = {
  paystackEnabled: boolean;
  flutterwaveEnabled: boolean;
  cryptoEnabled: boolean;
  bachsEnabled: boolean;
};

/** Super admin: turn each payment rail on/off + Bachs key. */
export function PayGateToggles() {
  const [gates, setGates] = useState<Gates>({
    paystackEnabled: true,
    flutterwaveEnabled: true,
    cryptoEnabled: true,
    bachsEnabled: true,
  });
  const [live, setLive] = useState({ paystack: false, flutterwave: false, nowpayments: false, bachs: false });
  const [bachsKey, setBachsKey] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  function load() {
    void getPublicSite()
      .then((s) => {
        setGates({
          paystackEnabled: s.paystackEnabled !== false,
          flutterwaveEnabled: s.flutterwaveEnabled !== false,
          cryptoEnabled: s.cryptoEnabled !== false,
          bachsEnabled: s.bachsEnabled !== false,
        });
      })
      .catch(() => undefined);
    void listPayMethods()
      .then((m) => {
        setLive({
          paystack: Boolean(m.paystack),
          flutterwave: Boolean(m.flutterwave),
          nowpayments: Boolean(m.nowpayments),
          bachs: Boolean((m as { bachs?: boolean }).bachs),
        });
      })
      .catch(() => undefined);
    void listAiKeys()
      .then((rows) => {
        const row = rows.find((r) => r.id === "bachs_secret");
        if (row) setLive((L) => ({ ...L, bachs: Boolean(row.set) }));
      })
      .catch(() => undefined);
  }

  useEffect(() => {
    load();
  }, []);

  function toggle(key: keyof Gates) {
    const next = !gates[key];
    setBusy(true);
    void saveSiteFlags({ data: { [key]: next } })
      .then((r) => {
        if (r.ok) {
          setGates((g) => ({ ...g, [key]: next }));
          setMsg(`${key.replace("Enabled", "")} ${next ? "on" : "off"}`);
          setTimeout(() => setMsg(""), 1600);
        }
      })
      .finally(() => setBusy(false));
  }

  const rows: { key: keyof Gates; title: string; sub: string; hasKey: boolean }[] = [
    { key: "paystackEnabled", title: "Paystack", sub: "Cards & local NGN", hasKey: live.paystack },
    { key: "flutterwaveEnabled", title: "Flutterwave", sub: "Cards & local rails", hasKey: live.flutterwave },
    { key: "bachsEnabled", title: "Bachs.io", sub: "Card, bank, MoMo, crypto in one checkout", hasKey: live.bachs },
    { key: "cryptoEnabled", title: "Crypto (NOWPayments)", sub: "USDT / open crypto invoice", hasKey: live.nowpayments },
  ];

  return (
    <div className="md:col-span-2 min-w-0 max-w-full space-y-3">
      <div className="raised space-y-3 rounded-2xl border border-[#1877F2]/25 p-4">
        <div>
          <div className="text-[10px] font-bold tracking-[0.16em] text-[#1877F2]">SUPER · PAYMENT RAILS</div>
          <h3 className="text-lg font-extrabold text-[#172033]">Gateways on / off</h3>
          <p className="mt-1 text-[12px] leading-snug text-[#64748B]">
            Turn off a rail anytime. Checkout only shows rails that are <b>on</b> and have a secret key saved.
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {rows.map((r) => {
            const on = gates[r.key];
            return (
              <div key={r.key} className="flex items-start justify-between gap-2 rounded-xl border border-[#E7ECF2] bg-white p-3">
                <div className="min-w-0">
                  <div className="text-[14px] font-bold text-[#172033]">{r.title}</div>
                  <p className="text-[11px] text-[#64748B]">{r.sub}</p>
                  <p className="mt-1 text-[10px] font-semibold text-[#94A3B8]">{r.hasKey ? "Key saved" : "No key yet"}</p>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => toggle(r.key)}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-bold disabled:opacity-50 ${
                    on ? "bg-[#1877F2] text-white" : "border border-[#E7ECF2] text-[#64748B]"
                  }`}
                >
                  {on ? "On" : "Off"}
                </button>
              </div>
            );
          })}
        </div>

        <div className="rounded-xl border border-[#E7ECF2] bg-[#F7F9FC] p-3">
          <div className="text-[13px] font-bold text-[#172033]">Bachs API key</div>
          <p className="mt-0.5 text-[11px] text-[#64748B]">
            From docs.bachs.io — sandbox <code className="text-[10px]">sk_sandbox_…</code> or live <code className="text-[10px]">sk_live_…</code>. Or set env <code className="text-[10px]">BACHS_API_KEY</code>.
          </p>
          <input
            value={bachsKey}
            onChange={(e) => setBachsKey(e.target.value)}
            type="password"
            autoComplete="off"
            placeholder="sk_sandbox_… or sk_live_…"
            className="mt-2 w-full rounded-lg border border-[#E7ECF2] bg-white px-3 py-2 text-[14px] outline-none focus:border-[#1877F2]"
          />
          <button
            type="button"
            className="mt-2 rounded-full bg-[#1877F2] px-4 py-2 text-[12px] font-bold text-white"
            onClick={() => {
              void saveAiKey({ data: { id: "bachs_secret", value: bachsKey.trim() } }).then((r) => {
                setMsg(r.ok ? "Bachs key saved" : "Could not save");
                if (r.ok) setBachsKey("");
                load();
                setTimeout(() => setMsg(""), 1600);
              });
            }}
          >
            Save Bachs key
          </button>
          <p className="mt-2 break-all text-[10px] text-[#94A3B8]">Webhook (later): https://kilode.ng/api/pay/bachs</p>
        </div>

        {msg ? <p className="text-[12px] font-semibold text-[#1877F2]">{msg}</p> : null}
      </div>
    </div>
  );
}
