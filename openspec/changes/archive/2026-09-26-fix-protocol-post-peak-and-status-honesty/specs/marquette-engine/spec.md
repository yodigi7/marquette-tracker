# Spec Delta

## REMOVED Requirements

### Requirement: The default post-Peak interval is four days

**Reason**: The published Marquette protocol ends the fertile window "three full days past the last
peak reading" (Mu, Fehring & Bouchard, _Linacre Q_ 2022;89(1):64–72; Fehring, _The Marquette Model_,
2018). A default of four is not a documented protocol value; it arrived with commit `871ac4e`
alongside the inferred post-Peak record feature, which was removed in `32bae5d`. The requirement
also permitted a user override, which let the app represent a window the protocol does not define
while rendering it as a Marquette window.

**Migration**: No user action is required. A stored post-Peak value is dropped on load and on
restore, and the window end becomes the monitor Peak day plus three for every cycle. The current
backup format version is unchanged.

## ADDED Requirements

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

## MODIFIED Requirements

### Requirement: Day results span the derived window

The engine SHALL produce a `DayResult` for every cycle day it covers, deriving each day's status
from the computed fertile window rather than from the presence of a stored observation. For a
closed cycle the covered span SHALL be the cycle length. For an open cycle the span SHALL be
bounded by the current day, because a derived status SHALL NOT be assigned to a future date.

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
