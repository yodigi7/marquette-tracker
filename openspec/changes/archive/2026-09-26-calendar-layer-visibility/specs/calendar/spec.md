# Spec Delta

## ADDED Requirements

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

## MODIFIED Requirements

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
