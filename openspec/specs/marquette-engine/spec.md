# Marquette Engine Specification

## Purpose

Defines the monitor-only evidence boundary and the four-day post-Peak calculation behavior used by the current fertility engine, while keeping inferred Low records separate from user evidence.

## Requirements

### Requirement: Monitor Peak is the only Peak evidence

The engine SHALL derive Peak evidence, fertile-window begin, fertile-window end, and confirmed/predicted source from user-entered monitor readings only. Mucus values MAY remain stored and visible, but MUST NOT contribute to `peakDay`, fertile-window boundaries, or confirmation.

#### Scenario: Monitor Peak wins over mucus Peak

- **WHEN** a cycle contains a user-entered monitor Peak on day 10 and a mucus Peak on day 14
- **THEN** the engine uses cycle day 10 as the monitor Peak
- **AND** the mucus Peak does not move the fertile-window end or confirmation source

#### Scenario: Mucus-only Peak is not a Peak

- **WHEN** a cycle contains a mucus Peak but no user-entered monitor Peak
- **THEN** the engine reports no monitor Peak evidence
- **AND** the mucus Peak does not create a confirmed fertile-window end

#### Scenario: Mucus observations remain available

- **WHEN** the user records mucus values
- **THEN** the values remain available to the logging and display surfaces
- **AND** they do not change the engine's monitor-only Peak or fertile-window result

### Requirement: The default post-Peak interval is four days

The default `postPeakDays` value SHALL be 4. For a user-entered monitor Peak on cycle day P, the default fertile window SHALL include P through P+4, and the first eligible inferred Low date SHALL be P+5. A user-configured post-Peak value SHALL continue to move the boundary consistently.

#### Scenario: Default four-day interval

- **WHEN** the settings use the default post-Peak value and a monitor Peak occurs on day 14
- **THEN** the fertile window includes days 14 through 18
- **AND** the first inferred Low date is day 19

#### Scenario: Configured interval moves the boundary

- **WHEN** the user changes the post-Peak value to N
- **THEN** the inclusive fertile-window end is the monitor Peak day plus N
- **AND** the inferred Low tail starts after that end

### Requirement: Inferred Low records are non-evidence coverage

When interpretation is enabled, inferred Low records MAY participate in stored-record coverage, day results, and visual display calculations. They MUST NOT be used as monitor evidence, establish a Peak, move fertile-window begin/end, or establish cycle-placement boundaries. When interpretation is disabled, the existing algorithm-off hiding and retention rules apply.

#### Scenario: Inferred Low cannot create a Peak

- **WHEN** a cycle contains user records and inferred Low records but no user-entered monitor Peak
- **THEN** the engine reports no monitor Peak evidence
- **AND** inferred Low rows do not create a confirmed end

#### Scenario: Inferred Low remains visible in coverage when interpretation is enabled

- **GIVEN** interpretation is enabled and inferred Low records exist after the post-Peak interval
- **WHEN** the Calendar or chart renders the cycle
- **THEN** those stored assumed days can be shown with their provenance
- **AND** the assumed days do not become boundary evidence for cycle placement or the fertile window

#### Scenario: Inferred Low is hidden when interpretation is disabled

- **GIVEN** inferred Low records exist in storage
- **WHEN** interpretation is disabled
- **THEN** the existing algorithm-off rule hides those inferred rows from interpretation surfaces
- **AND** the records remain stored for later reconciliation
