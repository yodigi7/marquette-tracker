# cycle-comparison Specification

## Purpose

Lets users overlay multiple cycles on a single chart aligned by cycle day, so cycle-to-cycle drift in monitor readings and fertile windows is visible at a glance.

## Requirements

### Requirement: Multi-cycle overlay chart

The system SHALL provide a comparison view that overlays two or more cycles on a single chart, aligned by cycle day (day 1 through the longest cycle in the set).

#### Scenario: Two or more cycles overlaid and visually distinguishable

- **WHEN** the user opens the comparison view with two or more cycles selected
- **THEN** each cycle's monitor band renders with that cycle's own colour, and cycles can be told apart where they overlap
- **AND** a cycle's colour is the same in its row label, in the legend, and in its plotted data

#### Scenario: Cycles align on cycle day, not calendar date

- **WHEN** cycles of different lengths are overlaid
- **THEN** day 1 of each cycle aligns at the same x position, and day N of each cycle aligns at the same x position regardless of each cycle's calendar start date

#### Scenario: Shorter cycles do not truncate the shared axis

- **WHEN** the set contains cycles of different lengths
- **THEN** the x-axis spans day 1 through the longest cycle's length, and shorter cycles pad with empty day columns so their bands line up with the longer cycles

#### Scenario: Hiding a cycle does not change the other cycles' colours

- **WHEN** the user hides one cycle from the comparison
- **THEN** every remaining cycle keeps the colour it had before, and the legend continues to agree with the plotted data

### Requirement: Per-cycle fertile-window bands

The system SHALL render each cycle's fertile-window band when interpretation is enabled, and SHALL NOT render any window band when interpretation is disabled.

#### Scenario: Window bands render when interpretation is enabled

- **WHEN** the algorithm is enabled and a cycle in the set has a computed fertile window
- **THEN** that cycle's window band renders for the span of the window

#### Scenario: Window bands do not take a cycle's colour

- **WHEN** a cycle's window band renders
- **THEN** the band uses a single neutral treatment shared by every cycle rather than that cycle's own colour
- **AND** the monitor band drawn over it, including the thin track drawn for an unlogged day, remains distinguishable from the band behind it

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

### Requirement: Stable per-cycle colour identity

The system SHALL derive each cycle's comparison colour from that cycle's position among **all logged cycles, ordered newest first**, and SHALL NOT derive it from the cycles currently selected for comparison. The colour SHALL be derived whenever the view reads its data and SHALL NOT be stored on the cycle record.

Because every control that changes which cycles are shown reads the same anchor, a cycle's colour SHALL be invariant under all of them.

#### Scenario: Colour is anchored to all logged cycles, not the selection

- **GIVEN** five logged cycles and a comparison showing only some of them
- **WHEN** the comparison renders
- **THEN** each shown cycle's colour is the one its position among all five logged cycles determines, newest taking the first colour
- **AND** removing a cycle from the comparison does not shift the colours of the cycles that remain

#### Scenario: Changing the cycle count does not repaint

- **WHEN** the user changes the number of most recent cycles in the comparison
- **THEN** the cycles that appear in both the previous and the new comparison keep the same colour

#### Scenario: Hand-picking specific cycles does not repaint

- **WHEN** the user selects a particular set of cycles in custom mode
- **THEN** each selected cycle's colour matches the colour it has in any other mode and in any other selection containing it

#### Scenario: Colour is derived at read time rather than stored

- **WHEN** the comparison view reads the same logged cycles again
- **THEN** it produces the same colours for the same cycles
- **AND** no colour is written to or read from any stored cycle

### Requirement: Comparison palette covers the selectable range

The system SHALL provide at least as many distinct cycle colours as the comparison view's cycle-count control permits a user to select, so that no two simultaneously selected cycles are forced to share a colour by the palette running out.

The first six colours, which are the ones on screen together for the default history window, SHALL be mutually distinguishable rather than merely different from their immediate neighbours, because every one of them is visible alongside every other.

#### Scenario: A full-size comparison has no repeated colour

- **WHEN** the user selects as many cycles as the control allows
- **THEN** every selected cycle renders in a different colour

#### Scenario: The default-size comparison is mutually distinguishable

- **WHEN** six cycles are shown together
- **THEN** any two of the six are told apart by colour, not only the two that sit next to each other
