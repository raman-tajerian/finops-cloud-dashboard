# Ny Fjord Labs-profil (endast visuellt)

Ingen ändring av logik, data, rutter, URL-parametrar, filter eller tester. Bakgrund, kort, textfärger, knappar, diagram och statusfärger lämnas orörda.

## 1. Färgtokens
Lägg till fyra profilfärger: vinröd #7A1F3D, senapsgul #D9A441, sand #E8D8C0, bläck #1F2421. Allt utom loggfilen använder dessa tokens.

## 2. Nytt märke
- Byt till det organiska märket: sandfärgat vatten, vinröd vänsterklippa och senapsgul högerklippa, ritat i den angivna ordningen och med de exakta formerna från beskrivningen.
- Enfärgsvarianten ritar bara de två klipporna.
- Ordmärke, storlekarna 16/24/32/48, avatar (vit rundad ruta med tunn varm kant) och etiketten "Fjord Labs" behålls.

## 3. Band och sidfotsremsa
Det övre bandet (6 px) och sidfotsremsan (4 px) får vinrött 40 %, senap 25 %, sand 20 % och bläck 15 %, helt täckande och utan animation.

## 4. Dekoration bredvid Overview-rubriken
- Det nuvarande prickmönstret tas bort.
- I stället läggs tre fyllda former till höger i rubrikområdet: en vinröd kvartscirkel (radie ca 88 px), en senapsgul cirkel (radie ca 28 px) som överlappar dess övre högra del, och en rundad rektangel i sand (ca 56×52 px) under cirkeln.
- Ytan blir cirka 220×90 px och reagerar inte på klick.
- Den döljs under 768 px och hålls borta från text, filterraden och korten.

## 5. KPI-kort på Overview
- En senapsgul prick på 16 px uppe till höger på varje kort, dold för skärmläsare.
- Den befintliga pilen uppe till höger flyttas inte; pricken placeras precis till vänster om den, så att ingenting överlappar.

## 6. Regler
- Senap och sand används bara som fyllnad, aldrig som textfärg.
- Inga statusmärken ändras.
- En visuell kontroll görs så att vinrött och senap inte ser ut som varnings- eller fellägen, till exempel bredvid den röda avvikelseraden.

## 7. Kontroll
- Alla tester körs.
- Sidorna kontrolleras på 375/768/1024/1440 px: inget som sticker ut åt sidan, inga beskurna loggor, god kontrast, hopfälld sidomeny och märket i 16 px.
- Arbetet avslutas med en kort sammanfattning.

## Tekniska detaljer
- `src/styles.css`: nya `--brand-*`-variabler, mappade i `@theme inline` som `--color-brand-*`. Utility-klassen `hero-pattern` ersätts av komponenten `HeroShapes`.
- `src/components/brand/FjordLogo.tsx`: nya banor och färger.
- `AccentBand.tsx`: klasserna `bg-brand-*`.
- Ny `HeroShapes.tsx` (SVG med `hidden md:block`, `aria-hidden`, `pointer-events-none`), används i `src/routes/index.tsx`.
- `src/components/finops/Overview.tsx`: KPI-prickarna.
