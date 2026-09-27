# Design

## Context

See `proposal.md` — Why. The shape of the current code that constrains this change:

- The Calendar legend (`src/features/calendar/index.tsx`) is a presentational block with three local `LegendItem`/`LegendDot`/`LegendStripe`/`LegendMonitorKey` helpers. It names the same palette constants the day cell names, independently. Nothing links the two, so "the legend matches the cells" is currently kept by review discipline rather than by construction.
- The day cell (`src/features/calendar/day-cell.tsx`) decides what to paint from five props. Its `statusFill` and `statusCue` are two independent class expressions derived from one `forecast` boolean, and its menses stripe is rendered from one `menses` boolean that is set both by a logged blood flow and by `dayNo === 1` on a projected cycle.
- All per-day resolution funnels through `resolveCell` in `src/features/calendar/grid.ts`, which returns a `CellInfo`. That is the single place where the conflated menses flag is produced.
- `algorithmEnabled` is applied in the Calendar view, not in the day cell: `info={interpreted ? cell.info : null}` and `forecast={interpreted ? cell.forecast : false}`. Derived layers are therefore already structurally impossible to paint with the algorithm off, independent of any visibility preference. A test already walks every cell in that mode.
- Settings live in one `SettingsEntity` row keyed `"main"`. `repos.settings.get()` merges `DEFAULT_SETTINGS` under the stored row so a field added later resolves to its default with no migration, and destructures retired fields out so they do not survive into later exports. The backup validator checks settings field by field and fails the whole restore on a bad value.
- The engine is pure and untouched. `core/engine` gains nothing; `core/store` gains one settings field.

## Goals / Non-Goals

**Goals:**

- Make "every legend entry is toggleable" and "every painted layer has an entry" structural properties rather than review promises.
- Keep the visibility preference a display concern end to end: no effect on records, cycle structure, engine output, selection, day entry, future dates, or accessible text.
- Touch the day cell's data shape in exactly one place (`resolveCell`) and nowhere else.
- Add no dependency and no migration.

**Non-Goals:**

- Changing the palette, the shape vocabulary, or what any layer means.
- The Cycle chart, its legend, or its overlay switches.
- Any second copy of the controls (Settings is explicitly excluded by the `app-settings` delta).
- Presets or bulk actions beyond `Show all`.

## Decisions

### D1 — One declaration of layers, read by both the legend and the day cell

A single ordered list of layer descriptors, each carrying: id, label, group, the condition under which its key is offered (algorithm / full detail / always), the palette classes it paints, and how its swatch is drawn. The legend renders from it; the day cell consults it for visibility.

**Why:** the failure mode this feature introduces is a switch that does nothing, or a treatment on screen that nothing explains. Both are silent — no crash, no failing assertion, just a lie in the UI. With nine layers, a shared declaration makes the invariant checkable in one place.

**Alternative considered:** a `Set<LayerId>` threaded to the day cell as a prop, with the legend continuing to name palette constants itself. Cheaper, and it is the smaller diff — but it leaves the legend and the cell free to drift, which is the exact problem the existing `fertility-visuals` legend requirement has to police by hand.

**Trade-off:** the day cell stops being a pure presentation function of its props and starts knowing about layer identity. Kept tolerable by keeping the list data, not logic.

### D2 — Layer ids live in the core settings module, rendering metadata lives in the feature

The settings row must be able to type its stored list, and `core/` may not import from `features/`. So the id union and the canonical id tuple sit next to the settings entity, exactly as `CalendarDetailMode` already does for the same reason. Labels, palette classes, and swatch shapes live with the Calendar feature.

**Why:** the codebase already has this exact precedent, and reusing it avoids a second pattern.

**Alternative considered:** store the list as plain `string[]` and validate in the Calendar. Fewer types, but the recognised-id set then has two sources of truth, and an unrecognised entry has nowhere canonical to be checked against.

### D3 — Store hidden ids, not visible flags

One settings field holding the ids the user has hidden. Absent means visible, so `DEFAULT_SETTINGS` carries `[]` and a settings row written before this field existed resolves to everything shown with no migration.

**Why:** the alternative — nine booleans — makes "visible" the default that must be repeated nine times in the defaults, in the backup validator, and in every future reader, and makes `Show all` a nine-field write. It also makes an unrecognised key from a restored backup indistinguishable from a real setting, whereas an unrecognised _id_ is a value that can simply be filtered out.

**Backup validation:** the validator checks the field is an array of strings and filters the result to recognised ids. It never fails a restore over an unrecognised id. This matters because `formatVersion` gates whole documents, but a new layer id added under an unchanged format version would otherwise make an older build reject a newer backup outright — a display preference should never cost someone their data.

### D4 — Hiding is visual; announcing is not

The day cell's `aria-label` continues to include the phase label, the monitor reading, menses, intercourse, and projection regardless of which layers are hidden.

**Why:** `fertility-visuals` already requires the colour-only monitor marker to stay paired with accessible text. If hiding the marker also removed the text, the layer's own accessibility guarantee would be revoked by a cosmetic preference. The stated motivation for hiding a layer is visual density, which does not apply to a user who never sees the colour. A day whose band is hidden is still a fertile day, and the app should not claim otherwise to a screen-reader user.

**Alternative considered:** hiding a layer removes it from the accessible description too, for a literal reading of "hidden". Rejected: it makes a display preference able to reduce information, which no acceptance criterion asks for and which contradicts the non-color requirements.

### D5 — `Show all` acts on the keys currently on screen

Restoring clears the stored hidden ids for the layers whose keys the legend is currently rendering. Anything else is left alone.

**Why:** the rule is _a control only changes what it can show you_. The set of currently-offered keys is already computed for rendering, so the reset reuses that predicate rather than adding a second notion of "applicable". It also keeps the button honest: whenever `Show all` is present, the layers it governs are exactly the ones on screen.

**Alternative considered:** clear every stored hidden id unconditionally. Simpler to state, and it makes the button's presence imply "nothing is hidden anywhere". Rejected because it silently re-enables a layer the user cannot currently see or undo.

**Accepted cost:** a user who hides `Fertile`, turns the algorithm off, then uses `Show all` to un-hide menses, finds the band still hidden when the algorithm returns. Every step is required for this to happen, and the error is in the safe direction — more information, not less.

### D6 — One predictive key, and the menses split

Two design points that only make sense together:

1. `Predicted window` and `Projected` become one `Predicted` key. Both are the same treatment — one dashed border, with a forecast fill as the fallback where no phase is known — and `fertility-visuals` already requires a projected day to reuse the forecast cue. Two keys would let a user hide the cue for one case and not the other, inventing a distinction the vocabulary deliberately refuses to make. The key is offered whenever interpretation is on, not only when projection is painting, so it does not appear and disappear with the projection setting.
2. `resolveCell` returns the predicted cycle start as a separate flag from recorded menses. A projected day is `menses: false, cycleStart: true`. The stripe asks which layer may paint it.

**Why:** menses means "the user logged this"; the projected start means "we think this is where the next period begins". Conflating them means one control silently removes a _prediction_, which is the kind of quiet loss of signal that erodes trust in the forecast more than a busy calendar does.

**Alternative considered:** leave the conflation and let `Menses` hide both. One fewer field, but the semantics of a layer depend on whether a day is real or projected, which is the property D1 exists to eliminate.

**Naming:** the merged key reads `Predicted`. `Predicted & projected` does not fit a chip, and one word covers both readings.

### D7 — Hollow swatch, unchanged label

A hidden key renders an outlined version of its own swatch shape and keeps its label at full contrast. Hidden state is exposed as `aria-pressed="false"`.

**Why:** the label is the only way to find the key again, so it must stay maximally readable. Hollowing the swatch reads as "the shape, not the colour" — the layer exists, it is just not painted — and it works for all four swatch shapes (square, stripe, dot, icon) without a special case per shape.

**Alternatives considered:** dimming the label as well (rejected — it makes the hidden key the hardest thing on the page to read, and reading it is the only route to undoing the hide); a line-through on the label (rejected — struck-through 11px text is hard to read and reads as deprecated rather than inactive).

**Note on the spec:** this is why `calendar`'s legend requirement is amended. It currently promises that legend samples match day-cell treatments, which is untrue for a hidden layer by definition. The amended wording keeps the match requirement for shown entries and gives hidden entries their own hollow treatment.

### D8 — `Show all` sits in the existing legend control row

The legend block already owns a right-aligned control row holding the simple/full-detail presentation control. `Show all` joins it, and is omitted when nothing is hidden.

**Why:** no new structural element, and it keeps every legend-adjacent control in one place. Presenting it only when it has work to do avoids a permanently inert button.

**Risk accepted:** the control row is the bottom-most element in the legend, and on the narrowest phones the legend already reaches the fold. Turning nine labels into controls adds height. This is the reason the alternative of a sheet or popover was considered and declined — the legend is where a user looks to decode a colour, and one tap there beats two taps through a hidden affordance. If the fold turns out to be a real problem in use, the control row is the seam to move.

## Risks / Trade-offs

- **Vertical space on small phones** → nine controls at a usable touch height add roughly one legend row's worth of height to a page that already reaches the fold around 375x667. Accepted deliberately (D8). Verify against the real narrow viewport during apply, not against a desktop width.
- **A layer exists in the list but nothing consults it** → structurally possible, since the list is data. Mitigation: a test that asserts the number of offered keys equals the number of layers whose conditions are met, plus a test that hides each layer in turn and asserts the corresponding class is gone from a cell that would otherwise paint it. The table-driven form of this test is the main test asset of the change.
- **The day cell grows a layer-visibility prop and starts branching per layer** → keep the branch count at one: the cell asks "is this layer shown" for each thing it was already going to paint. No new conditional painting logic, only suppression of existing logic.
- **`resolveCell`'s output shape changes** → `grid.test.ts` asserts on `CellInfo`; the existing assertion that no ovulation key is present stays, and the new flag is additive. Any caller constructing `CellInfo` by hand must supply the new field, which the compiler will point at.
- **An older build restoring a newer backup** → mitigated by lenient id filtering (D3) rather than by strict validation.
- **The projected-day cue becomes user-removable** → a real relaxation of a `fertility-visuals` guarantee, stated as such in the delta rather than left for someone to discover. Mitigated by D4: the day is still reported as projected in accessible text even with the cue hidden.

## Migration Plan

None. The preference defaults to nothing hidden through the existing settings-merge path, so a row written before this change needs no rewrite and a user sees no change on upgrade. Rollback is removing the field and the controls; stored rows would carry an orphaned key, which the retired-field destructuring in `repos.settings.get()` already handles by dropping it from reads and from later exports.

## Open Questions

None. Every point that would have changed a spec, the approach, or the task breakdown was settled during exploration: the layer set, the predictive merge, the menses split, control placement, hidden appearance, `Show all` scope, the accessible-text stance, and the storage shape.
