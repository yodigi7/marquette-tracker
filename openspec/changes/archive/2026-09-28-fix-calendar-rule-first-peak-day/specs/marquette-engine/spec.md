# Spec Delta

## MODIFIED Requirements

### Requirement: The latest monitor Peak in a cycle anchors the fertile-window end

When a cycle holds more than one user-entered monitor Peak reading, the engine SHALL measure the
computed fertile-window end from the latest of them. The engine SHALL report that reading separately
from the cycle's Peak day, and SHALL NOT report it as the cycle's Peak day: the Peak day is the first
monitor Peak reading in the cycle, and a surface naming a cycle's Peak day is naming that reading.

The published end rule is defined through the last monitor Peak (Mu, Fehring & Bouchard, _Linacre Q_
2022;89(1):64-72), so the end and the Peak day are measured from different readings whenever a cycle
holds more than one. A surface reporting how many days have elapsed since the Peak is reporting
against the reading the end was measured from, and the two therefore cannot disagree.

This requirement previously recorded that whether a teacher would prefer the first reading in a cycle
holding two had not been established, and declined to assert it. It has since been established that the
two readings are not interchangeable, and that the calendar rule's peak day is the first of them.

#### Scenario: Two monitor Peak readings anchor the end on the latest

- **GIVEN** a cycle with user-entered monitor Peak readings on cycle days 12 and 15
- **WHEN** the engine computes that cycle
- **THEN** the cycle's fertile-window end is three days after cycle day 15
- **AND** the cycle's Peak day is reported as 12
- **AND** 15 is not reported as the cycle's Peak day

#### Scenario: A later monitor Peak reading moves the end with it

- **GIVEN** a cycle whose monitor Peak reading on cycle day 12 would end the window on day 15
- **WHEN** a second monitor Peak reading is entered on cycle day 21
- **THEN** the computed fertile-window end moves to three days after cycle day 21
- **AND** the cycle's Peak day remains 12

#### Scenario: A single monitor Peak reading anchors the end

- **WHEN** a cycle holds exactly one user-entered monitor Peak reading
- **THEN** the cycle's Peak day is that reading's cycle day
- **AND** the computed fertile-window end is three days after it

#### Scenario: A mucus Peak does not become the anchoring reading

- **GIVEN** a cycle with a user-entered monitor Peak on day 12 and a mucus Peak on day 14
- **WHEN** the engine computes that cycle
- **THEN** the cycle's Peak day is 12
- **AND** the mucus Peak does not move the fertile-window end

### Requirement: The engine reports the monitor Peak days its calendar rule is derived from

For the current cycle, the engine SHALL report the earliest and latest monitor **Peak day** within the
configured history window, together with the number of cycles in that window that carried a monitor Peak
reading. A cycle's Peak day is its first monitor Peak reading, so each cycle in the window contributes
that reading. The reported range SHALL be the one from which the calendar rule derived the current
cycle's window begin, so that the begin the engine reports can be derived from the range the engine
reports. When the configured history window holds no monitor Peak reading, the engine SHALL report no
range. The engine SHALL NOT compute or report an average or median monitor Peak day, which the
protocol's calendar rule does not produce.

The range within the configured history window is distinct from a statistic taken across every recorded
cycle. A surface reporting the range the calendar rule used, and a surface reporting what the user's
whole history looks like, are both correct and SHALL NOT be conflated. The range determines the current
cycle's window begin only; the current cycle's own last monitor Peak reading determines its end.

Because each cycle contributes its first reading, a cycle in which the monitor showed Peak on
consecutive days contributes the earlier of them, and the reported range sits earlier than the same
cycles measured from their last readings.

#### Scenario: The reported range is the one the calendar rule used

- **GIVEN** the configured history window is 6
- **AND** the most recent 6 closed cycles hold monitor Peak readings on cycle days 12 and 13, 16 and 17,
  13 and 14, 14 and 15, 16 and 17, and 15 and 16
- **WHEN** the engine computes the current cycle
- **THEN** the reported range is cycle day 12 to 16
- **AND** the current cycle's calendar-rule begin is six days before 12

#### Scenario: A later reading of a multi-day run does not move the range

- **GIVEN** a closed cycle holding monitor Peak readings on cycle days 12 and 13
- **WHEN** the engine reports the range for a later cycle
- **THEN** that cycle contributes 12 to the range
- **AND** its day-13 reading is not reported as its Peak day

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

### Requirement: The window begins no later than the cycle's own Peak day

A cycle's first monitor `high` or `peak` reading SHALL open the fertile window whenever it falls before
the cycle day the calendar rule would open it, in every cycle number. The reported begin SHALL therefore
never fall later than the cycle's own first Peak day, and the engine SHALL report which of the two
produced the begin.

This pairs with the invariant that the end never precedes the reading that defines it. Together they
bound the window around the cycle's own Peak evidence: the begin is at or before the first Peak reading
and the end is at or after the last.

The rule is stated here because it was implemented and exercised without ever being written down, so
nothing asserted the invariant it guarantees. The begin sits at or before the first High-or-Peak day
only because that day is itself an opener — a consequence of the arithmetic rather than a stated
guarantee, and therefore one refactor away from breaking.

#### Scenario: An early High opens the window before the calendar day

- **GIVEN** a cycle beyond the first six whose calendar begin is cycle day 10
- **AND** the cycle's first monitor High is on cycle day 7
- **WHEN** the engine computes the cycle
- **THEN** the window begins on cycle day 7
- **AND** the reported begin rule names the cycle's own reading

#### Scenario: A cycle's own Peak opens the window the same way a High does

- **GIVEN** a cycle beyond the first six whose calendar begin is cycle day 10
- **AND** the cycle's first monitor Peak is on cycle day 8 with no earlier High
- **WHEN** the engine computes the cycle
- **THEN** the window begins on cycle day 8

#### Scenario: A reading after the calendar day does not move the begin

- **GIVEN** a cycle whose calendar begin is cycle day 6
- **AND** the cycle's first monitor High is on cycle day 9
- **WHEN** the engine computes the cycle
- **THEN** the window begins on cycle day 6

#### Scenario: The begin never follows the cycle's own Peak day

- **WHEN** the engine computes any cycle that holds a monitor Peak reading
- **THEN** the reported fertile-window begin is on or before that cycle's first Peak day
