# Spec Delta

## MODIFIED Requirements

### Requirement: Algorithm can be toggled off for logging-only

The Settings screen MUST provide an algorithm on/off switch, on by default. When off, no fertile-window interpretation SHALL be shown anywhere (no status on Status, no shading on the Calendar, no window band on the Cycle chart) while all logged readings remain recorded and displayed. Switching it back on MUST restore interpretation from the same data.

#### Scenario: Default behaviour with the algorithm on
- **WHEN** the app is used with the algorithm switch on (the default)
- **THEN** Status shows a fertile-window status when a cycle result exists, and the Calendar and Cycle chart show window shading

#### Scenario: Logging-only mode
- **WHEN** the user switches the algorithm off and opens Status, the Calendar, or the Cycle chart, and logs a day's readings
- **THEN** no fertile-window status, shading, or window band is shown; the readings are stored normally with no interpretation attached; and all logged readings remain visible

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
