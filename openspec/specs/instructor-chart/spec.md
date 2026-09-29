# instructor-chart Specification

## Purpose

Lets a user hand a Marquette instructor a printable chart in the shape instructors are trained to read —
cycle days laid out across, observations down, several cycles back to back — carrying the evidence the
app's own fertile-window rules were derived from.

## Requirements

### Requirement: The chart lays cycle days across and one row per kind of observation

The instructor chart SHALL present its days as columns running left to right in cycle-day order, with each
kind of observation as a row, and SHALL stack the cycles back to back down the page in cycle order. The
grid SHALL carry a row for the date of every day, a row marking each day's monitor reading with a single
character drawn from the chart's printed legend, a row for menses, and rows for each optional observation
the run has data for. Every cycle day in a charted cycle SHALL have a column, whether or not a day record
exists for it, and a day holding no record SHALL show the absence rather than a value, in every row
including the monitor row. A day that was logged but carries no value for a row SHALL be distinguishable
from a day holding no record at all, in every row, and the same rule SHALL apply to every row on the
chart. Symptoms and notes SHALL NOT be grid rows; the chart SHALL report them once per day in the prose
list printed beneath the grid.

#### Scenario: Cycle days run across as columns

- **WHEN** the user opens the instructor chart
- **THEN** the grid's columns are the cycle days of each cycle, in order from cycle day 1
- **AND** the cycles appear as consecutive blocks down the page

#### Scenario: Each kind of observation is a row

- **WHEN** the user reads the instructor chart
- **THEN** the date, the monitor reading, menses, and each present optional observation each occupy a row
- **AND** the monitor reading for each day is marked with a character the chart's printed legend defines
  rather than shown as colour alone

#### Scenario: A day with no record shows no reading

- **WHEN** a charted cycle day holds no day record
- **THEN** its column shows that no reading was logged
- **AND** it shows no value for that day in any observation row

#### Scenario: An untested day is told apart from a day never logged

- **WHEN** a charted cycle day holds a record that carries no monitor reading
- **THEN** its monitor cell shows the mark the chart uses for a reading that was not taken
- **AND** that mark is distinguishable from the gap shown for a day holding no record
- **AND** the same distinction applies in every other observation row

#### Scenario: The date row is in short form

- **WHEN** the user reads the instructor chart
- **THEN** the date row shows each day's month and day rather than the full date
- **AND** the year is still printed for each cycle, on the cycle's own Day 1 heading

### Requirement: The chart covers a chosen run of cycles, defaulting to the configured history window

The instructor chart SHALL cover a run of the user's most recent cycles. The number of cycles it covers
SHALL default to the configured history window, which itself defaults to six, and the user SHALL be able
to change that number before printing. A requested count greater than the number of cycles the user has
SHALL cover every cycle available and SHALL state how many were charted. The chart SHALL cover only cycles
that exist and SHALL NOT include a projected future cycle, whatever the projection setting is set to.

#### Scenario: The default run is the configured history window

- **GIVEN** the user has changed the configured history window
- **WHEN** the user opens the instructor chart
- **THEN** it covers that many of the user's most recent cycles

#### Scenario: The default is six cycles when the window is untouched

- **GIVEN** the configured history window is at its default
- **WHEN** the user opens the instructor chart
- **THEN** it covers the six most recent cycles

#### Scenario: The user can change the count

- **WHEN** the user changes the number of cycles on the chart
- **THEN** the chart covers that many of the user's most recent cycles
- **AND** the change affects that chart only and is not stored as a preference

#### Scenario: Asking for more cycles than exist

- **GIVEN** the user has four cycles and asks for twelve
- **WHEN** the chart is produced
- **THEN** it covers all four cycles
- **AND** it states that four cycles were charted

#### Scenario: No projected cycle reaches the chart

- **GIVEN** the future-cycle projection is enabled
- **WHEN** the user opens the instructor chart
- **THEN** the chart is the same one shown with the projection disabled
- **AND** no projected cycle day appears in it

### Requirement: The chart shows the computed fertile window, and shows no window with interpretation off

With interpretation enabled, the chart SHALL band the computed fertile window across the grid for every
charted cycle, and SHALL state each cycle's window as its begin and end cycle days. The band SHALL mark
only days the engine classifies as `fertile`. A cycle whose window has no end SHALL be banded from its
begin onward across the rest of the cycle, and SHALL be labelled as having no determined end. When the
algorithm is disabled, the chart SHALL show the recorded observations and omit the fertile-window band
entirely, without replacing it with any other computed or derived mark.

#### Scenario: The window is banded across the grid

- **GIVEN** a cycle whose computed fertile window runs from cycle day 6 to cycle day 15
- **WHEN** the user opens the instructor chart
- **THEN** the days from cycle day 6 to cycle day 15 are marked as the window
- **AND** no other day in that cycle is marked

#### Scenario: A cycle with no window end is banded to the end of the cycle

- **GIVEN** a cycle with a window begin but no monitor Peak to set an end from
- **WHEN** the user opens the instructor chart
- **THEN** the days from the begin onward through the end of the cycle are marked
- **AND** the cycle is labelled as having no determined window end

#### Scenario: No band is drawn with interpretation off

- **GIVEN** the algorithm is disabled
- **WHEN** the user opens the instructor chart
- **THEN** no fertile-window band appears anywhere on the chart
- **AND** the recorded observations are shown unchanged
- **AND** no other computed mark is substituted for the band

#### Scenario: Re-enabling restores the band

- **WHEN** the user re-enables the algorithm and opens the instructor chart
- **THEN** the fertile-window band is shown as it was before it was disabled
- **AND** no recorded data is lost

### Requirement: Every window claim on the chart is checkable against evidence on the chart

The chart SHALL state the basis of each charted cycle's window begin in plain language, naming whether the
calendar rule or a recorded reading set it. For a cycle whose begin came from the calendar rule, the
chart SHALL print the monitor Peak day the rule used and the cycle it came from. When the chart covers
fewer cycles than the configured history window the app actually consumed, the chart SHALL still print the
Peak day and cycle number of every earlier cycle that fed the rule, so that a claim made on the page is
never one the reader cannot check. Those earlier cycles' Peak days SHALL be reported as facts about the
app's inputs and SHALL NOT be charted as though they were among the charted cycles.

#### Scenario: The calendar rule is named with the Peak it used

- **GIVEN** a cycle beyond the first six whose window began by the calendar rule
- **WHEN** the user opens the instructor chart
- **THEN** the chart states that the window began by the calendar rule
- **AND** it prints the monitor Peak day that rule used and the cycle that Peak came from

#### Scenario: A recorded reading that opened the window is named as such

- **GIVEN** a cycle whose first High or Peak reading preceded the calendar begin
- **WHEN** the user opens the instructor chart
- **THEN** the chart states that a recorded reading opened the window
- **AND** it prints that reading's cycle day and what was read

#### Scenario: Evidence from uncharted cycles is still printed

- **GIVEN** the app consumed a six-cycle history window to derive a window begin
- **WHEN** the user prints a chart covering only two cycles
- **THEN** the chart still prints the Peak day and cycle number of all six cycles the rule used
- **AND** those earlier cycles are reported as evidence only, not as charted cycles

#### Scenario: A rule that had no Peak to use says so

- **GIVEN** the history window the app consulted held no monitor Peak
- **WHEN** the user opens the instructor chart
- **THEN** the chart states that no Peak was available for the rule to use
- **AND** it prints no Peak day as the rule's basis

### Requirement: Optional observation rows appear only where the run has that data

Each optional observation the chart can carry in the grid — cervical mucus, basal temperature, intercourse,
and pregnancy test — SHALL have its row present only when at least one day of the charted run holds that
value. A run with little logged SHALL stay narrow, and widening the run to include more cycles MAY add
rows. No value shown SHALL be derived, averaged, filled forward, or carried over from another day, and a
day with no value in a present row SHALL show an absence rather than a value. Symptoms and notes SHALL NOT
be grid rows at any run width, and SHALL be reported once per day in the prose list beneath the grid,
carrying the cycle day and the value recorded on that day.

#### Scenario: A run with only monitor readings stays narrow

- **GIVEN** a run whose only logged values are Day 1 menses and monitor readings
- **WHEN** the user opens the instructor chart
- **THEN** the chart carries rows for the date, menses, and the monitor reading
- **AND** it shows no mucus, temperature, intercourse, or pregnancy-test row

#### Scenario: Logged data adds a row when it is present

- **GIVEN** a run that records mucus, a temperature, intercourse on one day, and a pregnancy test
- **WHEN** the user opens the instructor chart
- **THEN** the chart carries a row for each of mucus, temperature, intercourse, and pregnancy test
- **AND** days with nothing logged in those rows show an absence, not a value

#### Scenario: Widening the run can add rows

- **GIVEN** the two most recent cycles have no temperature readings and an earlier cycle does
- **WHEN** the user widens the run to include that earlier cycle
- **THEN** the chart gains a temperature row
- **AND** the readings from the two cycles that hold none still show an absence

#### Scenario: Nothing is carried forward between days

- **WHEN** a chart row is shown for a run that has that observation
- **THEN** every value shown was recorded on that day
- **AND** no value is repeated onto a day where nothing was recorded

#### Scenario: Symptoms and notes are reported once, beneath the grid

- **GIVEN** a charted cycle with a day carrying symptoms and a day carrying a note
- **WHEN** the user opens the instructor chart
- **THEN** the prose list beneath the grid names the cycle day and the value for each
- **AND** each is named exactly once on the page
- **AND** neither appears as a row in the grid

#### Scenario: A run with no symptoms or notes adds no prose list

- **GIVEN** a charted run holding no symptoms and no notes
- **WHEN** the user opens the instructor chart
- **THEN** the chart prints no prose list of symptoms or notes for that cycle

### Requirement: The chart is handed over by printing and generates no file of its own

Producing the instructor chart SHALL render the document inside the app and hand it over through the
user's own browser print or save action. The app SHALL NOT generate a PDF, PNG, CSV, or other export file
for the chart, and SHALL NOT upload, share, or transmit it. Opening or printing the chart SHALL NOT write,
change, or delete any cycle, day record, or setting, and SHALL leave the JSON backup format, its export,
and the CSV export unchanged. The chart SHALL be presented as a printable document and SHALL NOT be
presented as a data export, and the file exports in Settings SHALL remain where they are.

#### Scenario: The user prints from the browser

- **WHEN** the user opens the chart and uses its print action
- **THEN** the app hands the document to the user's browser to print or save
- **AND** the app produces no export file of its own

#### Scenario: Nothing is stored by reading or printing the chart

- **WHEN** the user opens or prints the instructor chart
- **THEN** no cycle, day record, or setting is written, changed, or deleted

#### Scenario: The Settings data exports are untouched

- **WHEN** the user exports a JSON backup or a CSV from Settings
- **THEN** those exports are the versioned JSON backup and the spreadsheet CSV they were before this change
- **AND** neither contains chart content
- **AND** the chart's controls are not present in Settings

### Requirement: The chart is legible on screen, in either theme, and in black and white

The chart SHALL be readable in the light theme and in the dark theme. When printed, it SHALL render in
dark text on a light background regardless of the theme in use, and SHALL remain readable with colour
removed, so no value is distinguished by colour alone. The app's navigation, the controls for the
document, and the cycle-count control SHALL NOT appear in the printout, and the document SHALL start at
the top of the printed page.

#### Scenario: The chart is readable in both themes

- **WHEN** the user opens the instructor chart in either theme
- **THEN** every value on the chart is readable against the chart's background

#### Scenario: Printing from a dark-theme session is still readable

- **WHEN** the user is in dark mode and prints the chart
- **THEN** the chart prints in dark text on a light background

#### Scenario: The chart survives losing colour

- **WHEN** the chart is printed or photocopied in black and white
- **THEN** every monitor reading is still identifiable from the character used for it and the chart's
  printed legend
- **AND** the fertile-window band and every value remain identifiable without colour

#### Scenario: App chrome is absent from the printout

- **WHEN** the user prints the chart
- **THEN** the printout contains no navigation, no print control, and no cycle-count control
- **AND** the document begins at the top of the page

### Requirement: The chart is a different document from the single-cycle summary

The instructor chart and the single-cycle summary SHALL remain two separate documents with different
scopes. The summary SHALL continue to cover exactly one cycle, to state in words the basis of that
cycle's window ends, and to report the protocol warnings raised for that cycle; it SHALL be unchanged by
this capability. The chart SHALL cover a run of cycles and SHALL show the observations and computed window
for that run. Neither document SHALL be reachable only through the other, and producing one SHALL NOT
change what the other produces.

#### Scenario: The summary still covers one cycle in words

- **WHEN** the user opens the summary for a cycle
- **THEN** it covers that cycle alone
- **AND** it states in words the basis of that cycle's window ends
- **AND** it reports the protocol warnings raised for that cycle

#### Scenario: The chart covers a run rather than one cycle

- **WHEN** the user opens the instructor chart
- **THEN** it covers a run of the most recent cycles
- **AND** it does not replace or narrow the single-cycle summary

#### Scenario: The two documents are reached independently

- **WHEN** the user reaches the chart and separately the summary
- **THEN** each is reachable on its own
- **AND** producing either one leaves the other unchanged

### Requirement: Marks may be tinted as a second cue, never as the only one

The chart MAY tint a cell's background to reinforce the mark it carries. A tint SHALL never be the only way
to read a value: every value the chart shows SHALL remain identifiable from its character, and the chart
SHALL remain fully readable with colour removed. The fertile-window band SHALL be a filled cell rather
than a tint, because a fill is the mark that survives a photocopy. A tint SHALL be drawn from the app's own
theme-aware tokens rather than from a colour literal, and SHALL render as a faint neutral wash rather than
as ink when printed, so a reader who cannot use colour gains nothing and a reader who can gains a cue the
character already carries.

#### Scenario: A tint reinforces a value without carrying it

- **GIVEN** a charted cycle with monitor readings of Low, High, and Peak
- **WHEN** the user opens the instructor chart
- **THEN** each reading's cell is tinted in the app's colour for that reading
- **AND** each cell still shows its character, and the printed legend still defines it
- **AND** the chart reads identically with colour removed

#### Scenario: A cell with no value is not tinted

- **WHEN** the user reads a cell that carries no value
- **THEN** that cell is not tinted
- **AND** it is visibly empty rather than painted as though it held something

#### Scenario: The band is a fill, not a tint

- **WHEN** the chart shows the fertile window
- **THEN** the band's cells are a solid fill
- **AND** they are not tinted

#### Scenario: Tints print as a faint wash, not as ink

- **WHEN** the user prints the chart
- **THEN** a tinted cell prints as a faint neutral wash
- **AND** the chart's characters and the fertile band print in full ink

### Requirement: The chart prints a legend for every mark it uses

The chart SHALL print a legend on the sheet defining every mark it uses, in the same typeface and at the
same size as the grid itself, and the legend SHALL be part of the printed document rather than screen
chrome. A mark's meaning SHALL be available as text to assistive technology wherever the mark appears, so
that a glyph is never the only way to read a value. A mark no charted cycle actually shows SHALL NOT claim
a legend entry.

#### Scenario: The chart prints a legend for the marks it uses

- **GIVEN** a charted cycle carrying monitor readings, menses, and intercourse
- **WHEN** the user opens the instructor chart
- **THEN** the sheet prints a legend naming the character used for each of those observations
- **AND** the legend appears on the printed page

#### Scenario: A legend entry appears only for a mark the chart shows

- **GIVEN** a charted run with no pregnancy test recorded
- **WHEN** the user opens the instructor chart
- **THEN** the chart shows no pregnancy-test row
- **AND** the legend carries no entry for it

#### Scenario: Every mark has a text equivalent

- **WHEN** the user reads the instructor chart with assistive technology
- **THEN** each mark in a cell is accompanied by the observation it stands for in words
- **AND** the fertile-window band is announced as fertile or not fertile rather than by fill alone

#### Scenario: The legend survives interpretation being off

- **GIVEN** the algorithm is disabled
- **WHEN** the user opens the instructor chart
- **THEN** the chart prints a legend for the recorded observations it still shows
- **AND** the legend carries no entry for the fertile-window band

### Requirement: The charted run fits the printed page

The chart's grid SHALL never be wider than the page it is printed on, and every cycle day of a charted
cycle SHALL reach the paper. Every day column SHALL be the same width whatever any cell in it contains, so
that a column can be read straight down. A cell whose content does not fit the width available to it SHALL
show an ellipsis rather than overlap its neighbour, and SHALL NOT run off the page. Adding an observation
whose values are long SHALL NOT widen the grid. The chart SHALL print on a landscape page, and no other
document the app prints SHALL change the page it prints on because of this chart.

#### Scenario: A long cycle prints every one of its days

- **GIVEN** a charted cycle running the length of the protocol's cycle band
- **WHEN** the user prints the chart
- **THEN** every cycle day of that cycle appears on the paper
- **AND** the fertile-window band is not cut short by the edge of the page

#### Scenario: Every day column is the same width

- **GIVEN** a charted cycle where one day carries a long note and another carries nothing
- **WHEN** the user opens the instructor chart
- **THEN** every day column in that cycle is the same width

#### Scenario: A value too wide for its cell is elided, not overlapped

- **GIVEN** a page too narrow to hold a cell's value at the size the chart sets
- **WHEN** the user prints the chart
- **THEN** that cell shows an ellipsis
- **AND** its text does not run into the neighbouring cell
- **AND** no part of the grid runs off the page

#### Scenario: A long value in a row cannot widen the chart

- **GIVEN** a charted cycle with a day carrying a long run of symptoms or notes
- **WHEN** the user opens the instructor chart
- **THEN** the grid is the same width as it would be with that value absent
- **AND** the long value is reported in the prose list beneath the grid

#### Scenario: The chart prints landscape and the summary keeps its page

- **WHEN** the user prints the instructor chart
- **THEN** the chart is printed on a landscape page
- **WHEN** the user prints the single-cycle summary
- **THEN** that summary is printed on the page it was printed on before

#### Scenario: A user-chosen orientation cannot lose days off the chart

- **GIVEN** the user overrides the page orientation in the browser's own print action
- **WHEN** the chart is printed
- **THEN** every cycle day still appears on the paper
