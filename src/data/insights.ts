// Read-only deterministic projections; existing financial aggregates are never mutated.
import type { Filters } from "@/lib/filters";
import type { FernScoreDto, InsightsDto, MasterResource } from "@/types/finops";
import { buildDashboard, buildSustainability } from "./aggregate";
import { buildAlerts, buildSavings } from "./budgets";
import { buildBudget } from "./platformOps";
import { buildSecurity, isOpenFinding } from "./security";

const clamp = (n: number) => Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 0;
export const FERN_WEIGHTS = { waste: 0.35, security: 0.25, budget: 0.20, anomaly: 0.20 } as const;

export function calculateFernScore(inputs: FernScoreDto["inputs"], resourceCount: number): FernScoreDto {
  if (resourceCount === 0 || inputs.spend <= 0) return { score: null, subScores: { waste: null, security: null, budget: null, anomaly: null }, inputs };
  const utilization = inputs.budgetAmount > 0 ? inputs.budgetForecast / inputs.budgetAmount : Infinity;
  const subScores = {
    waste: clamp(100 - (inputs.idleWaste / inputs.spend) * 500),
    security: clamp(inputs.securityScore),
    budget: utilization <= 0.90 ? 100 : utilization >= 1.30 ? 0 : clamp((1.30 - utilization) * 250),
    anomaly: clamp(100 - 25 * inputs.activeAnomalies),
  };
  const score = Math.round(subScores.waste * 0.35 + subScores.security * 0.25 + subScores.budget * 0.20 + subScores.anomaly * 0.20);
  return { score: clamp(score), subScores, inputs };
}

export function buildFernScore(all: MasterResource[], f: Filters): FernScoreDto {
  const d = buildDashboard(all, f), budget = buildBudget(all, f);
  return calculateFernScore({ spend: d.overview.totalSpend.value, idleWaste: d.overview.idleWaste.value, securityScore: buildSecurity(all, f).score, budgetForecast: budget.forecastEom, budgetAmount: budget.defaultBudget, activeAnomalies: d.overview.anomalies.value }, d.resources.length);
}

export function buildInsights(all: MasterResource[], f: Filters): InsightsDto {
  const d = buildDashboard(all, f);
  if (!d.resources.length) return { insights: [] };
  const insights: InsightsDto["insights"] = [];
  const mover = [...d.movers.up, ...d.movers.down].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta) || a.id.localeCompare(b.id))[0];
  if (mover && mover.delta !== 0) insights.push({ id: `mover-${mover.id}`, type: "cost-mover", sentence: `${mover.name} is the biggest cost mover, ${mover.delta > 0 ? "up" : "down"} {figure} versus the previous period.`, figure: { value: Math.abs(mover.delta), unit: "USD" }, link: { to: "/cost-explorer", tab: "compare" } });
  const saving = buildSavings(all, f).items[0];
  if (saving && saving.savings > 0) insights.push({ id: `saving-${saving.id}`, type: "saving", sentence: `${saving.title} is the largest open opportunity, worth {figure} per month.`, figure: { value: saving.savings, unit: "USD" }, link: { to: "/recommendations", tab: "open" } });
  // Only scopes with built-in budget cards are eligible; never suggest a nonexistent budget.
  const budgetKeys = ["All:All", "Provider:AWS", "Provider:Azure", "Team:Platform", "Environment:Production"];
  const budget = buildAlerts(all, f).scopes.filter((s) => budgetKeys.includes(s.key) && s.defaultAmount > 0 && s.forecast > s.defaultAmount).sort((a, b) => (b.forecast - b.defaultAmount) - (a.forecast - a.defaultAmount) || a.key.localeCompare(b.key))[0];
  if (budget) insights.push({ id: `budget-${budget.key}`, type: "budget", sentence: `${budget.scope.kind === "All" ? "The company cloud budget" : `The ${budget.scope.value} budget`} is projected to be exceeded by {figure} this month.`, figure: { value: budget.forecast - budget.defaultAmount, unit: "USD" }, link: { to: "/budgets", tab: "budgets" } });
  const critical = buildSecurity(all, f).findings.filter((x) => x.severity === "Critical" && isOpenFinding(x.status));
  if (critical.length) insights.push({ id: "security-critical", type: "security", sentence: "{figure} critical security finding(s) need attention.", figure: { value: critical.length, unit: "count" }, link: { to: "/security", tab: "findings" } });
  const greener = [...buildSustainability(all, f).suggestions].sort((a, b) => b.reductionTons - a.reductionTons || a.resourceId.localeCompare(b.resourceId))[0];
  if (greener && greener.reductionTons > 0) insights.push({ id: `greener-${greener.resourceId}`, type: "greener-region", sentence: `Moving ${greener.workload} to ${greener.suggestedRegion} could avoid {figure} in the selected period.`, figure: { value: greener.reductionTons, unit: "tCO2e" }, link: { to: "/sustainability", tab: "greener" } });
  return { insights };
}