# Calendar Specification

## Purpose

The Calendar's per-day entry dialog lets the user log or view any day up to and including today, and re-derives cycle structure from logged days using a menses-run placement rule.

## Requirements

### Requirement: Day entry opens for any date up to today

Clicking a date in the Calendar SHALL open the day-entry form for any date up to and including today. If a Day Record already exists for that date, the form SHALL open pre-populated with that record's values; otherwise it SHALL open as the same blank form, ready for input. In both cases the form SHALL offer the full set of daily fields (monitor reading, mucus, blood flow, BBT, intercourse, symptoms, pregnancy test, notes). Closing the dialog without saving SHALL create or modify nothing.

#### Scenario: Logging the first day after a wipe
- **WHEN** the app has no data and the user clicks a past date in the Calendar
- **THEN** the day-entry form opens blank and ready for input, and saving the entry stores a Day Record for that date

#### Scenario: Existing entry is pre-populated
- **WHEN** the user clicks a date that already has a Day Record with readings
- **THEN** the form opens showing those readings, and saving preserves them alongside any edits

#### Scenario: Open without saving changes nothing
- **WHEN** the user opens the day-entry form for a date and closes the dialog without saving
- **THEN** nothing is created or modified for that date

### Requirement: Future dates cannot be logged

The app MUST NOT save a Day Record for any date after today, from any entry point. Attempting to do so SHALL be rejected with a clear message and SHALL leave no record behind.

#### Scenario: Future date rejected
- **WHEN** the user attempts to log an entry for a date later than today (for example from the Calendar date dialog)
- **THEN** the app shows a message that future dates cannot be logged and writes no record

### Requirement: Backfilled days are grouped into cycles by menses runs

Day Records SHALL be partitioned into cycles by the menses-run placement rule. Each logged day is Menses (M), No-menses (N), or no data (0, not logged). A new cycle SHALL begin at the first logged day, and at every M day whose previous logged day, ignoring any 0 days in between, is an N. 0 days SHALL NOT break a cycle on their own; only an explicit N day does. A leading run of N days before the first M day SHALL form its own single cycle with no menses recorded yet, its Day 1 being the first N day. N days after a Menses day SHALL continue that day's cycle. The rule SHALL be applied globally so that logging history in any order groups the days into the same cycles.

#### Scenario: Consecutive menses days group as one cycle
- **WHEN** the user logs a run of menses days with only no-data days around them (for example M000M0NNNNNN where 0 means no data)
- **THEN** the whole logged range belongs to a single cycle whose Day 1 is the first M day, since no explicit No-menses day lies between the menses days

#### Scenario: A logged non-menses day starts a new cycle
- **WHEN** a Menses day is logged immediately after a logged No-menses day (for example the first M of NNNNNNMMMMNNNN)
- **THEN** a new cycle begins on that M day, the preceding N run remains its own single cycle, and the trailing N days continue the new cycle

#### Scenario: Random-chunk logging produces stable grouping
- **WHEN** the user backfills records in scattered chunks and in different order (for example logging a later menses day first, then an earlier menses day that fills the run backward)
- **THEN** the days are grouped into the same cycles a single forward pass would produce, with no per-day cycle created for each chunk

### Requirement: Cycle structure is re-derived from all logged days on every save

Saving a Day Record SHALL re-derive the complete cycle structure from the full set of logged days in one pass. No cycle SHALL be exempt from re-derivation: records, Day 1 values, cycle boundaries, and open/closed state may all change, including for the live current cycle. The placement rule's boundaries SHALL apply, except that a date the user explicitly declared as a cycle start SHALL always begin a cycle. The last cycle in the derived order SHALL be open; every earlier cycle SHALL close on the day immediately before the next cycle begins. Cycle numbers SHALL reflect the derived order. Derived cycles SHALL appear in history, predictions, and stats like any other cycle.

#### Scenario: Backfilled menses merge into a later-logged cycle
- **WHEN** the user logs a menses day on 20 Mar, then later adds a menses day on 15 Mar with no logged No-menses day between them
- **THEN** both days belong to a single cycle whose Day 1 is 15 Mar, and no separate cycle remains for 20 Mar

#### Scenario: The live cycle is not protected
- **WHEN** the user is tracking a current cycle and backfills a menses day that the placement rule groups with that live cycle
- **THEN** the live cycle's Day 1 moves to the earlier menses day, its records are re-assigned accordingly, and no empty leftover cycle remains

#### Scenario: Explicitly started cycles remain boundaries
- **WHEN** the user starts a cycle on 1 Mar, then logs days on 1 Mar and 14 Mar
- **THEN** both records belong to the 1 Mar cycle and the 14 Mar record is cycle day 14

#### Scenario: Backfilled cycles feed history and predictions
- **WHEN** backfilled days form one or more cycles
- **THEN** those cycles appear in the cycle history, influence cycle-length stats and next-period predictions, and are labeled no differently from other cycles

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

### Requirement: Intercourse heart marker

The Calendar SHALL display a small filled red heart when intercourse is recorded and SHALL use the same marker in the Calendar legend.

#### Scenario: Intercourse recorded on a day
- **WHEN** a Calendar day has intercourse recorded
- **THEN** the day cell displays a small filled red heart
- **AND** the former green dot is not used for intercourse

#### Scenario: Intercourse legend
- **WHEN** the Calendar legend is displayed
- **THEN** the Intercourse entry displays a small filled red heart
- **AND** other legend entries retain their existing markers

#### Scenario: No intercourse recorded
- **WHEN** a Calendar day has no intercourse record
- **THEN** the day cell does not display an intercourse heart
