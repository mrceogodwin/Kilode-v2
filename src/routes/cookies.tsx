import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal-page";
import { COOKIES_LONG } from "@/lib/legal";

export const Route = createFileRoute("/cookies")({
  component: () => (
    <LegalPage
      title="Cookies"
      lede="A session cookie keeps you signed in. The light or night skin is stored on this device. Kilode does not drop its own ad pixel."
      body={COOKIES_LONG}
    />
  ),
});
