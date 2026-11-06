import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { ExplorerCompare, ExplorerMain, SavedViewsPanel, UnitEconCards, type ExplorerState, type SavedView } from "@/components/finops/Explorer";
import { PAGE_TABS, PageTabs, TabContent, usePageTab } from "@/components/finops/PageTabs";
import { DenseKpis } from "@/components/finops/Platform";
import { AnomalyForecast } from "@/components/finops/Insights";
import { Tilt } from "@/components/finops/Insights";
import { GlobalFilters } from "@/components/finops/GlobalFilters";
import { PageHeader, CardBoundary } from "@/components/finops/States";
import { DataGate } from "@/lib/queries";
import { useSetFilters } from "@/lib/filters";
import type { Filters } from "@/lib/filters";

const viewSchema = z.object({ name: z.string(), filters: z.object({ range: z.string(), providers: z.array(z.string()), env: z.string(), team: z.string() }), state: z.object({ group: z.string(), chart: z.string(), compare: z.boolean() }) });
const explorerSearchSchema = z.object({
  group: z.string().optional(), chart: z.string().optional(), compare: z.boolean().optional(),
  views: z.array(viewSchema).optional(),
});

export const Route = createFileRoute("/cost-explorer")({
  validateSearch: (search: Record<string, unknown> & Partial<z.infer<typeof explorerSearchSchema>>) => explorerSearchSchema.parse(search),
  search: { middlewares: [] },
  head: () => ({
    meta: [
      { title: "Cost Explorer · Fern" },
      { name: "description", content: "Explore cloud spend by service, provider, region and team." },
      { property: "og:title", content: "Cost Explorer · Fern" },
      { property: "og:description", content: "Explore cloud spend by service, provider, region and team." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CostExplorerPage,
});

const TABS = PAGE_TABS["/cost-explorer"].tabs;

function CostExplorerPage() {
  const s = Route.useSearch();
  const navigate = Route.useNavigate();
  const setFilters = useSetFilters();
  const { tab, setTab } = usePageTab(TABS);

  const state: ExplorerState = {
    group: (["service", "provider", "region", "team", "environment", "tag"].includes(s.group ?? "") ? s.group : "service") as ExplorerState["group"],
    chart: (["area", "bar", "line"].includes(s.chart ?? "") ? s.chart : "area") as ExplorerState["chart"],
    compare: s.compare ?? false,
  };
  const views = (s.views ?? []) as SavedView[];
  const setState = (patch: Partial<ExplorerState>, filters?: Filters) =>
    navigate({ search: (prev) => ({ ...prev, ...patch, ...(filters ?? {}) }), replace: true });
  const setViews = (v: SavedView[]) => navigate({ search: (prev) => ({ ...prev, views: v }), replace: true });

  return (
    <>
      <PageHeader title="Cost Explorer" description="Slice spend by service, provider, region, team, environment or tag." />
      <GlobalFilters />
      <PageTabs tabs={TABS} value={tab} onChange={setTab} ariaLabel="Cost Explorer sections" />
      <TabContent tab={tab}>
        {tab === "explore" && <ExplorerMain state={state} setState={setState} />}
        {tab === "compare" && (
          <div className="space-y-6">
            <ExplorerCompare state={state} setState={setState} />
            <DataGate h="h-40"><DenseKpis /></DataGate>
            <DataGate h="h-72"><Tilt><AnomalyForecast /></Tilt></DataGate>
          </div>
        )}
        {tab === "unit-economics" && <UnitEconCards />}
        {tab === "saved-views" && <SavedViewsPanel state={state} views={views} setViews={setViews} setState={(st, f) => { setState(st, f); if (f) setFilters(f); }} />}
      </TabContent>
    </>
  );
}
