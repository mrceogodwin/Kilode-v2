import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal-page";
import { RULES_LONG } from "@/lib/legal";

export const Route = createFileRoute("/rules")({
  component: () => (
    <LegalPage
      title="Rules"
      lede="These sit under the Terms. Breaking them can hide a post, mute a handle, or refuse an ad."
      body={RULES_LONG}
    />
  ),
});
