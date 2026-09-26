# Spec Delta

## ADDED Requirements

### Requirement: Cycle projection is a default-off Core preference

The Settings screen MUST provide a Core-section control that enables projection of future cycles on the Calendar. The control MUST be labelled so that it names the Calendar surface it affects. It SHALL be off by default, SHALL be saved immediately, and SHALL survive closing and reopening the app. A missing or newly introduced value SHALL resolve to off; an explicitly persisted user value SHALL be preserved.

The control SHALL govern cycle projection only. Enabling or disabling it SHALL NOT change the existing next-fertile-window forecast overlay, which remains available regardless of this preference, so that no setting state removes output the user already sees. Disabling it SHALL remove every projected cycle, projected menses day, and projected band, and SHALL leave every stored record present and unchanged. It SHALL NOT change the algorithm toggle's meaning, and when interpretation is disabled the Calendar SHALL show no projected output regardless of this preference.

#### Scenario: Projection is off by default

- **WHEN** the app is used without a previously saved projection preference
- **THEN** the projection control shows off
- **AND** the Calendar shows no projected cycle

#### Scenario: The control names the surface it affects

- **WHEN** the user reads the projection control in Settings
- **THEN** its label identifies the Calendar as the surface it changes
- **AND** it does not read as a switch for predictions in general

#### Scenario: Enabling projects future cycles

- **GIVEN** the projection control is off
- **WHEN** the user enables it
- **THEN** the Calendar shows projected cycles, projected menses days, and projected bands
- **AND** the choice is still set after the app is closed and reopened

#### Scenario: The next-window forecast is unaffected by the control

- **GIVEN** the projection control is off
- **WHEN** the user views the Calendar
- **THEN** the existing next-fertile-window forecast overlay is still shown
- **AND** only the projected cycles beyond it are absent

#### Scenario: Disabling removes projected output only

- **GIVEN** the projection control is on and projected cycles are displayed
- **WHEN** the user disables the control
- **THEN** no projected cycle, projected menses day, or projected band is displayed
- **AND** every stored record remains present and unchanged

#### Scenario: Interpretation disabled suppresses projection regardless

- **GIVEN** the projection control is on
- **WHEN** the user disables the algorithm
- **THEN** the Calendar shows no projected output
- **AND** re-enabling the algorithm restores the projection without a data change
