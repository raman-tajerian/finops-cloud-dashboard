import { createFileRoute } from "@tanstack/react-router";
import { FileText } from "lucide-react";
import { ComingSoon } from "@/components/finops/States";
import { PageHeader } from "@/components/finops/States";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Reports — Fern" },
      { name: "description", content: "Fern — Multi-cloud cost and sustainability dashboard. Generate, download and schedule cost reports." },
      { property: "og:title", content: "Reports — Fern" },
      { property: "og:description", content: "Fern — Multi-cloud cost and sustainability dashboard. Generate, download and schedule cost reports." },
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
      <ComingSoon icon={FileText} what="Reports" />
    </>
  );
}
