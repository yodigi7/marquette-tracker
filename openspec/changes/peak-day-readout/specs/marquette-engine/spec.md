# Spec Delta

## ADDED Requirements

### Requirement: The latest monitor Peak in a cycle anchors the fertile-window end

When a cycle holds more than one user-entered monitor Peak reading, the engine SHALL treat the latest
of them as that cycle's Peak, and the computed fertile-window end SHALL be measured from that reading.
The reported Peak day for the cycle SHALL be the same reading, so a surface that reports how many days
have elapsed since the Peak is necessarily reporting against the value the end was measured from and
cannot disagree with it.

The published end rule is defined through the last monitor Peak, and the engine reads "last" as the
latest reading in the cycle. Whether a Marquette teacher would prefer the first reading in a cycle
that holds two has not been established, and is not asserted here. If that reading of the method
changes, this requirement and the window-end rule change together, and the Peak day a surface measures
from changes with them.

#### Scenario: Two monitor Peak readings anchor the end on the latest

- **GIVEN** a cycle with user-entered monitor Peak readings on cycle days 12 and 15
- **WHEN** the engine computes that cycle
- **THEN** the reported Peak day is 15
- **AND** the computed fertile-window end is three days after cycle day 15

#### Scenario: A later monitor Peak reading moves the end with it

- **GIVEN** a cycle whose monitor Peak reading on cycle day 12 would end the window on day 15
- **WHEN** a second monitor Peak reading is entered on cycle day 21
- **THEN** the reported Peak day is 21
- **AND** the computed fertile-window end moves to three days after cycle day 21

#### Scenario: A single monitor Peak reading anchors the end

- **WHEN** a cycle holds exactly one user-entered monitor Peak reading
- **THEN** the reported Peak day is that reading's cycle day
- **AND** the computed fertile-window end is three days after it

#### Scenario: A mucus Peak does not become the anchoring reading

- **GIVEN** a cycle with a user-entered monitor Peak on day 12 and a mucus Peak on day 14
- **WHEN** the engine computes that cycle
- **THEN** the reported Peak day is 12
- **AND** the mucus Peak does not move the fertile-window end

### Requirement: The engine reports the monitor Peak days its calendar rule is derived from

For the current cycle, the engine SHALL report the earliest and latest monitor Peak day within the
configured history window, together with the number of cycles in that window that carried a monitor
Peak reading. The reported range SHALL be the one from which the calendar rule derived the current
cycle's window, so that the begin and end the engine reports can be derived from the range the engine
reports. When the configured history window holds no monitor Peak reading, the engine SHALL report no
range. The engine SHALL NOT compute or report an average or median monitor Peak day, which the
protocol's calendar rule does not produce.

The range within the configured history window is distinct from a statistic taken across every
recorded cycle. A surface reporting the range the calendar rule used, and a surface reporting what the
user's whole history looks like, are both correct and SHALL NOT be conflated.

#### Scenario: The reported range is the one the calendar rule used

- **GIVEN** the configured history window is 6
- **AND** the monitor Peak days of the most recent 6 closed cycles are 12, 16, and 17
- **WHEN** the engine computes the current cycle
- **THEN** the reported range is cycle day 12 to 17
- **AND** the current cycle's calendar-rule begin is six days before 12
- **AND** its calendar-rule end is three days after 17

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
