# Spec Delta

## ADDED Requirements

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
