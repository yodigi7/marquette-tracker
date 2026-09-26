# Spec Delta

## MODIFIED Requirements

### Requirement: Core preferences persist across restart

The user SHALL be able to set the fertility goal (TTA / TTC / track-only), the history window
(default 6), and the theme (system / light / dark). The calendar-rule peak lookback MUST use the
configured history-window value, and every change MUST be saved immediately and survive closing and
reopening the app. The post-Peak interval SHALL NOT appear among these preferences, because it is a
fixed protocol constant rather than a user preference.

#### Scenario: Changing a core preference

- **WHEN** the user changes any core preference on the Settings screen
- **THEN** the change is saved without a separate Save step and is still set after the app is closed
  and reopened

#### Scenario: Goal stored and displayed

- **WHEN** the user changes the fertility goal to TTC
- **THEN** the goal is stored and displayed as the selected option on reload

#### Scenario: Theme applied live and persisted

- **WHEN** the user selects the dark theme
- **THEN** the app renders dark immediately, and the choice is still applied after a restart

#### Scenario: No post-Peak preference is offered

- **WHEN** the user opens the Settings screen
- **THEN** no control for the post-Peak interval is shown in any section
- **AND** the reported fertile-window end does not change in response to any stored post-Peak value

#### Scenario: Post-peak days shift the fertile-window end

Retained under its original name because a modified requirement replaces the whole block; the
assertion is now inverted. There is no preference to change, and a value held in previously stored
data no longer moves the boundary.

- **GIVEN** a cycle with a monitor Peak and a stored post-Peak value inherited from an earlier app
  version
- **WHEN** the engine computes that cycle's fertile-window end
- **THEN** the end is the monitor Peak day plus three
- **AND** it does not reflect the stored value

#### Scenario: Default post-Peak interval is four days

Retained under its original name for the same reason; the interval is no longer a default and is
not four days.

- **WHEN** the user opens Settings without any previously saved post-Peak value
- **THEN** no post-Peak control is shown, so there is no default to display
- **AND** the fertile-window end is the monitor Peak day plus three on every load

### Requirement: Invalid numeric input is handled

Empty, negative, inverted, or out-of-range numeric input in any settings field MUST be rejected or
corrected with clear inline guidance, MUST never crash the screen, and MUST NOT be written.

#### Scenario: Invalid value rejected

- **WHEN** the user enters a value outside a field's valid range (e.g. the history window outside
  1–12, or a cycle band where min ≥ max or outside 15–60)
- **THEN** an inline error with guidance is shown, the value is not written, and the screen remains
  usable
