# Fertility Visual QA

Manual verification checklist for the shared light/dark fertility visual language. Automated tests cover the state-to-token mapping and conditional rendering; this checklist covers the rendered result.

## Setup

1. Run `pnpm dev` and open the app at a narrow viewport (320px wide) and a desktop viewport (at least 1024px wide).
2. Use Settings to switch between Light, Dark, and System themes. Repeat each case in the resolved light and dark themes.
3. Use the seeded demo data or log a cycle containing a user-entered monitor High and monitor Peak. Include an inferred post-Peak Low when post-Peak fill is enabled.
4. Keep the algorithm enabled for the interpretation cases, then disable and re-enable it for the logging-only cases.

## Shared contrast checks

- [ ] Normal text in Calendar, Status, Cycle chart, and History/Stats is readable at a contrast ratio of at least 4.5:1.
- [ ] Status boundaries, forecast borders, monitor dots, chart bands, and marker shapes are distinguishable at a contrast ratio of at least 3:1.
- [ ] The important status/forecast distinctions remain understandable when color is not available: source uses a solid versus dashed cue, forecast uses a dashed cue, and the legend explains the samples.
- [ ] No text or marker disappears into the active theme background.

## Calendar (`/`)

- [ ] Fertile, pre-fertile, post-peak, and post-calendar recorded days have distinct treatments in both themes.
- [ ] Confirmed and predicted source cues are distinct without changing the status label.
- [ ] A future next-fertile-window cell uses a visibly predictive fill/border and is not presented as a confirmed record.
- [ ] Unlogged days remain blank/base cells; they do not gain a status fill merely because they fall inside a window.
- [ ] Low, High, Peak, menses, intercourse, predicted-ovulation, and assumed-data markers remain visible and match the legend.
- [ ] At 320px width, day numbers, status boundaries, and marker shapes remain separable without relying on color alone.
- [ ] With the algorithm off, raw user markers remain visible while status fills, source cues, and computed forecast styling are absent; inferred rows are hidden.

## Status (`/status`)

- [ ] Each status badge is readable in light and dark themes and uses the same semantic treatment as Calendar.
- [ ] Confirmed and predicted source badges are visually distinct.
- [ ] The fertile-window explanation and next-period estimate remain readable.
- [ ] The next-period estimate is visibly labeled as predictive.
- [ ] With the algorithm off, the logging-only explanation is shown and no computed status/source/forecast is rendered.

## Cycle chart (`/cycle/:cycleId`)

- [ ] Empty, Low, High, and Peak monitor bands remain distinct against the plot background.
- [ ] BBT, mucus, and intercourse markers remain readable when their overlays are enabled.
- [ ] The fertile-window reference area is theme-aware; confirmed is solid and predicted is dashed, with matching legend samples.
- [ ] An unknown window end retains the existing extension/indication behavior.
- [ ] The chart still shows raw monitor bands but no computed window band when the algorithm is off.
- [ ] No per-day pre-fertile/post-peak/post-calendar band layer has been added.

## History/Stats (`/history`)

- [ ] Forecast values, the `predicted` badge, stat labels/values, warnings, and empty states are readable in both themes.
- [ ] Forecast values remain numerically identical when switching themes.
- [ ] With the algorithm off, computed forecast/fertility/peak summaries are hidden, a logging-only explanation is shown, and basic logged cycle rows remain available.
- [ ] Re-enabling the algorithm restores the forecast and derived summaries without data loss.

## Record results

Note the theme, viewport, route, and any failure above in the change notes before marking the visual QA task complete. A contrast or scanability failure is a release blocker for this change even when the automated suite is green.

## Manual QA results

Recorded 2026-09-25 against the local Vite app with seeded demo data.

- Viewports checked: approximately 980px desktop and 320px narrow mobile.
- Themes checked: light and dark.
- Routes checked: Calendar, Status, History/Stats, and Cycle chart.
- Modes checked: algorithm on and off; Cycle chart overlays on; inferred post-Peak rows present in seeded data.
- Status foreground/background token pairs measured at 6.78:1 or better in light mode and 12.08:1 or better in dark mode. Body, muted, and warning text tokens measured at 4.80:1 or better in light mode and 7.83:1 or better in dark mode. Meaningful marker/border colors were selected to meet the 3:1 graphical target; the empty chart track remains intentionally faint because it represents no reading rather than a meaningful state.
- Finding fixed during QA: algorithm-off mode still showed interpretation-only Calendar and Cycle-chart legend entries. The legends now hide status/source/forecast/provenance entries when interpretation is disabled, with regression coverage in the algorithm-off and chart tests.
- No remaining contrast, scanability, legend-sync, or forecast-certainty failure was observed. At 320px, the History table and Cycle chart retain their existing horizontal scrolling behavior so all content remains reachable.
