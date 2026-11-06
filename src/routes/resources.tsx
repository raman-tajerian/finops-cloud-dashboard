import { createFileRoute, stripSearchParams, useNavigate, type SearchSchemaInput } from "@tanstack/react-router";
import { z } from "zod";
import { ResourcesWorkspace, type TableSearch } from "@/components/finops/ResourcesTable";
import { Tilt, Topology3D } from "@/components/finops/Insights";
import { GlobalFilters } from "@/components/finops/GlobalFilters";
import { CardBoundary, PageHeader } from "@/components/finops/States";
import { DataGate } from "@/lib/queries";
import { PAGE_TABS, PageTabs, TabContent, usePageTab } from "@/components/finops/PageTabs";

const schema = z.object({
  q: z.string().optional(), sort: z.string().optional(), dir: z.string().optional(),
  page: z.number().optional(), size: z.number().optional(), id: z.string().optional(),
  status: z.string().optional(), service: z.string().optional(), ids: z.string().optional(),
});
const defaults = { q: "", sort: "monthlyCost", dir: "desc", page: 1, size: 25, id: "", status: "All", service: "All", ids: "" };

export const Route = createFileRoute("/resources")({
  validateSearch: (search: Partial<z.infer<typeof schema>> & SearchSchemaInput) => schema.parse(search),
  search: { middlewares: [stripSearchParams(defaults)] },
  head: () => ({
    meta: [
      { title: "Resources · Fern" },
      { name: "description", content: "Every cloud resource with cost, utilization and status." },
      { property: "og:title", content: "Resources · Fern" },
      { property: "og:description", content: "Every cloud resource with cost, utilization and status." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ResourcesPage,
});

const TABS = PAGE_TABS["/resources"].tabs;

function ResourcesPage() {
  const s = Route.useSearch();
  const navigate = useNavigate({ from: "/resources" });
  const { tab, setTab } = usePageTab(TABS);
  const search: TableSearch = { q: s.q ?? "", sort: s.sort ?? "monthlyCost", dir: s.dir ?? "desc", page: s.page ?? 1, size: s.size ?? 25, id: s.id ?? "", status: s.status ?? "All", service: s.service ?? "All", ids: s.ids ?? "" };
  const setSearch = (p: Partial<TableSearch>) => navigate({ search: (prev) => ({ ...prev, ...p }), replace: true, resetScroll: false });

  return (
    <>
      <PageHeader title="Resources" description="Every resource across AWS, Azure and GCP with cost and utilization." />
      <GlobalFilters />
      <PageTabs tabs={TABS} value={tab} onChange={setTab} ariaLabel="Resources sections" />
      <TabContent tab={tab}>
        {tab === "list" && <CardBoundary label="Resources"><ResourcesWorkspace search={search} setSearch={setSearch} /></CardBoundary>}
        {tab === "map" && (
          <div className="grid gap-6">
            <DataGate h="h-72"><Tilt><Topology3D /></Tilt></DataGate>
            <p className="text-xs text-muted-foreground">The map shows the same filtered resources as the list, grouped by provider and region.</p>
          </div>
        )}
        {tab === "idle" && (
          <div className="grid gap-6">
            <p className="rounded-xl bg-secondary px-4 py-3 text-[13px] text-muted-foreground">Showing only resources with status <span className="font-medium text-foreground">Idle</span> — the same set behind the Overview idle-waste figure.</p>
            <CardBoundary label="Idle resources"><ResourcesWorkspace search={search} setSearch={setSearch} presetStatus="Idle" /></CardBoundary>
          </div>
        )}
      </TabContent>
    </>
  );
}
