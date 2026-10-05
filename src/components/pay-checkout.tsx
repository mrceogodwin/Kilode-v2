import { useEffect, useState } from "react";
import { confirmCheckout, listPayMethods, startCheckout } from "@/lib/pay-gateways";
import type { PayProvider } from "@/lib/pay-money";

type PayKind = "ad" | "event" | "verify" | "job" | "market" | "rent" | "cinema" | "push";

export function GatewayPay({
  provider,
  kind,
  purpose,
  usd,
  rate,
  ready,
  onPaid,
}: {
  provider: PayProvider;
  kind: PayKind;
  purpose: string;
  usd: number;
  rate: number;
  ready: boolean;
  onPaid: (paid: { reference: string; provider: PayProvider; amountNgn: number }) => void;
}) {
  const [email, setEmail] = useState("");
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [ref, setRef] = useState("");
  const [ngn, setNgn] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const label = provider === "paystack" ? "Paystack" : provider === "flutterwave" ? "Flutterwave" : "Crypto";
  const quote = usd > 0 && rate > 0 ? usd * rate : 0;
  const priceLabel = provider === "nowpayments" ? `$${usd} in crypto` : `₦${quote.toLocaleString("en-NG")}`;

  async function check(reference: string, quiet = false) {
    const r = await confirmCheckout({ data: { reference } });
    if (!r.ok) {
      if (!quiet) setErr(r.reason);
      return;
    }
    onPaid({ reference: r.reference, provider, amountNgn: r.amountNgn });
    setOpen(false);
    setErr("");
  }

  useEffect(() => {
    if (!open || !ref) return;
    const tick = () => {
      void check(ref, true);
    };
    const timer = window.setInterval(tick, 4000);
    const onStore = (e: StorageEvent) => {
      if (e.key === "kilode-pay-ok" && e.newValue === ref) tick();
    };
    window.addEventListener("storage", onStore);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("storage", onStore);
    };
  }, [open, ref, provider]);

  return (
    <div className="rounded-2xl border border-line bg-panel p-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-sm font-extrabold">{label}</div>
          <p className="text-[11px] text-muted">{ready ? `${priceLabel} for this placement.` : "Not set up yet. Add the secret in Super admin."}</p>
        </div>
      </div>
      <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Receipt email (optional)" className="mt-2 w-full rounded-lg border border-line bg-bg px-3 py-2 text-base" />
      <button
        type="button"
        disabled={!ready || busy}
        className="btn-join mt-2 w-full rounded-xl py-2.5 text-sm font-bold disabled:opacity-50"
        onClick={() => {
          setBusy(true);
          setErr("");
          void startCheckout({ data: { provider, kind, purpose, email } })
            .then((r) => {
              if (!r.ok) {
                setErr(r.reason);
                return;
              }
              setRef(r.reference);
              setUrl(r.url);
              setNgn(r.amountNgn);
              setOpen(true);
              window.open(r.url, "kilode-pay", "popup,width=440,height=760");
            })
            .catch(() => setErr("Could not open checkout."))
            .finally(() => setBusy(false));
        }}
      >
        {busy ? "Opening…" : ready ? `Pay ${priceLabel} with ${label}` : `${label} not connected`}
      </button>
      {err ? <p className="mt-2 text-[12px] text-danger">{err}</p> : null}
      {open ? (
        <div className="mt-3 rounded-xl border border-[#e6c56a]/40 bg-black/40 p-3">
          <p className="text-[12px] leading-5">Finish the payment in the {label} window, then come back. This checks every few seconds.</p>
          <p className="mt-1 text-[11px] text-muted">₦{ngn.toLocaleString("en-NG")} · {ref}</p>
          <div className="mt-2 flex gap-2">
            <button type="button" className="btn-3d rounded-lg px-3 py-1.5 text-[11px] font-bold" onClick={() => void check(ref)}>
              I've paid
            </button>
            <a href={url} target="_blank" rel="noreferrer" className="rounded-lg border border-line px-3 py-1.5 text-[11px] font-bold">
              Open again
            </a>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** Shown after a free-or-paid desk saves a row. Paid rows open checkout and go live on confirm. */
export function DeskPayBox({
  kind,
  purpose,
  usd,
  onLive,
}: {
  kind: "job" | "market" | "rent" | "event" | "cinema";
  purpose: string;
  usd: number;
  onLive: () => void;
}) {
  const [methods, setMethods] = useState<PayProvider[]>(["paystack", "flutterwave"]);
  const [payWith, setPayWith] = useState<PayProvider>("paystack");
  const [rate, setRate] = useState(1600);
  const [ready, setReady] = useState<Record<string, boolean>>({});
  useEffect(() => {
    void listPayMethods()
      .then((m) => {
        const shown: PayProvider[] = ["paystack", "flutterwave"];
        if (m.cryptoEnabled) shown.push("nowpayments");
        setMethods(shown);
        setPayWith((cur) => (shown.includes(cur) ? cur : "paystack"));
        setRate(m.ngnPerUsd);
        setReady({ paystack: m.paystack, flutterwave: m.flutterwave, nowpayments: m.nowpayments });
      })
      .catch(() => undefined);
  }, []);
  const label = (id: PayProvider) => (id === "nowpayments" ? "Crypto" : id === "paystack" ? "Paystack" : "Flutterwave");
  return (
    <div className="space-y-2 rounded-xl border border-[#e6c56a]/35 bg-black/30 p-3">
      <p className="text-[12px] leading-snug">This desk is paid. Pay and it goes live. Staff do not have to approve a paid listing. They can still take a scam down.</p>
      <div className="flex flex-wrap gap-1">
        {methods.map((id) => (
          <button key={id} type="button" onClick={() => setPayWith(id)} className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${payWith === id ? "btn-3d" : "border border-line text-muted"}`}>
            {label(id)}
          </button>
        ))}
      </div>
      <GatewayPay
        provider={payWith}
        kind={kind}
        purpose={purpose}
        usd={usd}
        rate={rate}
        ready={!!ready[payWith]}
        onPaid={() => onLive()}
      />
    </div>
  );
}
