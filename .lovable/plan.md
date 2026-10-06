# Sustainability och kvarvarande Cost Explorer-arbete

## 1. En gemensam Sustainability-datakälla
- Flytta CO₂-formeln till rena, typade aggregatfunktioner i `src/data`, så både Overview-kortet och Sustainability använder exakt samma beräkning från masterdatasetet.
- Beräkna för aktuell och föregående period: total CO₂e, förändring, CO₂e per 1 000 USD och andel kostnad i A/B-klassade regioner.
- Ta fram daglig CO₂e-trend samt summeringar per region, leverantör och tjänst från aktiva globala filter.
- Lägg till typade Sustainability-kontrakt, API-anrop och TanStack Query-hook. Sidan ska aldrig importera demodata direkt; query key innehåller samtliga filter och demolägets befintliga fördröjning behålls.

## 2. Fullständig Sustainability-sida
- Bygg KPI-raden och tre diagram: trend, per leverantör och per tjänst, med samma befintliga mörka visuella system.
- Ge varje diagram en fungerande “View as table”-växling och tydliga enheter.
- Bygg en sorterbar regiontabell med region, leverantör, gCO₂/kWh, A–D-betyg, t CO₂e och andel.
- Visa tre förslag för de högst emitterande arbetslasterna. Varje förslag använder en region hos samma leverantör med strikt lägre intensitet och visar beräknad CO₂e-minskning samt kostnadsförändring.
- Lägg formeln och antagandena i en utfällbar “How this is calculated”-panel och märk tydligt alla värden som uppskattningar.
- Hantera laddning, tom data och fel med Retry på sidans datadrivna delar.

## 3. Cost Explorer
- Lägg föregående periods streckade overlay-linje ovanpå det staplade diagrammet när jämförelse är aktiv, och ta bort den nu inaktuella begränsningsnotisen.
- Ersätt sessionsminnet för sparade vyer med en kompakt, validerad URL-parameter som innehåller namn, globala filter och Explorer-inställningar.
- Låt skapa, öppna och återöppna sparade vyer fungera efter omladdning och via delad länk, utan att störa övriga URL-filter.

## 4. Tester och verifiering
- Lägg Vitest-fall för flera filterkombinationer som bevisar att total CO₂e är identisk med summorna per region, leverantör och tjänst.
- Testa att Sustainability-totalen är identisk med Overview/GreenOps för samma filter.
- Testa att inget regionsförslag någonsin har högre eller lika hög intensitet än ursprungsregionen.
- Kör relevanta befintliga och nya tester.
- Verifiera Sustainability och Cost Explorer i 375, 768, 1024 och 1440 px: ingen sidöverflow, inga klippta diagrametiketter och inga konsolfel.

## Tekniska detaljer
- Behåll nuvarande tema, komponentmönster, globala filter och alla befintliga funktioner.
- CO₂-formel: kostnad × kWh per USD × regional intensitet, med en enda exporterad implementation som används av alla vyer.
- Kostnadsförändring för regionsförslag baseras på dokumenterade, deterministiska regionala kostnadsindex i mocklagret; inga nya ogrundade API-anrop eller direktimporter från sidan.
- URL-vyer avkodas defensivt: ogiltiga eller för stora värden ignoreras och standardsidan fortsätter fungera.
