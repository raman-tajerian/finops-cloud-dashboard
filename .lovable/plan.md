# Recommendations, Budgets & Alerts, consistency tests

Theme and existing features stay as they are. All figures come from the master dataset through the typed API client. New endpoints are documented in docs/API_CONTRACT.md.

## 1. Recommendations page

**Data (one shared savings catalog)**
- Extend `buildRecommendations` into a categorized catalog. Each resource is counted in at most one category, so savings are never counted twice. Categories are checked in this order:

| Category | Rule (deterministic) | Effort / Risk / Confidence |
| --- | --- | --- |
| Idle resources | status Idle (compute/db/k8s) → `rightsizeSaving` (100%) | Low / Low / 95% |
| Unused volumes and IPs | Idle Storage resources → 100% of monthly cost | Low / Low / 90% |
| Right-sizing | oversized → `rightsizeSaving` (40%) | Medium / Medium / 80% |
| Scheduling | non-production compute → cost × 12/24 × 70% | Low / Low / 85% |
| Reserved / Savings Plans | production compute + k8s, CPU ≥ 40% → cost × 30% × 50% coverage | Medium / Low / 75% |
| Storage tiering | Standard/Hot storage → cost × 35% × 40% cold share | Low / Medium / 70% |

- Items are grouped by category + service + team, which gives at least 12 items on the unfiltered dataset (a test checks this).
- **Decision:** Overview's "Savings opportunity" will use the same catalog total, so the two pages always match. The number on Overview will go up, because it now includes the new categories.

**UI**
- Summary header: open savings, savings marked Done this session, and a progress bar toward the target (default 60% of total potential, explained in the header).
- Filters for category, effort, risk and status, plus sort by savings. All of these are stored in the URL.
- Each item shows title, affected resources (clicking opens Resources filtered to those resources), savings, effort, risk, confidence and status.
- Actions: Review opens a drawer with details, the affected resources and a Terraform/CLI snippet with a copy button. You can also mark an item In progress, assign it to a team, snooze it, or ignore it with a reason (in a dialog). Statuses last for the session only and are labelled "Demo".
- Savings tracker: realized vs potential savings for the last 6 months. Realized values are seeded and labelled "Demo". The current month's potential equals open savings. The chart has a "View as table" toggle.
- Skeleton, empty and error states.
- The existing SavingsFeed on Overview keeps working and reads from the same catalog.

## 2. Budgets & Alerts page
The budget forecast, AI analyst and simulator stay as they are.
- **Budget cards:** name, scope (provider, team or environment), amount, spent to date, forecast, and a progress bar that changes color at 80% and 100%. Spent and forecast use the same `forecastMonth` and totals as Overview for the scope. Default cards are All, AWS, Azure, Platform team and Production.
- **Create budget dialog:** name, scope, amount, period (monthly/quarterly), thresholds (50/80/100), and channels (Email/Slack/Teams). Every field is validated with inline errors. New budgets last for the session and are labelled "Demo".
- **Alert rules table:** an enable toggle, edit, and delete with confirmation.
- **Anomalies section:** built from the same anomalies as Overview. Columns: date, service, expected cost (14-day baseline), actual, % deviation, probable cause (a fixed mapping per service) and status (New/Investigating/Resolved, session only). Clicking a row opens a drawer with a chart of the expected band vs the actual spike, plus "View as table".
- Skeleton, empty and error states.

## 3. Tests (vitest)
Each test runs for several filter combinations:
- Open savings on Recommendations equals Overview "Savings opportunity".
- The sum per category equals the total, and no item has negative savings.
- A right-sizing item's savings equal the sum of `rightsizeSaving` for its affected resources.
- The unfiltered dataset gives at least 12 items.
- Budget spent for scope "All" equals Overview Total spend, and the anomaly count on Budgets equals Overview Active anomalies.
- A budget with a zero, negative or empty amount is rejected.

## 4. Responsive check
Check 375, 768, 1024 and 1440 px on Recommendations and Budgets: no horizontal overflow, no clipped labels, no console errors.

## Technical details
- `src/data/savings.ts`: `buildSavingsCatalog(all, f)` and the category metadata. `buildDashboard` sums the catalog total for the overview savings KPI.
- `src/data/budgets.ts`: `buildBudgetScopes`, `buildAnomalyRows` (sharing `detectAnomalies`), and `validateBudget` using a zod schema.
- New types in `src/types/finops.ts`. New `api.getSavings` and `api.getAlerts` with filter-keyed query hooks.
- Recommendation URL search params: `cat, effort, risk, status, sort`. Resources page accepts an `ids` search param for the "affected resources" link.
- Session state (statuses, budgets, rules) lives in a small React context, not in storage.
