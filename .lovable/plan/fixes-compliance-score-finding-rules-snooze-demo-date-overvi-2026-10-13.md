# Fixes: compliance, score, finding rules, snooze, demo date, Overview table

Visual theme, routes, URL params and other features stay unchanged. All data keeps going through /src/data and the typed API client.

## 1. Compliance "Not assessed"
- A control with no mapped finding rule gets status "Not assessed" with a neutral gray badge.
- Pass percentage and progress bar count only assessed controls.
- Each card shows "X of Y assessed controls passing (Z not assessed)". The "Illustrative" label stays.

## 2. Score with one decimal
- One shared formatter (`fmtScore`, e.g. 65.5 / 70.0) used for the ring, trend chart and its table, tooltips, drawer and aria labels.

## 3. Every rule produces a finding
- Today the unencrypted-database rule produces 0 findings by default. Selection rates get tuned (the database rate goes up first) until each rule with eligible resources has at least 1 finding.
- Targets kept: score 60–75 and 12–18 open findings. The final numbers go in the summary.

## 4. Snooze 7 or 30 days
- Snooze opens a small choice: 7 days / 30 days.
- The item shows "Snoozed until <date>" (calculated from DEMO_TODAY) plus a Reopen button and a "Demo" label. Kept in session state only.

## 5. Demo date
- Add `DEMO_TODAY = 2026-10-12` in /src/data. The daily history ends there (today it ends 25 Oct 2026, which is after "today"). It replaces `DATA_END_DATE` everywhere: MTD, 7d, forecasts, anomaly windows, first-detected dates and snooze dates.
- Footer text: "Demo data as of 12 Oct 2026".
- docs/API_CONTRACT.md documents the as-of date.
- Expected side effect: totals and anomaly figures move because the windows move. Cross-page consistency still holds because every page uses the same functions.

## 6. Overview table
- Replace the old simple resource table with a "Top 10 resources by cost" card. It uses the same data/functions as the Resources page (filterResources + cost over the active range).
- Add a "View all resources" link to /resources that keeps the current global filters.

## 7. Tests and checks
- Update existing tests to the new date and keep every invariant: equal totals across pages, rightsizing = recommendation savings, CO2e sums, determinism.
- New tests:
  - no data point after DEMO_TODAY
  - pass + fail + not assessed = number of controls
  - every finding rule with eligible resources has at least 1 finding by default
  - default score is 60–75 with 12–18 open findings
- Playwright check of every page at 375/768/1024/1440 px for overflow, clipped labels and console errors.

## Technical details
- `src/data/resources.ts`: `DEMO_TODAY` exported, with `DATA_END_DATE` kept as an alias to avoid churn. The seeded history is regenerated relative to the new end date.
- `complianceResult` returns `status: "pass" | "fail" | "not-assessed"` per control and adds `notAssessed` to its result. `passed + failed + notAssessed = total`.
- `fmtScore` lives in src/lib/utils.ts or the security module and is shared by all score displays.
- Session store: the recommendation status gains `snoozedUntil` (an ISO date string).
- Overview: `ResourceTable` from Widgets is replaced by a new `TopResourcesCard`. The link uses the root search params so the filters carry over.
