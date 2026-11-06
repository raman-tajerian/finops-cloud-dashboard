import { createFileRoute } from "@tanstack/react-router";
import { FjordLogo } from "@/components/brand";
import { CardBoundary, PageHeader } from "@/components/finops/States";
import { ReportsWorkspace } from "@/components/finops/Reports";
import { PAGE_TABS, PageTabs, TabContent, usePageTab } from "@/components/finops/PageTabs";

const TABS = PAGE_TABS["/reports"].tabs;

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Reports · Fern" },
      { name: "description", content: "Fern — Multi-cloud cost and sustainability dashboard. Generate, download and schedule cost reports." },
      { property: "og:title", content: "Reports · Fern" },
      { property: "og:description", content: "Fern — Multi-cloud cost and sustainability dashboard. Generate, download and schedule cost reports." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ReportsPage,
});

function ReportsPage() {
  const { tab, setTab } = usePageTab(TABS);
  return (
    <>
      <FjordLogo size={32} />
      <PageHeader title="Reports" description="Generate, download and schedule cost reports" />
      <PageTabs tabs={TABS} value={tab} onChange={setTab} ariaLabel="Reports sections" />
      <TabContent tab={tab}>
        <CardBoundary label="Reports"><ReportsWorkspace tab={tab} onTab={setTab} /></CardBoundary>
      </TabContent>
    </>
  );
}
