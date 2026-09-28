import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal-page";
import { ABOUT_LONG } from "@/lib/legal";

export const Route = createFileRoute("/about")({
  component: () => (
    <LegalPage
      title="About"
      lede="Kilode is a community and media app. Feeds, chat, music links, events, jobs, market, rent, and ads live here. It is not a bank, a casino, or a streaming host."
      body={ABOUT_LONG}
    />
  ),
});
