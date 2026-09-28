# Spec Delta

## MODIFIED Requirements

### Requirement: A projected cycle's fertile window is the calendar rule

A projected cycle SHALL have no monitor Peak evidence, so its fertile window SHALL be derived by the
protocol's calendar rule over the most recent Peak days in the lookback window. The two edges come from
different readings: the window SHALL begin six days before the earliest **Peak day** in that window,
where a cycle's Peak day is its first monitor Peak reading, and SHALL end three days after the
**latest last Peak reading** in it. The projection SHALL NOT compute an average or median Peak day for
use as a point estimate of ovulation.

When the lookback window contains no Peak at all, the calendar rule has no edges to work from and would
leave the window open. A projected cycle SHALL then use a fallback window composed from protocol
constants — beginning on cycle day 6 and ending three days after the earliest possible **last** Peak
reading. The earliest possible Peak day is cycle day 12, the monitor shows Peak for a minimum of two
days, so the earliest possible last Peak reading is cycle day 13 and the composed window ends on day 16.
Every day of it traces to a published rule rather than to a number borrowed from elsewhere. This
fallback applies to projected cycles only, SHALL be used only when the lookback window holds no Peak,
and SHALL NOT alter the window computed for a cycle the user has recorded.

#### Scenario: The window brackets the historical Peak range

- **GIVEN** the most recent 6 closed cycles hold monitor Peak readings on cycle days 12 and 13, 15 and
  16, 12 and 13, 14 and 15, 16 and 17, and 13 and 14
- **WHEN** a projected cycle's fertile window is derived
- **THEN** the window begins six days before cycle day 12
- **AND** the window ends three days after cycle day 17

#### Scenario: No single ovulation day is produced

- **WHEN** a projected cycle's fertile window is derived
- **THEN** no average or median Peak day is computed as an ovulation estimate
- **AND** the only ovulation-related output is the window's begin and end

#### Scenario: The configured post-Peak interval still moves the end

- **GIVEN** the latest last monitor Peak reading in the lookback window is on day 17
- **WHEN** that latest last Peak reading moves to day 19
- **THEN** a projected cycle's window end moves three days after the new latest reading
- **AND** no configurable interval is involved in the end

#### Scenario: The open edge follows the first reading of a multi-day Peak run

- **GIVEN** a closed cycle in the lookback window holds monitor Peak readings on cycle days 12 and 13
- **WHEN** the projected cycle's window is derived
- **THEN** the window begins six days before cycle day 12
- **AND** measuring that cycle from its day-13 reading would begin the window a day later

#### Scenario: The close edge follows the last reading of a multi-day Peak run

- **GIVEN** a closed cycle in the lookback window holds monitor Peak readings on cycle days 12 and 13
- **AND** no other cycle in the window carries a later monitor Peak reading
- **WHEN** the projected cycle's window is derived
- **THEN** the window ends three days after cycle day 13
- **AND** it does not end three days after cycle day 12

#### Scenario: No Peak history falls back to the protocol default band

- **GIVEN** closed cycles exist but none of them has a monitor Peak
- **WHEN** a projected cycle's fertile window is derived
- **THEN** the window begins on cycle day 6
- **AND** the window ends on cycle day 16
- **AND** the window has a determinate end rather than remaining open

#### Scenario: The composed window is not the cycle-length band

- **WHEN** the composed fallback window is derived
- **THEN** its end is derived from the earliest possible last Peak reading and the post-Peak interval
- **AND** it is not the floor of the cycle-length band

#### Scenario: The fallback does not reach recorded cycles

- **GIVEN** a recorded cycle whose lookback window contains no Peak
- **WHEN** the engine computes that cycle's own fertile window
- **THEN** the window's end is left undetermined
- **AND** the bounded fallback is not applied to it
