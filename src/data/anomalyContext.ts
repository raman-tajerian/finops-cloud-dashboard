import type { MasterResource } from "@/types/finops";
import { buildDashboard } from "@/data/aggregate";
import { buildKubernetes } from "@/data/platformOps";
import type { Filters } from "@/lib/filters";

/** AI anomaly-analysis context, derived from the same dashboard aggregate as Overview for the given filters. */
export function buildAnomalyContext(all: MasterResource[], f: Filters) {
  const d = buildDashboard(all, f);
  const k = buildKubernetes(all, f);
  return {
    filters: f,
    totalSpend: d.overview.totalSpend.value,
    activeAnomalies: d.overview.anomalies.value,
    anomalies: d.kpis.anomalies,
    spend: d.kpis.spend,
    waste: d.kpis.waste,
    costByService: d.services,
    costByTeam: d.teams,
    costByRegion: d.regions,
    resources: d.resources,
    openRecommendations: d.recommendations,
    kubernetes: k.clusters.map(({ pods: _p, ...c }) => c),
    dailyTrend: d.trend.filter((t) => t.forecast === null || t.total > 0).map((t) => ({ day: t.day, total: t.total, anomaly: t.anomaly })),
  };
}
