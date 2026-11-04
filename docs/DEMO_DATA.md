# Fern demo data and reproducibility

This is the current implementation, not a proposed production model. Fjord Labs is fictional. All prices, emissions, telemetry, findings and controls are simulated or estimated. Reproduce these rules in a replacement backend to preserve cross-page consistency; do not treat them as validated cloud pricing, emissions or compliance methodology.

Sources: [`resources.ts`](../src/data/resources.ts), [`aggregate.ts`](../src/data/aggregate.ts), [`platformOps.ts`](../src/data/platformOps.ts), [`budgets.ts`](../src/data/budgets.ts), [`security.ts`](../src/data/security.ts), [`scenario.ts`](../src/lib/scenario.ts), [`currency.ts`](../src/data/currency.ts) and the [API contract](API_CONTRACT.md).

## Master dataset

`masterResources` contains **61 resources**. Each has these fields:

| Fields | Meaning |
| --- | --- |
| `id`, `name` | Stable resource identifier and fictional workload name |
| `provider`, `service`, `category`, `sku`, `region` | Cloud provider, named service, aggregate category, SKU and region |
| `environment`, `team` | Production/Staging/Development and Platform/Data/FinOps/Media |
| `tags` | `app` and `costCenter` strings |
| `monthlyCost` | Rounded USD sum of the last 30 daily observations |
| `cpuAvg`, `memAvg`, `status` | Simulated averages and Running/Idle/Warning status |
| `daily` | 184 daily USD amounts, oldest first, individually rounded to cents |

Catalog counts: AWS EC2 9, RDS 6, S3 6, EKS 4, Lambda 5; Azure VM 7, AKS 3, Blob 5, SQL DB 4; GCP Compute 6, GKE 2, BigQuery 4. SKU choices and service-specific monthly base ranges are defined in the ordered `specs` array in `resources.ts`.

`DEMO_TODAY = 2026-10-12` UTC. History is **12 April–12 October 2026**, inclusive. `dayAt(i) = DEMO_TODAY - (183-i) days`. No historical observation is later than the demo date. Forecasts are projections beyond that date, not additional history.

### Seeded generation

The ordered resource build uses **Mulberry32 seed 20261025**. It increments a signed 32-bit seed by `0x6d2b79f5`, applies the integer multiply/xor mixing in `mulberry32`, and divides the final unsigned integer by `4294967296`. Preserve call order, ordered specs and rounding if exact fixture reproduction matters.

Apps determine teams through `teamFor`. Environment selection uses `[Production, Production, Production, Staging, Development]`; monthly base multipliers are 1, 0.45 and 0.25 respectively. Idle is drawn at probability 0.13. Idle CPU is rounded `1 + random*4`, idle memory `3 + random*8`; other CPU is rounded `12 + random*70`, other memory `20 + random*65`.

For history index `d`, `t=d/183`, `growth=(random-0.4)*0.5` and `phase=random*6`:

```text
daily[d] = roundToCents(
  monthlyBase / 30
  × (1 + growth × (t - 0.5))
  × (1 + 0.08 × sin(d / 3.2 + phase))
  × (0.94 + random × 0.12)
  × spikeFactorIfApplicable
)
```

`blob-03` (blob-media-egress) has a 3.4× spike in its last four days; `s3-02` (nat-gw-prod-egress) has a 1.9× spike in its last three. Status is Idle when drawn idle; otherwise Warning for CPU >78 or a configured spike, else Running. Names are illustrative: the `s3-02` name does not make it an actual NAT gateway resource.

Other fixed seeds are used for savings history (4242 plus filter-dependent string lengths/provider count), security findings (20261026), security score history (20260401) and ID-hashed Kubernetes pods. Simulated request latency uses runtime `Math.random()` for a 300–800 ms delay; that does not change response numbers. Live activity/gauges are temporary simulation, not deterministic cost-history inputs.

## Filters, spend and period windows

Providers must match the selected list; environment and team must match unless set to `All`. Period selection changes cost windows, not the inventory membership.

Windows are `[start,end)` indexes. With `H=184`:

| App range value | Window | Days |
| --- | --- | --- |
| `7d` | Last seven observations, 6–12 October | 7 |
| `mtd` | 1–12 October | 12 |
| `q3` | 1 July–30 September 2026 | 92 |
| `custom` | Last 30 observations, 13 September–12 October | 30 |

The URL normalizer accepts `7d`, `mtd`, `q3`, `custom`; **`30d` is not a separate supported URL value**. `windowOf` uses its 30-day fallback for `custom`. There is no arbitrary date picker window in this calculation.

`resourceSpend = sum(daily[start:end])`; `totalSpend = sum(resourceSpend)` over selected resources. `previousOf` selects the immediately preceding equal-length window (`start=max(0,current.start-current.days)`, `end=current.start`). If a previous window reaches before stored history, missing history is not invented. Change percentage is `(current-previous)/previous*100`, or zero when previous is zero. The legacy `kpis.spend` numbers are rounded (percentage to one decimal); `overview.totalSpend.value` and `totals.total` retain aggregate precision.

Provider/service/team breakdowns use the same selected-window spend. **`groupBy=service` groups by resource category** (Compute, Kubernetes, Storage, Database, Serverless, Analytics); individual named services are used elsewhere, including emissions and recommendations. `tag` grouping uses `app:<app>`. Breakdown rows sort by descending spend. Explorer rows contain current, previous, percentage change, percentage share and sampled daily sparklines.

`Resources.periodTotal` matches Overview's period spend. `monthlyTotal` sums already-rounded per-resource `monthlyCost`; it is **not** the selected-period total, and can differ slightly from an unrounded 30-day daily sum.

## Forecast and confidence band

`forecastMonth` always uses the demo month regardless of the selected spend window:

```text
rate = mean(last 7 daily aggregate totals)
sd = sqrt(mean((each last-7 total - rate)^2))
remaining = calendar days in demo month - demo day of month
forecastEom = MTD spend + rate × remaining
```

October has 31 days and 19 days remain. Overview and both budget builders share this function. The Overview forecast KPI's comparison is the preceding calendar month's spend (September), not an equal-length forecast.

Trend projections extend 19 days for MTD and seven days for other ranges. At future step `k`, forecast daily spend is `rate` and the band is `[max(0,rate-1.96*sd*sqrt(k)), rate+1.96*sd*sqrt(k)]`. The last historical point anchors the forecast to its actual daily total. This is an illustrative band, not a calibrated statistical prediction interval. For a non-MTD historical window such as Q3, projected labels still start after `DEMO_TODAY`, not directly after that window's endpoint.

## Idle waste, rightsizing and recommendations

Idle waste is the sum of `monthlyCost` for all selected Idle resources; idle count is their count. An oversized resource is **Running**, CPU average **<25%**, category Compute, Database or Kubernetes.

```text
rightsizeSaving(resource) =
  monthlyCost             if status is Idle
  monthlyCost × 0.40      if oversized
  0                       otherwise
```

The resource drawer uses this exact function; CPU below 25% can also show a manual-review suggestion with zero saving when no automated rule applies.

### Six-category priority order

First matching rule wins; each resource appears in at most one category. Savings are **monthly**, even when a seven-day or quarter spend window is selected.

| Order | Category | Eligibility | Monthly saving | Effort / risk / confidence |
| --- | --- | --- | --- | --- |
| 1 | Idle resources | Idle, not Storage | `rightsizeSaving` = full monthly cost | Low / Low / 95 |
| 2 | Unused volumes and IPs | Idle Storage | Full monthly cost | Low / Low / 90 |
| 3 | Right-sizing | Oversized predicate above | `rightsizeSaving` = 40% | Medium / Medium / 80 |
| 4 | Scheduling | Non-Production Compute/Kubernetes | Cost × 12/24 × 0.70 | Low / Low / 85 |
| 5 | Reserved / Savings Plans | Compute/Kubernetes with CPU ≥40%, not matched earlier | Cost × 0.30 × 0.50 | Medium / Low / 75 |
| 6 | Storage tiering | Storage SKU Standard or Hot, not matched earlier | Cost × 0.35 × 0.40 | Low / Medium / 70 |

The RI branch does not explicitly test Production; non-production compute was already captured by Scheduling. Category 1 in the implementation accepts any non-Storage Idle resource, including categories beyond its narrower descriptive label. “Unused volumes and IPs” is an illustrative category for the seeded storage resources, not discovered IP/volume inventory.

Group by category + named service + team, sum raw savings, **round each group once**, then sort descending. Overview Savings opportunity and Recommendations total sum those rounded groups. Impact is High Impact for savings ≥2,000 USD with non-Low effort, or ≥4,000 USD; otherwise Quick Win.

The savings target is `round(total*0.60)`. Tracker months are May–October: seed `4242 + providers.length*7 + team.length + env.length`; earlier potential is `round(total*(0.75+random*0.35))`, realized is `round(potential*(0.20+random*0.35))`. October potential is total and realized is rounded 10%. This is fictional realized history, not measured action results. Overview's **previous savings** compares only prior Idle and oversized savings, not a replay of all six rules.

Statuses, assignments and 7/30-day snoozes are in-memory session overlays, not aggregate mutations. Snooze ends are 19 October / 11 November 2026, calculated from `DEMO_TODAY`.

## Anomalies and AI context

Per resource, compare the latest three-day daily mean against the preceding 14-day mean:

```text
baseline = mean(daily[H-17:H-3])
recent = mean(daily[H-3:H])
change = (recent / baseline - 1) × 100 (zero if baseline is zero)
include if change ≥ 50
reported change = round(change)
impact = round((recent - baseline) × 30)
```

Impact is an estimated **monthly** excess, not the three-day excess. Date detection searches from `end-7` toward `end-1` for the first amount ≥1.4× baseline. Results sort by impact. Dashboard comparison counts use the same detection shifted seven days earlier. Anomalies are anchored to the demo date and affected by inventory filters, **not** re-detected inside the selected spend period.

Alerts use exactly these IDs, amounts and percentages. `expected=round(baseline*3)`, `actual=round(recent*3)`; the 21-day chart has rounded daily actual values and a constant rounded ±15% baseline band. Probable causes are a fixed service mapping in `budgets.ts`, not causal discovery.

`buildAnomalyContext` uses the same filtered dashboard aggregate for AI totals and anomalies. The separate server route passes this demo context and an optional note to AI Gateway when configured; it does not switch context to a live backend through `VITE_API_BASE_URL`. Generated advice is not a scan or executed remediation.

## Unit costs

Active users and API requests are workspace-wide daily series in `src/data/usage.ts`, independent of cost and resource filter membership. Both have 184 observations ending on DEMO_TODAY, with separate Mulberry32 seeds (20261104 users, 20261105 requests), ±2% daily noise and growth `1.02^((index-183)/30)` (about 2% per month).

Users: base 2,250,000 × growth × weekday factor (1.04 Mon–Fri, 0.86 weekend) × noise, rounded to an integer. Requests: base 72,000,000 × growth × weekday factor (1.08 Mon–Fri, 0.78 weekend) × noise, rounded to an integer.

`costPerUser = selectedSpend / mean(activeUsers[start:end])`; `costPerRequest = selectedSpend / sum(apiRequests[start:end])`. Previous-period comparisons use exactly these formulas on `previousOf(window)`, dividing average users by actual stored days when history is truncated. Overview, Explorer and all report templates share `buildUnitEconomics`. Resource filters change only the numerator. Zero denominators return numeric zero in contracts; unavailable UI comparisons show `—`. Zero-resource selections show the same Reset filters empty state across all resource-dependent pages, including the simulator and Reports.

Deployment and session costs retain monthly-equivalent spend `selectedSpend / window.days * 30` divided by their unchanged fixed per-30-day volumes:

| Unit | Denominator |
| --- | --- |
| Deployment | 125,000 |
| Session | 13,600,000 |

Filters change spend but **do not scale the business-volume denominators**. Daily burn is selected spend divided by selected window days.

## CO2e and regional cost index

`carbonTons = costUsd * 2.2 kWh/USD * intensity(gCO2e/kWh) / 1,000,000`. Unknown intensity falls back to 300. Overview GreenOps and Sustainability call this shared formula.

| Region | gCO2e/kWh | Cost index |
| --- | --- | --- |
| us-east-1 | 379 | 1.00 |
| us-west-2 | 240 | 1.04 |
| eu-west-1 | 290 | 1.08 |
| eu-north-1 | 28 | 1.02 |
| westeurope | 268 | 1.05 |
| northeurope | 210 | 1.01 |
| europe-west1 | 112 | 1.03 |
| us-central1 | 410 | 0.98 |

Ratings: A <100, B <200, C <300, D otherwise. All table values are fixed demo assumptions. Unknown cost indices fall back to 1.

Provider, named service, region and daily carbon totals sum resource footprints over the selected window. `kgPerThousandUsd=totalTons*1000/(totalSpend/1000)`. A/B spend share is `AB-region spend/totalSpend*100` (**percentage, not 0–1**). Zero denominators yield zero.

Greener suggestions select the lowest-intensity destination represented for the **same provider in the full dataset**, strictly below source intensity; eligible workloads sort by current emissions, limited to three. `suggestedTons=currentTons*targetIntensity/sourceIntensity`, reduction is the difference, reduction percentage is `(1-target/source)*100`, cost change is `(targetCostIndex/sourceCostIndex-1)*100`. This suggestion's emissions calculation holds spend constant; unlike the simulator, it does not apply the cost ratio to emissions. It is not a region compatibility or migration feasibility check.

## Kubernetes derivation

Selected Kubernetes-category resources (EKS/AKS/GKE) become clusters; costs are rounded last-30-day resource costs regardless of selected period. `nodes=max(3,round(monthlyCost/350))`, `podsTotal=nodes*14`. Bad pods (Failed **or** Pending) total `round(podsTotal*rate)`, rate 4% for Warning, 1% otherwise. `podsHealthy+podsFailed=podsTotal`; the `podsFailed` field includes Pending pods.

An ID hash starts at 7 and folds characters with `seed=seed*31+charCode` as a signed integer. Mulberry32 drives Fisher–Yates shuffling to select bad pods, their 50/50 Failed/Pending split, and restarts (bad 3–11, healthy 0–2). Pods are allocated to namespaces by cumulative weight.

| Namespace | Cost weight | Efficiency factor |
| --- | --- | --- |
| prod-api | 35% | 1.15 |
| data | 25% | 1.00 |
| web | 20% | 0.90 |
| monitoring | 10% | 0.60 |
| system | 10% | 0.50 |

Namespace cost is cluster cost × weight, without per-namespace rounding; weights sum to 1. Efficiency is `min(100,round((cpuAvg+memAvg)/2*factor))`; <30 means over-provisioned. CPU/memory gauges and approximately eight-second activity feed are client-side **Demo telemetry**, not real polling. Dashboard's legacy `cluster`/`ticker` fields are fixed illustrative fixtures in `operations.ts`, distinct from the derived `/kubernetes` payload.

## Budgets and alerts

`spendToDate` is the selected-window total, even though its name suggests MTD. Forecast is shared `forecastMonth`, always October month-end. Default monthly amount is `round(Q3 selected-inventory spend / 3 * 1.05)`. Budget scopes apply global filters first, then All/provider/team/environment membership. Scope defaults and forecasts follow the same rules.

Budget amounts can be overridden in session-only demo forms. Progress tone: success below 80%, warning at ≥80%, critical at ≥100%. It is a presentation threshold, not a real alert dispatch. Creation/editing, rules and delivery channels do not create persistent server records or send messages.

## What-if simulator

All sliders are percentages of eligible spend. `baseline=Overview selected-period spend`, not a fixed monthly amount; `days=window.days`. The UI can label a projected monthly cost, but the underlying baseline/projection use the **selected period**.

```text
computeSpend = selected-period Compute + Kubernetes spend
RI saving = computeSpend × RI-slider/100 × 0.30
migrateSpend = selected-period spend in us-east-1
costRatio = eu-north-1 index / us-east-1 index = 1.02
moved = migrateSpend × migration-slider/100
migration saving = moved × (1 - costRatio)
rightsizeEligible = sum(rightsizeSaving(resource)) × days/30
rightsizing saving = rightsizeEligible × rightsizing-slider/100
total saving = RI saving + migration saving + rightsizing saving
projected = baseline - total saving
saving percentage = total saving / baseline × 100 (zero if baseline is zero)
carbon reduction tons = moved × 2.2 × (379 - 28 × costRatio) / 1,000,000
```

The current migration target costs 2% more in the model, so migration saving is negative. Levers add independently without deduplicating overlapping eligible workloads; these are estimates, not an optimization solver or executed changes.

## Security findings, score and compliance

Seed **20261026** processes full master inventory before filtering. Each eligible resource/rule pair draws once; a finding is emitted if draw < rate. If no draw selects a resource for a rule, the eligible resource with the lowest draw is selected, guaranteeing at least one per eligible rule. Rates are probabilities, not exact quotas. Detected dates consume the same generator and are 0–89 days before demo today; call order therefore matters.

| Rule | Eligible services / account | Selection | Severity |
| --- | --- | --- | --- |
| `ssh-open` | EC2, Azure VM, GCP Compute | 6% plus fallback | Critical |
| `public-bucket` | S3, Blob | 5% plus fallback | High |
| `unencrypted-db` | RDS, SQL DB | 8% plus fallback | High |
| `outdated-k8s` | EKS, AKS, GKE | 20% plus fallback | Low |
| `iam-overpermissive` | Account-level | One per provider (3 total) | Medium |
| `unused-keys` | Account-level | One per provider (3 total) | Medium |
| `no-mfa-root` | Account-level | Azure only (1 total) | Critical |

Resource findings refer to existing IDs; account findings have `resourceId=null` and follow provider filters only, not environment/team. Findings start Open. Open and In progress count against score; Resolved and Accepted risk do not.

`score=max(0,100-(8*Critical + 4*High + 1.5*Medium + 0.5*Low))` for open findings. `fmtScore` always displays one decimal. May–October trend is seeded with 20260401: monthly drift `round((random-0.35)*14)` is accumulated backward from current score and clamped 0–100; October equals computed score, not a historical measurement.

Framework lists: CIS 10 controls, SOC 2 10, ISO 27001 11, GDPR 10. Each control's authoritative `rules` array is in `COMPLIANCE_FRAMEWORKS` in `security.ts`; labels do not imply additional checks. Mapped control IDs:

| Framework | Control → rule(s); all other listed controls are not assessed |
| --- | --- |
| CIS | cis-1.5 → no-mfa-root; cis-1.12 → unused-keys; cis-2.2 and cis-3.1 → unencrypted-db; cis-4.1 → ssh-open |
| SOC 2 | cc6.1 → no-mfa-root; cc6.6 → ssh-open; cc6.7 → public-bucket; a1.2 and c1.1 → unencrypted-db |
| ISO 27001 | a5.15 → iam-overpermissive; a5.17 → unused-keys; a8.2 → no-mfa-root; a8.24 → unencrypted-db |
| GDPR | art5.1f → public-bucket; art25 and art32.1a → unencrypted-db; art32.1b → ssh-open; art32.1d → outdated-k8s |

No mapped rule means **not assessed**, excluded from pass percentage. A mapped control fails if any mapped finding is Open/In progress; otherwise passes. `passed+failed+notAssessed=total`, `assessed=passed+failed`, `passPct=passed/assessed*100` (zero when none assessed). The client computes results against session status overlays; API controls themselves have no status field. These mappings are simplified examples, not a compliance audit.

## Currency conversion

All cost data/aggregates stay USD. Fixed units per USD: **USD 1, EUR 0.92, SEK 10.55, GBP 0.79**. Convert once at display time: `converted=usd*rate`; never aggregate rounded display amounts. Unknown/case-mismatched currency values normalize to USD. `cur` is a display-only URL parameter and is not sent to the read API.

`fmtMoney` uses `Intl.NumberFormat('en-US')`, default zero decimals, explicit currency, and optional sign; negatives use a Unicode minus. Compact formatting uses one maximum decimal. Report CSV/print output formats money for display; JSON retains USD numeric values with display-currency metadata rather than rewriting the underlying totals. Rates are not live FX.

## Invariants checked by tests

The suite is an implementation regression check, not proof of real-world correctness. Numeric comparisons use precision tolerances where sums can differ in floating-point order.

| Invariant | Test file(s) in `src/test` |
| --- | --- |
| Provider/service-category/team totals and Explorer grouping equal Overview spend for matching filters | `aggregate.test.ts` |
| Resources inventory count and period total equal dashboard; monthly costs sum to monthlyTotal | `resources.test.ts`, `aggregate.test.ts` |
| Recommendation rounded group total equals Overview Savings opportunity; first-match rules avoid double counting | `savings-budgets.test.ts`, `aggregate.test.ts` |
| Drawer rightsizing uses the same saving function as recommendations | `resources.test.ts` |
| Carbon sums per region/provider/service equal total and Overview GreenOps; destination intensity is strictly lower | `aggregate.test.ts` |
| Kubernetes cluster count/cost, node/pod formulas, namespace cost sum, healthy+bad totals and determinism | `platform-ops.test.ts` |
| Budget selected-period spend and forecast equal Overview; default amount equals rounded Q3/3 ×1.05; 80/100 tone boundaries | `platform-ops.test.ts`, `savings-budgets.test.ts`, `audit-fixes.test.tsx` |
| Scenario baseline equals Overview, no-op has zero saving, and 50% RI applies 30% to shifted compute spend (migration/rightsizing output formulas are documented from code, not independently asserted here) | `platform-ops.test.ts` |
| AI context total and anomaly count/amount/change match Overview across filter combinations | `anomaly-context.test.ts` |
| Security severity totals, weighted score, Critical resolution +8, valid references, determinism and per-rule coverage | `security.test.ts` |
| Compliance passed+failed+not-assessed equals control count; unmapped controls are not assessed | `security.test.ts`, `demo-date.test.ts` |
| Demo date/history endpoint, no future history, fixed 7/30-day snooze dates | `demo-date.test.ts` |
| Report totals reconcile; integration tests are format-only; key strings are fake | `reports-integrations.test.ts` |
| USD conversion rates, currency fallback/sign formatting and active currency store | `currency.test.ts` |
| Reduced-motion mapping/session switch, error-boundary isolation and removal of obsolete budget/date constants | `audit-fixes.test.tsx` |

## Verification scope

Documentation was checked against source and the full suite passed **151 tests across 12 files** on 3 November 2026. The automatic build log reported `build OK`; no manual build or separate typecheck was run in this documentation task. No application source, data, styling, routes or tests were modified. A compatible production HTTP backend, successful Gateway generation, secret-rejection guarantees and real cloud/delivery behavior were not verified; the latter cloud/delivery features are not built.