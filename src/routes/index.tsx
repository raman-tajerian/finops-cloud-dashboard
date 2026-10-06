import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { BudgetForecast, ResourceTable } from "@/components/finops/Widgets";
import { AnomalyStrip, CostDistribution, DetailDrawer, K8sHealth, SavingsFeed, type Detail } from "@/components/finops/Platform";
import { GlobalFilters } from "@/components/finops/GlobalFilters";
import { DataGate, useDashboard } from "@/lib/queries";
import { CardBoundary } from "@/components/finops/States";
import { CostTrendCard, OverviewKpis, TopMovers } from "@/components/finops/Overview";
import { AnomalyForecast, GreenOps, Tilt, Topology3D, WhatIfSimulator } from "@/components/finops/Insights";
import { AnomalyAnalyst } from "@/components/finops/AnomalyAnalyst";

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
  const [detail, setDetail] = useState<Detail>(null);
  return (
    <>
      <div className="reveal-up"><CardBoundary label="Anomaly banner"><AnomalyStrip onOpen={setDetail} /></CardBoundary></div>
      <div className="reveal-up reveal-delay-1 flex flex-wrap items-end justify-between gap-4">
        <div className="pt-6"><p className="text-xs text-muted-foreground">Cloud & FinOps platform · <ResourceCount /> resources</p><h1 className="mt-2 font-display text-[32px] font-normal leading-tight tracking-tight">Good afternoon, Raman.</h1></div>
      </div>
      <div className="reveal-up reveal-delay-2"><GlobalFilters /></div>
      <div className="reveal-up reveal-delay-3"><DataGate h="h-16"><OverviewKpis /></DataGate></div>
      <section className="reveal-up reveal-delay-4 grid gap-4 xl:grid-cols-12">
        <div className="min-w-0 xl:col-span-8"><DataGate h="h-72"><CostTrendCard /></DataGate></div>
        <div className="min-w-0 xl:col-span-4"><DataGate h="h-72"><TopMovers /></DataGate></div>
        <div className="min-w-0 xl:col-span-8"><DataGate h="h-72"><CostDistribution /></DataGate></div>
        <div className="min-w-0 xl:col-span-4"><DataGate h="h-72"><K8sHealth onOpen={setDetail} /></DataGate></div>
        <div className="min-w-0 xl:col-span-7"><DataGate h="h-72"><Tilt><Topology3D /></Tilt></DataGate></div>
        <div className="min-w-0 xl:col-span-5"><DataGate h="h-72"><Tilt><GreenOps /></Tilt></DataGate></div>
        <div className="min-w-0 xl:col-span-7"><DataGate h="h-64"><Tilt><AnomalyForecast /></Tilt></DataGate></div>
        <div className="min-w-0 xl:col-span-5"><CardBoundary label="Scenario simulator"><Tilt><WhatIfSimulator /></Tilt></CardBoundary></div>
        <div className="min-w-0 xl:col-span-12"><DataGate h="h-24"><AnomalyAnalyst /></DataGate></div>
        <div className="min-w-0 xl:col-span-8"><DataGate h="h-72"><SavingsFeed /></DataGate></div>
        <div className="min-w-0 xl:col-span-4"><CardBoundary label="Budget forecast"><BudgetForecast /></CardBoundary></div>
        <div className="min-w-0 xl:col-span-12"><DataGate h="h-72"><ResourceTable /></DataGate></div>
      </section>
      <DetailDrawer detail={detail} onClose={() => setDetail(null)} />
    </>
  );
}

function ResourceCount() {
  const n = useDashboard().data?.resources.length;
  return <>{n ?? "…"}</>;
}
