import { createFileRoute } from "@tanstack/react-router";
import { Plug } from "lucide-react";
import { ComingSoon } from "@/components/finops/States";
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
      <ComingSoon icon={Plug} what="Integrations" />
    </>
  );
}
