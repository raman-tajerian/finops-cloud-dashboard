# Fas 2a: En datakälla, felavgränsare, filterrad, Overview och Cost Explorer

Utseendet behålls. Inga befintliga funktioner tas bort.

## 1. En enda datakälla
- Ny `src/data/` med en seedad (deterministisk) huvuddatamängd: 66 resurser fördelade över EC2, RDS, S3, EKS, Lambda, Azure VM, AKS, Blob, SQL DB, GCP Compute, GKE, BigQuery. Varje resurs: namn, leverantör, typ, region, miljö, team, taggar, månadskostnad, CPU/minne-snitt, status och 90 dagars daglig kostnadshistorik.
- Alla siffror räknas fram från den datan plus aktiva filter: total kostnad, per leverantör/tjänst/region/team, prognos med band, idle waste (antal och belopp), besparingspotential, enhetskostnader, avvikelser (inkl. "+X %" som räknas ut), resursantal.
- Hårdkodade siffror som "+240 %" och "34 resources" ersätts med beräknade.
- Enhetstest: summan per leverantör, per tjänst och per team = total kostnad (och för flera filterkombinationer).

## 2. Felavgränsare
- Varje sida och varje kort omsluts av en felavgränsare som visar det befintliga felkortet med Retry. Ett trasigt kort fäller inte sidan.

## 3. Filterraden
- Alltid en rad på desktop: tidsperiod + leverantör + miljö syns; team och övriga filter flyttas till en "More filters"-popover med räknare.

## 4. Overview
- 8 KPI:er med sparkline och förändring mot föregående period: Total spend, Forecast EOM, Daily burn, Savings opportunity, Idle waste, Active anomalies, Cost per active user, Cost per API request.
- Kostnadstrend (area per leverantör) med streckad prognoslinje, skuggat osäkerhetsband och klickbara avvikelsemarkörer.
- Fördelningskort: Donut (tjänst) / Staplad stapel (region) / Treemap (team).
- "Top movers": 5 största ökningar och minskningar.
- Varje kort är klickbart och leder till rätt sida med filtren kvar. Befintliga kort (3D-karta, simulator, AI-analys m.m.) behålls längre ner.

## 5. Cost Explorer
- Stort diagram med gruppering (Service, Provider, Region, Team, Environment, Tag) och diagramtyp (area, staplad, linje).
- "Compare to previous period" som overlay-linje.
- Tabell: namn, nuvarande, föregående, förändring %, andel %, mini-sparkline; sorterbar med totalrad.
- Sparade vyer: spara filter + gruppering med namn, öppna från dropdown (lagras i URL/app-state under sessionen, inget i localStorage).
- Export av aktuell vy till CSV och JSON (riktiga nedladdningar).
- "View as table" på alla diagram.

## Tekniskt
- `src/data/seed.ts` (seedad PRNG), `src/data/resources.ts`, `src/data/aggregate.ts` (rena funktioner `aggregate(resources, filters)`), typer i `src/types`.
- `src/lib/api.ts` mockläget bygger `DashboardDto` från `aggregate`; nya endpoints `/costs/explore` dokumenteras. Sidor läser fortfarande bara via api + TanStack Query.
- `CardBoundary` (react error boundary + `useQueryErrorResetBoundary`) i `States.tsx`; route-nivå via `errorComponent`.
- Treemap via Recharts `Treemap`.
- Tester i `src/test/aggregate.test.ts` med vitest.
- Avslutas med sammanfattning av ändringar och det som hoppades över.
