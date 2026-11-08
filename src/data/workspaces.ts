// Pure read models; no commitment, showback or notification changes source costs.
import type { Filters } from "@/lib/filters";
import type { CloudProvider, CommitmentsDto, MasterResource, NotificationsDto, TeamsDto } from "@/types/finops";
import { buildDashboard, buildExplore, buildResources, filterResources, totalOf, windowOf } from "./aggregate";
import { buildAlerts, buildSavings, scopeSpend } from "./budgets";
import { buildSecurity, isOpenFinding } from "./security";
import { DEMO_TODAY, mulberry32 } from "./resources";

const providers: CloudProvider[] = ["AWS", "Azure", "GCP"];
export const BUILTIN_BUDGET_KEYS = ["All:All", "Provider:AWS", "Provider:Azure", "Team:Platform", "Environment:Production"];
const eligible = (r: MasterResource) => ["EC2", "Azure VM", "GCP Compute", "EKS", "AKS", "GKE"].includes(r.service);
export function buildCommitments(all: MasterResource[], f: Filters): CommitmentsDto {
  const rs = filterResources(all, f).filter(eligible);
  const commitments: CommitmentsDto["commitments"] = [], recommendations: CommitmentsDto["recommendations"] = [];
  for (const [index, provider] of providers.entries()) {
    const members = rs.filter((r) => r.provider === provider);
    if (!members.length) continue;
    const rnd = mulberry32(20261012 + index);
    const coveragePct = Math.round((0.35 + (rnd() - 0.5) * 0.10) * 10000) / 100;
    const monthlyEligible = members.reduce((sum, r) => sum + r.monthlyCost, 0);
    const committedSpend = monthlyEligible * coveragePct / 100;
    const utilizationPct = Math.round((0.75 + rnd() * 0.25) * 10000) / 100;
    const daysRemaining = 15 + Math.floor(rnd() * 166);
    const expires = new Date(DEMO_TODAY.getTime() + daysRemaining * 86400000).toISOString().slice(0, 10);
    commitments.push({ id: `commitment-${provider}`, provider, name: provider === "AWS" ? "Compute Savings Plan" : provider === "Azure" ? "Reserved VM capacity" : "Compute committed use", monthlyEligible, committedSpend, coveragePct, utilizationPct, expires, daysRemaining, expiringSoon: daysRemaining <= 30 });
    const stableBaseline = members.filter((r) => r.status !== "Idle").reduce((sum, r) => sum + Math.min(r.monthlyCost, Math.min(...r.daily.slice(-30)) * 30), 0);
    const uncoveredStable = stableBaseline * (1 - coveragePct / 100);
    const monthlySaving = uncoveredStable * 0.30;
    const upfront = uncoveredStable * 0.70;
    if (monthlySaving > 0) recommendations.push({ provider, stableBaseline, uncoveredStable, monthlySaving, upfront, breakEvenMonths: upfront / monthlySaving });
  }
  const eligibleSpend = totalOf(rs, windowOf(f.range));
  const committedSpend = providers.reduce((sum, p) => sum + totalOf(rs.filter((r) => r.provider === p), windowOf(f.range)) * (commitments.find((c) => c.provider === p)?.coveragePct ?? 0) / 100, 0);
  return { eligibleSpend, committedSpend, coveragePct: eligibleSpend > 0 ? committedSpend / eligibleSpend * 100 : 0, commitments, recommendations };
}

export function buildTeams(all: MasterResource[], f: Filters): TeamsDto {
  const explore = buildExplore(all, f, "team");
  const names = ["Platform", "Data", "FinOps", "Media"] as const;
  const visible = f.team === "All" ? names : names.filter((team) => team === f.team);
  const teams = visible.map((team) => {
    const tf = { ...f, team }, row = explore.rows.find((r) => r.name === team);
    const resources = buildResources(all, tf).items.sort((a, b) => b.monthlyCost - a.monthlyCost);
    const budget = scopeSpend(all, tf, { kind: "Team", value: team });
    return { team, spend: row?.current ?? 0, previousSpend: row?.previous ?? 0, changePct: row?.changePct ?? 0, budgetAmount: budget.defaultAmount, forecast: budget.forecast, budgetUsagePct: budget.defaultAmount > 0 ? budget.forecast / budget.defaultAmount * 100 : 0, resources, topResources: resources.slice(0, 3), trend: buildDashboard(all, tf).daily };
  });
  return { total: explore.total, teams };
}

export function buildNotifications(all: MasterResource[], f: Filters): NotificationsDto {
  const items: NotificationsDto["items"] = [];
  if (!filterResources(all, f).length) return { items, counts: { anomaly: 0, budget: 0, security: 0, recommendation: 0 } };
  const alerts = buildAlerts(all, f);
  for (const a of alerts.anomalies) items.push({ id: `anomaly-${a.id}`, sourceId: a.id, type: "anomaly", title: a.title, sentence: "Estimated monthly excess is {figure} above the recent baseline.", figure: { value: a.impact, unit: "USD" }, link: { to: "/budgets", tab: "anomalies" } });
  for (const b of alerts.scopes.filter((s) => BUILTIN_BUDGET_KEYS.includes(s.key) && s.defaultAmount > 0 && s.forecast / s.defaultAmount >= 0.80)) {
    const threshold = b.forecast >= b.defaultAmount ? 100 : 80;
    items.push({ id: `budget-${b.key}-${threshold}`, sourceId: b.key, type: "budget", title: `${b.scope.kind === "All" ? "Company cloud" : b.scope.value} budget crossed ${threshold}%`, sentence: "Projected end-of-month spend is {figure}.", figure: { value: b.forecast, unit: "USD" }, link: { to: "/budgets", tab: "budgets" } });
  }
  for (const finding of buildSecurity(all, f).findings.filter((x) => isOpenFinding(x.status))) items.push({ id: `security-${finding.id}`, sourceId: finding.id, type: "security", title: `${finding.severity}: ${finding.title}`, sentence: `${finding.provider} has {figure} open finding to review.`, figure: { value: 1, unit: "count" }, link: { to: "/security", tab: "findings" } });
  for (const saving of buildSavings(all, f).items) items.push({ id: `recommendation-${saving.id}`, sourceId: saving.id, type: "recommendation", title: saving.title, sentence: "Potential monthly saving is {figure}.", figure: { value: saving.savings, unit: "USD" }, link: { to: "/recommendations", tab: "open" } });
  return { items, counts: { anomaly: items.filter((i) => i.type === "anomaly").length, budget: items.filter((i) => i.type === "budget").length, security: items.filter((i) => i.type === "security").length, recommendation: items.filter((i) => i.type === "recommendation").length } };
}