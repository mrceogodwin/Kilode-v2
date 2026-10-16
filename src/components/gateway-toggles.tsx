import { useEffect, useState } from "react";
import { getPublicSite, saveSiteFlags } from "@/lib/site-server";

/** Super-admin: turn payment methods on/off without deleting keys. */
export function GatewayToggles() {
  const [paystackOn, setPaystackOn] = useState(true);
  const [flutterOn, setFlutterOn] = useState(true);
  const [bachsOn, setBachsOn] = useState(true);
  const [cryptoOn, setCryptoOn] = useState(true);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    void getPublicSite()
      .then((s) => {
        setPaystackOn(s.paystackEnabled !== false);
        setFlutterOn(s.flutterwaveEnabled !== false);
        setBachsOn(s.bachsEnabled !== false);
        setCryptoOn(s.cryptoEnabled !== false);
      })
      .catch(() => undefined);
  }, []);

  function toggle(flag: "paystackEnabled" | "flutterwaveEnabled" | "bachsEnabled" | "cryptoEnabled", next: boolean, label: string, set: (v: boolean) => void) {
    void saveSiteFlags({ data: { [flag]: next } }).then((r) => {
      if (r.ok) {
        set(Boolean((r as any)[flag]));
        setMsg(`${label} ${next ? "on" : "off"}`);
        setTimeout(() => setMsg(""), 1600);
      }
    });
  }

  const rows: { label: string; on: boolean; flag: "paystackEnabled" | "flutterwaveEnabled" | "bachsEnabled" | "cryptoEnabled"; set: (v: boolean) => void }[] = [
    { label: "Paystack", on: paystackOn, flag: "paystackEnabled", set: setPaystackOn },
    { label: "Flutterwave", on: flutterOn, flag: "flutterwaveEnabled", set: setFlutterOn },
    { label: "Bachs.io", on: bachsOn, flag: "bachsEnabled", set: setBachsOn },
    { label: "Crypto (NOWPayments)", on: cryptoOn, flag: "cryptoEnabled", set: setCryptoOn },
  ];

  return (
    <div className="rounded-xl border border-line bg-panel p-3 space-y-3">
      <div>
        <div className="text-sm font-extrabold">Payment gateways</div>
        <p className="mt-0.5 text-[11px] text-muted">
          Switch methods off without deleting keys. Checkout only shows gateways that are configured and turned on.
        </p>
      </div>
      {rows.map((row) => (
        <div key={row.flag} className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-2">
          <div className="min-w-0">
            <div className="text-[13px] font-bold">{row.label}</div>
            <p className="text-[11px] text-muted">{row.on ? "Visible at checkout" : "Hidden from checkout"}</p>
          </div>
          <button
            type="button"
            className={`rounded-full px-3 py-1 text-[11px] font-bold ${
              row.on ? "bg-[#1877F2] text-white" : "border border-line text-muted"
            }`}
            onClick={() => toggle(row.flag, !row.on, row.label, row.set)}
          >
            {row.on ? "On" : "Off"}
          </button>
        </div>
      ))}
      {msg ? <p className="text-[11px] text-lime-2">{msg}</p> : null}
    </div>
  );
}
