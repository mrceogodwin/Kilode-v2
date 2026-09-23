import { createFileRoute } from "@tanstack/react-router";
import { QonvoApp } from "@/components/qonvo-app";
import { EMPTY_PUBLIC_SITE } from "@/components/site-chrome";
import { seoHead } from "@/lib/seo";
import { getPublicSite } from "@/lib/site-server";

export const Route = createFileRoute("/")({
  head: () => seoHead({ path: "/" }),
  loader: async () => {
    const site = await getPublicSite().catch(() => EMPTY_PUBLIC_SITE);
    return { site };
  },
  component: Home,
});

function Home() {
  const { site } = Route.useLoaderData();
  return <QonvoApp initialSite={site} />;
}
