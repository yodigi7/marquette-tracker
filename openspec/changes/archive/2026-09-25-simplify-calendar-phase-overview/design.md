# Design

## Context

`src/features/calendar/day-cell.tsx` currently renders a derived status/source treatment and a small marker row containing monitor, intercourse, assumed-data, menses, and ovulation indicators. `src/features/calendar/index.tsx` renders a flat legend containing every active visual category. The engine already exposes the precise `DayStatus` values and `DayInfo` source values, so the simplification can be implemented as a presentation mapping without changing calculations or records.

The current shared visual tokens live in `src/lib/fertility-visuals.ts` and `src/index.css`. The dark-mode visual work established theme-aware tokens and contrast targets. The Calendar has existing component tests in `src/features/calendar/__tests__/calendar.test.tsx` and `postPeakFill.test.tsx`; the grid resolution logic is in `grid.ts`.

GitHub issue #15 owns independent legend visibility. This change should define the phase-first default and a full-detail presentation, while sharing the same visibility/preference mechanism rather than adding a second competing state model.

## Goals / Non-Goals

**Goals:**

- Make the default Calendar readable at a glance on mobile.
- Map the existing four engine statuses to the three user-facing categories `Before`, `Fertile`, and `After` only at the Calendar presentation boundary.
- Add a current-cycle summary that surfaces cycle day, simplified status, and monitor reading.
- Replace the menses dot with a bottom stripe and the assumed-data dot with a date-adjacent asterisk.
- Use one monitor marker shape with color-coded Low/High/Peak values.
- Provide a full-detail presentation that preserves the existing richer indicators and day-detail editing surface.
- Keep the visual system theme-aware, accessible, and synchronized across the active presentation.

**Non-Goals:**

- Changing the Marquette engine, status calculation, fertile-window rules, cycle placement, or data reconciliation.
- Changing what data is stored in `Cycle` or `DayRecord` entities.
- Replacing the Status view, day-entry dialog, or Cycle chart.
- Creating a separate marker vocabulary for each monitor value.
- Introducing a new dependency or a new color palette unrelated to the existing tokens.

## Decisions

### 1. Map statuses at the Calendar presentation boundary

Add a small typed presentation mapping in the Calendar feature (or a shared display utility if the existing visual module is the established owner):

```text
pre-fertile   -> before
fertile       -> fertile
post-peak     -> after
post-calendar -> after
```

The original `DayInfo.status` remains available to `DayCell` data attributes, the Status view, accessible detail text, and future full-detail behavior. Only the default Calendar background and human-facing label use the collapsed phase category.

**Alternative considered:** Change the engine's `DayStatus` union to three values. Rejected because it would erase the meaningful post-peak versus post-calendar distinction from all consumers and couple a presentation change to the pure engine.

### 2. Add a dedicated `CalendarSummary` presentation component

Extract the summary into a focused Calendar component rather than adding more conditional JSX to the grid. It will derive the current cycle, cycle day, simplified phase, and monitor reading from existing store selectors/output data. It will render explicit states for no cycle, no monitor reading, and logging-only mode.

The summary is read-only and does not open or replace the day-entry dialog. The day cell remains the only grid interaction target.

**Alternative considered:** Put the summary in the Status view. Rejected because the user needs the current answer beside the month grid, especially on mobile, while Status remains the date-selectable detail surface.

### 3. Use a layered `DayCell` layout

Refactor the cell into a small, predictable hierarchy:

1. simplified status background;
2. date number with an optional assumed-data asterisk;
3. a bottom-positioned menses stripe;
4. one larger color-coded monitor marker;
5. an optional full-detail indicator area.

The default cell will not render a multi-dot marker row for secondary indicators. Full detail can render the existing intercourse/ovulation/source/forecast treatments in a controlled secondary area. CSS should use a pseudo-element or absolutely positioned element for the stripe so it cannot affect the number/marker layout.

The monitor marker will use one shape for Low, High, and Peak. Color remains the value encoding, and the exact value is exposed through the summary, day details, and the day cell's accessible name.

**Alternative considered:** Keep separate shapes for Low/High/Peak. Rejected because the values share a semantic category and separate shapes add a second decoding system without improving the primary glance experience.

### 4. Use a single persisted presentation preference

Add a `calendarDetailMode` preference with `simple` and `full` values, defaulting to `simple`, using the existing settings persistence path. It should be backward-compatible: missing values on existing settings rows or restored backups resolve to `simple`. The full-detail mode controls only Calendar presentation and does not affect Status, the engine, or stored records.

Coordinate the field/selector naming with #15 so legend visibility and full-detail presentation use one preference model. If #15 introduces granular layer visibility, full detail should be a presentation preset over those shared visibility rules rather than a parallel state machine.

**Alternative considered:** Keep the mode in component state only. Rejected because the user chose a persistent display preference in the related legend work and a full-detail view is more useful when it survives navigation and reloads.

### 5. Make the legend presentation-aware

The simple legend becomes two grouped rows/sections:

- Status: `Before`, `Fertile`, `After`;
- Data: menses stripe, a grouped Monitor key for Low/High/Peak, and `* Assumed`.

The forecast may retain one subtle dashed/predictive treatment, but source/provenance detail is not duplicated across the default legend. Full detail shows the additional active legend entries and keeps the same sample-to-cell mapping rule.

The legend is a view over the shared visual tokens; it must not become a second source of truth for status or marker meaning.

**Alternative considered:** Keep one flat legend and only shrink the swatches. Rejected because the number of entries, not only their size, is the main source of cognitive load.

### 6. Preserve accessibility through text equivalents

The day cell's accessible name will include the date, simplified phase, monitor value when present, menses state, and assumed provenance. The asterisk is accompanied by an accessible description rather than being the only indication of inferred data. Color-coded monitor values must also be available as text in the summary, full-detail surface, or dialog.

Theme tokens remain the source of light/dark values. The menses stripe and status boundaries must meet the existing contrast targets, and manual QA must cover 320px, desktop, light, dark, algorithm-on, and algorithm-off states.

## Risks / Trade-offs

- **Collapsing `post-peak` and `post-calendar` may hide an important confidence distinction** -> Keep the exact status in the Status view, full detail, and accessible text; label the default category as the intentionally broad `After`.
- **Color-only monitor encoding may be difficult for color-vision-limited users** -> Provide the exact value in the summary/details and accessible name, and keep the grouped monitor key in the legend.
- **A bottom stripe may be too subtle at small cell sizes** -> Use a fixed minimum thickness, ensure it does not reduce the day-number hit area, and verify it at 320px in both themes.
- **A persisted display field can affect backup compatibility** -> Use a defaulting merge, include the field in versioned settings backups when supported, and do not require a data migration for existing records.
- **Two changes may both modify legend behavior (#15 and this change)** -> Establish the shared display-preference contract before implementation and keep the Calendar legend rendering in one place.
- **Existing tests assert the old marker structure** -> Update tests deliberately to assert the new observable contract rather than preserving obsolete `title`-based marker expectations.

## Migration Plan

No cycle or day-record migration is required. Add the display preference with a default of `simple`; existing settings rows and older backups without the field resolve to that default. Rollback is a presentation-only revert: stored records, engine output, and interpretation remain unchanged.

## Files and Test Areas

Expected implementation touchpoints:

- `src/features/calendar/index.tsx` — summary placement, display mode, legend composition, and data flow.
- `src/features/calendar/day-cell.tsx` — phase, stripe, asterisk, monitor marker, and full-detail layers.
- `src/features/calendar/grid.ts` — presentation inputs only if the phase/marker mapping is kept near cell resolution.
- `src/features/calendar/summary.tsx` (new, if the extracted component remains local) — summary rendering and empty/logging-only states.
- `src/lib/fertility-visuals.ts` and `src/index.css` — phase aliases, monitor/menses/provenance treatments, and theme tokens.
- `src/core/store/entities.ts` and settings selectors/store tests — only if the persisted `calendarDetailMode` preference is added.
- `src/features/calendar/__tests__/calendar.test.tsx` and related Calendar tests — default/simple, full detail, summary, menses, monitor, asterisk, algorithm-off, and accessibility behavior.
- `src/lib/__tests__/fertility-visuals.test.ts` — token/mapping coverage where the shared mapping is extended.

No pure engine test change is expected because the engine's four statuses and data semantics remain unchanged.
