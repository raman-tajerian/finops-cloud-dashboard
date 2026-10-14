// Security findings derived deterministically from the master dataset (seeded PRNG, no render-time randomness).
// Findings are simulated — no real scanning takes place.
import type { Filters } from "@/lib/filters";
import type { CloudProvider, MasterResource } from "@/types/finops";
import type { ComplianceFrameworkDto, FindingRule, FindingStatus, SecurityDto, SecurityFindingDto, Severity } from "@/types/finops";
import { DATA_END_DATE, mulberry32 } from "./resources";
import { filterResources } from "./aggregate";

/** Score weights per severity — the formula documented in the UI: score = 100 − Σ weight(open finding), clamped at 0. */
export const SEVERITY_WEIGHTS: Record<Severity, number> = { Critical: 8, High: 4, Medium: 1.5, Low: 0.5 };
export const SEVERITY_ORDER: Severity[] = ["Critical", "High", "Medium", "Low"];

interface RuleMeta { severity: Severity; title: string; description: string; impact: string; steps: string[]; snippet: string }
export const RULE_META: Record<FindingRule, RuleMeta> = {
  "ssh-open": {
    severity: "Critical",
    title: "Open SSH (port 22) to 0.0.0.0/0",
    description: "The security group / firewall rule attached to this compute resource allows inbound SSH from any IP address on the internet.",
    impact: "Anyone on the internet can attempt to log in. Brute-force and credential-stuffing attacks against exposed SSH are among the most common cloud intrusion vectors.",
    steps: ["Restrict port 22 to known office/VPN CIDR ranges", "Prefer SSM Session Manager / Azure Bastion / IAP tunneling over direct SSH", "Audit recent auth logs for unexpected source IPs"],
    snippet: `# Terraform: restrict SSH to a trusted CIDR\nresource "aws_security_group_rule" "ssh" {\n  type        = "ingress"\n  from_port   = 22\n  to_port     = 22\n  protocol    = "tcp"\n  cidr_blocks = ["203.0.113.0/24"] # office/VPN only\n}`,
  },
  "public-bucket": {
    severity: "High",
    title: "Public storage bucket",
    description: "This storage bucket allows public read access. Objects may be downloadable by anyone without authentication.",
    impact: "Sensitive data stored in the bucket can be leaked publicly, leading to data-breach exposure and compliance violations.",
    steps: ["Enable block-public-access at the account and bucket level", "Remove public ACLs / anonymous access policies", "Serve shared assets through a CDN with signed URLs instead"],
    snippet: `# Terraform: block all public access\nresource "aws_s3_bucket_public_access_block" "this" {\n  bucket                  = aws_s3_bucket.this.id\n  block_public_acls       = true\n  block_public_policy     = true\n  ignore_public_acls      = true\n  restrict_public_buckets = true\n}`,
  },
  "unencrypted-db": {
    severity: "High",
    title: "Unencrypted database",
    description: "This database instance does not have storage-at-rest encryption enabled.",
    impact: "Snapshots, backups and the underlying storage volume are readable if the storage layer is compromised, exposing all contained data.",
    steps: ["Create an encrypted snapshot and restore into a new encrypted instance", "Enable transparent data encryption (TDE) going forward", "Rotate credentials after migration"],
    snippet: `# CLI: restore into an encrypted instance\naws rds copy-db-snapshot \\\n  --source-db-snapshot-identifier snap-1 \\\n  --target-db-snapshot-identifier snap-1-enc \\\n  --kms-key-id alias/rds-key`,
  },
  "iam-overpermissive": {
    severity: "Medium",
    title: "Over-permissive IAM role",
    description: "An IAM role grants wildcard actions (e.g. *:*) or wildcard resources far beyond what the attached workload needs.",
    impact: "If the role is compromised, an attacker gains broad access across the account, dramatically increasing blast radius.",
    steps: ["Scope actions to the exact services used", "Scope resources to specific ARNs", "Enable access-analyzer findings for unused permissions"],
    snippet: `# Terraform: least-privilege policy\ndata "aws_iam_policy_document" "app" {\n  statement {\n    actions   = ["s3:GetObject"]\n    resources = ["arn:aws:s3:::app-assets/*"]\n  }\n}`,
  },
  "unused-keys": {
    severity: "Medium",
    title: "Unused IAM access key older than 90 days",
    description: "A programmatic access key has not been used for more than 90 days but remains active.",
    impact: "Dormant keys are a common source of undetected compromise — they are rarely rotated and often over-privileged.",
    steps: ["Deactivate the key and monitor for failures", "Delete the key after a 14-day grace period", "Move workloads to short-lived credentials (roles / managed identities)"],
    snippet: `# CLI: deactivate an unused key\naws iam update-access-key \\\n  --access-key-id AKIA... \\\n  --status Inactive \\\n  --user-name svc-legacy`,
  },
  "no-mfa-root": {
    severity: "Critical",
    title: "Missing MFA on root account",
    description: "The provider root / global administrator account does not have multi-factor authentication enabled.",
    impact: "The root account has unrestricted access to everything, including billing and account closure. A single phished password is a full takeover.",
    steps: ["Enable a hardware MFA device on the root account immediately", "Remove root access keys if any exist", "Use day-to-day admin roles instead of root"],
    snippet: `# Console: IAM → Security credentials → Assign MFA device\n# Azure: Entra ID → Security → MFA → enable for Global Admin\n# GCP:  Admin console → Security → 2-Step Verification → enforce`,
  },
  "outdated-k8s": {
    severity: "Low",
    title: "Outdated Kubernetes version",
    description: "This cluster runs a Kubernetes minor version that is behind the latest supported release line.",
    impact: "Older versions stop receiving security patches, leaving known CVEs unpatched on the control plane and nodes.",
    steps: ["Review the provider's version-support policy", "Upgrade the control plane, then node pools, one minor version at a time", "Re-run workload conformance checks after each step"],
    snippet: `# CLI: upgrade the control plane\naws eks update-cluster-version \\\n  --name CLUSTER --kubernetes-version 1.31`,
  },
};

const COMPUTE_SERVICES = new Set(["EC2", "Azure VM", "GCP Compute"]);
const BUCKET_SERVICES = new Set(["S3", "Blob"]);
const DB_SERVICES = new Set(["RDS", "SQL DB"]);
const K8S_SERVICES = new Set(["EKS", "AKS", "GKE"]);
/** Selection rates per resource-level rule (documented; applied with a seeded PRNG over the full dataset). */
export const RULE_RATES: Partial<Record<FindingRule, number>> = { "ssh-open": 0.06, "public-bucket": 0.05, "unencrypted-db": 0.08, "outdated-k8s": 0.2 };
/** Fixed account-level finding counts per provider (documented). */
export const ACCOUNT_COUNTS: Record<string, Partial<Record<FindingRule, number>>> = {
  AWS: { "iam-overpermissive": 1, "unused-keys": 1 },
  Azure: { "iam-overpermissive": 1, "unused-keys": 1, "no-mfa-root": 1 },
  GCP: { "iam-overpermissive": 1, "unused-keys": 1 },
};

const iso = (d: Date) => d.toISOString().slice(0, 10);

/** All findings over the full dataset. Deterministic: same input → identical output. */
export function buildFindings(all: MasterResource[]): SecurityFindingDto[] {
  const rnd = mulberry32(20261026);
  const detected = () => iso(new Date(DATA_END_DATE.getTime() - Math.floor(rnd() * 90) * 86_400_000));
  const out: SecurityFindingDto[] = [];
  const push = (rule: FindingRule, r: MasterResource | null, provider: CloudProvider, n?: number) => {
    const meta = RULE_META[rule];
    out.push({
      id: `sec-${rule}-${r ? r.id : `${provider.toLowerCase()}-${n}`}`,
      rule, severity: meta.severity, title: r ? `${meta.title} · ${r.name}` : n && n > 1 ? `${meta.title} (${n})` : meta.title,
      resourceId: r?.id ?? null, provider, detected: detected(), status: "Open",
      description: meta.description, impact: meta.impact, steps: meta.steps, snippet: meta.snippet,
    });
  };
  // Each resource-level rule draws one seeded number per eligible resource; selected when draw < rate.
  // Guarantee: if a rule has eligible resources but no draw fell under the rate, the resource with the lowest draw is selected.
  const ELIGIBLE: [FindingRule, Set<string>][] = [["ssh-open", COMPUTE_SERVICES], ["public-bucket", BUCKET_SERVICES], ["unencrypted-db", DB_SERVICES], ["outdated-k8s", K8S_SERVICES]];
  const best = new Map<FindingRule, { r: MasterResource; d: number }>();
  const hit = new Set<FindingRule>();
  for (const r of all) {
    for (const [rule, services] of ELIGIBLE) {
      if (!services.has(r.service)) continue;
      const d = rnd();
      if (d < RULE_RATES[rule]!) { push(rule, r, r.provider); hit.add(rule); }
      else if (!best.has(rule) || d < best.get(rule)!.d) best.set(rule, { r, d });
    }
  }
  for (const [rule] of ELIGIBLE) if (!hit.has(rule) && best.has(rule)) { const { r } = best.get(rule)!; push(rule, r, r.provider); }
  for (const provider of ["AWS", "Azure", "GCP"] as CloudProvider[])
    for (const [rule, count] of Object.entries(ACCOUNT_COUNTS[provider] ?? {}) as [FindingRule, number][])
      for (let n = 1; n <= count; n++) push(rule, null, provider, count > 1 ? n : undefined);
  return out.sort((a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity) || a.detected.localeCompare(b.detected));
}

/** Respect the global filters: resource-level findings follow their resource; account-level findings follow the provider. */
export function filterFindings(findings: SecurityFindingDto[], all: MasterResource[], f: Filters): SecurityFindingDto[] {
  const visible = new Set(filterResources(all, f).map((r) => r.id));
  return findings.filter((x) => (x.resourceId ? visible.has(x.resourceId) : f.providers.includes(x.provider)));
}

/** Statuses that count as "open" for the score and compliance checks. */
export const isOpenFinding = (s: FindingStatus) => s === "Open" || s === "In progress";

/** Security score 0–100 = 100 − weighted open findings (Critical 8, High 4, Medium 1.5, Low 0.5), clamped at 0. */
export function securityScore(findings: Pick<SecurityFindingDto, "severity" | "status">[]): number {
  const open = findings.filter((x) => isOpenFinding(x.status));
  return Math.max(0, 100 - open.reduce((a, x) => a + SEVERITY_WEIGHTS[x.severity], 0));
}

const fw = (id: string, name: string, controls: [string, string, FindingRule[]][]): ComplianceFrameworkDto => ({
  id, name, controls: controls.map(([cid, cname, rules]) => ({ id: cid, name: cname, rules })),
});
/** Fixed control lists; each control maps to one or more finding rules and fails if any mapped finding is open. */
export const COMPLIANCE_FRAMEWORKS: ComplianceFrameworkDto[] = [
  // Illustrative, simplified controls — not an audit. Controls with no mapped rule have no simulated check and pass.
  fw("cis", "CIS Foundations", [
    ["cis-1.5", "MFA enabled for the root account", ["no-mfa-root"]],
    ["cis-1.12", "No unused credentials older than 90 days", ["unused-keys"]],
    ["cis-1.16", "IAM policies least-privilege", []],
    ["cis-2.1", "Storage buckets not publicly accessible", []],
    ["cis-2.2", "Storage encryption at rest", ["unencrypted-db"]],
    ["cis-3.1", "Database storage encrypted", ["unencrypted-db"]],
    ["cis-4.1", "No unrestricted SSH ingress", ["ssh-open"]],
    ["cis-4.2", "No unrestricted RDP ingress", []],
    ["cis-5.1", "Network ACLs restrict inbound", []],
    ["cis-7.1", "Kubernetes clusters on supported versions", []],
  ]),
  fw("soc2", "SOC 2", [
    ["cc6.1", "Logical access restricted (MFA)", ["no-mfa-root"]],
    ["cc6.2", "Credentials rotated and decommissioned", []],
    ["cc6.6", "Boundary protection of network services", ["ssh-open"]],
    ["cc6.7", "Transmission and storage restricted", ["public-bucket"]],
    ["cc6.8", "Unauthorized software prevented", []],
    ["cc7.1", "Vulnerabilities detected and remediated", []],
    ["cc7.2", "Security events monitored", []],
    ["cc8.1", "Changes authorized and tested", []],
    ["a1.2", "Data encrypted at rest", ["unencrypted-db"]],
    ["c1.1", "Confidential data protected", ["unencrypted-db"]],
  ]),
  fw("iso27001", "ISO 27001", [
    ["a5.15", "Access control policy enforced", ["iam-overpermissive"]],
    ["a5.17", "Authentication information managed", ["unused-keys"]],
    ["a5.18", "Access rights reviewed", []],
    ["a8.2", "Privileged access restricted", ["no-mfa-root"]],
    ["a8.3", "Information access restriction", []],
    ["a8.9", "Configuration management", []],
    ["a8.12", "Data leakage prevention", []],
    ["a8.16", "Monitoring activities", []],
    ["a8.20", "Network security", []],
    ["a8.24", "Use of cryptography", ["unencrypted-db"]],
    ["a8.32", "Change management", []],
  ]),
  fw("gdpr", "GDPR", [
    ["art5.1f", "Integrity and confidentiality of data", ["public-bucket"]],
    ["art25", "Data protection by design and default", ["unencrypted-db"]],
    ["art32.1a", "Encryption of personal data at rest", ["unencrypted-db"]],
    ["art32.1b", "Confidentiality of systems and services", ["ssh-open"]],
    ["art32.1c", "Availability and resilience", []],
    ["art32.1d", "Regular testing and evaluation", ["outdated-k8s"]],
    ["art32.2", "Risk-appropriate security level", []],
    ["art32.4", "Access limited to instructed personnel", []],
    ["art33", "Breach notification readiness", []],
    ["art35", "Data protection impact assessment", []],
  ]),
];

/** One shared score formatter: always one decimal (e.g. 65.5, 70.0). */
export const fmtScore = (n: number) => n.toFixed(1);

/** Per-framework result. Controls with no mapped rule are "not assessed" and excluded from the pass percentage;
 *  an assessed control fails only if an open finding of a mapped rule exists. passed + failed + notAssessed = total. */
export function complianceResult(framework: ComplianceFrameworkDto, findings: Pick<SecurityFindingDto, "rule" | "status" | "id" | "title" | "severity">[]) {
  const openRules = new Set(findings.filter((x) => isOpenFinding(x.status)).map((x) => x.rule));
  const controls = framework.controls.map((c) => {
    const assessed = c.rules.length > 0;
    const failed = assessed && c.rules.some((r) => openRules.has(r));
    const status: "pass" | "fail" | "not-assessed" = !assessed ? "not-assessed" : failed ? "fail" : "pass";
    return { ...c, status, passed: status === "pass", findings: failed ? findings.filter((x) => c.rules.includes(x.rule) && isOpenFinding(x.status)) : [] };
  });
  const failed = controls.filter((c) => c.status === "fail").length;
  const notAssessed = controls.filter((c) => c.status === "not-assessed").length;
  const passed = controls.length - failed - notAssessed;
  const assessed = passed + failed;
  return { controls, passed, failed, notAssessed, assessed, total: controls.length, passPct: assessed ? (passed / assessed) * 100 : 0 };
}

/** Full security payload for one filter combination: GET /api/v1/security */
export function buildSecurity(all: MasterResource[], f: Filters): SecurityDto {
  const findings = filterFindings(buildFindings(all), all, f);
  const score = securityScore(findings);
  // Seeded demo trend: 6 months, last value = the computed score. Labelled "Demo" in the UI.
  const rnd = mulberry32(20260401);
  const months = ["May", "Jun", "Jul", "Aug", "Sep", "Oct"];
  const drift = months.map(() => Math.round((rnd() - 0.35) * 14));
  const scoreTrend = months.map((month, i) => {
    if (i === months.length - 1) return { month, score };
    const back = drift.slice(i + 1).reduce((a, b) => a + b, 0);
    return { month, score: Math.max(0, Math.min(100, score + back)) };
  });
  return { findings, score, scoreTrend, frameworks: COMPLIANCE_FRAMEWORKS, weights: SEVERITY_WEIGHTS };
}
