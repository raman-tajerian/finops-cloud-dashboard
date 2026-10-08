// Recommendations page catalog + Budgets & Alerts aggregates. Pure functions over the master dataset.
import { z } from "zod";
import type { Filters } from "@/lib/filters";
import type { AlertsDto, AnomalyRowDto, BudgetScope, MasterResource, SavingsDto, ScopeSpendDto, ServiceName } from "@/types/finops";
import { buildRecommendations, detectAnomalies, filterResources, forecastMonth, SAVINGS_CATEGORIES, totalOf, windowOf } from "./aggregate";
import { BUDGET_UPLIFT } from "./platformOps";
import { dayLabel, HISTORY_DAYS, mulberry32 } from "./resources";

/* ---------- Savings ---------- */
/** Monthly savings target = 60% of total potential. */
export const SAVINGS_TARGET_SHARE = 0.6;
const MONTHS = ["May", "Jun", "Jul", "Aug", "Sep", "Oct"];

export function buildSavings(all: MasterResource[], f: Filters): SavingsDto {
  const items = buildRecommendations(filterResources(all, f));
  const total = items.reduce((a, b) => a + b.savings, 0);
  // Seeded demo history for realized savings (not derived from real actions).
  const rnd = mulberry32(4242 + f.providers.length * 7 + f.team.length + f.env.length);
  const tracker = MONTHS.map((month, i) => {
    const last = i === MONTHS.length - 1;
    const potential = last ? total : Math.round(total * (0.75 + rnd() * 0.35));
    return { month: `${month} 2026`, potential, realized: Math.round(potential * (last ? 0.1 : 0.2 + rnd() * 0.35)) };
  });
  const rules = (Object.keys(SAVINGS_CATEGORIES) as (keyof typeof SAVINGS_CATEGORIES)[]).map((category) => ({ category, ...SAVINGS_CATEGORIES[category] }));
  return { items, total, target: Math.round(total * SAVINGS_TARGET_SHARE), targetShare: SAVINGS_TARGET_SHARE, tracker, rules };
}

/* ---------- Budget scopes ---------- */
export const scopeKey = (s: BudgetScope) => `${s.kind}:${s.value}`;
export const defaultScopes: BudgetScope[] = [
  { kind: "All", value: "All" }, { kind: "Provider", value: "AWS" }, { kind: "Provider", value: "Azure" }, { kind: "Provider", value: "GCP" },
  { kind: "Team", value: "Platform" }, { kind: "Team", value: "Data" }, { kind: "Team", value: "FinOps" }, { kind: "Team", value: "Media" },
  { kind: "Environment", value: "Production" }, { kind: "Environment", value: "Staging" }, { kind: "Environment", value: "Development" },
];
const inScope = (r: MasterResource, s: BudgetScope) =>
  s.kind === "All" || (s.kind === "Provider" && r.provider === s.value) || (s.kind === "Team" && r.team === s.value) || (s.kind === "Environment" && r.environment === s.value);

/** Spent = Overview total spend for the period (same totalOf/window); forecast = Overview end-of-month forecast. */
export function scopeSpend(all: MasterResource[], f: Filters, scope: BudgetScope): ScopeSpendDto {
  const rs = filterResources(all, f).filter((r) => inScope(r, scope));
  const spent = totalOf(rs, windowOf(f.range));
  const forecast = forecastMonth(rs).forecastEom;
  return { key: scopeKey(scope), scope, spent, forecast, defaultAmount: Math.round((totalOf(rs, windowOf("q3")) / 3) * BUDGET_UPLIFT) };
}

/* ---------- Anomalies ---------- */
/** Fixed probable-cause mapping per service. */
export const ANOMALY_CAUSE: Record<ServiceName, string> = {
  EC2: "Auto-scaling group scaled out", RDS: "Increased IOPS or a long-running query", S3: "Data transfer / egress growth",
  EKS: "Node pool scale-up", Lambda: "Invocation spike or retry loop", "Azure VM": "New VM instances added", AKS: "Node pool scale-up",
  Blob: "Egress from a new content rollout", "SQL DB": "DTU/vCore tier change", "GCP Compute": "Instance group growth",
  GKE: "Node pool scale-up", BigQuery: "Large on-demand queries",
};

export function buildAnomalyRows(rs: MasterResource[]): AnomalyRowDto[] {
  const H = HISTORY_DAYS;
  return detectAnomalies(rs).map((a) => {
    const r = rs.find((x) => x.id === a.resourceId)!;
    const base = r.daily.slice(H - 17, H - 3).reduce((x, y) => x + y, 0) / 14;
    const recent = r.daily.slice(H - 3, H).reduce((x, y) => x + y, 0) / 3;
    const series = Array.from({ length: 21 }, (_, k) => { const i = H - 21 + k; return { day: dayLabel(i), actual: Math.round(r.daily[i] ?? 0), low: Math.round(base * 0.85), high: Math.round(base * 1.15) }; });
    return { id: a.id, title: a.title, date: a.since, service: r.service, provider: r.provider, resourceId: r.id, expected: Math.round(base * 3), actual: Math.round(recent * 3), change: a.change, impact: a.impact, cause: ANOMALY_CAUSE[r.service], series };
  });
}

export function buildAlerts(all: MasterResource[], f: Filters): AlertsDto {
  return { scopes: defaultScopes.map((s) => scopeSpend(all, f, s)), anomalies: buildAnomalyRows(filterResources(all, f)) };
}

/* ---------- Budget form validation ---------- */
export const budgetSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(60, "Name must be at most 60 characters"),
  scope: z.string().min(1, "Choose a scope"),
  amount: z.number({ message: "Enter an amount" }).finite("Enter an amount").positive("Amount must be greater than 0").max(100_000_000, "Amount is too large"),
  period: z.enum(["monthly", "quarterly"], { message: "Choose a period" }),
  thresholds: z.array(z.union([z.literal(50), z.literal(80), z.literal(100)])).min(1, "Pick at least one threshold"),
  channels: z.array(z.enum(["Email", "Slack", "Teams"])).min(1, "Pick at least one channel"),
});
export type BudgetInput = z.infer<typeof budgetSchema>;
export function validateBudget(input: unknown): { ok: true; data: BudgetInput } | { ok: false; errors: Record<string, string> } {
  const r = budgetSchema.safeParse(input);
  if (r.success) return { ok: true, data: r.data };
  const errors: Record<string, string> = {};
  for (const i of r.error.issues) { const k = String(i.path[0] ?? "form"); errors[k] ??= i.message; }
  return { ok: false, errors };
}
/** Form string → number; empty becomes NaN so validation rejects it. */
export const parseAmount = (s: string) => (s.trim() === "" ? Number.NaN : Number(s));
