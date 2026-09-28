# Spec Delta

## ADDED Requirements

### Requirement: Settings exposes a CSV export action

The Settings screen MUST provide a Data & backup section action that exports the user's stored
cycles and day records as a human-readable CSV file. The action MUST be labelled as a spreadsheet
export, MUST be presented separately from the JSON backup and restore actions, and MUST NOT be
presented as a backup, a restore source, or a replacement for the JSON backup. The screen MUST tell
the user that the file is written locally and that it cannot be read back into the app.

#### Scenario: The CSV action sits beside the JSON actions

- **WHEN** the user opens the Data & backup section
- **THEN** it offers a CSV export action alongside the existing JSON export and JSON import actions

#### Scenario: The action explains what the file is

- **WHEN** the user reads the CSV export action and its description
- **THEN** they are told the file is for viewing or analysing their data in a spreadsheet
- **AND** they are told it cannot be imported back into the app

#### Scenario: Exporting reports completion

- **WHEN** the user completes a CSV export
- **THEN** the section confirms the file was written locally
