# Spec Delta

## ADDED Requirements

### Requirement: Temperature unit is a persisted display preference

The Settings screen SHALL provide a control in the Display & protocol section that selects Celsius or
Fahrenheit as the unit temperatures are entered and displayed in. The preference SHALL default to
Celsius, SHALL be saved immediately, and SHALL survive closing and reopening the app. A missing or
newly introduced value SHALL resolve to Celsius. A stored value the build does not recognise SHALL be
discarded in favour of the default rather than treated as an error, so a preference written by
another version cannot leave the app in a state it cannot render. The preference SHALL affect display
and entry only and SHALL NOT rewrite any stored record.

#### Scenario: The unit is chosen and persisted

- **WHEN** the user selects Fahrenheit in Settings
- **THEN** temperatures are entered and displayed in Fahrenheit
- **AND** the choice is still in effect after the app is closed and reopened

#### Scenario: Celsius is the default

- **WHEN** the app is used before the preference is ever set
- **THEN** temperatures are entered and displayed in Celsius

#### Scenario: An unrecognised stored unit falls back to the default

- **WHEN** the stored preference names a unit this build does not recognise
- **THEN** the app uses Celsius and the screen remains usable

#### Scenario: The preference does not alter stored data

- **WHEN** the user changes the unit preference
- **THEN** no day record is written, removed, or modified
- **AND** a backup taken afterwards carries the same stored values as one taken before

#### Scenario: The control names what it affects

- **WHEN** the user reads the Display & protocol section
- **THEN** the control is labelled in a way that identifies it as the unit for entering and reading temperatures
