# App Settings Specification

## Purpose

The Settings screen and the persisted preferences it surfaces — core fertility prefs, the mandated algorithm toggle, display/protocol settings, and a confirmed data wipe — applied app-wide and surviving restarts.

## Requirements

### Requirement: Dedicated settings screen

The app MUST provide a dedicated Settings screen, reachable from top-level navigation, organising preferences into four sections: Core, Display & protocol, Data & backup, and Danger zone, in that order.

#### Scenario: Reaching the settings screen

- **WHEN** the user opens the app's navigation and selects Settings
- **THEN** the Settings screen shows the four sections (Core, Display & protocol, Data & backup, and Danger zone) in order

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

### Requirement: Core preferences persist across restart

The user SHALL be able to set the fertility goal (TTA / TTC / track-only), the history window (default 6), and the theme (system / light / dark). The calendar-rule peak lookback MUST use the configured history-window value, and every change MUST be saved immediately and survive closing and reopening the app. The post-Peak interval SHALL NOT appear among these preferences, because it is a fixed protocol constant rather than a user preference.

#### Scenario: Changing a core preference

- **WHEN** the user changes any core preference on the Settings screen
- **THEN** the change is saved without a separate Save step and is still set after the app is closed and reopened

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

- **GIVEN** a cycle with a monitor Peak and a stored post-Peak value inherited from an earlier app version
- **WHEN** the engine computes that cycle's fertile-window end
- **THEN** the end is the monitor Peak day plus three
- **AND** it does not reflect the stored value

#### Scenario: Default post-Peak interval is four days

- **WHEN** the user opens Settings without any previously saved post-Peak value
- **THEN** no post-Peak control is shown, so there is no default to display
- **AND** the fertile-window end is the monitor Peak day plus three on every load

### Requirement: Algorithm toggle controls interpretation only

The Settings screen MUST provide an algorithm on/off switch, on by default. When off, no fertile-window interpretation SHALL be shown anywhere (no status on Status, no shading on the Calendar, no window band on the Cycle chart) while user-entered readings remain recorded and visible. Turning it off SHALL NOT remove, hide, or otherwise set aside any stored reading, and cycle grouping SHALL continue to be derived from the same stored records. Switching it back on MUST restore interpretation from the same data.

#### Scenario: Default behaviour with the algorithm on

- **WHEN** the app is used with the algorithm switch on (the default)
- **THEN** Status shows a fertile-window status when a cycle result exists, and the Calendar and Cycle chart show window shading

#### Scenario: Logging-only mode

- **WHEN** the user switches the algorithm off and opens Status, the Calendar, or the Cycle chart, and logs a day's readings
- **THEN** no fertile-window status, shading, or window band is shown; user-entered readings are stored normally with no interpretation attached; and all stored readings remain visible

#### Scenario: Stored readings are untouched by the toggle

- **GIVEN** stored day records exist
- **WHEN** the user turns the algorithm off
- **THEN** every stored record remains present and visible
- **AND** cycle grouping continues to be derived from those records

#### Scenario: Re-enabling interpretation

- **WHEN** the user switches the algorithm back on
- **THEN** interpretation resumes from the same records without any data loss

### Requirement: Clear all data with confirmation

The Settings screen MUST provide a destructive "Clear all data" action requiring an explicit, separate confirmation. When confirmed it MUST delete every cycle, day record, and preference and restore defaults; when cancelled it MUST leave the app untouched; running it on an already-empty app MUST be a no-op with no error.

#### Scenario: Confirmed wipe

- **WHEN** the app contains cycles, readings, and non-default preferences, and the user confirms "Clear all data"
- **THEN** every cycle and reading is gone, every preference returns to its default, and the Calendar shows the fresh empty state

#### Scenario: Cancelled wipe

- **WHEN** the user is asked to confirm the reset and cancels at the confirmation step
- **THEN** nothing is deleted and the app is unchanged

#### Scenario: Wipe on an already-empty app

- **WHEN** the app has no data at all and the user clears all data
- **THEN** no error occurs, the empty state persists, and demo data does not re-seed after a reload

### Requirement: Calendar week start

The user SHALL be able to choose the calendar week start — Monday-first (default) or Sunday-first — and the calendar grid MUST re-layout accordingly and persist the choice.

#### Scenario: Sunday week start

- **WHEN** the user changes the calendar week-start to Sunday
- **THEN** the calendar grid starts the week on Sunday, the visible month re-renders with the new start day, and the setting persists

### Requirement: Cycle-chart overlay state persists

The Cycle chart's overlay marks (BBT / mucus / intercourse) MUST remember their on/off state from the last session instead of resetting each time the chart is opened, and toggling overlays in the chart MUST stay in sync with the Settings switches.

#### Scenario: Overlays remembered

- **WHEN** the user switches the BBT and mucus overlays on in the Cycle chart, then navigates away and back
- **THEN** the overlays are still on, and the Settings switches reflect the same state

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

### Requirement: Configurable cycle-length band

The user SHALL be able to set the minimal and maximal cycle-length band (default 21–42 days, integers within 15–60, min < max). Cycles outside the configured band MUST trigger the existing out-of-band protocol warning, and the forecast band filter MUST use the configured band.

#### Scenario: Widened band

- **WHEN** the user widens the cycle-length band (e.g. 20–43)
- **THEN** the out-of-band protocol warning and the forecast filter reflect the configured band, and the change persists

#### Scenario: Band change with no cycles

- **WHEN** no cycle exists yet and the user changes the cycle-length band
- **THEN** the change still saves and persists

### Requirement: Invalid numeric input is handled

Empty, negative, inverted, or out-of-range numeric input in any settings field MUST be rejected or corrected with clear inline guidance, MUST never crash the screen, and MUST NOT be written.

#### Scenario: Invalid value rejected

- **WHEN** the user enters a value outside a field's valid range (e.g. the history window outside 1–12, or a cycle band where min ≥ max or outside 15–60)
- **THEN** an inline error with guidance is shown, the value is not written, and the screen remains usable

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
