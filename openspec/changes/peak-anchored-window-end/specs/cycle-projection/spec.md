# Spec Delta

## MODIFIED Requirements

### Requirement: A projected cycle's fertile window is the calendar rule

A projected cycle SHALL have no monitor Peak evidence, so its fertile window SHALL be derived by the
protocol's calendar rule over the most recent Peak days in the lookback window: the window begins six
days before the earliest Peak in that window and ends three days after the latest Peak in it. The
projection SHALL NOT compute an average or median Peak day for use as a point estimate of ovulation.

When the lookback window contains no Peak at all, the calendar rule has no edges to work from and would
leave the window open. A projected cycle SHALL then use a fallback window composed from protocol
constants — beginning on cycle day 6 and ending three days after the earliest possible Peak day, so that
every day of it traces to a published rule rather than to a number borrowed from elsewhere. This
fallback applies to projected cycles only, SHALL be used only when the lookback window holds no Peak,
and SHALL NOT alter the window computed for a cycle the user has recorded.

#### Scenario: The window brackets the historical Peak range

- **GIVEN** the most recent monitor Peak days within the lookback window are 12, 13, 16, and 17
- **WHEN** a projected cycle's fertile window is derived
- **THEN** the window begins six days before cycle day 12
- **AND** the window ends three days after cycle day 17

#### Scenario: No single ovulation day is produced

- **WHEN** a projected cycle's fertile window is derived
- **THEN** no average or median Peak day is computed as an ovulation estimate
- **AND** the only ovulation-related output is the window's begin and end

#### Scenario: The configured post-Peak interval still moves the end

- **GIVEN** the latest monitor Peak in the lookback window is on day 17
- **WHEN** the lookback window's latest monitor Peak moves to day 19
- **THEN** a projected cycle's window end moves three days after the new latest Peak
- **AND** no configurable interval is involved in the end

#### Scenario: No Peak history falls back to the protocol default band

- **GIVEN** closed cycles exist but none of them has a monitor Peak
- **WHEN** a projected cycle's fertile window is derived
- **THEN** the window begins on cycle day 6
- **AND** the window ends three days after the earliest possible Peak day
- **AND** the window has a determinate end rather than remaining open

#### Scenario: The composed window is not the cycle-length band

- **WHEN** the composed fallback window is derived
- **THEN** its end is derived from the earliest possible Peak day and the post-Peak interval
- **AND** it is not the floor of the cycle-length band

#### Scenario: The fallback does not reach recorded cycles

- **GIVEN** a recorded cycle whose lookback window contains no Peak
- **WHEN** the engine computes that cycle's own fertile window
- **THEN** the window's end is left undetermined
- **AND** the bounded fallback is not applied to it
