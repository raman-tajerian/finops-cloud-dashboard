import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/finops/States";
import { PageHeader } from "@/components/finops/States";

export const Route = createFileRoute("/security")({
  head: () => ({
    meta: [
      { title: "Security & Compliance — NimbusOps" },
      { name: "description", content: "Findings and compliance posture across clouds." },
      { property: "og:title", content: "Security & Compliance — NimbusOps" },
      { property: "og:description", content: "Findings and compliance posture across clouds." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SecurityPage,
});

function SecurityPage() {
  return (
    <>
      <PageHeader title="Security & Compliance" description="Findings and compliance posture across clouds" />
      <EmptyState icon={ShieldCheck} title="The findings table and compliance cards arrive in the next phase. Run a scan to refresh posture now." action="Run security scan" onAction={() => toast.success("Security scan queued (demo)")} />
    </>
  );
}
