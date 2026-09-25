# Milestone 6 — Cycle Strip Chart

CBPM-style strip chart per cycle: monitor Low/High/Peak band strip with the fertile window shaded, optional BBT/mucus/intercourse overlays, overlay toggles, and a cycle selector.

## 1. Files

```
src/features/cycle-chart/
  index.tsx                    # CycleChartView: selector, overlay toggles, legend, strip/empty state
  lib.ts                       # buildStripModel, series derivations (bbt/mucus/intercourse), cycle label/span helpers
  strip-chart.tsx              # StripChart: Recharts ComposedChart band strip + window + overlays
  __tests__/
    helpers.ts                 # resetStore, seedCycles (A: closed 28d; B: open through day 6), installChartShim
    lib.test.ts                # model/series unit tests
    strip-chart.test.tsx       # band strip, window band, algorithm-off tests
    cycle-chart.test.tsx       # view-level: store, routing harness, empty state
    overlays.test.tsx          # BBT/mucus/intercourse markers + toggle independence
    selector.test.tsx          # cycle selector: ordering/labels, navigation, fallback
src/test/setup.ts              # jsdom polyfills (scrollIntoView, pointer capture) for Radix Select
```

`core/engine` is untouched — the window is copied from engine results at read time, never recomputed here.

## 2. Behavior spec

**Strip** — fixed-width day-band columns (28px each) in a horizontally scrollable region; a day with no monitor reading renders a faint neutral track. Monitor fills use the shared fertility tokens: `fill-fertility-monitor-none`, `fill-fertility-monitor-low`, `fill-fertility-monitor-high`, and `fill-fertility-monitor-peak` (matching the Calendar dots and legend).

**Fertile window** — a single band across days `begin…end` filled with the day-bands' natural monitor colors, using the theme-aware `--fertility-window-fill` and `--fertility-window-border` values (solid for confirmed, dashed for predicted). Begin = first-High/Peak day → confirmed; else calendar rule → predicted. No window when the cycle has no Peak/boundary, or when Settings "Algorithm" is off. Conveyed to screen readers via an sr-only element carrying `data-begin`/`data-end`/`data-source`.

**Overlays** (toggle off by default, ephemeral state only):
- BBT: the shared `--fertility-overlay-bbt` line and `fill-fertility-overlay-bbt` markers on a right-side temperature axis; missing days create a gap (no interpolation).
- Mucus: shared `fill-fertility-overlay-mucus-none` / `low` / `high` / `peak` tokens, including explicit "none" recordings.
- Intercourse: shared `fill-fertility-overlay-intercourse` markers.

**Selector** — shadcn Select, items newest-first, label `Cycle N · starts Jan 29, 2026 · 6 days (open)` (span = engine length when closed, else latest recorded day). Changing selection navigates to `/cycle/:id`; unknown/absent ids fall back to the newest cycle.

## 3. Test matrix

- `lib.test.ts`: span resolution (engine length vs open-cycle latest day), series derivation (BBT null-day gaps, mucus incl. explicit none, intercourse-true-only), window copy vs algorithm flag.
- `strip-chart.test.tsx`: band count/attrs, faint-track fallback, monitor color classes, confirmed vs predicted window, window null cases.
- `cycle-chart.test.tsx`: view reads the store (28 bands + predicted window on the 28-day fixture); algorithm off ⇒ no window band but bands remain; empty state with start-a-cycle link; no console errors.
- `overlays.test.tsx`: marker counts, days, and data attrs per overlay; toggling one overlay doesn't touch bands/window.
- `selector.test.tsx`: newest-first ordering + `(open)` suffix; selecting Cycle A navigates and swaps the strip to 28 bands; `/cycle/bogus` and `/cycle` fall back to Cycle B's 6-band strip.

Totals: 101 tests for the Milestone 6 snapshot (58 at the end of Milestone 5); the current full suite is 265 tests, all green with `pnpm test && pnpm lint && pnpm build`.

## 6. Definition of Done

- [x] Strip shows every day of the cycle with monitor band colors (read-only, no new writes)
- [x] Fertile window band rendered with confirmed-vs-predicted distinction; hidden when algorithm is off
- [x] BBT/mucus/intercourse overlays gated by ephemeral toggles
- [x] Cycle selector navigates; invalid ids fall back to newest cycle
- [x] `pnpm test` (Milestone 6 snapshot: 101; current full suite: 232), `pnpm lint`, `pnpm build` green
- [x] README status → M7 (History/Stats) next

## 7. Theme-aware presentation

The chart keeps its existing structure: one monitor band per cycle day, one fertile-window reference area, and the optional BBT/mucus/intercourse overlays. Monitor bands, the empty track, overlay markers, and the fertile-window fill/stroke now use the shared fertility tokens so they remain readable in both themes. The window keeps its solid-confirmed versus dashed-predicted source cue, and the legend uses matching samples.

No per-day pre-fertile, post-peak, or post-calendar band layer is introduced. When the algorithm is off, the computed window area is hidden while raw monitor bands remain. Automated tests cover the token values and source/algorithm-off behavior; rendered contrast and mobile checks are in [`VISUAL_QA.md`](./VISUAL_QA.md).