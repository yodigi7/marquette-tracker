# Status Specification

## Purpose

Provides a read-only, date-selectable view of the app's derived cycle status without mixing status inspection with daily data entry.

## Requirements

### Requirement: Status is date-selectable and read-only

The app SHALL provide a Status view at `/status` with a date picker and a derived status summary for the selected date. The Status view SHALL NOT provide daily-entry, start-cycle, or delete controls.

#### Scenario: Inspecting a selected date
- **WHEN** the user opens Status and selects a date
- **THEN** the view shows the derived status information for that date
- **AND** no daily-entry, start-cycle, or delete controls are shown

#### Scenario: No cycle exists for the selected date
- **WHEN** the selected date has no derived cycle
- **THEN** the view shows a no-cycle state
- **AND** it does not offer a separate start-cycle form

### Requirement: Status reflects the algorithm setting

When interpretation is enabled, Status SHALL show the selected date's status, cycle day, fertile-window explanation, and next-period estimate when available. The status SHALL be derived for any date inside a cycle, whether or not a Day Record exists for that date. When interpretation is disabled, Status SHALL explain that data is logged without interpretation and SHALL NOT show computed fertile-window status.

#### Scenario: Interpretation enabled

- **WHEN** the user opens Status for a date inside a cycle and interpretation is enabled
- **THEN** the view shows the status, cycle day, window explanation, and next-period estimate when available
- **AND** it shows no status source

#### Scenario: An unlogged date inside a cycle still reports a status

- **GIVEN** a date inside a cycle's fertile window that has no Day Record
- **WHEN** the user opens Status for that date
- **THEN** the view shows the derived `fertile` status for that cycle day

#### Scenario: Interpretation disabled

- **WHEN** the user opens Status while the algorithm is disabled
- **THEN** the view explains that readings are logged without interpretation
- **AND** no computed fertile-window status is shown

### Requirement: Status does not render a medical disclaimer

The Status view SHALL NOT render a medical disclaimer.

#### Scenario: Opening Status
- **WHEN** the user opens `/status`
- **THEN** the rendered Status view contains no medical disclaimer text

### Requirement: Status summaries are readable in both themes

The Status view SHALL render each status label, the fertile-window explanation, and any next-period estimate with theme-appropriate colors and text contrast. The view SHALL preserve the existing status labels and SHALL not introduce a new status category.

#### Scenario: Status badge is readable in dark mode

- **WHEN** the user opens Status for a date with a derived status in dark mode
- **THEN** the status badge and its text are readable against the card background
- **AND** the badge's color or cue matches the corresponding Calendar treatment

#### Scenario: Explanation text remains readable

- **WHEN** the Status view shows a fertile-window explanation or next-period estimate
- **THEN** the text remains readable in both light and dark themes
- **AND** no information is conveyed only by a light-only text color

### Requirement: Status presents one treatment per status and keeps estimates predictive

The Status view SHALL present each derived status with a single visual treatment and SHALL NOT report a confirmed or predicted status source. A next-period estimate SHALL remain visibly predictive rather than being presented as confirmed data. Any predictive cue SHALL use the shared fertility visual language.

#### Scenario: Status shows no source badge

- **WHEN** the user views Status for a date with a derived status
- **THEN** the view shows the status, cycle day, window explanation, and next-period estimate when available
- **AND** it shows no confirmed or predicted source badge or cue

#### Scenario: A status has one consistent treatment

- **WHEN** two dates have the same derived status
- **THEN** their status badges use the same visual treatment
- **AND** the view distinguishes them only by the status itself, not by an evidence-strength variant

#### Scenario: Estimated period is visibly predictive

- **WHEN** a next-period estimate is available
- **THEN** its predictive nature is communicated by a label, cue, or styling
- **AND** it cannot be confused with a confirmed period record
