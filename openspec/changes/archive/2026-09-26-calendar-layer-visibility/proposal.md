# Proposal

## Why

The Calendar legend explains the visual vocabulary but cannot control it. Since the derived band began painting every past day inside a cycle rather than only days holding a record, a sparsely logged month renders almost entirely coloured, and a user who finds that overwhelming has no way to reduce it. The issue that tracks this (yodigi7/marquette-tracker#15) has been open since the band widened, and the need is now stronger than when it was filed.

## What Changes

- Every current Calendar legend entry becomes an independent visibility control that hides and restores that one visual layer, with a clear pressed state, a hollow swatch when hidden, and an unchanged label.
- The Calendar legend entries collapse to **nine** keys. The former `Predicted window` and `Projected` entries become a single `Predicted` key, because both are the same treatment — one grey/dashed forecast fill and one dashed border — and the shared visual vocabulary already requires a projected day to reuse the forecast cue.
- Recorded menses and a projected cycle's day 1 stop sharing one visual. Hiding `Menses` hides only what the user logged; the predicted first day of a future cycle is part of the `Predicted` layer, so hiding `Menses` no longer silently removes a forecast cue.
- The legend and the day cell are driven by one declaration of the nine layers, so a key that exists but paints nothing, or a treatment that is painted but unexplained, cannot occur.
- A `Show all` control restores every hidden layer **whose key is currently on screen**. A stored choice for a layer the legend is not currently offering is left untouched, so a control never changes something the user cannot see.
- Layer visibility is display-only. It changes no Day Record, no cycle placement, no engine output, no selection, no day-entry behavior, and no future-date rule. A day cell's accessible text continues to describe the reading and status that were actually determined, including for a layer whose visual is hidden.
- Visibility persists on the existing settings row as one list of hidden layer ids, defaults to nothing hidden, and is the only place these preferences live — the Settings screen is not given a second copy.

**BREAKING** (spec-level relaxation, not a data change): a projected day is no longer guaranteed to be distinguishable from a derived day once the user switches off `Predicted`. The existing non-color-cue requirement gains an explicit, user-initiated opt-out.

Issue #15's acceptance criteria are amended in two places: the predicted-ovulation marker is not a toggleable layer because the Calendar no longer produces one, and `Show all` restores the layers the legend currently offers rather than every stored hidden layer.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `calendar`: adds a requirement for legend-driven layer visibility; amends the legend-synchronization requirement so a hidden key's sample is a hollow swatch rather than a sample that matches a painted cell; amends the menses-stripe requirement so a projected day 1 belongs to the predictive layer rather than the raw-menses layer; amends the simple/full-detail requirement so the intercourse key is offered only in full detail.
- `fertility-visuals`: amends the legend requirement so a legend key may double as a visibility control with a distinct hidden state; amends the visual-layer requirement so the projected-day cue requirement carries a user opt-out.
- `app-settings`: adds a requirement for the persisted Calendar layer-visibility preference, including its default, its independence from the algorithm toggle, and its participation in backup and the data wipe.

## Impact

- Affected code: `src/features/calendar/index.tsx` (legend becomes interactive), `src/features/calendar/day-cell.tsx` and `src/features/calendar/grid.ts` (per-layer visibility checks; split the conflated menses flag), a new layer declaration under `src/features/calendar/`, the Calendar layer id type alongside the settings row, the settings defaults/merge path, and the backup settings validator.
- No new dependency.
- No change to the engine, to any stored Day Record or Cycle row, or to the data model beyond one settings field.
- Touches three existing capabilities, so `pnpm check` and `openspec validate --all` are both in scope.
