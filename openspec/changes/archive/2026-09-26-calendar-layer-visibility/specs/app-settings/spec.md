# Spec Delta

## ADDED Requirements

### Requirement: Calendar layer visibility is a persisted display preference

The app SHALL persist the user's Calendar layer-visibility choices between sessions as a single stored preference on the existing settings record, alongside the other display preferences. It SHALL NOT store visibility state on Day Record or Cycle rows.

The preference SHALL resolve to nothing hidden when no value has been stored, so a new user and a user whose stored settings predate the preference both see every layer. It SHALL survive a reload, a month change, a view change, and a change of the algorithm toggle. Switching the algorithm off SHALL NOT discard any stored visibility choice, and switching it back on SHALL restore the layers the user had chosen.

Only layer identifiers the app recognises SHALL be honoured. A stored identifier the app does not recognise SHALL be discarded rather than treated as an error, so that a preference written by another version cannot prevent the app from starting or from restoring a backup.

The preference SHALL be a display preference only. Restoring or clearing it SHALL NOT change any Day Record, cycle structure, engine output, or interpretation. `Clear all data` SHALL return it to its default of nothing hidden, and a confirmed JSON restore SHALL replace it along with the user's other settings.

The Settings screen SHALL NOT offer a second copy of these controls; the Calendar legend SHALL be their only surface.

#### Scenario: Choices survive a restart

- **GIVEN** the user hides the `Menses` and `Fertile` layers
- **WHEN** the app is closed and reopened
- **THEN** both layers are still hidden

#### Scenario: No stored value means everything is visible

- **WHEN** a user with no stored visibility preference opens the Calendar
- **THEN** every layer is shown

#### Scenario: The algorithm toggle does not discard choices

- **GIVEN** the user has hidden the `Fertile` layer
- **WHEN** the user disables the algorithm and later re-enables it
- **THEN** the `Fertile` layer is still hidden

#### Scenario: An unrecognised stored identifier is discarded

- **GIVEN** stored settings contain a visibility identifier the app does not recognise
- **WHEN** the app loads
- **THEN** the app starts normally and ignores that identifier
- **AND** every recognised layer is shown

#### Scenario: A restore replaces the preference

- **WHEN** a user confirms a JSON restore whose settings hide a layer
- **THEN** that layer is hidden afterwards
- **AND** no record or cycle from the backup changed as a result of the visibility preference

#### Scenario: Clearing all data resets visibility

- **WHEN** the user confirms `Clear all data` while layers are hidden
- **THEN** every layer is shown again

#### Scenario: The legend is the only place these controls appear

- **WHEN** the user opens the Settings screen
- **THEN** no Calendar layer-visibility control is offered there
