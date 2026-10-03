// Mock platform data. Shapes mirror DTOs the planned C# .NET API would return.
export type PlatformRange = "7d" | "mtd" | "q3" | "custom";
export type CloudId = "AWS" | "Azure" | "GCP";
export type Env = "Production" | "Staging" | "Development";

export const rangeLabels: Record<PlatformRange, string> = { "7d": "Last 7 days", mtd: "Month-to-date", q3: "Q3 forecast", custom: "Custom range" };
export const providerShare: Record<CloudId, number> = { AWS: 0.58, Azure: 0.32, GCP: 0.1 };
export const envShare: Record<Env, number> = { Production: 0.71, Staging: 0.18, Development: 0.11 };

export const spark = (seed: number, n = 14) => Array.from({ length: n }, (_, i) => ({ i, v: Math.round(100 + 22 * Math.sin(i / 1.7 + seed) + i * seed * 1.4) }));

export const platformKpis = {
  spend: { total: 248_730, mom: 4.2, burn: 8_291, projected: 257_000 },
  waste: { total: 14_250, ebs: 18, rds: 4, ec2: 12 },
  anomalies: [
    { id: "an1", title: "Azure Blob Storage egress", change: 140, impact: 3_420, since: "Oct 1, 04:10 UTC" },
    { id: "an2", title: "AWS NAT Gateway data processing", change: 62, impact: 1_180, since: "Oct 2, 19:45 UTC" },
  ],
  unit: { perUser: 0.042, perRequest: 0.00012, activeUsers: 5_920_000, requests: 2_070_000_000 },
};

export const byService = [
  { name: "Compute", value: 108_400 }, { name: "Kubernetes", value: 62_150 }, { name: "Storage", value: 44_980 }, { name: "Networking", value: 33_200 },
];
export const byRegion = [
  { region: "us-east-1", AWS: 52_400, Azure: 0, GCP: 4_100 },
  { region: "eu-west-1", AWS: 38_900, Azure: 21_300, GCP: 6_200 },
  { region: "eu-north-1", AWS: 22_100, Azure: 9_800, GCP: 2_300 },
  { region: "westeurope", AWS: 0, Azure: 41_600, GCP: 5_900 },
  { region: "us-west-2", AWS: 30_700, Azure: 6_400, GCP: 7_030 },
];
export const dailySpend = Array.from({ length: 30 }, (_, i) => ({
  day: new Date(2026, 8, i + 4).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
  spend: Math.round(8_291 * (1 + 0.12 * Math.sin(i / 3) + (i === 27 ? 0.35 : 0))),
}));

export type Impact = "High Impact" | "Quick Win";
export interface Recommendation { id: string; title: string; detail: string; savings: number; impact: Impact; team: string }
export const recommendations: Recommendation[] = [
  { id: "r1", title: "Rightsize 12 oversized EC2 nodes", detail: "m5.4xlarge → m5.2xlarge, p95 CPU 21%", savings: 6_200, impact: "High Impact", team: "Platform" },
  { id: "r2", title: "Purchase Savings Plan for steady compute", detail: "1-yr no-upfront covering 64% baseline", savings: 5_100, impact: "High Impact", team: "FinOps" },
  { id: "r3", title: "Delete 18 unattached EBS volumes", detail: "4.1 TB gp2 in us-east-1 / us-west-2", savings: 2_850, impact: "Quick Win", team: "Platform" },
  { id: "r4", title: "Stop 4 idle RDS instances", detail: "Zero connections for 14 days", savings: 3_050, impact: "High Impact", team: "Data" },
  { id: "r5", title: "Move blob archive to Cool tier", detail: "blob-media-archive, 92% cold reads", savings: 1_200, impact: "Quick Win", team: "Media" },
];

export const cluster = { name: "prod-k8s-cluster-01", region: "eu-west-1", version: "v1.30.4", nodes: 42, cpu: 74, memory: 62, podsHealthy: 148, podsTotal: 150 };
export const tickerSeed = [
  "Auto-scaler terminated 3 idle nodes",
  "HPA scaled checkout-api from 6 → 9 replicas",
  "Spot interruption handled on ip-10-2-14-8",
  "Rollout payments-svc v2.14.0 completed",
  "Budget guardrail paused dev-gpu-pool",
  "Karpenter consolidated 2 nodes into 1",
];
