# Visual-only redesign: calm Oura/Apple light theme

Only styling, tokens, typography, motion and chart presentation change. No logic, data, API, routes, URL params, filters, tests or features are touched. All cards stay where they are.

## 1. Tokens (one file)
- Rewrite `src/styles.css` tokens to the warm light palette: page #F6F3EE, cards #FFFFFF with 1px #E7E1D8 border and the two-layer soft shadow, text #1F2421 / #6B6F68, accent sage #4F6F5A (hover #435F4E), terracotta, amber, slate blue, sand, status colors (healthy sage, warning amber, critical #B5483A, idle warm gray).
- Radii: cards 20px, buttons/inputs 12px, pills full, dialogs/drawers 24px. Overlay rgba(31,36,33,0.35).
- Chart tokens: sage, slate, terracotta, amber, sand, dusty rose; fixed provider colors (AWS amber, Azure slate, GCP sage) used by every chart, badge and table.
- Remove gradients, glow and dark-mode overrides that conflict.

## 2. Typography
- Inter with tabular numbers on all figures; page titles 28px semibold tight, card titles 13px medium secondary, hero KPIs 32-40px, body 14px. Drop Inter Tight / IBM Plex Mono and all-caps labels except tiny sidebar section labels.

## 3. Components
- Sidebar sand #EFEAE2, active item = soft sage tint + dot. Top bar translucent off-white with blur and hairline.
- Tables: no cell borders, hairline rows, hover #F6F3EE, sticky blurred header.
- Buttons: primary sage, secondary white bordered, destructive brick tint. Badges: 12-15% tints with darker text plus icon/label.

## 4. Charts
- Shared chart style (2px lines, 10-18% area fill, #E7E1D8 gridlines, white 12px-radius soft tooltip, dashed forecast, light confidence band) applied to Overview, Cost Explorer, Resources drawer, Sustainability, Kubernetes and the topology.

## 5. Motion (framer-motion, under 400ms)
- Card fade/rise 8px with 40ms stagger, 200ms page transitions, KPI count-up, one-time chart draw-in, 2px hover lift on clickable cards, drawer slide from right, dialog fade/scale 0.98, sand shimmer skeletons. All disabled under prefers-reduced-motion.

## 6. Topology
- The current topology is a lightweight 2D SVG map, not 3D. It gets restyled with the new palette (sand background, provider-tinted rounded nodes, terracotta for waste, thin neutral lines, soft tooltip, gentle idle drift paused on hover). A real 3D scene is skipped to avoid new dependencies and logic changes; flagged in the summary.

## 7. Quality checks
- Scan for leftover hex colors and violet/purple/indigo/neon/bg-black classes, replace with tokens.
- Contrast check (WCAG AA) for text, badges and chart labels.
- Playwright at 375/768/1024/1440 for overflow, clipped labels and console errors; run all vitest tests.
- Update project memory: style is now warm light Oura/Apple (replaces the dark rule).
