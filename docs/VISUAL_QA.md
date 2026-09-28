# Fertility Visual QA

Manual verification checklist for the shared light/dark fertility visual language, and for the two
printable documents. Automated tests cover the state-to-token mapping and conditional rendering; this
checklist covers the rendered result.

## Setup

1. Run `pnpm dev` and open the app at a narrow viewport (320px wide) and a desktop viewport (at least
   1024px wide).
2. Use Settings to switch between Light, Dark, and System themes. Repeat each case in the resolved
   light and dark themes.
3. Use the seeded demo data or log a cycle containing a user-entered monitor High and monitor Peak.
   For the two-reading cases, log a Peak on one day and a second Peak on the next: a cycle normally
   holds two, and the app names each one differently.
4. Keep the algorithm enabled for the interpretation cases, then disable and re-enable it for the
   logging-only cases.
5. Judge the two printable documents in the browser's own print preview, not on screen. Landscape suits
   the instructor chart's width.

## Shared contrast checks

- [ ] Normal text in Calendar, Status, Cycle chart, and History/Stats is readable at a contrast ratio of at least 4.5:1.
- [ ] Status boundaries, forecast borders, monitor dots, chart bands, and marker shapes are distinguishable at a contrast ratio of at least 3:1.
- [ ] Legend swatches have distinct footprints, so entries separate without color: a square for a day phase, a dot for a monitor reading, a bar for menses, a glyph for intercourse.
- [ ] A Predicted day is separable from a plain phase cell without color. Predicted is the only layer carrying a border as well as a fill; the three phase layers are fill alone.
- [ ] No text or marker disappears into the active theme background.

## Calendar (`/`)

- [ ] Before, Fertile, and After days have distinct fills in both themes. Calendar names the three phases, not the engine's four statuses.
- [ ] A Predicted day — the next fertile window, a projected cycle's days, or a projected period start — carries the predictive fill and border, and reads as predictive rather than recorded.
- [ ] Unlogged days remain blank/base cells; they do not gain a status fill merely because they fall inside a window.
- [ ] Menses, Low, High, and Peak markers remain visible. Menses uses a bar and the monitor readings use dots, so they separate from each other without color.
- [ ] The Intercourse marker appears only in the full detail mode, and the legend offers it only there.
- [ ] Every layer a day cell can draw has a matching legend entry, and the legend never offers a layer the cells are not drawing.
- [ ] At 320px width, day numbers, status boundaries, and marker shapes remain separable without relying on color alone.
- [ ] With the algorithm off, raw user markers remain visible while phase fills, the Predicted layer, and computed styling are absent; the legend drops the entries it can no longer act on.

## Status (`/status`)

- [ ] Each status badge is readable in light and dark themes and uses the same semantic treatment as Calendar.
- [ ] The four statuses are individually named — Before, Fertile, After (post-peak), After (by calendar) — so a window closed by a monitor Peak is tellable from one closed by the calendar rule.
- [ ] No status label claims a day is safe, infertile, or unlikely to conceive.
- [ ] The fertile-window explanation is readable, and names the rule that produced the begin and the rule that produced the end.
- [ ] For a cycle holding two Peak readings, the readout names the cycle's Peak day and the later reading the end was measured from, and states how many readings there were.
- [ ] The next-period estimate is visibly predictive.
- [ ] A protocol warning is readable and describes the user's own readings, with no error, invalid, or malfunction language.
- [ ] With the algorithm off, the logging-only explanation is shown and no computed status, window, or forecast is rendered.

## Cycle chart (`/cycle/:cycleId`)

- [ ] Empty, Low, High, and Peak monitor bands remain distinct against the plot background.
- [ ] BBT, mucus, and intercourse markers remain readable when their overlays are enabled, and each toggle affects only its own overlay.
- [ ] The fertile-window reference area is theme-aware and matches its legend sample.
- [ ] A cycle with no Peak extends the window to the cycle's span and labels the end as an unknown day. No end date is invented, and the wording does not read as one.
- [ ] The chart still shows raw monitor bands but no computed window band when the algorithm is off.
- [ ] No per-day phase band layer has been added to the plot.

## Cycle compare (`/cycle-compare`)

- [ ] Each selected cycle renders its own monitor bands and its own window band, stacked and separately labelled.
- [ ] Every cycle shares one day axis, so the same cycle day lines up in a column across cycles.
- [ ] The view is reachable from History, and the empty state is readable when fewer cycles exist than were asked for.
- [ ] With the algorithm off, monitor bands remain and the window bands are gone.

## History/Stats (`/history`)

- [ ] Forecast values, stat labels and values, warnings, and empty states are readable in both themes.
- [ ] Forecast values remain numerically identical when switching themes.
- [ ] The per-cycle Peak cell names the cycle's Peak day and, where the cycle holds more than one reading, also states the later reading the end came from — as `day 12 (end from 13)` on one line.
- [ ] The Peak-day range in the stats is built from the cycles' _first_ Peak readings, and is scoped to the configured history window rather than widening to the whole history.
- [ ] No average or median Peak day is shown anywhere. The protocol's calendar rule produces a range, not a statistic.
- [ ] With the algorithm off, the forecast and derived summaries are hidden, a logging-only explanation is shown, and the cycle table remains with its logged fields.
- [ ] Re-enabling the algorithm restores the forecast and derived summaries without data loss.

## Printable cycle summary (`/summary/:cycleId`)

Reached from a cycle's own chart. Judge this in print preview.

- [ ] One cycle fits one page, and no section breaks across a page boundary mid-table.
- [ ] It is readable in black and white: no meaning rests on a fill color alone.
- [ ] No interactive control appears on the printed page. The print action and any back control sit outside the sheet.
- [ ] The on-screen chrome is gone in the preview, and the sheet drops its rounded border and page padding for print.
- [ ] The window begin and end each name the rule behind them, and a two-reading cycle names both Peak readings and the job of each.
- [ ] Any protocol warning the cycle raised is present, and worded as an observation rather than an error.
- [ ] The generation date is shown and does not change while the page stays open.
- [ ] Printed from dark mode, the sheet is still legible. A dark page with dark text is a release blocker.

## Printable instructor chart (`/instructor-chart`)

Reached from History. Landscape suits its width.

- [ ] Cycle days run across as columns and observation types run down as rows, with cycles stacked down the page.
- [ ] The fertile window is banded across the grid, and both band edges stay visible in black and white.
- [ ] Filled cells, empty cells, and the window band each remain distinguishable without color.
- [ ] No interactive control appears on the printed page. The print action and the cycle-count control sit outside the sheet.
- [ ] On screen the container scrolls so a 28-day cycle is readable; in print the overflow is dropped and the table sits on the paper at its natural width.
- [ ] The cycle-count control changes how many cycles are charted, and the count survives a reload because it lives in the URL rather than in settings.
- [ ] A window that began on the earliest Peak minus six days names that Peak day and the cycle it came from, and marks whether that cycle is on the same page.
- [ ] The generation date is shown and does not change while the page stays open.
- [ ] Printed from dark mode, the sheet is still legible.

## Record results

Note the theme, viewport, route, and any failure above in the change notes before marking the visual QA
task complete. A contrast, scanability, or print-legibility failure is a release blocker for this change
even when the automated suite is green.

## Manual QA results

**Stale — needs re-running.** The pass below was recorded 2026-09-25 against a build that predates both
printable documents, cycle compare, and the correction of which Peak reading each window edge is
measured from. The measurements are kept as a reference point, not as a current claim.

- Viewports checked: approximately 980px desktop and 320px narrow mobile.
- Themes checked: light and dark.
- Routes checked: Calendar, Status, History/Stats, and Cycle chart.
- Modes checked: algorithm on and off; Cycle chart overlays on.
- Status foreground/background token pairs measured at 6.78:1 or better in light mode and 12.08:1 or better in dark mode. Body, muted, and warning text tokens measured at 4.80:1 or better in light mode and 7.83:1 or better in dark mode. Meaningful marker/border colors were selected to meet the 3:1 graphical target; the empty chart track remains intentionally faint because it represents no reading rather than a meaningful state.
- Finding fixed during QA: algorithm-off mode still showed interpretation-only Calendar and Cycle-chart legend entries. The legends now hide status/source/forecast/provenance entries when interpretation is disabled, with regression coverage in the algorithm-off and chart tests.
- No remaining contrast, scanability, legend-sync, or forecast-certainty failure was observed. At 320px, the History table and Cycle chart retain their existing horizontal scrolling behavior so all content remains reachable.
- Never checked: the cycle summary, the instructor chart, and cycle compare have not been through this checklist at all, and neither has the two-reading Peak readout. The next pass should start there.
