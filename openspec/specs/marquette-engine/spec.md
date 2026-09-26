# Marquette Engine Specification

## Purpose

Defines the monitor-only evidence boundary, the fixed three-day post-Peak calculation behavior used by the current fertility engine, and the rule that day status is derived across the cycle's window rather than from stored records.

## Requirements

### Requirement: Monitor Peak is the only Peak evidence

The engine SHALL derive Peak evidence and the fertile-window begin and end from user-entered monitor readings only. Mucus values MAY remain stored and visible, but MUST NOT contribute to `peakDay` or fertile-window boundaries.

#### Scenario: Monitor Peak wins over mucus Peak

- **WHEN** a cycle contains a user-entered monitor Peak on day 10 and a mucus Peak on day 14
- **THEN** the engine uses cycle day 10 as the monitor Peak
- **AND** the mucus Peak does not move the fertile-window end

#### Scenario: Mucus-only Peak is not a Peak

- **WHEN** a cycle contains a mucus Peak but no user-entered monitor Peak
- **THEN** the engine reports no monitor Peak evidence
- **AND** the mucus Peak does not establish a fertile-window end

#### Scenario: Mucus observations remain available

- **WHEN** the user records mucus values
- **THEN** the values remain available to the logging and display surfaces
- **AND** they do not change the engine's monitor-only Peak or fertile-window result

### Requirement: The post-Peak interval is a fixed three-day protocol constant

The engine SHALL end the fertile window on the third day after the last monitor Peak, so that for a
user-entered monitor Peak on cycle day P the inclusive fertile window is P through P+3. This
interval SHALL be a protocol constant and SHALL NOT be exposed as a configurable preference, so no
stored or user-supplied value can alter it. The same interval SHALL apply to every cycle-length
rule that extends the window beyond a Peak, including the historical rule used after six cycles.

#### Scenario: Three-day interval after a monitor Peak

- **WHEN** a monitor Peak occurs on cycle day 14
- **THEN** the fertile window includes days 14 through 17
- **AND** every day in that range is reported as `fertile` whether or not it holds a record
- **AND** day 18 and later are reported as post-window statuses

#### Scenario: The historical end rule uses the same interval

- **GIVEN** more than six cycles of history and a current cycle with a monitor Peak
- **WHEN** the engine computes the current cycle's window end
- **THEN** the end derived from the latest Peak of the last six cycles is that Peak day plus three
- **AND** whichever of the historical and current ends finishes first is the reported end

#### Scenario: No post-Peak preference exists

- **WHEN** the user opens Settings
- **THEN** no post-Peak interval control is offered
- **AND** the reported window end is the monitor Peak day plus three regardless of any value held in
  previously stored data

### Requirement: Day results span the derived window

The engine SHALL produce a `DayResult` for every cycle day it covers, deriving each day's status from the computed fertile window rather than from the presence of a stored observation. For a closed cycle the covered span SHALL be the cycle length. For an open cycle the span SHALL be bounded by the current day, because a derived status SHALL NOT be assigned to a future date.

#### Scenario: Unrecorded days inside the window receive a status

- **GIVEN** a cycle with a monitor Peak on day 12
- **WHEN** the engine computes the cycle and no records exist for days 13 through 15
- **THEN** days 13 through 15 each have a day result with `fertile` status
- **AND** those results are derived from the window, not from any stored record
- **AND** day 16 is not `fertile`

#### Scenario: Days before the window begin remain pre-fertile

- **WHEN** a cycle's computed window begins on day 6
- **THEN** every covered day from 1 through 5 has `pre-fertile` status
- **AND** days 1 through 5 receive that status whether or not records exist for them

#### Scenario: An open cycle with no Peak stays fertile through the current day

- **GIVEN** an open cycle with a computed window begin but no determinable window end
- **WHEN** the engine computes the cycle
- **THEN** each covered day from the window begin through the current day has `fertile` status
- **AND** no covered day extends beyond the current day

#### Scenario: A closed cycle covers its full length

- **WHEN** the engine computes a closed cycle
- **THEN** it produces a day result for every day of the cycle length
- **AND** the day results do not depend on which of those days hold records

### Requirement: Derived interpretation is never persisted as a record

The engine SHALL produce derived values only. It SHALL NOT create, return, or imply any day record, monitor reading, or other stored observation. A day status SHALL be a function of the window and the cycle day alone, and SHALL NOT require a corresponding stored record to exist.

#### Scenario: Window output carries no record identity

- **WHEN** the engine computes a cycle
- **THEN** its result contains statuses and window boundaries
- **AND** it contains no record identifier, monitor reading, or data-origin value for any day

#### Scenario: Deriving a status does not create storage

- **WHEN** the engine computes statuses for unrecorded cycle days
- **THEN** no stored day record exists for those dates as a result
- **AND** the stored record set is identical before and after the computation

### Requirement: Monitor evidence outside the computed window is reported, not absorbed

When a user-entered monitor `high` or `peak` is recorded on a cycle day later than the computed
fertile-window end, the engine SHALL report a warning naming the cycle and the earliest offending
cycle day. The computed window end SHALL NOT change: it remains the protocol's last monitor Peak
plus the fixed three-day interval. Reporting the contradiction is the engine's response; resolving
it by moving the window is not, because no published protocol rule extends the window for evidence
recorded after it.

A `low` reading outside the window SHALL NOT produce this warning. `low` is the absence of a
fertility signal and is consistent with a closed window.

#### Scenario: A High after the computed end is reported and the end holds

- **GIVEN** a cycle whose computed window ends on day 13 and which holds a monitor `high` on day 15
- **WHEN** the engine computes the cycle
- **THEN** it reports a warning naming that cycle and day 15
- **AND** the computed window end is still day 13

#### Scenario: The earliest offending day is the one reported

- **GIVEN** a cycle whose computed window ends on day 13 and which holds monitor `high` readings on
  days 15 and 17
- **WHEN** the engine computes the cycle
- **THEN** the reported cycle day is 15

#### Scenario: A High inside the window is not a contradiction

- **GIVEN** a cycle whose computed window ends on day 17 and which holds a monitor `high` on day 15
- **WHEN** the engine computes the cycle
- **THEN** no out-of-window evidence warning is reported for that cycle

#### Scenario: A Low outside the window is consistent, not contradictory

- **GIVEN** a cycle whose computed window ends on day 13 and which holds a monitor `low` on day 15
- **WHEN** the engine computes the cycle
- **THEN** no out-of-window evidence warning is reported for that cycle

#### Scenario: A cycle with no determinable end reports nothing

- **GIVEN** a cycle with no monitor Peak and therefore no computable window end
- **WHEN** the engine computes the cycle
- **THEN** no out-of-window evidence warning is reported for that cycle

### Requirement: An open cycle whose end precedes the current day is reported

The engine SHALL report a warning for an open cycle whose computed fertile-window end is earlier
than the current day. Such a cycle is still in progress, so its days after the computed end SHALL
NOT be presented as settled. The warning SHALL distinguish this case from a closed cycle, where a
computed end in the past is an ordinary result and produces no warning.

#### Scenario: An open cycle that has run past its computed end is reported

- **GIVEN** an open cycle with a monitor Peak on day 10 and a computed window end of day 13, where
  the current day is cycle day 20
- **WHEN** the engine computes the cycle
- **THEN** it reports a warning naming that cycle as still in progress past its computed end
- **AND** day statuses are still produced through the current day

#### Scenario: A closed cycle past its computed end is ordinary

- **GIVEN** a closed cycle with a computed window end of day 13
- **WHEN** the engine computes the cycle
- **THEN** no still-in-progress warning is reported for that cycle

#### Scenario: An open cycle within its computed end is ordinary

- **GIVEN** an open cycle whose computed window end is the current day or later
- **WHEN** the engine computes the cycle
- **THEN** no still-in-progress warning is reported for that cycle

### Requirement: Recorded monitor evidence and derived status are related but independent

The engine SHALL derive each day's status from the computed window and the cycle day alone, and
SHALL NOT change a computed window in response to a reading recorded on a day. Recorded monitor
evidence SHALL be reconcilable against the derived result rather than being an input to it: where
evidence contradicts the window, the engine SHALL report that contradiction as a warning. Mucus and
basal body temperature SHALL remain non-evidence under the monitor-only contract, and a mucus or
BBT reading outside the window SHALL NOT produce an evidence warning.

#### Scenario: Status remains a function of the window and cycle day

- **WHEN** the engine derives day statuses for a cycle
- **THEN** each day's status is determined by the computed window and that day's cycle number
- **AND** no stored record is required for a status to be produced

#### Scenario: Contradictory evidence is reported rather than applied

- **GIVEN** a cycle holding a monitor `high` after its computed window end
- **WHEN** the engine computes the cycle
- **THEN** the day statuses are the same as they would be with no such record
- **AND** the contradiction is reported as a warning

#### Scenario: Mucus and BBT outside the window are not evidence

- **GIVEN** a cycle holding a mucus `peak` or a basal body temperature on a day after its computed
  window end
- **WHEN** the engine computes the cycle
- **THEN** no out-of-window evidence warning is reported
- **AND** the mucus and temperature values remain available to the logging and display surfaces
