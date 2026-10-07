# ClarityCloud: Cloud & FinOps Dashboard

A multi-cloud cost and infrastructure dashboard that shows where cloud money goes, where it is wasted and how much can be saved. Built as a portfolio project to demonstrate frontend architecture, data modelling and a backend-ready design.

**Live demo:** https://finops-cloud-dashboard.lovable.app

## Demo vs live data

All figures in the live demo are **simulated**. The data comes from a seeded, deterministic dataset of 61 fictional resources, so every number is consistent across pages (for example, total spend is identical on Overview, Cost Explorer and Resources for the same filters).

Some values are estimates or demo telemetry and are labelled as such in the app:

- CO2e figures are estimates based on cost, a kWh-per-dollar factor and regional carbon intensity.
- Regional cost differences in "greener region" suggestions use a fixed, documented cost index.
- CPU and memory utilisation curves and the live activity feed are generated from averages.

## Features

- **Overview:** eight key figures with sparklines and change vs the previous period, cost trend by provider with forecast and confidence band, breakdowns by service, region and team, and top movers.
- **Cost Explorer:** group costs by service, provider, region, team, environment or tag; area, stacked bar or line charts; compare with the previous period; saved views stored in the URL; CSV and JSON export.
- **Resources:** sortable and searchable table with column menu, density toggle, pagination, multi-select actions and a detail drawer with cost history, utilisation and right-sizing suggestions.
- **Sustainability:** estimated CO2e by region, provider and service, with greener-region suggestions.
- **Shared:** filters stored in the URL (shareable views), command palette (Ctrl/Cmd+K), notifications, skeleton, empty and error states, and responsive layout.

## Tech stack

- React, TypeScript, Vite
- Tailwind CSS, shadcn/ui, Lucide icons
- Recharts, Framer Motion
- TanStack Query and TanStack Router
- Vitest for unit tests

## Architecture

All pages read data through a typed API client (`src/lib/api.ts`) and TanStack Query. In demo mode the client builds responses from pure aggregate functions over the master dataset (`src/data`). If `VITE_API_BASE_URL` is set, it calls real HTTP endpoints instead, so a backend can replace the mock layer without changing any page. The expected endpoints and JSON shapes are documented in `docs/API_CONTRACT.md`.

## Roadmap

- [ ] Kubernetes, budget forecast and scenario simulator derived from the master dataset
- [ ] Recommendations, Security and Budgets pages
- [ ] Reports, Integrations and Settings pages
- [ ] C# .NET Web API implementing the API contract
- [ ] PostgreSQL for historical cost data
- [ ] Dockerfiles for frontend and backend
- [ ] CI/CD with GitHub Actions (tests, lint, dependency and security scanning)
- [ ] Infrastructure as code with Terraform
- [ ] Real cloud integrations (AWS Cost Explorer, Azure Cost Management) with read-only roles

## Author

Raman Tajerian: https://github.com/raman-tajerian
---

## Länkar

- Live Demo: https://finops-cloud-dashboard.lovable.app/
- GitHub Repository: https://github.com/raman-tajerian/finops-cloud-dashboard

