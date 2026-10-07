// API response contracts shared by the mock layer and the future C# .NET API.
export type CloudProvider = "AWS" | "Azure" | "GCP";
export type Environment = "Production" | "Staging" | "Development";

export interface SpendSummary { total: number; momPct: number; dailyBurn: number; projectedEom: number; savingsOpportunity: number; idleWaste: number; activeAnomalies: number; costPerUser: number; costPerRequest: number }
export interface CostByDimension { name: string; value: number }
export interface Anomaly { id: string; title: string; change: number; impact: number; since: string; provider: CloudProvider }
export interface ResourceDto { id: string; name: string; provider: string; type: string; region: string; monthlyCost: number; status: "Running" | "Idle" | "Warning" }
export interface RecommendationDto { id: string; title: string; detail: string; savings: number; impact: "High Impact" | "Quick Win"; team: string }
export type SavingCategory = "Idle resources" | "Right-sizing" | "Reserved / Savings Plans" | "Storage tiering" | "Unused volumes and IPs" | "Scheduling";
export type Level = "Low" | "Medium" | "High";
export interface SavingItemDto extends RecommendationDto { category: SavingCategory; effort: Level; risk: Level; confidence: number; service: string; resourceIds: string[] }
export interface SavingsMonth { month: string; realized: number; potential: number }
export interface SavingsDto { items: SavingItemDto[]; total: number; target: number; targetShare: number; tracker: SavingsMonth[]; rules: { category: SavingCategory; effort: Level; risk: Level; confidence: number; rule: string }[] }
export type BudgetScopeKind = "All" | "Provider" | "Team" | "Environment";
export interface BudgetScope { kind: BudgetScopeKind; value: string }
export interface ScopeSpendDto { key: string; scope: BudgetScope; spent: number; forecast: number; defaultAmount: number }
export interface AnomalyRowDto { id: string; title: string; date: string; service: string; provider: CloudProvider; resourceId: string; expected: number; actual: number; change: number; impact: number; cause: string; series: { day: string; actual: number; low: number; high: number }[] }
export interface AlertsDto { scopes: ScopeSpendDto[]; anomalies: AnomalyRowDto[] }
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
export interface SustainabilityRegionDto extends CarbonRegionDto { cost: number; share: number }
export interface CarbonBreakdown { name: string; tons: number; share: number }
export interface CarbonTrendPoint { day: string; tons: number }
export interface GreenerRegionSuggestion {
  resourceId: string; workload: string; provider: CloudProvider; currentRegion: string; suggestedRegion: string;
  currentIntensity: number; suggestedIntensity: number; currentTons: number; reductionTons: number; reductionPct: number; costChangePct: number;
}
/** GET /api/v1/sustainability */
export interface SustainabilityDto {
  totalTons: number; previousTons: number; changePct: number; kgPerThousandUsd: number; abSpendShare: number;
  trend: CarbonTrendPoint[]; regions: SustainabilityRegionDto[]; providers: CarbonBreakdown[]; services: CarbonBreakdown[];
  suggestions: GreenerRegionSuggestion[];
}
export interface TopoNodeDto { id: string; label: string; kind: "region" | "vpc" | "cluster"; health: "ok" | "oversized" | "anomaly"; x: number; y: number; z: number; cost: number }

/** Everything the dashboard cards need for one filter combination: GET /api/v1/dashboard */
export interface DashboardDto {
  providers: CloudProvider[];
  kpis: KpiBundle;
  services: CostByDimension[];
  regions: RegionCost[];
  daily: DailyCost[];
  recommendations: SavingItemDto[];
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

export interface ResourceRow { id: string; name: string; provider: CloudProvider; service: ServiceName; sku: string; region: string; environment: Environment; team: Team; monthlyCost: number; cpuAvg: number; memAvg: number; status: "Running" | "Idle" | "Warning" }
/** GET /api/v1/resources */
export interface ResourcesDto { items: ResourceRow[]; count: number; monthlyTotal: number; periodTotal: number }
/** GET /api/v1/resources/{id} */
export interface ResourceDetailDto {
  resource: ResourceRow; tags: Record<string, string>;
  cost: { day: string; cost: number }[]; util: { day: string; cpu: number; mem: number }[];
  activity: { day: string; text: string; tone: "success" | "warning" | "critical" | "idle" }[];
  rightsizing: { saving: number; action: string } | null;
}

/* ---------- Kubernetes / budget / scenario ---------- */
export interface K8sPodDto { name: string; namespace: string; status: "Running" | "Pending" | "Failed"; restarts: number }
export interface K8sNamespaceDto { name: string; weight: number; cost: number; efficiency: number; overProvisioned: boolean }
export interface K8sClusterDto { id: string; name: string; provider: CloudProvider; service: ServiceName; region: string; environment: Environment; status: MasterResource["status"]; cpuAvg: number; memAvg: number; monthlyCost: number; nodes: number; podsTotal: number; podsHealthy: number; podsFailed: number; namespaces: K8sNamespaceDto[]; pods: K8sPodDto[] }
export interface KubernetesDto { clusters: K8sClusterDto[]; totalCost: number }
export interface BudgetDto { spendToDate: number; forecastEom: number; dayOfMonth: number; monthDays: number; previousQuarterSpend: number; defaultBudget: number; period: string }
export interface ScenarioDto { baseline: number; days: number; computeSpend: number; migrateSpend: number; rightsizeEligible: number; riDiscount: number; migrateFrom: string; migrateTo: string; costRatio: number; intensityFrom: number; intensityTo: number; kwhPerUsd: number }
