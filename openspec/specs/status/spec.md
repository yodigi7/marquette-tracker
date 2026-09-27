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

### Requirement: Status labels use the Calendar phase vocabulary and assert no safety

The Status view SHALL label a derived status with the same phase vocabulary the Calendar uses for that status: `Before` for `pre-fertile`, `Fertile` for `fertile`, and `After` for both `post-peak` and `post-calendar`. The two post-window statuses SHALL remain individually identifiable, so a reader can tell a window closed by a monitor Peak from one closed by the calendar rule. No status label SHALL assert that a date is safe, infertile, or unlikely to conceive, because a day status is derived from the computed window and the cycle day alone and does not consider the observations recorded on that date.

#### Scenario: Phase vocabulary matches the Calendar

- **WHEN** the Status view shows a label for a derived status
- **THEN** the label names the same phase the Calendar uses for that status
- **AND** the precise internal status remains identifiable from the label or its accompanying explanation

#### Scenario: No label asserts safety

- **WHEN** the user opens Status for a date whose derived status is `post-peak` or `post-calendar`
- **THEN** the label uses the `After` phase vocabulary
- **AND** it makes no claim that the date is safe, infertile, or unlikely to conceive

#### Scenario: The two post-window statuses remain distinguishable

- **GIVEN** one date whose status is `post-peak` and another whose status is `post-calendar`
- **WHEN** the user views each in Status
- **THEN** the two labels differ from each other
- **AND** each identifies the rule that produced its window end

#### Scenario: A recorded reading does not license a safety claim

- **GIVEN** a date carrying a user-entered monitor reading whose derived status is post-window
- **WHEN** the user opens Status for that date
- **THEN** the label asserts no infertility or safety claim
- **AND** no medical disclaimer is added in place of that claim

### Requirement: Status summaries are readable in both themes

The Status view SHALL render each status label, the fertile-window explanation, and any next-period estimate with theme-appropriate colors and text contrast. The view SHALL not introduce a new status category, and the label wording it uses SHALL be the wording specified for the phase vocabulary requirement.

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

### Requirement: Status reports the days since the Peak reading and the expected Peak-day range

For the cycle derived from the selected date, the Status view SHALL report how many cycle days have
elapsed since the monitor Peak reading from which that cycle's fertile-window end is measured. The
count SHALL be a retrospective restatement of a reading the user has already entered, and SHALL be
expressed in cycle days rather than elapsed calendar days, so a cycle day holding no record does not
change it. The count SHALL name the cycle day of the reading it measures from, and when the cycle
holds more than one monitor Peak reading it SHALL also say how many there are, so the readout never
implies a cycle can hold only one.

When the selected cycle holds no monitor Peak reading, the view SHALL show an empty state naming that
absence and SHALL NOT show a number. When the selected date falls earlier in the cycle than the Peak
reading, the view SHALL name the Peak's cycle day and SHALL NOT show a count in either direction. When
the selected date has not yet arrived, the view SHALL name the Peak's cycle day and SHALL NOT show a
count, because a count states that days have elapsed and a date still to come has none.

The view SHALL NOT present a countdown to a Peak day, an expected single Peak day, or any single-day
ovulation estimate. The view SHALL report the range of the earliest and latest monitor Peak days
within the configured history window, labelled as derived from past cycles, and SHALL NOT present it as
a prediction of a specific day. With interpretation disabled the view SHALL suppress both the count
and the range, because both are derived output.

#### Scenario: Days since the Peak reading are reported

- **GIVEN** a cycle with a monitor Peak reading on cycle day 12
- **WHEN** the user opens Status for cycle day 15 of that cycle and interpretation is enabled
- **THEN** the view reports 3 days since that Peak reading
- **AND** it names cycle day 12 as the day the reading falls on

#### Scenario: The count is in cycle days and ignores unlogged days

- **GIVEN** a cycle with a monitor Peak reading on cycle day 12 and no records for days 13 and 14
- **WHEN** the user opens Status for cycle day 15
- **THEN** the reported count is 3
- **AND** the unlogged days do not change it

#### Scenario: No Peak reading yet shows an empty state

- **GIVEN** a cycle with no monitor Peak reading
- **WHEN** the user opens Status for a date in that cycle and interpretation is enabled
- **THEN** the view states that no Peak reading is logged for the cycle
- **AND** it displays no number of days

#### Scenario: Multiple Peak readings name the one the count measures from

- **GIVEN** a cycle with monitor Peak readings on cycle days 12 and 15
- **WHEN** the user opens Status for cycle day 17
- **THEN** the reported count of 2 days is measured from cycle day 15
- **AND** the view states that cycle day 15 is the last of 2 Peak readings in the cycle
- **AND** it does not present the count as if the cycle held only one Peak reading

#### Scenario: A date before the Peak reading shows no count

- **GIVEN** a cycle with a monitor Peak reading on cycle day 12
- **WHEN** the user opens Status for cycle day 8 of that cycle
- **THEN** the view names cycle day 12 as that cycle's Peak reading
- **AND** it displays no count of days in either direction

#### Scenario: A date that has not happened yet shows no count

- **GIVEN** a cycle with a monitor Peak reading on cycle day 11 and today on cycle day 15
- **WHEN** the user selects a date in that cycle that is still in the future, such as cycle day 20
- **THEN** the view names cycle day 11 as that cycle's Peak reading
- **AND** it states that the selected date has not happened yet
- **AND** it displays no count of elapsed days, because none of those days have elapsed

#### Scenario: The expected Peak-day range is reported

- **GIVEN** the monitor Peak days inside the configured history window are 12, 16, and 17
- **WHEN** the user opens Status for a date in the current cycle
- **THEN** the view reports an expected Peak day of cycle day 12 to 17
- **AND** it states that the range comes from past cycles

#### Scenario: The range follows the configured history window

- **GIVEN** the configured history window is 6
- **AND** the user has 10 closed cycles whose monitor Peak days include day 11
- **WHEN** the user opens Status for a date in the current cycle
- **THEN** the reported range is drawn from the monitor Peak days of the most recent 6 cycles only
- **AND** the reported range is the one from which the displayed window begin and end were derived

#### Scenario: The range is not a prediction of a specific day

- **WHEN** the view reports an expected Peak-day range
- **THEN** it reports the range only, with no single expected Peak day
- **AND** it shows no countdown toward any day
- **AND** it renders no confirmed or predicted source cue for the range

#### Scenario: A history window with no Peak reports no range

- **GIVEN** no cycle inside the configured history window carries a monitor Peak reading
- **WHEN** the user opens Status for a date in the current cycle
- **THEN** the view reports no expected Peak-day range

#### Scenario: Nothing is reported with interpretation disabled

- **GIVEN** a cycle with a monitor Peak reading
- **WHEN** the user opens Status while the algorithm is disabled
- **THEN** no count of days since the Peak is shown
- **AND** no expected Peak-day range is shown
- **AND** the view continues to explain that readings are logged without interpretation
