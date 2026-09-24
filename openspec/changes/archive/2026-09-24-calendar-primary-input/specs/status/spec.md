# Spec Delta

## Purpose

Provides a read-only, date-selectable view of the app's derived cycle status without mixing status inspection with daily data entry.

## ADDED Requirements

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

When interpretation is enabled, Status SHALL show the selected date's status, cycle day, confirmed or predicted source, fertile-window explanation, and next-period estimate when available. When interpretation is disabled, Status SHALL explain that data is logged without interpretation and SHALL NOT show computed fertile-window status.

#### Scenario: Interpretation enabled
- **WHEN** the user opens Status for a date with a derived cycle and interpretation is enabled
- **THEN** the view shows the status, cycle day, source, window explanation, and next-period estimate when available

#### Scenario: Interpretation disabled
- **WHEN** the user opens Status while the algorithm is disabled
- **THEN** the view explains that readings are logged without interpretation
- **AND** no computed fertile-window status is shown

### Requirement: Status does not render a medical disclaimer

The Status view SHALL NOT render a medical disclaimer.

#### Scenario: Opening Status
- **WHEN** the user opens `/status`
- **THEN** the rendered Status view contains no medical disclaimer text
