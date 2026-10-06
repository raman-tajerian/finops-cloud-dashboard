import { createFileRoute } from "@tanstack/react-router";
import { ResourceTable } from "@/components/finops/Widgets";
import { PageHeader } from "@/components/finops/States";

export const Route = createFileRoute("/resources")({
  head: () => ({
    meta: [
      { title: "Resources — NimbusOps" },
      { name: "description", content: "Every cloud resource with cost, region and status." },
      { property: "og:title", content: "Resources — NimbusOps" },
      { property: "og:description", content: "Every cloud resource with cost, region and status." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResourcesPage,
});

function ResourcesPage() {
  return (
    <>
      <PageHeader title="Resources" description="Every cloud resource with cost, region and status" />
      <ResourceTable />
    </>
  );
}
