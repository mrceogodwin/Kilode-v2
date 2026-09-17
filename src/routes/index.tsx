import { createFileRoute } from "@tanstack/react-router";
import { QonvoApp } from "@/components/qonvo-app";
import { seoHead } from "@/lib/seo";

export const Route = createFileRoute("/")({
  head: () => seoHead({ path: "/" }),
  component: Home,
});

function Home() {
  return <QonvoApp />;
}
