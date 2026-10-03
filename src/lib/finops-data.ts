// Mock data. Shapes mirror DTOs a C# .NET API would return; swap these for fetch calls.
export type Provider = "AWS" | "Azure";
export type ResourceStatus = "Running" | "Idle" | "Warning";
export type TimeRange = "24h" | "7d" | "30d" | "YTD";

export interface CloudResource {
  id: string;
  name: string;
  provider: Provider;
  type: string;
  region: string;
  monthlyCost: number;
  status: ResourceStatus;
}

export interface CostPoint { label: string; aws: number; azure: number }
export interface Alert { id: string; severity: "critical" | "warning"; title: string; detail: string }

const series = (n: number, fmt: (i: number) => string, base: number) =>
  Array.from({ length: n }, (_, i) => ({
    label: fmt(i),
    aws: Math.round(base * (1 + 0.18 * Math.sin(i / 2.3) + i * 0.012)),
    azure: Math.round(base * 0.62 * (1 + 0.15 * Math.cos(i / 2.8) + i * 0.015)),
  }));

const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct"];
export const costTrends: Record<TimeRange, CostPoint[]> = {
  "24h": series(24, (i) => `${String(i).padStart(2, "0")}:00`, 210),
  "7d": series(7, (i) => ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][i], 4900),
  "30d": series(30, (i) => `Sep ${i + 3}`, 4800),
  YTD: series(10, (i) => months[i], 138000),
};

export const kpis = {
  monthlySpend: 248_730,
  spendTrend: 4.2,
  resources: { vms: 412, containers: 1_386, databases: 74 },
  finopsScore: 88,
  potentialSavings: 31_420,
};

export const allocation = [
  { name: "Compute", value: 108_400, color: "var(--chart-1)" },
  { name: "Kubernetes", value: 62_150, color: "var(--chart-2)" },
  { name: "Storage", value: 44_980, color: "var(--chart-3)" },
  { name: "Networking", value: 33_200, color: "var(--chart-4)" },
];

export const resources: CloudResource[] = [
  { id: "1", name: "prod-api-gateway-01", provider: "AWS", type: "EC2", region: "us-east-1", monthlyCost: 4820, status: "Running" },
  { id: "2", name: "aks-platform-westeu", provider: "Azure", type: "AKS", region: "westeurope", monthlyCost: 12_640, status: "Running" },
  { id: "3", name: "analytics-datalake-raw", provider: "AWS", type: "S3", region: "eu-north-1", monthlyCost: 3_215, status: "Running" },
  { id: "4", name: "orders-postgres-primary", provider: "AWS", type: "RDS", region: "us-east-1", monthlyCost: 6_980, status: "Warning" },
  { id: "5", name: "legacy-batch-worker-07", provider: "AWS", type: "EC2", region: "us-west-2", monthlyCost: 1_140, status: "Idle" },
  { id: "6", name: "sqlmi-finance-reporting", provider: "Azure", type: "SQL MI", region: "northeurope", monthlyCost: 5_430, status: "Running" },
  { id: "7", name: "vm-ci-runner-pool", provider: "Azure", type: "VM", region: "swedencentral", monthlyCost: 2_310, status: "Idle" },
  { id: "8", name: "eks-ml-inference", provider: "AWS", type: "EKS", region: "eu-west-1", monthlyCost: 9_870, status: "Warning" },
  { id: "9", name: "blob-media-archive", provider: "Azure", type: "Blob", region: "westeurope", monthlyCost: 1_760, status: "Running" },
  { id: "10", name: "redis-session-cache", provider: "AWS", type: "ElastiCache", region: "us-east-1", monthlyCost: 1_290, status: "Running" },
];

export const alerts: Alert[] = [
  { id: "a1", severity: "critical", title: "Unrestricted SSH access in Azure NSG", detail: "nsg-prod-westeu allows 0.0.0.0/0 on port 22." },
  { id: "a2", severity: "warning", title: "3 unused EBS volumes detected", detail: "1.2 TB unattached in us-east-1 — ~$118/mo." },
  { id: "a3", severity: "warning", title: "RDS instance without automated backups", detail: "orders-postgres-primary has retention set to 0 days." },
];

export const fmtUSD = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
