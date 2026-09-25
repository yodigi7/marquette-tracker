# Spec Delta

## Purpose

Provides lossless, version-aware local backup and restore of the app's persisted fertility data and settings without uploading user data or storing derived interpretations as source records.

## ADDED Requirements

### Requirement: Versioned JSON backup export

The system SHALL provide a Settings action that exports the complete supported local dataset as a readable JSON document containing a backup format identifier, backup format version, application version, export timestamp, cycles, day records, and user-facing settings.

#### Scenario: Successful JSON export

- **WHEN** the user requests a JSON backup from Settings
- **THEN** the system creates a readable JSON file containing the supported persisted cycles, day records, settings, and backup metadata
- **AND** the file is delivered locally without uploading its contents

#### Scenario: Derived output is excluded

- **WHEN** a backup is created
- **THEN** fertile windows, statuses, forecasts, and other engine-derived output are not included as persisted backup data

### Requirement: Validate and migrate backup documents

The system SHALL validate the complete backup document and apply supported migrations before any restore writes occur. A backup with a supported older format version SHALL be migrated forward; malformed data, invalid values, duplicate identities, or an unsupported newer format version SHALL be rejected as a whole.

#### Scenario: Older supported backup is migrated

- **WHEN** the user selects a valid backup created by an older supported format version
- **THEN** the system migrates it to the current backup shape before offering the restore confirmation

#### Scenario: Newer unsupported backup is rejected

- **WHEN** the user selects a backup whose format version is newer than the application supports
- **THEN** the system refuses the import, explains that the backup is unsupported, and leaves existing data unchanged

#### Scenario: Invalid backup is rejected atomically

- **WHEN** any required record, relationship, date, identity, or setting in a selected backup is invalid
- **THEN** the system refuses the entire import and performs no writes to the current dataset

### Requirement: Replace-only restore with derived-state rehydration

After explicit confirmation, the system SHALL replace the current cycles, day records, and user-facing settings with the validated backup in one atomic operation. It SHALL then re-derive cycle membership and cycle-day assignments from restored source data and recompute engine-derived output.

#### Scenario: Confirmed restore replaces the local dataset

- **WHEN** the user confirms a valid replace-only restore
- **THEN** the system replaces the current supported dataset and settings with the backup contents
- **AND** the restored store reflects re-derived cycle structure and freshly computed derived output

#### Scenario: Restore failure preserves the existing dataset

- **WHEN** writing or reconciling the confirmed restore fails
- **THEN** the system rolls back the replacement and leaves the pre-import cycles, records, settings, and derived state intact

### Requirement: Preserve identity, metadata, and provenance

The system SHALL preserve supported record UUIDs, user-entered values, notes, timestamps, revision metadata, and provenance across export and restore. Restored rows SHALL be marked unsynchronized so they can be handled normally by a future sync layer.

#### Scenario: User-authored records round-trip

- **WHEN** a backup containing user-authored records is exported and restored
- **THEN** the records retain their identities, content, timestamps, and supported provenance

#### Scenario: Inferred records remain distinguishable

- **WHEN** a backup contains an unedited inferred post-Peak record
- **THEN** restore preserves its inferred provenance so normal reconciliation can evaluate it

#### Scenario: Edited inferred records remain authoritative

- **WHEN** a user-edited inferred record is restored
- **THEN** it is treated as a user-authored record and is not silently deleted or regenerated as an untouched inference

### Requirement: Restore the complete supported settings

A confirmed JSON restore SHALL replace the current user-facing settings with the settings in the backup, including algorithm state, protocol preferences, display preferences, overlay state, and post-Peak fill preferences.

#### Scenario: Settings are restored with the records

- **WHEN** a user confirms a valid backup restore
- **THEN** the restored settings are visible in the app and remain the settings used by subsequent cycle and derived-state calculations

### Requirement: Confirm destructive restore with an optional safety backup

The system SHALL validate and summarize a selected backup before replacement, show the backup metadata and supported record counts, and require explicit confirmation. The confirmation SHALL offer an optional local download of the current data before replacement without automatically downloading it.

#### Scenario: File selection alone does not replace data

- **WHEN** the user selects a backup file
- **THEN** the system only validates and presents a summary; existing data remains unchanged until the user confirms

#### Scenario: Optional current-data download

- **WHEN** the confirmation dialog offers a current-data download
- **THEN** the user may download the current local dataset before choosing to cancel or replace it

#### Scenario: Cancelled restore

- **WHEN** the user cancels the restore confirmation
- **THEN** the existing dataset and settings remain unchanged
