import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { confirmCheckout } from "@/lib/pay-gateways";
import { OfficialLockup } from "@/components/brand-lockup";

export const Route = createFileRoute("/pay/done")({ component: PayDone });

function PayDone() {
  const [msg, setMsg] = useState("Checking the payment…");
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const ref = q.get("reference") || q.get("trxref") || q.get("tx_ref") || q.get("ref") || "";
    if (!ref) {
      setMsg("No payment reference on this link.");
      return;
    }
    void confirmCheckout({ data: { reference: ref } })
      .then((r) => {
        if (r.ok) {
          try {
            localStorage.setItem("kilode-pay-ok", r.reference);
          } catch {
            /* private mode */
          }
          setMsg("Payment confirmed. Close this window and tap I've paid on Kilode.");
        } else setMsg(r.reason);
      })
      .catch(() => setMsg("Could not check the payment. Go back and tap I've paid."));
  }, []);
  return (
    <main className="grid min-h-dvh place-items-center bg-bg px-6 text-fg">
      <div className="max-w-sm text-center">
        <OfficialLockup className="kilode-lockup mx-auto h-8 w-[148px]" />
        <h1 className="mt-4 text-xl font-extrabold">Payment</h1>
        <p className="mt-2 text-sm leading-6 text-muted">{msg}</p>
        <a href="/" className="btn-join mt-4 inline-block rounded-xl px-4 py-2 text-sm font-bold">
          Back to Kilode
        </a>
      </div>
    </main>
  );
}
