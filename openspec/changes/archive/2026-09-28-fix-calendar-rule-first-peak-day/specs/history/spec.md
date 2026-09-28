# Spec Delta

## MODIFIED Requirements

### Requirement: History reports the Peak-day range and no average Peak day

The History/Stats cycle statistics SHALL report the earliest and latest monitor **Peak days** as a range
and SHALL NOT report an average or median Peak day. A cycle's Peak day is its first monitor Peak
reading, so the range is drawn from those readings and the later readings of a multi-day Peak run are not
Peak days. The protocol's calendar rule derives a fertile-window range from the earliest and latest Peak
day only, so an averaged Peak day is not a value the protocol produces and SHALL NOT be presented as
one. No Cycle-chart or Calendar surface SHALL display a single-day ovulation estimate.

#### Scenario: The Peak-day range is shown

- **GIVEN** the recorded monitor Peak readings are on cycle days 12 and 13, 15 and 16, 12 and 13, and 16
  and 17
- **WHEN** the user views the cycle statistics
- **THEN** the statistics report a Peak-day range of 12 to 16
- **AND** no single averaged Peak day is reported

#### Scenario: A later reading of a multi-day run is not a Peak day

- **GIVEN** a cycle holding monitor Peak readings on cycle days 12 and 13
- **WHEN** the user views the cycle statistics
- **THEN** the range is drawn from cycle day 12
- **AND** cycle day 13 does not widen it

#### Scenario: No surface renders an ovulation estimate

- **WHEN** the user views the cycle statistics, the cycle chart, or the Calendar
- **THEN** no surface marks a single predicted ovulation day
- **AND** the fertile-window range remains the only ovulation-related output

## ADDED Requirements

### Requirement: The cycle table names both of a cycle's monitor Peak readings

Each cycle row's Peak day column SHALL name the cycle's Peak day, which is its first monitor Peak
reading, and SHALL state that the fertile-window end is measured from the last reading whenever the
cycle holds more than one. A cycle holding no monitor Peak reading SHALL show the absence rather than a
day. The column SHALL NOT present a last reading as though it were the cycle's Peak day: the calendar
rule is derived from the first reading, and a reader comparing this column against the reported Peak-day
range would otherwise be comparing two different measurements.

#### Scenario: A two-reading cycle names both days

- **GIVEN** a cycle with monitor Peak readings on cycle days 12 and 13
- **WHEN** the user views the cycle table
- **THEN** the row states cycle day 12 as the cycle's Peak day
- **AND** it states that the fertile-window end is measured from cycle day 13

#### Scenario: A single-reading cycle names one day

- **GIVEN** a cycle with one monitor Peak reading on cycle day 14
- **WHEN** the user views the cycle table
- **THEN** the row states cycle day 14 as the cycle's Peak day
- **AND** it names no second reading

#### Scenario: A peakless cycle shows no Peak day

- **GIVEN** a cycle with no monitor Peak reading
- **WHEN** the user views the cycle table
- **THEN** the row shows no Peak day
