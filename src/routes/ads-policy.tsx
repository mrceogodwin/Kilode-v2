import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal-page";
import { ADS_LONG } from "@/lib/legal";

export const Route = createFileRoute("/ads-policy")({
  component: () => (
    <LegalPage
      title="Ads & crypto"
      lede="You pay from the wallet shown in the app, paste the transaction hash, and staff still approve before anything goes live."
      body={ADS_LONG}
    />
  ),
});
