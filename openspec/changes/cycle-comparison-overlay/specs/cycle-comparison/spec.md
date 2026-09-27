# Spec Delta

## Purpose

Lets users overlay multiple cycles on a single chart aligned by cycle day, so cycle-to-cycle drift in monitor readings and fertile windows is visible at a glance.

## ADDED Requirements

### Requirement: Multi-cycle overlay chart

The system SHALL provide a comparison view that overlays two or more cycles on a single chart, aligned by cycle day (day 1 through the longest cycle in the set).

#### Scenario: Two or more cycles overlaid and visually distinguishable

- **WHEN** the user opens the comparison view with two or more cycles selected
- **THEN** each cycle's monitor band and fertile-window band render with a distinct per-cycle visual treatment so cycles can be told apart where they overlap

#### Scenario: Cycles align on cycle day, not calendar date

- **WHEN** cycles of different lengths are overlaid
- **THEN** day 1 of each cycle aligns at the same x position, and day N of each cycle aligns at the same x position regardless of each cycle's calendar start date

#### Scenario: Shorter cycles do not truncate the shared axis

- **WHEN** the set contains cycles of different lengths
- **THEN** the x-axis spans day 1 through the longest cycle's length, and shorter cycles pad with empty day columns so their bands line up with the longer cycles

### Requirement: Per-cycle fertile-window bands

The system SHALL render each cycle's fertile-window band when interpretation is enabled, and SHALL NOT render any window band when interpretation is disabled.

#### Scenario: Window bands render when interpretation is enabled

- **WHEN** the algorithm is enabled and a cycle in the set has a computed fertile window
- **THEN** that cycle's window band renders with the cycle's visual treatment

#### Scenario: No window bands when interpretation is disabled

- **WHEN** the algorithm is disabled
- **THEN** no fertile-window band renders for any cycle, while monitor bands continue to render

### Requirement: Cycle identification on hover and focus

The system SHALL identify individual cycles via hover or keyboard focus, showing the cycle number and length.

#### Scenario: Hovering a band identifies its cycle

- **WHEN** the user hovers over a monitor band or window band belonging to a specific cycle
- **THEN** a tooltip or accessible label shows that cycle's number and length

### Requirement: Configurable cycle selection

The system SHALL let the user choose which cycles participate in the comparison, defaulting to the most recent N cycles where N equals the configured history window.

#### Scenario: Default selection is the most recent N cycles

- **WHEN** the user opens the comparison view without changing any selection
- **THEN** the most recent N cycles are selected, where N is the configured history window value

#### Scenario: User can change the number of recent cycles

- **WHEN** the user changes the cycle count control
- **THEN** the comparison re-renders with the new number of most recent cycles

#### Scenario: User can pick specific cycles

- **WHEN** the user chooses specific cycles from the available set
- **THEN** only those cycles appear in the comparison

### Requirement: Empty and single-cycle handling

The comparison view SHALL handle zero cycles, a single cycle, and an open-cycle-only set without errors or an empty shell.

#### Scenario: Zero cycles shows an empty state

- **WHEN** no cycles exist
- **THEN** the view shows a message directing the user to log a cycle, not an empty chart

#### Scenario: Single cycle renders normally

- **WHEN** only one cycle exists
- **THEN** the comparison view renders that cycle's bands without error

#### Scenario: Open cycle only renders without error

- **WHEN** the only cycle is open (not closed)
- **THEN** the comparison view renders its bands without error
