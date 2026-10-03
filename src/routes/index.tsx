import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Shell } from "@/components/finops/Shell";
import { AlertBanner, Allocation, CostTrend, KpiCards, ResourceTable } from "@/components/finops/Widgets";
import { costTrends, type TimeRange } from "@/lib/finops-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NimbusOps — Multi-Cloud FinOps Dashboard" },
      { name: "description", content: "Track AWS and Azure spend, resources, savings and security in one dashboard." },
      { property: "og:title", content: "NimbusOps — Multi-Cloud FinOps Dashboard" },
      { property: "og:description", content: "Track AWS and Azure spend, resources, savings and security in one dashboard." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const [range, setRange] = useState<TimeRange>("30d");
  const [scanning, setScanning] = useState(false);
  const scan = () => {
    setScanning(true);
    setTimeout(() => { setScanning(false); toast.success("Scan complete — 1,872 resources checked"); }, 2200);
  };
  return (
    <Shell range={range} onRange={setRange} onScan={scan} scanning={scanning}>
      <AlertBanner />
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">Multi-cloud spend and health across AWS & Azure</p>
      </div>
      <KpiCards />
      <section className="space-y-10">
        <CostTrend data={costTrends[range]} />
        <Allocation />
      </section>
      <ResourceTable />
      <Toaster theme="light" />
    </Shell>
  );
}
