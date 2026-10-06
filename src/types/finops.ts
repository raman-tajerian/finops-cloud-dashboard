// API response contracts shared by the mock layer and the future C# .NET API.
export type CloudProvider = "AWS" | "Azure" | "GCP";
export type Environment = "Production" | "Staging" | "Development";

export interface SpendSummary { total: number; momPct: number; dailyBurn: number; projectedEom: number; savingsOpportunity: number; idleWaste: number; activeAnomalies: number; costPerUser: number; costPerRequest: number }
export interface CostByDimension { name: string; value: number }
export interface Anomaly { id: string; title: string; change: number; impact: number; since: string; provider: CloudProvider }
export interface ResourceDto { id: string; name: string; provider: string; type: string; region: string; monthlyCost: number; status: "Running" | "Idle" | "Warning" }
export interface RecommendationDto { id: string; title: string; detail: string; savings: number; impact: "High Impact" | "Quick Win"; team: string }
export interface ClusterDto { name: string; region: string; version: string; nodes: number; cpu: number; memory: number; podsHealthy: number; podsTotal: number }

export interface KpiBundle {
  spend: { total: number; mom: number; burn: number; projected: number };
  waste: { total: number; ebs: number; rds: number; ec2: number };
  anomalies: Anomaly[];
  unit: { perUser: number; perRequest: number; activeUsers: number; requests: number; perDeployment: number; perSession: number };
}
export interface RegionCost { region: string; AWS: number; Azure: number; GCP: number }
export interface DailyCost { day: string; spend: number }
export interface ForecastPoint { day: string; forecast: number; band: [number, number]; actual: number | null }
export interface CarbonRegionDto { region: string; provider: CloudProvider; intensity: number; rating: "A" | "B" | "C" | "D"; tons: number }
export interface TopoNodeDto { id: string; label: string; kind: "region" | "vpc" | "cluster"; health: "ok" | "oversized" | "anomaly"; x: number; y: number; z: number; cost: number }

/** Everything the dashboard cards need for one filter combination: GET /api/v1/dashboard */
export interface DashboardDto {
  providers: CloudProvider[];
  kpis: KpiBundle;
  services: CostByDimension[];
  regions: RegionCost[];
  daily: DailyCost[];
  recommendations: RecommendationDto[];
  cluster: ClusterDto;
  ticker: string[];
  forecast: ForecastPoint[];
  carbon: CarbonRegionDto[];
  topology: { nodes: TopoNodeDto[]; edges: { from: string; to: string }[] };
  resources: ResourceDto[];
  overview: OverviewKpis;
  trend: ProviderDaily[];
  teams: CostByDimension[];
  movers: { up: Mover[]; down: Mover[] };
  totals: { total: number; byProvider: CostByDimension[] };
}

/* ---------- Master dataset (single source of truth) ---------- */
export type Team = "Platform" | "Data" | "FinOps" | "Media";
export type ServiceName = "EC2" | "RDS" | "S3" | "EKS" | "Lambda" | "Azure VM" | "AKS" | "Blob" | "SQL DB" | "GCP Compute" | "GKE" | "BigQuery";
export type Category = "Compute" | "Kubernetes" | "Storage" | "Database" | "Serverless" | "Analytics";
export interface MasterResource {
  id: string; name: string; provider: CloudProvider; service: ServiceName; category: Category; sku: string; region: string;
  environment: Environment; team: Team; tags: { app: string; costCenter: string };
  monthlyCost: number; cpuAvg: number; memAvg: number; status: "Running" | "Idle" | "Warning";
  /** Daily cost, oldest first; last entry = DATA_END_DATE. */
  daily: number[];
}

export interface KpiValue { value: number; previous: number; spark: number[] }
export interface OverviewKpis {
  totalSpend: KpiValue; forecastEom: KpiValue; dailyBurn: KpiValue; savings: KpiValue; idleWaste: KpiValue;
  anomalies: KpiValue; costPerUser: KpiValue; costPerRequest: KpiValue; idleCount: number;
}
export interface ProviderDaily { day: string; AWS: number; Azure: number; GCP: number; total: number; forecast: number | null; band: [number, number] | null; anomaly?: string }
export interface Mover { id: string; name: string; provider: CloudProvider; service: ServiceName; current: number; previous: number; delta: number }

export type GroupBy = "service" | "provider" | "region" | "team" | "environment" | "tag";
export interface ExploreRow { name: string; current: number; previous: number; changePct: number; share: number; spark: number[] }
/** GET /api/v1/costs/explore */
export interface ExploreDto { groupBy: GroupBy; keys: string[]; series: Record<string, number | string>[]; rows: ExploreRow[]; total: number; previousTotal: number }
