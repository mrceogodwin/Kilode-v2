import { createFileRoute } from "@tanstack/react-router";
import { handlePaystackWebhook } from "@/lib/pay-gateways";

export const Route = createFileRoute("/api/pay/paystack")({
  server: {
    handlers: {
      POST: async ({ request }) => handlePaystackWebhook(await request.text(), request.headers.get("x-paystack-signature") || ""),
    },
  },
});
