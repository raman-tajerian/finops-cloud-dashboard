// Simulated integrations. Cloud connection state mirrors the providers in the master dataset; nothing calls the network.
import type { CredentialKind, IntegrationDto, IntegrationsDto, MasterResource, SyncRunDto } from "@/types/finops";
import { isGcpProjectId, isGuid, isRoleArn } from "@/lib/validators";
import { DEMO_TODAY, mulberry32 } from "./resources";

const DEFS: { id: string; name: string; kind: IntegrationDto["kind"]; credential: CredentialKind; permissions: string[]; connected?: boolean; error?: boolean }[] = [
  { id: "aws", name: "AWS", kind: "cloud", credential: "aws-role-arn", permissions: ["ce:GetCostAndUsage (read-only)", "cur:DescribeReportDefinitions", "ec2:Describe*", "cloudwatch:GetMetricData"] },
  { id: "azure", name: "Azure", kind: "cloud", credential: "azure-sp-id", permissions: ["Cost Management Reader", "Reader on subscriptions", "Monitoring Reader"] },
  { id: "gcp", name: "GCP", kind: "cloud", credential: "gcp-project-id", permissions: ["roles/billing.viewer", "roles/compute.viewer", "roles/monitoring.viewer"] },
  { id: "kubernetes", name: "Kubernetes", kind: "kubernetes", credential: "none", permissions: ["Read-only ClusterRole (get/list/watch)", "metrics.k8s.io read"] },
  { id: "slack", name: "Slack", kind: "chat", credential: "none", permissions: ["chat:write to selected channels"], connected: true },
  { id: "teams", name: "Microsoft Teams", kind: "chat", credential: "none", permissions: ["Post to selected channels"] },
  { id: "github", name: "GitHub", kind: "dev", credential: "none", permissions: ["Read repository metadata"], connected: true },
  { id: "jira", name: "Jira", kind: "dev", credential: "none", permissions: ["Create issues in selected projects"], error: true },
  { id: "pagerduty", name: "PagerDuty", kind: "ops", credential: "none", permissions: ["Trigger incidents on one service"] },
  { id: "terraform", name: "Terraform Cloud", kind: "dev", credential: "none", permissions: ["Read workspaces and runs"] },
];
const K8S = new Set(["EKS", "AKS", "GKE"]);
const iso = (minsAgo: number) => new Date(DEMO_TODAY.getTime() + 9 * 3600_000 - minsAgo * 60_000).toISOString();

export const connectedProviders = (all: MasterResource[]) => [...new Set(all.map((r) => r.provider))].sort();

export function buildIntegrations(all: MasterResource[]): IntegrationsDto {
  const providers = new Set(connectedProviders(all).map((p) => p.toLowerCase()));
  const hasK8s = all.some((r) => K8S.has(r.service));
  const rnd = mulberry32(4242);
  const integrations: IntegrationDto[] = DEFS.map((d) => {
    const on = d.kind === "cloud" ? providers.has(d.id) : d.kind === "kubernetes" ? hasK8s : !!d.connected;
    const status = d.error ? "Error" : on ? "Connected" : "Not connected";
    return { id: d.id, name: d.name, kind: d.kind, credential: d.credential, permissions: d.permissions, status, lastSync: status === "Not connected" ? null : iso(Math.round(5 + rnd() * 300)) };
  });
  const history: SyncRunDto[] = [];
  const live = integrations.filter((i) => i.status !== "Not connected");
  for (let n = 0; n < 24; n++) {
    const it = live[n % live.length];
    const fail = it.status === "Error" ? rnd() < 0.7 : rnd() < 0.08;
    history.push({ id: `sync-${String(n + 1).padStart(3, "0")}`, integration: it.name, started: iso(n * 90 + Math.round(rnd() * 40)), status: fail ? "Failed" : rnd() < 0.1 ? "Partial" : "Success", durationSec: Math.round(8 + rnd() * 160), records: fail ? 0 : Math.round(200 + rnd() * 9000) });
  }
  return { integrations, history };
}

/** Deterministic mock: succeeds only when the identifier has the right format. No network call. */
export function testConnection(kind: CredentialKind, value: string): { ok: boolean; message: string } {
  const v = value.trim();
  if (kind === "none") return { ok: true, message: "Simulated connection succeeded." };
  const ok = kind === "aws-role-arn" ? isRoleArn(v) : kind === "azure-sp-id" ? isGuid(v) : isGcpProjectId(v);
  return ok ? { ok, message: "Simulated: read-only access verified." } : { ok, message: "Simulated: identifier format not recognised." };
}
