import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal-page";
import { PRIVACY_LONG } from "@/lib/legal";

export const Route = createFileRoute("/privacy")({
  component: () => (
    <LegalPage
      title="Privacy"
      lede="Join is a username and a password. We do not ask for your real name, BVN, bank, or home address to open an account."
      body={PRIVACY_LONG}
    />
  ),
});
