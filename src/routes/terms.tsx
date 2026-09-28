import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal-page";
import { TERMS_LONG } from "@/lib/legal";

export const Route = createFileRoute("/terms")({
  component: () => (
    <LegalPage
      title="Terms of Use"
      lede="This is the contract between you and the operator of Kilode. Creating an account, ticking the boxes on Join, or using the app means you agree."
      body={TERMS_LONG}
    />
  ),
});
