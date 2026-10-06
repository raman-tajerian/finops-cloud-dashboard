import { describe, expect, it } from "vitest";
import { masterResources } from "@/data/resources";
import { buildDashboard, buildResources } from "@/data/aggregate";
import { buildBudget, buildKubernetes, buildScenario, budgetTone } from "@/data/platformOps";
import { simulate } from "@/lib/scenario";
import { defaultFilters, type Filters } from "@/lib/filters";

const combos: Filters[] = [
  defaultFilters,
  { ...defaultFilters, range: "7d", providers: ["AWS"] },
  { ...defaultFilters, range: "q3", env: "Production" },
  { ...defaultFilters, providers: ["Azure", "GCP"], team: "Data" },
];

describe("kubernetes", () => {
  it.each(combos)("namespace costs sum to cluster cost; clusters sum to EKS+AKS+GKE on Resources (%#)", (f) => {
    const k = buildKubernetes(masterResources, f);
    for (const c of k.clusters) expect(c.namespaces.reduce((a, n) => a + n.cost, 0)).toBeCloseTo(c.monthlyCost, 6);
    const res = buildResources(masterResources, f).items.filter((r) => ["EKS", "AKS", "GKE"].includes(r.service));
    expect(k.totalCost).toBeCloseTo(res.reduce((a, r) => a + r.monthlyCost, 0), 6);
    expect(k.clusters.length).toBe(res.length);
  });
  it("pod counts are deterministic and healthy + failed = total", () => {
    const a = buildKubernetes(masterResources, defaultFilters), b = buildKubernetes(masterResources, defaultFilters);
    expect(a).toEqual(b);
    for (const c of a.clusters) {
      expect(c.podsHealthy + c.podsFailed).toBe(c.podsTotal);
      expect(c.podsTotal).toBe(Math.max(3, Math.round(c.monthlyCost / 350)) * 14);
      expect(c.pods.filter((p) => p.status !== "Running").length).toBe(c.podsFailed);
      expect(c.podsFailed).toBe(Math.round(c.podsTotal * (c.status === "Warning" ? 0.04 : 0.01)));
    }
  });
});

describe("scenario simulator", () => {
  it.each(combos)("baseline equals Overview total spend and zero sliders change nothing (%#)", (f) => {
    const s = buildScenario(masterResources, f);
    expect(s.baseline).toBeCloseTo(buildDashboard(masterResources, f).overview.totalSpend.value, 6);
    const r = simulate(s, { ri: 0, migrate: 0, rightsize: 0 });
    expect(r.projected).toBe(s.baseline);
    expect(r.savings).toBe(0);
  });
  it("Reserved Instances applies 30% to the shifted compute share", () => {
    const s = buildScenario(masterResources, defaultFilters);
    expect(simulate(s, { ri: 50, migrate: 0, rightsize: 0 }).ri).toBeCloseTo(s.computeSpend * 0.5 * 0.3, 6);
  });
});

describe("budget", () => {
  it.each(combos)("forecast equals the Overview forecast (%#)", (f) => {
    expect(buildBudget(masterResources, f).forecastEom).toBeCloseTo(buildDashboard(masterResources, f).overview.forecastEom.value, 6);
  });
  it("default budget is 105% of previous quarter spend / 3", () => {
    const b = buildBudget(masterResources, defaultFilters);
    expect(b.defaultBudget).toBe(Math.round((b.previousQuarterSpend / 3) * 1.05));
  });
  it("bar tone changes at 80% and 100%", () => {
    expect(budgetTone(79.9)).toBe("success");
    expect(budgetTone(80)).toBe("warning");
    expect(budgetTone(100)).toBe("critical");
  });
});
