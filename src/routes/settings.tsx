import { createFileRoute } from "@tanstack/react-router";
import { Settings } from "lucide-react";
import { ComingSoon } from "@/components/finops/States";
import { PageHeader } from "@/components/finops/States";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — NimbusOps" },
      { name: "description", content: "Workspace, team and preferences." },
      { property: "og:title", content: "Settings — NimbusOps" },
      { property: "og:description", content: "Workspace, team and preferences." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" description="Workspace, team and preferences" />
      <ComingSoon icon={Settings} what="Settings" />
    </>
  );
}
