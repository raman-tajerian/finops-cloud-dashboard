import { createFileRoute } from "@tanstack/react-router";
import { FilterBar, scaleOf, type Filters } from "@/components/finops/Platform";
import { useState } from "react";
import { PageHeader } from "@/components/finops/States";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Reports — NimbusOps" },
      { name: "description", content: "Generate, download and schedule cost reports." },
      { property: "og:title", content: "Reports — NimbusOps" },
      { property: "og:description", content: "Generate, download and schedule cost reports." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ReportsPage,
});

function ReportsPage() {
  return (
    <>
      <PageHeader title="Reports" description="Generate, download and schedule cost reports" />
      <ReportsBody />
    </>
  );
}

function ReportsBody() {
  const [f, setF] = useState<Filters>({ range: "mtd", providers: ["AWS", "Azure", "GCP"], env: "All" });
  void scaleOf;
  return <div className="space-y-4"><p className="text-sm text-muted-foreground">Use Export report to download the current view as CSV, JSON or PDF.</p><FilterBar filters={f} onChange={setF} /></div>;
}
