import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Shell } from "@/components/finops/Shell";
import { BudgetForecast, ResourceTable } from "@/components/finops/Widgets";
import { AnomalyStrip, CostDistribution, DenseKpis, DetailDrawer, FilterBar, K8sHealth, SavingsFeed, scaleOf, type Detail, type Filters } from "@/components/finops/Platform";
import type { TimeRange } from "@/lib/finops-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NimbusOps — Cloud & FinOps Management Platform" },
      { name: "description", content: "Multi-cloud spend, anomalies, unit economics, savings and Kubernetes health in one workspace." },
      { property: "og:title", content: "NimbusOps — Cloud & FinOps Management Platform" },
      { property: "og:description", content: "Multi-cloud spend, anomalies, unit economics, savings and Kubernetes health in one workspace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const [range, setRange] = useState<TimeRange>("30d");
  const [scanning, setScanning] = useState(false);
  const [filters, setFilters] = useState<Filters>({ range: "mtd", providers: ["AWS", "Azure", "GCP"], env: "All" });
  const [detail, setDetail] = useState<Detail>(null);
  const scale = scaleOf(filters);
  const scan = () => {
    setScanning(true);
    window.setTimeout(() => { setScanning(false); toast.success("Scan complete — 1,872 resources checked"); }, 1600);
  };
  return (
    <Shell range={range} onRange={setRange} onScan={scan} scanning={scanning}>
      <AnomalyStrip onOpen={setDetail} />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Cloud & FinOps platform · 1,872 resources</p><h1 className="mt-1 text-3xl font-semibold tracking-tight md:text-4xl">Good afternoon, Raman.</h1></div>
      </div>
      <FilterBar filters={filters} onChange={setFilters} />
      <DenseKpis scale={scale} onOpen={setDetail} />
      <section className="grid gap-4 xl:grid-cols-12">
        <div className="min-w-0 xl:col-span-8"><CostDistribution scale={scale} providers={filters.providers} /></div>
        <div className="min-w-0 xl:col-span-4"><K8sHealth onOpen={setDetail} /></div>
        <div className="min-w-0 xl:col-span-8"><SavingsFeed /></div>
        <div className="min-w-0 xl:col-span-4"><BudgetForecast /></div>
        <div className="min-w-0 xl:col-span-12"><ResourceTable /></div>
      </section>
      <DetailDrawer detail={detail} onClose={() => setDetail(null)} />
      <Toaster theme="dark" />
    </Shell>
  );
}
