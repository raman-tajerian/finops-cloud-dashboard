import type { CloudProvider } from './finops';
export type ModelVersion = 'v1' | 'v2' | 'v3' | 'v4';
export const DEFAULT_MODEL_VERSION: ModelVersion = 'v3';
export interface ModelParams { windowDays: number; alpha: number; k: number }
export interface ModelMetrics { precision: number; recall: number; f1: number }
export interface ModelRow { version: ModelVersion; status: 'Production' | 'Staging' | 'Archived'; trainedAt: string; trainingWindowDays: number; algorithm: string; params: ModelParams; metrics: ModelMetrics; notes: string }
export interface MlPoint { day: string; actual: number; expected: number; expectedLow: number; expectedHigh: number; baselineFlag: boolean; modelFlag: boolean; score: number; confidence: number }
export interface MlSeries { id: string; service: string; provider: CloudProvider; points: MlPoint[] }
export interface MlAnomaly { id: string; day: string; service: string; provider: CloudProvider; actual: number; expectedLow: number; expectedHigh: number; score: number; confidence: number; severity: 'High' | 'Medium' | 'Low'; detectedBy: 'model' | 'baseline' | 'both'; modelVersion: ModelVersion; reason: string }
export interface MlAnomaliesDto { modelVersion: ModelVersion; items: MlAnomaly[]; counts: { both: number; modelOnly: number; baselineOnly: number }; series: MlSeries[]; resourceCount: number }
export interface MlForecastDto { modelVersion: ModelVersion; horizonDays: number; points: { day: string; forecast: number; low: number; high: number; baseline: number }[]; backtest: { mapeModel: number; mapeBaseline: number }; resourceCount: number }
export interface MlModelsDto { models: ModelRow[]; baseline: ModelMetrics; evaluation: { series: number; days: number; injectedAnomalies: number } }
export interface MlPipelineDto { stages: string[]; runs: { id: string; startedAt: string; trigger: 'schedule' | 'push' | 'manual'; candidateVersion: ModelVersion; stages: { name: string; status: 'Passed' | 'Failed' | 'Skipped'; durationSec: number }[]; gate: { passed: boolean; rule: string; detail: string; candidateF1: number; productionF1: number; candidateRecall: number } }[]; monitoring: { days: string[]; latencyP95Ms: number[]; flaggedPerDay: number[]; drift: { score: number; threshold: number; status: 'OK' | 'Warning'; services: { service: string; score: number }[] } }; resourceCount: number }
export interface ModelSession { active: ModelVersion; previous: ModelVersion | null }
