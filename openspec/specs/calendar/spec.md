# Calendar Specification

## Purpose

The Calendar's per-day entry dialog lets the user log or view any day up to and including today, and re-derives cycle structure from logged days using a menses-run placement rule.

## Requirements

### Requirement: Day entry opens for any date up to today

Clicking a date in the Calendar SHALL open the day-entry form for any date up to and including today. If a Day Record already exists for that date, the form SHALL open pre-populated with that record's values; otherwise it SHALL open as the same blank form, ready for input. In both cases the form SHALL offer the full set of daily fields (monitor reading, mucus, blood flow, BBT, intercourse, symptoms, pregnancy test, notes). Closing the dialog without saving SHALL create or modify nothing.

#### Scenario: Logging the first day after a wipe

- **WHEN** the app has no data and the user clicks a past date in the Calendar
- **THEN** the day-entry form opens blank and ready for input, and saving the entry stores a Day Record for that date

#### Scenario: Existing entry is pre-populated

- **WHEN** the user clicks a date that already has a Day Record with readings
- **THEN** the form opens showing those readings, and saving preserves them alongside any edits

#### Scenario: Open without saving changes nothing

- **WHEN** the user opens the day-entry form for a date and closes the dialog without saving
- **THEN** nothing is created or modified for that date

### Requirement: Day-entry dialog is a logging surface

The Calendar day-entry dialog SHALL provide daily input and edit/delete actions without rendering a computed fertile-window status, status source, or forecast explanation. Derived status remains available in the read-only Status view.

#### Scenario: Dialog opens without derived status

- **WHEN** the user opens the Calendar day-entry dialog with interpretation enabled
- **THEN** the dialog opens with the date and daily-entry fields
- **AND** it does not display a computed fertile-window status or source

#### Scenario: Logging-only behavior remains consistent

- **WHEN** the algorithm is disabled
- **THEN** the dialog does not display computed status
- **AND** the user can still log or edit the daily fields

### Requirement: Future dates cannot be logged

The app MUST NOT save a Day Record for any date after today, from any entry point. Attempting to do so SHALL be rejected with a clear message and SHALL leave no record behind.

#### Scenario: Future date rejected

- **WHEN** the user attempts to log an entry for a date later than today (for example from the Calendar date dialog)
- **THEN** the app shows a message that future dates cannot be logged and writes no record

### Requirement: Backfilled days are grouped into cycles by menses runs

Day Records SHALL be partitioned into cycles by the menses-run placement rule. Each logged day is Menses (M), No-menses (N), or no data (0, not logged). A new cycle SHALL begin at the first logged day, and at every M day whose previous logged day, ignoring any 0 days in between, is an N. 0 days SHALL NOT break a cycle on their own; only an explicit N day does. A leading run of N days before the first M day SHALL form its own single cycle with no menses recorded yet, its Day 1 being the first N day. N days after a Menses day SHALL continue that day's cycle. The rule SHALL be applied globally so that logging history in any order groups the days into the same cycles.

#### Scenario: Consecutive menses days group as one cycle

- **WHEN** the user logs a run of menses days with only no-data days around them (for example M000M0NNNNNN where 0 means no data)
- **THEN** the whole logged range belongs to a single cycle whose Day 1 is the first M day, since no explicit No-menses day lies between the menses days

#### Scenario: A logged non-menses day starts a new cycle

- **WHEN** a Menses day is logged immediately after a logged No-menses day (for example the first M of NNNNNNMMMMNNNN)
- **THEN** a new cycle begins on that M day, the preceding N run remains its own single cycle, and the trailing N days continue the new cycle

#### Scenario: Random-chunk logging produces stable grouping

- **WHEN** the user backfills records in scattered chunks and in different order (for example logging a later menses day first, then an earlier menses day that fills the run backward)
- **THEN** the days are grouped into the same cycles a single forward pass would produce, with no per-day cycle created for each chunk

### Requirement: Cycle structure is re-derived from all logged days on every save

Saving a Day Record SHALL re-derive the complete cycle structure from the full set of logged days in one pass. No cycle SHALL be exempt from re-derivation: records, Day 1 values, cycle boundaries, and open/closed state may all change, including for the live current cycle. The placement rule's boundaries SHALL apply, except that a date the user explicitly declared as a cycle start SHALL always begin a cycle. The last cycle in the derived order SHALL be open; every earlier cycle SHALL close on the day immediately before the next cycle begins. Cycle numbers SHALL reflect the derived order. Derived cycles SHALL appear in history, predictions, and stats like any other cycle.

#### Scenario: Backfilled menses merge into a later-logged cycle

- **WHEN** the user logs a menses day on 20 Mar, then later adds a menses day on 15 Mar with no logged No-menses day between them
- **THEN** both days belong to a single cycle whose Day 1 is 15 Mar, and no separate cycle remains for 20 Mar

#### Scenario: The live cycle is not protected

- **WHEN** the user is tracking a current cycle and backfills a menses day that the placement rule groups with that live cycle
- **THEN** the live cycle's Day 1 moves to the earlier menses day, its records are re-assigned accordingly, and no empty leftover cycle remains

#### Scenario: Explicitly started cycles remain boundaries

- **WHEN** the user starts a cycle on 1 Mar, then logs days on 1 Mar and 14 Mar
- **THEN** both records belong to the 1 Mar cycle and the 14 Mar record is cycle day 14

#### Scenario: Backfilled cycles feed history and predictions

- **WHEN** backfilled days form one or more cycles
- **THEN** those cycles appear in the cycle history, influence cycle-length stats and next-period predictions, and are labeled no differently from other cycles

### Requirement: Calendar opens today's input when it is needed

When the Calendar becomes available on a date within a browser session, it SHALL automatically open today's day-entry dialog at most once for that date when no Day Record exists for today, the cycle derived for today has no user-entered monitor Peak, and the date has not already been auto-opened during that browser session. It SHALL NOT auto-open when today's record exists or when the current derived cycle has a monitor Peak. Mucus values, including mucus Peak, SHALL remain visible and SHALL NOT suppress auto-open under the monitor-only engine contract.

#### Scenario: Eligible first opening

- **WHEN** the Calendar opens for a date with no record for today, no monitor Peak in the cycle derived for today, and no prior auto-open for today in the browser session
- **THEN** the day-entry dialog opens with today selected

#### Scenario: Today's record already exists

- **WHEN** the Calendar opens and a Day Record already exists for today
- **THEN** the day-entry dialog does not open automatically

#### Scenario: Current cycle already has a Peak

- **WHEN** the Calendar opens and the cycle derived for today has a user-entered monitor Peak
- **THEN** the day-entry dialog does not open automatically
- **AND** multiple monitor Peak readings in the cycle continue to suppress automatic opening

#### Scenario: Mucus-only Peak does not suppress auto-open

- **WHEN** the Calendar opens for a date with no record for today and the derived cycle has a mucus Peak but no user-entered monitor Peak
- **THEN** the day-entry dialog is eligible to open automatically if no prior auto-open has been consumed

#### Scenario: Date was already auto-opened

- **WHEN** the Calendar is opened again during the same browser session after today's dialog was already auto-opened
- **THEN** the day-entry dialog does not open automatically for that date

#### Scenario: No cycle has been derived yet

- **WHEN** no cycle has been derived for today and no record exists for today
- **THEN** the day-entry dialog opens with today selected so the first record can establish the cycle through placement rules

### Requirement: The current cycle is determined by today's date

The system SHALL determine the current cycle by resolving the cycle that owns today's date after placement. Before today's menses record is saved, today SHALL remain part of the previous cycle; saving a menses record for today MAY create a new cycle whose first day is today.

#### Scenario: Menses starts a new cycle today

- **GIVEN** the derived sequence contains a run of Menses records followed by No-menses records and today's date is the next Menses record
- **WHEN** today's menses record is saved
- **THEN** today is assigned to a new cycle
- **AND** the earlier records remain in their prior cycle

#### Scenario: Today is not yet logged

- **GIVEN** today has no Day Record and the preceding derived cycle has no Peak
- **WHEN** the current cycle is resolved before input
- **THEN** today is evaluated as part of the preceding cycle

### Requirement: Calendar provides a phase-first cycle summary

The Calendar SHALL provide a compact summary above the day grid that identifies the current cycle number, cycle day, simplified fertility status, and current monitor reading when one is available. The summary SHALL remain readable at narrow mobile widths and SHALL NOT replace or prevent the day-entry interaction.

#### Scenario: Summary shows the current interpreted state

- **WHEN** the Calendar is displayed with interpretation enabled and a current cycle is available
- **THEN** the summary shows the cycle number, cycle day, `Before`, `Fertile`, or `After` status, and the current monitor reading when present

#### Scenario: Summary handles a missing monitor reading

- **WHEN** the current cycle or day has no monitor reading
- **THEN** the summary remains visible with a clear no-reading state rather than showing a misleading marker

#### Scenario: Summary remains useful while interpretation is disabled

- **WHEN** the algorithm is disabled
- **THEN** the summary remains visible with available cycle/day and raw information
- **AND** it clearly identifies the state as logging-only without showing a derived fertility status

#### Scenario: Summary handles no derived cycle

- **WHEN** no cycle has been derived for the current date
- **THEN** the summary shows a clear no-cycle state and does not invent a cycle number or status

### Requirement: Calendar supports simple and full-detail presentation

The Calendar SHALL use a simple phase-first presentation by default and SHALL provide an accessible way to reveal the richer existing indicators in a full-detail presentation. Changing presentation SHALL NOT change stored records, engine output, interpretation, day-entry behavior, the presence or absence of projected cycles, or any stored layer-visibility choice.

The `Intercourse` visibility entry SHALL be offered only in the full-detail presentation, because the simple presentation does not paint the marker it controls. A stored `Intercourse` choice SHALL be preserved across a change of presentation in either direction.

#### Scenario: Simple presentation is the default

- **WHEN** the Calendar is opened without a previously selected full-detail preference
- **THEN** the grid emphasizes the simplified status, menses treatment, and monitor reading
- **AND** secondary indicators do not compete with those primary cues

#### Scenario: User reveals full detail

- **WHEN** the user enables the full-detail presentation
- **THEN** the richer existing indicators, including available intercourse and forecast cues, are available without changing any record
- **AND** full detail exposes no status-source or record-provenance indicator
- **AND** full detail exposes no single-day ovulation estimate, because the Calendar no longer produces one

#### Scenario: Day details remain complete

- **WHEN** the user opens a day from either presentation
- **THEN** the existing full day-entry/detail surface remains available with all original fields and editing actions

#### Scenario: The intercourse control belongs to full detail

- **WHEN** the simple presentation is active
- **THEN** the legend does not offer the `Intercourse` visibility entry
- **AND** switching to full detail offers it and reveals the stored choice for that layer

### Requirement: Calendar uses a bottom menses stripe and one color-coded monitor marker

The Calendar SHALL represent recorded menses with a visible stripe along the bottom edge of the day cell. It SHALL use that same stripe treatment for a projected cycle's day 1 when cycle projection is enabled, and that stripe SHALL be presented as a prediction rather than as a logged observation, so that it is governed by the predictive layer rather than the raw-menses layer. It SHALL use one common monitor marker shape and SHALL encode Low, High, and Peak by color, with the exact reading available through the summary, details, and accessible text.

#### Scenario: Menses is visible over a status background

- **WHEN** a Calendar day is a recorded menses day
- **THEN** the day cell shows the bottom menses stripe regardless of the cell's simplified status treatment

#### Scenario: Projected day one uses the same stripe

- **GIVEN** cycle projection is enabled
- **WHEN** the Calendar renders a projected cycle's day 1
- **THEN** the day cell shows the bottom menses stripe
- **AND** the cell's projected treatment distinguishes it from a recorded menses day
- **AND** hiding the `Menses` layer does not remove that stripe

#### Scenario: Monitor reading is visible

- **WHEN** a Calendar day has a user or displayed monitor reading
- **THEN** the cell shows one monitor marker whose color identifies Low, High, or Peak
- **AND** Low, High, and Peak do not use different marker shapes

#### Scenario: Monitor value is available without decoding color

- **WHEN** a user inspects a day with a monitor marker
- **THEN** the exact Low, High, or Peak value is available in the summary, day details, or accessible label

### Requirement: Intercourse heart marker

The Calendar SHALL preserve the small filled red heart treatment for recorded intercourse in the full-detail presentation and SHALL provide the same marker meaning there. The simple presentation MAY omit the heart from the day cell to reduce visual density, but the record SHALL remain available in the day-entry/detail surface.

#### Scenario: Intercourse recorded on a day

- **WHEN** a Calendar day has intercourse recorded and full detail is shown
- **THEN** the day cell displays a small filled red heart
- **AND** the former green dot is not used for intercourse

#### Scenario: Intercourse legend

- **WHEN** the full-detail Calendar legend is displayed
- **THEN** the Intercourse entry displays a small filled red heart
- **AND** the entry uses the same marker treatment as the full-detail day cell

#### Scenario: Intercourse is available in the simple presentation

- **WHEN** a Calendar day has intercourse recorded and the simple presentation is active
- **THEN** the day-entry/detail surface still exposes the intercourse value
- **AND** the simple grid is not required to show the heart

#### Scenario: No intercourse recorded

- **WHEN** a Calendar day has no intercourse record
- **THEN** the day cell does not display an intercourse heart

### Requirement: Calendar legend stays synchronized with day cells

The Calendar legend SHALL match the colors, borders, line styles, and marker shapes used in the active presentation. The default legend SHALL be grouped around the three simplified status categories, the predictive treatment, the menses stripe, and the color-coded monitor readings. The predictive treatment SHALL be described by a single entry covering both the next-window forecast and projected cycle days, because both use the same predictive cue. A full-detail legend SHALL additionally offer the secondary indicator that the full-detail presentation exposes.

Each entry SHALL describe exactly one layer that the day cells can paint, and every layer the day cells can paint SHALL have an entry. A hidden entry SHALL render a hollow swatch rather than the colour sample, so a hidden entry is distinguishable from a shown one without relying on colour alone, and its label SHALL remain unchanged.

#### Scenario: Simplified legend covers the default vocabulary

- **WHEN** the simple Calendar legend is displayed
- **THEN** it explains `Before`, `Fertile`, `After`, the predictive treatment, menses, and monitor readings
- **AND** its samples match the corresponding day-cell treatments

#### Scenario: Post-calendar state is explained

- **WHEN** the Calendar legend is displayed
- **THEN** a legend entry describes the `After` treatment used for post-calendar cells
- **AND** the entry uses the same visual treatment as the corresponding day cell

#### Scenario: The projected treatment is explained when projection is on

- **GIVEN** cycle projection is enabled
- **WHEN** the Calendar legend is displayed
- **THEN** the legend's single predictive entry carries the dashed cue that projected day cells use
- **AND** the entry identifies that treatment as predictive rather than recorded
- **AND** no second entry claims a distinct projected-day treatment

#### Scenario: No ovulation estimate is listed

- **WHEN** the Calendar legend is displayed in either presentation
- **THEN** it contains no entry for a predicted ovulation day

#### Scenario: Full-detail legend covers extra indicators

- **WHEN** the full-detail presentation is displayed
- **THEN** the legend offers the `Intercourse` entry alongside the always-available entries
- **AND** it contains no status-source or record-provenance entry

#### Scenario: A hidden entry is visibly distinct

- **WHEN** a legend entry's layer is hidden
- **THEN** that entry renders a hollow swatch and an unchanged label
- **AND** every shown entry still renders its colour sample

#### Scenario: Every painted layer has an entry

- **WHEN** the Calendar paints a visual layer in a day cell
- **THEN** a legend entry exists for that layer and can hide it

#### Scenario: Theme-specific legend samples remain synchronized

- **WHEN** the user switches between light and dark themes
- **THEN** legend samples and day-cell treatments change together
- **AND** no legend sample refers to a stale light-only treatment

### Requirement: Calendar legend entries are independent visibility controls

Every entry the Calendar legend offers SHALL be an accessible control that hides and restores that entry's own visual layer and SHALL affect no other layer. Activating an entry whose layer is shown SHALL hide that layer; activating the same entry again SHALL restore it. A hidden entry SHALL remain present in the legend, SHALL keep its label readable and unchanged, and SHALL render a hollow swatch in place of its colour sample so the hidden state is visible without relying on colour alone. Each entry SHALL expose its current state to assistive technology as a pressed or checked state.

Hiding a layer SHALL change only what the Calendar displays. It SHALL NOT create, modify, or remove any Day Record, SHALL NOT change cycle placement, cycle boundaries, cycle numbering, or open/closed state, SHALL NOT change any engine output, SHALL NOT change which date is selected, SHALL NOT change the contents or behavior of the day-entry dialog, and SHALL NOT change the rule that future dates cannot be logged. The day number, the day cell's click target, and the today indicator SHALL remain available when every hideable layer is hidden. The selected day is expressed by the open day-entry dialog rather than by a treatment on the day cell, so no cell-level selection indicator exists to be hidden; the dialog is not a layer and is not affected by a visibility choice.

A day's accessible description SHALL continue to report the status, monitor reading, menses, intercourse, and projection determined for that date, whether or not the corresponding visual layer is currently shown.

The `Menses` layer SHALL cover only menses the user recorded. The stripe on the first day of a projected cycle is a prediction rather than a logged observation, SHALL belong to the predictive layer, and SHALL NOT be removed by the `Menses` control.

#### Scenario: Hiding the menses layer

- **WHEN** the user activates the `Menses` legend entry
- **THEN** menses stripes disappear from Calendar day cells
- **AND** the entry shows a hollow swatch, keeps its label, and reports itself as not pressed
- **AND** the logged blood flow for those days is unchanged and still editable in the day-entry dialog
- **AND** cycle placement is unchanged

#### Scenario: Every legend entry controls only its own layer

- **WHEN** the user hides any one legend entry and leaves the others shown
- **THEN** only that entry's visual layer is absent from the day cells
- **AND** every other entry's visual layer is still painted

#### Scenario: Restoring a hidden layer

- **WHEN** the user activates a legend entry whose layer is hidden
- **THEN** that layer is painted again
- **AND** the entry's swatch returns to its colour sample and it reports itself as pressed

#### Scenario: Hidden layers do not change stored data or interpretation

- **GIVEN** at least one layer is hidden
- **WHEN** the user opens a day and reads or edits its entry, changes month, or selects another date
- **THEN** the day-entry dialog shows the same fields and values it would show with every layer shown
- **AND** no stored record, cycle, or computed status differs

#### Scenario: Accessible text survives a hidden layer

- **GIVEN** the `Peak` monitor marker and the fertile band are both hidden
- **WHEN** assistive technology reads a day that has a monitor Peak and a fertile status
- **THEN** the day's accessible description still reports the monitor Peak and the fertile status

#### Scenario: Hiding menses leaves the predicted cycle start visible

- **GIVEN** cycle projection is enabled and the `Menses` layer is hidden
- **WHEN** the Calendar renders the first day of a projected cycle
- **THEN** that day still shows the predicted cycle-start stripe
- **AND** the stripe is hidden when the predictive layer is hidden instead

#### Scenario: Only the derived layers disappear when interpretation is off

- **GIVEN** the algorithm is disabled
- **WHEN** the user views the Calendar legend
- **THEN** the derived entries are not offered
- **AND** the raw-data entries remain available as controls

#### Scenario: Hiding every layer leaves the grid usable

- **WHEN** the user hides every available layer
- **THEN** each day still shows its day number, remains selectable, and still shows the today indicator on today

#### Scenario: Visibility choices survive month paging and view changes

- **GIVEN** at least one layer is hidden
- **WHEN** the user pages to another month, or navigates to another view and returns to the Calendar
- **THEN** the same layers are still hidden

### Requirement: Show all restores the layers the legend currently offers

The Calendar SHALL provide a `Show all` control that restores every hidden layer whose legend entry is currently offered, and SHALL leave a stored choice untouched for any layer whose entry is not currently offered. The control SHALL be absent or inert when no layer is hidden. It SHALL be presented alongside the existing presentation control in the legend area.

Restoring layers SHALL change only what the Calendar displays and SHALL NOT modify any stored record, cycle, or engine output.

#### Scenario: Show all restores what the legend shows

- **GIVEN** the `Menses` and `Fertile` layers are hidden and the algorithm is enabled
- **WHEN** the user activates `Show all`
- **THEN** both layers are painted again and every entry shows its colour sample
- **AND** no stored record or computed status changed

#### Scenario: Show all does not touch layers the legend is not offering

- **GIVEN** the `Fertile` layer is hidden, the algorithm is then disabled, and the `Menses` layer is also hidden
- **WHEN** the user activates `Show all`
- **THEN** the `Menses` layer is restored
- **AND** the stored `Fertile` choice is unchanged
- **AND** re-enabling the algorithm shows the `Fertile` layer still hidden

#### Scenario: Show all is inert when nothing is hidden

- **WHEN** no layer is hidden
- **THEN** activating `Show all` changes nothing

### Requirement: Calendar remains legible at narrow mobile widths

The Calendar SHALL keep the day number, simplified status, menses stripe, monitor marker, and future forecast cue distinguishable at narrow mobile viewport widths. The presentation SHALL use accessible text or equivalent non-color cues where color alone would not communicate a reading.

#### Scenario: Narrow Calendar review

- **WHEN** the user views the Calendar at a narrow mobile width in either theme
- **THEN** the day number and important state cues remain visually separable
- **AND** the monitor reading is available through accessible text or detail surfaces
- **AND** the most important status/forecast distinctions do not rely on color alone

### Requirement: Calendar derives a status for every day in a cycle

The Calendar SHALL resolve a derived status for any date that falls inside a cycle, whether or not a Day Record exists for that date, and SHALL paint that status. A date SHALL NOT receive a derived-status fill solely because a record happens to exist; the fill SHALL come from the cycle's computed window. The default presentation SHALL use the three human-facing categories `Before` (`pre-fertile`), `Fertile` (`fertile`), and `After` (`post-peak` or `post-calendar`) with theme-appropriate treatments in both light and dark modes, and the precise internal status SHALL remain available in the Status view, full-detail presentation, and accessible details.

#### Scenario: Post-Peak fertile days are painted without records

- **GIVEN** a cycle with a monitor Peak on day 12 and a configured post-Peak interval of 4
- **WHEN** the Calendar renders days 13 through 16, which hold no records
- **THEN** each of those cells shows the `Fertile` treatment
- **AND** none of them appears blank

#### Scenario: Post-window days are painted without records

- **GIVEN** a cycle with a monitor Peak on day 12
- **WHEN** the Calendar renders days 17 and later in that cycle, which hold no records
- **THEN** each of those cells shows the `After` treatment

#### Scenario: Pre-fertile days are painted without records

- **WHEN** the Calendar renders days before a cycle's computed window begin and no records exist for them
- **THEN** each of those cells shows the `Before` treatment

#### Scenario: Simplified statuses remain distinct

- **WHEN** the Calendar displays days in the three simplified categories
- **THEN** each category has a readable and distinct treatment
- **AND** the day number remains readable

#### Scenario: Statuses remain distinct in dark mode

- **WHEN** the Calendar displays days in each of the three simplified categories in dark mode
- **THEN** each category has a readable, visually distinguishable treatment
- **AND** the day number remains readable against its treatment

#### Scenario: A cycle with sparse logging still shows a continuous band

- **WHEN** a cycle holds records on only a few of its days
- **THEN** the dates from the window begin through the current day all receive a derived-status treatment
- **AND** no gap appears in the band solely because a date was left unlogged

#### Scenario: An open cycle with no Peak stays fertile through the current day

- **GIVEN** an open cycle whose computed window has begun but has no determinable end
- **WHEN** the Calendar renders that cycle
- **THEN** dates from the window begin through the current day show the `Fertile` treatment
- **AND** dates after the current day do not receive the derived treatment

#### Scenario: Algorithm-disabled mode hides interpretation styling

- **WHEN** the algorithm is disabled and the Calendar displays raw readings
- **THEN** simplified derived status fills and computed forecast styling are absent
- **AND** raw reading markers remain visible

#### Scenario: Raw markers remain the record of what was entered

- **WHEN** a Calendar cell shows a derived status and holds no record
- **THEN** the cell shows no monitor marker, menses stripe, or assumed-data marker
- **AND** the absence of those markers indicates that nothing was entered for that day

### Requirement: Forecast applies only to future dates

The Calendar SHALL apply the forecast treatment only to dates after the current day. This SHALL cover the next fertile-window forecast and every projected cycle when cycle projection is enabled. Dates on or before the current day SHALL take their derived status from the cycle window and SHALL NOT receive the forecast treatment, even when they fall inside a forecast range or inside a projected cycle.

#### Scenario: A past day inside the forecast range shows its derived status

- **GIVEN** a forecast range that begins before the current day
- **WHEN** the Calendar renders a date on or before the current day inside that range
- **THEN** the cell shows the derived status treatment for that cycle day
- **AND** the cell is not styled as a forecast

#### Scenario: A future day inside the forecast range is still predictive

- **WHEN** the Calendar renders a date after the current day inside the forecast range
- **THEN** the cell uses the predictive forecast treatment
- **AND** it is not presented as a derived recorded status

#### Scenario: A future day outside the forecast range is not styled

- **WHEN** the Calendar renders a date after the current day that is outside the forecast range
- **THEN** the cell does not receive the forecast treatment

#### Scenario: The open cycle's own past days keep their derived treatment

- **GIVEN** cycle projection is enabled and the open cycle extends past the current day
- **WHEN** the Calendar renders that open cycle's dates on or before the current day
- **THEN** those cells keep their derived treatment
- **AND** only that cycle's dates after the current day take the projected treatment

### Requirement: Calendar paints projected cycle days

When cycle projection is enabled, the Calendar SHALL resolve a projected cycle for any date that falls inside one and SHALL paint that projected cycle's derived status using the predictive forecast treatment. A date that is the projected day 1 of a cycle SHALL show the menses stripe. Projected days SHALL be distinguishable from derived days without relying on color alone, and SHALL NOT be presented as a recorded status. A projected day SHALL NOT be clickable for logging and SHALL produce no Day Record.

#### Scenario: A projected cycle paints its band

- **GIVEN** cycle projection is enabled and at least one closed cycle exists
- **WHEN** the Calendar renders a month containing a projected cycle
- **THEN** each date inside that projected cycle shows the status its projected fertile window assigns
- **AND** the cells use the predictive forecast treatment

#### Scenario: A projected cycle's first day shows the menses stripe

- **GIVEN** cycle projection is enabled
- **WHEN** the Calendar renders a projected cycle's day 1
- **THEN** the cell shows the bottom menses stripe
- **AND** the cell is styled as projected rather than recorded

#### Scenario: The real and projected cycles meet without a gap

- **GIVEN** cycle projection is enabled and the open cycle has a projected end
- **WHEN** the Calendar renders the dates spanning the open cycle and the following projected cycle
- **THEN** every date in that range belongs to one of those cycles
- **AND** no date between them is left unpainted

#### Scenario: A projected day carries a non-color cue

- **WHEN** a user cannot distinguish the projected treatment by color
- **THEN** the projected distinction remains available through border, pattern, label, or accessible text

#### Scenario: A projected day cannot be logged

- **GIVEN** cycle projection is enabled
- **WHEN** the user selects a date inside a projected cycle
- **THEN** the app reports that future dates cannot be logged
- **AND** no Day Record is created

### Requirement: Calendar distinguishes forecast and raw-data cues

The Calendar SHALL keep the forecast treatment, which covers both the next fertile-window forecast and projected cycle days when cycle projection is enabled, visually distinct from the raw-data markers shown alongside it. It SHALL NOT present a forecast or projected day as a derived recorded status. It SHALL NOT display a confirmed/predicted status source or an assumed-data provenance cue, because neither is part of the Calendar's data. It SHALL NOT display a single-day ovulation estimate, because the protocol's calendar rule yields a fertile-window range rather than a single ovulatory day.

#### Scenario: Forecast cells remain visibly predictive

- **WHEN** a future date falls within the next fertile-window forecast
- **THEN** its treatment uses a predictive border, pattern, label, or equivalent cue
- **AND** it is not presented as a derived recorded status

#### Scenario: Projected cells use the same predictive language

- **GIVEN** cycle projection is enabled
- **WHEN** the Calendar renders a date inside a projected cycle
- **THEN** the cell uses a predictive treatment equivalent to the one used for a forecast date
- **AND** it is distinguishable from a raw-data marker

#### Scenario: No single-day ovulation estimate is shown

- **WHEN** the Calendar renders any date in either presentation
- **THEN** no cell displays a single-day ovulation estimate
- **AND** ovulation is conveyed only through the fertile-window range

#### Scenario: No source or provenance cue is shown

- **WHEN** the Calendar renders any date in either presentation
- **THEN** no cell displays a confirmed or predicted source cue
- **AND** no cell displays an assumed-data marker

### Requirement: The day-entry temperature field reflects the active unit

The day-entry form SHALL label the basal body temperature field with the active unit, SHALL accept
input at that unit's step, and SHALL show a hint for that unit. Editing an existing record SHALL
pre-populate the field with the stored value converted to the active unit. The form SHALL convert a
typed value to the canonical unit before it is stored, and SHALL clear the temperature when the field
is emptied. Changing the unit preference SHALL NOT alter any stored value.

#### Scenario: The field label and step follow the active unit

- **WHEN** the active unit is Celsius
- **THEN** the field is labelled in Celsius and accepts two-decimal input
- **AND** when the active unit is Fahrenheit the field is labelled in Fahrenheit and accepts one-decimal input

#### Scenario: An existing record opens in the active unit

- **WHEN** the user opens a day whose record holds a stored temperature
- **THEN** the field is pre-populated with that value expressed in the active unit
- **AND** the stored value is not changed by opening the form

#### Scenario: An empty field clears the temperature

- **WHEN** the user clears the temperature field and saves
- **THEN** the day record has no temperature
- **AND** the rest of the entry is saved as usual

#### Scenario: The stored unit does not change with the preference

- **WHEN** the user switches the unit preference and then saves a day
- **THEN** the day is stored in the canonical unit
- **AND** no unit marker is written to the record

### Requirement: An implausible temperature is not saved from the day-entry form

The day-entry form SHALL validate the temperature before saving. A value the app refuses SHALL be
reported to the user with a message naming the reason, SHALL NOT be written, and SHALL leave the
form open and usable with the entered value still in the field so it can be corrected. A value inside
the plausible range but outside the usual range SHALL save only after the user deliberately confirms.
The form SHALL never coerce, clamp, or round a refused value into a storeable one.

#### Scenario: A refused value leaves the form editable

- **WHEN** the user enters a temperature the app refuses and saves
- **THEN** a message explains why, nothing is written, and the form stays open with the value still entered
- **AND** the user can correct the value and save again

#### Scenario: A confirmed unusual value is saved

- **WHEN** the user confirms an unusual-but-plausible temperature
- **THEN** the reading is stored exactly as entered in the active unit
- **AND** the day's other fields are saved alongside it

#### Scenario: Cancelling the confirmation stores nothing

- **WHEN** the user dismisses the unusual-value warning instead of confirming it
- **THEN** no temperature is written for that day
