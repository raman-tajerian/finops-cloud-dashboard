import { describe, expect, it } from "vitest";
import { masterResources } from "@/data/resources";
import { buildDashboard, buildRecommendations, buildResourceDetail, buildResources, rightsizeSaving } from "@/data/aggregate";
import { defaultFilters, type Filters } from "@/lib/filters";

const combos: Filters[] = [
  defaultFilters,
  { ...defaultFilters, range: "7d", providers: ["AWS"] },
  { ...defaultFilters, range: "q3", env: "Production" },
  { ...defaultFilters, providers: ["Azure", "GCP"], team: "Data" },
  { ...defaultFilters, range: "custom", team: "Media" },
];

describe.each(combos)("Resources matches Overview for %o", (f) => {
  const res = buildResources(masterResources, f), dash = buildDashboard(masterResources, f);
  it("resource count is identical", () => expect(res.count).toBe(dash.resources.length));
  it("spend in period equals Overview total spend", () => expect(res.periodTotal).toBeCloseTo(dash.overview.totalSpend.value, 6));
  it("monthly cost sum equals the Overview resource list", () => expect(res.monthlyTotal).toBe(dash.resources.reduce((a, r) => a + r.monthlyCost, 0)));
});

describe("right-sizing", () => {
  const recs = buildRecommendations(masterResources);
  it("drawer saving equals the recommendation saving for the same resource", () => {
    const candidates = masterResources.filter((r) => rightsizeSaving(r) > 0);
    expect(candidates.length).toBeGreaterThan(0);
    for (const r of candidates) {
      const group = masterResources.filter((x) => x.service === r.service && x.team === r.team && (x.status === "Idle") === (r.status === "Idle") && rightsizeSaving(x) > 0);
      const rec = recs.find((x) => x.id === `rec-${r.status === "Idle" ? "idle" : "size"}-${r.service}-${r.team}`.toLowerCase().replace(/\s+/g, "-"));
      expect(rec).toBeDefined();
      expect(rec!.savings).toBe(Math.round(group.reduce((a, x) => a + rightsizeSaving(x), 0)));
      expect(buildResourceDetail(masterResources, r.id)!.rightsizing!.saving).toBe(rightsizeSaving(r));
      if (group.length === 1) expect(rec!.savings).toBe(Math.round(rightsizeSaving(r)));
    }
  });
});
