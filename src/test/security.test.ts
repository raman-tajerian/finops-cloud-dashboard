import { describe, expect, it } from "vitest";
import { DEMO_TODAY, masterResources } from "@/data/resources";
import { fmtScore, buildFindings, buildSecurity, complianceResult, filterFindings, securityScore, SEVERITY_WEIGHTS } from "@/data/security";
import { defaultFilters, type Filters } from "@/lib/filters";
import type { FindingStatus, Severity } from "@/types/finops";

const combos: Filters[] = [
  defaultFilters,
  { ...defaultFilters, range: "7d", providers: ["AWS"] },
  { ...defaultFilters, range: "q3", env: "Production" },
  { ...defaultFilters, providers: ["Azure", "GCP"], team: "Data" },
];

const RULE_SERVICES: Record<string, Set<string>> = {
  "ssh-open": new Set(["EC2", "Azure VM", "GCP Compute"]),
  "public-bucket": new Set(["S3", "Blob"]),
  "unencrypted-db": new Set(["RDS", "SQL DB"]),
  "outdated-k8s": new Set(["EKS", "AKS", "GKE"]),
};

describe("security findings", () => {
  it.each(combos)("severity counts add up to the total (%#)", (f) => {
    const { findings } = buildSecurity(masterResources, f);
    const bySev = new Map<Severity, number>();
    for (const x of findings) bySev.set(x.severity, (bySev.get(x.severity) ?? 0) + 1);
    expect([...bySev.values()].reduce((a, b) => a + b, 0)).toBe(findings.length);
  });

  it("every resource-level finding references an existing resource matching its type rule", () => {
    const byId = new Map(masterResources.map((r) => [r.id, r]));
    for (const f of buildFindings(masterResources)) {
      if (!f.resourceId) continue; // account-level findings reference the provider
      const r = byId.get(f.resourceId);
      expect(r, `finding ${f.id} references missing resource ${f.resourceId}`).toBeDefined();
      expect(RULE_SERVICES[f.rule]?.has(r!.service), `${f.rule} on ${r!.service}`).toBe(true);
      expect(r!.provider).toBe(f.provider);
    }
  });

  it("account-level findings have no resource id and a valid provider", () => {
    const account = buildFindings(masterResources).filter((f) => !f.resourceId);
    expect(account.length).toBe(7); // 3 IAM roles + 3 unused keys + 1 root MFA
    for (const f of account) expect(["AWS", "Azure", "GCP"]).toContain(f.provider);
  });

  it.each(combos)("score = 100 − weighted open findings, clamped at 0 (%#)", (f) => {
    const { findings, score } = buildSecurity(masterResources, f);
    const weighted = findings.filter((x) => x.status === "Open" || x.status === "In progress").reduce((a, x) => a + SEVERITY_WEIGHTS[x.severity], 0);
    expect(score).toBe(Math.max(0, 100 - weighted));
  });

  it("resolving a Critical finding raises the score by exactly 8 in the default state", () => {
    const { findings, score } = buildSecurity(masterResources, defaultFilters);
    const critical = findings.find((x) => x.severity === "Critical" && x.status === "Open");
    expect(critical).toBeDefined();
    const after = findings.map((x) => (x.id === critical!.id ? { ...x, status: "Resolved" as FindingStatus } : x));
    expect(securityScore(after)).toBe(score + 8);
  });

  it.each(combos)("per framework: pass + fail + not assessed = controls, and a control fails only if a mapped open finding exists (%#)", (f) => {
    const { findings, frameworks } = buildSecurity(masterResources, f);
    for (const fw of frameworks) {
      expect(fw.controls.length).toBeGreaterThanOrEqual(10);
      const r = complianceResult(fw, findings);
      expect(r.passed + r.failed + r.notAssessed).toBe(fw.controls.length);
      const openRules = new Set(findings.filter((x) => x.status === "Open" || x.status === "In progress").map((x) => x.rule));
      for (const c of r.controls) {
        if (c.rules.length === 0) expect(c.status).toBe("not-assessed");
        else expect(c.status).toBe(c.rules.some((rule) => openRules.has(rule)) ? "fail" : "pass");
      }
    }
  });

  it("default state: 12–18 open findings and score 60–75", () => {
    const { findings, score } = buildSecurity(masterResources, defaultFilters);
    const open = findings.filter((x) => x.status === "Open" || x.status === "In progress").length;
    expect(open).toBeGreaterThanOrEqual(12);
    expect(open).toBeLessThanOrEqual(18);
    expect(score).toBeGreaterThanOrEqual(60);
    expect(score).toBeLessThanOrEqual(75);
  });

  it("every finding rule with eligible resources has at least one finding by default", () => {
    const { findings } = buildSecurity(masterResources, defaultFilters);
    const rules = new Set(findings.map((x) => x.rule));
    for (const [rule, services] of Object.entries(RULE_SERVICES)) if (masterResources.some((r) => services.has(r.service))) expect(rules.has(rule as never), rule).toBe(true);
    for (const rule of ["iam-overpermissive", "unused-keys", "no-mfa-root"]) expect(rules.has(rule as never), rule).toBe(true);
  });

  it("fmtScore always shows one decimal", () => {
    expect(fmtScore(65.5)).toBe("65.5");
    expect(fmtScore(70)).toBe("70.0");
  });

  it("no first-detected date is after DEMO_TODAY", () => {
    const today = DEMO_TODAY.toISOString().slice(0, 10);
    for (const f of buildFindings(masterResources)) expect(f.detected <= today).toBe(true);
  });

  it("building findings twice returns identical results (deterministic)", () => {
    expect(buildFindings(masterResources)).toEqual(buildFindings(masterResources));
  });

  it.each(combos)("filtered findings respect provider, environment and team (%#)", (f) => {
    const all = buildFindings(masterResources);
    const filtered = filterFindings(all, masterResources, f);
    const visible = new Set(masterResources.filter((r) => f.providers.includes(r.provider) && (f.env === "All" || r.environment === f.env) && (f.team === "All" || r.team === f.team)).map((r) => r.id));
    for (const x of filtered) {
      if (x.resourceId) expect(visible.has(x.resourceId)).toBe(true);
      else expect(f.providers.includes(x.provider)).toBe(true);
    }
  });
});
