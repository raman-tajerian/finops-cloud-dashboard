import { createFileRoute } from "@tanstack/react-router";
import { GlobalFilters } from "@/components/finops/GlobalFilters";
import { SustainabilityDashboard } from "@/components/finops/Sustainability";
import { CardBoundary, PageHeader } from "@/components/finops/States";
import { PAGE_TABS, PageTabs, TabContent, usePageTab } from "@/components/finops/PageTabs";

const TABS = PAGE_TABS["/sustainability"].tabs;

export const Route = createFileRoute("/sustainability")({
  head: () => ({
    meta: [
      { title: "Sustainability · Fern" },
      { name: "description", content: "Fern — Multi-cloud cost and sustainability dashboard. Estimated carbon footprint by region and provider — figures are estimates." },
      { property: "og:title", content: "Sustainability · Fern" },
      { property: "og:description", content: "Fern — Multi-cloud cost and sustainability dashboard. Estimated carbon footprint by region and provider — figures are estimates." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SustainabilityPage,
});

function SustainabilityPage() {
  const { tab, setTab } = usePageTab(TABS);
  return (
    <>
      <PageHeader title="Sustainability" description="Estimated carbon footprint by region and provider — figures are estimates" />
      <GlobalFilters />
      <PageTabs tabs={TABS} value={tab} onChange={setTab} ariaLabel="Sustainability sections" />
      <TabContent tab={tab}>
        <CardBoundary label="Sustainability"><SustainabilityDashboard tab={tab} /></CardBoundary>
      </TabContent>
    </>
  );
}
