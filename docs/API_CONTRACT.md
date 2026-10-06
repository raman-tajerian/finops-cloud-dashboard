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
