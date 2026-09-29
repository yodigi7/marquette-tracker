# Spec Delta

## ADDED Requirements

### Requirement: Calendar paints the window as a bar and the quiet phases as tints

The Calendar day cell SHALL mark the fertile window with a solid bar at full cell height, so that the
window is the only filled shape on the Calendar. The two phases outside the window — before it and after
it — SHALL be marked by their tint alone, which is the treatment they had before this change. A day with
no phase SHALL paint neither.

The bar SHALL carry its own colour, which MAY be brighter than the status tint because the bar is the
mark the window is recognised by. A Calendar day inside the window SHALL be painted in the bar's own
colour rather than the status tint, because a rounded bar end cannot paint itself and whatever lies
behind its corner shows through. The status tint remains the right value for every surface that has no
bar. The bar SHALL NOT be lightened past what the reading markers painted on it allow.

No day cell SHALL draw a horizontal line along the top edge of a day, on any phase. A strip there and the
menses stripe at the bottom edge of the day above are 8px apart across a week boundary and read as a
single mark, and three hundred of them down a month is a great deal of line to read past.

#### Scenario: The window is marked as a solid bar

- **WHEN** a Calendar day falls inside the fertile window
- **THEN** the cell shows a solid bar at full cell height in the window's own colour
- **AND** the bar is the fill rather than a wire around one, so the shape is carried by its own colour
- **AND** the day cell behind the bar carries the same colour, so a rounded end cannot reveal a
  different one through its own corner

#### Scenario: The two quiet phases are tints and nothing more

- **WHEN** the Calendar renders a day before the window or after it
- **THEN** that day carries its phase's tint
- **AND** it carries no bar and no line along its top edge
- **AND** all three phases are still on screen: none is dropped to make room for the window

#### Scenario: No day in a month has a line along its top edge

- **WHEN** a Calendar month is rendered
- **THEN** no day cell in any phase draws a strip along its top edge

#### Scenario: The bar is held to the marker rules, because a marker is painted on it

- **WHEN** the window is drawn in either theme
- **THEN** the bar's colour meets the same 3:1 against every reading marker as any other Calendar fill
- **AND** it is never brightened past that to make the window more prominent
- **AND** in the dark theme it is brighter than the status tint it covers, because the tint alone is too
  close to the page for a full-height bar to read as a surface

### Requirement: The window's bar spans the gap between days and stops at the gap between weeks

The window spans more days than a Calendar week is wide, so in a seven-column grid it crosses row
boundaries. A day cell cannot decide the bar's own edges on its own, because it does not know whether
the day above or beside it is inside the window. The Calendar SHALL therefore derive the bar's shape
from the whole displayed month and supply it to each day cell, positioning every day by where it sits in
the grid rather than by counting the days before it, so that a month padded with leading blank days
produces the same shape as one that is not.

The bar SHALL extend into the gap between two side-by-side days whenever the window continues across
that gap, so that a run of days reads as one solid shape with nothing showing through between them.
Left and right SHALL be decided independently, because a day can open its row and still have the window
continuing to its right, and a day can close its row and still have it continuing to its left.

The bar SHALL NOT extend into the gap between rows at all. The row gap is what makes the calendar's
weeks legible, and a bar that filled it would dissolve the row structure inside the window. A run that
crosses a row boundary is therefore one bar per row with the calendar's own gap between them, and the
bar's height SHALL be exactly the cell's height.

A run that crosses a row boundary is two separate horizontal runs, because the last day of one row is
in the final column and the next day is in the first. Those cells are not neighbours, and the bar SHALL
NOT be drawn as though they were.

#### Scenario: Nothing shows through between two days of the window

- **WHEN** two days side by side are both inside the window
- **THEN** the bar on each extends across the whole gap between them
- **AND** no part of the page is visible inside the run

#### Scenario: A day that opens or closes a row still joins the run

- **WHEN** a day is the first in its row with the window continuing to its right
- **THEN** its bar extends to the right across the gap
- **AND** it does not extend to the left, so no part of the window appears outside the run
- **AND** the same holds with left and right exchanged for a day that closes a row

#### Scenario: The bar never leaves the calendar

- **WHEN** a window includes a day in the calendar's first or last column
- **THEN** no part of the bar extends beyond the edge of the grid

#### Scenario: The bar never fills a row gap

- **WHEN** a window continues from one Calendar row into the next
- **THEN** the bar on each row's days is exactly that cell's height
- **AND** the calendar's own gap remains between the two rows
- **AND** the week rows stay legible across the whole window

#### Scenario: A padded month is shaped by where its days sit, not by counting them

- **GIVEN** a displayed month whose first week is padded with leading blank days
- **WHEN** the bar's shape is derived
- **THEN** every day is placed by its own row and column in the grid
- **AND** the shape is the same as it would be for an unpadded month holding the same window

## ADDED Requirements

### Requirement: The window's first and last day are the bar's only rounded ends

The fertile window is a single interval, and the Calendar SHALL mark it as one object rather than as a
run of interchangeable days: the window's first and last day SHALL each be presented differently from
the days between them. The difference SHALL be a property of the bar's shape — a rounded
outer end on the side that faces outward from the window — and the bar SHALL NOT be accompanied by a
separate mark beside it, since a mark in the bar's own colour is not visible and a mark in another
colour is read as debris rather than as part of the bar.

A run that is split across two displayed months SHALL be presented as though it continued, so that no
month boundary is mistaken for a window boundary: a day that merely falls at the edge of a displayed
month, with the run continuing beyond it, SHALL be presented as an interior day and its outward-facing
side SHALL be square. A fertile run with no end — a cycle with no monitor Peak, whose window never
closes — SHALL mark only its first day.

The window's ends are the window's own, and not the displayed month's: a run that is merely clipped by
the edge of the month on screen SHALL NOT be rounded as though the window ended there.

#### Scenario: The window's ends are the run's only rounded edges

- **WHEN** the Calendar renders a fertile run spanning more than one day
- **THEN** the run's first day has a rounded end facing away from the window
- **AND** the run's last day has a rounded end facing away from the window
- **AND** no day between them, and no row that merely opens or closes inside the window, is rounded
- **AND** no separate mark is drawn beside the bar

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

### Requirement: The window's bar and the menses stripe are different kinds of mark

The menses stripe is a horizontal line along the bottom edge of a day cell, and any other horizontal
line along a cell edge is 8px from it across a row boundary, where the two read as a single mark. No day
cell SHALL draw such a line. The window SHALL therefore be marked as a filled bar, which cannot be
confused with a stripe, and the menses stripe SHALL keep its existing position, shape, and colour. No menses day falls inside the fertile window under the current
protocol, so the bar never sits under the stripe; the requirement is on the marks being different in
kind, not on a coincidence of the data.

The bar SHALL not alter the cell's existing markers. A day with a monitor reading SHALL show the bar and
the monitor marker together.

#### Scenario: A window that reaches past a row is not read as a stripe

- **GIVEN** a window that continues from one Calendar row into the next
- **WHEN** a menses stripe falls on the day at the end of the earlier row
- **THEN** the window's mark on the following row is a filled bar and not a line along a cell edge
- **AND** the two marks cannot be read as one continuous stripe

#### Scenario: The menses stripe is unchanged

- **WHEN** a Calendar day is a recorded menses day
- **THEN** the day cell shows the bottom menses stripe in its existing colour
- **AND** the stripe keeps its position, shape, and width

#### Scenario: Monitor markers coexist with the bar's mark

- **WHEN** a day inside the window holds a monitor reading
- **THEN** the cell shows the bar and the monitor marker together
- **AND** the marker is not altered by the bar's presence

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

Each entry SHALL describe exactly one layer that the day cells can paint, and every layer the day cells can paint SHALL have an entry. An entry's sample SHALL render the colour the day cells draw for that layer, taken from the same paint the day cell uses, so the key cannot disagree with the cell. Where a layer's day-cell mark has a shape the key must convey — the window's bar against the two quiet phases' tints — the key SHALL convey it in the shape of the mark rather than in the shape of the key: a key drawn at a different size to signal that its day cell is filled rather than tinted reads as a claim about importance instead, and the window's key is the one most often compared against its two neighbours. The three phase keys SHALL therefore be the same size, and the window's SHALL be told from the others by colour. A hidden entry SHALL render a hollow swatch rather than the colour sample, so a hidden entry is distinguishable from a shown one without relying on colour alone, and its label SHALL remain unchanged.

#### Scenario: Simplified legend covers the default vocabulary

- **WHEN** the simple Calendar legend is displayed
- **THEN** it explains `Before`, `Fertile`, `After`, the predictive treatment, menses, and monitor readings
- **AND** its samples match the corresponding day-cell treatments

#### Scenario: The three phase keys are the same size and are told apart by colour

- **WHEN** the Calendar legend shows the `Before`, `Fertile`, and `After` keys
- **THEN** all three keys are drawn at the same size
- **AND** each carries its own phase's colour, sampled from the paint its day cells use
- **AND** the window is identified among them by its colour rather than by a larger key

#### Scenario: A phase sample shows the colour the day cells draw

- **WHEN** a legend entry describes a phase
- **THEN** its sample renders that phase's colour as the day cells paint it
- **AND** the sample is recognisably the same colour the day cells draw

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
- **THEN** days in that phase paint no bar, and lose the phase's colour
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
