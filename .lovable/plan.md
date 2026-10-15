# Fjord Labs-logga och färgblock (endast visuellt)

Ingen ändring av logik, data, rutter, URL-parametrar, filter eller tester. Varmt ljust tema och befintliga tokens behålls.

## 1. Logga
- Ny mapp `src/components/brand/` med `FjordMark` och `FjordLogo` (inline SVG).
- Märke: två rundade "klippformer" med en smal vattenkanal emellan (max 3 former, platta fyllningar, inga konturer eller gradienter) i sage, skifferblå och sand.
- Enfärgsvariant (`currentColor`) för små storlekar och mörka ytor; storlekar 16/24/32/48 px.
- Ordmärke: "Fjord Labs" i Geist 600, lätt spärrad, "Labs" i sekundär textfärg.
- `aria-label="Fjord Labs"`, `role="img"`. Avatarvariant (märket i rundad ruta) för workspace-avataren.
- Används i: workspace-väljaren i sidomenyn (bara märket när den är hopfälld), toppen av Overview-sidans rubrik, rapportrubriker på Reports och sidfoten.

## 2. Färgblock och mönster
- 6 px band högst upp ovanför topbaren: sage 40 %, skifferblå 25 %, sand 20 %, terrakotta 15 %. Ej animerat.
- Diskret heroremsa bakom Overview-titeln: SVG-mönster (rundade rektanglar och kvartscirklar) i paletten, 8–14 % opacitet, absolut positionerat och `pointer-events: none`, slutar före kort/tabeller/grafer; ingen layoutförskjutning eller scroll.
- Samma fyra block som 4 px remsa ovanför sidfoten.
- Valfri fade-in under 400 ms, avstängd vid reduced motion.
- Nya CSS-verktyg i `src/styles.css` baserade på befintliga tokens (`--chart-1/2/6/3`); hårdkodade hex endast i loggfilen.

## 3. Kontroll
- Kör alla tester (oförändrade).
- Playwright på 375/768/1024/1440 px: overflow, klippta loggor, kontrast, och hopfälld sidomeny.
- Kort sammanfattning av var loggan och färgblocken används.

## Tekniska detaljer
- Filer: `src/components/brand/FjordLogo.tsx` (+ index), `Shell.tsx` (band, avatar, footer), `Overview.tsx`/`routes/index.tsx` (hero), `routes/reports.tsx` (rubrik), `src/styles.css` (`@utility accent-band`, `hero-pattern`).
