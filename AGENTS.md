<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep FinOps feature data local and typed so it can later be replaced by the planned C# API without changing presentation components.
- Treat the dashboard as a single responsive bento workspace; operational widgets own their temporary interactive state.
- AI features stream from server routes under src/routes/api with prompts and keys in *.server.ts — keeps secrets server-side.
- Shared app chrome (Shell, sidebar, command palette) lives in __root around <Outlet />; nav config in src/lib/nav.ts drives sidebar, breadcrumbs and palette.
- Data access goes through src/lib/api.ts (mock unless VITE_API_BASE_URL) with contracts in src/types — keeps the C# API swap one-file.
- Global filters live in the root route's URL search (validated in src/lib/filters.ts, retained across nav); cards read data via useDashboard/DataGate in src/lib/queries.tsx keyed by filters.
- All cost figures derive from the seeded master dataset in src/data via pure functions in src/data/aggregate.ts — one source keeps totals identical across cards (tested in src/test/aggregate.test.ts).
- Every card sits in a CardBoundary (DataGate includes one) and routes use the router's defaultErrorComponent — one failure never takes down a page.
- Per-resource savings come only from rightsizeSaving() in src/data/aggregate.ts — recommendations and the resource drawer must show identical numbers.
