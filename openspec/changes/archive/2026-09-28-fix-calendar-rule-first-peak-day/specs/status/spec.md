# Spec Delta

## MODIFIED Requirements

### Requirement: Status reports the days since the Peak reading and the expected Peak-day range

For the cycle derived from the selected date, the Status view SHALL report how many cycle days have
elapsed since the monitor Peak reading from which that cycle's fertile-window end is measured. The
count SHALL be a retrospective restatement of a reading the user has already entered, and SHALL be
expressed in cycle days rather than elapsed calendar days, so a cycle day holding no record does not
change it. The count SHALL name the cycle day of the reading it measures from, and when the cycle
holds more than one monitor Peak reading it SHALL also say how many there are, so the readout never
implies a cycle can hold only one.

When the selected cycle holds no monitor Peak reading, the view SHALL show an empty state naming that
absence and SHALL NOT show a number. When the selected date falls earlier in the cycle than the Peak
reading, the view SHALL name the Peak's cycle day and SHALL NOT show a count in either direction. When
the selected date has not yet arrived, the view SHALL name the Peak's cycle day and SHALL NOT show a
count, because a count states that days have elapsed and a date still to come has none.

The view SHALL NOT present a countdown to a Peak day, an expected single Peak day, or any single-day
ovulation estimate. The view SHALL report the range of the earliest and latest monitor **Peak days**
within the configured history window — a cycle's Peak day being its first monitor Peak reading —
labelled as derived from past cycles, and SHALL NOT present it as a prediction of a specific day. With
interpretation disabled the view SHALL suppress both the count and the range, because both are derived
output.

The count and the range are drawn from different readings of the same cycle, and the view SHALL NOT
present them as if they were the same measurement. The count measures from the cycle's last Peak
reading because that is the reading its window's end came from; the range measures from each past
cycle's first Peak reading because that is what the calendar rule was derived from. A cycle holding more
than one monitor Peak reading SHALL have both readings named where the view names either.

#### Scenario: Days since the Peak reading are reported

- **GIVEN** a cycle with a monitor Peak reading on cycle day 12
- **WHEN** the user opens Status for cycle day 15 of that cycle and interpretation is enabled
- **THEN** the view reports 3 days since that Peak reading
- **AND** it names cycle day 12 as the day the reading falls on

#### Scenario: The count is in cycle days and ignores unlogged days

- **GIVEN** a cycle with a monitor Peak reading on cycle day 12 and no records for days 13 and 14
- **WHEN** the user opens Status for cycle day 15
- **THEN** the reported count is 3
- **AND** the unlogged days do not change it

#### Scenario: No Peak reading yet shows an empty state

- **GIVEN** a cycle with no monitor Peak reading
- **WHEN** the user opens Status for a date in that cycle and interpretation is enabled
- **THEN** the view states that no Peak reading is logged for the cycle
- **AND** it displays no number of days

#### Scenario: Multiple Peak readings name the one the count measures from

- **GIVEN** a cycle with monitor Peak readings on cycle days 12 and 15
- **WHEN** the user opens Status for cycle day 17
- **THEN** the reported count of 2 days is measured from cycle day 15
- **AND** the view states that cycle day 15 is the last of 2 Peak readings in the cycle
- **AND** it does not present the count as if the cycle held only one Peak reading

#### Scenario: A date before the Peak reading shows no count

- **GIVEN** a cycle with a monitor Peak reading on cycle day 12
- **WHEN** the user opens Status for cycle day 8 of that cycle
- **THEN** the view names cycle day 12 as that cycle's Peak day
- **AND** it displays no count of days in either direction

#### Scenario: A date that has not happened yet shows no count

- **GIVEN** a cycle with a monitor Peak reading on cycle day 11 and today on cycle day 15
- **WHEN** the user selects a date in that cycle that is still in the future, such as cycle day 20
- **THEN** the view names cycle day 11 as that cycle's Peak day
- **AND** it states that the selected date has not happened yet
- **AND** it displays no count of elapsed days, because none of those days have elapsed

#### Scenario: The expected Peak-day range is reported

- **GIVEN** the monitor Peak days inside the configured history window are 12, 16, and 17
- **WHEN** the user opens Status for a date in the current cycle
- **THEN** the view reports an expected Peak day of cycle day 12 to 17
- **AND** it states that the range comes from past cycles

#### Scenario: The range is drawn from the first reading of each past cycle

- **GIVEN** the closed cycles inside the configured history window hold monitor Peak readings on cycle
  days 12 and 13, 16 and 17, 13 and 14, 14 and 15, 16 and 17, and 15 and 16
- **WHEN** the user opens Status for a date in the current cycle
- **THEN** the view reports an expected Peak day of cycle day 12 to 16
- **AND** the later reading of each cycle's run does not widen it

#### Scenario: The range follows the configured history window

- **GIVEN** the configured history window is 6
- **AND** the user has 10 closed cycles whose monitor Peak days include day 11
- **WHEN** the user opens Status for a date in the current cycle
- **THEN** the reported range is drawn from the monitor Peak days of the most recent 6 cycles only
- **AND** the reported range is the one from which the displayed window begin was derived

#### Scenario: The range is not a prediction of a specific day

- **WHEN** the view reports an expected Peak-day range
- **THEN** it reports the range only, with no single expected Peak day
- **AND** it shows no countdown toward any day
- **AND** it renders no confirmed or predicted source cue for the range

#### Scenario: A history window with no Peak reports no range

- **GIVEN** no cycle inside the configured history window carries a monitor Peak reading
- **WHEN** the user opens Status for a date in the current cycle
- **THEN** the view reports no expected Peak-day range

#### Scenario: Nothing is reported with interpretation disabled

- **GIVEN** a cycle with a monitor Peak reading
- **WHEN** the user opens Status while the algorithm is disabled
- **THEN** no count of days since the Peak is shown
- **AND** no expected Peak-day range is shown
- **AND** the view continues to explain that readings are logged without interpretation
