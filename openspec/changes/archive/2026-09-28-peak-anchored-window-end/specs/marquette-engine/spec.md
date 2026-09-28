# Spec Delta

## MODIFIED Requirements

### Requirement: The post-Peak interval is a fixed three-day protocol constant

The engine SHALL end the fertile window on the third day after the last monitor Peak, so that for a
user-entered monitor Peak on cycle day P the inclusive fertile window is P through P+3. This
interval SHALL be a protocol constant and SHALL NOT be exposed as a configurable preference, so no
stored or user-supplied value can alter it. The interval SHALL be measured from the cycle's own monitor
Peak and from no other reading, in every cycle, so the window never closes before the Peak day that
defines it.

#### Scenario: Three-day interval after a monitor Peak

- **WHEN** a monitor Peak occurs on cycle day 14
- **THEN** the fertile window includes days 14 through 17
- **AND** every day in that range is reported as `fertile` whether or not it holds a record
- **AND** day 18 and later are reported as post-window statuses

#### Scenario: The historical end rule uses the same interval

- **GIVEN** more than six cycles of history and a current cycle with a monitor Peak
- **WHEN** the engine computes the current cycle's window end
- **THEN** the end is three days after the current cycle's own monitor Peak
- **AND** the Peak days of the last six cycles are not consulted for the end

#### Scenario: A late Peak is not cut short by earlier cycles' Peaks

- **GIVEN** more than six cycles of history whose latest monitor Peak day is 16
- **AND** the current cycle records a monitor Peak on cycle day 20
- **WHEN** the engine computes the current cycle's window end
- **THEN** the end is three days after cycle day 20
- **AND** the end is not the three days after the earlier cycle's Peak day
- **AND** cycle day 20 and the three days after it are all reported as `fertile`

#### Scenario: No post-Peak preference exists

- **WHEN** the user opens Settings
- **THEN** no post-Peak interval control is offered
- **AND** the reported window end is the monitor Peak day plus three regardless of any value held in
  previously stored data

### Requirement: The engine reports the monitor Peak days its calendar rule is derived from

For the current cycle, the engine SHALL report the earliest and latest monitor Peak day within the
configured history window, together with the number of cycles in that window that carried a monitor
Peak reading. The reported range SHALL be the one from which the calendar rule derived the current
cycle's window begin, so that the begin the engine reports can be derived from the range the engine
reports. When the configured history window holds no monitor Peak reading, the engine SHALL report no
range. The engine SHALL NOT compute or report an average or median monitor Peak day, which the
protocol's calendar rule does not produce.

The range within the configured history window is distinct from a statistic taken across every
recorded cycle. A surface reporting the range the calendar rule used, and a surface reporting what the
user's whole history looks like, are both correct and SHALL NOT be conflated. The range determines the
current cycle's window begin only; the current cycle's own monitor Peak determines its end.

#### Scenario: The reported range is the one the calendar rule used

- **GIVEN** the configured history window is 6
- **AND** the monitor Peak days of the most recent 6 closed cycles are 12, 16, and 17
- **WHEN** the engine computes the current cycle
- **THEN** the reported range is cycle day 12 to 17
- **AND** the current cycle's calendar-rule begin is six days before 12

#### Scenario: The range is scoped to the configured window

- **GIVEN** the configured history window is 6
- **AND** the user has 10 closed cycles whose monitor Peak days include day 11 and day 19
- **WHEN** the engine computes the current cycle
- **THEN** the reported range is drawn from the most recent 6 closed cycles only
- **AND** it does not widen to include the cycles outside the window

#### Scenario: Fewer closed cycles than the window

- **GIVEN** the configured history window is 6
- **AND** only 3 closed cycles exist, with monitor Peak days 14 and 15
- **WHEN** the engine computes the current cycle
- **THEN** the reported range is cycle day 14 to 15
- **AND** the reported number of contributing cycles is 2

#### Scenario: A window holding no monitor Peak reports no range

- **GIVEN** no cycle inside the configured history window carries a monitor Peak reading
- **WHEN** the engine computes the current cycle
- **THEN** no monitor Peak range is reported

#### Scenario: No averaged Peak day is reported

- **WHEN** the engine reports a monitor Peak range
- **THEN** it reports the earliest and latest day only
- **AND** no average, mean, or median Peak day is reported alongside it

## ADDED Requirements

### Requirement: The window end is never earlier than the Peak day that defines it

For a cycle holding a user-entered monitor Peak, the engine SHALL report a fertile-window end that is
on or after that Peak's cycle day. This SHALL hold in every cycle, including cycles beyond the first six
and cycles whose Peak day is later than every Peak day in the configured history window. The engine
SHALL NOT move a window end earlier on the strength of a reading from a different cycle.

#### Scenario: The end follows the current Peak when it is the latest yet

- **GIVEN** the monitor Peak days of the most recent 6 closed cycles are 12, 16, 13, 14, 16, and 15
- **AND** the current cycle records a monitor Peak on cycle day 20
- **WHEN** the engine computes the current cycle
- **THEN** the reported window end is on or after cycle day 20
- **AND** the Peak day and the three days after it are reported as `fertile`

#### Scenario: The end follows the current Peak when it is the earliest yet

- **GIVEN** the monitor Peak days of the most recent 6 closed cycles are 12, 16, 13, 14, 16, and 15
- **AND** the current cycle records a monitor Peak on cycle day 10
- **WHEN** the engine computes the current cycle
- **THEN** the reported window end is three days after cycle day 10
- **AND** the end is not pulled earlier by the later Peaks in earlier cycles

#### Scenario: A cycle with a Peak never reports an end before it

- **GIVEN** a cycle with a user-entered monitor Peak on cycle day P
- **WHEN** the engine computes that cycle for any cycle number
- **THEN** the reported fertile-window end is on or after cycle day P

### Requirement: A cycle without a monitor Peak has no fertile-window end

The protocol defines the fertile window's end only through a monitor Peak. A cycle holding no
user-entered monitor Peak SHALL therefore report no end day, in every cycle including cycles beyond the
first six, and every day in the cycle from the window's begin onward SHALL be reported as `fertile`.
The engine SHALL NOT substitute a date derived from any other cycle's Peak, and SHALL NOT treat such a
cycle's window as settled. The engine SHALL report a protocol warning that the cycle has no Peak to
measure the end from, so that a surface can say the cycle is unresolved rather than leaving the absence
unexplained.

#### Scenario: A peakless cycle after the sixth cycle has no end

- **GIVEN** a cycle beyond the first six with no user-entered monitor Peak
- **WHEN** the engine computes that cycle
- **THEN** the reported fertile-window end is undetermined
- **AND** no end day derived from an earlier cycle's Peak is reported
- **AND** the engine reports a warning that this cycle has no Peak to measure the end from

#### Scenario: A peakless cycle stays fertile through the current day

- **GIVEN** a cycle with no user-entered monitor Peak and a window that has begun
- **WHEN** the engine computes that cycle
- **THEN** every day from the window's begin onward is reported as `fertile`
- **AND** no day is reported as a post-window status on the basis of a date from another cycle

#### Scenario: A first-cycle peakless cycle behaves the same way

- **GIVEN** a cycle within the first six with no user-entered monitor Peak
- **WHEN** the engine computes that cycle
- **THEN** the reported fertile-window end is undetermined
- **AND** the cycle is reported the same way as a peakless cycle beyond the sixth

### Requirement: A run of nine or more consecutive High readings is reported

The engine SHALL count the longest run of consecutive cycle days carrying a user-entered monitor `high`
reading, treating a `peak` reading as ending the run and a cycle day with no `high` reading as ending it.
When that run reaches nine days, the engine SHALL report a warning naming the length of the run, so a
surface can tell the user that a Peak is unlikely and that the monitor's guidance is to stop testing.
The engine SHALL NOT treat the run as a Peak, SHALL NOT move any window boundary because of it, and
SHALL NOT report a run shorter than nine days.

#### Scenario: A run of nine High readings is reported

- **GIVEN** a cycle carrying monitor `high` readings on nine consecutive cycle days and no Peak
- **WHEN** the engine computes that cycle
- **THEN** the engine reports a warning naming a run of 9 High readings
- **AND** no monitor Peak is inferred from the run

#### Scenario: A run of eight High readings is not reported

- **GIVEN** a cycle carrying monitor `high` readings on eight consecutive cycle days and no Peak
- **WHEN** the engine computes that cycle
- **THEN** the engine reports no warning about a run of High readings

#### Scenario: A run interrupted by a Low is not joined to the next run

- **GIVEN** a cycle carrying `high` on cycle days 6 through 13, `low` on day 14, and `high` again on
  day 15
- **WHEN** the engine computes that cycle
- **THEN** the engine reports no warning about a run of High readings
- **AND** the two runs of 8 are not treated as one run of 9

#### Scenario: A run of nine survives an interruption as its own run

- **GIVEN** a cycle carrying `high` on cycle days 6 through 14, `low` on day 15, and `high` again on
  day 16
- **WHEN** the engine computes that cycle
- **THEN** the engine reports a warning naming a run of 9 High readings
- **AND** it does not report a run of 11

#### Scenario: A day with no reading is not a High

- **GIVEN** a cycle carrying `high` on cycle days 6 through 14 and no reading at all on day 15
- **WHEN** the engine computes that cycle
- **THEN** the engine reports no warning about a run of High readings
- **AND** the unlogged day breaks the run rather than extending it

#### Scenario: A Peak ends the run

- **GIVEN** a cycle carrying monitor `high` readings on cycle days 6 through 14 and a `peak` on day 15
- **WHEN** the engine computes that cycle
- **THEN** the engine reports no warning about a run of High readings
- **AND** the run is measured only up to the day before the Peak

#### Scenario: A run of Highs does not change the window

- **GIVEN** a cycle carrying nine consecutive monitor `high` readings and no Peak
- **WHEN** the engine computes that cycle
- **THEN** the reported fertile-window begin and end are the same as for any other peakless cycle
- **AND** the run is reported as a warning only

### Requirement: The rule behind the window begin says when day 6 is a fallback

When a cycle beyond the first six holds no monitor Peak anywhere in the configured history window, the
engine SHALL report the window's begin rule as a day-6 fallback rather than as the earliest-Peak-minus-6
rule, so that the rule a surface names is the rule the engine applied. The reported begin day SHALL be
unchanged. The earliest-Peak-minus-6 rule SHALL be reported only when the configured history window
actually holds a monitor Peak to measure from.

#### Scenario: No Peak history names the day-6 fallback

- **GIVEN** a cycle beyond the first six
- **AND** no cycle in the configured history window carries a monitor Peak
- **WHEN** the engine computes the current cycle
- **THEN** the reported begin rule is the day-6 fallback
- **AND** the reported begin day is 6

#### Scenario: A Peak in history names the earliest-Peak rule

- **GIVEN** a cycle beyond the first six
- **AND** the configured history window holds monitor Peak days 12 and 16
- **WHEN** the engine computes the current cycle
- **THEN** the reported begin rule is earliest Peak minus 6
- **AND** the reported begin day is 6
