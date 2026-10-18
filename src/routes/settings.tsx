import { createFileRoute } from "@tanstack/react-router";
import { fallback, zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import { PageHeader } from "@/components/finops/States";
import { SettingsWorkspace, SETTINGS_TABS } from "@/components/finops/Settings";

const schema = z.object({ tab: fallback(z.string(), "profile").default("profile"), dialog: fallback(z.string(), "").default("") });

export const Route = createFileRoute("/settings")({
  validateSearch: zodValidator(schema),
  head: () => ({
    meta: [
      { title: "Settings — Fern" },
      { name: "description", content: "Fern — Multi-cloud cost and sustainability dashboard. Workspace, team and preferences." },
      { property: "og:title", content: "Settings — Fern" },
      { property: "og:description", content: "Fern — Multi-cloud cost and sustainability dashboard. Workspace, team and preferences." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { tab, dialog } = Route.useSearch();
  const navigate = Route.useNavigate();
  const safeTab = SETTINGS_TABS.some(([v]) => v === tab) ? tab : "profile";
  return (
    <>
      <PageHeader title="Settings" description="Workspace, team and preferences" />
      <SettingsWorkspace tab={safeTab} dialog={dialog}
        onTab={(t) => navigate({ search: (p) => ({ ...p, tab: t, dialog: "" }), replace: true })}
        onDialog={(d) => navigate({ search: (p) => ({ ...p, dialog: d }), replace: true })} />
    </>
  );
}
