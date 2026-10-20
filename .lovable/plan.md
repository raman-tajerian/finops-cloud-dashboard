# Density, currency, shortcuts, onboarding, titles, motion

## 1. Table density
- `useTableDensity()` in `src/lib/queries.tsx` (or new `src/lib/density.ts`): reads `session-store` `settings.density` ("compact" | "comfortable") and returns shared row/cell padding classes.
- Apply to every data table: ResourcesTable, Recommendations, Security findings, Cost Explorer table views, Integrations sync history, Settings tables, Top 10 resources (Widgets).
- Settings > Appearance density buttons and the Resources page density toggle both write the same session value (session-only, "Demo" semantics unchanged).

## 2. Currency selector
- `src/data/currency.ts`: `CURRENCIES = { USD: 1, EUR: 0.92, SEK: 10.55, GBP: 0.79 }` labelled "Demo rates" in code and UI; `fmtMoney(usd, currency, opts)` via `Intl.NumberFormat` ("en-US" + currency code); compact variant for axes/tooltips.
- Shared React hook `useMoney()` returns the active currency + formatter; replaces `fmtUSD` in `src/lib/finops-data.ts` and every hard-coded "$" across all finops components (charts, tooltips, tables, drawers, simulator, exports/print in Reports).
- `cur` added to the root search schema in `src/lib/filters.ts` (fallback USD, `stripSearchParams` default, `retainSearchParams(["cur"])`) so it survives reload/share.
- Selector (USD/EUR/SEK/GBP) in Settings > Appearance and in the top bar user menu (Shell); both write `?cur=`.
- Totals stay in USD through the data layer; conversion happens once at display/format time. Document rates and rule in `docs/API_CONTRACT.md` and README.
- Vitest: conversion uses USD totals (no summing pre-rounded values), formatter output per currency, unknown `cur` falls back to USD.

## 3. Keyboard shortcuts
- `useGlobalShortcuts()` in `src/lib/shortcuts.ts`, mounted in `Shell.tsx`: G→O/C/R/S/K navigate (800 ms chord window), `/` focuses the command palette, `?` opens a shortcuts dialog, Esc closes open drawers/dialogs. Cmd/Ctrl+K unchanged.
- Ignored while typing in input/textarea/select/contentEditable and while a dialog is open (except Esc).
- Shortcuts dialog (list of all keys) + `kbd` hints next to items in the command palette. Everything remains mouse/touch accessible.
- Vitest for the chord/ignore logic where extractable; manual Playwright pass for the rest.

## 4. Onboarding checklist (Overview)
- Dismissible card with 4 steps linking to Integrations / Budgets / Recommendations / Settings>Team.
- Completion tracked in `session-store` (demo, session-only): connect = an integration toggled to Connected; budget = a budget created; recommendations = a recommendation status changed (or review drawer opened); invite = a member invited in Settings.
- Only the `dismissed` flag goes to localStorage inside try/catch; if storage is unavailable the checklist shows again next load.

## 5. Page titles and polish
- Per-route `head()` titles in the "Overview · Fern" style (all 12 routes) plus meta description kept/added; index keeps its descriptive title format aligned.
- Reports header already uses FjordLogo (verify); footer already shows version + "Demo data as of 12 Oct 2026" (verify).

## 6. Motion system (framer-motion is already installed)
- `src/lib/motion.ts`: shared presets — durations 150–450 ms, natural easing/soft springs; components `PageTransition`, `Reveal`, `AnimatedNumber`, `StaggerList` in `src/components/motion.tsx`.
- Replace ad-hoc `reveal-up` CSS animation classes (index.tsx + any other usages) with the shared components; keep reduced-motion support.
- Route transitions in `__root.tsx` around `<Outlet/>` with `AnimatePresence` keyed on pathname: outgoing fade 120 ms, incoming fade + 8 px rise 240 ms; scroll resets to top (verify against existing `scrollRestoration`).
- Rules enforced: transform/opacity only, no layout shift, no blocking interaction.

## Verification
- All existing vitest tests unchanged-green plus new currency/shortcut tests.
- Playwright sweep at 375/768/1024/1440 px on affected pages: no overflow, no console errors, density and currency visibly applied.
- Update `docs/API_CONTRACT.md` (currency note) and README.
