# Spec Delta

## ADDED Requirements

### Requirement: Fertile-day counts describe the cycle, not the logging

The History/Stats fertile-day count for a cycle SHALL count every cycle day the engine classifies as `fertile`, whether or not that day holds a stored observation. Because day status is derived for the whole cycle, the count reflects the fertile window the cycle had rather than the subset of that window the user happened to log. A cycle's fertile-day count SHALL NOT change when the user adds or removes an observation inside an already-fertile region.

#### Scenario: A sparsely logged cycle still reports its full fertile window

- **GIVEN** a cycle whose fertile window spans more days than the user recorded in
- **WHEN** the user views History/Stats
- **THEN** the cycle's fertile-day count equals the number of days in its fertile window
- **AND** it is not reduced to only the logged fertile days

#### Scenario: Logging inside the window does not change the count

- **GIVEN** a cycle with a known fertile-day count
- **WHEN** the user adds a day record on a date that is already inside the fertile window
- **THEN** the cycle's fertile-day count is unchanged

#### Scenario: A Peak that closes the window still reduces the count

- **GIVEN** an open cycle with no Peak whose window has not closed
- **WHEN** the user logs a monitor Peak that gives the cycle a window end
- **THEN** the cycle's fertile-day count reflects the now-closed window
- **AND** days after that end are no longer counted as fertile
