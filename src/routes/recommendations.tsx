import { createFileRoute } from "@tanstack/react-router";
import { GlobalFilters } from "@/components/finops/GlobalFilters";
import { DataGate } from "@/lib/queries";
import { SavingsFeed } from "@/components/finops/Platform";
import { PageHeader } from "@/components/finops/States";

export const Route = createFileRoute("/recommendations")({
  head: () => ({
    meta: [
      { title: "Recommendations — NimbusOps" },
      { name: "description", content: "Savings actions ranked by impact." },
      { property: "og:title", content: "Recommendations — NimbusOps" },
      { property: "og:description", content: "Savings actions ranked by impact." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RecommendationsPage,
});

function RecommendationsPage() {
  return (
    <>
      <PageHeader title="Recommendations" description="Savings actions ranked by impact" />
      <GlobalFilters />
      <DataGate h="h-72"><SavingsFeed /></DataGate>
    </>
  );
}
