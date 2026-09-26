# Cycle Projection Specification

## Purpose

Derives projected cycles forward from the current open cycle so the Calendar can show where menses, cycle boundaries, and fertile windows are expected to fall, entirely at read time and without persisting any prediction.

## Requirements

### Requirement: Projected cycle length uses the median of recent closed cycles

The projection SHALL derive each projected cycle's length from the median length of the most recent closed cycles, using the configured history window as the count. The median SHALL be used rather than the mean so that a single atypical cycle does not offset every projected date. When no closed cycle is available, the projection SHALL produce no projected cycle.

#### Scenario: Median drives the projection

- **GIVEN** the most recent closed cycles are 26, 28, 29, 29, 30, and 45 days
- **WHEN** the projection derives the length of the next cycle
- **THEN** the projected length is 29 days
- **AND** it is not 31.2 days

#### Scenario: The lookback count follows the configured history window

- **GIVEN** the history window is configured to 3 and the closed cycle lengths are 26, 28, 29, 29, 30, and 45
- **WHEN** the projection derives the next cycle's length
- **THEN** only the three most recent closed cycles are used

#### Scenario: No closed cycle yields no projection

- **GIVEN** the app has no closed cycle
- **WHEN** the projection runs
- **THEN** no projected cycle is produced

### Requirement: The length estimator is conditioned on cycles that could still be running

When the open cycle has already reached a given cycle day, the estimator SHALL consider only closed cycles whose length is at least that day, because a cycle that already ended could not still be running. When fewer than two closed cycles remain eligible, the estimator SHALL fall back to the unconditioned median over the same lookback window. The conditioned result SHALL never place a projected date on or before the current day while the open cycle is still running.

#### Scenario: A late cycle is not projected as already finished

- **GIVEN** the most recent closed cycle lengths are 26, 28, 29, 29, 30, and 45
- **AND** the open cycle started 30 days ago and is still running
- **WHEN** the projection derives where that open cycle ends
- **THEN** the projected end is on or after the current day
- **AND** it is not derived from a length that has already elapsed

#### Scenario: Shorter prior cycles drop out as the cycle runs

- **GIVEN** the most recent closed cycle lengths are 26, 28, 29, 29, 30, and 45
- **AND** the open cycle has reached day 30
- **WHEN** the projection derives where that open cycle ends
- **THEN** only the cycles of 30 and 45 days are considered
- **AND** the shorter lengths no longer influence the result

#### Scenario: Conditioning is skipped when too little history survives

- **GIVEN** the open cycle has reached a day that only one recorded cycle length reaches
- **WHEN** the projection derives where that open cycle ends
- **THEN** the estimator falls back to the unconditioned median over the same lookback window

### Requirement: Projected cycles chain forward without a gap

The projection SHALL give the open cycle a projected length and SHALL begin the next projected cycle on the day after that projected end, continuing without a fixed horizon. The open cycle's days up to and including the current day SHALL retain their existing derived treatment, and its days after the current day SHALL take the projected treatment. The result SHALL contain no date that falls inside no cycle and no projected cycle whose day 1 falls inside a preceding cycle.

#### Scenario: The open cycle's tail is projected

- **GIVEN** the open cycle started on 1 September and its projected length is 29 days
- **WHEN** the projection runs on 20 September
- **THEN** the open cycle covers 1 September through 29 September
- **AND** days after 20 September in that cycle take the projected treatment

#### Scenario: The next projected cycle starts where the previous one ends

- **GIVEN** the open cycle started on 1 September with a projected length of 29 days
- **WHEN** the projection runs
- **THEN** the next projected cycle begins on 30 September
- **AND** no date in between is left outside every cycle

#### Scenario: Projection continues beyond a single additional cycle

- **WHEN** the projection runs with the setting enabled and at least one closed cycle available
- **THEN** it produces consecutive projected cycles beyond the first
- **AND** no fixed maximum number of projected cycles is applied

### Requirement: A projected cycle's fertile window is the calendar rule

A projected cycle SHALL have no monitor Peak evidence, so its fertile window SHALL be derived by the protocol's calendar rule over the most recent Peak days: the window begins six days before the earliest Peak in the lookback window and ends the configured number of days after the latest Peak in that window. The projection SHALL NOT compute an average or median Peak day for use as a point estimate of ovulation.

When the lookback window contains no Peak at all, the calendar rule has no edges to work from and would leave the window open. A projected cycle SHALL then use the protocol's standard first-cycle band as a bounded fallback, so a projected window always has a determinate end. This fallback applies to projected cycles only and SHALL NOT alter the window computed for a cycle the user has recorded.

#### Scenario: The window brackets the historical Peak range

- **GIVEN** the most recent monitor Peak days within the lookback window are 12, 13, 16, and 17
- **AND** the configured post-Peak interval is 4
- **WHEN** a projected cycle's fertile window is derived
- **THEN** the window begins on cycle day 6
- **AND** the window ends on cycle day 21

#### Scenario: No single ovulation day is produced

- **WHEN** a projected cycle's fertile window is derived
- **THEN** no average or median Peak day is computed as an ovulation estimate
- **AND** the only ovulation-related output is the window's begin and end

#### Scenario: The configured post-Peak interval still moves the end

- **GIVEN** the latest monitor Peak in the lookback window is on day 17
- **WHEN** the user changes the configured post-Peak interval
- **THEN** a projected cycle's window end moves with the configured value

#### Scenario: No Peak history falls back to the protocol default band

- **GIVEN** closed cycles exist but none of them has a monitor Peak
- **WHEN** a projected cycle's fertile window is derived
- **THEN** the window is the protocol's standard first-cycle band
- **AND** the window has a determinate end rather than remaining open

#### Scenario: The fallback does not reach recorded cycles

- **GIVEN** a recorded cycle whose lookback window contains no Peak
- **WHEN** the engine computes that cycle's own fertile window
- **THEN** the window's end is left undetermined
- **AND** the bounded fallback is not applied to it

### Requirement: Projection stops at the protocol band ceiling

The projection SHALL NOT project a cycle beyond the configured maximum cycle length. When the open cycle has reached or exceeded that ceiling, the projection SHALL stop rather than extrapolating beyond the band the Marquette method is defined over. This requirement governs the projection only; reporting that a cycle has exceeded the protocol band remains the responsibility of the engine's own out-of-band handling, which currently considers completed cycles.

#### Scenario: An over-band cycle stops the projection

- **GIVEN** the configured maximum cycle length is 42
- **AND** the open cycle has reached day 42 and is still running
- **WHEN** the projection runs
- **THEN** no further projected cycle is produced

### Requirement: Projections are derived at read time and never persisted

The projection SHALL be derived from stored cycles and day records on every read. It SHALL NOT create, store, or retain any projected cycle, projected menses day, or projection history, and it SHALL NOT alter any stored record. Disabling the projection SHALL remove every projected output and SHALL leave stored records untouched.

#### Scenario: Projection leaves storage unchanged

- **GIVEN** the app has stored cycles and day records
- **WHEN** the projection runs
- **THEN** the stored record set is identical before and after
- **AND** no record is created, modified, or deleted

#### Scenario: No projection history is retained

- **WHEN** the projection runs repeatedly across reads
- **THEN** the results are recomputed from the same stored records
- **AND** no previously produced projection is stored or reused

#### Scenario: Disabling removes projected output only

- **GIVEN** the projection is enabled and has produced projected cycles
- **WHEN** the user disables the projection
- **THEN** no projected cycle, projected menses day, or projected band is displayed
- **AND** every stored record remains present and unchanged
