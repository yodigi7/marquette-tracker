# Spec Delta

## ADDED Requirements

### Requirement: Status reports a protocol warning affecting the selected cycle

The Status view SHALL report any engine warning affecting the selected cycle, including monitor
evidence recorded outside the computed fertile window and an open cycle that has run past its
computed end. A warning SHALL be presented as a protocol observation about the user's own data, not
as a device malfunction, and SHALL NOT be phrased as a medical disclaimer. With interpretation
disabled the view SHALL continue to suppress all derived output, warnings included, because a
warning is derived output.

A warning belongs to the cycle, not to a single date, so it SHALL be shown whenever any date in the
affected cycle is selected, and it SHALL name the cycle day the offending reading falls on rather
than leaving the day implicit. It SHALL be presented ahead of the derived status treatment, because
the warning and the status are in tension: the status reports what the model concluded while the
warning reports that a recorded reading contradicts it. It SHALL be visually distinct from both the
status treatment and the window explanation, SHALL be identifiable without relying on colour alone,
and SHALL be readable in both themes. It SHALL use the app's existing warning visual language
rather than introducing a new palette, and it SHALL offer no dismiss control, because it is derived
output that recurs until the underlying data changes.

#### Scenario: Out-of-window evidence is reported for the selected cycle

- **GIVEN** a cycle whose computed window ends before a day holding a user-entered monitor `high`
- **WHEN** the user opens Status for a date in that cycle and interpretation is enabled
- **THEN** the view reports that the reading falls outside the computed window
- **AND** the computed window end it displays is unchanged

#### Scenario: A cycle still in progress past its computed end is reported

- **GIVEN** an open cycle whose computed window end precedes the current day
- **WHEN** the user opens Status for a date in that cycle and interpretation is enabled
- **THEN** the view reports that the cycle is still in progress past its computed end

#### Scenario: The warning is shown for any date in the affected cycle

- **GIVEN** a cycle with an out-of-window monitor reading on cycle day 15
- **WHEN** the user opens Status for a date earlier in that same cycle
- **THEN** the warning is still shown
- **AND** it names cycle day 15 as the day the reading falls on

#### Scenario: The warning precedes the derived status

- **GIVEN** a cycle with a warning and a resolved derived status
- **WHEN** the user opens Status for a date in that cycle
- **THEN** the warning is presented above the status treatment
- **AND** the status treatment and the window explanation remain unchanged

#### Scenario: The warning is identifiable without colour

- **WHEN** the Status view shows a protocol warning
- **THEN** the warning carries text naming the recorded reading, the cycle day it falls on, and the
  computed window end
- **AND** it is distinguishable from the status treatment and window explanation in both light and
  dark themes without colour being the only cue

#### Scenario: The warning cannot be dismissed

- **WHEN** a protocol warning is shown
- **THEN** no dismiss or acknowledge control is offered for it
- **AND** the warning continues to be shown on every load until the underlying data changes

#### Scenario: No warning is reported for an ordinary cycle

- **GIVEN** a cycle with no evidence outside its computed window
- **WHEN** the user opens Status for a date in that cycle
- **THEN** no protocol warning is shown for that cycle

#### Scenario: Warnings are suppressed when interpretation is disabled

- **GIVEN** a cycle with an out-of-window evidence warning
- **WHEN** the user opens Status while the algorithm is disabled
- **THEN** no protocol warning is shown
- **AND** the view continues to explain that readings are logged without interpretation

#### Scenario: A warning is not a disclaimer

- **WHEN** the Status view reports a protocol warning
- **THEN** the warning describes the user's recorded readings and the computed window
- **AND** it renders no medical disclaimer text
- **AND** it does not describe the monitor or a reading as invalid, erroneous, or malfunctioning
