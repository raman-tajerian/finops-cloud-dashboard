import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Shell } from "@/components/finops/Shell";
import { Allocation, BudgetForecast, CostTrend, InfrastructureStatus, KpiCards, ResourceTable, SavingsWorkflow } from "@/components/finops/Widgets";
import { costTrends, type TimeRange } from "@/lib/finops-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NimbusOps — Cloud Cost & Infrastructure" },
      { name: "description", content: "Monitor multi-cloud spend, forecasts, savings and live infrastructure health." },
      { property: "og:title", content: "NimbusOps — Cloud Cost & Infrastructure" },
      { property: "og:description", content: "Monitor multi-cloud spend, forecasts, savings and live infrastructure health." },
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
    window.setTimeout(() => { setScanning(false); toast.success("Scan complete — 1,872 resources checked"); }, 1600);
  };
  return (
    <Shell range={range} onRange={setRange} onScan={scan} scanning={scanning}>
      <div className="flex flex-wrap items-end justify-between gap-4 py-2">
        <div><p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Multi-cloud overview · 1,872 resources</p><h1 className="mt-1 text-3xl font-semibold tracking-tight md:text-5xl">Good afternoon, Raman.</h1></div>
        <p className="max-w-sm text-sm leading-6 text-muted-foreground">Your cloud estate is healthy. Three opportunities need attention this week.</p>
      </div>
      <KpiCards />
      <section className="grid gap-6 xl:grid-cols-12">
        <div className="min-w-0 xl:col-span-8"><CostTrend data={costTrends[range]} /></div>
        <div className="min-w-0 xl:col-span-4"><BudgetForecast /></div>
        <div className="min-w-0 xl:col-span-7"><InfrastructureStatus /></div>
        <div className="min-w-0 xl:col-span-5"><SavingsWorkflow /></div>
        <div className="min-w-0 xl:col-span-5"><Allocation /></div>
        <div className="min-w-0 xl:col-span-7"><ResourceTable /></div>
      </section>
      <Toaster theme="dark" />
    </Shell>
  );
}