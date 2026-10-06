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
}
