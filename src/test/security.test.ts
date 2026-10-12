import { describe, expect, it } from "vitest";
import { masterResources } from "@/data/resources";
import { buildFindings, buildSecurity, complianceResult, filterFindings, securityScore, SEVERITY_WEIGHTS } from "@/data/security";
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
    expect(account.length).toBe(12); // 4 IAM roles + 5 unused keys + 3 root MFA
    for (const f of account) expect(["AWS", "Azure", "GCP"]).toContain(f.provider);
  });

  it.each(combos)("score = 100 − weighted open findings, clamped at 0 (%#)", (f) => {
    const { findings, score } = buildSecurity(masterResources, f);
    const weighted = findings.filter((x) => x.status === "Open" || x.status === "In progress").reduce((a, x) => a + SEVERITY_WEIGHTS[x.severity], 0);
    expect(score).toBe(Math.max(0, 100 - weighted));
  });

  it("resolving a Critical finding raises the score by exactly 10 in the default state", () => {
    const { findings, score } = buildSecurity(masterResources, defaultFilters);
    const critical = findings.find((x) => x.severity === "Critical" && x.status === "Open");
    expect(critical).toBeDefined();
    const after = findings.map((x) => (x.id === critical!.id ? { ...x, status: "Resolved" as FindingStatus } : x));
    expect(securityScore(after)).toBe(score + 10);
  });

  it.each(combos)("per framework: pass + fail = controls, and a control fails only if a mapped open finding exists (%#)", (f) => {
    const { findings, frameworks } = buildSecurity(masterResources, f);
    for (const fw of frameworks) {
      expect(fw.controls.length).toBeGreaterThanOrEqual(10);
      const r = complianceResult(fw, findings);
      expect(r.passed + r.failed).toBe(fw.controls.length);
      const openRules = new Set(findings.filter((x) => x.status === "Open" || x.status === "In progress").map((x) => x.rule));
      for (const c of r.controls) expect(c.passed).toBe(!c.rules.some((rule) => openRules.has(rule)));
    }
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
