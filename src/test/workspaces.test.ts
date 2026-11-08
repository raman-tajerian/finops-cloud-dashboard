import { describe, expect, it } from "vitest";
import { buildCommitments, buildNotifications, buildTeams, BUILTIN_BUDGET_KEYS } from "@/data/workspaces";
import { buildDashboard, buildExplore } from "@/data/aggregate";
import { buildAlerts, buildSavings } from "@/data/budgets";
import { buildSecurity, isOpenFinding } from "@/data/security";
import { DEMO_TODAY, masterResources } from "@/data/resources";
import { defaultFilters, type Filters } from "@/lib/filters";
import { markNotificationsRead, unreadNotifications } from "@/lib/notifications";
import { showbackCsv } from "@/lib/showback";

const combinations: Filters[] = [defaultFilters, { ...defaultFilters, providers: ["AWS"], range: "7d" }, { ...defaultFilters, range: "q3", env: "Production" }, { ...defaultFilters, team: "Data", providers: ["Azure", "GCP"] }];
describe.each(combinations)("new workspaces for %o", (f) => {
  it("commitment coverage and utilization are deterministic and bounded", () => {
    const d = buildCommitments(masterResources, f);
    expect(d).toEqual(buildCommitments(masterResources, f));
    expect(d.coveragePct).toBeGreaterThanOrEqual(0);
    expect(d.coveragePct).toBeLessThanOrEqual(100);
    for (const c of d.commitments) {
      expect(c.coveragePct).toBeGreaterThanOrEqual(30); expect(c.coveragePct).toBeLessThanOrEqual(40);
      expect(c.utilizationPct).toBeGreaterThanOrEqual(75); expect(c.utilizationPct).toBeLessThanOrEqual(100);
      expect(c.committedSpend).toBeCloseTo(c.monthlyEligible * c.coveragePct / 100, 8);
      expect(c.expiringSoon).toBe(c.daysRemaining <= 30);
      expect(new Date(c.expires).getTime() - DEMO_TODAY.getTime()).toBe(c.daysRemaining * 86400000);
    }
    for (const r of d.recommendations) {
      const c = d.commitments.find((x) => x.provider === r.provider);
      expect(r.uncoveredStable).toBeCloseTo(r.stableBaseline * (1 - (c?.coveragePct ?? 0) / 100), 8);
      expect(r.monthlySaving).toBeCloseTo(r.uncoveredStable * 0.30, 8);
      expect(r.upfront).toBeCloseTo(r.uncoveredStable * 0.70, 8);
      expect(r.breakEvenMonths).toBeCloseTo(r.upfront / r.monthlySaving, 8);
    }
  });
  it("team totals equal Cost Explorer and sum to unchanged Overview spend", () => {
    const d = buildTeams(masterResources, f), explore = buildExplore(masterResources, f, "team");
    expect(d.total).toBe(explore.total);
    expect(d.teams.reduce((sum, t) => sum + t.spend, 0)).toBeCloseTo(buildDashboard(masterResources, f).overview.totalSpend.value, 8);
    for (const t of d.teams) {
      const row = explore.rows.find((r) => r.name === t.team);
      expect(t.spend).toBe(row?.current ?? 0); expect(t.previousSpend).toBe(row?.previous ?? 0); expect(t.changePct).toBe(row?.changePct ?? 0);
      expect(t.topResources).toEqual(t.resources.slice(0, 3));
      expect(t.resources.every((r) => r.team === t.team)).toBe(true);
    }
    expect(showbackCsv(d.teams)).toContain(String(d.teams[0]?.spend));
  });
  it("notification counts reconcile with each source aggregate", () => {
    const d = buildNotifications(masterResources, f), alerts = buildAlerts(masterResources, f);
    expect(d.counts.anomaly).toBe(buildDashboard(masterResources, f).overview.anomalies.value);
    expect(d.counts.security).toBe(buildSecurity(masterResources, f).findings.filter((x) => isOpenFinding(x.status)).length);
    expect(d.counts.recommendation).toBe(buildSavings(masterResources, f).items.length);
    expect(d.counts.budget).toBe(alerts.scopes.filter((b) => BUILTIN_BUDGET_KEYS.includes(b.key) && b.defaultAmount > 0 && b.forecast / b.defaultAmount >= 0.8).length);
    expect(Object.values(d.counts).reduce((a, b) => a + b, 0)).toBe(d.items.length);
    expect(new Set(d.items.map((i) => i.id)).size).toBe(d.items.length);
    expect(d).toEqual(buildNotifications(masterResources, f));
    for (const n of d.items) if (n.type === "anomaly") expect(n.figure.value).toBe(alerts.anomalies.find((a) => a.id === n.sourceId)?.impact);
  });
});
describe("notification read state and empty selections", () => {
  it("mark all read updates only the supplied session IDs", () => {
    const items = buildNotifications(masterResources, defaultFilters).items;
    expect(unreadNotifications(items, {}).length).toBe(items.length);
    const reads = markNotificationsRead(items, { other: true });
    expect(unreadNotifications(items, reads)).toEqual([]);
    expect(reads.other).toBe(true);
    expect(unreadNotifications(items, {}).length).toBe(items.length);
  });
  it("empty datasets return zero commitments, teams and notification totals", () => {
    expect(buildCommitments([], defaultFilters)).toEqual({ eligibleSpend: 0, committedSpend: 0, coveragePct: 0, commitments: [], recommendations: [] });
    expect(buildTeams([], defaultFilters).total).toBe(0);
    expect(buildNotifications([], defaultFilters)).toEqual({ items: [], counts: { anomaly: 0, budget: 0, security: 0, recommendation: 0 } });
  });
});