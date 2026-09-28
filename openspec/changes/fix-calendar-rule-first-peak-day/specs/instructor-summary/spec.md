# Spec Delta

## MODIFIED Requirements

### Requirement: The summary states the cycle's identity, its day range, its length, and its Peak reading

The summary SHALL state the cycle number, the date of Day 1, the range of cycle days the cycle covers, and
its length. A cycle that has closed SHALL state that length as a number of days. A cycle still in progress
SHALL be labelled as in progress, SHALL state the cycle day reached, and SHALL state that its length is
not yet known rather than showing a number in its place.

When the cycle holds a monitor Peak reading the summary SHALL state the cycle's **Peak day**, which is its
first monitor Peak reading, and how many monitor Peak readings the cycle holds, so it never implies a
cycle can hold only one. When the cycle holds more than one, the summary SHALL also state the last of
them and that the fertile-window end is measured from it, so a reader who checks the end against the
summary finds the reading the end actually came from. When it holds none, the summary SHALL say so and
SHALL show no Peak day.

#### Scenario: A closed cycle states its length

- **GIVEN** a closed cycle that ran 28 days
- **WHEN** the user opens its summary
- **THEN** the summary states the cycle number and the date of Day 1
- **AND** it states the cycle-day range and a length of 28 days

#### Scenario: An open cycle is not presented as settled

- **GIVEN** a cycle that has not closed and has reached cycle day 17
- **WHEN** the user opens its summary
- **THEN** the summary labels the cycle in progress
- **AND** it states that the length is not yet known
- **AND** it shows no length number in the length position

#### Scenario: Several Peak readings are all reported

- **GIVEN** a cycle with monitor Peak readings on cycle days 12 and 15
- **WHEN** the user opens its summary
- **THEN** the summary states cycle day 12 as the cycle's Peak day
- **AND** it states that this is a cycle with 2 monitor Peak readings
- **AND** it states that the fertile-window end is measured from cycle day 15
- **AND** it does not name cycle day 15 as the cycle's Peak day

#### Scenario: A single Peak reading needs no second day

- **GIVEN** a cycle with one monitor Peak reading on cycle day 14
- **WHEN** the user opens its summary
- **THEN** the summary states cycle day 14 as the cycle's Peak day
- **AND** it names no second reading and no measurement basis for the end

#### Scenario: A cycle with no Peak reading says so

- **GIVEN** a cycle with no monitor Peak reading
- **WHEN** the user opens its summary
- **THEN** the summary states that no monitor Peak reading is recorded in this cycle
- **AND** it shows no Peak day
