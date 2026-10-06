// Typed API client. Uses mock data unless VITE_API_BASE_URL is set, then calls GET {base}/api/v1/...
import { byRegion, byService, cluster, dailySpend, envShare, platformKpis, providerShare, recommendations, tickerSeed } from "@/lib/finops-platform-data";
import { resources } from "@/lib/finops-data";
import { carbonRegions, forecast, topoEdges, topoNodes, unitExtra } from "@/lib/finops-insights-data";
import type { Filters } from "@/lib/filters";
import type { Anomaly, CloudProvider, DashboardDto } from "@/types/finops";

const base = (import.meta.env["VITE_API_BASE_URL"] as string | undefined)?.replace(/\/$/, "");
export const dataSource: "live" | "demo" = base ? "live" : "demo";

const teamShare = { Platform: 0.38, Data: 0.27, FinOps: 0.12, Media: 0.23 } as const;
export const scaleOf = (f: Filters) =>
  f.providers.reduce((s, p) => s + providerShare[p], 0) * (f.env === "All" ? 1 : envShare[f.env]) * (f.team === "All" ? 1 : teamShare[f.team]);
const rangeFactor = { "7d": 0.24, mtd: 1, q3: 3.05, custom: 1 } as const;
const anomalyProvider: Record<string, CloudProvider> = { an1: "Azure", an2: "AWS" };

const delay = () => new Promise((r) => setTimeout(r, 300 + Math.random() * 500));
const qs = (f: Filters) => new URLSearchParams({ range: f.range, providers: f.providers.join(","), env: f.env, team: f.team }).toString();

function mockDashboard(f: Filters): DashboardDto {
  const s = scaleOf(f), r = s * rangeFactor[f.range], has = (p: string) => (f.providers as string[]).includes(p);
  const k = platformKpis;
  const anomalies: Anomaly[] = k.anomalies.map((a) => ({ ...a, provider: anomalyProvider[a.id] ?? "AWS", impact: Math.round(a.impact * s) })).filter((a) => has(a.provider));
  return {
    providers: f.providers,
    kpis: {
      spend: { total: Math.round(k.spend.total * r), mom: k.spend.mom, burn: Math.round(k.spend.burn * s), projected: Math.round(k.spend.projected * r) },
      waste: { total: Math.round(k.waste.total * s), ebs: k.waste.ebs, rds: k.waste.rds, ec2: k.waste.ec2 },
      anomalies,
      unit: { ...k.unit, perUser: k.unit.perUser * Math.max(0.6, s), ...unitExtra },
    },
    services: byService.map((x) => ({ name: x.name, value: Math.round(x.value * r) })),
    regions: byRegion.map((x) => ({ region: x.region, AWS: has("AWS") ? x.AWS * r : 0, Azure: has("Azure") ? x.Azure * r : 0, GCP: has("GCP") ? x.GCP * r : 0 })),
    daily: dailySpend.map((d) => ({ ...d, spend: Math.round(d.spend * s) })),
    recommendations: recommendations.filter((x) => f.team === "All" || x.team === f.team),
    cluster, ticker: tickerSeed,
    forecast: forecast.map((d) => ({ day: d.day, forecast: d.forecast * s, band: [d.band[0] * s, d.band[1] * s], actual: d.actual === null ? null : d.actual * s })),
    carbon: carbonRegions.filter((c) => has(c.provider)).map((c) => ({ ...c, tons: c.tons * s })),
    topology: { nodes: topoNodes, edges: topoEdges },
    resources: resources.filter((x) => has(x.provider)),
  };
}

async function call<T>(path: string, mock: () => T): Promise<T> {
  if (!base) { await delay(); return mock(); }
  const res = await fetch(`${base}/api/v1${path}`);
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return (await res.json()) as T;
}

export const api = {
  getDashboard: (f: Filters) => call<DashboardDto>(`/dashboard?${qs(f)}`, () => mockDashboard(f)),
};
