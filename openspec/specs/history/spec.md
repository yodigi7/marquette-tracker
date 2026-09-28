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

### Requirement: History cycle rows open the cycle chart

Each cycle row in the History cycle table SHALL be an interactive control that navigates to that cycle's chart at `/cycle/<cycleId>`. The control SHALL be keyboard-focusable and activatable without a pointer, and SHALL carry an accessible name that includes the cycle number and Day 1. The cycle identity cell SHALL be visually identified as the control. Navigation SHALL work for both closed and open cycles, and SHALL continue to work when the algorithm is disabled and derived columns are hidden. The existing cycle-chart route, cycle selector, and empty/fallback behavior for an unknown or deleted cycle id SHALL be preserved.

#### Scenario: Clicking a cycle row opens that cycle's chart

- **WHEN** the user clicks a cycle row in the History table
- **THEN** the app navigates to `/cycle/<cycleId>` for that exact cycle
- **AND** the cycle chart selects and displays the same cycle

#### Scenario: The row is keyboard-focusable and activatable

- **WHEN** the user tabs to a cycle row and presses Enter or Space
- **THEN** the app navigates to that cycle's chart
- **AND** the row is reachable and activatable without a pointer

#### Scenario: The control has an accessible name with cycle context

- **WHEN** a screen reader or assistive technology encounters a cycle row
- **THEN** the row exposes an accessible name that includes the cycle number and Day 1
- **AND** the cycle identity cell is identified as the control

#### Scenario: Closed and open cycles both navigate

- **WHEN** the user activates a closed cycle row or an open cycle row
- **THEN** both navigate to their respective cycle chart

#### Scenario: Navigation works when the algorithm is disabled

- **WHEN** the algorithm is disabled so derived columns are hidden
- **THEN** cycle rows remain navigable and open the cycle chart

#### Scenario: Browser back and forward preserve route behavior

- **WHEN** the user opens a cycle chart from History and then uses browser back
- **THEN** the user returns to History
- **AND** forward navigation returns to the cycle chart

#### Scenario: An unknown or deleted cycle id uses the existing fallback

- **WHEN** the cycle chart receives a cycle id that no longer exists
- **THEN** the cycle chart shows its existing empty/fallback state

### Requirement: History offers the instructor chart over a run of recent cycles

The History view SHALL provide an entry point that opens the printable instructor chart for a run of the
user's most recent cycles, covering the configured history window by default and offering to cover a
different number of cycles. The entry point SHALL be reachable and operable without a pointer, and SHALL
carry an accessible name that identifies it as the instructor chart. The entry point SHALL NOT interfere
with the existing cycle-row navigation to the cycle chart: a cycle row SHALL continue to navigate to that
cycle's chart, and the entry point SHALL remain activatable independently of it. When no cycle exists the
entry point SHALL NOT be offered.

#### Scenario: History opens the chart for the default run

- **GIVEN** the user has at least one logged cycle
- **WHEN** the user activates the instructor chart entry point in History
- **THEN** the app opens the instructor chart for the configured history window of the user's most recent
  cycles

#### Scenario: The user can change how many cycles are charted

- **WHEN** the user opens the instructor chart from History and changes the cycle count
- **THEN** the chart covers that many of the user's most recent cycles
- **AND** the change is not stored as a preference

#### Scenario: The entry point is reachable without a pointer

- **WHEN** the user tabs to the instructor chart entry point and presses Enter or Space
- **THEN** the app opens the instructor chart
- **AND** the control is reachable and activatable without a pointer

#### Scenario: The control has an accessible name

- **WHEN** a screen reader or assistive technology encounters the entry point
- **THEN** it is exposed as the instructor chart control
- **AND** its name identifies it as the instructor chart rather than as a data export

#### Scenario: Cycle rows still navigate to their cycle chart

- **WHEN** the History view carries the instructor chart entry point
- **THEN** activating a cycle row still navigates to that cycle's chart
- **AND** the existing cycle-chart route, cycle selector, and unknown-cycle fallback are unchanged

#### Scenario: The entry point is not offered with no cycles

- **GIVEN** the user has no logged cycles
- **WHEN** the user opens History
- **THEN** the instructor chart entry point is not offered
- **AND** the existing empty state is shown
