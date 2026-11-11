# Roadmap

- [x] Restore previous visual design on request; undo all Sand and forest v3 changes without altering features or values.

- [x] Add Model Insights detection, forecast, computed registry and planned pipeline through typed APIs; preserve existing totals.
- [x] Document demo formulas, endpoints and planned production architecture; test deterministic metrics, gate, drift and session promotion.
- [x] Verify all tabs at 375/768/1024/1440px, promotion/rollback, drawer focus return and 240 passing tests; automatic typecheck/build OK. Loading/error/empty states implemented; exhaustive forced-state browser checks not completed. Fixed development-only React refresh initialization and missing tooltip provider. Production ML.NET/pipeline and live endpoints remain planned.

- [x] Add Commitments, Teams/showback and Notifications through typed APIs and master-data builders, preserving totals.
- [x] Add navigation, team detail URLs, chart tables, verified CSV export and shared session-only read state; bell/center count agrees.
- [x] Document three read contracts and rules; all 226 tests pass. Four new views × four widths × three tabs checked with no overflow/console errors; keyboard, source links, filter preservation and loading/error/retry/empty/reset verified. Automatic build OK. Read endpoints follow existing demo/future C# API pattern, not hosted handlers.

- [x] Add filter-derived Fern score and daily briefing through typed API builders, preserving existing totals.
- [x] Document both read endpoints and deterministic formulas; 18 new aggregate reconciliation and edge-case tests.
- [x] All 212 tests pass; Overview and drawer checked at 375/768/1024/1440px, links and loading/error/retry/empty states verified, no console errors or overflow. Default score 40 with five insights. Read paths follow existing demo/C# API pattern; no hosted API handlers added.

- [x] Motion v2: shared 200–700ms Framer presets, exact odometer numbers/currency changes, reusable spring ProgressRing and reduced-motion/hidden-tab guardrails.
- [x] First-session skippable brand intro, Overview scroll/pointer hero motion, viewport reveals and shared card/resource/recommendation drawer transitions with focus return.
- [x] Masked chart reveals, baseline-staggered bars, sweeping donut segments, series dimming, controls, palette and capped list layout motion; existing Sonner/Radix overlay transitions retained.
- [x] 194 tests passed; 44 page/size checks at 375/768/1024/1440px plus focused intro/native-transition/scroll/donut/drawer checks; zero CLS, overflow or console errors; automatic build OK.

- [x] Visual design v2: quieter tinted cards and 32px rhythm, centered 1280px workspace, consistent icons and AA secondary text.
- [x] Add a data-driven hero strip to every page's first tab; simplify charts, tables, controls, badges and loading/empty states.
- [x] Add session-only Appearance > Theme (Light default / warm graphite Dark) and replace remaining hard-coded component colors with tokens.
- [x] 189 tests passed; 88 page/theme/size combinations checked at 375/768/1024/1440px with no overflow, clipped labels or console errors; measured text/status contrast passes AA and automatic build is OK.

- [x] Navigation/findability: aggregate badges, session pins/recent/collapsible groups, grouped fuzzy palette/actions, drill-down return, glossary/metric help, compact filters and empty-state guidance; 189 tests passed, all eleven pages checked at 375/768/1024/1440, keyboard/focus/CSV/resource drill-down verified, automatic build OK. Existing Explorer conditional-hook error fixed during end-to-end checks; no data or route changes.

- [x] Sub-tab restructure (2026-11-06): shared PageTabs (?tab= URL, pill indicator, keyboard nav), tabs on all 11 pages, progressive disclosure (Show all), deep links page›tab, palette tab entries, tests + responsive checks. No data/API/theme changes.

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
