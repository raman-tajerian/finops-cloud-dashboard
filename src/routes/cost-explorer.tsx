import { createFileRoute, stripSearchParams, useNavigate } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { useState } from "react";
import { GlobalFilters } from "@/components/finops/GlobalFilters";
import { DataGate } from "@/lib/queries";
import { DenseKpis, DetailDrawer, type Detail } from "@/components/finops/Platform";
import { AnomalyForecast, Tilt } from "@/components/finops/Insights";
import { CardBoundary, PageHeader, SectionHeading } from "@/components/finops/States";
import { ExplorerCompare, ExplorerMain, SavedViewsPanel, UnitEconCards, type ExplorerState, type SavedView } from "@/components/finops/Explorer";
import { PAGE_TABS, PageTabs, TabContent, usePageTab } from "@/components/finops/PageTabs";
import type { Filters } from "@/lib/filters";

const defaults = { group: "service", chart: "area", compare: false, views: "" } as const;
const schema = z.object({
  group: fallback(z.enum(["service", "provider", "region", "team", "environment", "tag"]), "service").default("service"),
  chart: fallback(z.enum(["area", "bar", "line"]), "area").default("area"),
  compare: fallback(z.boolean(), false).default(false),
  views: fallback(z.string(), "").default(""),
});

function decodeViews(raw: string): SavedView[] {
  if (!raw || raw.length > 6000) return [];
  try {
    const value: unknown = JSON.parse(decodeURIComponent(raw));
    if (!Array.isArray(value)) return [];
    return value.filter((v): v is SavedView => typeof v === "object" && v !== null && typeof v.name === "string" && typeof v.state === "object" && v.state !== null && typeof v.filters === "object" && v.filters !== null).slice(-8);
  } catch { return []; }
}

export const Route = createFileRoute("/cost-explorer")({
  validateSearch: zodValidator(schema),
  search: { middlewares: [stripSearchParams(defaults)] },
  head: () => ({
    meta: [
      { title: "Cost Explorer · Fern" },
      { name: "description", content: "Group spend by service, provider, region, team, environment or tag and compare with the previous period." },
      { property: "og:title", content: "Cost Explorer · Fern" },
      { property: "og:description", content: "Group spend by service, provider, region, team, environment or tag and compare with the previous period." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CostExplorerPage,
});

const TABS = PAGE_TABS["/cost-explorer"].tabs;

function CostExplorerPage() {
  const s = Route.useSearch();
  const navigate = useNavigate({ from: "/cost-explorer" });
  const [detail, setDetail] = useState<Detail>(null);
  const { tab, setTab } = usePageTab(TABS);
  const state: ExplorerState = { group: s.group, chart: s.chart, compare: s.compare };
  const setState = (p: Partial<ExplorerState>, f?: Filters) => navigate({ search: (prev) => ({ ...prev, ...(f ?? {}), ...p }), replace: true, resetScroll: false });
  const views = decodeViews(s.views);
  const setViews = (next: SavedView[]) => navigate({ to: ".", search: (prev) => ({ ...prev, views: encodeURIComponent(JSON.stringify(next)) }), replace: true, resetScroll: false });

  return (
    <>
      <PageHeader title="Cost Explorer" description="Slice spend any way you need and compare it with the previous period" />
      <GlobalFilters />
      <PageTabs tabs={TABS} value={tab} onChange={setTab} ariaLabel="Cost Explorer sections" />
      <TabContent tab={tab}>
        {tab === "explore" && <CardBoundary label="Cost explorer"><ExplorerMain state={state} setState={setState} /></CardBoundary>}
        {tab === "compare" && (
          <div className="space-y-6">
            <CardBoundary label="Compare periods"><ExplorerCompare state={state} setState={setState} /></CardBoundary>
            <SectionHeading title="Spend details" description="Breakdown cards — click one for the full detail" />
            <DataGate h="h-16"><DenseKpis onOpen={setDetail} /></DataGate>
            <DataGate h="h-64"><Tilt><AnomalyForecast /></Tilt></DataGate>
          </div>
        )}
        {tab === "unit-economics" && <CardBoundary label="Unit economics"><UnitEconCards /></CardBoundary>}
        {tab === "saved-views" && <CardBoundary label="Saved views"><SavedViewsPanel state={state} views={views} setViews={setViews} setState={setState} /></CardBoundary>}
      </TabContent>
      <DetailDrawer detail={detail} onClose={() => setDetail(null)} />
    </>
  );
}
