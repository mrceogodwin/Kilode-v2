import { useEffect, useState } from "react";
import { GatewayPay } from "@/components/pay-checkout";
import { Tip } from "@/components/tip";
import { listPayMethods, submitVerification } from "@/lib/pay-gateways";
import type { PayProvider } from "@/lib/pay-money";
import type { AccountKind } from "@/lib/qonvo-data";

const PERKS: Record<string, string[]> = {
  artist: ["Badge on your name", "Badge on your posts", "Artist mark on Music"],
  writer: ["Badge on your name", "Badge on your stories"],
  advertiser: ["Badge on the brand", "Badge on your posts"],
  job_poster: ["Badge on the company", "Badge on the roles you post"],
  job_seeker: ["Badge on your name", "Badge on applications"],
  vendor: ["Badge on the shop", "Badge on listings"],
  renter: ["Badge on your name", "Badge on spaces"],
  brand: ["Badge on the brand", "Badge on posts"],
  cinema: ["Badge on your name", "Badge on titles"],
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
  const n = done ? 4 : step + 1;
  return (
    <section className="verify-desk" aria-label="Get verified">
      <div className="verify-flag">
        <img src="/kilode-word.png?v=3" alt="" />
        <span>Verified</span>
      </div>
      <div className="verify-top">
        <button type="button" onClick={() => (step > 0 && !done ? setStep(step - 1) : onClose ? onClose() : window.history.back())}>Back</button>
        <i>{n}/4</i>
      </div>
      {done || step === 3 ? (
        <div className="verify-body">
          <strong>{done ? "The badge is on." : "Not confirmed yet."}</strong>
          <p>{done ? "Your name carries the Kilode mark." : note || "The badge turns on only after the provider confirms the payment."}</p>
          <button type="button" className="verify-next" onClick={() => (onClose ? onClose() : window.location.reload())}>Done</button>
        </div>
      ) : step === 0 ? (
        <div className="verify-body">
          <strong>One mark.</strong>
          <p>It sits on your name and your posts. <Tip text="Verification is a paid badge. It does not invent followers, plays, or reach." /></p>
          <button type="button" className="verify-next" onClick={() => setStep(1)}>Next</button>
        </div>
      ) : step === 1 ? (
        <div className="verify-body">
          <strong>For this account</strong>
          <ul>
            {perks.map((line) => <li key={line}>{line}</li>)}
          </ul>
          <button type="button" className="verify-next" onClick={() => setStep(2)}>Next</button>
        </div>
      ) : (
        <div className="verify-body">
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
    </section>
  );
}
