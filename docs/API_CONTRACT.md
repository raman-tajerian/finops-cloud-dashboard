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
