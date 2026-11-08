import { describe, expect, it } from "vitest";
import { masterResources } from "@/data/resources";
import { buildDashboard, buildSustainability } from "@/data/aggregate";
import { buildAlerts, buildSavings } from "@/data/budgets";
import { buildBudget } from "@/data/platformOps";
import { buildSecurity, isOpenFinding } from "@/data/security";
import { buildFernScore, buildInsights, calculateFernScore } from "@/data/insights";
import { defaultFilters, type Filters } from "@/lib/filters";
import { formatInsightFigure, formatInsightSentence } from "@/lib/insight-format";

const combinations: Filters[] = [defaultFilters, { ...defaultFilters, range: "7d", providers: ["AWS"] }, { ...defaultFilters, range: "q3", env: "Production" }, { ...defaultFilters, range: "custom", providers: ["Azure", "GCP"], team: "Data" }];
const clamp = (n: number) => Math.max(0, Math.min(100, n));

describe.each(combinations)("Fern score for %o", (filters) => {
  it("reuses all matching aggregates and the four weighted sub-scores", () => {
    const d = buildDashboard(masterResources, filters), b = buildBudget(masterResources, filters), s = buildSecurity(masterResources, filters);
    const result = buildFernScore(masterResources, filters);
    expect(result.inputs).toEqual({ spend: d.overview.totalSpend.value, idleWaste: d.overview.idleWaste.value, securityScore: s.score, budgetForecast: b.forecastEom, budgetAmount: b.defaultBudget, activeAnomalies: d.overview.anomalies.value });
    const expected = { waste: clamp(100 - d.overview.idleWaste.value / d.overview.totalSpend.value * 500), security: s.score, budget: clamp((1.30 - b.forecastEom / b.defaultBudget) * 250), anomaly: clamp(100 - 25 * d.overview.anomalies.value) };
    expect(result.subScores).toEqual(expected);
    expect(result.score).toBe(Math.round(0.35 * expected.waste + 0.25 * expected.security + 0.20 * expected.budget + 0.20 * expected.anomaly));
    expect(buildDashboard(masterResources, filters).overview).toEqual(d.overview);
  });
  it("insight figures exactly match their source aggregates and displayed sentences", () => {
    const d = buildDashboard(masterResources, filters), result = buildInsights(masterResources, filters);
    expect(result.insights.length).toBeGreaterThanOrEqual(3);
    expect(result.insights.length).toBeLessThanOrEqual(5);
    for (const insight of result.insights) {
      if (insight.type === "cost-mover") {
        const mover = [...d.movers.up, ...d.movers.down].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta) || a.id.localeCompare(b.id))[0];
        expect(insight.figure.value).toBe(Math.abs(mover?.delta ?? 0));
      }
      if (insight.type === "saving") expect(insight.figure.value).toBe(buildSavings(masterResources, filters).items[0]?.savings);
      if (insight.type === "budget") {
        const source = buildAlerts(masterResources, filters).scopes.find((s) => `budget-${s.key}` === insight.id);
        expect(source).toBeDefined();
        expect(insight.figure.value).toBe((source?.forecast ?? 0) - (source?.defaultAmount ?? 0));
        expect(insight.figure.value).toBeGreaterThan(0);
      }
      if (insight.type === "security") expect(insight.figure.value).toBe(buildSecurity(masterResources, filters).findings.filter((f) => f.severity === "Critical" && isOpenFinding(f.status)).length);
      if (insight.type === "greener-region") expect(insight.figure.value).toBe(Math.max(...buildSustainability(masterResources, filters).suggestions.map((s) => s.reductionTons)));
      expect(insight.sentence.match(/\{figure\}/g)?.length).toBe(1);
      expect(formatInsightSentence(insight)).toBe(insight.sentence.replace("{figure}", formatInsightFigure(insight.figure)));
    }
  });
  it("both new projections are deterministic", () => {
    expect(buildInsights(masterResources, filters)).toEqual(buildInsights(masterResources, filters));
    expect(buildFernScore(masterResources, filters)).toEqual(buildFernScore(masterResources, filters));
  });
});

const inputs = { spend: 100, idleWaste: 0, securityScore: 100, budgetForecast: 90, budgetAmount: 100, activeAnomalies: 0 };
describe("score boundaries", () => {
  it("20% idle waste gives zero, 10% gives 50, and none gives 100", () => {
    expect(calculateFernScore({ ...inputs, idleWaste: 20 }, 1).subScores.waste).toBe(0);
    expect(calculateFernScore({ ...inputs, idleWaste: 10 }, 1).subScores.waste).toBe(50);
    expect(calculateFernScore(inputs, 1).subScores.waste).toBe(100);
  });
  it("budget is 100 through 90%, 50 at 110%, zero at 130%", () => {
    for (const [forecast, score] of [[0, 100], [90, 100], [110, 50], [130, 0], [200, 0]]) expect(calculateFernScore({ ...inputs, budgetForecast: forecast ?? 0 }, 1).subScores.budget).toBeCloseTo(score ?? 0, 10);
  });
  it("each active anomaly subtracts 25 with a minimum of zero", () => {
    for (const n of [0, 1, 2, 3, 4, 8]) expect(calculateFernScore({ ...inputs, activeAnomalies: n }, 1).subScores.anomaly).toBe(Math.max(0, 100 - 25 * n));
  });
  it("all sub-scores and final scores clamp to 0–100", () => {
    for (const n of [-1000, 0, 1000]) {
      const d = calculateFernScore({ ...inputs, idleWaste: n, securityScore: n, budgetForecast: n, activeAnomalies: n }, 1);
      for (const value of [d.score, ...Object.values(d.subScores)]) {
        expect(value).not.toBeNull();
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(100);
      }
    }
  });
  it("zero resources or zero spend return null (display —), while missing budget with spend scores zero", () => {
    expect(calculateFernScore(inputs, 0).score).toBeNull();
    expect(calculateFernScore({ ...inputs, spend: 0 }, 1).subScores).toEqual({ waste: null, security: null, budget: null, anomaly: null });
    expect(calculateFernScore({ ...inputs, budgetAmount: 0 }, 1).subScores.budget).toBe(0);
  });
  it("real zero-resource filter combinations return no score and no insights despite account findings", () => {
    const providers = ["AWS", "Azure", "GCP"] as const;
    let checked = 0;
    for (const provider of providers) for (const env of ["Production", "Staging", "Development"] as const) for (const team of ["Platform", "Data", "FinOps", "Media"] as const) {
      const f: Filters = { ...defaultFilters, providers: [provider], env, team };
      if (buildDashboard(masterResources, f).resources.length) continue;
      checked++;
      expect(buildFernScore(masterResources, f).score).toBeNull();
      expect(Object.values(buildFernScore(masterResources, f).subScores)).toEqual([null, null, null, null]);
      expect(buildInsights(masterResources, f).insights).toEqual([]);
    }
    expect(checked).toBeGreaterThan(0);
  });
});