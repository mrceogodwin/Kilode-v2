import { useEffect, useState } from "react";
import { GatewayPay } from "@/components/pay-checkout";
import { Tip } from "@/components/tip";
import { listPayMethods, submitVerification } from "@/lib/pay-gateways";
import type { PayProvider } from "@/lib/pay-money";
import type { AccountKind } from "@/lib/qonvo-data";

const PERKS: Record<string, string[]> = {
  artist: ["Badge on your name", "Badge on your posts", "Artist mark on the music desk"],
  writer: ["Badge on your name", "Badge on your stories"],
  advertiser: ["Badge on the brand", "Badge on your posts"],
  job_poster: ["Badge on the company", "Badge on roles you post"],
  job_seeker: ["Badge on your name", "Badge on applications"],
  vendor: ["Badge on your shop", "Badge on listings"],
  renter: ["Badge on your name", "Badge on spaces"],
  brand: ["Badge on the brand", "Badge on posts"],
  cinema: ["Badge on your name", "Badge on titles you submit"],
  member: ["Badge on your name", "Badge on your posts"],
};

export function VerifyDesk({ kind, onClose }: { kind: AccountKind | string; onClose?: () => void }) {
  const [step, setStep] = useState(0);
  const [payWith, setPayWith] = useState<PayProvider>("paystack");
  const [gate, setGate] = useState<{ paystack: boolean; flutterwave: boolean; nowpayments: boolean; ngnPerUsd: number; verifyUsd: number } | null>(null);
  const [note, setNote] = useState("");
  const [done, setDone] = useState(false);
  useEffect(() => {
    void listPayMethods().then((r) => setGate(r)).catch(() => setGate(null));
  }, []);
  const perks = PERKS[kind] || PERKS.member;
  const usd = gate?.verifyUsd ?? 5;
  const ready = payWith === "paystack" ? Boolean(gate?.paystack) : payWith === "flutterwave" ? Boolean(gate?.flutterwave) : Boolean(gate?.nowpayments);
  return (
    <div className="verify-desk" role="dialog" aria-label="Get verified">
      <div className="verify-bar">
        <button type="button" onClick={() => (onClose ? onClose() : window.history.back())}>Back</button>
        <b>Verified</b>
        <span>{done ? 4 : step + 1}/4</span>
      </div>
      {done || step === 3 ? (
        <div className="verify-step">
          <strong>{done ? "Badge is on." : "Waiting on payment."}</strong>
          <p>{done ? "Your name now carries the Kilode mark." : note || "Finish payment. The badge turns on only after the provider confirms it."}</p>
          <button type="button" className="verify-next" onClick={() => (onClose ? onClose() : window.location.reload())}>Done</button>
        </div>
      ) : step === 0 ? (
        <div className="verify-step">
          <div className="verify-faces">
            <img src="/brand/verify-woman.jpg" alt="" />
            <img src="/brand/verify-man.jpg" alt="" />
          </div>
          <strong>Kilode Verified</strong>
          <p>One mark. Every account type. <Tip text="The badge is the paid Kilode mark. It does not invent followers, plays, or reach." /></p>
          <button type="button" className="verify-next" onClick={() => setStep(1)}>Next</button>
        </div>
      ) : step === 1 ? (
        <div className="verify-step">
          <strong>What you get</strong>
          <ul>
            {perks.map((line) => <li key={line}>{line}</li>)}
          </ul>
          <button type="button" className="verify-next" onClick={() => setStep(2)}>Next</button>
        </div>
      ) : (
        <div className="verify-step">
          <strong>${usd}</strong>
          <div className="verify-pays">
            {(["paystack", "flutterwave", "nowpayments"] as const).map((id) => (
              <button key={id} type="button" className={payWith === id ? "on" : ""} onClick={() => setPayWith(id)}>
                {id === "paystack" ? "Paystack" : id === "flutterwave" ? "Flutterwave" : "Crypto"}
              </button>
            ))}
          </div>
          <GatewayPay
            provider={payWith}
            kind="verify"
            purpose="badge"
            usd={usd}
            rate={gate?.ngnPerUsd ?? 1600}
            ready={ready}
            onPaid={(paid) => {
              void submitVerification({ data: { reference: paid.reference } }).then((r) => {
                if (r.ok && r.status === "verified") {
                  setDone(true);
                  setStep(3);
                  return;
                }
                setNote(r.ok ? "Paid. Waiting for the badge." : r.reason);
                setStep(3);
              });
            }}
          />
          {!ready ? <p>This provider is not set up yet.</p> : null}
        </div>
      )}
    </div>
  );
}
