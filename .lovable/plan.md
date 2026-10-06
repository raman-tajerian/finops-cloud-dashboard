# Polish the Overview header and filter bar

Visual only. Fixes three issues visible in the screenshot.

## 1. Header spacing
- The eyebrow line ("Cloud & FinOps platform · 61 resources") currently sits right against the top bar. Add 24px of space above it, keep 8px between eyebrow and title, and keep 24px below the title.

## 2. Filter bar wrapping
- Right now, at medium widths "Budget alert" and "Export" drop to their own row and leave a large empty area.
- Fix: put the filters on the left (they wrap among themselves) and the two action buttons in a fixed group on the right of the same row.
- When even that doesn't fit, "Budget alert" and "Export" fold into one "More" button with a menu holding the same actions. Export keeps its PDF/CSV/JSON options.
- Both groups stay vertically centred.

## 3. Export button
- It still has the raised beige look. Make it match the other controls: white background, 1px #E7E1D8 border, no shadow.

## Checks
- Screenshots at 1024, 1280, 1440 and 125%/150% zoom. Pass when:
  - the header has clear space under the top bar;
  - there is no empty second row in the filter bar;
  - there is no sideways scroll.
- Run all tests.
