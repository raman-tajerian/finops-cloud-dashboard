import { createFileRoute } from "@tanstack/react-router";
import { GlobalFilters } from "@/components/finops/GlobalFilters";
import { CardBoundary, PageHeader } from "@/components/finops/States";
import { NotificationsWorkspace } from "@/components/finops/Notifications";
import { PAGE_TABS, PageTabs, TabContent, usePageTab } from "@/components/finops/PageTabs";

export const Route = createFileRoute("/notifications")({
  head: () => ({ meta: [{ title: "Notifications · Fern" }, { name: "description", content: "Fern — Anomalies, budgets, security and savings updates." }, { property: "og:title", content: "Notifications · Fern" }, { property: "og:description", content: "Fern — Anomalies, budgets, security and savings updates." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: WorkspacePage,
});
function WorkspacePage() {
  const tabs = PAGE_TABS["/notifications"].tabs;
  const { tab, setTab } = usePageTab(tabs);
  return <><PageHeader title="Notifications" description="Anomalies, budgets, security and savings updates" /><GlobalFilters /><PageTabs tabs={tabs} value={tab} onChange={setTab} ariaLabel="Notifications sections" /><TabContent tab={tab}><CardBoundary label="Notifications"><NotificationsWorkspace tab={tab} /></CardBoundary></TabContent></>;
}
