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
- **WHEN** the user enters a value outside a field's valid range (e.g. post-Peak days outside 0–10, the history window outside 1–12, or a cycle band where min ≥ max or outside 15–60)
- **THEN** an inline error with guidance is shown, the value is not written, and the screen remains usable
