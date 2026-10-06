import { createFileRoute } from "@tanstack/react-router";
import { Settings } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/finops/States";
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
      <EmptyState icon={Settings} title="Profile, team members, API keys and appearance tabs arrive in a later phase." action="Invite a teammate" onAction={() => toast.success("Invite sent (demo)")} />
    </>
  );
}
