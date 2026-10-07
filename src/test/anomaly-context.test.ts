import { describe, expect, it } from "vitest";
import { masterResources } from "@/data/resources";
import { buildDashboard } from "@/data/aggregate";
import { buildAnomalyContext } from "@/data/anomalyContext";
import { defaultFilters, type Filters } from "@/lib/filters";

const combos: Filters[] = [
  defaultFilters,
  { ...defaultFilters, range: "7d", providers: ["AWS"] },
  { ...defaultFilters, range: "q3", env: "Production" },
  { ...defaultFilters, providers: ["Azure", "GCP"], team: "Data" },
];

describe("AI anomaly analysis context", () => {
  it.each(combos)("matches Overview total spend and active anomalies (%#)", (f) => {
    const ctx = buildAnomalyContext(masterResources, f);
    const o = buildDashboard(masterResources, f);
    expect(ctx.totalSpend).toBe(o.overview.totalSpend.value);
    expect(ctx.anomalies.length).toBe(o.overview.anomalies.value);
    expect(ctx.anomalies).toEqual(o.kpis.anomalies);
  });
  it("contains no legacy hard-coded total", () => {
    expect(JSON.stringify(buildAnomalyContext(masterResources, defaultFilters))).not.toContain("248730");
  });
});
