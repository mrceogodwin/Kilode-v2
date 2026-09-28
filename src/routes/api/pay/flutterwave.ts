import { createFileRoute } from "@tanstack/react-router";
import { handleFlutterwaveWebhook } from "@/lib/pay-gateways";

export const Route = createFileRoute("/api/pay/flutterwave")({
  server: {
    handlers: {
      POST: async ({ request }) => handleFlutterwaveWebhook(await request.text(), request.headers.get("verif-hash") || ""),
    },
  },
});
