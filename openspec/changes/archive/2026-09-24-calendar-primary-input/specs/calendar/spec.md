# Spec Delta

## ADDED Requirements

### Requirement: Calendar opens today's input when it is needed

When the Calendar becomes available on a date within a browser session, it SHALL automatically open today's day-entry dialog at most once for that date when no Day Record exists for today, the cycle derived for today has no monitor or mucus Peak, and the date has not already been auto-opened during that browser session. It SHALL NOT auto-open when today's record exists or when the current derived cycle has any Peak.

#### Scenario: Eligible first opening
- **WHEN** the Calendar opens for a date with no record for today, no Peak in the cycle derived for today, and no prior auto-open for today in the browser session
- **THEN** the day-entry dialog opens with today selected

#### Scenario: Today's record already exists
- **WHEN** the Calendar opens and a Day Record already exists for today
- **THEN** the day-entry dialog does not open automatically

#### Scenario: Current cycle already has a Peak
- **WHEN** the Calendar opens and the cycle derived for today has a monitor Peak or mucus Peak
- **THEN** the day-entry dialog does not open automatically
- **AND** multiple Peak readings in the cycle continue to suppress automatic opening

#### Scenario: Date was already auto-opened
- **WHEN** the Calendar is opened again during the same browser session after today's dialog was already auto-opened
- **THEN** the day-entry dialog does not open automatically for that date

#### Scenario: No cycle has been derived yet
- **WHEN** no cycle has been derived for today and no record exists for today
- **THEN** the day-entry dialog opens with today selected so the first record can establish the cycle through placement rules

### Requirement: The current cycle is determined by today's date

The system SHALL determine the current cycle by resolving the cycle that owns today's date after placement. Before today's menses record is saved, today SHALL remain part of the previous cycle; saving a menses record for today MAY create a new cycle whose first day is today.

#### Scenario: Menses starts a new cycle today
- **GIVEN** the derived sequence contains a run of Menses records followed by No-menses records and today's date is the next Menses record
- **WHEN** today's menses record is saved
- **THEN** today is assigned to a new cycle
- **AND** the earlier records remain in their prior cycle

#### Scenario: Today is not yet logged
- **GIVEN** today has no Day Record and the preceding derived cycle has no Peak
- **WHEN** the current cycle is resolved before input
- **THEN** today is evaluated as part of the preceding cycle
