import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Download, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTeams } from "@/lib/queries";
import { useMoney } from "@/lib/money";
import { useGlobalFilters } from "@/lib/filters";
import { downloadShowback } from "@/lib/showback";
import { CardBoundary, CardSkeleton, DataTableView, EmptyState, ErrorState, PageHero } from "./States";
import { SpendTrend } from "./WorkspaceCharts";
import type { ShowbackTeamDto } from "@/types/finops";

function TeamBudget({ team }: { team: ShowbackTeamDto }) {
  const { fmt } = useMoney();
  return <section className="organic-card p-7"><h2 className="font-semibold">{team.team} budget</h2><dl className="mt-5 grid gap-6 sm:grid-cols-3"><div><dt className="text-sm text-muted-foreground">Monthly budget</dt><dd className="mt-2 text-xl">{fmt(team.budgetAmount)}</dd></div><div><dt className="text-sm text-muted-foreground">End-of-month forecast</dt><dd className="mt-2 text-xl">{fmt(team.forecast)}</dd></div><div><dt className="text-sm text-muted-foreground">Budget usage (forecast)</dt><dd className="mt-2 text-xl">{team.budgetAmount > 0 ? `${team.budgetUsagePct.toFixed(1)}%` : "—"}</dd></div></dl><p className="mt-6 text-sm text-muted-foreground">Default = 105% of filtered Q3 spend ÷ 3. Forecast uses the same end-of-month calculation as Overview.</p></section>;
}
export function TeamsWorkspace({ tab, teamId }: { tab: string; teamId?: string }) {
  const q = useTeams(), { fmt } = useMoney(), { reset } = useGlobalFilters();
  if (q.isPending) return <CardSkeleton h="h-64" />;
  if (q.isError) return <ErrorState message="We couldn't load team showback." onRetry={() => q.refetch()} />;
  const selected = teamId ? q.data.teams.find((t) => t.team.toLowerCase() === teamId.toLowerCase()) : undefined;
  const teams = teamId ? selected ? [selected] : [] : q.data.teams;
  if (!teams.length || teams.every((t) => !t.resources.length)) return <EmptyState icon={Users} title="No team resources match this team and the active filters." action="Reset filters" onAction={reset} />;
  return <div className="space-y-8"><div className="flex justify-end"><Button variant="secondary" onClick={() => downloadShowback(teams)}><Download />Export showback CSV</Button></div>
    {tab === "overview" && <><PageHero label={selected ? `${selected.team} spend` : "Team showback"} value={fmt(selected?.spend ?? q.data.total)} description="Selected-period spend reconciles exactly to Cost Explorer grouped by team." /><div className="grid gap-8 xl:grid-cols-2">{teams.map((t) => <CardBoundary key={t.team}><section className="organic-card h-full space-y-6 p-7"><div className="flex items-start justify-between gap-3"><div><h2 className="font-semibold">{t.team}</h2><p className="metric-numbers mt-3 text-3xl">{fmt(t.spend)}</p><p className="mt-2 text-sm text-muted-foreground">{t.changePct >= 0 ? "+" : ""}{t.changePct.toFixed(1)}% vs previous period · {t.budgetAmount > 0 ? `${t.budgetUsagePct.toFixed(1)}%` : "—"} forecast budget usage</p></div>{!selected && <Button asChild size="icon" variant="ghost"><Link to="/teams/$teamId" params={{ teamId: t.team.toLowerCase() }} search={(p) => ({ ...p, tab: "overview" })} aria-label={`Open ${t.team} team`}><ArrowUpRight /></Link></Button>}</div><div><h3 className="text-sm font-medium">Top resources · monthly cost</h3><ul className="mt-3 space-y-3">{t.topResources.map((r) => <li key={r.id} className="flex min-w-0 justify-between gap-3 text-sm"><span className="min-w-0 break-words text-muted-foreground">{r.name}</span><span className="shrink-0">{fmt(r.monthlyCost)}</span></li>)}</ul></div><SpendTrend label={`${t.team} trend`} points={t.trend} /></section></CardBoundary>)}</div></>}
    {tab === "resources" && teams.map((t) => <CardBoundary key={t.team}><section className="organic-card p-7"><h2 className="mb-5 font-semibold">{t.team} resources</h2><DataTableView caption={`${t.team} resources`} columns={["Resource", "Provider", "Service", "Environment", "Monthly cost"]} rows={t.resources.map((r) => [r.name, r.provider, r.service, r.environment, fmt(r.monthlyCost)])} /></section></CardBoundary>)}
    {tab === "budgets" && teams.map((t) => <CardBoundary key={t.team}><TeamBudget team={t} /></CardBoundary>)}
  </div>;
}