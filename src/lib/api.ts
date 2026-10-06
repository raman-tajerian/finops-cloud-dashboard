// Typed API client. Uses mock data unless VITE_API_BASE_URL is set, then calls GET {base}/api/v1/...
import { byRegion, byService, cluster, platformKpis, recommendations } from "@/lib/finops-platform-data";
import { resources } from "@/lib/finops-data";
import type { Anomaly, ClusterDto, CostByDimension, RecommendationDto, ResourceDto, SpendSummary } from "@/types/finops";

const base = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "");
export const dataSource: "live" | "demo" = base ? "live" : "demo";

const delay = () => new Promise((r) => setTimeout(r, 300 + Math.random() * 500));
async function call<T>(path: string, mock: () => T): Promise<T> {
  if (!base) { await delay(); return mock(); }
  const res = await fetch(`${base}/api/v1${path}`);
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return (await res.json()) as T;
}

export const api = {
  getSummary: () => call<SpendSummary>("/summary", () => ({
    total: platformKpis.spend.total, momPct: platformKpis.spend.mom, dailyBurn: platformKpis.spend.burn, projectedEom: platformKpis.spend.projected,
    savingsOpportunity: recommendations.reduce((a, b) => a + b.savings, 0), idleWaste: platformKpis.waste.total, activeAnomalies: platformKpis.anomalies.length,
    costPerUser: platformKpis.unit.perUser, costPerRequest: platformKpis.unit.perRequest,
  })),
  getCostByDimension: (dim: "service" | "region") => call<CostByDimension[]>(`/costs?groupBy=${dim}`, () =>
    dim === "service" ? byService : byRegion.map((r) => ({ name: r.region, value: r.AWS + r.Azure + r.GCP }))),
  getResources: () => call<ResourceDto[]>("/resources", () => resources),
  getRecommendations: () => call<RecommendationDto[]>("/recommendations", () => recommendations),
  getAnomalies: () => call<Anomaly[]>("/anomalies", () => platformKpis.anomalies),
  getClusters: () => call<ClusterDto[]>("/clusters", () => [cluster]),
};
