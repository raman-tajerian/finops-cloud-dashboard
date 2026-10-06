import { createFileRoute } from "@tanstack/react-router";
import { GlobalFilters } from "@/components/finops/GlobalFilters";
import { DataGate } from "@/lib/queries";
import { K8sHealth } from "@/components/finops/Platform";
import { Topology3D } from "@/components/finops/Insights";
import { PageHeader } from "@/components/finops/States";
import { KubernetesWorkspace } from "@/components/finops/Operations";

export const Route = createFileRoute("/kubernetes")({
  head: () => ({
    meta: [
      { title: "Kubernetes — NimbusOps" },
      { name: "description", content: "Cluster health, utilization and live automation events." },
      { property: "og:title", content: "Kubernetes — NimbusOps" },
      { property: "og:description", content: "Cluster health, utilization and live automation events." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: KubernetesPage,
});

function KubernetesPage() {
  return (
    <>
      <PageHeader title="Kubernetes" description="Cluster health, utilization and live automation events" />
      <GlobalFilters />
      <KubernetesWorkspace />
      <div className="grid gap-6 xl:grid-cols-2"><DataGate h="h-72"><K8sHealth onOpen={() => {}} /></DataGate><DataGate h="h-72"><Topology3D /></DataGate></div>
    </>
  );
}
