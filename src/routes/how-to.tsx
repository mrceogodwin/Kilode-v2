import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal-page";
import { HowToGuide } from "@/components/legal-shots";

export const Route = createFileRoute("/how-to")({
  component: () => (
    <LegalPage title="How to use" lede="Pick the account type that matches what you came to do. You cannot switch it later. Staff tools are not a public type.">
      <HowToGuide />
    </LegalPage>
  ),
});
