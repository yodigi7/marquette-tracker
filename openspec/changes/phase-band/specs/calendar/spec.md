# Spec Delta

## ADDED Requirements

### Requirement: Calendar paints a band for the quiet phases and a region for the fertile window

The Calendar day cell SHALL distinguish the three collapsed phases by mark. The two phases outside the
window — before it and after it — SHALL be marked with a band along the cell's top edge, in that
phase's full-chroma colour, in every theme. The fertile window SHALL be marked with a full-height
outlined region instead of a band, so that the window is the only region on the Calendar and the two
phases either side of it stay quiet. A day with no phase SHALL paint neither.

Each mark SHALL be painted independently of the cell's background fill, and the fill SHALL continue to
carry the phase's hue. A day whose phase layer is hidden SHALL paint neither mark, while the day's
accessible description SHALL still name the phase, exactly as it does today.

A band SHALL span the full width of the cell and SHALL continue across the gap between adjacent cells,
so that consecutive days in the same phase read as one continuous run rather than as separate marks.

#### Scenario: The two phases outside the window are marked with a band

- **WHEN** the Calendar renders a day before the window or after it
- **THEN** that day carries a band in its own phase's colour along its top edge
- **AND** a day with no phase carries neither a band nor a region

#### Scenario: The window is marked as a region, not a band

- **WHEN** a Calendar day falls inside the fertile window
- **THEN** the cell shows an outlined region at full cell height in the window's colour
- **AND** the cell carries no band
- **AND** the region's interior keeps the phase's fill, so the month still reads as tinted

#### Scenario: A contiguous phase reads as one continuous mark

- **WHEN** a Calendar month contains consecutive days in the same phase
- **THEN** their marks are continuous across the cells between them
- **AND** no visible break appears between two adjacent days of the same phase

#### Scenario: The region's own fill is never lightened to make the window louder

- **WHEN** the window is drawn in either theme
- **THEN** the region's interior uses the phase's ordinary fill, unchanged from the value that keeps
  monitor markers legible against it
- **AND** the region's brightness comes from its outline, on which no marker is painted

## ADDED Requirements

### Requirement: A region's edge is painted only where the window has that edge

The window spans more days than a Calendar week is wide, so in a seven-column grid it crosses row
boundaries. A day cell cannot decide the region's edges on its own, because it does not know whether
the day above or beside it is inside the window. The Calendar SHALL therefore derive the edges from
the whole displayed month and supply them to each day cell.

The region SHALL paint an edge on a given side only where the window actually has that edge, and every
side it does not paint SHALL be left transparent. Each side SHALL be coloured independently, because a
single colour applied to all four sides paints all four, and the width of a side cannot undo a colour
that has been set. The region SHALL reach into the gap between rows only in a column where the run
continues, and SHALL stop flush with the cell edge where it does not, so that a run spanning several
rows is not broken into separate boxes and does not bleed over a day outside the window.

A run that crosses a row boundary is two separate horizontal runs, because the last day of one row is
in the final column and the next day is in the first. Those cells are not neighbours, and the region
SHALL NOT be drawn as though they were: the segments are joined by their colour, alignment, and
adjacency, and no edge SHALL be drawn across the gap between them.

#### Scenario: No edge is drawn through the middle of a run

- **GIVEN** a window that continues from one Calendar row into the next in the same column
- **WHEN** the region is drawn
- **THEN** the cell at the end of that row draws no bottom edge
- **AND** the cell at the start of the following row draws no top edge
- **AND** the region's vertical edges run unbroken through the gap between the two rows

#### Scenario: An unpainted side is transparent

- **WHEN** a day inside the window has the window continuing above and below it in its column
- **THEN** that day paints no horizontal edge
- **AND** it paints no vertical edge either
- **AND** every side it does not paint is left transparent rather than drawn in the region's colour

#### Scenario: The region's colour does not paint sides the window does not have

- **WHEN** the region is drawn
- **THEN** each of the four sides is coloured in its own right
- **AND** no single colour class sets all four sides at once

#### Scenario: A row that begins mid-window is square, not rounded

- **WHEN** a row starts in the middle of a window that began in an earlier row
- **THEN** that row's first day draws a vertical edge but no rounding
- **AND** the run's two true ends are the only rounded edges in the run

## ADDED Requirements

### Requirement: The window's first and last day are the run's only rounded ends

The fertile window is a single interval, and the Calendar SHALL mark it as one object rather than as a
run of interchangeable days: the window's first and last day SHALL each be presented differently from
the days between them. The difference SHALL be a property of the region's shape — a rounded outer
corner on the side that faces outward from the window — and the region SHALL NOT be accompanied by a
separate mark beside it, since a mark in the region's own colour is not visible and a mark in another
colour is read as debris rather than as part of the region.

A run that is split across two displayed months SHALL be presented as though it continued, so that no
month boundary is mistaken for a window boundary: a day that merely falls at the edge of a displayed
month, with the run continuing beyond it, SHALL be presented as an interior day and its outward-facing
side SHALL be square. A fertile run with no end — a cycle with no monitor Peak, whose window never
closes — SHALL mark only its first day.

The window's ends are the window's own, and not the displayed month's: a run that is merely clipped by
the edge of the month on screen SHALL NOT be rounded as though the window ended there.

#### Scenario: The window's ends are the run's only rounded edges

- **WHEN** the Calendar renders a fertile run spanning more than one day
- **THEN** the run's first day has a rounded edge facing away from the window
- **AND** the run's last day has a rounded edge facing away from the window
- **AND** no day between them is rounded
- **AND** no separate mark is drawn beside the region

#### Scenario: A one-day window is rounded at both of its ends

- **WHEN** the fertile window covers a single day
- **THEN** that day is presented as both the start and the end of the window
- **AND** both of its outward-facing edges are rounded

#### Scenario: A month boundary is not presented as a window boundary

- **WHEN** a fertile run continues past the last day of a displayed month
- **THEN** that day is presented as an interior day with a square edge
- **AND** the run's first day in the following month is presented as an interior day with a square edge

#### Scenario: A run with no end is marked only at its start

- **GIVEN** a cycle with no monitor Peak, whose fertile window therefore has no end
- **WHEN** the Calendar renders that cycle
- **THEN** the first day of the run is presented as the start of the window
- **AND** no day is presented as the end of the window

## ADDED Requirements

### Requirement: The window's mark and the menses stripe are different kinds of mark

A band and the menses stripe are both horizontal lines along opposite edges of a day cell, and across a
Calendar row boundary they are close enough to read as a single mark. The window SHALL therefore be
marked as a region, which cannot be confused with a stripe, and the menses stripe SHALL keep its
existing position, shape, and colour. No menses day falls inside the fertile window under the current
protocol, so the region never sits under the stripe; the requirement is on the marks being different in
kind, not on a coincidence of the data.

The window's mark SHALL not alter the cell's existing markers. A day with a monitor reading SHALL show
the region and the monitor marker together.

#### Scenario: A window that reaches past a row is not read as a stripe

- **GIVEN** a window that continues from one Calendar row into the next
- **WHEN** a menses stripe falls on the day at the end of the earlier row
- **THEN** the window's mark on the following row is a region and not a line along a cell edge
- **AND** the two marks cannot be read as one continuous stripe

#### Scenario: The menses stripe is unchanged

- **WHEN** a Calendar day is a recorded menses day
- **THEN** the day cell shows the bottom menses stripe in its existing colour
- **AND** the stripe keeps its position, shape, and width

#### Scenario: Monitor markers coexist with the region's mark

- **WHEN** a day inside the window holds a monitor reading
- **THEN** the cell shows the region and the monitor marker together
- **AND** the marker is not altered by the region's presence

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

Each entry SHALL describe exactly one layer that the day cells can paint, and every layer the day cells can paint SHALL have an entry. An entry's sample SHALL render the same mark the day cells draw for that layer: a band for a phase the day cells paint as a band, and a region for a phase the day cells paint as a region, so the key cannot disagree with the cell. A hidden entry SHALL render a hollow swatch rather than the colour sample, so a hidden entry is distinguishable from a shown one without relying on colour alone, and its label SHALL remain unchanged.

#### Scenario: Simplified legend covers the default vocabulary

- **WHEN** the simple Calendar legend is displayed
- **THEN** it explains `Before`, `Fertile`, `After`, the predictive treatment, menses, and monitor readings
- **AND** its samples match the corresponding day-cell treatments

#### Scenario: A phase sample shows the mark the day cells draw

- **WHEN** a legend entry describes a phase
- **THEN** its sample renders that phase's mark: a band where the day cells draw a band, and a region where the day cells draw a region
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

#### Scenario: Hiding a phase hides its mark and keeps the text

- **WHEN** the user hides a phase layer from the legend
- **THEN** days in that phase paint neither a band nor a region, and lose the phase's fill
- **AND** no other layer's mark on those days is affected
- **AND** each such day's accessible label still names its phase

#### Scenario: Disabling the algorithm paints no phase mark

- **GIVEN** the algorithm is disabled
- **WHEN** the Calendar renders a cycle
- **THEN** no day is painted as belonging to a phase
- **AND** no day is presented as the start or the end of a window

#### Scenario: Theme-specific legend samples remain synchronized

- **WHEN** the user switches between light and dark themes
- **THEN** legend samples and day-cell treatments change together
- **AND** no legend sample refers to a stale light-only treatment
