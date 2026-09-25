# Spec Delta

## MODIFIED Requirements

### Requirement: Core preferences persist across restart

The user SHALL be able to set the fertility goal (TTA / TTC / track-only), post-Peak days (default 4), the history window (default 6), and the theme (system / light / dark). The monitor-only fertile-window end computation and the calendar-rule peak lookback MUST use the configured values, and every change MUST be saved immediately and survive closing and reopening the app. A missing or new post-Peak value uses 4; an explicitly persisted user value is preserved.

#### Scenario: Changing a core preference

- **WHEN** the user changes any core preference on the Settings screen
- **THEN** the change is saved without a separate Save step and is still set after the app is closed and reopened

#### Scenario: Goal stored and displayed

- **WHEN** the user changes the fertility goal to TTC
- **THEN** the goal is stored and displayed as the selected option on reload

#### Scenario: Theme applied live and persisted

- **WHEN** the user selects the dark theme
- **THEN** the app renders dark immediately, and the choice is still applied after a restart

#### Scenario: Post-peak days shift the fertile-window end

- **WHEN** the user sets post-Peak days to a new value while a cycle with a monitor Peak is active
- **THEN** the cycle's monitor-only fertile-window end reflects the new value on the next load

#### Scenario: Default post-Peak interval is four days

- **WHEN** the user opens Settings without a previously saved post-Peak value
- **THEN** the post-Peak control shows 4
- **AND** the default survives closing and reopening the app
