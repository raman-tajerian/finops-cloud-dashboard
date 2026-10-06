import { createFileRoute } from "@tanstack/react-router";
import { Plug } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/finops/States";
import { PageHeader } from "@/components/finops/States";

export const Route = createFileRoute("/integrations")({
  head: () => ({
    meta: [
      { title: "Integrations — NimbusOps" },
      { name: "description", content: "Cloud accounts and tool connections." },
      { property: "og:title", content: "Integrations — NimbusOps" },
      { property: "og:description", content: "Cloud accounts and tool connections." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: IntegrationsPage,
});

function IntegrationsPage() {
  return (
    <>
      <PageHeader title="Integrations" description="Cloud accounts and tool connections" />
      <EmptyState icon={Plug} title="AWS, Azure and GCP are connected in demo mode. Connection cards for Slack, Jira and more arrive in a later phase." action="Test connections" onAction={() => toast.success("All 3 cloud connections healthy (demo)")} />
    </>
  );
}
