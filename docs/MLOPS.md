# Fern MLOps

## Goal and current state

Explore cloud-cost anomaly detection and short-horizon forecasting without changing existing totals or the rule-based Active anomalies KPI. Model Insights has Detection, Forecast, Models and Pipeline URL tabs, global filters, currency formatting and accessible chart tables.

**Today:** a small deterministic TypeScript demo model in the browser, four configuration variants, a session registry, computed synthetic evaluation, a planned pipeline view and simulated telemetry/run history. No ML libraries. No real training, deployed model, packaging, GitHub Actions pipeline or real-data accuracy claim. “Production” means the active demo configuration; Promote/Roll back are session-only, not deployment. Registry metric fractions are computed afresh from known synthetic injections.

## Planned architecture (not implemented)

1. Validate ingested historical costs and training-window completeness in GitHub Actions.
2. Train and evaluate ML.NET anomaly/forecast models using the C# backend's feature contract.
3. Write immutable artifacts carrying version, parameters, algorithm, metrics and training-data window.
4. Quality gate blocks a candidate unless F1 ≥ production F1 −0.02 and recall ≥0.70. Real production evaluation will require representative, reviewed ground truth; current synthetic metrics are not sufficient.
5. Package the approved model artifact in the API Docker image; pin artifact and image versions together.
6. Deploy with Terraform and smoke checks, retaining the previous version/image for rollback.
7. Monitor p95 inference latency, flagged counts and service drift; alert and recommend retraining, with human review before deployment.

The API read contract switches using VITE_API_BASE_URL. A future production service must implement the endpoints, authentication, artifact ownership, rollout/rollback and monitoring; the frontend does not turn session demo actions into live writes.

## Detector formulas

Baseline: preceding 14-day population z-score; flag |z| >3. Constant history flags differing costs. Seasonal model: weekday median minus overall median is each weekday offset, with exponentially weighted level over deseasonalized observations. Alpha defaults 0.3 in v3. Expected=nonnegative level+weekday offset; band=expected±k×robust spread, with low clamped zero. Robust spread=max(1.4826×MAD, 1% mean cost, 0.01 USD). Model flag requires actual outside the band and 14 earlier observations. Window/alpha/k differ for v1–v4. No observation under review is included in its own fit.

Score=clamped standardized absolute distance×10. Confidence=100×distance outside band/(distance+spread); not a calibrated probability. High≥70, Medium≥40, otherwise Low. Baseline-only flags can remain inside the seasonal band.

## Forecast formulas and backtest

14 future daily costs=last EW level+weekday offset, nonnegative. Band half-width=k×spread×sqrt(1+horizon/7). Naive baseline=last seven-day mean. Withhold the last 14 observed days, fit only earlier history, and forecast all 14 without observing held-out actuals. MAPE=100×mean absolute relative error on positive actuals. The heuristic band is not a calibrated confidence interval. Forecast starts after the selected period end (Q3 therefore forecasts early October), not necessarily after demo today.

## Evaluation and metrics

Six seeded synthetic service series, 365 days ending on 12 October 2026, with weekday patterns, trend, noise and exactly 20 reproducible multiplicative anomalies. Evaluate predictions on indices 90–364; injected events occur at 90–359. A prediction within ±1 day in the same service matches one event, and each prediction/event is used at most once. Precision=TP/(TP+FP), recall=TP/(TP+FN), F1=2PR/(P+R), zero for empty denominators. Baseline uses identical evaluation. These metrics can favor the naive baseline and must not be represented as real-world accuracy.

## Registry, quality gate and monitoring

Configurations and exact seeds are in [DEMO_DATA.md](DEMO_DATA.md). Promotion updates shared session active/previous version, rekeys Detection, Forecast, Models and Pipeline, and recalculates comparisons. No artifacts or training jobs exist.

Eight seeded run histories have stages Data validation, Train, Evaluate, Quality gate, Package, Deploy, Monitor. Gate results use current computed model metrics; failure skips subsequent stages. Durations/triggers are simulated. Latency p95 is seeded (8–20ms), not a measured inference benchmark. Model flags per day are computed for the last 30 days ending at selected period end. Drift compares the configuration's preceding window with the last 14 days: absolute mean difference divided by pooled standard deviation, floored by 1% training mean and 0.01. Max service drift >0.5 warns and recommends retraining; no retrain job is launched.

## Endpoints and JSON shapes

All GETs below accept range, providers (comma-separated), env, team and modelVersion (v1–v4, default v3). Money is USD; UI currency conversion is display only. Registry evaluation stays synthetic and independent of resource filters. Query keys retain all filters/version.

```text
GET /api/v1/ml/anomalies
{modelVersion,items:[{id,day,service,provider,actual,expectedLow,expectedHigh,
 score,confidence,severity,detectedBy,modelVersion,reason}],
 counts:{both,modelOnly,baselineOnly},resourceCount,
 series:[{id,service,provider,points:[{day,actual,expected,expectedLow,
 expectedHigh,modelFlag,baselineFlag,score,confidence}]}]}

GET /api/v1/ml/forecast
{modelVersion,horizonDays,points:[{day,forecast,low,high,baseline}],
 backtest:{mapeModel,mapeBaseline},resourceCount}

GET /api/v1/ml/models
{models:[{version,status,trainedAt,trainingWindowDays,algorithm,
 params:{windowDays,alpha,k},metrics:{precision,recall,f1},notes}],
 baseline:{precision,recall,f1},evaluation:{series,days,injectedAnomalies}}

GET /api/v1/ml/pipeline
{stages,runs:[{id,startedAt,trigger,candidateVersion,
 stages:[{name,status,durationSec}],
 gate:{passed,rule,detail,candidateF1,productionF1,candidateRecall}}],
 monitoring:{days,latencyP95Ms,flaggedPerDay,
 drift:{score,threshold,status,services:[{service,score}]}},resourceCount}
```

These are demo builders/future backend contracts, not hosted /api/v1 handlers. See [API_CONTRACT.md](API_CONTRACT.md) and `src/types/ml.ts` for types. Zero-resource responses use empty cost series/forecast, finite zero counters/backtests/telemetry; the shell offers Reset filters. Planned run history/registry remain independently defined.

## Limitations

Synthetic evaluation only. Weekday seasonality, no holiday/events handling, no causal explanations, no learned representation, no calibrated uncertainty. Mean drift is heuristic and can follow a known spike. Aggregation can conceal resource-level anomalies. Actual cloud ingestion, representative labelled ground truth, real-world accuracy, latency and production deployment are unverified and not built. Human judgement is required before any cost or infrastructure action.
