# Feature Specification: App Settings & Preferences

**Feature Branch**: `002-app-settings`

**Created**: 2026-09-24

**Status**: Draft

**Input**: User description: "Settings view for the Marquette fertility tracker: a single routed settings screen persisted to the existing local settings store (read/write existing settings only — no engine changes). Core controls: fertility goal (TTA / TTC / track-only); fertility algorithm on/off toggle — on by default, off disables all fertile-window interpretation app-wide (Today status card, calendar shading, cycle-chart window band) while still logging raw data; post-Peak days (number, default 3); history window (number, default 6, used for calendar-rule peak calculations); theme (system / light / dark). Additional controls: clear-all-data / reset as a confirmed danger-zone action that wipes all cycles, records, and settings; persist cycle-chart overlay toggles (BBT / mucus / intercourse) in settings instead of the current ephemeral behavior; calendar week-start option (Monday-first default, Sunday-first alternative); cycle-length protocol band as a setting (default 21–42 days, engine warns outside band as today). Out of scope: reminders/notifications, export/backup, cloud sync, About/disclaimer section (medical disclaimer handled outside Settings), and goal-driven UI copy changes."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Set core fertility preferences (Priority: P1)

A user opens Settings and adjusts the five core preferences for how the app interprets and displays their data: fertility goal, the algorithm on/off switch, post-Peak days, history window, and color theme. Each change takes effect immediately and remains in place after the app is closed and reopened.

**Why this priority**: Every other view (Today's status card, Calendar shading, Cycle chart) is driven by these preferences; without them the app's behavior is fixed and not personalizable for TTA/TTC/track-only use.

**Independent Test**: Can be fully tested by changing each preference in Settings, reloading the app, and confirming the values and their effects persist.

**Acceptance Scenarios**:

1. **Given** a user on the Settings screen, **When** they change any of the five core preferences, **Then** the change is saved without an extra "Save" step and is still set after closing and reopening the app.
2. **Given** a user changes the fertility goal to TTC, **Then** the goal is stored and displayed as the selected option on reload.
3. **Given** the user picks a theme (system/light/dark), **Then** the app's appearance switches accordingly and the choice persists.
4. **Given** the user sets post-Peak days to a number while a cycle is active, **Then** the cycle chart's fertile-window end reflects the new value on next load.

---

### User Story 2 - Turn the algorithm off (Priority: P1)

A user switches the fertility algorithm off. From that moment the app stops interpreting their data — no predicted or confirmed fertile-window status is shown anywhere — but every reading they log is still recorded and displayed. Switching it back on restores interpretation with the same data.

**Why this priority**: An on/off algorithm toggle is a non-negotiable principle of the product (logging-only mode for users who don't want the app to interpret their cycle).

**Independent Test**: Can be fully tested by toggling the switch off, confirming Today/Calendar/Cycle chart show no interpretive status while raw readings remain, then toggling back on and confirming statuses return.

**Acceptance Scenarios**:

1. **Given** the algorithm is on (default), **When** the user opens the app, **Then** Today shows a fertile-window status and Calendar/Cycle chart show window shading.
2. **Given** the user switches the algorithm off, **When** they open Today, Calendar, or the Cycle chart, **Then** no fertile-window status, shading, or window band is shown, and all logged readings (monitor, mucus, BBT, intercourse) remain visible.
3. **Given** the algorithm is off and the user logs a day's readings, **Then** the readings are stored normally with no interpretation attached.
4. **Given** the user switches the algorithm back on, **Then** interpretation resumes for the same data without any loss.

---

### User Story 3 - Clear all app data (Priority: P2)

A user performs a full reset: removes every logged cycle, reading, symptom, and preference at once, restoring the app to a fresh-out-of-the-box state. The action is destructive, so the app requires an explicit, extra confirmation before anything is deleted.

**Why this priority**: The app is offline-only with no cloud, so wiping data is the only way to start clean (e.g., after testing with sample data). Destructive actions need a deliberate, confirmed flow.

**Independent Test**: Can be fully tested by performing the confirmed reset with cycles present, then confirming all data is gone, the default preferences are restored, and the Today view shows a fresh empty state.

**Acceptance Scenarios**:

1. **Given** the app contains cycles, readings, and non-default preferences, **When** the user chooses "Clear all data" and confirms, **Then** every cycle and reading is gone and preferences return to their defaults.
2. **Given** the user is asked to confirm the reset, **When** they cancel at the confirmation step, **Then** nothing is deleted and the app is unchanged.
3. **Given** the wipe completes, **When** the user lands back in the app, **Then** they see the fresh "start a cycle" empty state.
4. **Given** the app has no data at all, **When** the user clears all data, **Then** no error occurs and the empty state persists.

---

### User Story 4 - Set display preferences (Priority: P3)

A user customizes how information is laid out: which day the calendar week starts on, whether the Cycle chart's overlay marks (BBT / mucus / intercourse) stay switched on, and the minimal/maximal cycle-length band used for protocol warnings. These preferences persist like the core ones.

**Why this priority**: Comfort-and-clarity preferences; the app is fully usable with the defaults, so these are a lower priority than goal/algorithm behavior and data safety.

**Independent Test**: Can be fully tested by changing the week-start, toggling chart overlays, and widening the cycle band, then confirming each effect in Calendar and the Cycle chart and that all persist on reload.

**Acceptance Scenarios**:

1. **Given** the user changes the calendar week-start to Sunday, **Then** the calendar grid starts the week on Sunday and the setting persists.
2. **Given** the user switches the BBT, mucus, or intercourse overlays on in the Cycle chart, **Then** their on/off state is remembered the next time the chart is opened.
3. **Given** the user widens the cycle-length band (e.g. 20–43), **Then** the protocol warning for out-of-band cycles still reflects the configured band, and the change persists.

---

### Edge Cases

- Algorithm toggled off with an active cycle, then toggled on later — interpretation for that cycle must resume from the same raw records without loss.
- Clear-all-data performed when the app is already empty — must complete without error and leave the empty state in place.
- Invalid numeric input for post-Peak days, history window, or cycle-length band (e.g. empty, negative, or min > max) — must be rejected or corrected with clear guidance, and never crash the screen.
- Week-start changed mid-month (after month navigation) — calendar must re-render the visible month with the new start day.
- No cycle existing while the cycle length band is changed — change must still save and persist.
- Non-default theme + algorithm off + wiped data all at once — the app returns to defaults after wipe, theme included.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The app MUST provide a dedicated Settings screen reachable from the app's top-level navigation.
- **FR-002**: The Settings screen MUST let the user choose a fertility goal from TTA (avoid), TTC (conceive), and track-only.
- **FR-003**: The Settings screen MUST provide an algorithm on/off switch, on by default. When off, the app MUST show no fertile-window interpretation (no status in Today, no shading in Calendar, no window band in the Cycle chart) while continuing to record and display all raw readings.
- **FR-004**: The Settings screen MUST let the user set post-Peak days to a number (default 3), which controls when the fertile-window end-day is calculated.
- **FR-005**: The Settings screen MUST let the user set the history window (number of past cycles, default 6) used for calendar-rule peak calculations.
- **FR-006**: The Settings screen MUST let the user choose the theme from system, light, or dark, and apply it immediately.
- **FR-007**: Every preference change MUST persist on the device and survive an app restart.
- **FR-008**: The Settings screen MUST let the user choose the calendar week-start (Monday-first default, Sunday-first alternative), and the calendar MUST re-layout accordingly.
- **FR-009**: The Cycle chart overlay marks (BBT / mucus / intercourse) MUST remember their on/off state from a prior session, instead of resetting every time.
- **FR-010**: The Settings screen MUST let the user set the minimal and maximal cycle-length band (default 21–42 days); cycles outside the configured band MUST continue to trigger the existing "consult a teacher" style warning.
- **FR-011**: The Settings screen MUST provide a destructive "clear all data" action requiring an explicit, separate confirmation; when confirmed it MUST delete all cycles and readings and restore every preference to its default.
- **FR-012**: Cancelling the data-clear confirmation MUST leave all data and preferences untouched.
- **FR-013**: Empty or invalid numeric input in any settings field MUST be handled without crashing and with guidance to a valid value.

### Key Entities

- **Settings**: the persisted preference record, holding — fertility goal (TTA / TTC / track-only), algorithm on/off, post-Peak days, history window, theme (system / light / dark), calendar week-start (Monday / Sunday), cycle-min and cycle-max band, and Cycle chart overlay toggles (BBT / mucus / intercourse). Defaults: goal = TTA, algorithm = on, post-Peak days = 3, history window = 6, theme = system, week-start = Monday, band = 21–42, overlays = off.
- **Cycle**: an existing logged cycle; affected by clear-all-data (all cycles removed) and by the cycle-length band (warning boundary).
- **DayRecord**: an existing daily reading; affected by clear-all-data (all readings removed) and by the algorithm-off behavior (recorded, not interpreted).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can set all five core preferences (goal, algorithm, post-Peak days, history window, theme) in under 2 minutes, and all five are still set after a restart.
- **SC-002**: With the algorithm off, no fertile-window status, shading, or window band is shown in Today, Calendar, or the Cycle chart, while all logged readings remain visible (verified across all three views).
- **SC-003**: A user can wipe all data through the confirmed flow in under 1 minute, and afterward no cycle, reading, or non-default preference is readable anywhere in the app.
- **SC-004**: Cancelling the data-clear confirmation results in a completely unchanged app (no data loss).
- **SC-005**: All display and algorithm preferences set in Settings are reflected immediately in their target views and survive a full app restart with no manual re-entry.

## Assumptions

- Defaults: goal = TTA, algorithm = on, post-Peak days = 3, history window = 6, theme = system, week-start = Monday, cycle band = 21–42 days, chart overlays (BBT/mucus/intercourse) = off.
- Preferences are stored locally on the device only (the app is offline-first; no cloud, no accounts).
- "No engine changes" means the algorithm logic itself is untouched; some settings (post-Peak days, history window, cycle band) already feed the existing calculations and only become user-configurable here.
- Algorithm-off hides interpretation but never deletes data; re-enabling restores interpretation from the same records.
- Clear-all-data restores defaults and returns the user to the fresh start-a-cycle empty state; sample/demo data does not automatically repopulate after a wipe.
- The medical disclaimer is not part of this Settings screen (handled elsewhere in the app); no About section is included.
- Reminders/notifications, export/backup, and cloud sync remain out of scope (project-wide decisions, unchanged here).
- Preferences changes apply immediately without prompting a restart (except the theme, which the user may select live without restart).