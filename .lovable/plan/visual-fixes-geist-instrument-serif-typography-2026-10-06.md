# Visual fixes + Geist / Instrument Serif typography

Visual only. No logic, data, routes, URL params, filters or tests change.

## 1. Page header
- Eyebrow, 8px gap, title, 24px gap, then filter bar on every page.
- `scroll-padding-top` equal to the top bar height (64px) so the header is never hidden under the sticky bar.

## 2. Filter bar
- Wraps neatly inside the content column (flex-wrap + min-w-0, no fixed widths).
- When space is tight, "Budget alert" and "Export" fold into a "More" menu. The same actions open from there.
- Checked at 1024, 1100, 1280, 1440 and 1920 px plus 125% and 150% zoom: no sideways scroll.

## 3. Card headers
- One shared style on every card: title 15px medium in primary text, description 13px in secondary text. The small eyebrow labels currently used as titles get swapped so the title is always the strongest text.

## 4. KPI cards
- All 8 cards have equal height and the same layout: number + sparkline on row one, then one delta line, e.g. "+4.8% vs prev".
- The previous-period value moves into a tooltip.
- 0.0% shows a neutral dash instead of an arrow.

## 5. Scrollbars
- Thin 6px rounded sand (#D9CDBB) thumb on a transparent track, applied globally (sidebar, tables, drawers, scroll areas).

## 6. Controls
- The search box and "More filters" button lose the raised look: 1px #E7E1D8 border, white or transparent background, matching the other controls.
- Bottom padding on every page so nothing floating covers the last card.

## 7. Typography
- Geist (400/500/600, display=swap, system-ui fallback) replaces Inter through the font tokens. It applies to body text, controls, tables, labels and chart text.
- New Instrument Serif display token, used only for page titles (28-32px, regular weight, tight spacing) and the hero KPI numbers. Figures elsewhere stay Geist with tabular numbers.

## Checks
- Playwright at the widths and zoom levels above: page width equals the window, no clipped Export button, zero console errors.
- Run all tests.
- Update project memory with the new fonts.
