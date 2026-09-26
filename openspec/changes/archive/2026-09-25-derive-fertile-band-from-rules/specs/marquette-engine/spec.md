# Spec Delta

## ADDED Requirements

### Requirement: Day results span the derived window

The engine SHALL produce a `DayResult` for every cycle day it covers, deriving each day's status from the computed fertile window rather than from the presence of a stored observation. For a closed cycle the covered span SHALL be the cycle length. For an open cycle the span SHALL be bounded by the current day, because a derived status SHALL NOT be assigned to a future date.

#### Scenario: Unrecorded days inside the window receive a status

- **GIVEN** a cycle with a monitor Peak on day 12 and a configured post-Peak interval of 4
- **WHEN** the engine computes the cycle and no records exist for days 13 through 16
- **THEN** days 13 through 16 each have a day result with `fertile` status
- **AND** those results are derived from the window, not from any stored record

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

## MODIFIED Requirements

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

### Requirement: The default post-Peak interval is four days

The default `postPeakDays` value SHALL be 4. For a user-entered monitor Peak on cycle day P, the default fertile window SHALL include P through P+4. A user-configured post-Peak value SHALL continue to move the inclusive window end consistently.

#### Scenario: Default four-day interval

- **WHEN** the settings use the default post-Peak value and a monitor Peak occurs on day 14
- **THEN** the fertile window includes days 14 through 18
- **AND** every day in that range is reported as `fertile` whether or not it holds a record

#### Scenario: Configured interval moves the boundary

- **WHEN** the user changes the post-Peak value to N
- **THEN** the inclusive fertile-window end is the monitor Peak day plus N
- **AND** days after that end are reported as post-window statuses

## REMOVED Requirements

### Requirement: Inferred Low records are non-evidence coverage

**Reason**: The app no longer creates inferred day records. With no generated rows in storage there is nothing for a non-evidence rule to constrain, and the requirement's coverage scenarios described display behavior for rows that can no longer exist.

**Migration**: Remove `postPeakFill` generation, the `dataOrigin` field, and the algorithm-off hiding of inferred rows. Derived status is now computed for every covered cycle day directly from the window, so post-window days are reported without needing a stored Low reading.
