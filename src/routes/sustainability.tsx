import { createFileRoute } from "@tanstack/react-router";
import { GlobalFilters } from "@/components/finops/GlobalFilters";
import { DataGate } from "@/lib/queries";
import { GreenOps } from "@/components/finops/Insights";
import { PageHeader } from "@/components/finops/States";

export const Route = createFileRoute("/sustainability")({
  head: () => ({
    meta: [
      { title: "Sustainability — NimbusOps" },
      { name: "description", content: "Estimated carbon footprint by region and provider — figures are estimates." },
      { property: "og:title", content: "Sustainability — NimbusOps" },
      { property: "og:description", content: "Estimated carbon footprint by region and provider — figures are estimates." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SustainabilityPage,
});

function SustainabilityPage() {
  return (
    <>
      <PageHeader title="Sustainability" description="Estimated carbon footprint by region and provider — figures are estimates" />
      <GlobalFilters />
      <div className="max-w-2xl"><DataGate h="h-72"><GreenOps /></DataGate></div>
    </>
  );
}
