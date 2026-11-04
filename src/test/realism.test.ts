import { describe, expect, it } from "vitest";
import { masterResources, DEMO_TODAY, HISTORY_DAYS } from "@/data/resources";
import { buildUsageHistory, usageHistory } from "@/data/usage";
import { buildDashboard, buildExplore, buildResources, buildSustainability, buildUnitEconomics, filterResources, previousOf, totalOf, windowOf } from "@/data/aggregate";
import { buildReport } from "@/data/reports";
import { buildBudget, buildKubernetes, buildScenario } from "@/data/platformOps";
import { buildSavings, buildAlerts } from "@/data/budgets";
import { buildSecurity } from "@/data/security";
import { simulate } from "@/lib/scenario";
import { defaultFilters, type Filters } from "@/lib/filters";

const combos: Filters[] = [defaultFilters, { ...defaultFilters, providers: ["AWS"] }, { ...defaultFilters, env: "Production", team: "Platform" }, { ...defaultFilters, providers: ["Azure", "GCP"], team: "Data" }];
describe("independent usage histories", () => {
  it("is deterministic, has the cost history length and ends on demo today", () => {
    expect(buildUsageHistory()).toEqual(usageHistory);
    expect(usageHistory).toHaveLength(HISTORY_DAYS);
    expect(usageHistory.at(-1)?.date).toBe(DEMO_TODAY.toISOString().slice(0, 10));
    expect(usageHistory.every((d) => d.date <= "2026-10-12" && d.activeUsers > 0 && d.apiRequests > 0)).toBe(true);
  });
  it("has plausible default unit costs with independently changing deltas", () => {
    const o = buildDashboard(masterResources, defaultFilters).overview;
    expect(o.costPerUser.value).toBeGreaterThanOrEqual(0.02);
    expect(o.costPerUser.value).toBeLessThanOrEqual(0.04);
    expect(o.costPerRequest.value).toBeGreaterThanOrEqual(0.00005);
    expect(o.costPerRequest.value).toBeLessThanOrEqual(0.0001);
    const delta = (k: {value: number; previous: number}) => k.value / k.previous - 1;
    expect(delta(o.costPerUser)).not.toBeCloseTo(delta(o.totalSpend), 5);
    expect(delta(o.costPerRequest)).not.toBeCloseTo(delta(o.totalSpend), 5);
    expect(delta(o.costPerUser)).not.toBeCloseTo(delta(o.costPerRequest), 5);
  });
});
describe.each(combos)("unit costs for %o", (base) => {
  it.each(["7d", "mtd", "q3", "custom"] as const)("matches exact current/previous formulas and all three screens for %s", (range) => {
    const f = { ...base, range }, rs = filterResources(masterResources, f), w = windowOf(range), pw = previousOf(w);
    const u = buildUnitEconomics(rs, w);
    const meanUsers = (start: number, end: number) => { const days = usageHistory.slice(start, end); return days.reduce((n, d) => n + d.activeUsers, 0) / days.length; };
    const requests = (start: number, end: number) => usageHistory.slice(start, end).reduce((n, d) => n + d.apiRequests, 0);
    expect(u.perUser).toBe(totalOf(rs, w) / meanUsers(w.start, w.end));
    expect(u.perRequest).toBe(totalOf(rs, w) / requests(w.start, w.end));
    expect(u.previousPerUser).toBe(totalOf(rs, pw) / meanUsers(pw.start, pw.end));
    expect(u.previousPerRequest).toBe(totalOf(rs, pw) / requests(pw.start, pw.end));
    const d = buildDashboard(masterResources, f), e = buildExplore(masterResources, f, "provider");
    for (const template of ["executive", "team", "savings", "security"] as const) {
      expect(buildReport(masterResources, f, template).unitEconomics).toEqual(e.unitEconomics);
    }
    expect(d.overview.costPerUser.value).toBe(e.unitEconomics.perUser);
    expect(d.overview.costPerRequest.value).toBe(e.unitEconomics.perRequest);
  });
});

function assertFinite(value: unknown): void {
  if (typeof value === "number") { expect(Number.isFinite(value)).toBe(true); expect(Object.is(value, -0)).toBe(false); }
  else if (Array.isArray(value)) value.forEach(assertFinite);
  else if (value && typeof value === "object") Object.values(value).forEach(assertFinite);
}
describe("empty filters", () => {
  const empty: Filters[] = [];
  for (const provider of ["AWS", "Azure", "GCP"] as const) for (const env of ["Production", "Staging", "Development"] as const) for (const team of ["Platform", "Data", "FinOps", "Media"] as const) {
    const f: Filters = { ...defaultFilters, providers: [provider], env, team };
    if (!filterResources(masterResources, f).length) empty.push(f);
  }
  it("has real empty combinations to exercise", () => expect(empty.length).toBeGreaterThan(0));
  it("all empty builders return finite numbers without negative zero", () => {
    for (const base of empty) for (const range of ["7d", "mtd", "q3", "custom"] as const) {
      const f = { ...base, range };
      for (const result of [buildDashboard(masterResources, f), buildExplore(masterResources, f, "provider"), buildResources(masterResources, f), buildSustainability(masterResources, f), buildKubernetes(masterResources, f), buildBudget(masterResources, f), buildScenario(masterResources, f), buildSavings(masterResources, f), buildAlerts(masterResources, f), buildSecurity(masterResources, f), ...(["executive", "team", "savings", "security"] as const).map((t) => buildReport(masterResources, f, t)), simulate(buildScenario(masterResources, f), { ri: 50, migrate: 50, rightsize: 50 })]) assertFinite(result);
    }
  });
  it("zero-day usage ratios use safe zero fallbacks", () => assertFinite(buildUnitEconomics([], { start: 0, end: 0, days: 0 })));
});