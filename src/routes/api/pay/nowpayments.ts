import { createFileRoute } from "@tanstack/react-router";
import { handleNowPaymentsWebhook } from "@/lib/pay-gateways";

export const Route = createFileRoute("/api/pay/nowpayments")({
  server: {
    handlers: {
      POST: async ({ request }) => handleNowPaymentsWebhook(await request.text(), request.headers.get("x-nowpayments-sig") || ""),
    },
  },
});
