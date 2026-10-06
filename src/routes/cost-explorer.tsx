import { createFileRoute } from "@tanstack/react-router";
import { CostDistribution } from "@/components/finops/Platform";
import { AnomalyForecast } from "@/components/finops/Insights";
import { PageHeader } from "@/components/finops/States";

export const Route = createFileRoute("/cost-explorer")({
  head: () => ({
    meta: [
      { title: "Cost Explorer — NimbusOps" },
      { name: "description", content: "Slice spend by service, region and provider." },
      { property: "og:title", content: "Cost Explorer — NimbusOps" },
      { property: "og:description", content: "Slice spend by service, region and provider." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CostExplorerPage,
});

function CostExplorerPage() {
  return (
    <>
      <PageHeader title="Cost Explorer" description="Slice spend by service, region and provider" />
      <div className="grid gap-6"><CostDistribution scale={1} providers={["AWS","Azure","GCP"]} /><AnomalyForecast scale={1} /></div>
    </>
  );
}
