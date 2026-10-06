# Fas 2b: Resources-sidan

Utseendet behålls. All data går via API-klienten och den gemensamma datamängden.

## 1. Resources-sidan
- Avancerad tabell över alla resurser (namn, leverantör, tjänst, region, miljö, team, månadskostnad, CPU %, minne %, status) som följer de globala filtren.
- Sortering på varje kolumn, kolumnmeny för att visa/dölja, täthetsväxlare (kompakt/luftig), sidindelning 25/50/100, sökning med 300 ms fördröjning, snabbfilter för status och tjänst.
- Flerval med åtgärdsrad: Tag, Assign to team, Stop, Export selected (riktig CSV). Varje åtgärd bekräftas och visar en toast; inget ändras på riktigt.
- Mobil: tabellen scrollar i sidled med fast första kolumn; alla klickytor minst 40 px.
- Klick på rad öppnar en sidopanel till höger med 5 flikar: Overview, Cost (90 dagars diagram), Utilization (CPU och minne), Tags, Activity (händelser härledda ur datan, t.ex. kostnadstoppar och statusbyten).
- Rightsizing-förslag när CPU < 25 %, med besparing från exakt samma funktion som Recommendations använder.
- Sökning, sortering, sida, sidstorlek och öppen resurs sparas i länken (delbar, överlever omladdning).
- Skeleton, tomt läge och fel med Retry; "View as table" på diagrammen i panelen.

## 2. Konsekvens
- Sidhuvudet visar antal resurser och kostnad. Antalet är samma som på Overview.
- Kostnad: tabellens kolumn är månadskostnad (senaste 30 dagarna). Ovanför visas även "Spend in period" beräknad med samma funktion som Overviews Total spend, så den siffran är identisk med Overview för samma filter. Summan av månadskostnad är identisk med Overview när perioden är 30 dagar.

## 3. Tester
- Antal resurser och kostnad på Resources = Overview för flera filterkombinationer.
- Rightsizing-besparingen för en resurs = besparingen i motsvarande rekommendation (enresursgrupp, och summan för grupper).

## 4. Responsiv kontroll
- 375, 768, 1024 och 1440 px: ingen horisontell overflow på sidan, inga avklippta etiketter, noll konsolfel.

## Tekniskt
- Ny endpoint `api.getResources(filters)` → `ResourcesDto { items: ResourceRow[], count, monthlyTotal, periodTotal }` och `api.getResource(id)` → detalj med daglig historik, aktivitet och rightsizing. Dokumenteras i docs/API_CONTRACT.md.
- I `src/data/aggregate.ts`: exportera `rightsizeSaving(resource)` och `isOversized`; `buildRecommendations` använder samma funktion. `buildResources` och `buildResourceDetail` läggs till.
- Route `/resources` får `validateSearch` (q, sort, dir, page, size, id) med `fallback`, värden klampas i komponenten; `stripSearchParams` för standardvärden.
- Ny komponent `src/components/finops/ResourcesTable.tsx` (tabell, åtgärdsrad, panel). Gamla `ResourceTable` på Overview behålls.
- Tester i `src/test/resources.test.ts`. Playwright-kontroll vid fyra bredder.
