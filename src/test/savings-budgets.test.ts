import { describe, expect, it } from "vitest";
import { masterResources } from "@/data/resources";
import { buildDashboard, filterResources, rightsizeSaving } from "@/data/aggregate";
import { buildAlerts, buildSavings, parseAmount, scopeSpend, validateBudget } from "@/data/budgets";
import { defaultFilters, type Filters } from "@/lib/filters";

const combos: Filters[] = [
  defaultFilters,
  { ...defaultFilters, range: "7d", providers: ["AWS"] },
  { ...defaultFilters, range: "q3", env: "Production" },
  { ...defaultFilters, providers: ["Azure", "GCP"], team: "Data" },
];

describe("recommendations savings catalog", () => {
  it.each(combos)("open savings equal Overview Savings opportunity (%#)", (f) => {
    expect(buildSavings(masterResources, f).total).toBe(buildDashboard(masterResources, f).overview.savings.value);
  });
  it.each(combos)("sum per category equals the total; no negative savings (%#)", (f) => {
    const s = buildSavings(masterResources, f);
    const byCat = new Map<string, number>();
    for (const i of s.items) { expect(i.savings).toBeGreaterThanOrEqual(0); byCat.set(i.category, (byCat.get(i.category) ?? 0) + i.savings); }
    expect([...byCat.values()].reduce((a, b) => a + b, 0)).toBe(s.total);
  });
  it("right-sizing savings equal the sum of rightsizeSaving for affected resources", () => {
    const items = buildSavings(masterResources, defaultFilters).items.filter((i) => i.category === "Right-sizing");
    expect(items.length).toBeGreaterThan(0);
    for (const i of items) {
      const sum = masterResources.filter((r) => i.resourceIds.includes(r.id)).reduce((a, r) => a + rightsizeSaving(r), 0);
      expect(i.savings).toBe(Math.round(sum));
    }
  });
  it("unfiltered dataset yields at least 12 items", () => {
    expect(buildSavings(masterResources, defaultFilters).items.length).toBeGreaterThanOrEqual(12);
  });
  it("monthly target defaults to 60% of total potential", () => {
    const s = buildSavings(masterResources, defaultFilters);
    expect(s.target).toBe(Math.round(s.total * 0.6));
  });
});

describe("budgets & alerts", () => {
  it.each(combos)("scope All spent equals Overview Total spend; anomaly count matches (%#)", (f) => {
    const o = buildDashboard(masterResources, f), a = buildAlerts(masterResources, f);
    expect(scopeSpend(masterResources, f, { kind: "All", value: "All" }).spent).toBeCloseTo(o.overview.totalSpend.value, 6);
    expect(a.anomalies.length).toBe(o.overview.anomalies.value);
    expect(a.anomalies.map((x) => [x.id, x.change, x.impact])).toEqual(o.kpis.anomalies.map((x) => [x.id, x.change, x.impact]));
  });
  it("provider scopes sum to scope All", () => {
    const all = scopeSpend(masterResources, defaultFilters, { kind: "All", value: "All" }).spent;
    const sum = (["AWS", "Azure", "GCP"] as const).reduce((a, p) => a + scopeSpend(masterResources, defaultFilters, { kind: "Provider", value: p }).spent, 0);
    expect(sum).toBeCloseTo(all, 6);
    expect(filterResources(masterResources, defaultFilters).length).toBeGreaterThan(0);
  });
  const valid = { name: "Prod budget", scope: "All:All", period: "monthly", thresholds: [80], channels: ["Email"] };
  it.each(["0", "-500", ""])("rejects a budget with amount %j", (amt) => {
    const r = validateBudget({ ...valid, amount: parseAmount(amt) });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors["amount"]).toBeTruthy();
  });
  it("accepts a valid budget", () => {
    expect(validateBudget({ ...valid, amount: parseAmount("25000") }).ok).toBe(true);
  });
});
