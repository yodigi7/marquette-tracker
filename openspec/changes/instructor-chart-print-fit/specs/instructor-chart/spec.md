# Spec Delta

## MODIFIED Requirements

### Requirement: The chart lays cycle days across and one row per kind of observation

The instructor chart SHALL present its days as columns running left to right in cycle-day order, with each
kind of observation as a row, and SHALL stack the cycles back to back down the page in cycle order. The
grid SHALL carry a row for the date of every day, a row marking each day's monitor reading with a single
character drawn from the chart's printed legend, a row for menses, and rows for each optional observation
the run has data for. Every cycle day in a charted cycle SHALL have a column, whether or not a day record
exists for it, and a day holding no record SHALL show the absence rather than a value, except in the
monitor row, where a day the monitor was not used and a day holding no record SHALL show the same mark.
Symptoms and notes SHALL NOT be grid rows; the chart SHALL report them once per day in the prose list
printed beneath the grid.

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
- **AND** it shows no value for that day in any observation row other than the monitor row
- **AND** in the monitor row it shows the same mark as a day the monitor was not used

#### Scenario: The date row is in short form

- **WHEN** the user reads the instructor chart
- **THEN** the date row shows each day's month and day rather than the full date
- **AND** the year is still printed for each cycle, on the cycle's own Day 1 heading

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

## ADDED Requirements

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
