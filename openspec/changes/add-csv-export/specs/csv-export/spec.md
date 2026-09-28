# Spec Delta

## Purpose

Gives the user a flat, readable file of their own recorded cycles and days so they can sort, filter,
and chart the data in a spreadsheet or other tabular tool, without turning that file into a second
backup.

## ADDED Requirements

### Requirement: A local human-readable CSV export of cycles and day records

The system SHALL provide an action, in the Settings Data & backup section, that writes the user's
stored cycles and day records to a single local CSV file. The file SHALL contain a header row naming
every column, one row per day record sorted by date, and the owning cycle's fields repeated on each
row. The action SHALL NOT upload the file or any part of it, and SHALL NOT write, change, or delete
any cycle, day record, or setting.

#### Scenario: The export produces one dated file

- **WHEN** the user requests a CSV export from Settings
- **THEN** the app writes a single CSV file locally whose name carries a stable product prefix and
  the export date
- **AND** the file holds a header row and one row per stored day record, ordered by date

#### Scenario: Each row carries its cycle

- **WHEN** the user opens the exported file in a spreadsheet
- **THEN** every row states the cycle it belongs to, its cycle day, and the cycle's start and close
  dates without needing a second file or a join

#### Scenario: A cycle with no logged days is still exported

- **GIVEN** a stored cycle that has no day records
- **WHEN** the user exports the CSV
- **THEN** the file contains a row carrying that cycle's fields
- **AND** the row is identifiable as carrying no day record

#### Scenario: An app with no data still exports a usable file

- **GIVEN** no stored cycles and no stored day records
- **WHEN** the user exports the CSV
- **THEN** the app writes the header row alone, with no error and no empty trailing data row

#### Scenario: Exporting changes nothing

- **WHEN** the user exports the CSV
- **THEN** no cycle, day record, or setting is written, changed, or deleted
- **AND** the file is produced without any network request

### Requirement: The CSV column contract is documented and stable

The CSV SHALL use a single documented representation for each field. Dates SHALL be written as
`YYYY-MM-DD`. A field the user never recorded SHALL be written as an empty cell, which is distinct
from a value the user did record, such as a monitor or mucus reading of `none` or an intercourse
value of `false`. A field holding several values SHALL be written as one cell with the values
separated by semicolons. A stored temperature SHALL be written twice on the same row, once in
Celsius and once in Fahrenheit, each under a column name that states the unit, so the file does not
change meaning when the user's display preference changes and neither column can disagree with the
other. The Fahrenheit column SHALL be a pure conversion of the stored value at a precision that
preserves it exactly. Fields containing a comma, a double quote, or a line break SHALL be quoted so
the file parses correctly in a spreadsheet. User-entered free text that a spreadsheet would otherwise
evaluate, because it begins with a character that marks a formula, SHALL be marked as text so a
spreadsheet shows the characters the user typed. That guard SHALL NOT be applied to a number the
system writes, so a stored reading is not turned into text.

The app SHALL ship documentation listing every column name, its meaning, its date format, and how a
missing value is represented, and that documentation SHALL match the columns the export writes.

#### Scenario: A missing value is not confused with a recorded one

- **WHEN** a day has no monitor reading but a logged reading of `none` on another day
- **THEN** the first day shows an empty monitor cell and the second shows the text `none`

#### Scenario: Multiple values stay in one cell

- **WHEN** a day records more than one symptom
- **THEN** that day's cell lists the symptoms separated by semicolons rather than spilling into
  neighbouring cells

#### Scenario: A note that looks like a formula is shown as text

- **GIVEN** a day note beginning with a character a spreadsheet treats as the start of a formula
- **WHEN** the user opens the exported file in a spreadsheet
- **THEN** the note is displayed as the text that was entered
- **AND** it is neither evaluated as a formula nor shown as a number

#### Scenario: A stored number is not turned into text by that guard

- **GIVEN** a stored temperature outside the usual range, which is deliberately preserved
- **WHEN** the user exports the CSV
- **THEN** the temperature cell holds a number
- **AND** the free-text guard does not apply to it

#### Scenario: Free text does not break the file

- **GIVEN** a note containing a comma, a double quote, and a line break
- **WHEN** the user exports the CSV
- **THEN** the row parses in a spreadsheet as a single row with the note intact in one cell

#### Scenario: Both temperature scales are present regardless of preference

- **WHEN** the user exports the CSV with a Fahrenheit display preference active
- **THEN** the row carries the stored Celsius value and its Fahrenheit equivalent
- **AND** each column name states its unit

#### Scenario: The second scale does not alter the reading

- **WHEN** a stored temperature is converted for the Fahrenheit column
- **THEN** converting that value back yields the stored value exactly
- **AND** no plausible stored reading is rounded to a different number

#### Scenario: The documentation matches the file

- **WHEN** a user reads the published column documentation
- **THEN** every column the export writes is listed with its meaning and its missing-value
  representation

### Requirement: The CSV export is not a backup

The CSV SHALL be a read-only projection. The app SHALL NOT import, restore, or merge a CSV, and the
JSON backup SHALL remain the only restorable format. Neither the file itself nor the Settings screen
SHALL describe the CSV as a backup or as a way to move data between devices, and a CSV offered where
a backup is expected SHALL NOT be accepted as one.

#### Scenario: No CSV import exists

- **WHEN** the user looks for a way to load a CSV back into the app
- **THEN** no such action exists, and the JSON backup remains the only restorable format

#### Scenario: The file is labelled for what it is

- **WHEN** the user reads the CSV export control and its description in Settings
- **THEN** they are told it is a spreadsheet export for viewing their data
- **AND** they are not told it can restore or replace their data

#### Scenario: The JSON backup is unchanged

- **WHEN** the user exports a JSON backup after a CSV export exists
- **THEN** the JSON document is byte-for-byte the versioned backup format it was before
