# Spec Delta

## ADDED Requirements

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

## MODIFIED Requirements

### Requirement: Calendar uses a bottom menses stripe and one color-coded monitor marker

The Calendar SHALL represent recorded menses with a visible stripe along the bottom edge of the day cell, and SHALL use that same stripe treatment for a projected cycle's day 1 when cycle projection is enabled. It SHALL use one common monitor marker shape and SHALL encode Low, High, and Peak by color, with the exact reading available through the summary, details, and accessible text.

#### Scenario: Menses is visible over a status background
- **WHEN** a Calendar day is a recorded menses day
- **THEN** the day cell shows the bottom menses stripe regardless of the cell's simplified status treatment

#### Scenario: Projected day one uses the same stripe
- **GIVEN** cycle projection is enabled
- **WHEN** the Calendar renders a projected cycle's day 1
- **THEN** the day cell shows the bottom menses stripe
- **AND** the cell's projected treatment distinguishes it from a recorded menses day

#### Scenario: Monitor reading is visible
- **WHEN** a Calendar day has a user or displayed monitor reading
- **THEN** the cell shows one monitor marker whose color identifies Low, High, or Peak
- **AND** Low, High, and Peak do not use different marker shapes

#### Scenario: Monitor value is available without decoding color
- **WHEN** a user inspects a day with a monitor marker
- **THEN** the exact Low, High, or Peak value is available in the summary, day details, or accessible label

### Requirement: Calendar supports simple and full-detail presentation

The Calendar SHALL use a simple phase-first presentation by default and SHALL provide an accessible way to reveal the richer existing indicators in a full-detail presentation. Changing presentation SHALL NOT change stored records, engine output, interpretation, day-entry behavior, or the presence or absence of projected cycles.

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

### Requirement: Calendar legend stays synchronized with day cells

The Calendar legend SHALL match the colors, borders, line styles, and marker shapes used in the active presentation. The default legend SHALL be grouped around the three simplified status categories, the menses stripe, and the color-coded monitor readings, and SHALL explain the projected treatment whenever cycle projection is enabled. A full-detail legend SHALL additionally explain any secondary indicators that the full-detail presentation exposes.

#### Scenario: Simplified legend covers the default vocabulary
- **WHEN** the simple Calendar legend is displayed
- **THEN** it explains `Before`, `Fertile`, `After`, menses, and monitor readings
- **AND** its samples match the corresponding day-cell treatments

#### Scenario: Post-calendar state is explained
- **WHEN** the Calendar legend is displayed
- **THEN** a legend entry describes the `After` treatment used for post-calendar cells
- **AND** the entry uses the same visual treatment as the corresponding day cell

#### Scenario: The projected treatment is explained when projection is on
- **GIVEN** cycle projection is enabled
- **WHEN** the Calendar legend is displayed
- **THEN** a legend entry describes the projected treatment and matches the projected day cells
- **AND** the entry identifies that treatment as predictive rather than recorded

#### Scenario: No ovulation estimate is listed
- **WHEN** the Calendar legend is displayed in either presentation
- **THEN** it contains no entry for a predicted ovulation day

#### Scenario: Full-detail legend covers extra indicators
- **WHEN** the full-detail presentation is displayed
- **THEN** the legend explains the additional visible forecast or intercourse indicators
- **AND** it contains no status-source or record-provenance entry

#### Scenario: Theme-specific legend samples remain synchronized
- **WHEN** the user switches between light and dark themes
- **THEN** legend samples and day-cell treatments change together
- **AND** no legend sample refers to a stale light-only treatment

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

## REMOVED Requirements

### Requirement: Calendar distinguishes forecast, ovulation, and raw-data cues

**Reason**: The predicted-ovulation cue the requirement names no longer exists. It was produced from an average Peak day, which the protocol never computes — the Marquette calendar rule yields only the earliest and latest Peak, so the fertile-window range already carries the information the dot conveyed. The dot additionally placed a marker on a day that had never occurred, and the user has chosen to remove it rather than gate it on a narrow band.

**Migration**: The fertile-window band continues to show every day that could be ovulatory, unchanged. Full detail loses the single ovulation dot and the legend loses its matching entry; no stored record, engine result, or other surface changes.
