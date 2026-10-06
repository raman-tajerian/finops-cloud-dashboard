// Kubernetes, budget and scenario aggregates — all derived from the seeded master dataset.
import type { Filters } from "@/lib/filters";
import type { BudgetDto, K8sClusterDto, K8sPodDto, KubernetesDto, MasterResource, ScenarioDto } from "@/types/finops";
import { filterResources, forecastMonth, REGION_COST_INDEX, REGION_INTENSITY, rightsizeSaving, totalOf, windowOf, KWH_PER_USD } from "./aggregate";
import { mulberry32 } from "./resources";

/* ---------- Kubernetes ---------- */
/** Fixed namespace cost weights (sum = 1) and efficiency factors applied to the cluster's CPU/memory average. */
export const NAMESPACES = [
  { name: "prod-api", weight: 0.35, factor: 1.15 },
  { name: "data", weight: 0.25, factor: 1.0 },
  { name: "web", weight: 0.2, factor: 0.9 },
  { name: "monitoring", weight: 0.1, factor: 0.6 },
  { name: "system", weight: 0.1, factor: 0.5 },
] as const;
export const OVERPROVISIONED_BELOW = 30;
export const nodesFor = (cost: number) => Math.max(3, Math.round(cost / 350));
export const PODS_PER_NODE = 14;
export const failRate = (status: MasterResource["status"]) => (status === "Warning" ? 0.04 : 0.01);
const seedOf = (id: string) => [...id].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7);

export function buildCluster(r: MasterResource): K8sClusterDto {
  const cost = r.monthlyCost;
  const nodes = nodesFor(cost), podsTotal = nodes * PODS_PER_NODE;
  const bad = Math.round(podsTotal * failRate(r.status));
  const rnd = mulberry32(seedOf(r.id));
  const order = Array.from({ length: podsTotal }, (_, i) => i).sort(() => 0); // stable base order
  for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [order[i], order[j]] = [order[j]!, order[i]!]; }
  const badSet = new Set(order.slice(0, bad));
  const base = (r.cpuAvg + r.memAvg) / 2;
  const namespaces = NAMESPACES.map((n) => { const efficiency = Math.min(100, Math.round(base * n.factor)); return { name: n.name, weight: n.weight, cost: cost * n.weight, efficiency, overProvisioned: efficiency < OVERPROVISIONED_BELOW }; });
  // Pods are spread across namespaces in proportion to the weights.
  const nsFor = (i: number) => { let acc = 0; for (const n of NAMESPACES) { acc += n.weight; if (i / podsTotal < acc) return n.name; } return "system"; };
  const pods: K8sPodDto[] = Array.from({ length: podsTotal }, (_, i) => {
    const isBad = badSet.has(i), roll = rnd();
    const status: K8sPodDto["status"] = isBad ? (roll < 0.5 ? "Pending" : "Failed") : "Running";
    return { name: `${nsFor(i)}-${r.tags.app}-${(i + 1).toString(36).padStart(3, "0")}`, namespace: nsFor(i), status, restarts: isBad ? 3 + Math.floor(rnd() * 9) : Math.floor(rnd() * 3) };
  });
  return { id: r.id, name: r.name, provider: r.provider, service: r.service, region: r.region, environment: r.environment, status: r.status, cpuAvg: r.cpuAvg, memAvg: r.memAvg, monthlyCost: cost, nodes, podsTotal, podsHealthy: podsTotal - bad, podsFailed: bad, namespaces, pods };
}

export const isCluster = (r: MasterResource) => r.category === "Kubernetes";
export function buildKubernetes(all: MasterResource[], f: Filters): KubernetesDto {
  const clusters = filterResources(all, f).filter(isCluster).map(buildCluster).sort((a, b) => b.monthlyCost - a.monthlyCost);
  return { clusters, totalCost: clusters.reduce((a, c) => a + c.monthlyCost, 0) };
}

/* ---------- Budget ---------- */
/** Default monthly budget = 105% of the previous quarter's (Q3 2026) spend divided by 3 months. */
export const BUDGET_UPLIFT = 1.05;
export function buildBudget(all: MasterResource[], f: Filters): BudgetDto {
  const rs = filterResources(all, f);
  const fm = forecastMonth(rs);
  const previousQuarterSpend = totalOf(rs, windowOf("q3"));
  return { spendToDate: fm.mtd, forecastEom: fm.forecastEom, dayOfMonth: fm.dom, monthDays: fm.monthDays, previousQuarterSpend, defaultBudget: Math.round((previousQuarterSpend / 3) * BUDGET_UPLIFT), period: "October 2026" };
}
/** Progress bar tone thresholds: amber at 80%, red at 100%. */
export const budgetTone = (pct: number): "success" | "warning" | "critical" => (pct >= 100 ? "critical" : pct >= 80 ? "warning" : "success");

/* ---------- Scenario simulator ---------- */
export const RI_DISCOUNT = 0.3;
export const MIGRATE_FROM = "us-east-1", MIGRATE_TO = "eu-north-1";
export function buildScenario(all: MasterResource[], f: Filters): ScenarioDto {
  const rs = filterResources(all, f), w = windowOf(f.range);
  const scale = w.days / 30;
  const computeSpend = totalOf(rs.filter((r) => r.category === "Compute" || r.category === "Kubernetes"), w);
  const migrateSpend = totalOf(rs.filter((r) => r.region === MIGRATE_FROM), w);
  const rightsizeEligible = rs.reduce((a, r) => a + rightsizeSaving(r), 0) * scale;
  const costRatio = (REGION_COST_INDEX[MIGRATE_TO] ?? 1) / (REGION_COST_INDEX[MIGRATE_FROM] ?? 1);
  return {
    baseline: totalOf(rs, w), days: w.days, computeSpend, migrateSpend, rightsizeEligible,
    riDiscount: RI_DISCOUNT, migrateFrom: MIGRATE_FROM, migrateTo: MIGRATE_TO, costRatio,
    intensityFrom: REGION_INTENSITY[MIGRATE_FROM] ?? 300, intensityTo: REGION_INTENSITY[MIGRATE_TO] ?? 300, kwhPerUsd: KWH_PER_USD,
  };
}
