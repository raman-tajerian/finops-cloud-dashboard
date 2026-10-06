// Seeded master dataset — the single source of truth for every cost figure in the app.
import type { Category, CloudProvider, Environment, MasterResource, ServiceName, Team } from "@/types/finops";

/** Last day included in the dataset. "Today" for all period math. */
export const DATA_END_DATE = new Date(Date.UTC(2026, 9, 25));
export const HISTORY_DAYS = 184;

/** Business volumes (not costs) used for unit economics, per 30 days. */
export const businessVolume = { activeUsers: 5_920_000, apiRequests: 2_070_000_000, deployments: 4_800, sessions: 13_600_000 };

function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Spec { provider: CloudProvider; service: ServiceName; category: Category; skus: string[]; regions: string[]; base: [number, number]; count: number; prefix: string }
const specs: Spec[] = [
  { provider: "AWS", service: "EC2", category: "Compute", skus: ["m5.2xlarge", "m5.4xlarge", "c6i.2xlarge", "r6g.xlarge"], regions: ["us-east-1", "eu-west-1", "us-west-2"], base: [2_200, 7_800], count: 9, prefix: "ec2" },
  { provider: "AWS", service: "RDS", category: "Database", skus: ["db.r6g.xlarge", "db.m6g.large"], regions: ["us-east-1", "eu-west-1"], base: [1_800, 6_400], count: 6, prefix: "rds" },
  { provider: "AWS", service: "S3", category: "Storage", skus: ["Standard", "IA", "Glacier"], regions: ["us-east-1", "eu-west-1", "eu-north-1"], base: [600, 3_800], count: 6, prefix: "s3" },
  { provider: "AWS", service: "EKS", category: "Kubernetes", skus: ["eks-1.30"], regions: ["us-east-1", "eu-west-1"], base: [5_500, 11_000], count: 4, prefix: "eks" },
  { provider: "AWS", service: "Lambda", category: "Serverless", skus: ["arm64 512MB", "x86 1GB"], regions: ["us-east-1", "eu-north-1"], base: [300, 1_900], count: 5, prefix: "fn" },
  { provider: "Azure", service: "Azure VM", category: "Compute", skus: ["D4s v5", "E8s v5"], regions: ["westeurope", "northeurope"], base: [1_900, 6_200], count: 7, prefix: "vm" },
  { provider: "Azure", service: "AKS", category: "Kubernetes", skus: ["aks-1.29"], regions: ["westeurope", "northeurope"], base: [4_800, 9_600], count: 3, prefix: "aks" },
  { provider: "Azure", service: "Blob", category: "Storage", skus: ["Hot", "Cool"], regions: ["westeurope", "northeurope"], base: [700, 3_100], count: 5, prefix: "blob" },
  { provider: "Azure", service: "SQL DB", category: "Database", skus: ["GP Gen5 8vCore", "BC Gen5 4vCore"], regions: ["westeurope"], base: [1_600, 5_200], count: 4, prefix: "sql" },
  { provider: "GCP", service: "GCP Compute", category: "Compute", skus: ["n2-standard-8", "e2-standard-4"], regions: ["europe-west1", "us-central1"], base: [900, 3_600], count: 6, prefix: "gce" },
  { provider: "GCP", service: "GKE", category: "Kubernetes", skus: ["gke-1.30"], regions: ["europe-west1"], base: [2_800, 5_400], count: 2, prefix: "gke" },
  { provider: "GCP", service: "BigQuery", category: "Analytics", skus: ["on-demand", "editions"], regions: ["europe-west1", "us-central1"], base: [1_200, 4_400], count: 4, prefix: "bq" },
];
const apps = ["checkout", "payments", "search", "media", "ml", "analytics", "auth", "catalog"];
const teamFor: Record<string, Team> = { checkout: "Platform", payments: "FinOps", search: "Platform", media: "Media", ml: "Data", analytics: "Data", auth: "Platform", catalog: "Media" };
const envs: Environment[] = ["Production", "Production", "Production", "Staging", "Development"];

/** Resources with a deliberate recent spike, so anomaly detection has something to find. */
const spikes: Record<string, { days: number; factor: number; name: string }> = {
  "blob-03": { days: 4, factor: 3.4, name: "blob-media-egress" },
  "s3-02": { days: 3, factor: 1.9, name: "nat-gw-prod-egress" },
};

function build(): MasterResource[] {
  const rnd = mulberry32(20261025);
  const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)]!;
  const out: MasterResource[] = [];
  for (const s of specs) {
    for (let i = 1; i <= s.count; i++) {
      const id = `${s.prefix}-${String(i).padStart(2, "0")}`;
      const app = pick(apps), environment = pick(envs);
      const envMul = environment === "Production" ? 1 : environment === "Staging" ? 0.45 : 0.25;
      const monthlyBase = (s.base[0] + rnd() * (s.base[1] - s.base[0])) * envMul;
      const idle = rnd() < 0.13;
      const cpuAvg = Math.round(idle ? 1 + rnd() * 4 : 12 + rnd() * 70);
      const memAvg = Math.round(idle ? 3 + rnd() * 8 : 20 + rnd() * 65);
      const growth = (rnd() - 0.4) * 0.5; // -20% .. +30% over the history
      const phase = rnd() * 6;
      const spike = spikes[id];
      const daily = Array.from({ length: HISTORY_DAYS }, (_, d) => {
        const t = d / (HISTORY_DAYS - 1);
        let v = (monthlyBase / 30) * (1 + growth * (t - 0.5)) * (1 + 0.08 * Math.sin(d / 3.2 + phase)) * (0.94 + rnd() * 0.12);
        if (spike && d >= HISTORY_DAYS - spike.days) v *= spike.factor;
        return Math.round(v * 100) / 100;
      });
      const monthlyCost = Math.round(daily.slice(-30).reduce((a, b) => a + b, 0));
      const status = idle ? "Idle" : cpuAvg > 78 || spike ? "Warning" : "Running";
      out.push({ id, name: spike?.name ?? `${app}-${s.prefix}-${environment.slice(0, 4).toLowerCase()}-${i}`, provider: s.provider, service: s.service, category: s.category, sku: pick(s.skus), region: pick(s.regions), environment, team: teamFor[app]!, tags: { app, costCenter: `cc-${teamFor[app]!.toLowerCase()}` }, monthlyCost, cpuAvg, memAvg, status, daily });
    }
  }
  return out;
}

export const masterResources: MasterResource[] = build();

/** ISO date (YYYY-MM-DD) for a history index. */
export const dayAt = (index: number) => new Date(DATA_END_DATE.getTime() - (HISTORY_DAYS - 1 - index) * 86_400_000);
export const dayLabel = (index: number) => dayAt(index).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
