# Roadmap

- [ ] Sub-tab restructure (2026-11-06): shared PageTabs (?tab= URL, pill indicator, keyboard nav), tabs on all 11 pages, progressive disclosure (Show all), deep links page›tab, palette tab entries, tests + responsive checks. No data/API/theme changes.

- [x] Documentation refresh (4 November): README, demo formulas/invariants, all 14 API functions and factual demo limitations; markdown-only changes, 172 tests passed, automatic build OK. Manual typecheck/build not run under workspace restrictions.

- [x] Realism/robustness: independent seeded usage histories and shared unit economics; existing totals preserved.
- [x] Consistent zero-resource empty state and safe aggregate edge cases; all empty filter combinations tested.
- [x] Mobile tables, 40px controls/pods, scrolling overlays with reachable close controls, navigation and topology; 172 tests and all eleven pages at 375/768/1024/1440 pass. Manual typechecks not run under workspace restrictions; automatic build OK.

- [x] Documentation-only brief: README and DEMO_DATA completed, all 14 API functions reconciled, 151 tests passed, automatic build OK; separate typecheck not run (manual checks disabled by workspace rules).

- [x] Density/currency/shortcuts/onboarding/titles/motion brief (2026-10-20):
  - [x] Shared table density applied to all data tables
  - [x] Currency selector (USD/EUR/SEK/GBP) with ?cur= URL param, shared formatter, demo rates
  - [x] Keyboard shortcuts (G-chords, /, ?, Esc) + shortcuts dialog + palette hints
  - [x] Onboarding checklist on Overview
  - [x] Per-route titles in "Name · Fern" style
  - [x] Shared framer-motion layer + route transitions


- [x] Rename product and demo workspace everywhere, update metadata and documentation, verify no old names remain, and run all tests without changing design or behavior.

- [x] Apply the selected organic dark dashboard direction.
- [x] Add budget forecasting controls and indicators.
- [x] Add an actionable savings workflow.
- [x] Add live infrastructure and Kubernetes status, utilization, and deployment logs.
- [x] Shift the canvas to black-green and add restrained glass surfaces without white sections.
- [x] Validate desktop and mobile presentation and interactions.
- [x] Replace the dark glass theme with the approved Apple/Stripe light visual system.
- [x] Add the selected Interactive FinOps Hub motion and interaction system.- [x] Add AI anomaly analyst (causes + prioritized actions).
- [x] Phase 1: foundation — grouped nav + routes, command palette, notifications, breadcrumbs, API client + contract.
- [x] Foundation follow-up: URL filters, query-backed cards, states, table views, coming-soon pages.
- [x] Phase 2: Overview, Cost Explorer, Resources, Sustainability pages.
- [x] Phase 3: Recommendations, Kubernetes, Security, Budgets, Scenario simulator.
- [x] Phase 4: Reports, Integrations, Settings, tests.
- [x] Keyboard shortcuts (completed in the shared-workspace brief)
- [x] Phase 2a: master dataset, error boundaries, one-row filter bar, Overview KPIs/trend/movers, Cost Explorer.
- [x] Phase 2b: Resources page (advanced table, bulk actions, detail drawer, URL state).
- [x] Sustainability page.

- [x] Security & Compliance page (findings, score, compliance, table + drawer).
- [x] Audit fixes (2026-11-02): API contract rewritten to match src/lib/api.ts (+dashboard/sustainability DTOs), budget spendToDate = period total, 300_000 removed, DATA_END_DATE alias removed, warning text AA contrast, Reduce motion switch, scaleX progress bars, CardBoundary on six workspace routes, tests.
