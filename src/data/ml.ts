// Pure demo models. No learning service, deployed artifact or real-world accuracy claim.
import { filterResources, windowOf } from './aggregate';
import { dayAt, DEMO_TODAY, HISTORY_DAYS, mulberry32 } from './resources';
import type { Filters } from '@/lib/filters';
import type { MasterResource } from '@/types/finops';
import { DEFAULT_MODEL_VERSION, type ModelVersion, type ModelParams, type ModelMetrics, type MlPoint, type MlAnomaliesDto, type MlForecastDto, type MlModelsDto, type MlPipelineDto } from '@/types/ml';
export const MODEL_CONFIGS: Record<ModelVersion, ModelParams> = {
  v1: { windowDays: 28, alpha: 0.3, k: 4.5 },
  v2: { windowDays: 42, alpha: 0.2, k: 3.5 },
  v3: { windowDays: 56, alpha: 0.3, k: 3 },
  v4: { windowDays: 84, alpha: 0.15, k: 2.5 },
};
const mean = (a: number[]) => a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0;
const median = (a: number[]) => { const s = [...a].sort((a, b) => a - b); const m = Math.floor(s.length / 2); return s.length ? s.length % 2 ? s[m] ?? 0 : ((s[m - 1] ?? 0) + (s[m] ?? 0)) / 2 : 0; };
const sd = (a: number[]) => Math.sqrt(mean(a.map(v => (v - mean(a)) ** 2)));
const clamp = (n: number, min = 0, max = 100) => Math.max(min, Math.min(max, Number.isFinite(n) ? n : 0)) || 0;
const iso = (d: Date) => d.toISOString().slice(0, 10);
const dateAdd = (d: Date, days: number) => new Date(d.getTime() + days * 86400000);
function fit(values: number[], days: string[], p: ModelParams) {
  const start = Math.max(0, values.length - p.windowDays), history = values.slice(start), dates = days.slice(start), center = median(history);
  const firstWeekday = dates[0] ? new Date(`${dates[0]}T00:00:00Z`).getUTCDay() : 0;
  const profile = Array.from({ length: 7 }, (_, weekday) => {
    const group = history.filter((_, i) => (firstWeekday + i) % 7 === weekday);
    return group.length ? median(group) - center : 0;
  });
  const adjusted = history.map((v, i) => v - (profile[(firstWeekday + i) % 7] ?? 0));
  let level = adjusted[0] ?? 0;
  for (const v of adjusted.slice(1)) level = p.alpha * v + (1 - p.alpha) * level;
  const med = median(adjusted), spread = Math.max(1.4826 * median(adjusted.map(v => Math.abs(v - med))), mean(history) * 0.01, 0.01);
  return { profile, level, spread };
}
export function detectSeries(values: number[], days: string[], p: ModelParams): MlPoint[] {
  return values.map((actual, i) => {
    const history = values.slice(Math.max(0, i - p.windowDays), i), histDays = days.slice(Math.max(0, i - p.windowDays), i);
    const f = fit(history, histDays, p), weekday = new Date(`${days[i]}T00:00:00Z`).getUTCDay();
    const expected = Math.max(0, f.level + (f.profile[weekday] ?? 0)), expectedLow = Math.max(0, expected - p.k * f.spread), expectedHigh = expected + p.k * f.spread;
    const base = values.slice(Math.max(0, i - 14), i), std = sd(base), distance = Math.max(expectedLow - actual, actual - expectedHigh, 0);
    // Warm-up requires 14 preceding days; both detectors use prior observations only.
    const baselineFlag = i >= 14 && (std > 0 ? Math.abs(actual - mean(base)) / std > 3 : actual !== mean(base));
    const modelFlag = i >= 14 && distance > 0;
    const score = clamp(Math.abs(actual - expected) / f.spread * 10), confidence = clamp(100 * distance / (distance + f.spread));
    return { day: days[i] ?? '', actual, expected, expectedLow, expectedHigh, score, confidence, baselineFlag, modelFlag };
  });
}
function serviceSeries(rs: MasterResource[], f: Filters) {
  const selected = filterResources(rs, f), end = windowOf(f.range).end, groups = new Map<string, MasterResource[]>();
  for (const r of selected) { const key = `${r.provider}:${r.service}`; groups.set(key, [...(groups.get(key) ?? []), r]); }
  return { resourceCount: selected.length, end, series: [...groups].map(([id, items]) => ({ id, service: items[0]?.service ?? '', provider: items[0]?.provider ?? 'AWS' as const, values: Array.from({ length: end }, (_, i) => items.reduce((s, r) => s + (r.daily[i] ?? 0), 0)), days: Array.from({ length: end }, (_, i) => iso(dayAt(i))) })) };
}
export function buildMlAnomalies(rs: MasterResource[], f: Filters, version: ModelVersion = DEFAULT_MODEL_VERSION): MlAnomaliesDto {
  const raw = serviceSeries(rs, f), w = windowOf(f.range), config = MODEL_CONFIGS[version];
  const series = raw.series.map(s => ({ id: s.id, service: s.service, provider: s.provider, points: detectSeries(s.values, s.days, config).slice(w.start, w.end) }));
  const items = series.flatMap(s => s.points.filter(p => p.modelFlag || p.baselineFlag).map(p => {
    const detectedBy = p.modelFlag && p.baselineFlag ? 'both' as const : p.modelFlag ? 'model' as const : 'baseline' as const;
    return { id: `${s.id}:${p.day}`, day: p.day, service: s.service, provider: s.provider, actual: p.actual, expectedLow: p.expectedLow, expectedHigh: p.expectedHigh, score: p.score, confidence: p.confidence, severity: p.score >= 70 ? 'High' as const : p.score >= 40 ? 'Medium' as const : 'Low' as const, detectedBy, modelVersion: version,
      reason: p.modelFlag ? `Daily cost is ${p.actual > p.expectedHigh ? 'above' : 'below'} the weekday-adjusted expected band. Confidence is a distance heuristic, not a probability of correctness.` : 'Daily cost is more than three standard deviations from the preceding 14-day average. It remains inside the demo model band; model confidence is zero.' };
  })).sort((a, b) => b.day.localeCompare(a.day) || a.id.localeCompare(b.id));
  return { modelVersion: version, series, items, counts: { both: items.filter(i => i.detectedBy === 'both').length, modelOnly: items.filter(i => i.detectedBy === 'model').length, baselineOnly: items.filter(i => i.detectedBy === 'baseline').length }, resourceCount: raw.resourceCount };
}
function project(values: number[], days: string[], p: ModelParams, horizon = 14) {
  if (!values.length) return [];
  const f = fit(values, days, p), last = new Date(`${days.at(-1)}T00:00:00Z`), baseline = mean(values.slice(-7));
  return Array.from({ length: horizon }, (_, i) => { const date = dateAdd(last, i + 1), forecast = Math.max(0, f.level + (f.profile[date.getUTCDay()] ?? 0)), width = p.k * f.spread * Math.sqrt(1 + (i + 1) / 7); return { day: iso(date), forecast, low: Math.max(0, forecast - width), high: forecast + width, baseline }; });
}
export function mape(actual: number[], predicted: number[]) {
  const ratios = actual.flatMap((a, i) => a > 0 ? [Math.abs(a - (predicted[i] ?? 0)) / a] : []);
  return mean(ratios) * 100;
}
export function buildMlForecast(rs: MasterResource[], f: Filters, version: ModelVersion = DEFAULT_MODEL_VERSION): MlForecastDto {
  const raw = serviceSeries(rs, f), values = Array.from({ length: raw.end }, (_, i) => raw.series.reduce((s, r) => s + (r.values[i] ?? 0), 0)), days = Array.from({ length: raw.end }, (_, i) => iso(dayAt(i))), p = MODEL_CONFIGS[version];
  if (!raw.resourceCount) return { modelVersion: version, horizonDays: 14, points: [], backtest: { mapeModel: 0, mapeBaseline: 0 }, resourceCount: 0 };
  const back = project(values.slice(0, -14), days.slice(0, -14), p);
  return { modelVersion: version, horizonDays: 14, points: project(values, days, p), backtest: { mapeModel: mape(values.slice(-14), back.map(p => p.forecast)), mapeBaseline: mape(values.slice(-14), back.map(p => p.baseline)) }, resourceCount: raw.resourceCount };
}
export interface EvaluationEvent { series: number; index: number; magnitude: number }
export function syntheticEvaluation() {
  const rnd = mulberry32(20261012), days = Array.from({ length: 365 }, (_, i) => iso(dateAdd(DEMO_TODAY, i - 364)));
  const values = Array.from({ length: 6 }, (_, s) => days.map((day, i) => (100 + 35 * s) * (1 + (new Date(`${day}T00:00:00Z`).getUTCDay() === 0 ? -0.22 : 0.06) + i * 0.0002 + (rnd() - 0.5) * 0.10)));
  const events: EvaluationEvent[] = [];
  while (events.length < 20) {
    const series = Math.floor(rnd() * 6), index = 90 + Math.floor(rnd() * 270);
    if (events.some(e => e.series === series && Math.abs(e.index - index) < 8)) continue;
    const magnitude = 1.3 + rnd() * 1.8;
    events.push({ series, index, magnitude });
    const row = values[series]; if (row) row[index] = (row[index] ?? 0) * magnitude;
  }
  return { values, days, events };
}
/** Match each prediction and injection at most once, within one day on the same service. */
export function evaluationMetrics(predictions: { series: number; index: number }[], events: { series: number; index: number }[]): ModelMetrics {
  const used = new Set<number>(); let hits = 0;
  for (const p of [...predictions].sort((a, b) => a.series - b.series || a.index - b.index)) {
    const match = events.findIndex((e, i) => !used.has(i) && e.series === p.series && Math.abs(e.index - p.index) <= 1);
    if (match >= 0) { used.add(match); hits++; }
  }
  const precision = predictions.length ? hits / predictions.length : 0, recall = events.length ? hits / events.length : 0;
  return { precision, recall, f1: precision + recall ? 2 * precision * recall / (precision + recall) : 0 };
}
export function buildMlModels(active: ModelVersion = DEFAULT_MODEL_VERSION): MlModelsDto {
  const e = syntheticEvaluation();
  const evaluate = (params: ModelParams, baseline = false) => evaluationMetrics(e.values.flatMap((row, series) => detectSeries(row, e.days, params).flatMap((p, index) => index >= 90 && (baseline ? p.baselineFlag : p.modelFlag) ? [{ series, index }] : [])), e.events);
  return { models: (Object.keys(MODEL_CONFIGS) as ModelVersion[]).map((version, i) => ({ version, status: version === active ? 'Production' : version === 'v4' ? 'Staging' : 'Archived', trainedAt: iso(dateAdd(DEMO_TODAY, -75 + i * 21)), trainingWindowDays: MODEL_CONFIGS[version].windowDays, algorithm: 'Weekday profile + EW level + MAD band', params: MODEL_CONFIGS[version], metrics: evaluate(MODEL_CONFIGS[version]), notes: 'Synthetic evaluation only. No real training or deployment; no holidays or causal attribution.' })), baseline: evaluate(MODEL_CONFIGS.v3, true), evaluation: { series: 6, days: 365, injectedAnomalies: 20 } };
}
export function qualityGate(candidate: ModelMetrics, production: ModelMetrics) {
  const passed = candidate.f1 >= production.f1 - 0.02 && candidate.recall >= 0.7;
  return { passed, rule: 'Candidate F1 ≥ production F1 − 0.02 AND recall ≥ 0.70', detail: `F1 ${candidate.f1.toFixed(4)} ≥ ${(production.f1 - 0.02).toFixed(4)}; recall ${candidate.recall.toFixed(4)} ≥ 0.7000`, candidateF1: candidate.f1, productionF1: production.f1, candidateRecall: candidate.recall };
}
export function driftScore(training: number[], recent: number[]) {
  if (!training.length || !recent.length) return 0;
  const difference = Math.abs(mean(recent) - mean(training));
  // One-percent level floor makes constant windows finite, and identical windows exactly zero.
  return difference / Math.max(Math.sqrt((sd(training) ** 2 + sd(recent) ** 2) / 2), Math.abs(mean(training)) * 0.01, 0.01) || 0;
}
export function buildMlPipeline(rs: MasterResource[], f: Filters, version: ModelVersion = DEFAULT_MODEL_VERSION): MlPipelineDto {
  const registry = buildMlModels(version), prod = registry.models.find(m => m.version === version)?.metrics ?? { precision: 0, recall: 0, f1: 0 }, stages = ['Data validation', 'Train', 'Evaluate', 'Quality gate', 'Package', 'Deploy', 'Monitor'], rnd = mulberry32(20260912), raw = serviceSeries(rs, f);
  const runs = Array.from({ length: 8 }, (_, i) => {
    const candidate = registry.models[i % 4]; const candidateVersion = candidate?.version ?? 'v1', gate = qualityGate(candidate?.metrics ?? prod, prod);
    return { id: `demo-run-${8 - i}`, startedAt: dateAdd(DEMO_TODAY, -i * 3).toISOString(), trigger: (['schedule', 'push', 'manual'] as const)[i % 3] ?? 'manual', candidateVersion, stages: stages.map((name, index) => ({ name, status: index === 3 && !gate.passed ? 'Failed' as const : index > 3 && !gate.passed ? 'Skipped' as const : 'Passed' as const, durationSec: index > 3 && !gate.passed ? 0 : 5 + Math.floor(rnd() * 115) })), gate };
  });
  const config = MODEL_CONFIGS[version], detected = raw.series.map(s => ({ ...s, points: detectSeries(s.values, s.days, config) })), start = Math.max(0, raw.end - 30), days = Array.from({ length: raw.resourceCount ? raw.end - start : 0 }, (_, i) => iso(dayAt(start + i)));
  const services = raw.series.map(s => ({ service: `${s.provider} ${s.service}`, score: driftScore(s.values.slice(Math.max(0, raw.end - 14 - config.windowDays), raw.end - 14), s.values.slice(-14)) })), score = Math.max(0, ...services.map(s => s.score));
  return { stages, runs, resourceCount: raw.resourceCount, monitoring: { days, latencyP95Ms: days.map(() => 8 + Math.round(rnd() * 12)), flaggedPerDay: days.map((_, i) => detected.reduce((n, s) => n + (s.points[start + i]?.modelFlag ? 1 : 0), 0)), drift: { score, threshold: 0.5, status: score > 0.5 ? 'Warning' : 'OK', services } } };
}
