# Spec Delta

## ADDED Requirements

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

## MODIFIED Requirements

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
