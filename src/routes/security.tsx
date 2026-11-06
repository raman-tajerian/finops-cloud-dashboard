import { createFileRoute, stripSearchParams, useNavigate, type SearchSchemaInput } from "@tanstack/react-router";
import { fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { GlobalFilters } from "@/components/finops/GlobalFilters";
import { CardBoundary, PageHeader } from "@/components/finops/States";
import { SecurityWorkspace, type SecSearch } from "@/components/finops/Security";
import { PAGE_TABS, PageTabs, TabContent, usePageTab } from "@/components/finops/PageTabs";

const TABS = PAGE_TABS["/security"].tabs;

const defaults: SecSearch = { sev: "All", fstatus: "All", prov: "All", rule: "All", q: "", sort: "sev-asc", finding: "" };
const schema = z.object({
  sev: fallback(z.string(), "All").default("All"),
  fstatus: fallback(z.string(), "All").default("All"),
  prov: fallback(z.string(), "All").default("All"),
  rule: fallback(z.string(), "All").default("All"),
  q: fallback(z.string(), "").default(""),
  sort: fallback(z.string(), "sev-asc").default("sev-asc"),
  finding: fallback(z.string(), "").default(""),
});

export const Route = createFileRoute("/security")({
  validateSearch: (search: Partial<z.infer<typeof schema>> & SearchSchemaInput) => schema.parse(search),
  search: { middlewares: [stripSearchParams(defaults)] },
  head: () => ({
    meta: [
      { title: "Security & Compliance · Fern" },
      { name: "description", content: "Fern — Multi-cloud cost and sustainability dashboard. Findings and compliance posture across clouds." },
      { property: "og:title", content: "Security & Compliance · Fern" },
      { property: "og:description", content: "Fern — Multi-cloud cost and sustainability dashboard. Findings and compliance posture across clouds." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SecurityPage,
});

function SecurityPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/security" });
  const setSearch = (p: Partial<SecSearch>) => navigate({ search: (prev) => ({ ...prev, ...p }), replace: true, resetScroll: false });
  const { tab, setTab } = usePageTab(TABS);
  return (
    <>
      <PageHeader title="Security & Compliance" description="Findings and compliance posture across clouds" />
      <GlobalFilters />
      <PageTabs tabs={TABS} value={tab} onChange={setTab} ariaLabel="Security sections" />
      <TabContent tab={tab}>
        <CardBoundary label="Security"><SecurityWorkspace search={search} setSearch={setSearch} tab={tab} /></CardBoundary>
      </TabContent>
    </>
  );
}
