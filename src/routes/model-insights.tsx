import { createFileRoute } from '@tanstack/react-router';
import { GlobalFilters } from '@/components/finops/GlobalFilters';
import { PageHeader } from '@/components/finops/States';
import { DemoModelBadge, ModelInsightsWorkspace } from '@/components/finops/ModelInsights';
import { PAGE_TABS, PageTabs, TabContent, usePageTab } from '@/components/finops/PageTabs';
export const Route = createFileRoute('/model-insights')({
  head: () => ({ meta: [{ title: 'Model Insights · Fern' }, { name: 'description', content: 'Fern — Demo cost detection, forecasting, synthetic model evaluation and planned MLOps.' }, { property: 'og:title', content: 'Model Insights · Fern' }, { property: 'og:description', content: 'Deterministic demo models and synthetic evaluation; production MLOps is planned.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' }] }),
  component: ModelPage,
});
function ModelPage() {
  const tabs = PAGE_TABS['/model-insights'].tabs, { tab, setTab } = usePageTab(tabs);
  return <><PageHeader title="Model Insights" description="Daily cost detection, forecasting and model operations" actions={<DemoModelBadge />} /><GlobalFilters /><PageTabs tabs={tabs} value={tab} onChange={setTab} ariaLabel="Model Insights sections" /><TabContent tab={tab}><ModelInsightsWorkspace tab={tab} /></TabContent></>;
}
