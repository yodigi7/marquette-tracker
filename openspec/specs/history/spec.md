# History Specification

## Purpose

Defines readable, theme-aware presentation of the History/Stats forecast panel and fertility summaries while preserving their existing calculations and clearly distinguishing predictions from confirmed records.

## Requirements

### Requirement: Forecast panel is theme-aware and visibly predictive

The History/Stats Forecast panel SHALL render its predicted badge, next-period estimate, next fertile-window estimate, based-on text, and any protocol warning with readable theme-appropriate treatment. Predictive information SHALL remain visibly labeled as predicted and SHALL NOT be presented as confirmed data.

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
