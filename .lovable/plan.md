# Finish the Kubernetes / Budget / Simulator brief

This brief matches the work delivered in the previous turn. That turn already added:
- Kubernetes page: cluster selector, nodes, pod health, namespace chart and table, pod grid with drawer, "Demo telemetry" label, 8 s feed.
- Budget card: shared forecast, budget input with a default of 105% of last quarter ÷ 3, and an 80%/100% colour bar.
- Simulator: baseline equals Overview total spend, three documented levers, before/after chart, Assumptions panel.
- 16 new tests (51 total passing) and the API contract entries.

Only the leftovers below remain.

## 1. Remove the last hard-coded numbers
- Delete the unused old `simulateSavings()` helper. It holds the old $248,730 / $33,912 constants, and nothing calls it any more.
- The "$51,270 remaining in Q4" note on the older resource-table KPI strip becomes a computed value: savings opportunity from the same recommendations aggregate.
- Search the codebase once more for any remaining fixed baselines.

## 2. "View as table" on every chart
- Add a table toggle to the pod status grid, listing pod, namespace, status and restarts.
- Check the Kubernetes empty state wording, and confirm the skeleton and error states on all three new cards.

## 3. Budget note in the UI
- Keep the documented default rule visible under the input. It already reads "105% of last quarter's spend ÷ 3". Make sure the badge and the bar use the same rounding.

## 4. Tests and checks
- Keep the existing 16 tests, which cover every rule in the brief.
- Add one test: with no sliders moved, the simulator shows no leftover fixed baseline.
- Run all tests.
- Playwright at 375 / 768 / 1024 / 1440 px on Kubernetes, Budgets and Overview: no overflow, no clipped labels, zero console errors.
- Final summary of what changed and what was skipped.
