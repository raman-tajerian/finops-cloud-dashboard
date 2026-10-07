# NimbusOps API contract

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
