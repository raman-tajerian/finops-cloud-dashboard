import { createFileRoute } from "@tanstack/react-router";
import { BudgetsAlertsWorkspace } from "@/components/finops/BudgetsAlerts";
import { BudgetForecast, WhatIfSimulator } from "@/components/finops/Operations";
import { AnomalyAnalyst } from "@/components/finops/AnomalyAnalyst";
import { GlobalFilters } from "@/components/finops/GlobalFilters";
import { CardBoundary, PageHeader } from "@/components/finops/States";
import { DataGate } from "@/lib/queries";
import { PAGE_TABS, PageTabs, TabContent, usePageTab } from "@/components/finops/PageTabs";

export const Route = createFileRoute("/budgets")({
  head: () => ({
    meta: [
      { title: "Budgets & Alerts · Fern" },
      { name: "description", content: "Budgets, alert rules, anomalies and spend forecasts." },
      { property: "og:title", content: "Budgets & Alerts · Fern" },
      { property: "og:description", content: "Budgets, alert rules, anomalies and spend forecasts." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BudgetsPage,
});

const TABS = PAGE_TABS["/budgets"].tabs;

function BudgetsPage() {
  const { tab, setTab } = usePageTab(TABS);
  return (
    <>
      <PageHeader title="Budgets & Alerts" description="Budgets, alert rules and anomaly triage for the selected period." />
      <GlobalFilters />
      <PageTabs tabs={TABS} value={tab} onChange={setTab} ariaLabel="Budgets and alerts sections" />
      <TabContent tab={tab}>
        {tab === "forecast" ? (
          <div className="grid gap-6">
            <CardBoundary label="Budget forecast"><BudgetForecast /></CardBoundary>
            <CardBoundary label="Scenario simulator"><WhatIfSimulator /></CardBoundary>
          </div>
        ) : tab === "anomalies" ? (
          <div className="grid gap-6">
            <BudgetsAlertsWorkspace tab={tab} />
            <DataGate h="h-24"><AnomalyAnalyst /></DataGate>
          </div>
        ) : (
          <BudgetsAlertsWorkspace tab={tab} />
        )}
      </TabContent>
    </>
  );
}
