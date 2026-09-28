# Spec Delta

## ADDED Requirements

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
