import { createFileRoute } from "@tanstack/react-router";
import { GlobalFilters } from "@/components/finops/GlobalFilters";
import { CardBoundary, PageHeader } from "@/components/finops/States";
import { TeamsWorkspace } from "@/components/finops/Teams";
import { PAGE_TABS, PageTabs, TabContent, usePageTab } from "@/components/finops/PageTabs";

export const Route = createFileRoute("/teams/")({
  head: () => ({ meta: [{ title: "Teams · Fern" }, { name: "description", content: "Fern — Team showback and ownership." }, { property: "og:title", content: "Teams · Fern" }, { property: "og:description", content: "Fern — Team showback and ownership." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: WorkspacePage,
});
function WorkspacePage() {
  const tabs = PAGE_TABS["/teams"].tabs;
  const { tab, setTab } = usePageTab(tabs);
  return <><PageHeader title="Teams" description="Team showback and ownership" /><GlobalFilters /><PageTabs tabs={tabs} value={tab} onChange={setTab} ariaLabel="Teams sections" /><TabContent tab={tab}><CardBoundary label="Teams"><TeamsWorkspace tab={tab} /></CardBoundary></TabContent></>;
}
