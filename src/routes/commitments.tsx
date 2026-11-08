import { createFileRoute } from "@tanstack/react-router";
import { GlobalFilters } from "@/components/finops/GlobalFilters";
import { CardBoundary, PageHeader } from "@/components/finops/States";
import { CommitmentsWorkspace } from "@/components/finops/Commitments";
import { PAGE_TABS, PageTabs, TabContent, usePageTab } from "@/components/finops/PageTabs";

export const Route = createFileRoute("/commitments")({
  head: () => ({ meta: [{ title: "Commitments · Fern" }, { name: "description", content: "Fern — Savings plans and reservations." }, { property: "og:title", content: "Commitments · Fern" }, { property: "og:description", content: "Fern — Savings plans and reservations." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: WorkspacePage,
});
function WorkspacePage() {
  const tabs = PAGE_TABS["/commitments"].tabs;
  const { tab, setTab } = usePageTab(tabs);
  return <><PageHeader title="Commitments" description="Savings plans and reservations" /><GlobalFilters /><PageTabs tabs={tabs} value={tab} onChange={setTab} ariaLabel="Commitments sections" /><TabContent tab={tab}><CardBoundary label="Commitments"><CommitmentsWorkspace tab={tab} /></CardBoundary></TabContent></>;
}
