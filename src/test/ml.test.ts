import { describe, expect, it } from 'vitest';
import { buildMlAnomalies, buildMlForecast, buildMlModels, buildMlPipeline, driftScore, evaluationMetrics, qualityGate, syntheticEvaluation, MODEL_CONFIGS, detectSeries } from '@/data/ml';
import { masterResources } from '@/data/resources';
import { buildDashboard } from '@/data/aggregate';
import { defaultFilters } from '@/lib/filters';
import { initialModelSession, promoteModel, rollbackModel } from '@/lib/ml-session';
import type { ModelVersion } from '@/types/ml';
const f = defaultFilters;
describe('deterministic demo models', () => {
  it('reproduces detection, forecasts, registry and pipeline', () => {
    expect(buildMlAnomalies(masterResources, f)).toEqual(buildMlAnomalies(masterResources, f));
    expect(buildMlForecast(masterResources, f)).toEqual(buildMlForecast(masterResources, f));
    expect(buildMlModels()).toEqual(buildMlModels());
    expect(buildMlPipeline(masterResources, f)).toEqual(buildMlPipeline(masterResources, f));
  });
  it('matches predictions once within ±1 day on the same service', () => {
    const metrics = evaluationMetrics([{ series: 0, index: 9 }, { series: 0, index: 10 }, { series: 1, index: 40 }], [{ series: 0, index: 10 }, { series: 1, index: 20 }]);
    expect(metrics.precision).toBeCloseTo(1 / 3); expect(metrics.recall).toBe(0.5); expect(metrics.f1).toBe(0.4);
    expect(evaluationMetrics([], [])).toEqual({ precision: 0, recall: 0, f1: 0 });
  });
  it('reproduces 20 injections across six 365-day series', () => {
    const a = syntheticEvaluation(); expect(a).toEqual(syntheticEvaluation()); expect(a.events).toHaveLength(20);
    expect(a.values).toHaveLength(6); expect(a.days).toHaveLength(365);
    expect(a.events.every(e => e.index >= 90 && e.magnitude >= 1.3)).toBe(true);
  });
  it('keeps computed precision, recall and F1 within [0,1]', () => {
    const d = buildMlModels();
    for (const m of [...d.models.map(m => m.metrics), d.baseline]) for (const v of Object.values(m)) { expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(1); }
  });
  it('passes quality gate exactly on the F1 and recall boundaries', () => {
    expect(qualityGate({ f1: 0.78, recall: 0.7, precision: 1 }, { f1: 0.8, recall: 0.9, precision: 1 }).passed).toBe(true);
  });
  it('fails quality gate below the F1 boundary', () => {
    expect(qualityGate({ f1: 0.779, recall: 0.9, precision: 1 }, { f1: 0.8, recall: 0.9, precision: 1 }).passed).toBe(false);
  });
  it('fails quality gate below 70 percent recall', () => {
    expect(qualityGate({ f1: 1, recall: 0.699, precision: 1 }, { f1: 0.8, recall: 0.9, precision: 1 }).passed).toBe(false);
  });
  it('drift is zero for identical windows and increases with a mean shift', () => {
    expect(driftScore([10, 11, 9], [10, 11, 9])).toBe(0);
    expect(driftScore([10, 11, 9], [13, 14, 12])).toBeGreaterThan(0.5);
    expect(driftScore([10, 11, 9], [20, 21, 19])).toBeGreaterThan(driftScore([10, 11, 9], [13, 14, 12]));
  });
  it('promoting changes both results and rollback restores the original version', () => {
    const initial = initialModelSession(), promoted = promoteModel(initial, 'v1'), restored = rollbackModel(promoted);
    expect(promoted.active).toBe('v1'); expect(restored.active).toBe('v3');
    const before = buildMlAnomalies(masterResources, f, initial.active), after = buildMlAnomalies(masterResources, f, promoted.active);
    expect(after.modelVersion).toBe('v1'); expect(after.series).not.toEqual(before.series);
    const forecast = buildMlForecast(masterResources, f, promoted.active);
    expect(forecast.modelVersion).toBe('v1'); expect(forecast.points).not.toEqual(buildMlForecast(masterResources, f, initial.active).points);
    expect(buildMlAnomalies(masterResources, f, restored.active)).toEqual(before);
    expect(buildMlForecast(masterResources, f, restored.active)).toEqual(buildMlForecast(masterResources, f, initial.active));
  });
  it('zero-resource responses contain no NaN, infinity or negative zero', () => {
    function check(value: unknown) { if (typeof value === 'number') { expect(Number.isFinite(value)).toBe(true); expect(Object.is(value, -0)).toBe(false); } else if (value && typeof value === 'object') Object.values(value).forEach(check); }
    check(buildMlAnomalies([], f)); check(buildMlForecast([], f)); check(buildMlPipeline([], f));
    expect(buildMlAnomalies([], f).items).toEqual([]); expect(buildMlForecast([], f).points).toEqual([]);
  });
  it('every model flagged actual is outside its band for every configuration', () => {
    for (const version of Object.keys(MODEL_CONFIGS) as ModelVersion[]) for (const a of buildMlAnomalies(masterResources, f, version).items.filter(a => a.detectedBy !== 'baseline')) expect(a.actual < a.expectedLow || a.actual > a.expectedHigh).toBe(true);
  });
  it('baseline requires 14 preceding days and |z| > 3', () => {
    const values = [...Array.from({ length: 14 }, (_, i) => 100 + i % 2), 200];
    const days = values.map((_, i) => `2026-09-${String(i + 1).padStart(2, '0')}`);
    const result = detectSeries(values, days, MODEL_CONFIGS.v3);
    expect(result.slice(0, 14).every(p => !p.baselineFlag && !p.modelFlag)).toBe(true); expect(result[14]?.baselineFlag).toBe(true);
  });
  it('filters daily costs without mutating any existing aggregate', () => {
    const before = buildDashboard(masterResources, f);
    for (const filters of [f, { ...f, providers: ['AWS'] as ['AWS'], range: '7d' as const }, { ...f, team: 'Data' as const, range: 'q3' as const }]) {
      const dto = buildMlAnomalies(masterResources, filters);
      expect(dto.series.reduce((n, s) => n + s.points.reduce((a, p) => a + p.actual, 0), 0)).toBeCloseTo(buildDashboard(masterResources, filters).totals.total, 5);
    }
    expect(buildDashboard(masterResources, f)).toEqual(before);
  });
  it('pipeline flags reconcile to the active model and gate metrics', () => {
    const p = buildMlPipeline(masterResources, f), d = buildMlAnomalies(masterResources, { ...f, range: 'custom' });
    expect(p.monitoring.flaggedPerDay.reduce((a, b) => a + b, 0)).toBe(d.counts.both + d.counts.modelOnly);
    const registry = buildMlModels();
    for (const run of p.runs) { const c = registry.models.find(m => m.version === run.candidateVersion), active = registry.models.find(m => m.status === 'Production'); if (!c || !active) throw new Error('Missing model'); expect(run.gate).toEqual(qualityGate(c.metrics, active.metrics)); }
  });
});