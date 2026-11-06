import { createFileRoute } from "@tanstack/react-router";
import { CardBoundary, PageHeader } from "@/components/finops/States";
import { IntegrationsWorkspace } from "@/components/finops/Integrations";
import { PAGE_TABS, PageTabs, TabContent, usePageTab } from "@/components/finops/PageTabs";

const TABS = PAGE_TABS["/integrations"].tabs;

export const Route = createFileRoute("/integrations")({
  head: () => ({
    meta: [
      { title: "Integrations · Fern" },
      { name: "description", content: "Fern — Multi-cloud cost and sustainability dashboard. Cloud accounts and tool connections." },
      { property: "og:title", content: "Integrations · Fern" },
      { property: "og:description", content: "Fern — Multi-cloud cost and sustainability dashboard. Cloud accounts and tool connections." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: IntegrationsPage,
});

function IntegrationsPage() {
  const { tab, setTab } = usePageTab(TABS);
  return (
    <>
      <PageHeader title="Integrations" description="Cloud accounts and tool connections" />
      <PageTabs tabs={TABS} value={tab} onChange={setTab} ariaLabel="Integrations sections" />
      <TabContent tab={tab}>
        <CardBoundary label="Integrations"><IntegrationsWorkspace tab={tab} /></CardBoundary>
      </TabContent>
    </>
  );
}
