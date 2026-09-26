# History Specification

## Purpose

Defines readable, theme-aware presentation of the History/Stats forecast panel and fertility summaries while preserving their existing calculations and clearly distinguishing predictions from confirmed records.

## Requirements

### Requirement: Forecast panel is theme-aware and visibly predictive

The History/Stats Forecast panel SHALL render its predicted badge, next-period estimate, next fertile-window estimate, based-on text, and any protocol warning with readable theme-appropriate treatment. Predictive information SHALL remain visibly labeled as predicted and SHALL NOT be presented as confirmed data. When cycle projection is enabled, the panel SHALL state which estimator produces the projected dates, so that the averages shown alongside it are not left for the user to reconcile against the projected dates.

#### Scenario: Forecast values are readable in dark mode

- **WHEN** the user opens History/Stats in dark mode with forecast data available
- **THEN** the Forecast panel labels and values are readable against their card backgrounds
- **AND** the panel retains its predicted designation

#### Scenario: Forecast warning is readable

- **WHEN** the forecast reports cycles outside the configured protocol band
- **THEN** the warning text is readable in both themes
- **AND** the warning is not lost in a light-only text color

#### Scenario: Forecast is not confused with confirmed data

- **WHEN** the user views next-period and next-fertile-window estimates
- **THEN** their predictive nature is communicated by a label, cue, or styling
- **AND** no estimate is presented as a logged or confirmed record

#### Scenario: The panel names the estimator behind projected dates

- **GIVEN** cycle projection is enabled and at least one closed cycle exists
- **WHEN** the user opens the Forecast panel
- **THEN** the panel states that projected dates use the median of the most recent completed cycle lengths
- **AND** it states how many of those cycles it actually used
- **AND** where that count is lower than the configured lookback window, it states the configured window as well
- **AND** the stated estimator matches the one that produced the displayed dates

#### Scenario: The panel makes no claim when there is nothing to project

- **GIVEN** no closed cycle is available
- **WHEN** the user opens the Forecast panel
- **THEN** the panel reports that no projection is available
- **AND** it names no estimator as having produced a date

### Requirement: Fertility statistics remain readable without changing calculations

The History/Stats cycle-stat labels, values, empty states, and cycle table SHALL use readable theme-aware text treatments. The values, cycle rows, and statistics SHALL continue to be derived from the existing engine output and SHALL not change because of a theme selection.

#### Scenario: Stats are readable in both themes

- **WHEN** the user switches between light and dark themes
- **THEN** stat labels, values, table text, and empty-state text remain readable
- **AND** the underlying statistics are identical

#### Scenario: Empty History remains understandable

- **WHEN** no forecast or cycle data is available
- **THEN** the empty states remain visible and readable in the active theme
- **AND** no missing-data state is mislabeled as a confirmed result

### Requirement: History respects the interpretation setting

When the algorithm is disabled, History/Stats SHALL suppress computed fertility forecasts and derived fertile/peak summaries that would constitute interpretation, while preserving non-interpretive logged cycle information. Re-enabling interpretation SHALL restore the existing derived summaries from the same records.

#### Scenario: Logging-only History hides computed interpretation

- **WHEN** the user disables the algorithm and opens History/Stats
- **THEN** computed forecast and fertility/peak summary values are not presented
- **AND** the view does not introduce status colors or labels that imply interpretation

#### Scenario: Re-enabling restores summaries

- **WHEN** the user re-enables the algorithm
- **THEN** the existing forecast and fertility/peak summaries are restored
- **AND** no logged data is lost

### Requirement: Fertile-day counts describe the cycle, not the logging

The History/Stats fertile-day count for a cycle SHALL count every cycle day the engine classifies as `fertile`, whether or not that day holds a stored observation. Because day status is derived for the whole cycle, the count reflects the fertile window the cycle had rather than the subset of that window the user happened to log. A cycle's fertile-day count SHALL NOT change when the user adds or removes an observation inside an already-fertile region.

#### Scenario: A sparsely logged cycle still reports its full fertile window

- **GIVEN** a cycle whose fertile window spans more days than the user recorded in
- **WHEN** the user views History/Stats
- **THEN** the cycle's fertile-day count equals the number of days in its fertile window
- **AND** it is not reduced to only the logged fertile days

#### Scenario: Logging inside the window does not change the count

- **GIVEN** a cycle with a known fertile-day count
- **WHEN** the user adds a day record on a date that is already inside the fertile window
- **THEN** the cycle's fertile-day count is unchanged

#### Scenario: A Peak that closes the window still reduces the count

- **GIVEN** an open cycle with no Peak whose window has not closed
- **WHEN** the user logs a monitor Peak that gives the cycle a window end
- **THEN** the cycle's fertile-day count reflects the now-closed window
- **AND** days after that end are no longer counted as fertile

### Requirement: History reports the Peak-day range and no average Peak day

The History/Stats cycle statistics SHALL report the earliest and latest monitor Peak days as a range and SHALL NOT report an average or median Peak day. The protocol's calendar rule derives a fertile-window range from the earliest and latest Peak only, so an averaged Peak day is not a value the protocol produces and SHALL NOT be presented as one. No Cycle-chart or Calendar surface SHALL display a single-day ovulation estimate.

#### Scenario: The Peak-day range is shown

- **GIVEN** the recorded monitor Peak days are 12, 13, 16, and 17
- **WHEN** the user views the cycle statistics
- **THEN** the statistics report a Peak-day range of 12 to 17
- **AND** no single averaged Peak day is reported

#### Scenario: No surface renders an ovulation estimate

- **WHEN** the user views the cycle statistics, the cycle chart, or the Calendar
- **THEN** no surface marks a single predicted ovulation day
- **AND** the fertile-window range remains the only ovulation-related output
