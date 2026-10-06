import { createFileRoute } from "@tanstack/react-router";
import { BudgetForecast } from "@/components/finops/Widgets";
import { AnomalyAnalyst } from "@/components/finops/AnomalyAnalyst";
import { PageHeader } from "@/components/finops/States";

export const Route = createFileRoute("/budgets")({
  head: () => ({
    meta: [
      { title: "Budgets & Alerts — NimbusOps" },
      { name: "description", content: "Budgets, thresholds and anomaly alerts." },
      { property: "og:title", content: "Budgets & Alerts — NimbusOps" },
      { property: "og:description", content: "Budgets, thresholds and anomaly alerts." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BudgetsPage,
});

function BudgetsPage() {
  return (
    <>
      <PageHeader title="Budgets & Alerts" description="Budgets, thresholds and anomaly alerts" />
      <div className="grid gap-6 xl:grid-cols-[1fr_2fr]"><BudgetForecast /><AnomalyAnalyst /></div>
    </>
  );
}
