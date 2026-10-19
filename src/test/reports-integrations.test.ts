import { describe, expect, it } from "vitest";
import { masterResources } from "@/data/resources";
import { buildReport, reportToCsv } from "@/data/reports";
import { buildDashboard, buildExplore } from "@/data/aggregate";
import { buildSavings } from "@/data/budgets";
import { buildSecurity, isOpenFinding } from "@/data/security";
import { buildIntegrations, testConnection } from "@/data/integrations";
import { isEmail, isGcpProjectId, isGuid, isRoleArn } from "@/lib/validators";
import { defaultFilters, type Filters } from "@/lib/filters";

const combos: Filters[] = [defaultFilters, { ...defaultFilters, range: "7d", providers: ["AWS"] }, { ...defaultFilters, range: "q3", env: "Production" }, { ...defaultFilters, providers: ["Azure", "GCP"], team: "Data" }];
const r2 = (n: number) => Math.round(n * 100) / 100;

describe("report totals match other pages", () => {
  it.each(combos)("executive = Overview (%#)", (f) => {
    const d = buildDashboard(masterResources, f), r = buildReport(masterResources, f, "executive");
    expect(r.totals["totalSpend"]).toBe(r2(d.overview.totalSpend.value));
    expect(r.totals["savingsOpportunity"]).toBe(r2(d.overview.savings.value));
    expect(r.totals["activeAnomalies"]).toBe(d.overview.anomalies.value);
  });
  it.each(combos)("team = Cost Explorer and Overview total (%#)", (f) => {
    const r = buildReport(masterResources, f, "team");
    expect(r.totals["totalSpend"]).toBe(r2(buildExplore(masterResources, f, "team").total));
    expect(r.totals["totalSpend"]).toBeCloseTo(buildDashboard(masterResources, f).overview.totalSpend.value, 1);
  });
  it.each(combos)("savings = Recommendations (%#)", (f) => {
    const s = buildSavings(masterResources, f), r = buildReport(masterResources, f, "savings");
    expect(r.totals["totalSavings"]).toBe(r2(s.total));
    expect(r.totals["items"]).toBe(s.items.length);
  });
  it.each(combos)("security = Security page (%#)", (f) => {
    const s = buildSecurity(masterResources, f), r = buildReport(masterResources, f, "security");
    expect(r.totals["score"]).toBe(s.score);
    expect(r.totals["openFindings"]).toBe(s.findings.filter((x) => isOpenFinding(x.status)).length);
  });
});

describe("exports", () => {
  it.each(["executive", "team", "savings", "security"] as const)("CSV and JSON carry the same rows and totals (%s)", (t) => {
    const r = buildReport(masterResources, defaultFilters, t);
    const csv = reportToCsv(r);
    for (const [k, v] of Object.entries(r.totals)) expect(csv).toContain(`${k},${v}`);
    const rows = r.sections.reduce((a, s) => a + s.rows.length, 0);
    const dataLines = csv.split("\n").filter((l) => l && !l.startsWith("#")).length;
    expect(dataLines).toBe(1 + Object.keys(r.totals).length + r.sections.length + rows);
    expect(JSON.parse(JSON.stringify(r))).toEqual(r);
  });
});

describe("validators", () => {
  it("email", () => { expect(isEmail("a@fjordlabs.example")).toBe(true); expect(isEmail("a@b")).toBe(false); expect(isEmail("nope")).toBe(false); });
  it("role ARN", () => { expect(isRoleArn("arn:aws:iam::123456789012:role/FernReadOnly")).toBe(true); expect(isRoleArn("arn:aws:iam::123:role/x")).toBe(false); expect(isRoleArn("role/x")).toBe(false); });
  it("GUID", () => { expect(isGuid("0a1b2c3d-4e5f-6789-abcd-ef0123456789")).toBe(true); expect(isGuid("0a1b2c3d")).toBe(false); });
  it("project ID", () => { expect(isGcpProjectId("fjord-billing-prod")).toBe(true); expect(isGcpProjectId("Fjord_Prod")).toBe(false); expect(isGcpProjectId("ab")).toBe(false); });
});

describe("integrations", () => {
  it("connected providers equal distinct dataset providers", () => {
    const want = [...new Set(masterResources.map((r) => r.provider))].sort();
    const got = buildIntegrations(masterResources).integrations.filter((i) => i.kind === "cloud" && i.status === "Connected").map((i) => i.name).sort();
    expect(got).toEqual(want);
  });
  it("test connection is deterministic", () => {
    for (const v of ["arn:aws:iam::123456789012:role/R", "bad"]) expect(testConnection("aws-role-arn", v)).toEqual(testConnection("aws-role-arn", v));
    expect(testConnection("aws-role-arn", "arn:aws:iam::123456789012:role/R").ok).toBe(true);
    expect(testConnection("gcp-project-id", "bad id").ok).toBe(false);
  });
});
