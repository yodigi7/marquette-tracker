# Spec Delta

## ADDED Requirements

### Requirement: Backup preserves stored temperatures and reports implausible ones

Export and restore SHALL treat stored basal temperatures as opaque canonical-unit values: a document
SHALL be exported and restored with every stored temperature preserved exactly, byte for byte in
value, regardless of the display unit preference in effect at the time. Import SHALL continue to
refuse a temperature that is not a finite number. A temperature that is a finite number but falls
outside the plausible human range SHALL NOT cause the import to be rejected and SHALL NOT be
rewritten, clamped, or removed; it SHALL be preserved exactly and reported in the restore result so
the user learns that readings worth checking were restored. Rejecting a whole document because it
carries an implausible reading would leave a user with a pre-existing backup they cannot restore at
all, which is a worse outcome than restoring a flagged outlier.

#### Scenario: A backup round-trips temperatures exactly

- **WHEN** a backup is exported and restored with Celsius active
- **THEN** every stored temperature is restored to the same value it was exported with

#### Scenario: The display preference does not affect the document

- **WHEN** a backup is taken with Fahrenheit active
- **THEN** the document carries the same stored values a Celsius-active export of the same data would carry
- **AND** restoring it produces the same stored values

#### Scenario: A finite-number check still refuses a non-numeric value

- **WHEN** a backup contains a temperature that is not a finite number
- **THEN** the import is rejected and the local dataset is left untouched

#### Scenario: An implausible reading is restored and reported

- **WHEN** a backup contains a finite temperature outside the plausible human range
- **THEN** the import succeeds, the value is restored exactly as it was stored, and the restore result reports how many readings fall outside the usual range
