import { createFileRoute } from "@tanstack/react-router";
import { KubernetesWorkspace } from "@/components/finops/Operations";
import { K8sHealth } from "@/components/finops/Platform";
import { Tilt, Topology3D } from "@/components/finops/Insights";
import { GlobalFilters } from "@/components/finops/GlobalFilters";
import { PageHeader } from "@/components/finops/States";
import { DataGate } from "@/lib/queries";
import { PAGE_TABS, PageTabs, TabContent, usePageTab } from "@/components/finops/PageTabs";
import { useState } from "react";
import { DetailDrawer, type Detail } from "@/components/finops/Platform";

export const Route = createFileRoute("/kubernetes")({
  head: () => ({
    meta: [
      { title: "Kubernetes · Fern" },
      { name: "description", content: "Cluster health, namespaces and pod status across EKS, AKS and GKE." },
      { property: "og:title", content: "Kubernetes · Fern" },
      { property: "og:description", content: "Cluster health, namespaces and pod status across EKS, AKS and GKE." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: KubernetesPage,
});

const TABS = PAGE_TABS["/kubernetes"].tabs;

function KubernetesPage() {
  const { tab, setTab } = usePageTab(TABS);
  const [detail, setDetail] = useState<Detail>(null);
  return (
    <>
      <PageHeader title="Kubernetes" description="Cluster cost, health and pod status — derived from the resource dataset." />
      <GlobalFilters />
      <PageTabs tabs={TABS} value={tab} onChange={setTab} ariaLabel="Kubernetes sections" />
      <TabContent tab={tab}>
        {tab === "live" ? (
          <section className="grid gap-6 xl:grid-cols-12">
            <div className="min-w-0 xl:col-span-7"><DataGate h="h-72"><Tilt><Topology3D /></Tilt></DataGate></div>
            <div className="min-w-0 xl:col-span-5"><DataGate h="h-72"><K8sHealth onOpen={setDetail} /></DataGate></div>
          </section>
        ) : (
          <KubernetesWorkspace tab={tab} />
        )}
      </TabContent>
      <DetailDrawer detail={detail} onClose={() => setDetail(null)} />
    </>
  );
}
