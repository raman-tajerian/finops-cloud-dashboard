import { describe, expect, it } from "vitest";
import { masterResources } from "@/data/resources";
import { buildDashboard, buildExplore, buildSustainability, groupTotals, totalOf, filterResources, windowOf } from "@/data/aggregate";
import { defaultFilters, type Filters } from "@/lib/filters";

const combos: Filters[] = [
  defaultFilters,
  { ...defaultFilters, range: "7d", providers: ["AWS"] },
  { ...defaultFilters, range: "q3", env: "Production" },
  { ...defaultFilters, providers: ["Azure", "GCP"], team: "Data" },
];
const sum = (xs: { value: number }[]) => xs.reduce((a, b) => a + b.value, 0);

describe("master dataset", () => {
  it("has 60+ resources with 90+ days of history", () => {
    expect(masterResources.length).toBeGreaterThanOrEqual(60);
    expect(masterResources.every((r) => r.daily.length >= 90)).toBe(true);
  });
});

describe.each(combos)("totals reconcile for %o", (f) => {
  const rs = filterResources(masterResources, f), w = windowOf(f.range), total = totalOf(rs, w);
  it("by provider, service and team equal total spend", () => {
    expect(sum(groupTotals(rs, w, "provider"))).toBeCloseTo(total, 6);
    expect(sum(groupTotals(rs, w, "service"))).toBeCloseTo(total, 6);
    expect(sum(groupTotals(rs, w, "team"))).toBeCloseTo(total, 6);
  });
  it("dashboard and explorer show the same total", () => {
    const d = buildDashboard(masterResources, f);
    expect(d.overview.totalSpend.value).toBeCloseTo(total, 6);
    expect(sum(d.services)).toBeCloseTo(total, 6);
    expect(sum(d.teams)).toBeCloseTo(total, 6);
    expect(buildExplore(masterResources, f, "region").total).toBeCloseTo(total, 6);
  });
});

describe("derived figures", () => {
  it("detects the seeded spikes and counts idle resources from data", () => {
    const d = buildDashboard(masterResources, defaultFilters);
    expect(d.kpis.anomalies.length).toBeGreaterThan(0);
    expect(d.overview.idleCount).toBe(masterResources.filter((r) => r.status === "Idle").length);
    expect(d.overview.savings.value).toBe(d.recommendations.reduce((a, b) => a + b.savings, 0));
  });
});

describe.each(combos)("carbon estimates reconcile for %o", (f) => {
  const sustainability = buildSustainability(masterResources, f);
  const total = sustainability.totalTons;
  it("matches every dimensional breakdown and Overview GreenOps", () => {
    expect(sustainability.regions.reduce((sum, row) => sum + row.tons, 0)).toBeCloseTo(total, 10);
    expect(sustainability.providers.reduce((sum, row) => sum + row.tons, 0)).toBeCloseTo(total, 10);
    expect(sustainability.services.reduce((sum, row) => sum + row.tons, 0)).toBeCloseTo(total, 10);
    expect(buildDashboard(masterResources, f).carbon.reduce((sum, row) => sum + row.tons, 0)).toBeCloseTo(total, 10);
  });
  it("only suggests regions with lower carbon intensity", () => {
    for (const suggestion of sustainability.suggestions) {
      expect(suggestion.suggestedIntensity).toBeLessThan(suggestion.currentIntensity);
    }
  });
});
