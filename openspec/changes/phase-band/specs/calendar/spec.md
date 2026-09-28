# Spec Delta

## ADDED Requirements

### Requirement: Calendar paints a band for every phase and marks the fertile run's ends

The Calendar day cell SHALL paint a band along its top edge in the colour of the collapsed phase the
day falls in, in every theme, for every phase. A day with no phase SHALL paint no band. The band SHALL
span the full width of the cell and SHALL continue across the gap between adjacent cells, so that
consecutive days in the same phase read as one continuous run rather than as separate marks.

The band SHALL be painted independently of the cell's background fill, and the fill SHALL continue to
carry the phase's hue. A day whose phase layer is hidden SHALL paint no band, while the day's
accessible description SHALL still name the phase, exactly as it does today.

The first and last day of a fertile run SHALL each be presented differently from the days between
them, so that the run is presented as one marked interval. The difference SHALL be a property of the
band. A run that is split across two displayed months SHALL be presented as though it continued, so
that no month boundary is mistaken for a window boundary: a day that merely falls at the edge of a
displayed month, with the run continuing beyond it, SHALL be presented as an interior day. A fertile
run with no end — a cycle with no monitor Peak, whose window never closes — SHALL mark only its first
day.

The band SHALL not alter the cell's existing markers. A menses day that is also inside a phase SHALL
show both the band and the bottom menses stripe, and a day with a monitor reading SHALL show both the
band and the monitor marker.

#### Scenario: A contiguous phase reads as one band

- **WHEN** a Calendar month contains consecutive days in the same phase
- **THEN** their bands are continuous across the cells between them
- **AND** no visible break appears between two adjacent days of the same phase

#### Scenario: Every phase is painted

- **WHEN** the Calendar renders a day before the window, inside it, or after it
- **THEN** each of those days carries its own phase's band
- **AND** a day with no phase paints no band

#### Scenario: The band is painted alongside the fill, not instead of it

- **WHEN** a day is inside the window
- **THEN** the cell shows the band's colour and its own fill
- **AND** the fill continues to carry the phase's hue

#### Scenario: The fertile run is marked at both ends by the band

- **WHEN** the Calendar renders a fertile run spanning more than one day
- **THEN** the run's first day and its last day are presented differently from the days between them
- **AND** the difference is a property of the band, with no separate mark drawn beside the day

#### Scenario: A one-day window is marked as both ends

- **WHEN** the fertile window covers a single day
- **THEN** that day is presented as both the start and the end of the window

#### Scenario: A month boundary is not presented as a window boundary

- **WHEN** a fertile run continues past the last day of a displayed month
- **THEN** that day is presented as an interior day
- **AND** the run's first day in the following month is presented as an interior day

#### Scenario: A run with no end is marked only at its start

- **GIVEN** a cycle with no monitor Peak, whose fertile window therefore has no end
- **WHEN** the Calendar renders that cycle
- **THEN** the first day of the run is presented as the start of the window
- **AND** no day is presented as the end of the window

#### Scenario: Menses and monitor markers coexist with the band

- **WHEN** a day is a recorded menses day that also falls in a phase
- **THEN** the cell shows the band and the bottom menses stripe together
- **AND** a day that also holds a monitor reading shows the band and the monitor marker together

#### Scenario: Hiding the phase layer hides the band and keeps the text

- **WHEN** the user hides a phase layer from the legend
- **THEN** days in that phase paint no band
- **AND** each such day's accessible label still names its phase

#### Scenario: Disabling the algorithm paints no band

- **GIVEN** the algorithm is disabled
- **WHEN** the Calendar renders a cycle
- **THEN** no day is painted as belonging to a phase
- **AND** no day is presented as the start or the end of a window

## MODIFIED Requirements

### Requirement: Calendar uses a bottom menses stripe and one color-coded monitor marker

The Calendar SHALL represent recorded menses with a visible stripe along the bottom edge of the day cell. It SHALL use that same stripe treatment for a projected cycle's day 1 when cycle projection is enabled, and that stripe SHALL be presented as a prediction rather than as a logged observation, so that it is governed by the predictive layer rather than the raw-menses layer. It SHALL use one common monitor marker shape and SHALL encode Low, High, and Peak by color, with the exact reading available through the summary, details, and accessible text. That marker SHALL be painted directly on the day's own fill, with no backing shape between it and the fill.

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

## MODIFIED Requirements

### Requirement: Calendar legend stays synchronized with day cells

The Calendar legend SHALL match the colors, borders, line styles, and marker shapes used in the active presentation. The default legend SHALL be grouped around the simplified status categories, the predictive treatment, the menses stripe, and the color-coded monitor readings. The predictive treatment SHALL be described by a single entry covering both the next-window forecast and projected cycle days, because both use the same predictive cue. A full-detail legend SHALL additionally offer the secondary indicator that the full-detail presentation exposes.

Each entry SHALL describe exactly one layer that the day cells can paint, and every layer the day cells can paint SHALL have an entry. Where a day cell's treatment for a layer is a band, the entry's sample SHALL render that band rather than a filled block, so the key cannot disagree with the cell. A hidden entry SHALL render a hollow swatch rather than the colour sample, so a hidden entry is distinguishable from a shown one without relying on colour alone, and its label SHALL remain unchanged.

#### Scenario: Simplified legend covers the default vocabulary

- **WHEN** the simple Calendar legend is displayed
- **THEN** it explains `Before`, `Fertile`, `After`, the predictive treatment, menses, and monitor readings
- **AND** its samples match the corresponding day-cell treatments

#### Scenario: A phase sample shows the band, not a filled block

- **WHEN** a legend entry describes a phase the day cells paint as a band
- **THEN** its sample renders a band in the phase's colour
- **AND** the sample is recognisably the same mark the day cells draw

#### Scenario: Post-calendar state is explained

- **WHEN** the Calendar legend is displayed
- **THEN** a legend entry describes the treatment used for post-calendar cells
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
