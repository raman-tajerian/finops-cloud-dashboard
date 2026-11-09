# Fern API contract

Set `VITE_API_BASE_URL` to switch the 23 read functions in [`src/lib/api.ts`](../src/lib/api.ts) from demo builders to `GET {base}/api/v1/...`. One trailing slash is removed from the base. JSON must match [`src/types/finops.ts`](../src/types/finops.ts); it is cast, not runtime-validated. The read client has no authentication headers or write methods. Non-2xx responses throw `Request failed (<status>)`. Demo requests wait a simulated 300–800 ms before returning builder results.

## Complete function inventory

`F` means `range`, `providers`, `env`, `team`, serialized with `URLSearchParams` in that order. Providers are one comma-joined value, not repeated parameters or the router's array encoding. Example: `range=mtd&providers=AWS%2CAzure%2CGCP&env=All&team=All`.

| Function | Method | Path relative to base | Query | Response |
| --- | --- | --- | --- | --- |
| getDashboard(f) | GET | /api/v1/dashboard | F | DashboardDto |
| getExplore(f, groupBy) | GET | /api/v1/costs/explore | F + groupBy | ExploreDto |
| getResources(f) | GET | /api/v1/resources | F | ResourcesDto |
| getResource(id) | GET | /api/v1/resources/{id} | None | ResourceDetailDto or null |
| getSustainability(f) | GET | /api/v1/sustainability | F | SustainabilityDto |
| getKubernetes(f) | GET | /api/v1/kubernetes | F | KubernetesDto |
| getBudget(f) | GET | /api/v1/budget | F | BudgetDto |
| getScenario(f) | GET | /api/v1/scenario | F | ScenarioDto |
| getSavings(f) | GET | /api/v1/savings | F | SavingsDto |
| getAlerts(f) | GET | /api/v1/alerts | F | AlertsDto |
| getReport(f, template) | GET | /api/v1/reports/{template} | F | ReportDto |
| getIntegrations() | GET | /api/v1/integrations | None | IntegrationsDto |
| getSettings() | GET | /api/v1/settings | None | SettingsDto |
| getSecurity(f) | GET | /api/v1/security | F | SecurityDto |
| getFernScore(f) | GET | /api/v1/fern-score | F | FernScoreDto |
| getInsights(f) | GET | /api/v1/insights | F | InsightsDto |
| getCommitments(f) | GET | /api/v1/commitments | F | CommitmentsDto |
| getTeams(f) | GET | /api/v1/teams | F | TeamsDto |
| getNotifications(f) | GET | /api/v1/notifications | F | NotificationsDto |
| getMlAnomalies(f, version) | GET | /api/v1/ml/anomalies | F + modelVersion | MlAnomaliesDto |
| getMlForecast(f, version) | GET | /api/v1/ml/forecast | F + modelVersion | MlForecastDto |
| getMlModels(f, version) | GET | /api/v1/ml/models | F + modelVersion | MlModelsDto |
| getMlPipeline(f, version) | GET | /api/v1/ml/pipeline | F + modelVersion | MlPipelineDto |

App normalization (`src/lib/filters.ts`) accepts range `7d|mtd|q3|custom` (default mtd), providers AWS/Azure/GCP (default all), env All/Production/Staging/Development (default All), team All/Platform/Data/FinOps/Media (default All). Custom means last 30 days, not an arbitrary interval; `30d` is not a separate normalized URL value. The API client itself does not apply defaults to its supplied Filters.

Resource IDs use `encodeURIComponent`; detail reads have no global filters. Report templates executive/team/savings/security are inserted directly. Currency, table search/sort/pagination, selected resource, saved views and simulator sliders are client state, not API query parameters.

`POST /api/anomaly-analysis` is a separate same-origin server route, not an api.ts method and not switched by the read base URL.

## GET /api/v1/dashboard
Query: `range, providers, env, team`. Returns `DashboardDto` (src/types/finops.ts) — everything the Overview cards need for one filter combination:
- `providers`: selected providers. `services` and `teams` are `CostByDimension[]` (name, value); `regions` is `RegionCost[]` (region, AWS, Azure, GCP). Each breakdown sums to total. Service grouping uses resource categories, not named services.
- `kpis`: `KpiBundle` — spend (total, mom %, daily burn, EOM projection), waste (total + idle storage/DBs/oversized), anomalies (same list as `/alerts`), unit economics (per user/request/deployment/session).
- `daily`: daily spend series for the selected window; `trend`: per-provider daily series; `forecast`: MTD + 7-day run-rate projection; `movers`: biggest cost increases/decreases.
- `recommendations`: the full sorted `SavingItemDto[]` (same rules as `/savings`); `cluster` and `ticker`: fixed illustrative fixtures, distinct from `/kubernetes`; `carbon`: shared regional CO₂e; `topology`: nodes and edges; `resources`: all matching ResourceDto rows (the UI selects its top ten).
- `overview`: totalSpend, forecastEom, dailyBurn, savings, idleWaste, anomalies, costPerUser, costPerRequest (each `{value:number,previous:number,spark:number[]}`), plus idleCount:number. `totals` is `{total:number,byProvider:CostByDimension[]}`.

## GET /api/v1/sustainability
Query: `range, providers, env, team`. Returns `SustainabilityDto` (src/types/finops.ts). All figures are estimates: CO₂e = cost × kWh-per-dollar × region carbon intensity.
- `totalTons`, `previousTons`, `changePct`: total t CO₂e for the period vs the previous period.
- `kgPerThousandUsd`: kg CO₂e per $1,000 spend; `abSpendShare`: percentage of spend in A/B-graded regions (0–100).
- `trend`: `CarbonTrendPoint[]` daily series; `regions`: `SustainabilityRegionDto[]` (`region`, `provider`, `intensity` in gCO₂/kWh, `rating` A–D, `tons`, `cost` USD, `share` %); `providers` / `services`: `CarbonBreakdown[]` — each sums to `totalTons`.
- `suggestions`: `GreenerRegionSuggestion[]` — for the 3 highest-emitting workloads, a lower-intensity region on the same provider with estimated CO₂e reduction and cost change (never suggests a higher-intensity region).

## GET /api/v1/costs/explore
Query: `range, providers, env, team, groupBy` (`service|provider|region|team|environment|tag`).
Returns `ExploreDto` (src/types/finops.ts): `groupBy`, `keys`, daily `series` (one column per key plus `total` and `previous`), `rows` (current, previous, changePct, share, spark), `total`, `previousTotal`.

Also returns `unitEconomics: UnitEconomicsDto`, shared with every ReportDto: `{activeUsers,requests,perUser,perRequest,previousPerUser,previousPerRequest,userSpark:number[],requestSpark:number[]}`. Dashboard exposes the same unit costs in `kpis.unit` and `overview.costPerUser/costPerRequest`. Active users is the mean of the independent seeded daily user series in the selected window; requests is the sum of the independent seeded request series. `perUser=selectedSpend/activeUsers`, `perRequest=selectedSpend/requests`; previous values use the preceding window's spend and usage, not monthly-normalized spend. Usage remains workspace-wide under provider/environment/team filters. Histories have 184 days ending 2026-10-12, separate seeds, weekday seasonality, 2% monthly growth and ±2% noise (see DEMO_DATA). Zero denominators return zero; the UI shows `—` for unavailable ratios and one Reset filters empty state for zero resources. No endpoint or query parameter was added.

## Derivation rules (mock mode)
Builders live in src/data/aggregate.ts, platformOps.ts, budgets.ts, security.ts, reports.ts, integrations.ts and settings.ts. Costs share the master dataset; some telemetry/history is illustrative. Full formulas and limitations: [DEMO_DATA.md](DEMO_DATA.md). Provider, service-category and team sums equal selected-period total spend.

## GET /api/v1/resources
Query: `range, providers, env, team`. Returns `ResourcesDto`: `items` (ResourceRow), `count`, `monthlyTotal` (sum of last-30-day cost), `periodTotal` (same value as Overview total spend for these filters).

## GET /api/v1/resources/{id}
No query. Returns `{resource:ResourceRow,tags:Record<string,string>,cost:{day,cost}[],util:{day,cpu,mem}[],activity:{day,text,tone}[],rightsizing:{saving,action}|null}`, or JSON null for an unknown ID. Cost/utilization contain 90 days; activity has at most 12 entries. Tone is success/warning/critical/idle; day/text/action are strings and cost/cpu/mem/saving numbers. Rightsizing uses shared rightsizeSaving.

## GET /api/v1/kubernetes
Query: global filters. Returns `KubernetesDto` (`src/types/finops.ts`).
- Clusters = EKS, AKS and GKE resources matching the filters; `monthlyCost` = the resource's last-30-day cost.
- `nodes = max(3, round(cost / 350))`, `podsTotal = nodes × 14`, failed/pending = `round(pods × rate)` with rate 1% (Running/Idle) or 4% (Warning); which pods fail is chosen with the seeded PRNG.
- Namespace weights: prod-api 35%, data 25%, web 20%, monitoring 10%, system 10% (sum = cluster cost).
- Namespace efficiency = `min(100, round(avg(cpuAvg, memAvg) × factor))` with factors 1.15 / 1.0 / 0.9 / 0.6 / 0.5; under 30% = over-provisioned.
- Live CPU/memory gauges and the activity feed are simulated client-side ("Demo telemetry") and not part of this contract.

## GET /api/v1/budget
Query: global filters. Returns `BudgetDto` `{spendToDate,forecastEom,dayOfMonth,monthDays,previousQuarterSpend,defaultBudget,period}` (all numbers except period:string).
- `spendToDate` = total spend for the selected period (`range`) — identical to the Overview total for the same filters; `forecastEom` uses the same function as the Overview forecast (MTD + 7-day run rate × remaining days).
- `defaultBudget = round(105% × previous quarter (Q3) spend ÷ 3)`. The client lets users override it; bar turns amber at 80% and red at 100%.

## GET /api/v1/scenario
Query: global filters. Returns `ScenarioDto` `{baseline,days,computeSpend,migrateSpend,rightsizeEligible,riDiscount,migrateFrom,migrateTo,costRatio,intensityFrom,intensityTo,kwhPerUsd}`. migrateFrom/migrateTo are strings; other fields are numbers. The client applies simulate() in src/lib/scenario.ts; no sliders are sent.
- `baseline` = Total spend on Overview for the same filters.
- Reserved Instances: compute + Kubernetes spend × slider × 30%.
- Region migration (us-east-1 → eu-north-1): moved spend × (1 − cost-index ratio); carbon uses the Sustainability intensities.
- Rightsizing: Σ `rightsizeSaving()` × (period days / 30) × slider.

## POST /api/anomaly-analysis
Separate from api.ts. Body: `{anomalyId:string,note?:string,filters?:{range?:string,providers?:string[],env?:string,team?:string}}`. Limits: ID 80 characters, note 500, range/env/team 20, at most three provider strings of ten characters. Filters use app normalization/defaults.

Context is built by buildAnomalyContext from the master dataset and matches demo Overview for the same filters. It remains demo context even if VITE_API_BASE_URL selects live reads. A server-side LOVABLE_API_KEY is required; no AI key is collected in the browser.

Success streams markdown as `text/plain; charset=utf-8`, with `cache-control:no-store`. Invalid JSON/body returns 400 `{error:"Invalid request"}`, unknown anomaly 404, missing AI configuration 401. Stream failures append `[[ERROR]]message`. Successful deployed Gateway access is not established by this contract.

## GET /api/v1/savings
Query: global filters. Returns `SavingsDto`: `items` (SavingItemDto — category, effort, risk, confidence, resourceIds), `total`, `target` (rounded 60% of total), `targetShare` (0.6), `tracker` (6 months; realized values are seeded demo data, current month potential = aggregate total before session overlays), `rules`.
Categories (first matching rule wins, so a resource is counted once): Idle resources (`rightsizeSaving`, 100%), Unused volumes and IPs (idle storage, 100%), Right-sizing (`rightsizeSaving`, 40%), Scheduling (non-prod compute × 12/24 × 70%), Reserved / Savings Plans (remaining Compute/Kubernetes, CPU ≥ 40% → × 30% × 50%), Storage tiering (Standard/Hot × 35% × 40%). Items group by category + service + team. Overview "Savings opportunity" = `total`.

## GET /api/v1/alerts
Query: global filters. Returns `AlertsDto`:
- `scopes`: All/provider/team/environment scopes intersect global filters; spent uses the selected period and forecast the shared end-of-month function. `defaultAmount = round(105% × scoped Q3 spend ÷ 3)`.
- `anomalies`: the same anomalies as Overview with expected (14-day baseline × 3 days), actual (last 3 days), % deviation, impact, probable cause (fixed mapping per service) and a 21-day series with a ±15% expected band.
Budget creation, alert rules and anomaly statuses are client-side demo state only.

## GET /api/v1/security
Query: global filters. Returns `{findings:SecurityFindingDto[],score:number,scoreTrend:{month:string,score:number}[],frameworks:ComplianceFrameworkDto[],weights:Record<Severity,number>}`. Findings are simulated; no real scan.
- Resource-level rules (seeded PRNG over the full dataset, then filtered): Open SSH to 0.0.0.0/0 (EC2/Azure VM/GCP Compute, ~6%, Critical), Public storage bucket (S3/Blob, ~5%, High), Unencrypted database (RDS/SQL DB, ~8%, High), Outdated Kubernetes version (EKS/AKS/GKE, ~20%, Low). Each references an existing resource id, and every rule produces at least one finding when eligible resources exist.
- Account-level rules (fixed counts, reference the provider): Over-permissive IAM role (3, Medium), Unused IAM access key > 90 days (3, Medium), Missing MFA on root account (Azure only, Critical).
- `score` = 100 − weighted open findings (Critical 8, High 4, Medium 1.5, Low 0.5), clamped at 0. `scoreTrend` is 6 months of seeded demo history; the current month equals the computed score.
- `frameworks`: CIS, SOC 2, ISO 27001 and GDPR — fixed control lists (≥10 each); a control fails if any open finding of a mapped rule exists.
Finding statuses (In progress / Resolved / Accepted risk) are client-side session demo state; the client recomputes score and compliance with the overlay.

## Demo "as of" date

All demo responses are computed relative to a fixed `DEMO_TODAY = 2026-10-12` (UTC, `src/data/resources.ts`). Historical observations end on that day; forecast projections and snooze end dates can be later. Month-to-date, Last 7 days, forecasts, anomaly windows, security `detected` dates and recommendation snooze dates (7 or 30 days, session-only) are all derived from it. A live C# API should return its own as-of date.

### Security compliance controls
`complianceResult` is client-computed, not a SecurityDto field. It returns a per-control `status` of `pass`, `fail` or `not-assessed` (no mapped finding rule). `passed + failed + notAssessed = total`; the pass percentage uses assessed controls only. Open/In progress count against score/compliance; Resolved/Accepted risk do not. API score is a number, displayed with one decimal by the shared formatter.

## GET /api/v1/reports/{template}
`template` = executive | team | savings | security. Query: range, providers, env, team. Returns `ReportDto` { template, title, range, filters, generatedAt, totals, sections[{title, columns, rows}], unitEconomics:UnitEconomicsDto }. filters is typed unknown (demo uses supplied Filters), generatedAt is an ISO date string, totals is Record<string,number>, and rows are (string|number)[][]. Totals come from the same aggregates as Overview, Cost Explorer, Recommendations and Security.

Every template includes exact shared `unitEconomics`; executive sections additionally include “Unit economics” rows with current and previous costs per active user/request. Executive financial totals are rounded to two decimals; unit costs are not rounded in the DTO. Team/savings/security sections remain template-specific rather than duplicating the executive unit-cost section.

## GET /api/v1/integrations
Returns `IntegrationsDto` { integrations: IntegrationDto[], history: SyncRunDto[] }. Cloud providers are Connected when present in the dataset. Demo: simulated, no credentials stored.

## GET /api/v1/settings
Returns `SettingsDto` { profile, workspace, members, mappings, keys (masked only), channels, events }. Demo: changes are session-only.

## Display currency (client concern)

All API money values are and stay in USD. The UI converts once at display time through the shared formatter in `src/data/currency.ts` using fixed **demo rates** (1 USD = 0.92 EUR, 10.55 SEK, 0.79 GBP) — never live FX, never summed after rounding. The selected currency travels in the `?cur=` URL param (USD | EUR | SEK | GBP), not the API query. CSV/print output formats money for display; report JSON retains USD numeric totals and adds display-currency metadata. A live C# API should keep returning USD and let the client own presentation currency.

## Keyboard shortcuts (client concern)

G then O/C/R/S/K navigates (Overview, Cost Explorer, Resources, Security, Kubernetes), `/` opens search, `?` opens the shortcuts dialog, Esc closes dialogs and drawers, ⌘/Ctrl+K opens the command palette. Shortcuts are ignored while typing and while a dialog is open (except Esc).


## Nested response shapes

The linked TypeScript contracts are authoritative for all enums and field types. These structures complete the endpoint summaries above (numeric monetary values are USD):

- **ResourceRow:** id, name, provider, service, sku, region, environment, team, monthlyCost, cpuAvg, memAvg, status. ResourceDto instead uses type and omits SKU/environment/team/utilization.
- **SavingItemDto:** id, title, detail, savings, impact (High Impact/Quick Win), team, category, effort, risk, confidence, service, resourceIds:string[]. Tracker rows: month:string, realized:number, potential:number. Rule rows: category, effort, risk, confidence, rule:string.
- **AnomalyRowDto:** id, title, date, service, provider, resourceId, expected, actual, change, impact, cause, series:{day,actual,low,high}[]. Dashboard Anomaly has id/title/change/impact/since/provider instead of this detail shape.
- **KubernetesDto:** clusters:K8sClusterDto[], totalCost:number. Cluster fields: id, name, provider, service, region, environment, status, cpuAvg, memAvg, monthlyCost, nodes, podsTotal, podsHealthy, podsFailed, namespaces, pods. Namespace: name, weight, cost, efficiency, overProvisioned:boolean. Pod: name, namespace, status (Running/Pending/Failed), restarts. podsFailed includes both Failed and Pending.
- **ScopeSpendDto:** key:string, scope:{kind:All/Provider/Team/Environment,value:string}, spent:number, forecast:number, defaultAmount:number. Scopes intersect global filters; default amounts are rounded.
- **SecurityFindingDto:** id, rule, severity, title, resourceId:string|null, provider, detected:string, status, description, impact:string, steps:string[], snippet:string. Framework: id, name, controls:{id,name,rules:FindingRule[]}[]. API controls have no status field.
- **IntegrationsDto:** integrations:{id,name,kind,status,lastSync:string|null,credential,permissions:string[]}[], history:{id,integration,started,status,durationSec,records}[]. Kinds: cloud/kubernetes/chat/dev/ops; connection status Connected/Not connected/Error; credential aws-role-arn/azure-sp-id/gcp-project-id/none; sync status Success/Failed/Partial.
- **SettingsDto:** profile:{name,email,title}, workspace:{name,currency,timezone}, members:{id,name,email,role:Admin/Editor/Viewer,lastActive}[], mappings:{id,tagKey,tagValue,team}[], keys:{id,name,masked,created,lastUsed:string|null}[], channels:string[], events:string[]. Other listed profile/member/key text fields are strings. Fake-key creation and session edits are not write APIs.
- **SustainabilityRegionDto:** region, provider, intensity, rating (A/B/C/D), tons, cost, share. CarbonBreakdown: name, tons, share. CarbonTrendPoint: day, tons. GreenerRegionSuggestion: resourceId, workload, provider, currentRegion, suggestedRegion, currentIntensity, suggestedIntensity, currentTons, reductionTons, reductionPct, costChangePct.
- **Dashboard series:** DailyCost {day,spend}; ProviderDaily {day,AWS,Azure,GCP,total,forecast:number|null,band:[number,number]|null,anomaly?:string}; ForecastPoint {day,forecast,band:[number,number],actual:number|null}. Movers contain id/name/provider/service/current/previous/delta in up/down lists. Topology nodes contain id/label/kind/health/x/y/z/cost; edges are {from,to}.
- **Explorer series/rows:** series is Record<string,number|string>[] with day/date, one numeric column per key, total and previous; rows contain name:string, current:number, previous:number, changePct:number, share:number, spark:number[].
- **UnitEconomicsDto:** activeUsers:number (mean daily users), requests:number (period request total), perUser:number, perRequest:number, previousPerUser:number, previousPerRequest:number, userSpark:number[], requestSpark:number[]. Used by ExploreDto and ReportDto; Dashboard maps these values into its existing KPI shapes. All monetary ratios stay USD.
- **Legacy ClusterDto / carbon / topology:** cluster has name, region, version, nodes, cpu, memory, podsHealthy, podsTotal; ticker is string[]. CarbonRegionDto has region/provider/intensity/rating/tons. Topology kind is region/vpc/cluster, health is ok/oversized/anomaly; coordinates and cost are numeric.
- **KpiBundle:** spend:{total,mom,burn,projected}, waste:{total,ebs,rds,ec2} (ebs/rds/ec2 are counts), anomalies:Anomaly[], unit:{perUser,perRequest,activeUsers,requests,perDeployment,perSession}. Legacy spend/daily DTO fields can be rounded; precise Overview totals retain aggregate values.

## Documentation reconciliation (4 November 2026)

Checked all **14 functions** against `src/lib/api.ts`: each is listed with GET method, exact path, query parameters and response contract; none is missing. No client function or endpoint was added or changed by this documentation refresh.

Changes in this refresh:
- Added the previously omitted `unitEconomics` field to the Reports endpoint's response shape and the nested DTO inventory; confirmed the existing Explorer description and dashboard mapping.
- Documented exact versus rounded report values, current/previous executive unit-cost rows and which templates expose those rows.
- Corrected the Sustainability endpoint field names (`intensity`, `rating`) and added its region `cost` field to the endpoint summary.
- Retained provider serialization, filter defaults, demo date, all nested contracts and separate AI route limitations. The read base URL requires a compatible external HTTP backend; no production implementation or successful live AI generation was verified.


## GET /api/v1/fern-score
Query: global filters F. Returns `FernScoreDto`: `score:number|null`, `subScores:{waste,security,budget,anomaly}` (each number|null), `inputs:{spend,idleWaste,securityScore,budgetForecast,budgetAmount,activeAnomalies}` (numbers). Derived from the unchanged Dashboard, Security and Budget aggregates. Budget utilization uses end-of-month forecast / default company monthly budget, matching the Budgets company card. No resources or nonpositive spend returns null score/sub-scores (UI `—`); a missing/zero budget with spend gives budget score zero. See [DEMO_DATA.md](DEMO_DATA.md) for the complete formula and mixed-period caveat.

## GET /api/v1/insights
Query: global filters F. Returns `InsightsDto`: `{insights:DailyInsightDto[]}`. Each insight has `id`, `type` (`cost-mover|saving|budget|security|greener-region`), `sentence` (plain-language template with one `{figure}` token), `figure:{value:number,unit:USD|count|tCO2e}`, and `link:{to,tab}`. The UI replaces the token using the shared currency or unit formatter. Numeric monetary figures remain USD. Links point to existing pages/tabs and retain global URL filters.

Rules run in fixed order and return at most five entries, one per applicable rule. No matching resources returns an empty array; unavailable rules are skipped, so narrow filters can produce fewer than three entries. Empty output displays “Nothing needs attention”. Figures reconcile to existing aggregates; no generated/AI text or invented figures. Session-only demo status/budget edits are not inputs: these endpoints describe the aggregate default state, as do the existing read endpoints.

Both new endpoints follow the existing read-client pattern: local pure builders in demo mode, actual GET requests to the configured C# API in live mode. This project does not host `/api/v1` HTTP handlers; the replacement backend must implement these paths. Both queries have separate loading/error/retry states keyed by all global filters.


## GET /api/v1/commitments
Query F. Returns `CommitmentsDto` `{eligibleSpend,committedSpend,coveragePct,commitments,recommendations}`. Headline eligible/committed spend uses the selected period. Commitment rows: `{id,provider,name,monthlyEligible,committedSpend,coveragePct,utilizationPct,expires,daysRemaining,expiringSoon}`; row money is monthly USD, expiration is ISO yyyy-mm-dd. Recommendations: `{provider,stableBaseline,uncoveredStable,monthlySaving,upfront,breakEvenMonths}`. Percentages are 0–100; monetary amounts stay USD. Empty inventory yields empty arrays and zero totals. These are illustrative commitments, not purchased reservations.

## GET /api/v1/teams
Query F. Returns `TeamsDto` `{total,teams:ShowbackTeamDto[]}`. Each team has `{team,spend,previousSpend,changePct,budgetAmount,forecast,budgetUsagePct,resources:ResourceRow[],topResources:ResourceRow[],trend:DailyCost[]}`. Spend and comparison match `/costs/explore?groupBy=team`; total equals Overview selected-period spend. Teams follow the global team filter; with All, four named teams are returned, including zero-spend teams. Resources rank by monthlyCost; topResources takes three. Monthly budget and forecast follow existing scoped defaults. The `/teams/{teamId}` UI uses this same filtered response, not an extra endpoint. CSV includes unrounded USD fields plus display-formatted spend.

## GET /api/v1/notifications
Query F. Returns `NotificationsDto` `{items:NotificationDto[],counts:{anomaly,budget,security,recommendation}}`. Notification fields `{id,type,title,sentence,figure:{value,unit:USD|count},link:{to,tab},sourceId}`. Sentences carry `{figure}` for the shared display formatter. One notification per active anomaly, open security finding and saving group; one per built-in budget scope at its highest reached threshold (80% or 100%). Stable IDs key client read state. Empty resource selections return no notifications even if raw account-level findings exist. Read/unread filtering and mark-all are session overlays, not API writes; the bell and page share this response and map. Default source statuses match the read aggregates, not session remediation overlays.

New paths follow the existing mock/future C# GET pattern; no hosted `/api/v1` handlers are added. See DEMO_DATA for precise eligibility, baseline, seeds and thresholds.


## Model Insights read endpoints

All four use F and `modelVersion=v1|v2|v3|v4` (default v3). Each query key includes filters and the shared session active version. This explicit parameter keeps detection, forecast, registry status and gate comparisons aligned after demo promotion, with no write endpoint. Registry evaluation is intentionally filter-independent synthetic data, even though transport/query keys retain F. The UI labels active status Production as a demo configuration only.

- **GET /api/v1/ml/anomalies**: `MlAnomaliesDto` `{modelVersion, items:[{id,day,service,provider,actual,expectedLow,expectedHigh,score,confidence,severity,detectedBy,modelVersion,reason}], counts:{both,modelOnly,baselineOnly}, series:[{id,service,provider,points:[{day,actual,expected,expectedLow,expectedHigh,baselineFlag,modelFlag,score,confidence}]}], resourceCount}`. Service names are named services (EC2, RDS, etc.), not Explorer categories. Items and chart points use the selected period, with preceding history for fitting.
- **GET /api/v1/ml/forecast**: `MlForecastDto` `{modelVersion,horizonDays:14,points:[{day,forecast,low,high,baseline}],backtest:{mapeModel,mapeBaseline},resourceCount}`. MAPE is percentage units. Future points start after the selected period end; training uses available history through that end.
- **GET /api/v1/ml/models**: `MlModelsDto` `{models:[{version,status,trainedAt,trainingWindowDays,algorithm,params:{windowDays,alpha,k},metrics:{precision,recall,f1},notes}],baseline:{precision,recall,f1},evaluation:{series:6,days:365,injectedAnomalies:20}}`. Metrics are fractions in [0,1], trainedAt is seeded ISO date, never evidence of training.
- **GET /api/v1/ml/pipeline**: `MlPipelineDto` `{stages:string[],runs:[{id,startedAt,trigger,candidateVersion,stages:[{name,status,durationSec}],gate:{passed,rule,detail,candidateF1,productionF1,candidateRecall}}],monitoring:{days:string[],latencyP95Ms:number[],flaggedPerDay:number[],drift:{score,threshold:0.5,status,services:[{service,score}]}},resourceCount}`. Stage status Passed/Failed/Skipped; trigger schedule/push/manual; drift OK/Warning. Latency is seeded simulation; flags/drift are computed. Days label both telemetry arrays. Runs remain simulated and gates recompute against the current active model.

All money stays USD. No matching resources: detection/forecast arrays empty, counts/backtest zero, telemetry arrays empty and drift zero; registry and seeded planned history still exist. The global shell offers Reset filters. These are local demo builders or future C# GET contracts, not hosted HTTP handlers. No training/deployment service is built. [MLOPS.md](MLOPS.md) contains formulas, evaluation and production plans.
