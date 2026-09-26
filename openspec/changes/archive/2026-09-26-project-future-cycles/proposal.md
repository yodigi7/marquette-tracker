# Proposal

## Why

The Calendar stops at today. A user who wants to plan ahead has to hold the forecast in their head or open History to read two dates, and the app cannot answer "roughly when is my next period" on the surface the user is already looking at.

Two specific gaps make this worth closing now. First, an open cycle's derived band stops at the current day, which reads as the fertile window *closing* — when the protocol leaves the window open until a monitor Peak arrives. A band that ends is ambiguous, and it resolves in the unsafe direction for someone avoiding pregnancy. Second, the existing forecast is a single window anchored to the current cycle's day 1, so how much of it lands past today is incidental rather than designed, and there is nothing past that one window.

The engine already computes the right answer. Called with a cycle that has no readings and a cycle number past the protocol's history threshold, `computeCycle` yields the calendar rule exactly: begin at the earliest Peak of the lookback window minus six days, end at the latest Peak plus the post-Peak interval. That is the Marquette Institute's own rule for a cycle with no Peak, and it extends to future cycles unchanged. The capability exists; no surface asks it for one.

## What Changes

- **BREAKING** The Calendar projects future cycles. With the setting enabled, every month the user pages into shows projected cycle boundaries, projected menses days, and projected fertile windows, continuing without a fixed horizon.
- **BREAKING** The open cycle is projected too. Its tail past today paints as forecast and the next projected cycle begins where that tail ends, so the calendar has no seam between the real cycle and the projected ones.
- The projected cycle length is the median of the last `historyWindow` closed cycle lengths, conditioned on cycles that could still be running, and the conditioning is what keeps a late cycle from being predicted as already finished. Past `cycleMaxLength` the projection stops rather than extrapolating beyond the protocol band; reporting an over-band cycle remains the engine's existing out-of-band handling for completed cycles.
- Each projected cycle's fertile window is the calendar rule over the same Peak lookback, so no new estimation logic is introduced. Where the lookback holds no Peak at all, the window falls back to the protocol's standard first-cycle band — the same default the next-window forecast already uses — so a projected window always has a determinate end. Menses days are projected from the chained cycle starts.
- A new default-off Core setting, "Project future cycles on the calendar," governs the projection. It governs only the projection: the existing single-window forecast overlay is untouched, so enabling the setting can never remove anything the user already sees.
- **BREAKING** The predicted-ovulation dot is removed from the Calendar, along with its legend entry, the calendar's use of a mean Peak day, and the no-data fallback that drew a point estimate from an empty history. The protocol's calendar rule only ever takes the earliest and latest Peak, so the band already carries the information the dot conveyed and the dot added a day that never occurred.
- **BREAKING** History's average-Peak-day statistic is removed; the existing Peak-day range remains. The forecast panel states which estimator drives the projection so the displayed averages and the projected dates are not left for the user to reconcile.
- Nothing about the projection is stored. Projected cycles are derived at read time from raw records, the setting is the only persisted addition, and no prediction history is kept, so the backup document is unchanged in shape.

## Capabilities

### New Capabilities

- `cycle-projection`: deriving projected cycles forward from the open cycle — the length estimator and its conditioning, the calendar-rule fertile window for a cycle with no readings, projected menses days, the protocol-band stop, and the rule that projections are derived at read time and never persisted.

### Modified Capabilities

- `app-settings`: a new default-off Core preference that enables the projection, and the established default-for-missing-value behavior extended to it.
- `calendar`: projected cycle days, projected menses markers, and the projection's forecast treatment; the forecast-future-dates rule extended from a single window to every projected cycle; the predicted-ovulation cue removed from the grid, the simple and full-detail presentations, and the legend.
- `fertility-visuals`: the shared vocabulary drops predicted ovulation as a named layer and adds the projected-cycle day, which must remain distinguishable from derived status without relying on color alone.
- `history`: the forecast panel names the estimator that drives the projection, and the average-Peak-day statistic is removed in favor of the existing range.

## Impact

- **Engine (pure):** `src/core/engine/predict.ts` gains the projection chain, the length estimator with its survival conditioning, and the projected-cycle construction; `src/core/engine/marquette.ts` is reused unchanged via `computeCycle` with a synthetic day 1, no records, and a cycle number past the history threshold. `src/core/engine/types.ts` drops `peakDayMean` from `Forecast`, adds `lookbackWindow` and `configuredLookbackWindow` so the panel can name both the count it used and the configured window, and adds one `EndRule` member for the bounded fallback. No projected-cycle type is added: a projected cycle is a `CycleResult` with a synthetic id, which is what makes it interchangeable with a derived one at the point of use.
- **Store:** `src/core/store/entities.ts` gains the persisted setting; a selector in `src/core/store/selectors.ts` derives the projection for the range the Calendar is showing, gated on that setting. `computeAll` and `engineSdk.ts` are unchanged. No new table and no new record.
- **Features:** the Calendar grid and day cell resolve a projected cycle for a date and render its status, menses marker, and forecast treatment; the legend drops the ovulation entry and explains the projected treatment; the Settings Core section gains the toggle; the History forecast panel gains the estimator disclosure and loses the average-Peak-day stat.
- **Visuals:** `src/lib/fertility-visuals.ts` drops the ovulation marker treatment and gains a projected-day treatment; the corresponding tokens in `src/index.css` follow.
- **Deliberately out of scope:** the Status view, because a future Calendar cell is not clickable — the grid rejects a future selection — so a projected day never routes there and a manually selected future date still shows the existing no-cycle state. One file inside that feature does change: `src/features/status/lib.ts` holds an exhaustive rule-label map, and the new `EndRule` member required an entry in it. That label is not reachable today, since a projected cycle never appears in the stored cycle list Status resolves against. The Cycle chart, because charted cycles are real cycles and a projected cycle holds no readings to plot. The backup document, because the specification already commits to carrying user-facing settings wholesale and a missing value takes its default.
- **Tests:** table-driven engine tests for the estimator, the conditioning, the chain, and the protocol-band stop; calendar tests for projected cell resolution and the removed ovulation cue; settings, history, and legend tests for the added and removed elements.
- **No new dependency.**
