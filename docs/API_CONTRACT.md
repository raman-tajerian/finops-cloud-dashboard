# Fern API contract

Set `VITE_API_BASE_URL` to switch the app from demo data to a live backend. All endpoints are `GET {base}/api/v1/...` and return JSON matching the types in `src/types/finops.ts`.

| Endpoint | Returns |
| --- | --- |
| `/summary` | `SpendSummary` |
| `/costs?groupBy=service\|region` | `CostByDimension[]` |
| `/resources` | `ResourceDto[]` |
| `/recommendations` | `RecommendationDto[]` |
| `/anomalies` | `Anomaly[]` |
| `/clusters` | `ClusterDto[]` |

## GET /api/v1/costs/explore
Query: `range, providers, env, team, groupBy` (`service|provider|region|team|environment|tag`).
Returns `ExploreDto` (src/types/finops.ts): `keys`, daily `series` (one column per key plus `total` and `previous`), `rows` (current, previous, changePct, share, spark), `total`, `previousTotal`.

## Derivation rules (mock mode)
All figures are computed in `src/data/aggregate.ts` from the seeded dataset in `src/data/resources.ts`. The live API must keep these invariants: sum by provider = sum by service = sum by team = total spend for the same filters.

## GET /api/v1/resources
Query: `range, providers, env, team`. Returns `ResourcesDto`: `items` (ResourceRow), `count`, `monthlyTotal` (sum of last-30-day cost), `periodTotal` (same value as Overview total spend for these filters).

## GET /api/v1/resources/{id}
Returns `ResourceDetailDto` (90-day cost and utilization, tags, activity, `rightsizing`) or `null`. The rightsizing saving must use the same rule as recommendations (`rightsizeSaving`).

## GET /api/v1/kubernetes
Query: global filters. Returns `KubernetesDto` (`src/types/finops.ts`).
- Clusters = EKS, AKS and GKE resources matching the filters; `monthlyCost` = the resource's last-30-day cost.
- `nodes = max(3, round(cost / 350))`, `podsTotal = nodes × 14`, failed/pending = `round(pods × rate)` with rate 1% (Running/Idle) or 4% (Warning); which pods fail is chosen with the seeded PRNG.
- Namespace weights: prod-api 35%, data 25%, web 20%, monitoring 10%, system 10% (sum = cluster cost).
- Namespace efficiency = `round(avg(cpuAvg, memAvg) × factor)` with factors 1.15 / 1.0 / 0.9 / 0.6 / 0.5; under 30% = over-provisioned.
- Live CPU/memory gauges and the activity feed are simulated client-side ("Demo telemetry") and not part of this contract.

## GET /api/v1/budget
Query: global filters. Returns `BudgetDto`.
- `spendToDate` = month-to-date spend; `forecastEom` uses the same function as the Overview forecast (MTD + 7-day run rate × remaining days).
- `defaultBudget = 105% × previous quarter (Q3) spend ÷ 3`. The client lets users override it; bar turns amber at 80% and red at 100%.

## GET /api/v1/scenario
Query: global filters. Returns `ScenarioDto` — eligible spend for the simulator; the client applies `simulate()` (`src/lib/scenario.ts`).
- `baseline` = Total spend on Overview for the same filters.
- Reserved Instances: compute + Kubernetes spend × slider × 30%.
- Region migration (us-east-1 → eu-north-1): moved spend × (1 − cost-index ratio); carbon uses the Sustainability intensities.
- Rightsizing: Σ `rightsizeSaving()` × (period days / 30) × slider.

## POST /api/anomaly-analysis
Body: `{ anomalyId: string, note?: string, filters?: { range, providers[], env, team } }` (same filters as the URL).
Context is built by `buildAnomalyContext()` from the master dataset — the same aggregate as Overview, so the total, anomaly list, amounts and percentages match Overview for the same filters. Streams plain-text markdown; errors are appended as `[[ERROR]]message`.

## GET /api/v1/savings
Query: global filters. Returns `SavingsDto`: `items` (SavingItemDto — category, effort, risk, confidence, resourceIds), `total`, `target` (= 60% of total), `tracker` (6 months; realized values are seeded demo data, current month potential = open savings), `rules`.
Categories (first matching rule wins, so a resource is counted once): Idle resources (`rightsizeSaving`, 100%), Unused volumes and IPs (idle storage, 100%), Right-sizing (`rightsizeSaving`, 40%), Scheduling (non-prod compute × 12/24 × 70%), Reserved / Savings Plans (prod compute, CPU ≥ 40% → × 30% × 50%), Storage tiering (Standard/Hot × 35% × 40%). Items group by category + service + team. Overview "Savings opportunity" = `total`.

## GET /api/v1/alerts
Query: global filters. Returns `AlertsDto`:
- `scopes`: per scope (All, each provider, team and environment) `spent` = Overview total spend for the period, `forecast` = Overview end-of-month forecast, `defaultAmount` = 105% × Q3 ÷ 3.
- `anomalies`: the same anomalies as Overview with expected (14-day baseline × 3 days), actual (last 3 days), % deviation, impact, probable cause (fixed mapping per service) and a 21-day series with a ±15% expected band.
Budget creation, alert rules and anomaly statuses are client-side demo state only.

## GET /api/v1/security
Query: global filters. Returns `SecurityDto` (`src/types/finops.ts`). Findings are simulated — no real scanning takes place.
- Resource-level rules (seeded PRNG over the full dataset, then filtered): Open SSH to 0.0.0.0/0 (EC2/Azure VM/GCP Compute, ~12%, Critical), Public storage bucket (S3/Blob, ~10%, High), Unencrypted database (RDS/SQL DB, ~15%, High), Outdated Kubernetes version (EKS/AKS/GKE, ~25%, Low). Each references an existing resource id.
- Account-level rules (fixed counts, reference the provider): Over-permissive IAM role (4, Medium), Unused IAM access key > 90 days (5, Medium), Missing MFA on root account (1 per provider, Critical).
- `score` = 100 − weighted open findings (Critical 10, High 5, Medium 2, Low 1), clamped at 0. `scoreTrend` is 6 months of seeded demo history; the current month equals the computed score.
- `frameworks`: CIS, SOC 2, ISO 27001 and GDPR — fixed control lists (≥10 each); a control fails if any open finding of a mapped rule exists.
Finding statuses (In progress / Resolved / Accepted risk) are client-side session demo state; the client recomputes score and compliance with the overlay.

## Demo "as of" date

All demo responses are computed relative to a fixed `DEMO_TODAY = 2026-10-12` (UTC, `src/data/resources.ts`). The daily history ends on that day — no data point is later. Month-to-date, Last 7 days, forecasts, anomaly windows, security `detected` dates and recommendation snooze dates (7 or 30 days, session-only) are all derived from it. A live C# API should return its own as-of date.

### Security compliance controls
`complianceResult` returns a per-control `status` of `pass`, `fail` or `not-assessed` (no mapped finding rule). `passed + failed + notAssessed = total`; the pass percentage uses assessed controls only. Score values are shown with one decimal.

## GET /api/v1/reports/{template}
`template` = executive | team | savings | security. Query: range, providers, env, team. Returns `ReportDto` { template, title, range, generatedAt, totals, sections[{title, columns, rows}] }. Totals come from the same aggregates as Overview, Cost Explorer, Recommendations and Security.

## GET /api/v1/integrations
Returns `IntegrationsDto` { integrations: IntegrationDto[], history: SyncRunDto[] }. Cloud providers are Connected when present in the dataset. Demo: simulated, no credentials stored.

## GET /api/v1/settings
Returns `SettingsDto` { profile, workspace, members, mappings, keys (masked only), channels, events }. Demo: changes are session-only.
