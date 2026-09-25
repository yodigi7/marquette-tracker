# Spec Delta

## MODIFIED Requirements

### Requirement: Dedicated settings screen

The app MUST provide a dedicated Settings screen, reachable from top-level navigation, organising preferences into four sections: Core, Display & protocol, Data & backup, and Danger zone, in that order.

#### Scenario: Reaching the settings screen
- **WHEN** the user opens the app's navigation and selects Settings
- **THEN** the Settings screen shows the four sections (Core, Display & protocol, Data & backup, and Danger zone) in order

## ADDED Requirements

### Requirement: Settings exposes JSON backup controls

The Settings screen MUST provide a Data & backup section with actions to export a JSON backup and select a JSON backup for restore. The restore action MUST show validation results and an explicit confirmation before replacing local data.

#### Scenario: Backup controls are available

- **WHEN** the user opens Settings
- **THEN** the Data & backup section exposes JSON export and import actions

#### Scenario: Import requires confirmation

- **WHEN** the user selects a valid JSON backup
- **THEN** the screen shows its supported summary and requires explicit confirmation before replacing local data

#### Scenario: Backup actions remain local

- **WHEN** the user exports or imports a backup
- **THEN** the app performs the file operation locally and does not upload the user's data
