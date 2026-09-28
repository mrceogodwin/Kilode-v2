import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal-page";
import { SAFETY_LONG } from "@/lib/legal";

export const Route = createFileRoute("/safety")({
  component: () => (
    <LegalPage
      title="Safety"
      lede="How to use Kilode without handing your password, your ID, or your money to the wrong person."
      body={SAFETY_LONG}
    />
  ),
});
