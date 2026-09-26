# Spec Delta

## ADDED Requirements

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

The Calendar SHALL apply the future fertile-window forecast treatment only to dates after the current day. Dates on or before the current day SHALL take their derived status from the cycle window and SHALL NOT receive the forecast treatment, even when they fall inside the forecast range.

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

### Requirement: Calendar distinguishes forecast, ovulation, and raw-data cues

The Calendar SHALL keep the future fertile-window forecast, predicted ovulation, and raw-data markers visually distinct in the presentation where they are shown. It SHALL NOT present a future forecast as a derived recorded status. It SHALL NOT display a confirmed/predicted status source or an assumed-data provenance cue, because neither is part of the Calendar's data.

#### Scenario: Forecast cells remain visibly predictive

- **WHEN** a future date falls within the next fertile-window forecast
- **THEN** its treatment uses a predictive border, pattern, label, or equivalent cue
- **AND** it is not presented as a derived recorded status

#### Scenario: Predicted ovulation remains identifiable

- **WHEN** a date is marked as the predicted ovulation day
- **THEN** it is distinguishable from raw-data markers and from the derived status treatment

#### Scenario: No source or provenance cue is shown

- **WHEN** the Calendar renders any date in either presentation
- **THEN** no cell displays a confirmed or predicted source cue
- **AND** no cell displays an assumed-data marker

## MODIFIED Requirements

### Requirement: Calendar supports simple and full-detail presentation

The Calendar SHALL use a simple phase-first presentation by default and SHALL provide an accessible way to reveal the richer existing indicators in a full-detail presentation. Changing presentation SHALL NOT change stored records, engine output, interpretation, or day-entry behavior.

#### Scenario: Simple presentation is the default

- **WHEN** the Calendar is opened without a previously selected full-detail preference
- **THEN** the grid emphasizes the simplified status, menses treatment, and monitor reading
- **AND** secondary indicators do not compete with those primary cues

#### Scenario: User reveals full detail

- **WHEN** the user enables the full-detail presentation
- **THEN** the richer existing indicators, including available intercourse, ovulation, and forecast cues, are available without changing any record
- **AND** full detail exposes no status-source or record-provenance indicator

#### Scenario: Day details remain complete

- **WHEN** the user opens a day from either presentation
- **THEN** the existing full day-entry/detail surface remains available with all original fields and editing actions

### Requirement: Calendar legend stays synchronized with day cells

The Calendar legend SHALL match the colors, borders, line styles, and marker shapes used in the active presentation. The default legend SHALL be grouped around the three simplified status categories, the menses stripe, and the color-coded monitor readings. A full-detail legend SHALL additionally explain any secondary indicators that the full-detail presentation exposes.

#### Scenario: Simplified legend covers the default vocabulary

- **WHEN** the simple Calendar legend is displayed
- **THEN** it explains `Before`, `Fertile`, `After`, menses, and monitor readings
- **AND** its samples match the corresponding day-cell treatments

#### Scenario: Post-calendar state is explained

- **WHEN** the Calendar legend is displayed
- **THEN** a legend entry describes the `After` treatment used for post-calendar cells
- **AND** the entry uses the same visual treatment as the corresponding day cell

#### Scenario: Full-detail legend covers extra indicators

- **WHEN** the full-detail presentation is displayed
- **THEN** the legend explains the additional visible forecast, ovulation, or intercourse indicators
- **AND** it contains no status-source or record-provenance entry

#### Scenario: Theme-specific legend samples remain synchronized

- **WHEN** the user switches between light and dark themes
- **THEN** legend samples and day-cell treatments change together
- **AND** no legend sample refers to a stale light-only treatment

### Requirement: Calendar remains legible at narrow mobile widths

The Calendar SHALL keep the day number, simplified status, menses stripe, monitor marker, and future forecast cue distinguishable at narrow mobile viewport widths. The presentation SHALL use accessible text or equivalent non-color cues where color alone would not communicate a reading.

#### Scenario: Narrow Calendar review

- **WHEN** the user views the Calendar at a narrow mobile width in either theme
- **THEN** the day number and important state cues remain visually separable
- **AND** the monitor reading is available through accessible text or detail surfaces
- **AND** the most important status/forecast distinctions do not rely on color alone

## REMOVED Requirements

### Requirement: Calendar day cells use theme-aware derived-status treatments

**Reason**: The requirement is rewritten rather than modified because its "Unlogged days remain base cells" scenario states the opposite of the new behavior: that a date does not receive a derived-status fill solely because it falls inside a calculated window. A MODIFIED block cannot drop that scenario, so the requirement is replaced. Its theme-aware treatment language, the three simplified categories, the preserved precise status, and the algorithm-disabled behavior are all carried forward by the replacement requirement in this delta.

**Migration**: Cells resolve their status from the cycle window instead of from record presence. No cell's theme-aware treatment vocabulary changes; only the set of dates that receive a treatment changes.

### Requirement: Calendar distinguishes source, forecast, and provenance cues

**Reason**: The requirement mandates exactly the two cues this change removes — a confirmed-versus-predicted status source and an assumed-data provenance marker. Its "Confirmed and predicted cells remain distinguishable" and "Assumed readings remain marked" scenarios describe behavior that no longer exists, and a MODIFIED block cannot drop them. It is replaced by "Calendar distinguishes forecast, ovulation, and raw-data cues" in this delta, which keeps the forecast, ovulation, and raw-marker distinctions and explicitly rules the two removed cues out.

**Migration**: Remove the status-source cue and the assumed-data asterisk from day cells, and remove both entries from the simple and full-detail legends. The forecast, predicted-ovulation, and raw-marker cues are unchanged.

### Requirement: Calendar identifies autogenerated records

**Reason**: The app no longer creates autogenerated day records, so there is no generated-versus-user distinction for a cell to draw. The editing and deletion behaviors this requirement paired with provenance are already covered by the day-entry requirements.

**Migration**: Remove the `dataOrigin` field from the record type, the assumed-data marker from the day cell, and the assumed-data explanatory text from the day-entry dialog.

### Requirement: Calendar reflects reconciled post-Peak tails

**Reason**: There are no reconciled generated tails. Post-window days now receive their derived status directly from the cycle window, so this requirement's eligibility, anchor, boundary, and algorithm-off hiding rules no longer describe anything.

**Migration**: Delete the fill planner and its reconciliation. Days after the fertile window show the `After` treatment whether or not a record exists for them.
