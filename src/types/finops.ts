// API response contracts shared by the mock layer and the future C# .NET API.
export type CloudProvider = "AWS" | "Azure" | "GCP";
export type Environment = "Production" | "Staging" | "Development";

export interface SpendSummary { total: number; momPct: number; dailyBurn: number; projectedEom: number; savingsOpportunity: number; idleWaste: number; activeAnomalies: number; costPerUser: number; costPerRequest: number }
export interface CostByDimension { name: string; value: number }
export interface Anomaly { id: string; title: string; change: number; impact: number; since: string }
export interface ResourceDto { id: string; name: string; provider: string; type: string; region: string; monthlyCost: number; status: "Running" | "Idle" | "Warning" }
export interface RecommendationDto { id: string; title: string; detail: string; savings: number; impact: "High Impact" | "Quick Win"; team: string }
export interface ClusterDto { name: string; region: string; version: string; nodes: number; cpu: number; memory: number; podsHealthy: number; podsTotal: number }
