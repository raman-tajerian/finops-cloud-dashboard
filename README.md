# Fern

Multi-cloud cost and sustainability dashboard

Fern is a multi-cloud workspace for exploring cloud spend, resource usage and estimated sustainability impact. Its demo workspace, **Fjord Labs**, represents a fictional customer, not a connected cloud account. The workspace pages share typed responses and a seeded resource dataset so related totals reconcile for the same filters. The frontend demonstrates FinOps workflows while a production data backend remains planned.

**Live demo:** https://finops-cloud-dashboard.lovable.app

## Demo vs live data

In default demo mode, figures come from a seeded, simulated dataset of **61 fictional resources**, with **184 days** of cost history ending on **12 October 2026** (`DEMO_TODAY`). Historical data never extends beyond that date; projections and snooze end dates can extend into the future. Some illustrative histories and operational widgets use additional fixed seeds or temporary client-side simulation rather than measured telemetry.

- **CO2e and greener regions:** estimates using cost, a fixed kWh-per-dollar factor, illustrative carbon intensities and regional cost indices; not measured emissions or cloud pricing quotes.
- **Active users and API requests:** separate seeded daily series with weekday seasonality, slow growth and noise, independent of cost. Unit costs divide selected spend by average daily users or total period requests, not measured customer traffic.
- **Utilization and activity:** CPU/memory averages and curves, pod health, live gauges and activity feeds are simulated, not monitored infrastructure.
- **Security and compliance:** seeded findings and simplified control mappings are examples, not a security scan, audit or certification.
- **Integrations:** connection states and sync histories are fictional. “Test connection” checks identifier format only; it does not contact a provider.
- **Reports and members:** downloads are real browser downloads, but report sending, schedules, notifications and member invitations are not delivered or executed.
- **API keys:** Settings creates fake demonstration strings, not usable credentials. Team members, role changes and tag mappings are session-only examples, not authentication or authorization.
- **Model Insights:** a small deterministic TypeScript demo model, synthetic evaluation metrics, simulated latency telemetry and seeded run history; no real training or deployment. Model promotion is session-only.
- **Currency:** USD is the base; EUR, SEK and GBP use fixed demo exchange rates, not live FX.
- **Actions:** scans, optimization, stopping/tagging resources, resolving findings, budgets and alert rules demonstrate interactions only. Nothing is actually scanned, connected, remediated or sent to cloud accounts or report recipients.

The demo connection/key workflows do not connect to providers or persist credentials. Integration fields are intended for public identifiers, and Settings generates fake keys rather than accepting a real credential. **Never paste secrets into any text field:** inputs accept arbitrary text and do not guarantee secret detection or rejection; other form values can be retained in session state. The AI analyst is a separate exception to offline simulation: when configured, it sends simulated anomaly context and your optional note to Lovable AI Gateway and streams a generated analysis. Do not put confidential data in that note; successful live AI access has not been verified by this documentation update.

## Features

### Overview
- Spend, forecast, burn, savings, waste, anomalies and unit-cost KPIs with sparklines; provider trend and forecast band; allocation and movers.
- Top 10 resources by cost, resource details and filtered link to Resources; operational, GreenOps and what-if widgets; a simplified 2D topology map with drag rotation; demo scan, budget alert and export controls.

### Cost Explorer
- Service-category, provider, region, team, environment and app-tag grouping; area, bar and line views with previous-period comparison.
- Tabular views, URL-encoded saved views and CSV/JSON exports.
- Cost per active user and API request, using the same period formulas and previous-period values as Overview and report responses.

### Resources
- Debounced search, status/service filters, sorting, column visibility, pagination and shared density; URL-backed table state and selected resource.
- Multi-select demo actions and CSV export; Overview, Cost, Utilization, Tags and Activity drawer tabs with shared rightsizing rules.

### Recommendations
- Six savings categories with search/filter/sort, resource details, effort, risk, confidence and savings tracker.
- Session-only assign/implement/ignore/reopen actions and 7/30-day snooze dates calculated from the fixed demo date; no cloud changes are executed.

### Model Insights
- Detection | Forecast | Models | Pipeline tabs, with global filters, currency, chart tables and retryable states.
- Deterministic browser demo detectors, a 14-day forecast/backtest, four genuinely different configurations, synthetic precision/recall/F1 and session-only promotion/rollback.
- A planned pipeline diagram with seeded demo run history, computed quality gates and demo telemetry/drift. Existing rule-based Active anomalies are unchanged.

### Kubernetes
- Filtered EKS/AKS/GKE clusters, node and pod totals, namespace costs/efficiency, sortable namespace table and pod grid/drawer.
- Table views and explicitly simulated telemetry/activity.

### Budgets and Alerts
- Scope-based demo budgets, validated creation/editing, threshold/channel choices, selected-period spend and shared end-of-month forecast.
- Alert rules, anomaly details/status actions and streaming AI anomaly analysis when the server is configured.

### Sustainability
- Estimated emissions trend, intensity and greener-spend KPIs, provider/service breakdowns and sortable region ranking.
- Up to three lower-intensity, same-provider region suggestions with estimated cost changes and calculation notes.

### Security and Compliance
- Seeded resource/account findings with URL-backed search/filter/sort, details, remediation steps and illustrative snippets.
- Weighted score with one-decimal display and demo trend; CIS, SOC 2, ISO 27001 and GDPR mappings with assessed/not-assessed controls and session-only finding statuses.

### Reports
- Executive, team, savings and security templates with filtered aggregate totals and section previews.
- CSV/JSON downloads and print-to-PDF workflow; past reports and session-only schedules, with no report delivery. Executive reports include current and previous unit-cost rows; every template response includes shared unit economics.

### Integrations
- Fictional cloud and tooling connection cards, read-only permission lists and identifier-format checks.
- Session connection overrides and sortable seeded sync history.

### Settings
- Profile/workspace forms, fictional team member roles/invitations, tag mappings and notification preferences.
- Fake API-key creation/copy/revocation; density, display currency and Reduce motion preferences.

### Shared workspace
- Global period/provider/environment/team filters stored in the URL, removable chips, reset and mobile filter sheet; notifications and breadcrumbs.
- Command palette (`Ctrl/Cmd+K` or `/`), G-chord navigation, `?` shortcut dialog and Escape dismissal.
- URL display currency (USD/EUR/SEK/GBP); shared session table density; reduced-motion/system preference support; dismissible onboarding checklist.
- Loading skeletons, empty states, retryable errors, error boundaries and chart/table alternatives.
- One “No resources match these filters” / “Reset filters” state for resource-dependent pages, including Reports and the simulator. Settings and Integrations remain available; unavailable Overview comparisons and zero-budget ratios show “—”.

## MLOps

Today: browser demo model, registry and pipeline views driven by seeded data; metrics computed on six synthetic service series. “Production” means the active demo configuration. No claim of accuracy on real data. Planned: ML.NET in the C# backend, GitHub Actions training/evaluation, versioned artifacts, quality gates, Docker packaging, Terraform deployment, rollback and monitoring. See [MLOPS.md](docs/MLOPS.md).

## Page tabs

- Model Insights: Detection | Forecast | Models | Pipeline.
- Commitments: Coverage | Commitments | Recommendations.
- Teams: Overview | Resources | Budgets, including independently addressable team details.
- Notifications: All | Unread | Read.
- Existing pages retain their shared URL-backed tab registry in `src/components/finops/PageTabs.tsx`.

## Tech stack

From `package.json` (declared dependency ranges, not a claim about resolved lockfile versions):

- React / React DOM `^19.2.0`, TypeScript `^5.8.3`, Vite `8.1.5`.
- TanStack Start `1.168.60`, Router `1.170.41`, Query `^5.101.1`; Nitro `3.0.260603-beta` and Lovable's TanStack Vite configuration.
- Tailwind CSS `^4.2.1`, Radix UI-based controls, Lucide React `^1.49.0`, Recharts `^3.10.1`, Framer Motion `^14.0.0`.
- Zod `^3.25.76`, React Hook Form `^7.71.2`, cmdk and Sonner.
- AI SDK `ai ^7.0.127` and `@ai-sdk/openai ^4.0.83` for the existing Gateway stream.
- Vitest `^4.1.10`, Testing Library, jsdom, ESLint and Prettier; TypeScript native preview for `tsgo`.

## Architecture

`src/types/finops.ts` defines resource and response contracts. The typed client in `src/lib/api.ts` exposes 23 read functions, consumed through TanStack Query in `src/lib/queries.tsx`; query keys include relevant global filters. With no `VITE_API_BASE_URL`, each request waits a simulated 300–800 ms and calls pure response builders in `src/data` over the master dataset (Settings uses a fixed fixture builder). Temporary demo edits live in a shared in-memory session store, separate from aggregate data.

Independent daily user/request histories live in `src/data/usage.ts`. `buildUnitEconomics` supplies Overview, Explorer and Reports without changing resource costs or financial totals. The shared Shell uses the filtered dashboard response to gate zero-resource pages; report generation calls the same typed client on demand.

Setting `VITE_API_BASE_URL` switches those reads to `GET {base}/api/v1/...`. This switches the **read transport**, not demo actions into real writes; the client currently has no write API or authentication headers, and JSON is typed but not runtime-validated. The independent `/api/anomaly-analysis` server route still builds its context from the demo master dataset, even when the read client uses a live base URL. Presentation currency stays client-side and API amounts remain USD.

- [API functions, paths and response contracts](docs/API_CONTRACT.md)
- [Demo dataset, formulas, limitations and tested invariants](docs/DEMO_DATA.md)

## Run locally

Install Bun, then:

```sh
git clone https://github.com/<your-username>/<repo-name>.git
cd <repo-name>
bun install
bun run dev
```

Leave `VITE_API_BASE_URL` unset for demo mode. To test a compatible read backend, provide it through local environment configuration; never put private keys in a `VITE_*` variable.

Commands copied from the scripts in `package.json`:

| Purpose | Bun command | Script |
| --- | --- | --- |
| Development | `bun run dev` | `vite dev` |
| Tests | `bun run test` | `vitest run` |
| Watch tests | `bun run test:watch` | `vitest` |
| Production build | `bun run build` | `vite build` |
| Development-mode build | `bun run build:dev` | `vite build --mode development` |
| Preview built app | `bun run preview` | `vite preview` |
| Lint | `bun run lint` | `eslint .` |
| Format (writes files) | `bun run format` | `prettier --write .` |

There is **no typecheck script** in `package.json`. With the installed native-preview dependency, the separate check is `bunx tsgo --noEmit`; it is not presented as a package script.

## Roadmap

- [x] Multi-page frontend workspace and shared URL filters, navigation and states.
- [x] Seeded master dataset, typed read client and consistent cost/savings/carbon aggregates.
- [x] Independent usage histories, shared unit economics and zero-resource robustness.
- [x] Resources, recommendations, Kubernetes, budgets, security and what-if demo workflows.
- [x] Reports, integrations and settings demonstrations.
- [x] Currency, density, keyboard shortcuts, onboarding and reduced-motion controls.
- [x] Unit and component tests for aggregate consistency and demo rules.
- [x] Model Insights demo detection, forecast, registry and planned pipeline views.
- [ ] ML.NET anomaly detection and forecasting in the C# backend.
- [ ] Training and evaluation in GitHub Actions.
- [ ] Versioned model artifacts with a quality gate.
- [ ] Model packaged in the API Docker image.
- [ ] Model rollback.
- [ ] Monitoring and drift alerts.
- [ ] C# .NET Web API implementing the contract, including real mutation endpoints.
- [ ] PostgreSQL for historical cost data.
- [ ] Dockerfiles for frontend and backend.
- [ ] CI/CD with GitHub Actions.
- [ ] Infrastructure as code with Terraform.
- [ ] Real cloud integrations with read-only roles.
- [ ] Real authentication, authorization and multi-tenancy.

## Project status

The frontend is complete as a **simulated-data demonstration**; a production backend is planned. Real account scanning, persistent writes, report delivery and multi-tenant access controls are not implemented. The AI streaming route is implemented separately and needs server configuration.

## Author and links

- Raman Tajerian: https://github.com/raman-tajerian
- Live demo: https://finops-cloud-dashboard.lovable.app/
- Repository: https://github.com/raman-tajerian/finops-cloud-dashboard

