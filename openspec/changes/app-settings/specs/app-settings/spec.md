# Spec Delta

## Purpose

The Settings screen and the persisted preferences it surfaces — core fertility prefs, the constitution-mandated algorithm toggle, display/protocol settings, and a confirmed data wipe — applied app-wide and surviving restarts.

## ADDED Requirements

### Requirement: Dedicated settings screen

The app MUST provide a dedicated Settings screen, reachable from top-level navigation, organising preferences into three sections: Core, Display & protocol, and Danger zone, in that order.

#### Scenario: Reaching the settings screen
- **WHEN** the user opens the app's navigation and selects Settings
- **THEN** the Settings screen shows the three sections (core, display & protocol, danger zone) in order

### Requirement: Core preferences persist across restart

The user SHALL be able to set the fertility goal (TTA / TTC / track-only), post-Peak days (default 3), the history window (default 6), and the theme (system / light / dark). The fertile-window end computation and the calendar-rule peak lookback MUST use the configured values, and every change MUST be saved immediately and survive closing and reopening the app.

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
- **WHEN** the user sets post-Peak days to a new value while a cycle is active
- **THEN** the cycle's fertile-window end reflects the new value on the next load

### Requirement: Algorithm can be toggled off for logging-only

The Settings screen MUST provide an algorithm on/off switch, on by default. When off, no fertile-window interpretation SHALL be shown anywhere (no status on Today, no shading on the Calendar, no window band on the Cycle chart) while all logged readings remain recorded and displayed. Switching it back on MUST restore interpretation from the same data.

#### Scenario: Default behaviour with the algorithm on
- **WHEN** the app is used with the algorithm switch on (the default)
- **THEN** Today shows a fertile-window status, and the Calendar and Cycle chart show window shading

#### Scenario: Logging-only mode
- **WHEN** the user switches the algorithm off and opens Today, the Calendar, or the Cycle chart, and logs a day's readings
- **THEN** no fertile-window status, shading, or window band is shown; the readings are stored normally with no interpretation attached; and all logged readings remain visible

#### Scenario: Re-enabling interpretation
- **WHEN** the user switches the algorithm back on
- **THEN** interpretation resumes from the same records without any data loss

### Requirement: Clear all data with confirmation

The Settings screen MUST provide a destructive "Clear all data" action requiring an explicit, separate confirmation. When confirmed it MUST delete every cycle, day record, and preference and restore defaults; when cancelled it MUST leave the app untouched; running it on an already-empty app MUST be a no-op with no error.

#### Scenario: Confirmed wipe
- **WHEN** the app contains cycles, readings, and non-default preferences, and the user confirms "Clear all data"
- **THEN** every cycle and reading is gone, every preference returns to its default, and the Today view shows the fresh "start a cycle" empty state

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