import { createFileRoute, Link } from "@tanstack/react-router";
import { GlobalFilters } from "@/components/finops/GlobalFilters";
import { CardBoundary, PageHeader } from "@/components/finops/States";
import { TeamsWorkspace } from "@/components/finops/Teams";
import { PAGE_TABS, PageTabs, TabContent, usePageTab } from "@/components/finops/PageTabs";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/teams/$teamId")({
  head: ({ params }) => ({ meta: [{ title: `${params.teamId} team · Fern` }, { name: "description", content: `Fern — ${params.teamId} team costs, resources and budget showback.` }, { property: "og:title", content: `${params.teamId} team · Fern` }, { property: "og:description", content: `Fern — ${params.teamId} team costs, resources and budget showback.` }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: TeamPage,
});
function TeamPage() {
  const { teamId } = Route.useParams();
  const { tab, setTab } = usePageTab(PAGE_TABS["/teams"].tabs);
  const title = teamId.charAt(0).toUpperCase() + teamId.slice(1);
  return <><PageHeader title={`${title} team`} description="Cost ownership, resources and budgets" actions={<Button asChild variant="secondary"><Link to="/teams" search={(p) => ({ ...p, tab: "overview" })}>All teams</Link></Button>} /><GlobalFilters /><PageTabs tabs={PAGE_TABS["/teams"].tabs} value={tab} onChange={setTab} ariaLabel="Team sections" /><TabContent tab={tab}><CardBoundary label="Team showback"><TeamsWorkspace tab={tab} teamId={teamId} /></CardBoundary></TabContent></>;
}
