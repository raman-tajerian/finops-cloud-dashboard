import { createFileRoute } from "@tanstack/react-router";
import { FjordLogo, HeroShapes } from "@/components/brand";
import { useState } from "react";
import { TopResourcesCard } from "@/components/finops/Widgets";
import { BudgetForecast, WhatIfSimulator } from "@/components/finops/Operations";
import { AnomalyStrip, CostDistribution, DetailDrawer, K8sHealth, SavingsFeed, type Detail } from "@/components/finops/Platform";
import { GlobalFilters } from "@/components/finops/GlobalFilters";
import { DataGate, useDashboard } from "@/lib/queries";
import { CardBoundary } from "@/components/finops/States";
import { CostTrendCard, OverviewKpis, TopMovers } from "@/components/finops/Overview";
import { AnomalyForecast, GreenOps, Tilt, Topology3D } from "@/components/finops/Insights";
import { AnomalyAnalyst } from "@/components/finops/AnomalyAnalyst";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Fern — Multi-cloud cost and sustainability dashboard" },
      { name: "description", content: "Multi-cloud cost and sustainability dashboard" },
      { property: "og:title", content: "Fern — Multi-cloud cost and sustainability dashboard" },
      { property: "og:description", content: "Multi-cloud cost and sustainability dashboard" },
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
      <div className="reveal-up reveal-delay-1 relative isolate flex flex-wrap items-end justify-between gap-4 overflow-hidden rounded-[1.25rem] px-1 pb-2">
        <HeroShapes />
        <div className="relative z-10 pt-6"><FjordLogo size={24} className="mb-3" /><p className="text-xs text-muted-foreground">Cloud & FinOps platform · <ResourceCount /> resources</p><h1 className="mt-2 font-display text-[32px] font-normal leading-tight tracking-tight">Good afternoon, Raman.</h1></div>
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
        <div className="min-w-0 xl:col-span-12"><CardBoundary label="Top resources"><TopResourcesCard /></CardBoundary></div>
      </section>
      <DetailDrawer detail={detail} onClose={() => setDetail(null)} />
    </>
  );
}

function ResourceCount() {
  const n = useDashboard().data?.resources.length;
  return <>{n ?? "…"}</>;
}
