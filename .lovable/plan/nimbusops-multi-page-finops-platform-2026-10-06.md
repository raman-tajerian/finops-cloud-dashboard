# NimbusOps: multi-page FinOps platform

The brief covers more than 11 new pages plus a full data layer, so the work is split into four phases. Each phase ships working and is checked on desktop and mobile before the next one starts. The dark matte look, all existing features and the AI anomaly analyst stay.

## Phase 1: Foundation and design fixes (Part A + B1–B2 + C1)
- Tighten design tokens to the brief's values (#0B0C0E background, #16181D cards, #262930 borders, #9CA3AF text). Use one card style and one type scale, and give each provider a fixed color (AWS amber, Azure blue, GCP emerald).
- Shared building blocks: KpiCard, ChartCard, DataTable, DetailDrawer, StatusBadge (icon plus text), EmptyState, ErrorState (with Retry) and skeletons.
- Sidebar that collapses to icons, with groups (Analyze / Optimize / Govern / Admin). It becomes a drawer on mobile. Also: workspace switcher "Acme Corp – Production", user menu, breadcrumbs, a notification bell with unread count and "mark all read", and a Cmd/Ctrl+K command palette.
- Global filters kept in the page address: date range including a custom calendar, providers, environment, team. They show as removable chips with "Reset all", and collapse into a bottom sheet on mobile.
- Data layer: typed mock data with seeded random values in `src/data`, types in `src/types`, and an API client in `src/lib/api.ts`. The client uses mock data with a 300–800 ms delay, or calls the real API when `VITE_API_BASE_URL` is set. All fetching goes through TanStack Query. Endpoints are documented in `docs/API_CONTRACT.md`, and a "Demo data / Live" label is shown.
- Accessibility: visible focus ring, aria labels, aria-live on numbers, a "View as table" option on charts, 40px touch targets, and reduced-motion support.

## Phase 2: Analyze pages (B3, B4, B5, B10)
- Overview: 8 KPIs that fit in the first screen at 1440x900, and a trend chart with forecast band and clickable anomaly markers. Cost distribution switches between donut, stacked bar and treemap. Plus top movers, top 3 recommendations, a Kubernetes summary and the onboarding checklist. Existing cards (3D map, simulator preview, AI analyst) stay.
- Cost Explorer: group-by and chart-type selectors, compare to previous period, a sortable table with a totals row, saved views and CSV/JSON export.
- Resources: 60+ mock resources in an advanced table. It has sorting, a column menu, density, pagination, multi-select with bulk actions, debounced search, and a sticky first column on mobile. Clicking a row opens a drawer with 5 tabs and a right-sizing suggestion.
- Sustainability: CO2e trend, region ranking, a greener-region suggestion, and a clear note that figures are estimates.

## Phase 3: Optimize and govern pages (B6–B9, B11)
- Recommendations: 12+ items in 6 categories, with filters and sorting. Actions: Review drawer with copyable snippet, Auto-remediate with a confirmation, Assign, Snooze, and Ignore with a reason. Includes a savings tracker chart and progress toward a target.
- Kubernetes: cluster selector, gauges, cost per namespace, a namespace table that flags over-provisioned workloads, a live feed that adds an event every 8 seconds, and a pod grid with a detail drawer.
- Security & Compliance: score ring, findings table with drawer, and CIS / SOC 2 / ISO 27001 / GDPR cards.
- Budgets & Alerts: budget cards that change color at 80% and 100%, a create-budget form with validation, an alert rules table, and an anomaly list with an expected-band chart.
- Scenario simulator: 5 levers, payback period, a before/after chart, an assumptions panel, and up to 3 saved scenarios compared side by side.

## Phase 4: Admin and polish (B12–B14, C2–C4)
- Reports: templates, a generate flow that produces real CSV/JSON downloads and a printed PDF, report history, and schedules.
- Integrations: 10 cards and a mock connect flow with "Test connection" (no real secrets), plus sync history.
- Settings: 7 tabs, including currency and number format applied across the app, and mock API keys shown masked.
- Polish: keyboard shortcuts (G+O / G+C / G+R, /, ?), footer, an error boundary per page, title and description per page, a README section "Demo vs live data", and unit tests for formatting and the simulator.

## Technical details
- TanStack Router file routes (one per page) are code-split automatically. The 3D map and PDF code load only when needed. Tables over 100 rows are virtualized.
- Numbers come from one shared source, so the same totals appear on every page.
- What I adapt: "React.lazy" is covered by the router's built-in route splitting. The 3D view remains the current lightweight version; React Three Fiber is only added if you want it.

Phase 1 starts as soon as you approve. Each phase is a separate step you will see in the app.
