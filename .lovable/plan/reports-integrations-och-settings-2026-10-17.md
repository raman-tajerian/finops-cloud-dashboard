# Reports, Integrations och Settings

Ersätter de tre "Coming soon"-sidorna. Tema, befintliga funktioner och datalager oförändrade. Allt nytt är demo, session-only och märkt "Demo". Inga riktiga hemligheter efterfrågas eller lagras.

## 1. Reports
- Fyra mallar: Executive summary, Team cost allocation, Savings report, Security summary. Varje mall har en dokumenterad sektionslista och byggs av samma aggregatfunktioner som Overview, Cost Explorer, Recommendations och Security, med globala filter.
- "Generate report"-dialog: mall, period (standard = globala perioden), format PDF/CSV/JSON, kort mock-progress. CSV/JSON laddas ner på riktigt från rapportdatan. PDF = utskriftsvänlig vy (window.print), lat-laddad.
- Past reports (Demo): Download och Delete med bekräftelse.
- Scheduled reports (Demo): veckovis/månadsvis, mall, mottagare med e-postvalidering, format; på/av-toggle, delete med bekräftelse. Inget skickas.
- Skeleton, empty och error states.

## 2. Integrations
- Kort för AWS, Azure, GCP, Kubernetes, Slack, Teams, GitHub, Jira, PagerDuty, Terraform Cloud: status, seedad senaste synk, Connect/Configure. Molnleverantörer är Connected exakt när de finns i datasetet; Kubernetes när EKS/AKS/GKE finns.
- Mock connect-modal: read-only-behörigheter, fält för role ARN / service principal ID (GUID) / project ID med formatvalidering, "Test connection" ger deterministiskt resultat utifrån formatet. Inga nätverksanrop.
- Seedad, sorterbar synkhistorik (status, varaktighet). Tydlig notis om att integrationerna är simulerade.

## 3. Settings (flikar)
- Profile, Workspace, Team members (roller Admin/Editor/Viewer, invite-modal med e-postvalidering), Cost allocation (tagg → team, lägg till/redigera/ta bort), Notifications (toggles per kanal och händelse), API keys (maskad lista, "Create key" visar en uppenbart falsk nyckel en gång med varning), Appearance (tabelltäthet).
- Aktiv flik och öppen dialog i URL:en (`tab`, `dialog`). Session-only, märkt "Demo". Skeleton/empty/error.

## 4. Tester (vitest)
- Rapporttotaler per mall = Overview / Recommendations / Security för flera filterkombinationer.
- CSV och JSON innehåller samma rader och totaler som visad data.
- Validatorer för e-post, role ARN, GUID och project ID: giltig/ogiltig.
- Anslutna leverantörer = distinkta leverantörer i datasetet.
- Test connection deterministisk för samma input.

## 5. Responsivkontroll
375/768/1024/1440 px på Reports, Integrations, Settings: ingen overflow, inga klippta etiketter, noll konsolfel. Avslutas med sammanfattning inklusive det som hoppats över.

## Tekniska detaljer
- Rena funktioner: `src/data/reports.ts` (REPORT_TEMPLATES, buildReport, reportToCsv, reportToJson), `src/data/integrations.ts` (buildIntegrations, syncHistory, testConnection), `src/data/settings.ts` (seedade medlemmar, taggmappning, notiser, maskade nycklar), `src/lib/validators.ts` (email, roleArn, guid, gcpProjectId). Seedad PRNG, datum från DEMO_TODAY.
- Typer i `src/types/finops.ts`; `getReports`, `getIntegrations`, `getSettings` i `src/lib/api.ts`; hooks i `src/lib/queries.tsx`.
- Session-state (past/scheduled reports, integrationsstatus, medlemmar, mappningar, notiser, nycklar, täthet) i `src/lib/session-store.ts`.
- Komponenter `src/components/finops/Reports.tsx`, `Integrations.tsx`, `Settings.tsx`; routes skrivs om med zod-search-schema. FjordLogo kvar i Reports-rubriken.
- Dokumentera GET /api/v1/reports, /api/v1/integrations, /api/v1/settings i docs/API_CONTRACT.md; uppdatera AGENTS.md och roadmap.md.
