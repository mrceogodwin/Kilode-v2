import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal-page";
import { CONTENT_LONG } from "@/lib/legal";

export const Route = createFileRoute("/content")({
  component: () => (
    <LegalPage
      title="Content & liability"
      lede="Posts, chat, music links, cinema submissions, ads, jobs, and listings are user content. Kilode is the venue, not the author."
      body={CONTENT_LONG}
    />
  ),
});
